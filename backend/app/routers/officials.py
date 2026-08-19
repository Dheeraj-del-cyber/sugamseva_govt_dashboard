from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_official, hash_password, verify_password
from app.services import biometric

router = APIRouter(prefix="/officials", tags=["Officials"])


@router.get("/me", response_model=schemas.OfficialOut)
def get_profile(current: models.Official = Depends(get_current_official)):
    return current


@router.put("/me", response_model=schemas.OfficialOut)
def update_profile(
    payload: schemas.OfficialUpdateRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(current, field, value)
    db.commit()
    db.refresh(current)
    return current


@router.post("/me/change-password")
def change_password(
    payload: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    if not verify_password(payload.current_password, current.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match")
    current.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "password updated"}


@router.post("/me/re-register-fingerprint")
def re_register_fingerprint(
    fingerprint_capture_token: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    try:
        template = biometric.resolve_capture_token(fingerprint_capture_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    current.fingerprint_template = template
    db.commit()
    return {"status": "fingerprint updated"}
