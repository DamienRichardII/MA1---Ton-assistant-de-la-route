"""[Sprint Admin/Emails/Support] Templates HTML premium MA1 — DA bleu nuit / cyan / blanc.

Chaque template renvoie un dict { subject, html, text }.
Le wrapper layout est commun ; le contenu est passé en HTML brut (déjà sécurisé côté appelant).
"""
from __future__ import annotations
import os
from datetime import datetime, timezone

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ma1.fr").rstrip("/")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", os.getenv("RESEND_REPLY_TO", "contact@ma1.fr"))


def _layout(title: str, body_html: str, cta_text: str | None = None, cta_url: str | None = None) -> str:
    cta_block = ""
    if cta_text and cta_url:
        cta_block = (
            f'<div style="text-align:center;margin:28px 0">'
            f'<a href="{cta_url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3a9db0,#7ec8e3);color:#fff;border-radius:50px;text-decoration:none;font-weight:700;font-family:Sora,sans-serif;font-size:15px;box-shadow:0 4px 18px rgba(58,157,176,0.4)">'
            f'{cta_text}</a></div>'
        )
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Nunito Sans',-apple-system,Segoe UI,sans-serif;color:#d0eaf2">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#0f2035;border-radius:24px;overflow:hidden;border:1px solid rgba(58,157,176,0.18);box-shadow:0 8px 40px rgba(0,0,0,0.4)">
        <tr><td style="padding:24px 28px 8px;text-align:center">
          <div style="font-family:Sora,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px;color:#d0eaf2">MA1<span style="color:#7ec8e3"> · </span><span style="font-weight:500;color:rgba(208,234,242,0.55);font-size:14px">Ton Assistant de la Route</span></div>
        </td></tr>
        <tr><td style="padding:8px 28px 28px">
          <h1 style="font-family:Sora,sans-serif;font-size:22px;color:#a8dce8;margin:16px 0 12px;font-weight:700;line-height:1.3">{title}</h1>
          <div style="font-size:15px;color:rgba(208,234,242,0.78);line-height:1.65">{body_html}</div>
          {cta_block}
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid rgba(58,157,176,0.12);background:rgba(10,22,40,0.4)">
          <p style="margin:0;font-size:11.5px;color:rgba(126,200,227,0.45);line-height:1.6;text-align:center">
            <strong style="color:rgba(208,234,242,0.6)">MA1</strong> — Assistant IA pour le Code de la route et la préparation au permis.<br/>
            Une question&nbsp;? Écrivez à <a href="mailto:{SUPPORT_EMAIL}" style="color:#7ec8e3;text-decoration:none">{SUPPORT_EMAIL}</a>.<br/>
            <a href="{FRONTEND_URL}" style="color:rgba(126,200,227,0.5);text-decoration:none">{FRONTEND_URL}</a>
            <br/><span style="color:rgba(126,200,227,0.3);font-size:10.5px">Vous recevez cet email car vous utilisez MA1.</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _text_fallback(title: str, body_lines: list[str], cta_text: str | None = None, cta_url: str | None = None) -> str:
    out = [f"MA1 — Ton Assistant de la Route", "", title, "=" * len(title), ""]
    out.extend(body_lines)
    if cta_text and cta_url:
        out.extend(["", f"{cta_text} : {cta_url}"])
    out.extend(["", "—", "Support : " + SUPPORT_EMAIL, "Site : " + FRONTEND_URL])
    return "\n".join(out)


def _escape(s: str | None) -> str:
    if not s:
        return ""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ── Templates ────────────────────────────────────────────────────────────

