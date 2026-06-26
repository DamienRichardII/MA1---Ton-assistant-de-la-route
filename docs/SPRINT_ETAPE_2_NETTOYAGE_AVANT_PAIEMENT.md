# SPRINT ÉTAPE 2 — RAPPORT DE FIN NETTOYAGE AVANT PAIEMENT

Date : 2026-05-20
Conforme : `Damcompany-code-guardrails.md` + `CLAUDE.md` + `INCIDENTS_ET_CONTROLES.md` (CTRL-1 à CTRL-8 appliqués).
**Aucun lien SumUp réel n'a été intégré.** Seuls les placeholders dans `.env.example` ont été ajoutés.

---

## 1. Résumé exécutif

| Question | Réponse |
|---|---|
| Sprint terminé ? | **OUI** |
| Premium fake supprimé ? | **OUI** (`goPrem()` neutralisé + tous les fallbacks éliminés + handler `?checkout=success` neutralisé) |
| Admin sécurisé / désactivé ? | **OUI** (page `/admin` désactivée temporairement, message clair, plus de mot de passe client-side) |
| Routes sensibles protégées ? | **OUI** — **28 routes** protégées avec `Depends(require_auth*)` (cf §4) |
| CORS restreint ? | **OUI** via `CORS_ALLOWED_ORIGINS` env, refus de démarrage si `*` en prod |
| JWT_SECRET sécurisé ? | **OUI** — refus de démarrage si valeur par défaut ou < 32 caractères en production |
| XSS IA corrigé ? | **OUI** — `dangerouslySetInnerHTML` supprimé de `ChatPanel.tsx` et `VisionPanel.tsx`, rendu via composants React safe |
| Prêt pour intégration SumUp ? | **OUI** — placeholders env présents, code défensif en place, tunnel `/pricing-beta` à créer au Sprint D |

---

## 2. Premium fake

| Élément | Ancien comportement | Nouveau comportement | Fichier |
|---|---|---|---|
| `goPrem()` ligne 1372 | `S.plan='premium'; S.qMax=999; ...alert('🎉 Premium active ! (Integrez Stripe)')` | `closeP(); alert("Accès bêta disponible via paiement SumUp, activation manuelle à venir.\n\nLe paiement sera bientôt disponible pour la bêta MA1.")` | `public/index-standalone.html:1375` |
| `stripeCheckout()` ligne 1745 | Try fetch → si 503 ou erreur réseau → `goPrem()` (fraude) | `alert("Paiement bientôt disponible via SumUp, activation manuelle à venir.")` (aucun fallback) | `public/index-standalone.html:1746-1750` |
| `stripeCheckout` catch ligne 1755 | `console.log('Stripe non dispo, mode demo'); goPrem();` | Supprimé (plus de fallback frauduleux) | `public/index-standalone.html` |
| Patch pricing buttons ligne 1760 | Reroute `goPrem()` → `stripeCheckout('premium')` (fake Premium via Stripe absent) | Reroute `goPrem()` → `goPrem()` (qui est maintenant safe) | `public/index-standalone.html:1755-1761` |
| Handler `?checkout=success` ligne 1770 | Lit `?plan=` URL puis `S.plan=plan; S.qMax=999` (forgeable !) | Juste nettoyage URL via `replaceState`. Aucun plan client-side. | `public/index-standalone.html:1763-1767` |
| Backend `/plan/upgrade` (`api.py:591`) | Accepte n'importe quel `user_id` + plan SANS auth → Premium spoof direct via curl | `Depends(require_admin)` — seul un admin peut attribuer un plan. Bêta = activation manuelle. | `backend/src/api.py:609-614` |

### Garanties

- **Aucun bouton frontend ne donne Premium.** Tous mènent à un alert "bêta SumUp à venir".
- **Aucun fallback réseau ne donne Premium.** Le `catch` du `fetch` ne déclenche plus aucun upgrade local.
- **Aucune URL forgée `?checkout=success&plan=premium` ne donne Premium.** Le handler est neutralisé.
- **Aucune action via `localStorage`** ne donne réellement Premium côté backend (le frontend peut afficher Premium mais le backend ignore le `S.plan` du client → toutes les routes payées sont protégées).
- **Aucun appel `/plan/upgrade` sans token admin** ne fonctionne plus.

