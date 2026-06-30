"""[Sprint Admin/Emails/Support] Reporting / KPI admin.

Calcule les statistiques bêta depuis Supabase :
- total utilisateurs / actifs aujourd'hui / cette semaine
- leaderboard
- stats par thème (taux réussite / échec)
- counts examens, support

Tous les calculs lisent depuis les tables réelles. Aucune donnée fictive.
Si la DB n'est pas configurée ou si les tables sont vides : renvoie 0 / [].
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional

THEMES = [
    "vitesse", "signalisation", "priorite", "alcool", "permis",
    "autoroute", "stationnement", "securite", "premiers_secours",
    "eco", "moto", "nuit",
]
THEME_LABELS = {
    "vitesse": "Limitations de vitesse",
    "signalisation": "Signalisation",
    "priorite": "Priorités",
    "alcool": "Alcool & drogues",
    "permis": "Permis probatoire",
    "autoroute": "Autoroute",
    "stationnement": "Stationnement",
    "securite": "Sécurité passive",
    "premiers_secours": "Premiers secours",
    "eco": "Éco-conduite",
    "moto": "Moto",
    "nuit": "Conduite de nuit",
}


def _safe_count(supabase, table: str, **filters) -> int:
    if supabase is None:
        return 0
    try:
        q = supabase.table(table).select("id", count="exact")
        for k, v in filters.items():
            if isinstance(v, tuple) and len(v) == 2 and v[0] == "gte":
                q = q.gte(k, v[1])
            else:
                q = q.eq(k, v)
        r = q.execute()
        return getattr(r, "count", 0) or len(getattr(r, "data", None) or [])
    except Exception:
        return 0


def compute_kpis(supabase, presence_count: int = 0, support_counts: Optional[dict] = None) -> dict:
    """KPIs principaux affichés en tête de dashboard admin."""
    now = datetime.now(timezone.utc)
    today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_iso = (now - timedelta(days=7)).isoformat()

    total_users = _safe_count(supabase, "users")

    # actifs = au moins 1 qcm_attempt
    active_today = 0
    active_week = 0
    if supabase is not None:
        try:
            r = supabase.table("qcm_attempts").select("user_id").gte("answered_at", today_iso).execute()
            active_today = len({row.get("user_id") for row in (getattr(r, "data", None) or [])})
            r = supabase.table("qcm_attempts").select("user_id").gte("answered_at", week_iso).execute()
            active_week = len({row.get("user_id") for row in (getattr(r, "data", None) or [])})
        except Exception:
            pass

    qcm_users = 0
    exam_users = 0
    if supabase is not None:
        try:
            r = supabase.table("qcm_attempts").select("user_id").execute()
            qcm_users = len({row.get("user_id") for row in (getattr(r, "data", None) or [])})
            r = supabase.table("exam_attempts").select("user_id").execute()
            exam_users = len({row.get("user_id") for row in (getattr(r, "data", None) or [])})
        except Exception:
            pass

    sc = support_counts or {"total": 0, "open": 0, "pending": 0, "unread_admin": 0}
    return {
        "total_users": total_users,
        "online_now": presence_count,
        "active_today": active_today,
        "active_week": active_week,
        "users_with_qcm": qcm_users,
        "users_with_exam": exam_users,
        "support_total": sc.get("total", 0),
        "support_unread_admin": sc.get("unread_admin", 0),
        "computed_at": now.isoformat(),
    }


def leaderboard(supabase, limit: int = 20) -> list[dict]:
    if supabase is None:
        return []
    try:
        # Profiles + users joins
        prof = supabase.table("profiles").select(
            "user_id, level, xp, score_total, score_correct"
        ).order("xp", desc=True).limit(limit).execute()
        rows = getattr(prof, "data", None) or []
        if not rows:
            return []
        # Lookup name/email
        out = []
        for p in rows:
            uid = p.get("user_id")
            name = uid
            email = ""
            last_seen = ""
            try:
                ur = supabase.table("users").select("name,email").eq("user_id", uid).single().execute()
                u = getattr(ur, "data", None)
                if u:
                    name = u.get("name") or (u.get("email", "").split("@")[0])
                    email = u.get("email", "")
            except Exception:
                pass
            try:
                sr = supabase.table("user_sessions").select("last_seen_at").eq(
                    "user_id", uid
                ).order("last_seen_at", desc=True).limit(1).execute()
                ses = (getattr(sr, "data", None) or [None])[0]
                last_seen = ses.get("last_seen_at") if ses else ""
            except Exception:
                pass
            score_total = p.get("score_total", 0) or 0
            score_correct = p.get("score_correct", 0) or 0
            rate = round((score_correct / max(score_total, 1)) * 100)
            out.append({
                "user_id": uid,
                "name": name,
                "email": email,
                "xp": p.get("xp", 0) or 0,
                "level": p.get("level", "debutant"),
                "qcm_total": score_total,
                "success_rate": rate,
                "last_seen_at": last_seen,
            })
        return out
    except Exception:
        return []


def theme_stats(supabase) -> list[dict]:
    """Pour chaque thème : nb réponses, nb users uniques, taux réussite, taux échec."""
    if supabase is None:
        return []
    out = []
    for topic in THEMES:
        try:
            total = _safe_count(supabase, "qcm_attempts", topic=topic)
            if total == 0:
                out.append({
                    "topic": topic,
                    "label": THEME_LABELS.get(topic, topic),
                    "total_answers": 0,
                    "unique_users": 0,
                    "success_rate": None,
                    "fail_rate": None,
                })
                continue
            correct = _safe_count(supabase, "qcm_attempts", topic=topic, is_correct=True)
            try:
                r = supabase.table("qcm_attempts").select("user_id").eq("topic", topic).execute()
                unique = len({row.get("user_id") for row in (getattr(r, "data", None) or [])})
            except Exception:
                unique = 0
            rate = round((correct / max(total, 1)) * 100)
            out.append({
                "topic": topic,
                "label": THEME_LABELS.get(topic, topic),
                "total_answers": total,
                "unique_users": unique,
                "success_rate": rate,
                "fail_rate": 100 - rate,
            })
        except Exception:
            out.append({
                "topic": topic,
                "label": THEME_LABELS.get(topic, topic),
                "total_answers": 0,
                "unique_users": 0,
                "success_rate": None,
                "fail_rate": None,
            })
    return out


# ─────────────────────────────────────────────────────────────────────
# [Fix Admin realtime] Sections supplémentaires demandées :
# - liste utilisateurs (avec recherche/filtres/tri)
# - signups récents
# - activité récente (login events + analytics events)
# - erreurs QCM récentes
# ─────────────────────────────────────────────────────────────────────

def _user_lookup(supabase, user_id: str) -> dict:
    """Retourne {name, email} pour un user_id depuis la table users (silent fail)."""
    if supabase is None or not user_id:
        return {"name": "", "email": ""}
    try:
        r = supabase.table("users").select("name,email").eq("user_id", user_id).limit(1).execute()
        rows = getattr(r, "data", None) or []
        if rows:
            u = rows[0]
            return {"name": u.get("name") or (u.get("email", "").split("@")[0]), "email": u.get("email", "")}
    except Exception: pass
    return {"name": user_id, "email": ""}


def list_users(supabase, search: str = "", filter_kind: str = "all",
               sort: str = "recent", limit: int = 100) -> list[dict]:
    """Liste agrégée des utilisateurs : users + profiles + sessions + last login.

    filter_kind : 'all' | 'active' (online < 5min) | 'inactive' | 'new' (last 24h)
    sort        : 'recent' (created_at desc) | 'xp' (xp desc) | 'last_seen' (last_seen_at desc)
    """
    if supabase is None:
        return []
    try:
        users_r = supabase.table("users").select(
            "user_id,email,name,plan,created_at"
        ).order("created_at", desc=True).limit(min(max(limit, 1), 500)).execute()
        users = getattr(users_r, "data", None) or []
    except Exception:
        return []
    if not users:
        return []

    # Filtre recherche
    if search:
        s = search.lower().strip()
        users = [u for u in users if s in (u.get("email", "") or "").lower() or s in (u.get("name", "") or "").lower()]

    now = datetime.now(timezone.utc)
    cutoff_online = (now - timedelta(minutes=5)).isoformat()
    cutoff_new = (now - timedelta(hours=24)).isoformat()

    out = []
    for u in users:
        uid = u.get("user_id")
        # Profil (xp, score)
        xp = 0; level = "debutant"; score_total = 0; score_correct = 0
        try:
            p = supabase.table("profiles").select("xp,level,score_total,score_correct").eq(
                "user_id", uid
            ).limit(1).execute()
            rows = getattr(p, "data", None) or []
            if rows:
                pr = rows[0]
                xp = pr.get("xp", 0) or 0
                level = pr.get("level", "debutant") or "debutant"
                score_total = pr.get("score_total", 0) or 0
                score_correct = pr.get("score_correct", 0) or 0
        except Exception: pass

        # Last seen depuis user_sessions
        last_seen = ""
        try:
            s = supabase.table("user_sessions").select("last_seen_at").eq(
                "user_id", uid
            ).order("last_seen_at", desc=True).limit(1).execute()
            ses = (getattr(s, "data", None) or [None])[0]
            if ses:
                last_seen = ses.get("last_seen_at") or ""
        except Exception: pass

        # Last login depuis login_events
        last_login = ""
        try:
            le = supabase.table("login_events").select("created_at").eq(
                "user_id", uid
            ).in_("event", ["login", "register"]).order("created_at", desc=True).limit(1).execute()
            ev = (getattr(le, "data", None) or [None])[0]
            if ev:
                last_login = ev.get("created_at") or ""
        except Exception: pass

        # Statut actif basé sur last_seen
        is_active = bool(last_seen and last_seen > cutoff_online)
        is_new = bool(u.get("created_at") and u.get("created_at") > cutoff_new)

        rate = round((score_correct / max(score_total, 1)) * 100) if score_total else 0

        row = {
            "user_id": uid,
            "email": u.get("email", ""),
            "name": u.get("name") or (u.get("email", "").split("@")[0]),
            "plan": u.get("plan", "free"),
            "created_at": u.get("created_at"),
            "last_login_at": last_login,
            "last_seen_at": last_seen,
            "is_active": is_active,
            "is_new": is_new,
            "xp": xp,
            "level": level,
            "qcm_total": score_total,
            "success_rate": rate,
        }
        out.append(row)

    # Filtre
    if filter_kind == "active":
        out = [r for r in out if r["is_active"]]
    elif filter_kind == "inactive":
        out = [r for r in out if not r["is_active"]]
    elif filter_kind == "new":
        out = [r for r in out if r["is_new"]]

    # Tri
    if sort == "xp":
        out.sort(key=lambda r: r["xp"], reverse=True)
    elif sort == "last_seen":
        out.sort(key=lambda r: r["last_seen_at"] or "", reverse=True)
    else:  # recent (default)
        out.sort(key=lambda r: r["created_at"] or "", reverse=True)

    return out[:limit]


def recent_signups(supabase, limit: int = 20) -> list[dict]:
    """Comptes créés récents (ordre desc)."""
    if supabase is None:
        return []
    try:
        r = supabase.table("users").select("user_id,email,name,plan,created_at").order(
            "created_at", desc=True
        ).limit(min(max(limit, 1), 100)).execute()
        return getattr(r, "data", None) or []
    except Exception:
        return []


def recent_activity(supabase, limit: int = 50) -> list[dict]:
    """Activité combinée : login_events + analytics events récents."""
    if supabase is None:
        return []
    items = []
    try:
        r = supabase.table("login_events").select(
            "user_id,email,event,created_at"
        ).order("created_at", desc=True).limit(limit).execute()
        for row in (getattr(r, "data", None) or []):
            items.append({
                "type": "auth",
                "event": row.get("event", ""),
                "user_id": row.get("user_id", ""),
                "email": row.get("email", ""),
                "name": "",
                "ts": row.get("created_at", ""),
            })
    except Exception: pass
    try:
        r = supabase.table("analytics").select(
            "user_id,event,created_at"
        ).order("created_at", desc=True).limit(limit).execute()
        for row in (getattr(r, "data", None) or []):
            uid = row.get("user_id", "")
            items.append({
                "type": "analytics",
                "event": row.get("event", ""),
                "user_id": uid,
                "email": "",
                "name": "",
                "ts": row.get("created_at", ""),
            })
    except Exception: pass
    # Merge sort par ts desc et limit
    items.sort(key=lambda x: x["ts"] or "", reverse=True)
    return items[:limit]


def recent_qcm_errors(supabase, limit: int = 20) -> list[dict]:
    """Dernières réponses QCM incorrectes pour aider à identifier les difficultés."""
    if supabase is None:
        return []
    try:
        r = supabase.table("qcm_attempts").select(
            "user_id,topic,question_id,answered_at"
        ).eq("is_correct", False).order("answered_at", desc=True).limit(
            min(max(limit, 1), 100)
        ).execute()
        return getattr(r, "data", None) or []
    except Exception:
        return []


def compute_kpis_extended(supabase, presence_count: int = 0,
                          support_counts: dict | None = None) -> dict:
    """KPIs enrichis : new_today/new_week, best_xp, avg_success_rate en plus de compute_kpis."""
    base = compute_kpis(supabase, presence_count=presence_count, support_counts=support_counts)
    now = datetime.now(timezone.utc)
    today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_iso = (now - timedelta(days=7)).isoformat()

    new_today = 0
    new_week = 0
    if supabase is not None:
        try:
            r = supabase.table("users").select("user_id", count="exact").gte(
                "created_at", today_iso
            ).execute()
            new_today = getattr(r, "count", 0) or len(getattr(r, "data", None) or [])
            r = supabase.table("users").select("user_id", count="exact").gte(
                "created_at", week_iso
            ).execute()
            new_week = getattr(r, "count", 0) or len(getattr(r, "data", None) or [])
        except Exception: pass

    best_xp = 0
    if supabase is not None:
        try:
            r = supabase.table("profiles").select("xp").order("xp", desc=True).limit(1).execute()
            rows = getattr(r, "data", None) or []
            if rows:
                best_xp = rows[0].get("xp", 0) or 0
        except Exception: pass

    # Moyenne taux réussite global (pondérée par nb réponses)
    avg_rate = 0
    if supabase is not None:
        try:
            total_q = _safe_count(supabase, "qcm_attempts")
            if total_q > 0:
                correct = _safe_count(supabase, "qcm_attempts", is_correct=True)
                avg_rate = round((correct / total_q) * 100)
        except Exception: pass

    base.update({
        "new_today": new_today,
        "new_week": new_week,
        "best_xp": best_xp,
        "avg_success_rate": avg_rate,
    })
    return base


def weekly_summary(supabase) -> dict:
    """Génère un résumé hebdomadaire prêt pour story Instagram."""
    kpis = compute_kpis(supabase)
    themes = theme_stats(supabase)
    answered_themes = [t for t in themes if t["total_answers"] > 0 and t["success_rate"] is not None]
    if answered_themes:
        strongest = max(answered_themes, key=lambda t: t["success_rate"])
        weakest = min(answered_themes, key=lambda t: t["success_rate"])
        total_answers = sum(t["total_answers"] for t in answered_themes)
        weighted = sum(t["success_rate"] * t["total_answers"] for t in answered_themes)
        avg = round(weighted / total_answers) if total_answers else 0
    else:
        strongest = weakest = None
        avg = 0
    summary_text = (
        "Cette semaine sur MA1 :\n"
        f"- {kpis['total_users']} apprenants inscrits\n"
        f"- {kpis['users_with_qcm']} utilisateurs ayant fait au moins 1 QCM\n"
        f"- Taux de réussite moyen : {avg} %\n"
    )
    if strongest:
        summary_text += f"- Thème le plus maîtrisé : {strongest['label']} ({strongest['success_rate']} %)\n"
    if weakest:
        summary_text += f"- Thème le plus difficile : {weakest['label']} ({weakest['success_rate']} %)\n"
    return {
        "kpis": kpis,
        "themes": themes,
        "strongest": strongest,
        "weakest": weakest,
        "average_success_rate": avg,
        "summary_text": summary_text.strip(),
    }
