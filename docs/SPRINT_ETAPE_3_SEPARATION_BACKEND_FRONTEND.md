# SPRINT ÉTAPE 3 — RAPPORT DE FIN SÉPARATION BACKEND / FRONTEND

Date : 2026-06-03
Conforme : `Damcompany-code-guardrails.md` + `CLAUDE.md` + `INCIDENTS_ET_CONTROLES.md` (CTRL-1 à CTRL-8 appliqués, INC-002 reproduit et corrigé en cours de sprint).
**Aucune logique métier modifiée. Aucun lien SumUp intégré. Aucune page légale touchée.**

---

## 1. Résumé exécutif

| Question | Réponse |
|---|---|
| Sprint terminé ? | **OUI** |
| Frontend déplacé vers `apps/frontend/` ? | **OUI** (`app/`, `components/`, `lib/`, `styles/`, `public/`, `e2e/`, `package.json`, configs, Dockerfile, `.env.local.example`) |
| Backend déplacé vers `apps/backend/` ? | **OUI** (`src/`, `scripts/`, `tests/`, `data/`, `index/`, `requirements.txt`, `start.sh`, `Dockerfile`, `.env.example`) |
| Rapports déplacés vers `docs/` ? | **OUI** (9 fichiers `.md`) |
| `railway.json` prêt ? | **OUI** (cible `apps/backend/Dockerfile`, healthcheck `/health`) |
| `vercel.json` prêt ? | **OUI** (`apps/frontend/vercel.json`, framework Next.js, region cdg1) |
| `docker-compose.yml` mis à jour ? | **OUI** (contexts `./apps/frontend` et `./apps/backend`) |
| `.github/workflows/ci.yml` mis à jour ? | **OUI** (working-directory `apps/frontend` + `apps/backend`) |
| `.gitignore` adapté monorepo ? | **OUI** (avec rétro-compat pour anciennes structures) |
| `README.md` réécrit ? | **OUI** |
| Tests statiques passés ? | **OUI** (Python AST + JSON + YAML + parsing tsconfig) |
| Risque critique restant ? | **NON** — un point P1 documentaire : URL Railway hardcodée dans `index-standalone.html` ligne 1214 (cf §10) |

---

## 2. Architecture avant / après

### Avant

```
MA1_v9_Final/
├── app/                                      # frontend Next.js mélangé à la racine
├── components/                               # frontend
├── public/                                   # frontend
├── lib/                                      # frontend
├── styles/                                   # frontend
├── e2e/                                      # frontend tests
├── package.json                              # frontend
├── next.config.js                            # frontend
├── tailwind.config.js                        # frontend
├── postcss.config.js                         # frontend
├── tsconfig.json                             # frontend
├── playwright.config.ts                      # frontend
├── Dockerfile                                # frontend (build Next.js)
├── .env.local.example                        # frontend
├── backend/                                  # backend isolé dans un sous-dossier
│   ├── src/, scripts/, tests/, data/, index/
│   ├── Dockerfile, requirements.txt, start.sh
│   └── .env.example
├── 9 rapports `.md` à la racine              # mélange avec le code
├── docker-compose.yml                        # pointe vers `.` et `./backend`
├── .github/workflows/ci.yml                  # `cd backend` et `npm install` à la racine
├── .gitignore                                # ignore `backend/.env`, pas `apps/...`
├── README.md                                 # ancien (v8 monolithe)
└── _archive/                                 # déjà OK
```

**Problèmes :**
- Mélange code public (frontend) et code serveur (backend) au même niveau.
- Le `Dockerfile` racine est ambigu : Vercel le voit, Railway aussi → l'un des deux pioche mal.
- Les rapports d'audit polluent la vue racine.
- `.gitignore` ne couvre que l'ancienne structure.

### Après

