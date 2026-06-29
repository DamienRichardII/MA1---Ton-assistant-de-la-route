# FIX — Email de bienvenue non reçu après création de compte

Date : 2026-06-29
Fichier modifié (1) : `apps/backend/src/api.py` (branche email dans `/auth/register`)
Aucun autre fichier touché. Aucun frontend touché.

---

## 1. Symptôme

Création de compte fonctionne (`POST /auth/register` retourne `200 + {success, user_id, token}`), mais l'utilisateur ne reçoit pas l'email de bienvenue. Aucune erreur visible dans les logs Railway.

## 2. Cause

L'ancien code dans `/auth/register` :

```python
if HAS_ADMIN_STACK:
    try:
        tpl = tpl_welcome(req.name or "", email)
        send_email(template="welcome_user", to_email=email, ...)
    except Exception as e:
        print(f"[email] welcome_user failed: {e}")
elif HAS_EMAIL:
    try: await send_welcome_email(email, req.name)
    except: pass
```

3 problèmes :

1. **Le `status` renvoyé par `send_email` est ignoré.** `send_email` retourne `{"status": "sent"|"failed"|"skipped", "error": "..."}` mais on ne lit jamais ce dict. Donc si Resend rejette l'email proprement (domaine pas vérifié, API key invalide, etc.), `send_email` met le log dans `email_logs` table avec status='failed' MAIS aucune trace côté Railway logs.
2. **Pas de log "start"**. Impossible de savoir si la branche est seulement exécutée.
3. **`elif HAS_EMAIL` catch silencieusement avec `except: pass`**. Si l'app retombe sur cette branche (parce que `HAS_ADMIN_STACK=False`), aucune erreur n'est visible.

Résultat : Damien ne sait pas si l'email a été tenté, skipped, ou échoué — et pourquoi.

## 3. Correction appliquée

Logs explicites pour CHAQUE issue possible :

```python
print(f"[EMAIL] welcome start {email}", flush=True)
if HAS_ADMIN_STACK:
    try:
        tpl = tpl_welcome(req.name or "", email)
        result = send_email(
            template="welcome_user", to_email=email,
            subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
            user_id=uid, supabase=get_supabase(), force=True,
        )
        status = (result or {}).get("status", "unknown")
        if status == "sent":
            print(f"[EMAIL] welcome sent {email} (id=...)", flush=True)
        elif status == "skipped":
            print(f"[EMAIL] welcome skipped {email}: {error}", flush=True)
        else:
            print(f"[EMAIL] welcome failed {email}: {error}", flush=True)
    except Exception as e:
        print(f"[EMAIL] welcome failed {email}: exception {type(e).__name__}: {e}", flush=True)
elif HAS_EMAIL:
    try:
        await send_welcome_email(email, req.name)
        print(f"[EMAIL] welcome sent {email} (legacy path)", flush=True)
    except Exception as e:
        print(f"[EMAIL] welcome failed {email}: legacy {type(e).__name__}: {e}", flush=True)
else:
    print(f"[EMAIL] welcome skipped {email}: ni HAS_ADMIN_STACK ni HAS_EMAIL — vérifier PYTHONPATH + RESEND_API_KEY", flush=True)
```

**Garanties :**
- Toujours un log `[EMAIL] welcome start <email>` au début → on sait que la branche est touchée
- Toujours un log `[EMAIL] welcome (sent|skipped|failed) <email>` à la fin → on sait le résultat
- Le `flush=True` force l'écriture immédiate dans les logs Railway (évite buffering)
- L'erreur exacte est dans le log (ni masquée, ni avalée)
- La création du compte n'est jamais bloquée (les `try/except` restent — Resend down ≠ inscription bloquée)

## 4. Logs Railway à surveiller après deploy

### Cas 1 — Tout marche
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome sent newuser@example.com (id=4d6a2c91-...)
```

### Cas 2 — Resend pas configuré (clé manquante)
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome skipped newuser@example.com: resend non configuré
```
→ Solution : poser `RESEND_API_KEY=re_...` dans Railway.

