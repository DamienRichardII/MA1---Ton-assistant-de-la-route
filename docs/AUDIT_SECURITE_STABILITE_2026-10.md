# Audit sécurité & stabilité MA1 — octobre 2026

## Secrets / données sensibles exposés
- Dépôt + historique git + bundle front : **aucun secret** (clés Stripe/Anthropic/SumUp/Supabase service absentes). `.env*` ignorés.
- Seules variables `NEXT_PUBLIC_*` : URLs publiques. OK.

## Critique
1. **Base Supabase lisible avec la clé anon** (vérifié : `SET ROLE anon` renvoie 6 lignes dans `users`, `profiles`, `admin_users_view`).
   - Policies `Users read own` / `Profiles read own` en `USING (true)`.
   - `users` contient `email`, `password_hash`, `birth_date` ; `admin_users_view` est SECURITY DEFINER.
   - Correctif prêt : `apps/backend/scripts/018_lockdown_public_access.sql` (le backend utilise service_role, pas d'impact).

## Élevé
2. Routes IA non authentifiées (`/chat`, `/vision`…) sans limitation de débit : risque de coût Anthropic. `slowapi` présent mais non appliqué.
3. Jeton de session passé en query string (`/auth/me`) : fuite dans les logs d'accès → passer en en-tête `Authorization`.
4. Admin : mot de passe par défaut indiqué en indice ("Flash") → vérifier/changer, ajouter verrouillage après échecs.

## Moyen
5. `start.sh` lance `uvicorn --reload` en production → retirer.
6. États en mémoire (`_users`, caches) : perdus au redéploiement (hydratation Supabase en place pour les comptes) ; croissance mémoire non bornée.
7. `app/veille` / `index-standalone.html` : sinks `innerHTML` à assainir.
8. 11 tables RLS sans policy (INFO, voulu : accès service_role) ; région Railway ≠ Supabase (latence).
9. CI rouge : 11 tests `tests/test_api.py` périmés ; `npm run lint` non configuré.

## Stabilité (production)
- Railway 1 h : 43 requêtes, **0 erreur 5xx**, CPU ~0,5 %, RAM ~150 Mo : sain.
- Paiement : webhook non cru (checkout re-vérifié), idempotence, réconciliation + cron : robuste.

## Actions utilisateur
- Faire pivoter `CRON_SECRET` (collé dans PowerShell) ; planifier la rotation si la clé anon a été partagée.

## Correctifs appliqués (branche claude/hopeful-johnson-vlfiqt)
- Limitation de débit par IP (`src/security.py`) sur /chat, /chat/stream, /vision, /qcm/generate, /test/positionnement, inscription, connexion, admin login/forgot ; verrouillage après échecs (utilisateur 8, admin 5 / 15 min) ; message chat limité à 4000 car., historique à 40.
- `/auth/me` lit `Authorization: Bearer` (le `?token=` reste toléré pour anciens clients) ; front et standalone migrés.
- `start.sh` : `--reload` retiré. Conversations en mémoire bornées à 5000.
- XSS : échappement HTML (veille, classement, dashboard moniteur, messages du chat standalone).
- Tests `test_api.py` réparés (63 tests verts). `018_lockdown_public_access.sql` : à exécuter dans l'éditeur SQL Supabase.
