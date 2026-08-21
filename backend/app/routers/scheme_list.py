from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official

router = APIRouter(prefix="/scheme-list", tags=["List of Schemes"])


def _applied_count(db: Session, scheme_id: str) -> int:
    return (
        db.query(func.count(func.distinct(models.SchemeUsage.citizen_id)))
        .filter(models.SchemeUsage.scheme_id == scheme_id)
        .scalar()
        or 0
    )


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
        schemes = [s for s in schemes if like in s.name.lower()]

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
    category), and every other field carried over from the master schemes
    workbook."""
    scheme = db.query(models.Scheme).filter(models.Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    used_count = (
        db.query(func.count(func.distinct(models.SchemeUsage.citizen_id)))
        .filter(models.SchemeUsage.scheme_id == scheme_id, models.SchemeUsage.status == "used")
        .scalar()
        or 0
    )

    candidate_docs = [d.strip() for d in (scheme.candidate_documents or "").split(";") if d.strip()]

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
        applied_count=_applied_count(db, scheme.id),
        used_count=used_count,
    )