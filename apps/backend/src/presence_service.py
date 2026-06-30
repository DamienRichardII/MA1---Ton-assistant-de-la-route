"""[Sprint Admin/Emails/Support] Présence temps réel via heartbeat."""
from __future__ import annotations
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

PRESENCE_WINDOW_MINUTES = 5  # un utilisateur est "connecté maintenant" si vu dans les 5 dernières min


def _hash_ip(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def record_heartbeat(supabase, *, user_id: str, session_id: str = "",
                     user_agent: str = "", ip: Optional[str] = None,
                     current_module: str = "") -> bool:
    if supabase is None or not user_id:
        return False
    try:
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "user_id": user_id,
            "session_id": session_id or "default",
            "last_seen_at": now,
            "user_agent": (user_agent or "")[:200],
            "ip_hash": _hash_ip(ip),
        }
        if current_module:
            row["current_module"] = current_module[:32]
        supabase.table("user_sessions").upsert(
            row, on_conflict="user_id,session_id"
        ).execute()
        return True
    except Exception as e:
        print(f"[PRESENCE] upsert ERROR user={user_id}: {e}")
        return False


def count_online_now(supabase) -> int:
    if supabase is None:
        return 0
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=PRESENCE_WINDOW_MINUTES)).isoformat()
    try:
        r = supabase.table("user_sessions").select("user_id", count="exact").gte(
            "last_seen_at", cutoff
        ).execute()
        return getattr(r, "count", 0) or 0
    except Exception:
        return 0


def list_recent_active(supabase, limit: int = 20) -> list[dict]:
    if supabase is None:
        return []
    try:
        r = supabase.table("user_sessions").select(
            "user_id, last_seen_at, user_agent, current_module"
        ).order("last_seen_at", desc=True).limit(limit).execute()
        return getattr(r, "data", None) or []
    except Exception:
        return []


def list_online_now(supabase, limit: int = 50) -> list[dict]:
    if supabase is None:
        return []
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=PRESENCE_WINDOW_MINUTES)).isoformat()
    try:
        r = supabase.table("user_sessions").select(
            "user_id, last_seen_at, current_module"
        ).gte("last_seen_at", cutoff).order("last_seen_at", desc=True).limit(limit).execute()
        seen, out = set(), []
        for row in (getattr(r, "data", None) or []):
            uid = row.get("user_id")
            if uid in seen:
                continue
            seen.add(uid); out.append(row)
        return out
    except Exception:
        return []
