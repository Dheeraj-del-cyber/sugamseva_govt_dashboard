from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import get_current_official

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

GUIDELINES = [
    {"icon": "shield", "text": "Maintain data privacy and security"},
    {"icon": "file-check", "text": "Verify documents before approval"},
    {"icon": "tags", "text": "Ensure accurate problem categorization"},
    {"icon": "clock", "text": "Respond to citizen issues timely"},
    {"icon": "scale", "text": "Follow government scheme eligibility rules"},
]


@router.get("/stats")
def stats(db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    people_enrolled = db.query(models.Citizen).count()
    problems_solved = db.query(models.Problem).filter(models.Problem.is_solved == True).count()  # noqa: E712
    top_problems = (
        db.query(models.Problem).order_by(models.Problem.total_votes.desc()).limit(10).all()
    )
    return {
        "people_enrolled": people_enrolled,
        "problems_solved": problems_solved,
        "top_problems": [
            {"id": p.id, "title": p.title, "total_votes": p.total_votes} for p in top_problems
        ],
        "guidelines": GUIDELINES,
    }
