"""[Sprint Admin/Emails/Support] Authentification admin.

Modèle :
- Admin stocké en table `admin_users` (Supabase) avec password hashé bcrypt.
- Fallback `ADMIN_PASSWORD_HASH` env si Supabase non configurée OU table vide.
- JWT admin avec claim `role=admin`, séparé du JWT utilisateur.
- Token reset stocké en `admin_password_resets` avec expiration.

Aucun mot de passe en clair n'est jamais écrit ni dans le code ni renvoyé au client.
"""
from __future__ import annotations
import os
import hashlib
import secrets as pysecrets
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    import bcrypt
    def hash_pw(pw: str) -> str:
        return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    def check_pw(pw: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(pw.encode(), hashed.encode())
        except Exception:
            return False
except ImportError:
    # Fallback dev uniquement — refus si APP_ENV=production géré dans api.py.
    def hash_pw(pw: str) -> str:
        return "sha256$" + hashlib.sha256(pw.encode()).hexdigest()
    def check_pw(pw: str, hashed: str) -> bool:
        if hashed.startswith("sha256$"):
            return hashlib.sha256(pw.encode()).hexdigest() == hashed[7:]
        return False


ADMIN_EMAIL = (os.getenv("ADMIN_EMAIL") or os.getenv("ADMIN_NOTIFICATION_EMAIL") or "contact@ma1.fr").lower().strip()
ADMIN_PASSWORD_HASH_ENV = os.getenv("ADMIN_PASSWORD_HASH", "")
ADMIN_RESET_TOKEN_EXPIRY_MIN = int(os.getenv("ADMIN_RESET_TOKEN_EXPIRY_MINUTES", "30"))


def _token_hash(token: str) -> str:
    """SHA-256 du token pour le stocker en DB (jamais le token en clair)."""
    return hashlib.sha256(token.encode()).hexdigest()


def _get_admin_from_db(supabase, email: str) -> Optional[dict]:
    if supabase is None:
        return None
    try:
        res = supabase.table("admin_users").select("*").eq("email", email).limit(1).execute()
        rows = getattr(res, "data", None) or []
        return rows[0] if rows else None
    except Exception:
        return None


def _admin_email_matches(email: str) -> bool:
    return (email or "").strip().lower() == ADMIN_EMAIL


def authenticate_admin(supabase, email: str, password: str) -> Optional[dict]:
    """Retourne {id, email, display_name} si OK, sinon None."""
    if not _admin_email_matches(email):
        return None
    if not password:
        return None

    # 1) Lecture Supabase
    admin = _get_admin_from_db(supabase, email.lower().strip())
    if admin and admin.get("password_hash") and admin.get("is_active", True):
        if check_pw(password, admin["password_hash"]):
            # Mise à jour last_login_at (silencieuse si échec)
            try:
                supabase.table("admin_users").update(
                    {"last_login_at": datetime.now(timezone.utc).isoformat()}
                ).eq("id", admin["id"]).execute()
            except Exception:
                pass
            return {
                "id": admin["id"],
                "email": admin["email"],
                "display_name": admin.get("display_name", ""),
            }
        return None

    # 2) Fallback env (utile au premier déploiement avant migration jouée)
    if ADMIN_PASSWORD_HASH_ENV and check_pw(password, ADMIN_PASSWORD_HASH_ENV):
        return {"id": "env-admin", "email": ADMIN_EMAIL, "display_name": "Admin"}

    return None


def is_admin_user_id(supabase, user_id: str) -> bool:
    """Pour les helpers d'autorisation : vérifie si un user_id (claim sub du JWT) est admin.

    Convention : pour les admins, le claim sub du JWT est l'admin.id (UUID) ou 'env-admin'.
    """
    if not user_id:
        return False
    if user_id == "env-admin":
        return True
    if supabase is None:
        return False
    try:
        res = supabase.table("admin_users").select("id").eq("id", user_id).limit(1).execute()
        return bool(getattr(res, "data", None))
    except Exception:
        return False


def create_password_reset(supabase, email: str, ip_hash: str = "") -> Optional[str]:
    """Génère un token de reset. Renvoie le token en clair (à envoyer par email)
    OU None si l'email ne correspond pas à l'admin (ne pas révéler l'erreur côté caller)."""
    if not _admin_email_matches(email):
        return None

    admin = _get_admin_from_db(supabase, email.lower().strip())
    admin_id = admin["id"] if admin else None

    raw_token = pysecrets.token_urlsafe(32)
    th = _token_hash(raw_token)
    expires = datetime.now(timezone.utc) + timedelta(minutes=ADMIN_RESET_TOKEN_EXPIRY_MIN)

    if supabase is not None:
        try:
            supabase.table("admin_password_resets").insert({
                "admin_id": admin_id,
                "token_hash": th,
                "expires_at": expires.isoformat(),
                "ip_hash": ip_hash or None,
            }).execute()
        except Exception:
            pass
    return raw_token


def consume_password_reset(supabase, token: str, new_password: str) -> bool:
    """Vérifie le token, met à jour le password_hash de l'admin, marque le token utilisé."""
    if not token or not new_password or len(new_password) < 8:
        return False
    th = _token_hash(token)
    if supabase is None:
        return False
    try:
        res = supabase.table("admin_password_resets").select("*").eq("token_hash", th).limit(1).execute()
        rows = getattr(res, "data", None) or []
        if not rows:
            return False
        row = rows[0]
        if row.get("used_at"):
            return False
        exp = row.get("expires_at")
        if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < datetime.now(timezone.utc):
            return False
        admin_id = row.get("admin_id")
        if not admin_id:
            return False
        new_hash = hash_pw(new_password)
        supabase.table("admin_users").update(
            {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", admin_id).execute()
        supabase.table("admin_password_resets").update(
            {"used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", row["id"]).execute()
        return True
    except Exception:
        return False


def ensure_admin_seed(supabase) -> None:
    """Si Supabase configurée ET table admin_users vide ET ADMIN_PASSWORD_HASH défini,
    insère l'admin par défaut. Idempotent."""
    if supabase is None or not ADMIN_PASSWORD_HASH_ENV:
        return
    try:
        res = supabase.table("admin_users").select("id").limit(1).execute()
        if getattr(res, "data", None):
            return  # déjà au moins un admin
        supabase.table("admin_users").insert({
            "email": ADMIN_EMAIL,
            "password_hash": ADMIN_PASSWORD_HASH_ENV,
            "display_name": "Damien",
            "is_active": True,
        }).execute()
        print(f"[admin] Seed admin créé pour {ADMIN_EMAIL}")
    except Exception as e:
        print(f"[admin] Seed admin échoué : {e}")
