from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import biometric, digilocker, notify

router = APIRouter(prefix="/users", tags=["Citizens / Users"])


def _documents_summary(citizen: models.Citizen) -> str:
    verified = [d.doc_type.value for d in citizen.documents if d.verified]
    return ", ".join(verified) if verified else "None"


def _schemes_near_count(db: Session, citizen: models.Citizen) -> int:
    verified_types = {d.doc_type for d in citizen.documents if d.verified}
    if not verified_types:
        return 0
    count = 0
    for scheme in db.query(models.Scheme).filter(models.Scheme.active == True).all():  # noqa: E712
        required = {t.strip() for t in (scheme.required_documents or "").split(",") if t.strip()}
        if required and required.issubset({t.value for t in verified_types}):
            count += 1
    return count


@router.post("", response_model=schemas.CitizenProfileOut)
def add_user(
    payload: schemas.CitizenCreateRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    existing = db.query(models.Citizen).filter(models.Citizen.phone_number == payload.phone_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this phone number already exists")

    try:
        template = biometric.resolve_capture_token(payload.fingerprint_capture_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    citizen = models.Citizen(
        full_name=payload.full_name,
        dob=payload.dob,
        phone_number=payload.phone_number,
        guardian_phone_1=payload.guardian_phone_1,
        guardian_phone_2=payload.guardian_phone_2,
        address=payload.address,
        photo_url=payload.photo_url,
        fingerprint_template=template,
        added_by_official_id=current.id,
    )
    db.add(citizen)
    db.commit()
    db.refresh(citizen)

    notify.send_sms(citizen.phone_number, f"Welcome to Sugam Seva, {citizen.full_name}. Your profile has been registered.")

    return _to_profile(db, citizen)


@router.get("", response_model=list[schemas.CitizenListItem])
def list_users(
    search: str | None = None,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    query = db.query(models.Citizen)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (models.Citizen.full_name.ilike(like)) | (models.Citizen.phone_number.ilike(like))
        )
    citizens = query.order_by(models.Citizen.created_at.desc()).all()

    results = []
    for i, c in enumerate(citizens, start=1):
        results.append(
            schemas.CitizenListItem(
                sl_no=i,
                id=c.id,
                full_name=c.full_name,
                phone_number=c.phone_number,
                documents_submitted=_documents_summary(c),
                problem_count=len(c.votes),
                schemes_near_count=_schemes_near_count(db, c),
            )
        )
    return results


def _to_profile(db: Session, citizen: models.Citizen) -> schemas.CitizenProfileOut:
    total = len(citizen.votes)
    solved = sum(1 for v in citizen.votes if v.solved)
    return schemas.CitizenProfileOut(
        id=citizen.id,
        full_name=citizen.full_name,
        dob=citizen.dob,
        phone_number=citizen.phone_number,
        guardian_phone_1=citizen.guardian_phone_1,
        guardian_phone_2=citizen.guardian_phone_2,
        address=citizen.address,
        photo_url=citizen.photo_url,
        documents=[schemas.DocumentOut.model_validate(d) for d in citizen.documents],
        total_problems=total,
        problems_solved=solved,
        problems_pending=total - solved,
    )


@router.get("/{user_id}", response_model=schemas.CitizenProfileOut)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_profile(db, citizen)


@router.post("/{user_id}/documents/scan", response_model=schemas.DocumentOut)
def scan_document(
    user_id: str,
    payload: schemas.DocumentScanRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        doc_type_enum = models.DocumentType(payload.doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Unknown document type")

    result = digilocker.scan_and_verify_document(payload.doc_type, image_ref=f"user:{user_id}")

    existing = (
        db.query(models.CitizenDocument)
        .filter(models.CitizenDocument.citizen_id == user_id, models.CitizenDocument.doc_type == doc_type_enum)
        .first()
    )
    if existing:
        doc = existing
    else:
        doc = models.CitizenDocument(citizen_id=user_id, doc_type=doc_type_enum)
        db.add(doc)

    doc.verified = result["verified"]
    doc.source = payload.source
    doc.encrypted_scan_ref = f"vault://{user_id}/{payload.doc_type}"  # placeholder for real KMS-encrypted ref
    doc.verified_at = datetime.utcnow() if result["verified"] else None
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/{user_id}/documents/import-digilocker", response_model=list[schemas.DocumentOut])
def import_digilocker(
    user_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")

    fetched = digilocker.fetch_documents_via_digilocker(citizen_aadhaar_consent_token="demo-consent")
    out = []
    for item in fetched:
        try:
            doc_type_enum = models.DocumentType(item["doc_type"])
        except ValueError:
            continue
        existing = (
            db.query(models.CitizenDocument)
            .filter(models.CitizenDocument.citizen_id == user_id, models.CitizenDocument.doc_type == doc_type_enum)
            .first()
        )
        doc = existing or models.CitizenDocument(citizen_id=user_id, doc_type=doc_type_enum)
        doc.verified = item["verified"]
        doc.source = "digilocker"
        doc.encrypted_scan_ref = f"vault://{user_id}/{item['doc_type']}"
        doc.verified_at = datetime.utcnow()
        if not existing:
            db.add(doc)
        out.append(doc)
    db.commit()
    for d in out:
        db.refresh(d)
    return out


@router.post("/{user_id}/documents/{doc_id}/reveal")
def reveal_document(
    user_id: str,
    doc_id: str,
    payload: schemas.DocumentRevealRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """The scanned document image is hidden from the dashboard by default.
    A fresh fingerprint verification token (from POST /biometric/verify)
    is required to reveal the reference to the encrypted scan."""
    if not biometric.check_verification_token(payload.fingerprint_verification_token):
        raise HTTPException(status_code=401, detail="Fingerprint verification required or expired")
    doc = db.query(models.CitizenDocument).filter(
        models.CitizenDocument.id == doc_id, models.CitizenDocument.citizen_id == user_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"doc_type": doc.doc_type.value, "encrypted_scan_ref": doc.encrypted_scan_ref}
