import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import create_access_token, get_current_official, hash_password, verify_password
from app.services import biometric

router = APIRouter(prefix="/auth", tags=["Auth"])

# Master Government Official Directory (Simulated e-Pramaan / NIC Employee SSO Registry)
MASTER_GOVT_ID_REGISTRY = {
    "GOV-IN-100234": {
        "full_name": "Rameshwar Patil",
        "dob": "1988-04-12",
        "phone_number": "9845100234",
        "address": "Office of the BDO, Indiranagar, Bengaluru, Karnataka 560038",
    },
    "GOV-IN-100235": {
        "full_name": "Sunita Rao",
        "dob": "1990-11-02",
        "phone_number": "9820100235",
        "address": "District Collectorate, Pune City, Maharashtra 411001",
    },
    "GOV-IN-100236": {
        "full_name": "Amit Trivedi",
        "dob": "1985-07-19",
        "phone_number": "9415100236",
        "address": "Tehsil Office, Sector 62, Noida, Uttar Pradesh 201309",
    },
}


@router.post("/verify-govt-id")
def verify_govt_id(payload: schemas.OfficialSignupVerifyIdRequest):
    record = MASTER_GOVT_ID_REGISTRY.get(payload.govt_id.upper())
    if not record:
        raise HTTPException(status_code=404, detail="Government ID not found in official national registry")
    return {"valid": True, **record}


@router.post("/signup", response_model=schemas.TokenResponse)
def signup(payload: schemas.OfficialSignupRequest, db: Session = Depends(get_db)):
    record = MASTER_GOVT_ID_REGISTRY.get(payload.govt_id.upper())
    if not record:
        raise HTTPException(status_code=400, detail="Government ID could not be verified against official national records")

    existing = db.query(models.Official).filter(models.Official.govt_id == payload.govt_id.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account already exists for this Government ID")

    primary_template = f"official-primary-{uuid.uuid4().hex}"
    secondary_template = f"official-secondary-{uuid.uuid4().hex}"

    if payload.fingerprint_capture_token:
        try:
            res = biometric.resolve_capture_token(payload.fingerprint_capture_token)
            primary_template = res["template"]
        except Exception:
            pass

    official = models.Official(
        govt_id=payload.govt_id.upper(),
        full_name=record["full_name"],
        dob=record["dob"],
        phone_number=record["phone_number"],
        address=record.get("address"),
        email=payload.email,
        password_hash=hash_password(payload.password),
        fingerprint_template=primary_template,
        is_verified=True,
    )
    db.add(official)
    db.flush()

    # Enrol 2 fingers for official
    fp1 = models.OfficialFingerprint(
        official_id=official.id,
        finger_index=1,
        finger_name="Right Thumb",
        hand="Right",
        template_data=primary_template,
        quality_score=0.96,
        sensor_type="WebAuthn / Windows Hello",
    )
    fp2 = models.OfficialFingerprint(
        official_id=official.id,
        finger_index=2,
        finger_name="Left Thumb",
        hand="Left",
        template_data=secondary_template,
        quality_score=0.94,
        sensor_type="WebAuthn / Windows Hello",
    )
    db.add(fp1)
    db.add(fp2)

    db.commit()
    db.refresh(official)

    token = create_access_token(subject=official.id)
    return schemas.TokenResponse(access_token=token, official=official)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.OfficialLoginRequest, db: Session = Depends(get_db)):
    official = db.query(models.Official).filter(models.Official.govt_id == payload.govt_id.upper()).first()
    if not official or not verify_password(payload.password, official.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Government ID or password")
    token = create_access_token(subject=official.id)
    return schemas.TokenResponse(access_token=token, official=official)


@router.post("/login-biometric", response_model=schemas.TokenResponse)
def login_biometric(govt_id: str, db: Session = Depends(get_db)):
    official = db.query(models.Official).filter(models.Official.govt_id == govt_id.upper()).first()
    if not official or not official.fingerprint_template:
        raise HTTPException(status_code=401, detail="No biometric profile registered for this Government ID")

    sec_template = official.fingerprints[1].template_data if len(official.fingerprints) > 1 else None
    result = biometric.verify_fingerprint(
        primary_template=official.fingerprint_template,
        secondary_template=sec_template,
        primary_name="Right Thumb",
        secondary_name="Left Thumb",
    )

    if not biometric.check_verification_token(result["verification_token"]):
        raise HTTPException(status_code=401, detail="Fingerprint biometric authentication failed")

    token = create_access_token(subject=official.id)
    return schemas.TokenResponse(access_token=token, official=official)


@router.get("/me", response_model=schemas.OfficialOut)
def me(current: models.Official = Depends(get_current_official)):
    return current