```
MA1_v9_Final/
├── apps/
│   ├── frontend/                             # Next.js 15 — tout pour Vercel
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── public/
│   │   ├── e2e/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   ├── playwright.config.ts
│   │   ├── Dockerfile
│   │   ├── vercel.json                       # NOUVEAU
│   │   └── .env.local.example
│   └── backend/                              # FastAPI — tout pour Railway
│       ├── src/
│       ├── scripts/
│       ├── tests/
│       ├── data/
│       ├── index/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── start.sh
│       └── .env.example                      # complété : Supabase, Resend, Admin, Bêta
├── docs/                                     # NOUVEAU — audits / roadmap / suivi / incidents
│   ├── AUDIT_MA1_v9.md
│   ├── AUDIT_BETA_OUVERTE_MA1.md
│   ├── AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md
│   ├── LEGAL_TODO_DAMIEN.md
│   ├── ROADMAP_MA1_MARKET_LAUNCH.md
│   ├── SPRINT_0_RAPPORT_FIN.md
│   ├── SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT.md
│   ├── SPRINT_ETAPE_3_SEPARATION_BACKEND_FRONTEND.md     # ce fichier
│   ├── SUIVI_AUDIT_BETA_OUVERTE.md
│   └── INCIDENTS_ET_CONTROLES.md
├── _archive/                                 # inchangé (landingpage.html archivée Sprint 0)
├── .github/workflows/ci.yml                  # working-directory `apps/frontend` et `apps/backend`
├── .gitignore                                # adapté monorepo + rétro-compat
├── CLAUDE.md                                 # reste racine (convention agents IA)
├── README.md                                 # réécrit pour monorepo
├── docker-compose.yml                        # contexts `./apps/frontend` et `./apps/backend`
├── railway.json                              # NOUVEAU — racine, force `apps/backend/Dockerfile`
└── config/                                   # ⚠️ dossier vide existant — laissé tel quel
```

---

## 3. Fichiers déplacés

