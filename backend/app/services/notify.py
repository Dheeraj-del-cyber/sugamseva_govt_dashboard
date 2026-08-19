"""
Notification service - SMS gateway + Firebase Cloud Messaging
-----------------------------------------------------------------
Sends the required "after registering user / after adding a problem /
after voting a problem / after scheme applied" alerts. DEMO_MODE just
logs the message; wire up your SMS_GATEWAY and FIREBASE_SERVER_KEY to go
live.
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger("sugamseva.notify")


def send_sms(phone_number: str, message: str) -> bool:
    if settings.DEMO_MODE or not settings.SMS_GATEWAY_API_KEY:
        logger.info("[DEMO SMS] to=%s message=%s", phone_number, message)
        return True
    resp = httpx.post(
        f"{settings.SMS_GATEWAY_BASE_URL}/send",
        headers={"Authorization": f"Bearer {settings.SMS_GATEWAY_API_KEY}"},
        json={"to": phone_number, "message": message},
        timeout=10,
    )
    return resp.status_code == 200


def send_push_notification(device_token: str, title: str, body: str) -> bool:
    if settings.DEMO_MODE or not settings.FIREBASE_SERVER_KEY:
        logger.info("[DEMO PUSH] to=%s title=%s body=%s", device_token, title, body)
        return True
    resp = httpx.post(
        "https://fcm.googleapis.com/fcm/send",
        headers={
            "Authorization": f"key={settings.FIREBASE_SERVER_KEY}",
            "Content-Type": "application/json",
        },
        json={"to": device_token, "notification": {"title": title, "body": body}},
        timeout=10,
    )
    return resp.status_code == 200
