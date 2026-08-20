import secrets
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db
from app.security import get_current_official
from app.services import digilocker

router = APIRouter(prefix="/digilocker", tags=["DigiLocker"])

# short-lived state -> citizen_id map so /callback (hit directly by
# DigiLocker's redirect, with no auth header) knows which citizen the
# consent was for, and that the request wasn't forged.
_pending_state: dict[str, dict] = {}
_STATE_TTL_SECONDS = 600


@router.get("/{user_id}/authorize")
def start_authorization(
    user_id: str,
    db: Session = Depends(get_db),
    current: models.Official = Depends(get_current_official),
):
    """Step 1 of the real DigiLocker OAuth2 flow: build the citizen consent
    redirect URL. The frontend sends the official's browser to `authorize_url`."""
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")

    if not digilocker.real_credentials_configured():
        return {
            "real_credentials_configured": False,
            "authorize_url": None,
            "message": (
                "Real DigiLocker access requires your organisation's own "
                "DIGILOCKER_CLIENT_ID / DIGILOCKER_CLIENT_SECRET from a signed "
                "partner agreement (apply at https://partners.digitallocker.gov.in). "
                "Add them to backend/.env and set DEMO_MODE=false to go live - "
                "no code changes needed. Until then you can use simulated import."
            ),
        }

    state = secrets.token_urlsafe(24)
    _pending_state[state] = {"citizen_id": user_id, "expiry": time.time() + _STATE_TTL_SECONDS}

    return {
        "real_credentials_configured": True,
        "authorize_url": digilocker.build_authorize_url(state),
        "message": "Redirect the browser to authorize_url to collect citizen consent.",
    }


@router.get("/callback")
def digilocker_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Step 3: DigiLocker redirects the citizen's browser back here with an
    authorization code after consent. Exchanges it for a token, pulls the
    issued documents, saves them, then sends the browser back to the
    dashboard's Add User page."""
    pending = _pending_state.pop(state, None)
    if not pending or time.time() > pending["expiry"]:
        raise HTTPException(status_code=400, detail="Invalid or expired DigiLocker consent state")

    user_id = pending["citizen_id"]
    citizen = db.query(models.Citizen).filter(models.Citizen.id == user_id).first()
    if not citizen:
        raise HTTPException(status_code=404, detail="User not found")

    token_data = digilocker.exchange_code_for_token(code)
    access_token = token_data.get("access_token", "")

    fetched = digilocker.fetch_documents_via_digilocker(citizen_aadhaar_consent_token=access_token)
    for item in fetched:
        try:
            doc_type_enum = models.DocumentType(item["doc_type"])
        except (KeyError, ValueError):
            continue
        existing = (
            db.query(models.CitizenDocument)
            .filter(models.CitizenDocument.citizen_id == user_id, models.CitizenDocument.doc_type == doc_type_enum)
            .first()
        )
        doc = existing or models.CitizenDocument(citizen_id=user_id, doc_type=doc_type_enum)
        doc.verified = item.get("verified", True)
        doc.source = "digilocker"
        doc.doc_number = item.get("doc_number") or f"DL-{uuid.uuid4().hex[:8].upper()}"
        doc.encrypted_scan_ref = f"vault://{user_id}/{item['doc_type']}"
        doc.verified_at = datetime.utcnow()
        if not existing:
            db.add(doc)
    db.commit()

    return RedirectResponse(url=f"{settings.FRONTEND_BASE_URL}/users/{user_id}?digilocker=success")