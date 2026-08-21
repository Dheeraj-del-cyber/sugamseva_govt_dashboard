from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import biometric, notify

router = APIRouter(prefix="/problems", tags=["Problems / Voting"])


@router.get("", response_model=list[schemas.ProblemListItem])
def list_problems(
    search: str | None = None,
    status: str | None = None,
    top: int | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    query = db.query(models.Problem)
    if search:
        query = query.filter(models.Problem.title.ilike(f"%{search}%"))
    if status == "solved":
        query = query.filter(models.Problem.is_solved == True)  # noqa: E712
    elif status == "in-progress":
        query = query.filter(models.Problem.is_solved == False)  # noqa: E712
    query = query.order_by(models.Problem.total_votes.desc())
    if top:
        query = query.limit(top)
    problems = query.all()
    return [
        schemas.ProblemListItem(sl_no=i, id=p.id, title=p.title, total_votes=p.total_votes, solved_votes=p.solved_votes)
        for i, p in enumerate(problems, start=1)
    ]


@router.post("", response_model=schemas.ProblemDetailOut)
def add_problem(
    payload: schemas.ProblemCreateRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    problem = models.Problem(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        added_by_official_id=current.id,
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    return problem


@router.get("/{problem_id}", response_model=schemas.ProblemDetailOut)
def get_problem(problem_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.patch("/{problem_id}", response_model=schemas.ProblemDetailOut)
def update_problem(
    problem_id: str,
    payload: schemas.ProblemUpdateRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Edit a problem's title, description or category. Vote counts and
    solved status are untouched - only the reported details change."""
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if payload.title is not None:
        if not payload.title.strip():
            raise HTTPException(status_code=400, detail="Problem title cannot be empty")
        problem.title = payload.title
    if payload.description is not None:
        problem.description = payload.description
    if payload.category is not None:
        problem.category = payload.category

    db.commit()
    db.refresh(problem)
    return problem


@router.get("/{problem_id}/users", response_model=list[schemas.ProblemAffectedUser])
def get_problem_users(problem_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    results = []
    for i, v in enumerate(problem.votes, start=1):
        results.append(
            schemas.ProblemAffectedUser(
                sl_no=i,
                id=v.citizen.id,
                full_name=v.citizen.full_name,
                phone_number=v.citizen.phone_number,
                address=v.citizen.address,
                voted_at=v.created_at,
                solved=v.solved,
            )
        )
    return results


@router.post("/{problem_id}/vote")
def vote_problem(
    problem_id: str,
    payload: schemas.ProblemVoteRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    citizen = db.query(models.Citizen).filter(models.Citizen.id == payload.citizen_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")

    existing_vote = (
        db.query(models.ProblemVote)
        .filter(models.ProblemVote.problem_id == problem_id, models.ProblemVote.citizen_id == payload.citizen_id)
        .first()
    )
    if existing_vote:
        raise HTTPException(status_code=400, detail="This citizen has already voted for this problem and it cannot be reverted")

    vote = models.ProblemVote(problem_id=problem_id, citizen_id=payload.citizen_id)
    db.add(vote)
    problem.total_votes += 1
    db.commit()

    notify.send_sms(citizen.phone_number, f"Your vote for '{problem.title}' has been recorded. Thank you.")
    return {"status": "voted", "total_votes": problem.total_votes}


@router.post("/{problem_id}/mark-solved")
def mark_solved(
    problem_id: str,
    payload: schemas.MarkSolvedRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Marking a citizen's problem instance as solved requires the
    citizen's own fingerprint verification, per the brief, so an official
    cannot mark it solved unilaterally or by mistake."""
    if not biometric.check_verification_token(payload.fingerprint_verification_token):
        raise HTTPException(status_code=401, detail="Citizen fingerprint verification required")

    vote = (
        db.query(models.ProblemVote)
        .filter(models.ProblemVote.problem_id == problem_id, models.ProblemVote.citizen_id == payload.citizen_id)
        .first()
    )
    if not vote:
        raise HTTPException(status_code=404, detail="This citizen has not voted for this problem")
    if vote.solved:
        raise HTTPException(status_code=400, detail="Already marked solved")

    vote.solved = True
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    problem.solved_votes += 1
    if problem.solved_votes >= problem.total_votes:
        problem.is_solved = True
    db.commit()

    citizen = db.query(models.Citizen).filter(models.Citizen.id == payload.citizen_id).first()
    notify.send_sms(citizen.phone_number, f"Good news! Your reported issue '{problem.title}' has been marked as solved.")
    return {"status": "solved", "solved_votes": problem.solved_votes}


@router.post("/{problem_id}/notify")
def notify_voters(
    problem_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Send every citizen who voted for this problem an SMS with the current
    status (in progress / fully solved), so officials can proactively update
    citizens without waiting for them to check the app."""
    problem = db.query(models.Problem).filter(models.Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    status_line = (
        "has been fully resolved"
        if problem.is_solved
        else f"is being worked on ({problem.solved_votes}/{problem.total_votes} confirmed solved)"
    )

    message = (
        f"Update on '{problem.title}': this issue {status_line}. "
        "Thank you for reporting it."
    )

    sent = 0

    for vote in problem.votes:
        if notify.send_sms(vote.citizen.phone_number, message):
            sent += 1

    return {"status": "notified", "notified_count": sent}