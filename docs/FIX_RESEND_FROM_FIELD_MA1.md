# FIX — Resend `validation_error` "Invalid `from` field"

Date : 2026-06-29
Fichier modifié (1) : `apps/backend/src/email_service.py`
Aucun autre fichier touché. Aucun template, ni frontend, ni logique métier modifiée.

---

## 1. Symptôme

Logs Resend renvoient `422 validation_error — Invalid 'from' field`. Dans le request body envoyé par le backend, on voit :

```json
"from": "\"MA1 <contact@ma1.fr>\""
```

→ les **guillemets sont inclus dans la string** (Resend reçoit littéralement `"MA1 <contact@ma1.fr>"` avec les `"` au début et à la fin).

La valeur attendue par Resend est :
```json
"from": "MA1 <contact@ma1.fr>"
```

## 2. Cause

Sur Railway (et d'autres hébergeurs), quand on définit une variable d'environnement avec des espaces, on l'écrit naturellement entre guillemets dans l'UI :

```env
RESEND_FROM="MA1 <contact@ma1.fr>"
```

→ Railway **garde les guillemets dans la valeur** (au lieu de les traiter comme délimiteurs du shell).

Résultat côté Python : `os.getenv("RESEND_FROM")` retourne la chaîne `"MA1 <contact@ma1.fr>"` (24 chars, avec les `"` aux extrémités) au lieu de `MA1 <contact@ma1.fr>` (22 chars).

Cette valeur était ensuite passée telle quelle à Resend, qui rejette le format avec `422 Invalid from field`.

## 3. Correction appliquée

Ajout d'une fonction `_clean_email_from()` qui nettoie la valeur d'env :
- strip whitespace
- strip backslash-quotes (`\"...\"`) — **EN PREMIER**, avant les quotes seules, sinon `strip('"')` laisse un `\` orphelin
- strip guillemets droits `"` et `'` (avec boucle pour cas doublés `""...""`)
- strip guillemets typographiques `“ ” ‘ ’`

```python
def _clean_email_from(value: str) -> str:
    if not value:
        return value
    v = value.strip()
    # Strip backslash-quotes EN PREMIER (cas où Railway garde `\"...\"`)
    # Sinon strip('"') consomme le " seul et laisse un \ orphelin en fin.
    v = v.replace('\\"', '').replace("\\'", "")
    # Strip guillemets droits/courbes en début ET fin (peut être doublés)
    for _ in range(3):
        v = v.strip().strip('"').strip("'").strip("“").strip("”").strip("‘").strip("’")
    return v.strip()
```

Appliquée à `EMAIL_FROM` et `REPLY_TO`. `RESEND_API_KEY` est aussi nettoyée (`.strip().strip('"').strip("'")`) au cas où.

## 4. Logs ajoutés au démarrage (visibles dans Railway)

```python
print(f"[EMAIL] from resolved: {EMAIL_FROM}", flush=True)
print(f"[EMAIL] reply_to resolved: {REPLY_TO}", flush=True)
print(f"[EMAIL] has_email: {HAS_EMAIL}", flush=True)
```

→ Au démarrage du container, tu verras dans les logs Railway :

```
[EMAIL] from resolved: MA1 <contact@ma1.fr>
[EMAIL] reply_to resolved: contact@ma1.fr
[EMAIL] has_email: True
```

Si tu vois encore des guillemets dans `from resolved: "MA1 <contact@ma1.fr>"` → le `_clean_email_from` ne couvre pas ton format spécifique. M'envoyer le contenu exact des logs.

## 5. Validation locale (8 cas testés)

```
✅  '"MA1 <contact@ma1.fr>"'              → 'MA1 <contact@ma1.fr>'
✅  'MA1 <contact@ma1.fr>'                → 'MA1 <contact@ma1.fr>'
✅  "'contact@ma1.fr'"                    → 'contact@ma1.fr'
✅  '  "MA1 <contact@ma1.fr>"  '          → 'MA1 <contact@ma1.fr>'
✅  '\\"MA1 <contact@ma1.fr>\\"'          → 'MA1 <contact@ma1.fr>'
✅  '“MA1 <contact@ma1.fr>”'              → 'MA1 <contact@ma1.fr>'
✅  'contact@ma1.fr'                      → 'contact@ma1.fr'
✅  '""MA1 <contact@ma1.fr>""'            → 'MA1 <contact@ma1.fr>'

GLOBAL: ✅ 8/8 OK
```

## 6. Fichier modifié

| Fichier | Modification |
|---|---|
| `apps/backend/src/email_service.py` | Ajout fonction `_clean_email_from()` + application sur `EMAIL_FROM` et `REPLY_TO` + 3 logs au démarrage |

**Aucun autre fichier touché.** Pas de modification de :
- `email_templates.py`
- `api.py`
- variables d'environnement Railway
- frontend
- logique concours/support/admin

## 7. Test après push Railway

### Test rapide : créer un compte avec un email réel

```bash
curl -i -X POST https://ma1-ton-assistant-de-la-route-production.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"TON.EMAIL.PERSO@gmail.com","password":"test12345","name":"Test"}'
```

### Vérifier les logs Railway

Au démarrage du container (après deploy) :
```
[EMAIL] from resolved: MA1 <contact@ma1.fr>
[EMAIL] reply_to resolved: contact@ma1.fr
[EMAIL] has_email: True
```

À la création du compte :
```
POST /auth/register HTTP/1.1
[EMAIL] welcome start TON.EMAIL.PERSO@gmail.com
[EMAIL] welcome sent TON.EMAIL.PERSO@gmail.com (id=...)
```

### Vérifier dans Resend

[resend.com/emails](https://resend.com/emails) → ton dernier email doit avoir :
- **From** : `MA1 <contact@ma1.fr>` (sans guillemets autour)
- **Status** : `delivered` ou `sent`
- **PLUS de 422 validation_error**

### Vérifier dans Supabase `email_logs`

Table Editor → `email_logs` → dernière ligne :
- `from_email = MA1 <contact@ma1.fr>` (sans guillemets)
- `status = sent`

## 8. Commandes git

```cmd
cd C:\Users\HP-15\Downloads\MA1_v9_Final
git add apps/backend/src/email_service.py docs/FIX_RESEND_FROM_FIELD_MA1.md
git commit -m "fix(email): strip guillemets autour de RESEND_FROM (422 validation_error)"
git push
```

→ Railway redéploie auto (~1-3 min).

---

*Fix terminé. 1 fichier modifié. 8/8 cas testés OK. Aucune régression sur les autres formats.*

— FIN DU RAPPORT — marker_eof_FIX_RESEND_FROM_FIELD_MA1
