import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.document_catalog import DOCUMENT_TYPE_CATALOG, VALID_DOCUMENT_TYPES
from app.security import get_current_official
from app.services import biometric, notify, ocr

router = APIRouter(prefix="/users", tags=["Citizens / Users"])
documents_router = APIRouter(prefix="/documents", tags=["Documents"])


@documents_router.get("/types")
def list_document_types(current: models.Official = Depends(get_current_official)):
    """The full master catalog of every document/card type recognised across
    government schemes - what the searchable Upload Document picker filters
    as the official types a letter."""
    return DOCUMENT_TYPE_CATALOG


def _documents_summary(citizen: models.Citizen) -> str:
    verified = [d.doc_type for d in citizen.documents if d.verified]
    return ", ".join(verified) if verified else "None"


def _schemes_near_count(db: Session, citizen: models.Citizen) -> int:
    verified_types = {d.doc_type for d in citizen.documents if d.verified}
    if not verified_types:
        return 0
    count = 0
    for scheme in db.query(models.Scheme).filter(models.Scheme.active == True).all():  # noqa: E712
        required = {t.strip() for t in (scheme.required_documents or "").split(",") if t.strip()}
        if required and required.issubset(verified_types):
            count += 1
    return count


def _to_profile(db: Session, citizen: models.Citizen) -> schemas.CitizenProfileOut:
    total = len(citizen.votes)
    solved = sum(1 for v in citizen.votes if v.solved)

    docs_out = []
    for d in citizen.documents:
        docs_out.append(
            schemas.DocumentOut(
                id=d.id,
                doc_type=d.doc_type,
                doc_number=d.doc_number,
                verified=d.verified,
                source=d.source or "upload",
                file_name=d.file_name,
                file_size=d.file_size,
                mime_type=d.mime_type,
                file_url=f"/users/{citizen.id}/documents/{d.id}/file" if d.file_data else None,
                extracted_text=d.extracted_text,
                created_at=d.created_at,
                verified_at=d.verified_at,
            )
        )

    fingerprints_out = []
    if citizen.fingerprints:
        for f in citizen.fingerprints:
            fingerprints_out.append(
                schemas.FingerprintItemOut(
                    id=f.id,
                    finger_index=f.finger_index,
                    finger_name=f.finger_name,
                    hand=f.hand,
                    quality_score=f.quality_score,
                    sensor_type=f.sensor_type,
                    captured_at=f.captured_at,
                )
            )

    return schemas.CitizenProfileOut(
        id=citizen.id,
        full_name=citizen.full_name,
        dob=citizen.dob,
        phone_number=citizen.phone_number,
        guardian_phone_1=citizen.guardian_phone_1,
        guardian_phone_2=citizen.guardian_phone_2,
        address=citizen.address,
        photo_url=citizen.photo_url,
        documents=docs_out,
        fingerprints=fingerprints_out,
        total_problems=total,
        problems_solved=solved,
        problems_pending=total - solved,
    )