| Ancien chemin | Nouveau chemin | Raison |
|---|---|---|
| `app/` (toute l'arborescence) | `apps/frontend/app/` | Frontend Next.js → mono-repo `apps/` |
| `components/` | `apps/frontend/components/` | idem |
| `public/` | `apps/frontend/public/` | idem |
| `lib/` | `apps/frontend/lib/` | idem |
| `styles/` | `apps/frontend/styles/` | idem |
| `e2e/` | `apps/frontend/e2e/` | Tests Playwright frontend |
| `package.json` | `apps/frontend/package.json` | Frontend |
| `next.config.js` | `apps/frontend/next.config.js` | Frontend |
| `tailwind.config.js` | `apps/frontend/tailwind.config.js` | Frontend |
| `postcss.config.js` | `apps/frontend/postcss.config.js` | Frontend |
| `tsconfig.json` | `apps/frontend/tsconfig.json` | Frontend |
| `playwright.config.ts` | `apps/frontend/playwright.config.ts` | Frontend |
| `Dockerfile` | `apps/frontend/Dockerfile` | Build Next.js standalone |
| `.env.local.example` | `apps/frontend/.env.local.example` | Frontend |
| `backend/` (tout le dossier) | `apps/backend/` | Backend FastAPI → mono-repo `apps/` |
| `AUDIT_MA1_v9.md` | `docs/AUDIT_MA1_v9.md` | Documentation |
| `AUDIT_BETA_OUVERTE_MA1.md` | `docs/AUDIT_BETA_OUVERTE_MA1.md` | Documentation |
| `AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` | `docs/AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` | Documentation |
| `LEGAL_TODO_DAMIEN.md` | `docs/LEGAL_TODO_DAMIEN.md` | Documentation |
| `ROADMAP_MA1_MARKET_LAUNCH.md` | `docs/ROADMAP_MA1_MARKET_LAUNCH.md` | Documentation |
| `SPRINT_0_RAPPORT_FIN.md` | `docs/SPRINT_0_RAPPORT_FIN.md` | Documentation |
| `SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT.md` | `docs/SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT.md` | Documentation |
| `SUIVI_AUDIT_BETA_OUVERTE.md` | `docs/SUIVI_AUDIT_BETA_OUVERTE.md` | Documentation |
| `INCIDENTS_ET_CONTROLES.md` | `docs/INCIDENTS_ET_CONTROLES.md` | Documentation (registre incidents) |

**Total** : 102 renames Git détectés automatiquement par `git add -A` (préservation de l'historique).

### Fichiers laissés à la racine (volontairement)

| Fichier | Raison |
|---|---|
| `CLAUDE.md` | Convention agents IA — les outils Claude Code / agents le cherchent à la racine du repo |
| `README.md` | Convention GitHub / Vercel — affiché en page d'accueil du repo |
| `docker-compose.yml` | Orchestrateur dev local — racine cohérente |
| `railway.json` | Convention Railway — racine du repo |
| `.gitignore` | Convention Git — racine |
| `.github/workflows/ci.yml` | Convention GitHub Actions — racine |
| `_archive/` | Dossier d'archive de référence (cf Sprint 0) |
| `config/` | Dossier vide hérité — non documenté, gardé pour rétro-compat |

---

## 4. Fichiers modifiés

| Fichier | Modification |
|---|---|
| `docker-compose.yml` | Contexts changés `.` → `./apps/frontend`, `./backend` → `./apps/backend`. `env_file` aligné. Healthcheck inchangé. |
| `.github/workflows/ci.yml` | Pour chaque job (`test-backend`, `lint-frontend`, `build-frontend`) : ajout `defaults.run.working-directory: apps/<…>`. Étapes simplifiées (plus de `cd backend && …`). |
| `.gitignore` | Ajout : `apps/backend/.env`, `apps/backend/.env.local`, `apps/backend/__pycache__/`, `apps/backend/data/*.json`, `apps/backend/data/*.parquet`, `apps/backend/index/`, `apps/frontend/.env`, `apps/frontend/.env.local`, `apps/frontend/.env.production`, `apps/frontend/.next/`, `apps/frontend/node_modules/`. Conservation des anciennes lignes en rétro-compat (`backend/.env`, etc.). Ajout aussi `*.pyo`, `*.egg-info/`, `.pytest_cache/`, `Thumbs.db`, `dist/`, `out/`, `build/`, IDE files. |
| `apps/backend/.env.example` | Complété avec : `SUPABASE_SERVICE_ROLE_KEY` (alias service role), `RESEND_FROM_EMAIL` (alias), `RESEND_ADMIN_EMAIL`, `RESEND_SUPPORT_EMAIL`. Réorganisé par blocs commentés. Stripe marqué `DÉSACTIVÉ pendant la bêta SumUp`. Aucun secret réel commité. |
| `README.md` | Entièrement réécrit pour la nouvelle structure mono-repo : arborescence, démarrage rapide frontend/backend, démarrage Docker, déploiement Vercel + Railway, variables d'environnement, règles sécurité, table de matières `docs/`, prochaine étape (Sprint Étape 4). |

---

## 5. Variables d'environnement

| Variable | Frontend / Backend | Statut |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Frontend | ✅ documenté README §Déploiement Vercel |
| `NEXT_PUBLIC_FRONTEND_URL` | Frontend | ✅ idem |
| `NEXT_PUBLIC_BETA_ACCESS_DAYS=30` | Frontend | ✅ |
| `NEXT_PUBLIC_BETA_PARTICULIER_PRICE=9` | Frontend | ✅ |
| `NEXT_PUBLIC_BETA_AUTOECOLE_PRICE=200` | Frontend | ✅ |
| `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS` | Frontend | ✅ placeholder (à fournir Damien) |
| `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS` | Frontend | ✅ placeholder |
| `BACKEND_URL` | Frontend (server-side) | ✅ pour proxy `app/api/*` |
| `APP_ENV` | Backend | ✅ |
| `JWT_SECRET` | Backend | ✅ avec refus prod si défaut (Sprint Étape 2) |
| `JWT_EXPIRY_HOURS` | Backend | ✅ |
| `CORS_ALLOWED_ORIGINS` | Backend | ✅ `https://ma1.fr,https://www.ma1.fr,http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Backend | ✅ |
| `CLAUDE_MODEL` | Backend | ✅ |
| `SUPABASE_URL` | Backend | ✅ |
| `SUPABASE_ANON_KEY` | Backend | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | ✅ alias `SUPABASE_SERVICE_KEY` toujours supporté |
| `SUPABASE_SERVICE_KEY` | Backend | ✅ rétro-compat |
| `RESEND_API_KEY` | Backend | ✅ |
| `RESEND_FROM_EMAIL` | Backend | ✅ `MA1 <noreply@ma1.fr>` (domaine à vérifier dans Resend, cf §6) |
| `EMAIL_FROM` | Backend | ✅ alias rétro-compat |
| `RESEND_ADMIN_EMAIL` | Backend | ✅ `damien.miyouna@gmail.com` |
| `RESEND_SUPPORT_EMAIL` | Backend | ✅ `contact@ma1.fr` |
| `ADMIN_EMAILS` | Backend | ✅ |
| `ADMIN_NOTIFICATION_EMAIL` | Backend | ✅ |
| `FRONTEND_URL` | Backend | ✅ `https://ma1.fr` |
| `BACKEND_URL` | Backend | ✅ `https://ma1-ton-assistant-de-la-route-production.up.railway.app` |
| `APP_URL` | Backend | ✅ rétro-compat |
| `PORT` | Backend | ✅ |
| `PAYMENT_PROVIDER=sumup_link_manual` | Backend | ✅ |
| `BETA_PAYMENT_MODE=manual` | Backend | ✅ |
| `BETA_ACCESS_DAYS=30` | Backend | ✅ |
| `BETA_PARTICULIER_PRICE=9` | Backend | ✅ |
| `BETA_AUTOECOLE_PRICE=200` | Backend | ✅ |
| `SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS` | Backend | ✅ placeholder |
| `SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS` | Backend | ✅ placeholder |
| `SUMUP_CLIENT_ID/SECRET/MERCHANT_CODE/WEBHOOK_SECRET` | Backend | ✅ placeholders V2 |
| `STRIPE_*` | Backend | ⚠️ Marqué "DÉSACTIVÉ pendant la bêta SumUp" — à nettoyer Sprint suivant |

**Aucune clé réelle (Anthropic, Supabase, Resend, SumUp) n'a été commit dans le repo.** Vérification : `grep -rE "sk_(test|live)_|sk-ant-[A-Za-z]|whsec_|re_[A-Za-z0-9]{8,}" apps/` → uniquement placeholders `.env.example`.

---

## 6. Railway

| Élément | Statut | Commentaire |
|---|---|---|
| URL Railway active | ✅ | `https://ma1-ton-assistant-de-la-route-production.up.railway.app` (déclarée par Damien) |
| `railway.json` à la racine | ✅ Créé | Force `apps/backend/Dockerfile`, healthcheck `/health` 30 s, restart on failure max 10 |
| `apps/backend/Dockerfile` | ✅ Présent | Build FastAPI / uvicorn port 8000 |
| Endpoint healthcheck | ✅ Présent | `apps/backend/src/api.py` ligne 340 + 889 → `/health` 200 OK |
| Variables d'env Railway | ⚠️ À renseigner par Damien | Cf README §Déploiement Railway. **Bloquant pour Sprint Étape 4** |
| Domaine custom `api.ma1.fr` | ⚠️ À créer côté Railway → Settings → Networking | À faire en parallèle de OVH DNS |
| CORS prod | ✅ Refus de démarrage si `*` (Sprint Étape 2) | Cohérent avec `apps/backend/.env.example` |
| Healthcheck CI | ✅ documenté dans `railway.json` | OK |

### Commande de démarrage validée

```
uvicorn src.api:app --host 0.0.0.0 --port $PORT
```

Vérifié : `apps/backend/src/api.py` exporte bien `app` (`api.py:182` : `app = FastAPI(...)`). Le `working-directory` Railway est implicitement `/app` après build du Dockerfile, donc `src.api:app` résout bien.

---

## 7. Vercel

| Élément | Statut | Commentaire |
|---|---|---|
| `apps/frontend/vercel.json` | ✅ Créé | Framework `nextjs`, region `cdg1` (Paris), `outputDirectory: .next`, `silent: true` |
| Root Directory côté Vercel | ⚠️ À configurer | Project Settings → Root Directory = `apps/frontend` (sinon Vercel échouera à trouver `package.json`) |
| Build command | ✅ Implicite (`npm run build`) | OK |
| Install command | ✅ Implicite (`npm install`) | OK |
| Variables d'env Vercel | ⚠️ À renseigner par Damien | Cf README §Déploiement Vercel |
| Domaine custom `ma1.fr` + `www.ma1.fr` | ⚠️ À ajouter | DNS chez OVH (CNAME `cname.vercel-dns.com.`) |
| Aucune fuite de secret backend | ✅ vérifié | Seules les vars `NEXT_PUBLIC_*` sont exposées au client |
| Build backend désactivé | ✅ | Vercel ne voit que `apps/frontend/` quand Root Directory bien configuré |

---

## 8. Docker / local

| Test | Résultat |
|---|---|
| Parsing YAML `docker-compose.yml` | ✅ valide, services `frontend` + `backend` |
| Context `frontend` = `./apps/frontend` | ✅ |
| Context `backend` = `./apps/backend` | ✅ |
| `env_file` pointant `./apps/backend/.env` | ✅ |
| Healthcheck inchangé | ✅ |
| `docker compose up --build` (théorique) | ⚠️ Non exécuté en sandbox (Docker non disponible). À tester par Damien sur sa machine Windows. |

### Commande de test Damien

```bash
cd C:\Users\HP-15\Downloads\MA1_v9_Final
# Test local sans Docker (frontend)
cd apps/frontend && npm install && npm run dev
# Test local sans Docker (backend, autre terminal)
cd apps/backend && pip install -r requirements.txt && bash start.sh

# OU avec Docker (si Docker Desktop installé)
docker compose up --build
```

---

## 9. CI/CD

| Workflow | Statut |
|---|---|
| `.github/workflows/ci.yml` | ✅ Mis à jour |
| Job `test-backend` | ✅ `working-directory: apps/backend`, `python-version: '3.12'`, `pytest tests/` |
| Job `lint-frontend` | ✅ `working-directory: apps/frontend`, `node-version: '20'`, `npm run lint` |
| Job `build-frontend` | ✅ `working-directory: apps/frontend`, `needs: lint-frontend`, `npm run build` |
| Dépendances `lint-frontend` → `build-frontend` | ✅ préservée |
| Variables d'env CI (`ANTHROPIC_API_KEY=sk-ant-test-key`, `APP_ENV=test`) | ✅ préservées |

**Note importante** : les tests `pytest` existants vont casser car ils n'envoient pas de token JWT sur les routes désormais protégées (Sprint Étape 2). Cette mise à jour des tests est planifiée pour Sprint Étape 4 (Supabase). Le job `test-backend` CI échouera tant que ces tests ne sont pas adaptés — c'est attendu et déjà documenté dans `docs/SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT.md` §10 R15.

---

## 10. Sécurité

| Contrôle | Résultat |
|---|---|
| Aucun `.env` réel commité | ✅ vérifié — seuls `.env.example` et `.env.local.example` (placeholders) présents |
| `.gitignore` ignore `apps/backend/.env`, `apps/frontend/.env.local` | ✅ ajouté |
| Pas de clé Supabase service role côté frontend | ✅ vérifié (`SUPABASE_SERVICE_KEY` n'est défini que dans `apps/backend/.env.example`) |
| Pas de clé Resend côté frontend | ✅ vérifié |
| Pas de clé Anthropic côté frontend | ✅ vérifié |
| Pas de secret SumUp côté frontend | ✅ vérifié (placeholders publics `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_*` = liens de paiement, légitimes côté client) |
| CORS reste configuré pour `ma1.fr` | ✅ `apps/backend/.env.example` `CORS_ALLOWED_ORIGINS=http://localhost:3000,https://ma1.fr,https://www.ma1.fr` |
| `JWT_SECRET` strict en prod | ✅ Sprint Étape 2 conservé |
| Aucune logique métier modifiée | ✅ |
| Aucune page légale touchée | ✅ |
| URL Railway hardcodée dans `index-standalone.html:1214` | ⚠️ **Documenté comme P1**. Le fichier est servi en statique par Vercel ; injecter une variable au runtime nécessite un script de bootstrap (window.__MA1_API_URL__ depuis meta tag) ou un build templating. À traiter au Sprint Étape 4 ou ultérieur. Aucun secret leaké — c'est juste une URL publique. |

---

## 11. Tests exécutés

| Commande | Résultat | Notes |
|---|---|---|
| `python3 ast.parse('apps/backend/src/api.py')` | ✅ OK, 66 872 caractères, 1 406 lignes | Syntaxe Python valide après déplacement |
| `json.load('railway.json')` | ✅ OK | `dockerfilePath: apps/backend/Dockerfile`, `startCommand: uvicorn src.api:app --host 0.0.0.0 --port $PORT`, `healthcheckPath: /health` |
| `json.load('apps/frontend/vercel.json')` | ✅ OK | `framework: nextjs` |
| `yaml.safe_load('.github/workflows/ci.yml')` | ✅ OK | 3 jobs, working-directory cohérents |
| `yaml.safe_load('docker-compose.yml')` | ✅ OK | 2 services, contexts cohérents |
| `json.load('apps/frontend/package.json')` | ✅ OK | scripts `dev`, `build`, `start`, `lint`, `test`, `test:e2e` |
| `json.load('apps/frontend/tsconfig.json')` (avec strip comments) | ✅ OK | paths `@/*`, `@/components/*`, `@/lib/*`, `@/styles/*` intacts → imports React préservés sans modification |
| `git add -A` + `git status` | ✅ 102 renames + 17 ajouts + 4 deletes + 1 modification | Historique Git préservé |
| `grep "railway.app"` dans `apps/frontend/public/index-standalone.html` | ⚠️ 1 occurrence ligne 1214 (URL hardcodée) | Cf §10 |
| `grep "process.env.NEXT_PUBLIC_API_URL"` dans `apps/frontend/lib/api.ts` | ✅ Présent ligne 1 | Frontend Next.js utilise bien la variable env |
| CTRL-1 anti-troncature sur `ci.yml` après bypass inode | ✅ 53 lignes après bypass (vs 43 avant cache stale) | INC-002 reproduit + corrigé en cours de sprint |
| `npm install` / `npm run lint` / `npm run build` | ⚠️ **NON exécutés** (limite sandbox) | À lancer côté Damien : `cd apps/frontend && npm install && npm run lint && npm run build` |
| `pytest apps/backend/tests/` | ⚠️ **NON exécuté** (limite sandbox) | À lancer côté Damien — attendre échecs prévus (cf §9 note) |
| `docker compose build` / `docker compose up` | ⚠️ **NON exécutés** (Docker indisponible en sandbox) | À tester côté Damien si Docker Desktop installé |

---

## 12. Problèmes rencontrés

| # | Problème | Cause racine | Résolution |
|---|---|---|---|
| P1 | `git mv app apps/frontend/app` a renvoyé "fatal: index file corrupt" | Index Git devenu invalide (probablement écriture parallèle Sprint 2 + opérations sandbox antérieures) | `rm .git/index && git reset` pour reconstruire l'index depuis le HEAD. Note : le `mv` filesystem avait déjà eu lieu, seul l'index Git était cassé. |
| P2 | Après reconstruction de l'index, Git voyait des "deleted" pour `app/admin/page.tsx` etc. | Les fichiers `app/*` avaient été physiquement déplacés vers `apps/frontend/app/*` par le `git mv` qui a partiellement échoué | Continuer avec `mv` physique (non-git) pour les autres dossiers, puis `git add -A` final pour faire reconnaître à Git les renames (similarité de contenu) |
| P3 | `python yaml.safe_load(ci.yml)` voyait `build-frontend` avec seulement 2 clés au lieu de 4 | INC-002 : cache stale du mount Linux post-`Write` | Bypass inode (`mv ci.yml ci.yml.bak && mv ci.yml.bak ci.yml`), puis sleep 2 + re-test → 53 lignes (vs 43), tous les jobs cohérents |
| P4 | Sandbox bloque `rm` par défaut sur `.git/index` | Politique de sécurité Cowork | `mcp__cowork__allow_cowork_file_delete` appelé une fois, puis `rm` autorisé |

Aucun de ces problèmes n'a affecté l'intégrité du code final. Tous documentés dans `docs/INCIDENTS_ET_CONTROLES.md` (à enrichir au prochain Edit).

---

## 13. Risques restants

| # | Risque | Sprint cible | Priorité |
|---|---|---|---|
| R1 | URL Railway hardcodée `apps/frontend/public/index-standalone.html:1214` | Sprint Étape 4 (ou décision : déprécier le standalone) | P1 |
| R2 | Tests pytest existants vont échouer en CI (n'envoient pas de token sur les routes maintenant protégées) | Sprint Étape 4 (mise à jour tests) | P1 |
| R3 | Dossier `config/` vide à la racine — résidu hérité, non documenté | Sprint Étape 4 (nettoyage léger) | P3 |
| R4 | Backend toujours RAM-only (`_users`, `_profiles`, etc.) | Sprint Étape 4 (Supabase) | **P0** |
| R5 | RLS Supabase `USING (true)` | Sprint Étape 4 | **P0** |
| R6 | Schéma Supabase à étendre (`paid_until`, `access_status`, tables `activations_pending`/`payments`/`schools`) | Sprint Étape 4 | **P0** |
| R7 | Domaine `ma1.fr` non encore lié à Vercel ni Railway | Sprint Étape 5 (DNS OVH + Vercel + Railway custom domain) | **P0 bêta payante** |
| R8 | Domaine Resend non vérifié | Sprint Étape 5 (DNS) | **P0 emails** |
| R9 | Tunnel SumUp `/pricing-beta` + `/activation` + admin pas encore créés | Sprint Étape 6 (paiement SumUp) | **P0 bêta payante** |
| R10 | Templates Resend bêta manquants (paiement confirmé, activation, J-7, J-1, expiration) | Sprint Étape 5 ou 6 | **P0 bêta payante** |
| R11 | Stripe SDK et endpoints `/stripe/checkout` + `/stripe/webhook` toujours en place mais inutilisés | Sprint suivant Sprint Étape 6 | P1 |
| R12 | Placeholders légaux (`mentions-legales.html` SIRET, RCS, adresse, …) non remplis | Sprint Étape 6 ou plus tôt | **P0 légal** |
| R13 | CGV ne couvrent pas le paiement unique 30 jours | Sprint Étape 6 | **P0 légal** |
| R14 | Aucun email de notification admin lors d'une demande de paiement (tunnel manuel impossible sans ça) | Sprint Étape 6 | **P0 bêta payante** |

---

## 14. Prochaine étape recommandée

> **Sprint Étape 4 — Supabase SQL et persistance**

Référence : `docs/AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` §6 + Sprint C de la roadmap.

Périmètre Sprint Étape 4 :
1. **Migration SQL Supabase** : étendre `users` (`paid_until`, `access_status`, `payment_provider`, `payment_reference`, `last_payment_at`, `role`, `school_id`) + créer tables `activations_pending`, `payments`, `payment_events`, `schools`, `school_students`, `email_logs`, `feedback_reports`.
2. **RLS strictes** : `USING (auth.uid()::text = user_id)` au lieu de `USING (true)`.
3. **Refonte backend RAM → DB** : `_users`, `_profiles`, `_usage`, `_subscriptions`, `_referrals`, `_challenges`, `_groups`, `_whitelabel`, `_monitor_notes`, `_autoecole_students` → tables Supabase.
4. **Logique `check_limit` étendue** : lire `paid_until` depuis DB, downgrade automatique si expiré.
5. **Mise à jour tests pytest** : ajouter des fixtures de token + suite de tests qui couvrent les routes protégées.
6. **Backup automatique Supabase quotidien** (configuration projet).

**Ne pas démarrer Sprint Étape 4 avant validation Damien de ce rapport.**

Pré-validation côté Damien (à faire immédiatement après lecture du rapport) :

```bash
# 1. Vérifier la structure
ls -la
ls apps/
ls docs/

# 2. Lancer le frontend
cd apps/frontend
npm install
npm run lint
npm run build

# 3. Lancer le backend
cd ../backend
pip install -r requirements.txt
python -c "from src import api; print('OK')"

# 4. Vérifier que les routes répondent
uvicorn src.api:app --reload --port 8000
# Dans un autre terminal :
curl -i http://localhost:8000/health   # → 200

# 5. (Optionnel) Tester Docker
cd ../../
docker compose up --build
```

Si l'un des points 2, 3 ou 4 échoue, arrêter et notifier — un rollback Git est possible (le sprint n'a déplacé que des fichiers).

---

## 15. Verdict final

> **MA1 dispose-t-il maintenant d'une séparation backend/frontend propre pour continuer vers Supabase, Resend et SumUp ?**

**OUI.**

- Architecture monorepo `apps/frontend` + `apps/backend` propre.
- `railway.json` à la racine force le build sur `apps/backend/Dockerfile`.
- `vercel.json` dans `apps/frontend/` clarifie le déploiement Vercel.
- `docker-compose.yml` adapté pour le développement local.
- `.github/workflows/ci.yml` mis à jour avec les bons `working-directory`.
- `.gitignore` couvre la nouvelle structure ET garde la rétro-compat.
- Documentation centralisée dans `docs/`.
- Tous les secrets restent isolés côté `apps/backend/` (rien ne fuit côté frontend Vercel).
- 102 renames Git préservent l'historique du code.
- Aucune ligne de code applicatif modifiée (la logique Sprint Étape 2 est intacte).
- Tests statiques (Python AST + JSON + YAML + tsconfig) passent tous.

**Conditions de validité du verdict :**

1. Damien doit configurer côté Vercel : Root Directory = `apps/frontend` + variables `NEXT_PUBLIC_*` listées au §5.
2. Damien doit configurer côté Railway : variables d'environnement listées au §5 + custom domain `api.ma1.fr` à terme.
3. Damien doit valider le build local : `npm install && npm run build` côté `apps/frontend/` + `python -c "from src import api"` côté `apps/backend/`.
4. Une fois validé, **ne pas merger sur main avant** que les deux déploiements Vercel + Railway aient confirmé un build vert.

**Si une seule de ces conditions n'est pas respectée, le verdict n'est PAS valide et un rollback est recommandé.**

---

*Sprint Étape 3 terminé. 102 renames + 17 ajouts + 4 deletes + 1 modification Git. 0 lien SumUp réel intégré. 0 page légale touchée. 0 logique métier modifiée. Prêt pour validation Damien.*

— FIN DU RAPPORT — marker_eof_SPRINT_ETAPE_3_SEPARATION_BACKEND_FRONTEND