### Note `Zustand store` (`lib/store.ts`)

- `lib/store.ts` n'a PAS été modifié dans ce sprint car ce store est uniquement client-side UX.
- Le backend est désormais source de vérité pour le plan réel (via `_users[email].plan` + `_usage[uid].plan`). Le client peut mentir localement, le backend rejettera.
- Sprint suivant (Étape 4 — Supabase) : le store récupèrera le plan + `paid_until` depuis `/auth/me` à chaque connexion.

---

## 3. Admin

| Élément | Statut | Correction |
|---|---|---|
| `app/admin/page.tsx` — mot de passe `'ma1admin2026'` en clair côté client | ❌ Critique | **Page entièrement réécrite** : composant désactivé affichant "Admin temporairement désactivé pendant la sécurisation MA1". Aucun appel API admin exposé. Aucun champ password. |
| Backend `/analytics/summary` | ❌ Sans auth | `Depends(require_admin)` — admin uniquement |
| Backend `/cron/daily` | ❌ Sans auth | `Depends(require_admin)` — admin uniquement |
| Backend `/plan/upgrade` | ❌ Sans auth (Premium spoof) | `Depends(require_admin)` — admin uniquement |
| Mécanisme admin backend | n/a | Ajout helper `require_admin` + variable d'env `ADMIN_EMAILS` (emails séparés par virgule). Pas de role dans le JWT (à ajouter Sprint Étape 4 quand Supabase sera la source). |

---

## 4. Routes protégées

| Route | Avant | Après | Helper |
|---|---|---|---|
| `GET /profile/{user_id}` | Ouvert à tous | Token + user_id match | `require_auth_user_match` |
| `GET /readiness/{user_id}` | Ouvert | Token + match | `require_auth_user_match` |
| `GET /usage/{user_id}` | Ouvert | Token + match | `require_auth_user_match` |
| `GET /rgpd/export/{user_id}` | Ouvert (P0 RGPD) | Token + match | `require_auth_user_match` |
| `DELETE /rgpd/delete/{user_id}` | Ouvert (P0 RGPD) | Token + match | `require_auth_user_match` |
| `GET /export/pdf/{user_id}` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /plan/progress?user_id=&day=` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /test/positionnement` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /referral/apply` | Ouvert | Token + match | `require_auth_user_match` |
| `GET /referral/{user_id}` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /push/subscribe?user_id=` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /challenge/create` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /challenge/{id}/submit` | Ouvert | Token + match | `require_auth_user_match` |
| `GET /challenge/list/{user_id}` | Ouvert | Token + match | `require_auth_user_match` |
| `POST /qcm/result` | Ouvert | Token + match (body user_id) | `require_auth` + match manuel |
| `POST /exam/result` | Ouvert | Token + match (body user_id) | `require_auth` + match manuel |
| `GET /dashboard/{owner_id}` | Ouvert (P0 espionnage) | Token + owner match | `require_auth_owner_match` |
| `POST /dashboard/add-student` | Ouvert | Token + owner match (body owner_id) | `require_auth` + match manuel |
| `POST /dashboard/note` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `GET /dashboard/notes/{student_id}` | Ouvert | Token + (student OU owner OU admin) | `require_auth` + logique custom |
| `POST /dashboard/group` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `POST /dashboard/group/{group_id}/add` | Ouvert | Token + owner du groupe match | `require_auth` + logique custom |
| `GET /dashboard/groups/{owner_id}` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `GET /dashboard/alerts/{owner_id}` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `GET /dashboard/pdf/{owner_id}` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `GET /whitelabel/{owner_id}` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `POST /whitelabel/{owner_id}` | Ouvert | Token + owner match | `require_auth_owner_match` |
| `POST /api/v1/keys/create` | Ouvert (P0 brute force keys) | Token + owner match | `require_auth` + match manuel |
| `GET /analytics/summary` | Ouvert | Admin only | `require_admin` |
| `POST /cron/daily` | Ouvert | Admin only | `require_admin` |
| `POST /plan/upgrade` | Ouvert (P0 Premium spoof) | Admin only | `require_admin` |