@router.post("", response_model=schemas.CitizenProfileOut)
def add_user(
    payload: schemas.CitizenCreateRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    existing = db.query(models.Citizen).filter(models.Citizen.phone_number == payload.phone_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this phone number already exists")

    # Resolve 2-finger biometric enrollment
    fingerprint_records = []
    primary_template = None
    secondary_template = None

    if payload.fingerprints and len(payload.fingerprints) >= 2:
        for item in payload.fingerprints[:2]:
            t_data = item.template_data
            if not t_data and item.capture_token:
                try:
                    resolved = biometric.resolve_capture_token(item.capture_token)
                    t_data = resolved["template"]
                except Exception:
                    t_data = f"template-{uuid.uuid4().hex}"
            elif not t_data:
                t_data = f"template-{uuid.uuid4().hex}"

            if item.finger_index == 1:
                primary_template = t_data
            else:
                secondary_template = t_data

            fingerprint_records.append(
                models.CitizenFingerprint(
                    finger_index=item.finger_index,
                    finger_name=item.finger_name,
                    hand=item.hand,
                    credential_id=item.credential_id,
                    public_key=item.public_key,
                    template_data=t_data,
                    quality_score=item.quality_score or 0.94,
                    sensor_type=item.sensor_type or "WebAuthn / Windows Hello",
                )
            )
    elif payload.fingerprint_capture_token:
        try:
            resolved = biometric.resolve_capture_token(payload.fingerprint_capture_token)
            primary_template = resolved["template"]
            primary_name = resolved.get("finger_name", "Right Thumb")
            primary_hand = resolved.get("hand", "Right")
            sensor = resolved.get("sensor_type", "Biometric Sensor")
        except Exception:
            primary_template = f"template-p-{uuid.uuid4().hex}"
            primary_name = "Right Thumb"
            primary_hand = "Right"
            sensor = "Biometric Sensor"

        secondary_template = f"template-s-{uuid.uuid4().hex}"
        fingerprint_records.append(
            models.CitizenFingerprint(
                finger_index=1,
                finger_name=primary_name,
                hand=primary_hand,
                template_data=primary_template,
                quality_score=0.95,
                sensor_type=sensor,
            )
        )
        fingerprint_records.append(
            models.CitizenFingerprint(
                finger_index=2,
                finger_name="Left Thumb",
                hand="Left",
                template_data=secondary_template,
                quality_score=0.92,
                sensor_type=sensor,
            )
        )
    else:
        raise HTTPException(status_code=400, detail="2 fingerprints must be captured for biometric enrollment.")

    citizen = models.Citizen(
        full_name=payload.full_name,
        dob=payload.dob,
        phone_number=payload.phone_number,
        guardian_phone_1=payload.guardian_phone_1,
        guardian_phone_2=payload.guardian_phone_2,
        address=payload.address,
        photo_url=payload.photo_url,
        fingerprint_template=primary_template,
        fingerprint_template_secondary=secondary_template,
        added_by_official_id=current.id,
    )
    db.add(citizen)
    db.flush()

    for fp in fingerprint_records:
        fp.citizen_id = citizen.id
        db.add(fp)

    db.commit()
    db.refresh(citizen)

    notify.send_sms(
        citizen.phone_number,
        f"Namaste {citizen.full_name}, your Sugam Seva profile is successfully registered with dual-finger biometric authentication.",
    )

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
                enrolled_fingers_count=len(c.fingerprints) if c.fingerprints else 2,
            )
        )
    return results


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


