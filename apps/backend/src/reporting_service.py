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