def welcome_user(name: str, email: str) -> dict:
    name_safe = _escape(name) or "à bord"
    body = (
        f"<p>Bonjour <strong>{name_safe}</strong>,</p>"
        "<p>Votre compte MA1 est créé. Vous avez désormais accès à votre assistant IA "
        "pour réviser le Code de la route à votre rythme.</p>"
        "<p>MA1 est actuellement en <strong>bêta ouverte</strong> : certaines fonctionnalités peuvent "
        "évoluer. Vous pouvez nous écrire à tout moment depuis votre espace personnel.</p>"
        "<ul style='color:rgba(208,234,242,0.75);line-height:1.8;padding-left:20px'>"
        "<li>QCM adaptatifs sur 9 thèmes</li>"
        "<li>Examen blanc dans les conditions réelles</li>"
        "<li>Plan de révision 30 jours</li>"
        "</ul>"
    )
    return {
        "subject": "Bienvenue sur MA1 — Votre compte est créé",
        "html": _layout("Bienvenue sur MA1", body, "Accéder à mon espace MA1", FRONTEND_URL),
        "text": _text_fallback("Bienvenue sur MA1", [
            f"Bonjour {name or ''},",
            "Votre compte MA1 est créé.",
            "MA1 est en bêta ouverte — vos retours sont précieux.",
        ], "Accéder à mon espace MA1", FRONTEND_URL),
    }


def login_notification(name: str, when_iso: str, ip_hash: str | None = None) -> dict:
    name_safe = _escape(name) or ""
    when_safe = _escape(when_iso)
    body = (
        f"<p>Bonjour <strong>{name_safe}</strong>,</p>"
        f"<p>Une nouvelle connexion à votre compte MA1 a été détectée le <strong>{when_safe}</strong>.</p>"
        "<p style='color:rgba(208,234,242,0.6);font-size:14px'>Si vous n'êtes pas à l'origine "
        f"de cette connexion, contactez immédiatement <a href='mailto:{SUPPORT_EMAIL}' "
        f"style='color:#7ec8e3'>{SUPPORT_EMAIL}</a> et changez votre mot de passe.</p>"
    )
    return {
        "subject": "Nouvelle connexion à votre compte MA1",
        "html": _layout("Nouvelle connexion détectée", body, "Ouvrir MA1", FRONTEND_URL),
        "text": _text_fallback("Nouvelle connexion détectée", [
            f"Bonjour {name or ''},",
            f"Connexion détectée le {when_iso}.",
            "Si ce n'est pas vous : contactez " + SUPPORT_EMAIL,
        ], "Ouvrir MA1", FRONTEND_URL),
    }


def admin_password_reset(reset_url: str, expiry_minutes: int = 30) -> dict:
    body = (
        "<p>Bonjour Damien,</p>"
        "<p>Une réinitialisation du mot de passe administrateur MA1 a été demandée.</p>"
        f"<p>Cliquez sur le bouton ci-dessous (valable <strong>{expiry_minutes} minutes</strong>) "
        "pour choisir un nouveau mot de passe.</p>"
        "<p style='color:rgba(208,234,242,0.5);font-size:13px'>Si vous n'êtes pas à l'origine de cette "
        "demande, ignorez cet email. Le lien expirera automatiquement.</p>"
    )
    return {
        "subject": "Réinitialisation du mot de passe admin MA1",
        "html": _layout("Réinitialiser le mot de passe admin", body, "Choisir un nouveau mot de passe", reset_url),
        "text": _text_fallback("Réinitialisation admin MA1", [
            "Une demande de réinitialisation admin a été faite.",
            f"Lien (valable {expiry_minutes} min) : {reset_url}",
            "Si ce n'est pas vous, ignorez cet email.",
        ]),
    }