### Cas 3 — Domaine non vérifié dans Resend
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome failed newuser@example.com: The contact@ma1.fr from address is not verified...
```
→ Solution : vérifier `ma1.fr` dans le dashboard Resend → Domains.

### Cas 4 — Stack admin pas chargée (PYTHONPATH manquant)
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome skipped newuser@example.com: ni HAS_ADMIN_STACK ni HAS_EMAIL — vérifier PYTHONPATH + RESEND_API_KEY
```
→ Solution : voir `docs/FIX_BACKEND_IMPORTS_ADMIN_SUPPORT_RAILWAY.md` (PYTHONPATH=/app/src dans Dockerfile)

### Cas 5 — Rate-limit Resend ou erreur réseau
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome failed newuser@example.com: 429 Too Many Requests
```

## 5. Variables d'env Railway à vérifier (rappel)

| Variable | Obligatoire | Comportement si absente |
|---|---|---|
| `RESEND_API_KEY` | ✅ Oui | Email skipped silencieusement (mais visible dans log skip ci-dessus) |
| `RESEND_FROM` (ou `EMAIL_FROM` ou `RESEND_FROM_EMAIL`) | ✅ Oui | Default = `"MA1 <contact@ma1.fr>"` |
| `RESEND_REPLY_TO` (ou `SUPPORT_EMAIL` ou `ADMIN_EMAIL`) | Recommandé | Default = `contact@ma1.fr` |
| `FRONTEND_URL` | Recommandé | Default = `https://ma1.fr` |
| `PYTHONPATH=/app/src` (déjà fix précédent dans Dockerfile) | ✅ Oui | HAS_ADMIN_STACK=False → email skipped |

## 6. Test à effectuer après push

### Test 1 — Création compte test

```bash
curl -i -X POST https://ma1-ton-assistant-de-la-route-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ton.vraie.adresse@gmail.com","password":"test12345","name":"Test"}'
```

→ Attendu :
- HTTP `200 + {"success":true,"user_id":"u_...","token":"...","name":"Test","plan":"free"}`
- Email reçu sur `ton.vraie.adresse@gmail.com` (sujet : "Bienvenue sur MA1" OU "🏆 Inscription confirmée — Jeu Concours Bêta MA1" selon date)

### Test 2 — Logs Railway

Onglet **Deployments** → cliquer sur le deploy actif → **View Logs** → tu dois voir :
```
[EMAIL] welcome start ton.vraie.adresse@gmail.com
[EMAIL] welcome sent ton.vraie.adresse@gmail.com (id=...)
```

### Test 3 — Resend Logs

Aller sur [resend.com/emails](https://resend.com/emails) → tu dois voir l'email apparaître avec status `delivered` ou `sent`. Si status `bounced` ou `failed` → cliquer dessus pour voir l'erreur exacte.

### Test 4 — Table email_logs Supabase

Aller sur Supabase Table Editor → table `email_logs` → tu dois voir une ligne :
```
template     = welcome_user
to_email     = ton.vraie.adresse@gmail.com
status       = sent  (ou failed/skipped + colonne error)
provider     = resend
provider_message_id = <id Resend>
```

## 7. Résultat attendu Railway

**AVANT** (logs muets, problème invisible) :
```
POST /auth/register HTTP/1.1 → 200
(aucun log email)
```

**APRÈS** (chaque tentative est tracée) :
```
POST /auth/register HTTP/1.1 → 200
[EMAIL] welcome start newuser@example.com
[EMAIL] welcome sent newuser@example.com (id=4d6a2c91-...)
```

## 8. Commandes Git

```cmd
cd C:\Users\HP-15\Downloads\MA1_v9_Final
git add apps/backend/src/api.py docs/FIX_EMAIL_WELCOME_REGISTER_MA1.md
git commit -m "fix(email): logs [EMAIL] welcome start/sent/skipped/failed dans /auth/register"
git push
```

→ Railway redéploie (~1-3 min).

---

*Fix terminé. 1 fichier Python modifié. Logs explicites garantis sur chaque tentative d'envoi welcome.*

— FIN DU RAPPORT — marker_eof_FIX_EMAIL_WELCOME_REGISTER_MA1
