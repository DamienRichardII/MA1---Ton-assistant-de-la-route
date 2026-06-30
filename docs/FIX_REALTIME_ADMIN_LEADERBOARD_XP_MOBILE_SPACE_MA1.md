# FIX PRIORITAIRE — Présence, XP stable, classement réel, espace joueur mobile, email — MA1

Branche `feat/sprint-admin-emails-support-reporting`. Correction **complémentaire** rebasée sur l'état distant actuel (les `/admin/users`, `/admin/activity`, `recent-signups/errors` déjà présents ne sont **pas** dupliqués).

## 1. Diagnostic

**Cause racine unique : le backend écrivait dans Supabase avec la clé ANON.** `api.py` faisait `SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")`. Or `user_sessions`, `users`, `profiles`, `qcm_attempts`, `exam_attempts` ont **RLS activé** avec policies `user_id = jwt.sub`. Le client anon côté serveur n'a aucun contexte JWT → **toutes les écritures sont refusées** :
- `POST /presence/heartbeat` → upsert `user_sessions` échoue → **`ok=False`** (exactement le log observé).
- Inscription → INSERT `users` bloqué (et `password_hash` NOT NULL était omis) → **0 compte dans l'admin**.
- QCM → `profiles`/`qcm_attempts` non écrits → **admin et classement à 0**.
- Header 20 XP : valeur locale (localStorage) jamais resynchronisée → **header ≠ classement**.

## 2. Présence

Table `user_sessions` (+ `current_module` via migration `015`). Correctif : backend en **clé service_role** (bypass RLS) → upsert réussit ; `record_heartbeat()` logge l'erreur réelle en cas d'échec. `POST /presence/heartbeat` accepte `current_module`. Actif = `last_seen_at > now() - 5 min`. Preuve attendue : `[PRESENCE] heartbeat … module=qcm ok=True`.

## 3. Utilisateurs admin

Source : `users` + `profiles` (vue `admin_users_view` migration `015`, fallback intégré). Inscription corrigée : `users` upserté avec `password_hash` + `birth_date`, ligne `profiles` créée, erreurs loggées. Endpoints `/admin/users` / `/admin/activity` déjà en place (autre session) — débloqués par la clé service_role.

## 4. XP

Source de vérité : table `xp_events` (recalculable) + total `profiles.xp` (`xp_service.py`). Règles : compte +5 (1×), connexion quotidienne +2 (1×/j), bonne réponse QCM +2, examen terminé +25, réussi +50, assistant +1 (≤10/j). Anti-farming via `DAILY_CAPS` ; types sensibles server-only ; `POST /xp/event` limité à `assistant_useful`. `sb_upsert_profile` corrigé (whitelist colonnes, n'écrase plus `xp`). Logs `[XP] event created`, `[XP] total updated`.

## 5. Classement

`GET /leaderboard` lit Supabase (`public_leaderboard`, fallback mémoire), **sans email** (mais `user_id` opaque + `streak` pour le surlignage « vous »). `LeaderboardPanel` : auto-refresh 30 s ajouté. Header synchronisé sur le XP Supabase via `/user/stats` (restauration de session + chaque heartbeat ≈45 s) → header = classement = admin.

## 6. Espace joueur mobile

Route `/me` (`app/me/page.tsx`) mobile-first. Menu header (clic sur le nom) : Mon espace / Mes statistiques / Mon classement / Support / Déconnexion. Données : XP, niveau, rang, progression, QCM, taux de réussite, thèmes forts/à retravailler, examens, série. État vide : « Commence un QCM… ». Heartbeat discret via `PresenceTracker` (monté dans `layout.tsx`, 45 s, connecté uniquement, module dérivé de l'URL). Endpoints `/user/me|stats|rank|theme-stats|activity|xp-events`.

## 7. Email

Logo MA1 (`MA1_LOGO_URL`, défaut `https://ma1.fr/ma1-logo.jpeg`) + fallback `alt`. DA bleu nuit/cyan conservée. `from = MA1 <contact@ma1.fr>`, `reply_to = contact@ma1.fr` inchangés.

## ⚠ Déploiement OBLIGATOIRE

1. **Railway** : définir `SUPABASE_SERVICE_KEY` (clé service_role). **Sans elle, RLS bloque toujours les écritures.** Log de démarrage : `clé=service_role` vs `ANON ⚠`.
2. **Supabase** : appliquer `apps/backend/scripts/015_create_xp_events.sql` (idempotent).

## 8. Tests

Backend : `/health`, `POST /presence/heartbeat` (→ ok=True), `/leaderboard`, `/admin/kpis`, `/admin/users`, `/admin/realtime`, `/user/stats`. Frontend : `npm run build`. Manuels : compte → email → connexion → heartbeat ok=True → compte visible admin → online=1 → XP cohérents (header/classement/admin/espace) → QCM → XP↑ → classement à jour → mobile : tap nom → Mon espace.

## 9. Fichiers modifiés

Backend : `api.py`, `presence_service.py`, `reporting_service.py`, `email_templates.py`, **`xp_service.py`** (nouveau), **`scripts/015_create_xp_events.sql`** (nouveau).
Frontend : `lib/api.ts`, `lib/store.ts`, `components/ui/Header.tsx`, `app/layout.tsx`, `components/gamification/LeaderboardPanel.tsx`, **`app/me/page.tsx`** (nouveau), **`components/ui/PresenceTracker.tsx`** (nouveau).

## Vérifications dans l'environnement

- `pytest` : 13 passés, 11 échecs pré-existants (= baseline) → **0 régression**.
- Smoke auth : `/user/*`, `/leaderboard`, `/xp/event` (200 ; type interdit 400), `/admin/users` (200, non dupliqué) ; sans token 401.
- Email : logo + fallback + `from` validés.
- Frontend : transpilation TSX/JSX OK (esbuild). Build Next.js complet à lancer en CI/Vercel.
