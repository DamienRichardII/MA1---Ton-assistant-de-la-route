"""[Sprint Admin/Classement/Espace joueur] Service XP centralisé.

Source de vérité : table `xp_events` (chaque gain journalisé → total recalculable).
`profiles.xp` est le total dénormalisé, mis à jour à chaque event.

Règles (documentées, anti-farming) — barème XP_RULES ci-dessous.
Tout passe par `award_xp(...)` qui :
  1. vérifie les plafonds journaliers éventuels (daily_login, assistant_useful) ;
  2. insère l'event dans xp_events ;
  3. incrémente profiles.xp ;
  4. retourne le nombre de XP réellement accordés (0 si plafonné / DB absente).

Robuste : si Supabase est absent (None), renvoie le barème théorique sans crash.
Aucune donnée fictive : si pas de DB, aucun event n'est persisté.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional

# Barème XP — source canonique (cf. docs/FIX_REALTIME_LEADERBOARD_XP_PLAYER_DASHBOARD_EMAIL_MA1.md)
XP_RULES = {
    "account_created": 5,
    "daily_login": 2,
    "qcm_completed": 10,
    "qcm_correct": 2,
    "qcm_perfect": 15,        # série parfaite (bonus)
    "exam_completed": 25,
    "exam_passed": 50,
    "assistant_useful": 1,
    "weak_theme_improved": 10,
    "referral": 25,
}

# Plafonds journaliers : type -> nb max d'events / jour / user (None = illimité)
DAILY_CAPS = {
    "daily_login": 1,
    "assistant_useful": 10,   # limite l'abus de l'assistant IA
}


def _today_start_iso() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _count_today(supabase, user_id: str, type_: str) -> int:
    try:
        r = supabase.table("xp_events").select("id", count="exact").eq(
            "user_id", user_id
        ).eq("type", type_).gte("created_at", _today_start_iso()).execute()
        return getattr(r, "count", 0) or 0
    except Exception:
        return 0


def award_xp(supabase, *, user_id: str, type_: str, meta: Optional[dict] = None) -> int:
    """Accorde des XP pour un type d'action. Retourne le nb de XP accordés (0 si plafonné/abusif)."""
    if not user_id or type_ not in XP_RULES:
        return 0
    base = XP_RULES[type_]

    # Plafond journalier
    cap = DAILY_CAPS.get(type_)
    if cap is not None and supabase is not None:
        if _count_today(supabase, user_id, type_) >= cap:
            return 0

    if supabase is None:
        # Pas de DB → on ne persiste rien mais on renvoie le barème (utile en tests/dev mémoire).
        return base

    # 1) Journaliser l'event
    try:
        supabase.table("xp_events").insert({
            "user_id": user_id,
            "type": type_,
            "xp": base,
            "meta": meta or {},
        }).execute()
    except Exception:
        return 0

    # 2) Mettre à jour le total dénormalisé profiles.xp
    try:
        cur = supabase.table("profiles").select("xp").eq("user_id", user_id).single().execute()
        cur_xp = (getattr(cur, "data", None) or {}).get("xp", 0) or 0
        supabase.table("profiles").update({"xp": cur_xp + base}).eq("user_id", user_id).execute()
    except Exception:
        # profil peut ne pas exister encore — upsert minimal
        try:
            supabase.table("profiles").upsert(
                {"user_id": user_id, "xp": base}, on_conflict="user_id"
            ).execute()
        except Exception:
            pass

    print(f"[XP] event created user={user_id} type={type_} xp={base}")
    return base


def recompute_total(supabase, user_id: str) -> int:
    """Recalcule le total XP d'un user depuis xp_events et resynchronise profiles.xp."""
    if supabase is None or not user_id:
        return 0
    try:
        r = supabase.table("xp_events").select("xp").eq("user_id", user_id).execute()
        total = sum((row.get("xp", 0) or 0) for row in (getattr(r, "data", None) or []))
        supabase.table("profiles").update({"xp": total}).eq("user_id", user_id).execute()
        print(f"[XP] total updated user={user_id} total={total}")
        return total
    except Exception:
        return 0


def list_events(supabase, user_id: str, limit: int = 30) -> list[dict]:
    if supabase is None or not user_id:
        return []
    try:
        r = supabase.table("xp_events").select(
            "type, xp, meta, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return getattr(r, "data", None) or []
    except Exception:
        return []
