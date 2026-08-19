from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import create_access_token, get_current_official, hash_password, verify_password
from app.services import biometric

router = APIRouter(prefix="/auth", tags=["Auth"])

# A pretend "master government ID registry" used to validate govt IDs at
# sign-up time, per the brief ("if it matches record of the main
# government ids"). In production this is an official govt employee
# directory lookup (e.g. via SSO/e-Pramaan), not a local table.
MASTER_GOVT_ID_REGISTRY = {
    "GOV-IN-100234": {"full_name": "Ananya Sharma", "dob": "1988-04-12", "phone_number": "9876500011", "address": "Bengaluru, KA"},
    "GOV-IN-100235": {"full_name": "Rahul Verma", "dob": "1990-11-02", "phone_number": "9876500022", "address": "Pune, MH"},
}


@router.post("/verify-govt-id")
def verify_govt_id(payload: schemas.OfficialSignupVerifyIdRequest):
    record = MASTER_GOVT_ID_REGISTRY.get(payload.govt_id.upper())
    if not record:
        raise HTTPException(status_code=404, detail="Government ID not found in official registry")
    return {"valid": True, **record}


@router.post("/signup", response_model=schemas.TokenResponse)
def signup(payload: schemas.OfficialSignupRequest, db: Session = Depends(get_db)):
    record = MASTER_GOVT_ID_REGISTRY.get(payload.govt_id.upper())
    if not record:
        raise HTTPException(status_code=400, detail="Government ID could not be verified against official records")

    existing = db.query(models.Official).filter(models.Official.govt_id == payload.govt_id.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account already exists for this Government ID")

    try:
        template = biometric.resolve_capture_token(payload.fingerprint_capture_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    official = models.Official(
        govt_id=payload.govt_id.upper(),
        full_name=record["full_name"],
        dob=record["dob"],
        phone_number=record["phone_number"],
        address=record.get("address"),
        email=payload.email,
        password_hash=hash_password(payload.password),
        fingerprint_template=template,
        is_verified=True,
    )
    db.add(official)
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
    verification_token = biometric.verify_fingerprint(official.fingerprint_template)
    if not biometric.check_verification_token(verification_token):
        raise HTTPException(status_code=401, detail="Fingerprint did not match")
    token = create_access_token(subject=official.id)
    return schemas.TokenResponse(access_token=token, official=official)


@router.get("/me", response_model=schemas.OfficialOut)
def me(current: models.Official = Depends(get_current_official)):
    return current
