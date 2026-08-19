"""
DigiLocker / APISetu document service
--------------------------------------
DigiLocker requires a registered organisation account, OAuth2 client
credentials and citizen consent (via an Aadhaar-linked DigiLocker OAuth
redirect) before any document can be pulled. Those credentials cannot be
fabricated here - request them from https://partners.digitallocker.gov.in
and https://apisetu.gov.in. Until then, DEMO_MODE simulates a "verified"
document pull so the rest of the app is fully testable end-to-end.
"""
import secrets

import httpx

from app.config import settings


def fetch_documents_via_digilocker(citizen_aadhaar_consent_token: str) -> list[dict]:
    """Return the citizen's verified document list from DigiLocker.
    Each item: {"doc_type": ..., "verified": True, "ref": ...}"""
    if settings.DEMO_MODE:
        # Simulated response shaped like a real DigiLocker "issued documents" pull.
        return [
            {"doc_type": "Aadhaar Card", "verified": True, "ref": secrets.token_hex(6)},
            {"doc_type": "PAN Card", "verified": True, "ref": secrets.token_hex(6)},
        ]
    resp = httpx.get(
        f"{settings.DIGILOCKER_BASE_URL}/documents",
        headers={"Authorization": f"Bearer {citizen_aadhaar_consent_token}"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("documents", [])


def scan_and_verify_document(doc_type: str, image_ref: str) -> dict:
    """Run OCR + rule-based verification on a manually scanned card
    (used when DigiLocker pull isn't available). See services/ocr.py for
    the OCR step itself."""
    from app.services.ocr import extract_text_from_document

    extracted = extract_text_from_document(image_ref, doc_type)
    verified = bool(extracted.get("id_number"))
    return {"doc_type": doc_type, "verified": verified, "extracted": extracted}
