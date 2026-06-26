"""[Sprint Admin/Emails/Support] Service messagerie support utilisateur ↔ admin."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional


def create_thread(supabase, *, user_id: str, user_email: str, subject: str,
                  category: str, message: str) -> Optional[dict]:
    """Crée un thread support + un premier message. Retourne {thread, message} ou None."""
    if supabase is None:
        return None
    try:
        now = datetime.now(timezone.utc).isoformat()
        thread_row = supabase.table("support_threads").insert({
            "user_id": user_id,
            "user_email": user_email,
            "subject": (subject or "").strip()[:200] or "(sans sujet)",
            "category": category if category in (
                "bug","question","paiement","compte","suggestion","erreur_qcm_ia","autre"
            ) else "autre",
            "status": "open",
            "priority": "normal",
            "last_message_at": now,
            "unread_for_admin": True,
            "unread_for_user": False,
        }).execute()
        thread = (getattr(thread_row, "data", None) or [None])[0]
        if not thread:
            return None
        msg_row = supabase.table("support_messages").insert({
            "thread_id": thread["id"],
            "sender_id": user_id,
            "sender_role": "user",
            "message": message.strip()[:5000],
        }).execute()
        msg = (getattr(msg_row, "data", None) or [None])[0]
        return {"thread": thread, "message": msg}
    except Exception as e:
        print(f"[support] create_thread error: {e}")
        return None


def list_threads_for_user(supabase, user_id: str) -> list[dict]:
    if supabase is None:
        return []
    try:
        res = supabase.table("support_threads").select("*").eq("user_id", user_id).order(
            "last_message_at", desc=True
        ).execute()
        return getattr(res, "data", None) or []
    except Exception:
        return []


def list_threads_admin(supabase, status_filter: Optional[str] = None) -> list[dict]:
    if supabase is None:
        return []
    try:
        q = supabase.table("support_threads").select("*").order("last_message_at", desc=True)
        if status_filter and status_filter in ("open", "pending", "answered", "closed"):
            q = q.eq("status", status_filter)
        res = q.limit(200).execute()
        return getattr(res, "data", None) or []
    except Exception:
        return []


def get_thread_with_messages(supabase, thread_id: str) -> Optional[dict]:
    if supabase is None:
        return None
    try:
        th = supabase.table("support_threads").select("*").eq("id", thread_id).single().execute()
        thread = getattr(th, "data", None)
        if not thread:
            return None
        ms = supabase.table("support_messages").select("*").eq("thread_id", thread_id).order(
            "created_at", desc=False
        ).execute()
        messages = getattr(ms, "data", None) or []
        return {"thread": thread, "messages": messages}
    except Exception:
        return None


def reply_admin(supabase, thread_id: str, admin_id: str, message: str) -> Optional[dict]:
    if supabase is None or not message:
        return None
    try:
        now = datetime.now(timezone.utc).isoformat()
        msg_row = supabase.table("support_messages").insert({
            "thread_id": thread_id,
            "sender_id": admin_id,
            "sender_role": "admin",
            "message": message.strip()[:5000],
        }).execute()
        msg = (getattr(msg_row, "data", None) or [None])[0]
        # Marque thread comme answered + non lu côté user + lu côté admin
        supabase.table("support_threads").update({
            "status": "answered",
            "last_message_at": now,
            "unread_for_admin": False,
            "unread_for_user": True,
            "updated_at": now,
        }).eq("id", thread_id).execute()
        # Récupère le thread mis à jour
        th = supabase.table("support_threads").select("*").eq("id", thread_id).single().execute()
        return {"thread": getattr(th, "data", None), "message": msg}
    except Exception as e:
        print(f"[support] reply_admin error: {e}")
        return None


def mark_thread_read_for_user(supabase, thread_id: str, user_id: str) -> bool:
    if supabase is None:
        return False
    try:
        supabase.table("support_threads").update({"unread_for_user": False}).eq(
            "id", thread_id
        ).eq("user_id", user_id).execute()
        return True
    except Exception:
        return False


def close_thread(supabase, thread_id: str) -> bool:
    if supabase is None:
        return False
    try:
        supabase.table("support_threads").update({
            "status": "closed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", thread_id).execute()
        return True
    except Exception:
        return False


def support_counts_admin(supabase) -> dict:
    """KPIs support pour la page admin."""
    if supabase is None:
        return {"total": 0, "open": 0, "pending": 0, "answered": 0, "closed": 0, "unread_admin": 0}
    out = {"total": 0, "open": 0, "pending": 0, "answered": 0, "closed": 0, "unread_admin": 0}
    try:
        for status in ("open", "pending", "answered", "closed"):
            r = supabase.table("support_threads").select("id", count="exact").eq("status", status).execute()
            cnt = getattr(r, "count", 0) or len(getattr(r, "data", None) or [])
            out[status] = cnt
            out["total"] += cnt
        r = supabase.table("support_threads").select("id", count="exact").eq("unread_for_admin", True).execute()
        out["unread_admin"] = getattr(r, "count", 0) or len(getattr(r, "data", None) or [])
    except Exception:
        pass
    return out
