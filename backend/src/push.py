"""Web Push notification support."""
import json, os

try:
    from pywebpush import webpush, WebPushException
    VAPID_PRIVATE = os.getenv("VAPID_PRIVATE_KEY", "")
    VAPID_PUBLIC = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:contact@ma1.app")
    HAS_PUSH = bool(VAPID_PRIVATE and VAPID_PUBLIC)
except ImportError:
    HAS_PUSH = False

# Store subscriptions in memory (use Supabase in prod)
_subscriptions: dict[str, dict] = {}  # user_id -> subscription_info

def save_subscription(user_id: str, subscription: dict):
    _subscriptions[user_id] = subscription

def remove_subscription(user_id: str):
    _subscriptions.pop(user_id, None)

async def send_push(user_id: str, title: str, body: str, url: str = "/"):
    if not HAS_PUSH:
        return False
    sub = _subscriptions.get(user_id)
    if not sub:
        return False
    try:
        webpush(
            subscription_info=sub,
            data=json.dumps({"title": title, "body": body, "url": url, "icon": "/ma1-logo.jpeg"}),
            vapid_private_key=VAPID_PRIVATE,
            vapid_claims={"sub": VAPID_EMAIL},
        )
        return True
    except WebPushException:
        remove_subscription(user_id)
        return False

async def send_push_batch(user_ids: list, title: str, body: str, url: str = "/"):
    results = []
    for uid in user_ids:
        ok = await send_push(uid, title, body, url)
        results.append({"user_id": uid, "sent": ok})
    return results