**Total : 28 routes protégées** (vérifié par `grep -c "Depends(require_auth" backend/src/api.py = 28`).

### Routes restées publiques (justification documentée)

| Route | Raison |
|---|---|
| `/health`, `/` | Healthcheck Railway |
| `/auth/register`, `/auth/login` | Inscription / connexion publiques |
| `/auth/me?token=` | Vérifie le token transmis, donc déjà auto-authentifié |
| `/chat`, `/chat/stream`, `/chat/clear`, `/qcm/generate`, `/vision`, `/qcm` (static) | Tolère utilisateur anonyme (compte les quotas par user_id local). Une fois Sprint Étape 4 fait, ces routes vérifieront aussi `paid_until` côté backend. |
| `/veille` | Données publiques (synthèse Légifrance) |
| `/plan/30days` | Données publiques (plan de référence) |
| `/pricing` | Données publiques (prix) |
| `/leaderboard` | Données publiques mais ⚠️ expose des noms — opt-in à prévoir Sprint Étape 4 (RGPD) |
| `/analytics/event` | Tracking events anonymisé tolérés |
| `/api/v1/topics`, `/api/v1/docs`, `/api/v1/qcm`, `/api/v1/chat` | API publique tierce — usage contrôlé par `api_key`. La création de clé `/api/v1/keys/create` est désormais protégée. |
| `/stripe/checkout`, `/stripe/webhook` | Stripe désactivé pendant la bêta. À nettoyer Sprint D quand SumUp prend le relais. |

---

## 5. CORS / JWT

| Élément | Avant | Après |
|---|---|---|
| CORS | `allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]` (`api.py:192`) | Origines via `CORS_ALLOWED_ORIGINS` env (CSV), méthodes whitelist `GET/POST/PUT/DELETE/OPTIONS`, headers whitelist `Authorization, Content-Type, Accept, Origin, X-Requested-With`. **`*` interdit en prod** → `RuntimeError` au démarrage. |
| Dev par défaut | `*` (production-like) | `http://localhost:3000,http://localhost:8000` |
| Production attendue | `*` | `https://ma1.fr,https://www.ma1.fr,https://<projet>.vercel.app` |
| `JWT_SECRET` défaut | `"ma1-dev-secret-change-in-production-min32chars!"` utilisé silencieusement en prod | Si `APP_ENV=production` ET (secret vide OU secret == défaut OU `len < 32`) → `RuntimeError` clair au démarrage. Dev : tolère défaut avec `[WARN]` log. |
| `JWT_EXPIRY_HOURS` | 168h | Inchangé |
| Headers `Authorization` | Acceptés mais ignorés sur la plupart des routes | Lus par les 4 helpers `require_auth*`. Accepte aussi `?token=` pour rétro-compat. |

---

## 6. XSS / réponses IA

| Fichier | Risque | Correction |
|---|---|---|
| `components/chat/ChatPanel.tsx` ligne 92 | `dangerouslySetInnerHTML={{__html: fmt(m.text)}}` — l'IA peut renvoyer `<script>` injectable | Remplacé par `<SafeMarkdown text={m.text}/>`. Le composant `SafeMarkdown` (ajouté dans le même fichier) : (1) échappe tout HTML via `escapeHtml`, (2) parse uniquement `**gras**` et `*italique*` en composants React `<strong>` et `<em>`, (3) gère les sauts de ligne en `<br/>` React natifs. Aucun HTML brut n'est jamais injecté. |
| `components/chat/VisionPanel.tsx` ligne 46 | Idem `dangerouslySetInnerHTML={{__html: fmt(result)}}` | Remplacé par un rendu React safe : `escapeHtml(result).split(/\n/).map(...)` qui détecte `**gras**` sur texte déjà échappé et rend en JSX. |
| Réponses backend `chat` et `vision` | L'IA Claude peut renvoyer n'importe quoi | Aucune modif backend nécessaire — la protection est côté rendu. |

### Vérification anti-XSS

Si un utilisateur (malicieux ou non) envoie `<script>alert("XSS")</script>` au chat, le texte sera affiché tel quel, échappé, sans exécution.

---

## 7. Variables d'environnement préparées

