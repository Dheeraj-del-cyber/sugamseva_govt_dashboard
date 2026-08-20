from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official
from app.services import biometric

router = APIRouter(prefix="/biometric", tags=["Biometric"])


@router.post("/capture", response_model=schemas.BiometricCaptureResponse)
def capture(
    subject_hint: str = Query(default="citizen", description="citizen or official"),
    finger_name: str = Query(default="Right Thumb", description="Right Thumb, Left Thumb, etc."),
    hand: str = Query(default="Right", description="Right or Left"),
    sensor_type: str = Query(default="WebAuthn / Windows Hello"),
    quality_score: float | None = Query(default=None),
):
    """Capture a single finger scan from sensor (Windows Hello / Touch ID / RD Service / Biometric Pad)
    and return short-lived capture token."""
    token, quality, name, preview = biometric.capture_fingerprint(
        subject_hint=subject_hint,
        finger_name=finger_name,
        hand=hand,
        sensor_type=sensor_type,
        quality_score=quality_score,
    )
    return schemas.BiometricCaptureResponse(
        fingerprint_capture_token=token,
        quality_score=quality,
        finger_name=name,
        hand=hand,
        sensor_type=sensor_type,
        template_preview_hash=preview,
    )


@router.post("/verify", response_model=schemas.BiometricVerifyResponse)
def verify(
    payload: schemas.BiometricVerifyRequest,
    db: Session = Depends(get_db),
):
    """Re-scan and match against either of the citizen's / official's enrolled fingers.
    Returns a short-lived verification_token required to unlock protected actions."""
    if payload.subject_type == "citizen":
        subject = db.query(models.Citizen).filter(models.Citizen.id == payload.subject_id).first()
    else:
        subject = db.query(models.Official).filter(models.Official.id == payload.subject_id).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    primary_template = subject.fingerprint_template
    secondary_template = getattr(subject, "fingerprint_template_secondary", None)

    # If fingerprints relationship exists, load names
    primary_name = "Right Thumb"
    secondary_name = "Left Thumb"

    if hasattr(subject, "fingerprints") and subject.fingerprints:
        for f in subject.fingerprints:
            if f.finger_index == 1:
                primary_template = f.template_data
                primary_name = f.finger_name
            elif f.finger_index == 2:
                secondary_template = f.template_data
                secondary_name = f.finger_name

    if not primary_template:
        raise HTTPException(status_code=404, detail="No biometric fingerprints registered for this subject")

    result = biometric.verify_fingerprint(
        primary_template=primary_template,
        secondary_template=secondary_template,
        primary_name=primary_name,
        secondary_name=secondary_name,
        live_token=payload.live_token,
        finger_index_preference=payload.finger_index,
    )

    return schemas.BiometricVerifyResponse(
        verified=True,
        verification_token=result["verification_token"],
        matched_finger_name=result["matched_finger"],
        hand=result["hand"],
        quality_score=result["quality_score"],
        message=f"Verified via {result['matched_finger']} ({int(result['quality_score'] * 100)}% quality match)",
    )
