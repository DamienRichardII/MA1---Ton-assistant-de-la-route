"""[Sprint Admin/Emails/Support] Service d'envoi d'emails centralisé via Resend.

- Wrapper unique : tous les appels passent par send_email(...).
- Log systématique dans email_logs (Supabase) avec status sent/failed/skipped.
- Anti-spam léger : table en mémoire pour throttler les emails répétitifs (login_notification).
- Reply-to systématique : RESEND_REPLY_TO ou SUPPORT_EMAIL.
- Si Resend non configuré (clé absente) → status='skipped', les logs restent.

Doit être importé depuis api.py (pas d'effets de bord à l'import).
"""
from __future__ import annotations
import os
import time
from datetime import datetime, timezone
from typing import Optional

try:
    import resend
    _RESEND_OK = True
except ImportError:
    _RESEND_OK = False
    resend = None  # type: ignore

# [Fix Resend from field] Certains hébergeurs (Railway notamment) gardent les
# guillemets dans la valeur quand on saisit RESEND_FROM="MA1 <contact@ma1.fr>".
# Résultat : la string Python vaut littéralement `"MA1 <contact@ma1.fr>"` (avec
# guillemets) au lieu de `MA1 <contact@ma1.fr>` → Resend renvoie 422 validation_error.
# On strip systématiquement guillemets simples/doubles + backslash-quotes.
def _clean_email_from(value: str) -> str:
    if not value:
        return value
    v = value.strip()
    # Strip backslash-quotes EN PREMIER (cas où Railway garde `\"...\"`)
    # Sinon strip('"') consomme le " seul et laisse un \ orphelin en fin.
    v = v.replace('\\"', '').replace("\\'", "")
    # Strip guillemets droits/courbes en début ET fin (peut être doublés)
    for _ in range(3):
        v = v.strip().strip('"').strip("'").strip("“").strip("”").strip("‘").strip("’")
    return v.strip()


# Configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip().strip('"').strip("'")
EMAIL_FROM = _clean_email_from(
    os.getenv("RESEND_FROM") or os.getenv("EMAIL_FROM") or os.getenv("RESEND_FROM_EMAIL") or "MA1 <contact@ma1.fr>"
)
REPLY_TO = _clean_email_from(
    os.getenv("RESEND_REPLY_TO") or os.getenv("SUPPORT_EMAIL") or os.getenv("ADMIN_EMAIL") or "contact@ma1.fr"
)
HAS_EMAIL = _RESEND_OK and bool(RESEND_API_KEY)

# Log non-sensible au démarrage pour faciliter le debug Railway.
print(f"[EMAIL] from resolved: {EMAIL_FROM}", flush=True)
print(f"[EMAIL] reply_to resolved: {REPLY_TO}", flush=True)
print(f"[EMAIL] has_email: {HAS_EMAIL}", flush=True)

if HAS_EMAIL:
    resend.api_key = RESEND_API_KEY

# Anti-spam léger en mémoire — non-persistant (reset au redémarrage backend).
# Format : (template, to_email) -> timestamp dernier envoi
_throttle: dict[tuple[str, str], float] = {}
_THROTTLE_RULES = {
    "login_notification": 3600,   # 1 email connexion par heure max
    "support_message_received": 60,
}


def _log_email(supabase, *, template: str, to_email: str, status: str, subject: str = "",
               message_id: str = "", error: str = "", user_id: str = "") -> None:
    """Insert dans email_logs (silent en cas d'échec Supabase)."""
    row = {
        "template": template,
        "to_email": to_email,
        "from_email": EMAIL_FROM,
        "reply_to": REPLY_TO,
        "subject": subject,
        "status": status,
        "provider": "resend",
        "provider_message_id": message_id,
        "error": error[:500] if error else None,
        "user_id": user_id or None,
    }
    if supabase is not None:
        try:
            supabase.table("email_logs").insert(row).execute()
        except Exception:
            pass


def _is_throttled(template: str, to_email: str) -> bool:
    rule_seconds = _THROTTLE_RULES.get(template)
    if not rule_seconds:
        return False
    last = _throttle.get((template, to_email))
    if last and (time.time() - last) < rule_seconds:
        return True
    _throttle[(template, to_email)] = time.time()
    return False


def send_email(*, template: str, to_email: str, subject: str, html: str, text: str = "",
               user_id: str = "", supabase=None, force: bool = False) -> dict:
    """Envoie un email via Resend.

    Retourne {status, message_id, error} pour debug.
    Logge systématiquement dans email_logs (si Supabase configurée).
    """
    if not to_email or "@" not in to_email:
        _log_email(supabase, template=template, to_email=to_email or "(empty)",
                   status="failed", subject=subject, error="adresse invalide", user_id=user_id)
        return {"status": "failed", "error": "adresse invalide"}

    if not force and _is_throttled(template, to_email):
        _log_email(supabase, template=template, to_email=to_email, status="skipped",
                   subject=subject, error="anti-spam throttle", user_id=user_id)
        return {"status": "skipped", "error": "throttle"}

    if not HAS_EMAIL:
        _log_email(supabase, template=template, to_email=to_email, status="skipped",
                   subject=subject, error="RESEND_API_KEY non configurée", user_id=user_id)
        return {"status": "skipped", "error": "resend non configuré"}

    try:
        resp = resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [to_email],
            "reply_to": REPLY_TO,
            "subject": subject,
            "html": html,
            "text": text or " ",
        })
        message_id = resp.get("id", "") if isinstance(resp, dict) else ""
        _log_email(supabase, template=template, to_email=to_email, status="sent",
                   subject=subject, message_id=message_id, user_id=user_id)
        return {"status": "sent", "message_id": message_id}
    except Exception as e:
        err = str(e)[:500]
        _log_email(supabase, template=template, to_email=to_email, status="failed",
                   subject=subject, error=err, user_id=user_id)
        return {"status": "failed", "error": err}
