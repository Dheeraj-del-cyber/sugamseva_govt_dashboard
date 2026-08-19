from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import biometric, digilocker

router = APIRouter(prefix="/biometric", tags=["Biometric"])


@router.post("/capture", response_model=schemas.BiometricCaptureResponse)
def capture(subject_hint: str = "citizen", current: models.Official = Depends(get_current_official)):
    """Step 1 of registering a new fingerprint: capture a fresh scan and
    get back a short-lived token to attach to the new citizen/official
    record."""
    token, quality = biometric.capture_fingerprint(subject_hint)
    return schemas.BiometricCaptureResponse(fingerprint_capture_token=token, quality_score=quality)


@router.post("/verify", response_model=schemas.BiometricVerifyResponse)
def verify(payload: schemas.BiometricVerifyRequest, db: Session = Depends(get_db),
           current: models.Official = Depends(get_current_official)):
    """Re-scan and match against a stored template. Returns a short-lived
    verification_token required to unlock protected actions: viewing a
    scanned document, or marking a problem as solved."""
    if payload.subject_type == "citizen":
        subject = db.query(models.Citizen).filter(models.Citizen.id == payload.subject_id).first()
    else:
        subject = db.query(models.Official).filter(models.Official.id == payload.subject_id).first()

    if not subject or not subject.fingerprint_template:
        raise HTTPException(status_code=404, detail="No biometric profile found for this subject")

    token = biometric.verify_fingerprint(subject.fingerprint_template)
    return schemas.BiometricVerifyResponse(verified=True, verification_token=token)
