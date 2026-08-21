from datetime import datetime
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import ai

router = APIRouter(prefix="/scheme-list", tags=["List of Schemes"])
CURRENT_YEAR = datetime.utcnow().year


def _applied_count(db: Session, scheme_id: str) -> int:
    return (
        db.query(func.count(func.distinct(models.SchemeUsage.citizen_id)))
        .filter(models.SchemeUsage.scheme_id == scheme_id)
        .scalar()
        or 0
    )


def _missed_count(db: Session, scheme_id: str) -> int:
    return (
        db.query(func.count(func.distinct(models.SchemeUsage.citizen_id)))
        .filter(models.SchemeUsage.scheme_id == scheme_id, models.SchemeUsage.status == "missed")
        .scalar()
        or 0
    )


def _eligible_citizens(db: Session, scheme: models.Scheme) -> list[models.Citizen]:
    required = {t.strip().lower() for t in (scheme.required_documents or "").split(",") if t.strip()}
    citizens = db.query(models.Citizen).all()
    if not required:
        return citizens
    eligible = []
    for c in citizens:
        verified_types = {d.doc_type.lower() for d in c.documents if d.verified}
        # Citizen matches if they have matching verified documents or Aadhaar Card
        if verified_types and (required.intersection(verified_types) or "aadhaar card" in verified_types):
            eligible.append(c)
    return eligible


@router.get("", response_model=list[schemas.SchemeMasterListItem])
def list_all_schemes(
    search: str | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Every scheme in the master catalog: Sl.No, Scheme Name, No of people applied."""
    schemes = db.query(models.Scheme).order_by(models.Scheme.code, models.Scheme.name).all()
    if search:
        like = search.lower()
        schemes = [s for s in schemes if like in s.name.lower() or (s.code and like in s.code.lower())]

    results = []
    for i, s in enumerate(schemes, start=1):
        results.append(
            schemas.SchemeMasterListItem(
                sl_no=i,
                id=s.id,
                code=s.code,
                name=s.name,
                applied_count=_applied_count(db, s.id),
            )
        )
    return results


@router.get("/{scheme_id}", response_model=schemas.SchemeProfileOut)
def get_scheme_profile(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Full scheme profile: summary, eligibility criteria (documents, problem
    category), application window dates, apply URL, and live counts."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    used_count = (
        db.query(func.count(func.distinct(models.SchemeUsage.citizen_id)))
        .filter(models.SchemeUsage.scheme_id == scheme_id, models.SchemeUsage.status == "used")
        .scalar()
        or 0
    )

    missed_count = _missed_count(db, scheme.id)
    applied_count = _applied_count(db, scheme.id)
    eligible_count = len(_eligible_citizens(db, scheme))

    candidate_docs = [d.strip() for d in (scheme.candidate_documents or "").split(";") if d.strip()]

    start_date = scheme.application_start_date or "01 Apr 2025"
    end_date = scheme.application_end_date or "31 Mar 2026"
    apply_url = scheme.apply_url or f"https://www.myscheme.gov.in/schemes/{(scheme.code or 'scheme').lower()}"

    return schemas.SchemeProfileOut(
        id=scheme.id,
        code=scheme.code,
        name=scheme.name,
        government_level=scheme.government_level,
        scheme_type=scheme.scheme_type,
        ministry=scheme.ministry,
        year_of_launch=scheme.year_of_launch,
        source_sector=scheme.source_sector,
        source_summary=scheme.source_summary,
        source=scheme.source,
        problem_category=scheme.problem_category,
        problem_mapping_note=scheme.problem_mapping_note,
        candidate_documents=candidate_docs,
        document_mapping_note=scheme.document_mapping_note,
        data_source=scheme.data_source,
        applied_count=applied_count,
        used_count=used_count,
        missed_count=missed_count,
        eligible_count=eligible_count,
        application_start_date=start_date,
        application_end_date=end_date,
        apply_url=apply_url,
    )


@router.get("/{scheme_id}/missed", response_model=list[schemas.SchemePersonItem])
def scheme_missed_by(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Returns citizens who missed this scheme."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    missed = [u for u in scheme.usages if u.status == "missed"]
    return [
        schemas.SchemePersonItem(
            id=u.citizen.id,
            full_name=u.citizen.full_name,
            phone_number=u.citizen.phone_number,
            year=u.year,
        )
        for u in missed
    ]


@router.get("/{scheme_id}/used", response_model=list[schemas.SchemePersonItem])
def scheme_used_by(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Returns citizens who used this scheme."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    used = [u for u in scheme.usages if u.status == "used"]
    return [
        schemas.SchemePersonItem(
            id=u.citizen.id,
            full_name=u.citizen.full_name,
            phone_number=u.citizen.phone_number,
            year=u.year,
        )
        for u in used
    ]


@router.get("/{scheme_id}/applied", response_model=list[schemas.SchemePersonItem])
def scheme_applied_by(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Returns citizens who applied for this scheme."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    applied = [u for u in scheme.usages if u.status == "applied"]
    return [
        schemas.SchemePersonItem(
            id=u.citizen.id,
            full_name=u.citizen.full_name,
            phone_number=u.citizen.phone_number,
            year=u.year,
        )
        for u in applied
    ]


@router.get("/{scheme_id}/ai-suggestions")
def ai_suggestions_scheme_profile(
    scheme_id: str,
    citizen_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Provides AI guidance for citizens who missed the scheme."""
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


@router.post("/{scheme_id}/apply")
def apply_scheme_profile(
    scheme_id: str,
    payload: schemas.SchemeApplyRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Enrolls citizens into the scheme."""
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
            .filter(
                models.SchemeUsage.scheme_id == scheme_id,
                models.SchemeUsage.citizen_id == cid,
                models.SchemeUsage.year == CURRENT_YEAR,
            )
            .first()
        )
        if existing:
            existing.status = "applied"
        else:
            usage = models.SchemeUsage(scheme_id=scheme_id, citizen_id=cid, year=CURRENT_YEAR, status="applied")
            db.add(usage)
        applied.append(cid)

    db.commit()
    return {"status": "applied", "applied_count": len(applied)}