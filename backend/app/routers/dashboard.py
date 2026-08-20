from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import get_current_official

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

GUIDELINES = [
    {"icon": "shield", "text": "Mandatory 2-finger biometric authentication for all citizen enrolments"},
    {"icon": "file-check", "text": "Verify document identity numbers (Aadhaar/PAN/Voter) prior to approval"},
    {"icon": "tags", "text": "Categorize civic issues under relevant local municipal / district wards"},
    {"icon": "clock", "text": "Maintain 48-hour Citizen Charter SLA for emergency civic grievances"},
    {"icon": "scale", "text": "Verify income and document eligibility before recommending government schemes"},
]


@router.get("/stats")
def stats(db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    people_enrolled = db.query(models.Citizen).count()
    total_problems = db.query(models.Problem).count()
    problems_solved = db.query(models.Problem).filter(models.Problem.is_solved == True).count()  # noqa: E712
    active_schemes = db.query(models.Scheme).filter(models.Scheme.active == True).count()  # noqa: E712
    verified_docs = db.query(models.CitizenDocument).filter(models.CitizenDocument.verified == True).count()  # noqa: E712
    total_scheme_beneficiaries = db.query(models.SchemeUsage).count()

    top_problems = (
        db.query(models.Problem).order_by(models.Problem.total_votes.desc()).limit(10).all()
    )

    return {
        "people_enrolled": people_enrolled,
        "problems_solved": problems_solved,
        "total_problems": total_problems,
        "active_schemes": active_schemes,
        "verified_documents": verified_docs,
        "total_scheme_beneficiaries": total_scheme_beneficiaries,
        "top_problems": [
            {
                "id": p.id,
                "title": p.title,
                "category": p.category or "Civic Infrastructure",
                "total_votes": p.total_votes,
                "solved_votes": p.solved_votes,
                "is_solved": p.is_solved,
            }
            for p in top_problems
        ],
        "guidelines": GUIDELINES,
    }
