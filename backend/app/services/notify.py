"""
Notification service - Firebase Cloud Messaging
-----------------------------------------------------------------
Sends the required "after registering user / after adding a problem /
after voting a problem / after scheme applied" alerts. DEMO_MODE just
logs the message; wire up your FIREBASE_SERVER_KEY to go live.
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger("sugamseva.notify")


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