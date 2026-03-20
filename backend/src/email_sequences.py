"""MA1 Email Sequences — J0 to J7 automated emails."""
import os

try:
    import resend
    RESEND_KEY = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "MA1 <noreply@ma1.app>")
    if RESEND_KEY: resend.api_key = RESEND_KEY
    HAS_RESEND = bool(RESEND_KEY)
except ImportError:
    HAS_RESEND = False

APP_URL = os.getenv("APP_URL", "https://ma1.app")

def _wrap(title, body_html):
    return f"""<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1628;color:#d0eaf2;border-radius:16px">
    <div style="text-align:center;margin-bottom:16px"><img src="{APP_URL}/ma1-logo.jpeg" width="60" style="border-radius:12px" alt="MA1"/></div>
    <h1 style="color:#7ec8e3;font-size:22px;text-align:center;margin-bottom:16px">{title}</h1>
    {body_html}
    <p style="font-size:11px;color:rgba(126,200,227,0.3);margin-top:24px;text-align:center">MA1 — Ton Assistant de la Route<br/>
    <a href="{APP_URL}/settings" style="color:rgba(126,200,227,0.3)">Se desabonner</a></p>
    </div>"""

def _cta(text, url):
    return f'<div style="text-align:center;margin:20px 0"><a href="{url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3a9db0,#7ec8e3);color:#fff;border-radius:50px;text-decoration:none;font-weight:bold">{text}</a></div>'

SEQUENCES = {
    0: {
        "subject": "Bienvenue sur MA1 — Votre Code de la Route avec IA",
        "html": lambda name: _wrap(f"Bienvenue {name or ''} !", f"""
            <p style="color:#a8dce8;line-height:1.6">Votre compte MA1 est cree. Commencez votre parcours de revision du Code de la Route.</p>
            <p style="color:#a8dce8;line-height:1.6">Voici ce qui vous attend :</p>
            <ul style="color:#a8dce8;line-height:1.8">
                <li>10 questions IA gratuites par jour</li>
                <li>Un plan de revision sur 30 jours</li>
                <li>Des examens blancs realistes</li>
            </ul>
            {_cta("Commencer mes revisions", APP_URL)}""")
    },
    1: {
        "subject": "Avez-vous fait votre premier QCM ?",
        "html": lambda name: _wrap("Premier QCM ?", f"""
            <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
            <p style="color:#a8dce8;line-height:1.6">Le meilleur moment pour commencer, c'est maintenant. Testez vos connaissances avec un QCM adapte a votre niveau.</p>
            {_cta("Lancer un QCM", APP_URL + "/qcm")}
            <p style="color:rgba(168,220,232,0.5);font-size:13px">Astuce : commencez par le theme 'Signalisation' — c'est la base de tout.</p>""")
    },
    3: {
        "subject": "Votre progression MA1 cette semaine",
        "html": lambda name: _wrap("Votre progression", f"""
            <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
            <p style="color:#a8dce8;line-height:1.6">Vous avez commence votre parcours il y a 3 jours. Continuez comme ca !</p>
            <p style="color:#a8dce8;line-height:1.6">N'oubliez pas de suivre votre plan de revision 30 jours pour couvrir tous les themes.</p>
            {_cta("Voir ma progression", APP_URL + "/plan30")}""")
    },
    5: {
        "subject": "Votre essai MA1 Premium se termine dans 48h",
        "html": lambda name: _wrap("Rappel : essai Premium", f"""
            <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
            <p style="color:#e8b84d;line-height:1.6;font-weight:bold">Votre periode d'essai gratuite se termine dans 48 heures.</p>
            <p style="color:#a8dce8;line-height:1.6">A l'issue, votre abonnement Premium sera active a 10€/mois. Si vous ne souhaitez pas continuer, annulez avant la fin de l'essai.</p>
            {_cta("Gerer mon abonnement", APP_URL + "/settings")}
            <p style="color:rgba(168,220,232,0.3);font-size:11px">Conformement a nos CGV, aucun prelevement si vous annulez avant la fin de l'essai.</p>""")
    },
    7: {
        "subject": "Votre essai est termine — vos statistiques MA1",
        "html": lambda name: _wrap("Bilan de votre essai", f"""
            <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
            <p style="color:#a8dce8;line-height:1.6">Votre essai Premium est termine. Voici ce que vous avez accompli :</p>
            <p style="color:#a8dce8;line-height:1.6">Continuez votre progression avec le plan gratuit (10 questions/jour) ou passez Premium pour un acces illimite.</p>
            {_cta("Continuer mes revisions", APP_URL)}""")
    },
}

async def send_sequence_email(email: str, name: str, day: int):
    if not HAS_RESEND: return False
    seq = SEQUENCES.get(day)
    if not seq: return False
    try:
        resend.Emails.send({
            "from": EMAIL_FROM, "to": [email],
            "subject": seq["subject"], "html": seq["html"](name),
        })
        return True
    except: return False

async def check_sequences(users):
    """Check and send sequence emails based on registration date."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    sent = 0
    for email, u in users.items():
        created = u.get("created", "")
        if not created: continue
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            day = (now - created_dt).days
            if day in SEQUENCES and not u.get(f"_seq_{day}"):
                ok = await send_sequence_email(email, u.get("name", ""), day)
                if ok:
                    u[f"_seq_{day}"] = True
                    sent += 1
        except: pass
    return sent