def support_message_received(user_name: str, subject: str) -> dict:
    """Confirmation envoyée à l'UTILISATEUR après envoi de son message."""
    body = (
        f"<p>Bonjour {_escape(user_name) or ''},</p>"
        "<p>Nous avons bien reçu votre message :</p>"
        f"<blockquote style='margin:12px 0;padding:12px 16px;border-left:3px solid #3a9db0;background:rgba(58,157,176,0.06);color:rgba(208,234,242,0.75);font-style:italic'>{_escape(subject)}</blockquote>"
        "<p>Nous vous répondrons sous 24 à 48 heures ouvrables. La réponse apparaîtra "
        "aussi dans votre espace <strong>Support</strong> sur MA1.</p>"
    )
    return {
        "subject": "Votre message a bien été reçu — Support MA1",
        "html": _layout("Message reçu — Support MA1", body, "Voir mes messages", f"{FRONTEND_URL}/support"),
        "text": _text_fallback("Message reçu — Support MA1", [
            f"Bonjour {user_name or ''},",
            f"Sujet : {subject}",
            "Réponse sous 24-48h ouvrables.",
        ], "Voir mes messages", f"{FRONTEND_URL}/support"),
    }


def support_reply_user(user_name: str, subject: str, admin_reply_preview: str) -> dict:
    """Notification utilisateur quand admin répond."""
    body = (
        f"<p>Bonjour {_escape(user_name) or ''},</p>"
        "<p>Vous avez reçu une réponse à votre message support :</p>"
        f"<p style='color:rgba(168,220,232,0.7);font-size:13.5px;margin:6px 0 0'><strong>Sujet :</strong> {_escape(subject)}</p>"
        f"<blockquote style='margin:14px 0;padding:14px 18px;border-left:3px solid #7ec8e3;background:rgba(126,200,227,0.05);color:rgba(208,234,242,0.85);line-height:1.65'>{_escape(admin_reply_preview)[:400]}{'…' if len(admin_reply_preview) > 400 else ''}</blockquote>"
        "<p>Connectez-vous pour lire la réponse complète et continuer la conversation.</p>"
    )
    return {
        "subject": f"Réponse à votre message — {subject[:60]}",
        "html": _layout("Vous avez une réponse", body, "Ouvrir la conversation", f"{FRONTEND_URL}/support"),
        "text": _text_fallback("Réponse à votre message support", [
            f"Bonjour {user_name or ''},",
            f"Sujet : {subject}",
            "Réponse : " + (admin_reply_preview[:300] + ("…" if len(admin_reply_preview) > 300 else "")),
        ], "Ouvrir la conversation", f"{FRONTEND_URL}/support"),
    }


def admin_new_support_message(user_name: str, user_email: str, subject: str, message_preview: str, category: str) -> dict:
    """Notification admin quand un utilisateur envoie un message."""
    body = (
        "<p>Nouveau message support reçu.</p>"
        f"<p style='color:rgba(168,220,232,0.75);font-size:13.5px;margin:6px 0'><strong>De :</strong> {_escape(user_name) or '(sans prénom)'} &lt;{_escape(user_email)}&gt;</p>"
        f"<p style='color:rgba(168,220,232,0.75);font-size:13.5px;margin:6px 0'><strong>Catégorie :</strong> {_escape(category)}</p>"
        f"<p style='color:rgba(168,220,232,0.75);font-size:13.5px;margin:6px 0'><strong>Sujet :</strong> {_escape(subject)}</p>"
        f"<blockquote style='margin:14px 0;padding:14px 18px;border-left:3px solid #e8b84d;background:rgba(232,184,77,0.05);color:rgba(208,234,242,0.85);line-height:1.65'>{_escape(message_preview)[:500]}{'…' if len(message_preview) > 500 else ''}</blockquote>"
    )
    return {
        "subject": f"[MA1 Support] {category} — {subject[:60]}",
        "html": _layout("Nouveau message support", body, "Voir dans l'admin", f"{FRONTEND_URL}/admin/messages"),
        "text": _text_fallback("Nouveau message support MA1", [
            f"De : {user_name or ''} <{user_email}>",
            f"Catégorie : {category}",
            f"Sujet : {subject}",
            "",
            "Message :",
            message_preview[:500],
        ], "Voir dans l'admin", f"{FRONTEND_URL}/admin/messages"),
    }
