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


def _format_display_date(date_str: str | None) -> str:
    if not date_str:
        return "Ongoing"
    try:
        if "-" in date_str and len(date_str.split("-")[0]) == 4:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%d %b %Y")
    except Exception:
        pass
    return date_str


def _evaluate_scheme_status(start_date_str: str | None, end_date_str: str | None):
    """Evaluates whether the scheme is open, closed, or upcoming based on application dates."""
    today = datetime.utcnow().date()
    if not end_date_str:
        return True, "open", "Applications Active", None

    try:
        if "-" in end_date_str and len(end_date_str.split("-")[0]) == 4:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        else:
            end_date = datetime.strptime(end_date_str, "%d %b %Y").date()
    except Exception:
        return True, "open", "Applications Active", None

    start_date = None
    if start_date_str:
        try:
            if "-" in start_date_str and len(start_date_str.split("-")[0]) == 4:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            else:
                start_date = datetime.strptime(start_date_str, "%d %b %Y").date()
        except Exception:
            start_date = None

    if start_date and today < start_date:
        days = (start_date - today).days
        return False, "upcoming", f"Opens on {_format_display_date(start_date_str)}", days

    if today > end_date:
        return False, "closed", f"Closed on {_format_display_date(end_date_str)}", 0

    days_left = (end_date - today).days
    return True, "open", f"Open (Closes {_format_display_date(end_date_str)})", days_left


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
        if verified_types and (required.intersection(verified_types) or "aadhaar card" in verified_types):
            eligible.append(c)
    return eligible


@router.get("", response_model=list[schemas.SchemeMasterListItem])
def list_all_schemes(
    search: str | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Every scheme in the master catalog: Sl.No, Scheme Name, Applied Count, Open/Closed status."""
    schemes = db.query(models.Scheme).order_by(models.Scheme.code, models.Scheme.name).all()
    if search:
        like = search.lower()
        schemes = [s for s in schemes if like in s.name.lower() or (s.code and like in s.code.lower())]

    results = []
    for i, s in enumerate(schemes, start=1):
        is_open, status, _, _ = _evaluate_scheme_status(s.application_start_date, s.application_end_date)
        results.append(
            schemas.SchemeMasterListItem(
                sl_no=i,
                id=s.id,
                code=s.code,
                name=s.name,
                applied_count=_applied_count(db, s.id),
                is_open=is_open,
                status=status,
                application_start_date=_format_display_date(s.application_start_date),
                application_end_date=_format_display_date(s.application_end_date),
            )
        )
    return results


@router.get("/{scheme_id}", response_model=schemas.SchemeProfileOut)
def get_scheme_profile(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Full scheme profile: summary, eligibility criteria, exact PDF apply URL,
    application window dates, real-time open/closed status, and updated counts."""
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
    eligible_list = _eligible_citizens(db, scheme)
    eligible_count = len(eligible_list)

    is_open, status, status_label, days_remaining = _evaluate_scheme_status(
        scheme.application_start_date, scheme.application_end_date
    )

    # When scheme deadline is completed (closed), all eligible citizens who didn't apply are counted as missed!
    if not is_open and status == "closed":
        applied_or_used_ids = {u.citizen_id for u in scheme.usages if u.status in ("applied", "used")}
        unapplied_eligible = len([c for c in eligible_list if c.id not in applied_or_used_ids])
        missed_count = max(missed_count, unapplied_eligible)

    candidate_docs = [d.strip() for d in (scheme.candidate_documents or "").split(";") if d.strip()]
    apply_url = scheme.apply_url or "https://www.myscheme.gov.in/"

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
        application_start_date=_format_display_date(scheme.application_start_date),
        application_end_date=_format_display_date(scheme.application_end_date),
        apply_url=apply_url,
        is_open=is_open,
        status=status,
        status_label=status_label,
        days_remaining=days_remaining,
    )


@router.get("/{scheme_id}/missed", response_model=list[schemas.SchemePersonItem])
def scheme_missed_by(
    scheme_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Returns citizens who missed this scheme (recorded missed + unapplied eligible if closed)."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    is_open, status, _, _ = _evaluate_scheme_status(
        scheme.application_start_date, scheme.application_end_date
    )

    recorded_missed = [u for u in scheme.usages if u.status == "missed"]
    missed_citizen_ids = {u.citizen_id for u in recorded_missed}

    results = [
        schemas.SchemePersonItem(
            id=u.citizen.id,
            full_name=u.citizen.full_name,
            phone_number=u.citizen.phone_number,
            year=u.year,
        )
        for u in recorded_missed
    ]

    # If scheme deadline has passed (closed), all eligible citizens who did not apply missed this scheme!
    if not is_open and status == "closed":
        applied_or_used_ids = {
            u.citizen_id for u in scheme.usages if u.status in ("applied", "used")
        }
        eligible = _eligible_citizens(db, scheme)
        for c in eligible:
            if c.id not in applied_or_used_ids and c.id not in missed_citizen_ids:
                results.append(
                    schemas.SchemePersonItem(
                        id=c.id,
                        full_name=c.full_name,
                        phone_number=c.phone_number,
                        year=CURRENT_YEAR,
                    )
                )
                missed_citizen_ids.add(c.id)

    return results


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
    """Enrolls citizens into the scheme if currently open."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    is_open, status, status_label, _ = _evaluate_scheme_status(
        scheme.application_start_date, scheme.application_end_date
    )
    if not is_open:
        raise HTTPException(
            status_code=400,
            detail=f"Applications for {scheme.name} are currently closed ({status_label}).",
        )

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
            usage = models.SchemeUsage(
                scheme_id=scheme_id, citizen_id=cid, year=CURRENT_YEAR, status="applied"
            )
            db.add(usage)
        applied.append(cid)

    db.commit()
    return {"status": "applied", "applied_count": len(applied)}