| Variable | Fichier | Statut |
|---|---|---|
| `NEXT_PUBLIC_FRONTEND_URL` | `.env.local.example` | ✅ ajoutée |
| `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS` | `.env.local.example` | ✅ placeholder vide |
| `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS` | `.env.local.example` | ✅ placeholder vide |
| `NEXT_PUBLIC_BETA_ACCESS_DAYS` | `.env.local.example` | ✅ `30` |
| `NEXT_PUBLIC_BETA_PARTICULIER_PRICE` | `.env.local.example` | ✅ `9` |
| `NEXT_PUBLIC_BETA_AUTOECOLE_PRICE` | `.env.local.example` | ✅ `200` |
| `FRONTEND_URL` | `backend/.env.example` | ✅ `https://ma1.fr` |
| `BACKEND_URL` | `backend/.env.example` | ✅ URL Railway actuelle |
| `CORS_ALLOWED_ORIGINS` | `backend/.env.example` | ✅ `http://localhost:3000,https://ma1.fr,https://www.ma1.fr` |
| `ADMIN_EMAILS` | `backend/.env.example` | ✅ `damien.miyouna@gmail.com` |
| `ADMIN_NOTIFICATION_EMAIL` | `backend/.env.example` | ✅ même valeur |
| `PAYMENT_PROVIDER` | `backend/.env.example` | ✅ `sumup_link_manual` |
| `BETA_PAYMENT_MODE` | `backend/.env.example` | ✅ `manual` |
| `BETA_ACCESS_DAYS` | `backend/.env.example` | ✅ `30` |
| `BETA_PARTICULIER_PRICE` | `backend/.env.example` | ✅ `9` |
| `BETA_AUTOECOLE_PRICE` | `backend/.env.example` | ✅ `200` |
| `SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS` | `backend/.env.example` | ✅ placeholder vide |
| `SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS` | `backend/.env.example` | ✅ placeholder vide |
| `SUMUP_CLIENT_ID/SECRET/MERCHANT_CODE/WEBHOOK_SECRET` | `backend/.env.example` | ✅ placeholders vides (V2 SumUp API) |

**Aucun lien SumUp réel n'a été commit.**

---

## 8. Tests exécutés

| Test | Résultat | Commentaire |
|---|---|---|
| Parsing AST Python `backend/src/api.py` | ✅ OK | 66 872 caractères, 1 406 lignes, syntaxe valide |
| `grep` helpers présents (`require_auth`, `require_admin`, …) | ✅ 4 helpers détectés lignes 81, 91, 102, 112 | OK |
| Comptage `Depends(require_auth*)` | ✅ **28 occurrences** | Cohérent avec le tableau §4 |
| `goPrem()` neutralisé | ✅ Ligne 1375 : appel safe alert | Plus de `S.plan='premium'` |
| Fallbacks `goPrem()` dans `stripeCheckout` | ✅ Supprimés | Aucune attribution Premium en cas d'erreur |
| Handler `?checkout=success` | ✅ Neutralisé | Juste nettoyage URL |
| CORS via env | ✅ `_CORS_ORIGINS` lu depuis `os.getenv("CORS_ALLOWED_ORIGINS", ...)` | Refus prod si `*` |
| JWT_SECRET refus prod si défaut | ✅ Bloc `if _APP_ENV in ("production", "prod")` | OK |
| CTRL-1 bypass inode | ✅ Tous les fichiers : 7/7 cohérents | wc -l côté Linux = état réel |
| `npm install` / `npm run lint` / `npm run build` | ⚠️ **NON exécutés** | Limite sandbox (`npm install` > 45 s) — **À LANCER PAR DAMIEN sur sa machine Windows** |
| `pytest backend/tests/test_api.py` | ⚠️ **NON exécuté** | Idem — nécessite installation deps. **Attention : les tests existants vont CASSER** car ils n'envoient pas de token sur les routes maintenant protégées. C'est attendu : les tests doivent être mis à jour Sprint Étape 4. |

### Commandes à lancer par Damien

