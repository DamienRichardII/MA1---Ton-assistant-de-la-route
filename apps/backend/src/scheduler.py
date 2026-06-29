"""Email + Push scheduler — Wire via /cron/daily endpoint."""
import time
from datetime import date, datetime, timezone, timedelta

async def check_trial_reminders(users, send_email_fn, send_push_fn=None):
    """Send reminder 48h before trial ends."""
    now = datetime.now(timezone.utc)
    sent = 0
    for email, u in users.items():
        created = u.get("created", "")
        if not created or u.get("plan") != "premium": continue
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            trial_end = created_dt + timedelta(days=7)
            reminder_time = trial_end - timedelta(hours=48)
            if reminder_time <= now <= trial_end and not u.get("_trial_reminded"):
                await send_email_fn(email, u.get("name", ""))
                u["_trial_reminded"] = True
                if send_push_fn:
                    await send_push_fn(u.get("user_id"), "Essai Premium", "Votre essai se termine dans 48h", "/settings")
                sent += 1
        except: pass
    return sent

async def check_streak_reminders(profiles, users, send_email_fn, send_push_fn=None):
    """Send reminder if user has streak >= 3 but hasn't visited today."""
    today = date.today().isoformat()
    sent = 0
    for uid, p in profiles.items():
        if p.get("streak_days", 0) >= 3 and p.get("last_seen") != today:
            for email, u in users.items():
                if u.get("user_id") == uid and not u.get("_streak_" + today):
                    await send_email_fn(email, u.get("name", ""), p["streak_days"])
                    u["_streak_" + today] = True
                    if send_push_fn:
                        await send_push_fn(uid, f"Serie de {p['streak_days']} jours en danger !", "Revisez maintenant", "/qcm")
                    sent += 1
                    break
    return sent

async def check_stagnant_students(profiles, autoecole_students):
    """Find students inactive for 3+ days."""
    today = date.today()
    stagnant = []
    for owner_id, student_ids in autoecole_students.items():
        for sid in student_ids:
            p = profiles.get(sid, {})
            last = p.get("last_seen", "")
            if last:
                try:
                    days = (today - date.fromisoformat(last)).days
                    if days >= 3:
                        stagnant.append({"owner_id": owner_id, "student_id": sid, "days_inactive": days})
                except: pass
    return stagnant

async def run_daily(users, profiles, autoecole_students, send_trial_fn, send_streak_fn, send_push_fn=None):
    """Run all daily checks. Returns summary."""
    results = {}
    results["trial_sent"] = await check_trial_reminders(users, send_trial_fn, send_push_fn)
    results["streak_sent"] = await check_streak_reminders(profiles, users, send_streak_fn, send_push_fn)
    results["stagnant"] = await check_stagnant_students(profiles, autoecole_students)
    results["ts"] = time.time()
    return results
