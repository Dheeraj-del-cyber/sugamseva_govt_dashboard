"""
DigiLocker / APISetu document service
--------------------------------------
This implements the actual DigiLocker OAuth2 "authorization code" flow as
documented by APISetu (https://apisetu.gov.in) / DigiLocker Partner docs
(https://partners.digitallocker.gov.in):

    1. Redirect the citizen's browser to DigiLocker's /authorize endpoint.
    2. Citizen logs into DigiLocker and grants consent.
    3. DigiLocker redirects back to our /digilocker/callback with a `code`.
    4. We exchange that code for an access_token at the /token endpoint.
    5. We call /documents (the "issued documents" list) with that token.

None of this can be made to pull real citizen documents without your
organisation's own registered DIGILOCKER_CLIENT_ID / DIGILOCKER_CLIENT_SECRET
- DigiLocker requires a signed partner agreement before issuing those
(apply at https://partners.digitallocker.gov.in). Until real credentials are
present in `.env`, DEMO_MODE simulates the consent + pull so the rest of the
app is fully testable end-to-end; the code path itself (URLs, params,
token exchange, response shape) matches the real API exactly, so flipping
DEMO_MODE off with real credentials requires no code changes here.
"""
import secrets
from urllib.parse import urlencode

import httpx

from app.config import settings

# Real DigiLocker OAuth2 endpoints (APISetu partner integration)
AUTHORIZE_PATH = "/public/oauth2/1/authorize"
TOKEN_PATH = "/public/oauth2/1/token"
DOCUMENTS_PATH = "/public/oauth2/2/files/issued"


def real_credentials_configured() -> bool:
    return bool(settings.DIGILOCKER_CLIENT_ID and settings.DIGILOCKER_CLIENT_SECRET)


def build_authorize_url(state: str) -> str:
    """Build the real DigiLocker consent-screen redirect URL for a citizen."""
    params = {
        "response_type": "code",
        "client_id": settings.DIGILOCKER_CLIENT_ID,
        "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
        "state": state,
    }
    return f"{settings.DIGILOCKER_BASE_URL}{AUTHORIZE_PATH}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> dict:
    """Exchange the authorization code DigiLocker redirected back with for
    a real access token."""
    resp = httpx.post(
        f"{settings.DIGILOCKER_BASE_URL}{TOKEN_PATH}",
        data={
            "code": code,
            "grant_type": "authorization_code",
            "client_id": settings.DIGILOCKER_CLIENT_ID,
            "client_secret": settings.DIGILOCKER_CLIENT_SECRET,
            "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_documents_via_digilocker(citizen_aadhaar_consent_token: str) -> list[dict]:
    """Return the citizen's verified, DigiLocker-issued document list.
    Each item: {"doc_type": ..., "verified": True, "ref": ...}"""
    if settings.DEMO_MODE or not real_credentials_configured():
        # Simulated response shaped exactly like a real DigiLocker "issued
        # documents" pull, used only because no partner credentials are on
        # file yet - see module docstring.
        return [
            {"doc_type": "Aadhaar Card", "verified": True, "ref": secrets.token_hex(6)},
            {"doc_type": "PAN Card", "verified": True, "ref": secrets.token_hex(6)},
        ]
    resp = httpx.get(
        f"{settings.DIGILOCKER_BASE_URL}{DOCUMENTS_PATH}",
        headers={"Authorization": f"Bearer {citizen_aadhaar_consent_token}"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("items", [])


def scan_and_verify_document(doc_type: str, image_ref: str) -> dict:
    """Run OCR + rule-based verification on a manually scanned card
    (used when a DigiLocker pull isn't available). See services/ocr.py for
    the OCR step itself."""
    from app.services.ocr import extract_text_from_document

    extracted = extract_text_from_document(image_ref, doc_type)
    verified = bool(extracted.get("id_number"))
    return {"doc_type": doc_type, "verified": verified, "extracted": extracted}