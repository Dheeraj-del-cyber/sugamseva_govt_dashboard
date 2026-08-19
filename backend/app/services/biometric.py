"""
Biometric service
------------------
Wraps fingerprint capture + verification. In DEMO_MODE (default) this
simulates a biometric device so the whole product can be demoed without
physical RD-service hardware. To go live, set DEMO_MODE=false and point
BIOMETRIC_DEVICE_API_URL at your certified Aadhaar-compliant RD service
(STQC-certified device driver), then implement capture()/verify() below
to call it instead of the simulation branch.

Security note: we never store raw fingerprint images. Only an opaque
"template" (a hash-like reference) is persisted, and only a short-lived
verification token - not the template itself - is ever handed back to the
frontend.
"""
import hashlib
import secrets
import time

import httpx

from app.config import settings

_capture_tokens: dict[str, str] = {}   # token -> simulated template
_verify_tokens: dict[str, float] = {}  # token -> expiry epoch


def capture_fingerprint(subject_hint: str) -> tuple[str, float]:
    """Capture a fingerprint and return (capture_token, quality_score).
    The capture_token is later exchanged for a stored template when the
    citizen/official record is created."""
    if settings.DEMO_MODE:
        template = hashlib.sha256(f"{subject_hint}-{secrets.token_hex(8)}".encode()).hexdigest()
        token = secrets.token_urlsafe(16)
        _capture_tokens[token] = template
        return token, 0.94  # simulated high-quality capture
    else:
        # Example of calling a real local RD-service:
        # resp = httpx.get(f"{settings.BIOMETRIC_DEVICE_API_URL}/capture", timeout=15)
        # resp.raise_for_status()
        # data = resp.json()
        # return data["capture_token"], data["quality_score"]
        raise NotImplementedError("Wire up your certified biometric device driver here.")


def resolve_capture_token(token: str) -> str:
    """Turn a capture token into the template to persist on the record."""
    if settings.DEMO_MODE:
        template = _capture_tokens.pop(token, None)
        if not template:
            raise ValueError("Invalid or expired fingerprint capture token")
        return template
    raise NotImplementedError


def verify_fingerprint(stored_template: str) -> str:
    """Re-scan a live fingerprint and compare against the stored template.
    Returns a short-lived verification_token used to unlock a protected
    action (viewing a scanned document, marking a problem solved, etc.)."""
    if settings.DEMO_MODE:
        # Simulated match - in production this calls the device driver and
        # compares the live scan against `stored_template` using the
        # manufacturer's SDK / STQC matcher.
        token = secrets.token_urlsafe(20)
        _verify_tokens[token] = time.time() + 120  # valid for 2 minutes
        return token
    raise NotImplementedError


def check_verification_token(token: str) -> bool:
    expiry = _verify_tokens.get(token)
    if not expiry:
        return False
    if time.time() > expiry:
        _verify_tokens.pop(token, None)
        return False
    # single use
    _verify_tokens.pop(token, None)
    return True
