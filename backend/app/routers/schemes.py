from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import ai

router = APIRouter(prefix="/schemes", tags=["Schemes"])
CURRENT_YEAR = datetime.utcnow().year


def _eligible_citizens(db: Session, scheme: models.Scheme) -> list[models.Citizen]:
    required = {t.strip() for t in (scheme.required_documents or "").split(",") if t.strip()}
    if not required:
        return []
    citizens = db.query(models.Citizen).all()
    eligible = []
    for c in citizens:
        verified_types = {d.doc_type for d in c.documents if d.verified}
        if required.issubset(verified_types):
            eligible.append(c)
    return eligible


@router.get("", response_model=list[schemas.SchemeListItem])
def list_schemes_near_people(
    search: str | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """One row per citizen (user name, eligible scheme count, documents matched)."""
    citizens = db.query(models.Citizen).all()
    if search:
        like = search.lower()
        citizens = [c for c in citizens if like in c.full_name.lower() or like in c.phone_number]

    schemes = db.query(models.Scheme).filter(models.Scheme.active == True).all()  # noqa: E712
    results = []
    for i, c in enumerate(citizens, start=1):
        verified_types = {d.doc_type for d in c.documents if d.verified}
        eligible = [
            s for s in schemes
            if {t.strip() for t in (s.required_documents or "").split(",") if t.strip()}.issubset(verified_types)
        ]
        if not eligible:
            continue
        results.append(
            schemas.SchemeListItem(
                sl_no=i,
                id=c.id,
                name=c.full_name,
                eligible_count=len(eligible),
                documents_matched=", ".join(sorted(verified_types)) or "None",
            )
        )
    return results


@router.get("/catalog")
def scheme_catalog(db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    schemes = db.query(models.Scheme).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "ministry": s.ministry,
            "benefit_amount": s.benefit_amount,
            "active": s.active,
        }
        for s in schemes
    ]


@router.get("/{scheme_id}", response_model=schemas.SchemeDetailOut)
def get_scheme_detail(scheme_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    eligible = _eligible_citizens(db, scheme)
    eligible_ids = {c.id for c in eligible}
    used_ids = {
        u.citizen_id for u in scheme.usages if u.status == "used" and u.year == CURRENT_YEAR
    }
    applied_ids = {u.citizen_id for u in scheme.usages if u.year == CURRENT_YEAR}
    not_applied = eligible_ids - applied_ids
    missed = len([u for u in scheme.usages if u.status == "missed"])

    if not scheme.summary:
        ai_result = ai.summarize_scheme(scheme.name)
        pros, cons = ai_result.get("pros", []), ai_result.get("cons", [])
        summary = ai_result.get("summary", "")
    else:
        summary = scheme.summary
        pros = [p for p in (scheme.pros or "").split("\n") if p]
        cons = [c for c in (scheme.cons or "").split("\n") if c]

    return schemas.SchemeDetailOut(
        id=scheme.id,
        name=scheme.name,
        category=scheme.category,
        ministry=scheme.ministry,
        benefit_amount=scheme.benefit_amount,
        summary=summary,
        pros=pros,
        cons=cons,
        eligible_not_applied=len(not_applied),
        used_count=len(used_ids),
        missed_count=missed,
    )


@router.get("/{scheme_id}/eligible-not-applied")
def eligible_not_applied(scheme_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    eligible = _eligible_citizens(db, scheme)
    applied_ids = {u.citizen_id for u in scheme.usages if u.year == CURRENT_YEAR}
    remaining = [c for c in eligible if c.id not in applied_ids]
    return [{"id": c.id, "full_name": c.full_name, "phone_number": c.phone_number} for c in remaining]


@router.get("/{scheme_id}/used")
def scheme_used_by(scheme_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    used = [u for u in scheme.usages if u.status == "used"]
    return [{"id": u.citizen.id, "full_name": u.citizen.full_name, "year": u.year} for u in used]


@router.get("/{scheme_id}/missed")
def scheme_missed_by(scheme_id: str, db: Session = Depends(get_db), current: models.Official = Depends(get_current_official)):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    missed = [u for u in scheme.usages if u.status == "missed"]
    return [{"id": u.citizen.id, "full_name": u.citizen.full_name, "year": u.year} for u in missed]


@router.post("/{scheme_id}/apply")
def apply_scheme(
    scheme_id: str,
    payload: schemas.SchemeApplyRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    target_ids = payload.citizen_ids
    if not target_ids:
        target_ids = [c.id for c in _eligible_citizens(db, scheme)]

    applied = []
    for cid in target_ids:
        existing = (
            db.query(models.SchemeUsage)
            .filter(models.SchemeUsage.scheme_id == scheme_id, models.SchemeUsage.citizen_id == cid, models.SchemeUsage.year == CURRENT_YEAR)
            .first()
        )
        if existing:
            continue
        usage = models.SchemeUsage(scheme_id=scheme_id, citizen_id=cid, year=CURRENT_YEAR, status="applied")
        db.add(usage)
        applied.append(cid)

    db.commit()

    return {"status": "applied", "applied_count": len(applied)}


@router.get("/{scheme_id}/ai-suggestions")
def ai_suggestions(
    scheme_id: str,
    citizen_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    citizen = db.query(models.Citizen).filter(models.Citizen.id == citizen_id).first()
    if not scheme or not citizen:
        raise HTTPException(status_code=404, detail="Scheme or citizen not found")

    context = {
        "documents": [d.doc_type for d in citizen.documents if d.verified],
        "problem_count": len(citizen.votes),
    }
    suggestion = ai.suggest_alternatives(context, scheme.name)
    return {"suggestion": suggestion}