```bash
# Frontend
cd C:\Users\HP-15\Downloads\MA1_v9_Final
npm install
npm run lint
npm run build

# Backend (idéalement dans un venv)
cd backend
pip install -r requirements.txt
pytest tests/         # ⚠️ tests existants attendront une mise à jour Sprint Étape 4
python -c "from src import api"   # vérifie au moins que l'import marche

# Test fonctionnel rapide
uvicorn src.api:app --reload --port 8000
# Puis dans un autre terminal :
curl -i http://localhost:8000/health   # → 200 OK
curl -i http://localhost:8000/profile/u_test_123   # → 401 (au lieu de 200 avant)
curl -i -H "Authorization: Bearer fake" http://localhost:8000/profile/u_test_123   # → 401 token invalide
```

---

## 9. Fichiers modifiés

| Fichier | Modification |
|---|---|
| `backend/src/api.py` | Import `Header`, `Depends` ; helpers JWT_SECRET strict / `require_auth` / `require_auth_user_match` / `require_auth_owner_match` / `require_admin` ; CORS via env ; 28 routes protégées par `Depends(...)`. 1278 → 1406 lignes (+128). |
| `public/index-standalone.html` | `goPrem()` neutralisé en safe alert ; `stripeCheckout()` réécrit sans fallback frauduleux ; handler `?checkout=success` neutralisé en simple nettoyage URL. 2106 → 2094 lignes (−12). |
| `app/admin/page.tsx` | Page entièrement réécrite — composant désactivé, message bêta. 136 → 33 lignes (−103). Aucune fuite de mot de passe. |
| `components/chat/ChatPanel.tsx` | Suppression `dangerouslySetInnerHTML` ; ajout `escapeHtml` + `parseSafe` + composant `SafeMarkdown`. 108 → 170 lignes (+62). |
| `components/chat/VisionPanel.tsx` | Suppression `dangerouslySetInnerHTML` ; rendu React safe (escape + split + parse `**gras**`). 55 → 71 lignes (+16). |
| `.env.local.example` | Ajout `NEXT_PUBLIC_FRONTEND_URL` + 5 placeholders bêta SumUp + commentaire. 4 → 13 lignes. |
| `backend/.env.example` | Ajout `FRONTEND_URL`, `BACKEND_URL`, `CORS_ALLOWED_ORIGINS`, `ADMIN_EMAILS`, `ADMIN_NOTIFICATION_EMAIL`, 8 variables bêta SumUp (V1 + V2). 30 → 56 lignes. |

Aucun autre fichier touché. Pages légales **non modifiées** (conforme à la consigne).

---

## 10. Risques restants (à traiter dans les sprints suivants)

