from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import ai

router = APIRouter(prefix="/schemes", tags=["Schemes"])
CURRENT_YEAR = datetime.utcnow().year


def _clean_doc_display_list(doc_list: list[str]) -> list[str]:
    seen = set()
    cleaned = []
    for d in doc_list:
        norm = d.lower().strip()
        if "aadhaar" in norm:
            key = "Aadhaar Card"
        elif "bank" in norm or "passbook" in norm or "ifsc" in norm:
            key = "Bank Passbook / Account"
        elif "ration" in norm:
            key = "Ration Card"
        elif "pan card" in norm or norm == "pan":
            key = "PAN Card"
        elif "voter" in norm or "epic" in norm:
            key = "Voter ID"
        else:
            key = d

        if key not in seen:
            seen.add(key)
            cleaned.append(key)
    return cleaned


def evaluate_scheme_for_citizen(
    scheme: models.Scheme,
    citizen_verified_docs_lower: set[str],
    citizen_problem_categories_lower: set[str],
    citizen_usage_map: dict[str, str],
) -> schemas.CitizenNearSchemeItem | None:
    # Extract candidate / required documents
    raw_docs = []
    if scheme.candidate_documents:
        raw_docs.extend(scheme.candidate_documents.split(";"))
    elif scheme.required_documents:
        raw_docs.extend(scheme.required_documents.split(","))

    seen_lower = set()
    scheme_docs = []
    for d in raw_docs:
        d_clean = d.strip()
        if d_clean and d_clean.lower() not in seen_lower:
            seen_lower.add(d_clean.lower())
            scheme_docs.append(d_clean)

    matched_docs_raw = []
    missing_docs_raw = []
    for d in scheme_docs:
        d_lower = d.lower()
        is_matched = False
        for cv in citizen_verified_docs_lower:
            if d_lower == cv or (len(cv) >= 4 and cv in d_lower) or (len(d_lower) >= 4 and d_lower in cv):
                is_matched = True
                break
        if is_matched:
            matched_docs_raw.append(d)
        else:
            missing_docs_raw.append(d)

    cleaned_matched = _clean_doc_display_list(matched_docs_raw)
    cleaned_missing = _clean_doc_display_list(missing_docs_raw)
    # Ensure items in cleaned_matched do not appear in cleaned_missing
    matched_names_lower = {m.lower() for m in cleaned_matched}
    cleaned_missing = [
        m for m in cleaned_missing
        if m.lower() not in matched_names_lower
        and not any(cv in m.lower() or m.lower() in cv for cv in citizen_verified_docs_lower if len(cv) >= 4)
    ]

    match_count = len(cleaned_matched)
    total_docs = max(1, match_count + len(cleaned_missing))
    match_percentage = round((match_count / total_docs) * 100) if total_docs else 100

    problem_matched = bool(
        scheme.problem_category
        and scheme.problem_category.lower() in citizen_problem_categories_lower
    )

    # Near scheme condition: at least 1 document matched or problem category matched
    if match_count == 0 and not problem_matched:
        return None

    # Eligibility condition: all required documents matched or >= 50% matched when candidate docs pool is provided
    is_eligible = (len(cleaned_missing) == 0 and len(cleaned_matched) > 0) or match_percentage >= 50

    from app.routers.scheme_list import _evaluate_scheme_status, _format_display_date
    is_open, status, status_label, _ = _evaluate_scheme_status(
        scheme.application_start_date, scheme.application_end_date
    )

    usage_status = citizen_usage_map.get(scheme.id, "not_applied")

    return schemas.CitizenNearSchemeItem(
        id=scheme.id,
        code=scheme.code,
        name=scheme.name,
        category=scheme.problem_category or scheme.category,
        ministry=scheme.ministry,
        summary=scheme.source_summary or scheme.summary,
        benefit_amount=scheme.benefit_amount,
        is_open=is_open,
        status=status,
        status_label=status_label,
        application_end_date=_format_display_date(scheme.application_end_date),
        apply_url=scheme.apply_url or "https://www.myscheme.gov.in/",
        matched_documents=cleaned_matched,
        missing_documents=cleaned_missing,
        match_count=match_count,
        total_docs_count=total_docs,
        match_percentage=match_percentage,
        is_eligible=is_eligible,
        user_usage_status=usage_status,
    )


def _eligible_citizens(db: Session, scheme: models.Scheme) -> list[models.Citizen]:
    raw_docs = []
    if scheme.candidate_documents:
        raw_docs.extend(scheme.candidate_documents.split(";"))
    elif scheme.required_documents:
        raw_docs.extend(scheme.required_documents.split(","))
    required = {t.strip().lower() for t in raw_docs if t.strip()}
    citizens = db.query(models.Citizen).all()
    if not required:
        return citizens
    eligible = []
    for c in citizens:
        verified_types = {d.doc_type.lower() for d in c.documents if d.verified}
        if verified_types and (
            required.intersection(verified_types)
            or any(any(cv in req or req in cv for cv in verified_types) for req in required)
        ):
            eligible.append(c)
    return eligible


@router.get("", response_model=list[schemas.SchemeListItem])
def list_schemes_near_people(
    search: str | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """One row per citizen with near schemes (user name, phone, eligible count, near count, documents matched)."""
    citizens = db.query(models.Citizen).order_by(models.Citizen.created_at.desc()).all()
    if search:
        like = search.lower().strip()
        citizens = [c for c in citizens if like in c.full_name.lower() or like in c.phone_number]

    schemes = db.query(models.Scheme).filter(models.Scheme.active == True).all()  # noqa: E712
    results = []
    sl = 1
    for c in citizens:
        verified_docs_display = [d.doc_type for d in c.documents if d.verified]
        verified_docs_lower = {d.lower() for d in verified_docs_display}
        problem_cats_lower = {
            v.problem.category.lower() for v in c.votes if v.problem and v.problem.category
        }
        usage_map = {u.scheme_id: u.status for u in c.scheme_usages}

        citizen_near_schemes = []
        for s in schemes:
            evaluated = evaluate_scheme_for_citizen(
                s, verified_docs_lower, problem_cats_lower, usage_map
            )
            if evaluated:
                citizen_near_schemes.append(evaluated)

        # Sort: eligible first, then match count descending, then match percentage descending
        citizen_near_schemes.sort(
            key=lambda x: (x.is_eligible, x.match_count, x.match_percentage, x.is_open),
            reverse=True,
        )

        eligible_count = sum(1 for s in citizen_near_schemes if s.is_eligible)
        near_count = len(citizen_near_schemes)

        # Top 4 near schemes preview for this citizen
        top_schemes = [
            schemas.TopNearSchemeSummary(
                id=s.id,
                code=s.code,
                name=s.name,
                category=s.category,
                matched_count=s.match_count,
                missing_count=len(s.missing_documents),
                is_eligible=s.is_eligible,
            )
            for s in citizen_near_schemes[:4]
        ]

        matched_doc_names = sorted(list(set(verified_docs_display)))
        docs_matched_str = ", ".join(matched_doc_names) if matched_doc_names else "None"

        results.append(
            schemas.SchemeListItem(
                sl_no=sl,
                id=c.id,
                name=c.full_name,
                phone_number=c.phone_number,
                eligible_count=eligible_count,
                near_schemes_count=near_count,
                documents_matched=docs_matched_str,
                documents_matched_list=matched_doc_names,
                top_near_schemes=top_schemes,
            )
        )
        sl += 1

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
        summary = ai_result.get("summary", "")
    else:
        summary = scheme.summary

    return schemas.SchemeDetailOut(
        id=scheme.id,
        name=scheme.name,
        category=scheme.category,
        ministry=scheme.ministry,
        benefit_amount=scheme.benefit_amount,
        summary=summary,
        pros=[],
        cons=[],
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