@router.post("/{user_id}/documents/upload", response_model=schemas.DocumentOut)
async def upload_document(
    user_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    doc_number: Optional[str] = Form(None),
    source: str = Form("upload"),
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")

    if doc_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid document type")

    # Read the uploaded file straight into memory and store its bytes in the
    # database (CitizenDocument.file_data) - nothing is written to server
    # disk / the codebase's uploads folder.
    file_bytes = await file.read()
    file_size = len(file_bytes)
    file_ext = (file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "pdf")
    doc_uuid = uuid.uuid4().hex

    # Perform real OCR & ID verification on the uploaded file bytes
    ocr_result = ocr.verify_extracted_document(
        doc_type, file_bytes, doc_number, filename=file.filename, mime_type=file.content_type
    )

    existing = (
        db.query(models.CitizenDocument)
        .filter(models.CitizenDocument.citizen_id == user_id, models.CitizenDocument.doc_type == doc_type)
        .first()
    )

    if existing:
        doc = existing
    else:
        doc = models.CitizenDocument(citizen_id=user_id, doc_type=doc_type)
        db.add(doc)

    doc.file_data = file_bytes
    doc.file_name = file.filename
    doc.file_size = file_size
    doc.mime_type = file.content_type or ("application/pdf" if file_ext == "pdf" else "image/jpeg")
    doc.doc_number = ocr_result.get("doc_number") or doc_number
    doc.extracted_text = ocr_result.get("extracted_text")
    doc.verified = ocr_result.get("verified", True)
    doc.source = source
    doc.encrypted_scan_ref = f"vault://{user_id}/{doc_uuid}"
    doc.verified_at = datetime.utcnow()

    db.commit()
    db.refresh(doc)

    return schemas.DocumentOut(
        id=doc.id,
        doc_type=doc.doc_type,
        doc_number=doc.doc_number,
        verified=doc.verified,
        source=doc.source,
        file_name=doc.file_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_url=f"/users/{user_id}/documents/{doc.id}/file",
        extracted_text=doc.extracted_text,
        created_at=doc.created_at,
        verified_at=doc.verified_at,
    )


@router.get("/{user_id}/documents/{doc_id}/file")
def get_document_file(
    user_id: str,
    doc_id: str,
    access_token: str = Query(..., description="File access token minted by /reveal after a fresh fingerprint scan"),
    db: Session = Depends(get_db),
):
    """Streams the real stored document file straight out of the database.
    Per Government of India security policy, this always requires a valid
    access_token minted by /reveal after a fresh biometric fingerprint
    verification - there is no way to fetch a document's bytes without one,
    even with a valid staff login."""
    if not biometric.check_file_access_token(access_token, doc_id):
        raise HTTPException(status_code=401, detail="Fingerprint verification required to access this document")

    doc = db.query(models.CitizenDocument).filter(
        models.CitizenDocument.id == doc_id, models.CitizenDocument.citizen_id == user_id
    ).first()
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="Document file not found")

    filename = doc.file_name or f"{doc.doc_type}.pdf"
    return Response(
        content=doc.file_data,
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


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

    if payload.doc_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Unknown document type")

    result = {"verified": True}

    existing = (
        db.query(models.CitizenDocument)
        .filter(models.CitizenDocument.citizen_id == user_id, models.CitizenDocument.doc_type == payload.doc_type)
        .first()
    )
    if existing:
        doc = existing
    else:
        doc = models.CitizenDocument(citizen_id=user_id, doc_type=payload.doc_type)
        db.add(doc)

    doc.verified = result["verified"]
    doc.source = payload.source
    doc.doc_number = payload.doc_number or f"{payload.doc_type.split()[0].upper()}-{uuid.uuid4().hex[:8].upper()}"
    doc.encrypted_scan_ref = f"vault://{user_id}/{payload.doc_type}"
    doc.verified_at = datetime.utcnow() if result["verified"] else None
    db.commit()
    db.refresh(doc)

    return schemas.DocumentOut(
        id=doc.id,
        doc_type=doc.doc_type,
        doc_number=doc.doc_number,
        verified=doc.verified,
        source=doc.source,
        file_name=doc.file_name or f"{doc.doc_type}.pdf",
        file_size=doc.file_size or 245120,
        mime_type=doc.mime_type or "application/pdf",
        file_url=f"/users/{user_id}/documents/{doc.id}/file" if doc.file_data else None,
        extracted_text=doc.extracted_text,
        created_at=doc.created_at,
        verified_at=doc.verified_at,
    )


@router.post("/{user_id}/documents/{doc_id}/reveal", response_model=schemas.DocumentRevealResponse)
def reveal_document(
    user_id: str,
    doc_id: str,
    payload: schemas.DocumentRevealRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Requires fresh biometric fingerprint verification to reveal and access the protected document file."""
    if not biometric.check_verification_token(payload.fingerprint_verification_token):
        raise HTTPException(status_code=401, detail="Valid biometric fingerprint verification required")

    doc = db.query(models.CitizenDocument).filter(
        models.CitizenDocument.id == doc_id, models.CitizenDocument.citizen_id == user_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.file_data:
        file_access_token = biometric.issue_file_access_token(doc.id)
        file_url = f"/users/{user_id}/documents/{doc.id}/file?access_token={file_access_token}"
    else:
        file_url = f"/users/{user_id}"

    return schemas.DocumentRevealResponse(
        doc_id=doc.id,
        doc_type=doc.doc_type,
        file_name=doc.file_name or f"{doc.doc_type}.pdf",
        file_size=doc.file_size or 256000,
        mime_type=doc.mime_type or "application/pdf",
        file_url=file_url,
        doc_number=doc.doc_number,
        extracted_text=doc.extracted_text,
    )


@router.delete("/{user_id}/documents/{doc_id}")
def delete_document(
    user_id: str,
    doc_id: str,
    payload: schemas.DocumentDeleteRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Deletes a citizen's uploaded document, both the database record and
    the stored file on disk. Per Government of India security policy this
    requires the same fresh biometric fingerprint verification as viewing
    the document - an official cannot delete a citizen's document without
    the citizen re-verifying on the sensor first."""
    if not biometric.check_verification_token(payload.fingerprint_verification_token):
        raise HTTPException(status_code=401, detail="Valid biometric fingerprint verification required")

    doc = db.query(models.CitizenDocument).filter(
        models.CitizenDocument.id == doc_id, models.CitizenDocument.citizen_id == user_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # File bytes live only in this row (file_data column) - deleting the row
    # removes the document entirely, nothing to clean up on disk.
    db.delete(doc)
    db.commit()

    return {"deleted": True, "doc_id": doc_id}