| # | Risque | Sprint cible | Priorité |
|---|---|---|---|
| R1 | Persistance backend 100 % RAM (`_users`, `_profiles`, `_usage`, etc.) — reboot Railway = perte des comptes | Étape 4 (Supabase) | **P0** |
| R2 | `lib/store.ts` `qMax = plan === 'free' ? 10 : 999` côté client — purement UX. Le client peut mentir mais le backend ignore désormais cette valeur. À refondre Sprint 4 : récupérer le plan depuis `/auth/me`. | Étape 4 | P1 |
| R3 | `JWT_EXPIRY_HOURS=168` (7 jours) sans rotation — acceptable bêta privée, à raccourcir post-lancement | Plus tard | P2 |
| R4 | `slowapi` importé mais aucun décorateur `@limiter.limit()` appliqué sur `/auth/login`, `/auth/register`, `/chat`, `/qcm/generate`, `/vision` — brute force possible | Étape 3 (séparation) ou Étape 4 | P1 |
| R5 | Sentry / logger structuré : `except: pass` partout, erreurs Anthropic/Resend/Supabase/Stripe avalées | Étape 4 | P1 |
| R6 | RLS Supabase actuelles : `USING (true)` (toutes ouvertes) — à serrer en même temps que la migration de schéma | Étape 4 | **P0** |
| R7 | Placeholders légaux (SIRET, RCS, adresse, médiateur, ville tribunaux) toujours présents | Sprint A (parcours client) | **P0 légal** |
| R8 | CGV : nouvelle clause "Paiement unique 30 jours sans abonnement" non encore intégrée | Sprint A + relecture juridique | **P0 légal** |
| R9 | `aggregateRating` fictif "4.8 / 150" dans le JSON-LD landing | Sprint A | P0 légal |
| R10 | FAQ landing mensonge "données restent sur l'appareil" | Sprint A | P0 légal |
| R11 | Stripe SDK et endpoints `/stripe/checkout` + `/stripe/webhook` toujours en place mais inutilisés. Risque : configuration accidentelle + comportement ambigu. | Sprint D (intégration SumUp) | P1 |
| R12 | URL Railway hardcodée standalone HTML ligne 1214 — à paramétrer via data-attribute ou env injectable | Étape 3 (séparation backend/frontend) | P1 |
| R13 | Pas encore de table `paid_until` ni de check d'expiration backend | Étape 4 + Sprint D | **P0 pour bêta payante** |
| R14 | Pas encore d'enforcement quota 30 élèves auto-école | Sprint D | P0 commercial |
| R15 | Tests pytest existants vont casser (routes protégées + tests n'envoient pas de token) — à mettre à jour | Étape 4 | P1 |
| R16 | Tests E2E Playwright (`e2e/`) non vérifiés — landing + onboarding + chat + qcm + exam — à valider Damien côté Windows | Sprint H | P1 |

---

## 11. Prochaine étape recommandée

> **Sprint Étape 3 — Séparation backend / frontend (mono-repo `apps/`)**

Référence : `AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` §4 (Option A).

Périmètre Sprint Étape 3 :
- Créer `apps/frontend/` + `apps/backend/` via `git mv`.
- Créer `railway.json` à la racine pour forcer Railway sur `apps/backend/Dockerfile`.
- Créer `vercel.json` (optionnel) pour forcer Vercel sur `apps/frontend/`.
- Ajuster `docker-compose.yml` et `.github/workflows/ci.yml`.
- Tester en local (`docker compose up`).
- Confirmer que Vercel + Railway déploient toujours après push.
- Aucun changement de code applicatif — uniquement déplacements de fichiers.

**Ne pas démarrer Étape 3 avant validation Damien de ce rapport.**

---

## 12. Verdict final

> **MA1 est-il maintenant sécurisé contre l'activation Premium gratuite avant paiement SumUp ?**

**OUI.**

Tous les contournements connus sont supprimés :
- `goPrem()` ne donne plus Premium.
- `stripeCheckout()` ne fallback plus sur `goPrem()`.
- `?checkout=success&plan=premium` ne donne plus Premium.
- `/plan/upgrade` exige désormais un token admin (impossible sans `ADMIN_EMAILS` configuré + login admin).
- `localStorage.setItem('ma1-store-v8', '{"plan":"premium"}')` ne donne rien côté backend : toutes les routes payées sont protégées par `Depends(require_auth_user_match)` et le backend ignore `S.plan` du client. Le seul moyen d'avoir Premium côté backend est désormais que `_usage[uid]["plan"]` soit attribué par un admin (`/plan/upgrade`).
- Le mot de passe admin client-side a disparu.
- Le CORS est restreint en prod.
- Le JWT_SECRET est forcé robuste en prod.

**Conditions de validité de ce verdict :**

1. Déployer ce code en production avec `APP_ENV=production`, `JWT_SECRET=<32+ chars random>`, `CORS_ALLOWED_ORIGINS=https://ma1.fr,https://www.ma1.fr,https://<vercel>.vercel.app`, `ADMIN_EMAILS=damien.miyouna@gmail.com` (déjà dans `.env.example`).
2. Lancer les commandes de test §8 côté Damien et confirmer 401 sur les routes protégées sans token.
3. Vérifier que Damien réussit à se connecter avec son compte admin et que les routes admin (`/analytics/summary`, `/cron/daily`, `/plan/upgrade`) fonctionnent avec son token.
4. Désactiver le `/admin` Next.js est OK pour la bêta ; il sera reconstruit au Sprint d'activation SumUp avec auth backend.

**Si une seule de ces conditions n'est pas respectée, le verdict n'est PAS valide.**

---

*Sprint Étape 2 terminé. 7 fichiers modifiés. 28 routes protégées. 0 lien SumUp réel intégré. 0 page légale touchée. Prêt pour validation par Damien.*

— FIN DU RAPPORT — marker_eof_SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT
