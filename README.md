# MA1 — Ton Assistant IA du Code de la Route

> Édité par DamCompany. Domaine : [ma1.fr](https://ma1.fr). Modèle bêta : paiement unique 30 jours (9 € particulier / 200 € auto-école), sans abonnement.

## Structure monorepo (depuis Sprint Étape 3)

```
MA1/
├── apps/
│   ├── frontend/          # Next.js 15 (App Router, React 19, TypeScript, Tailwind)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── public/
│   │   ├── e2e/                       # Tests Playwright
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile                 # Build Next.js standalone
│   │   ├── vercel.json
│   │   └── .env.local.example
│   └── backend/           # FastAPI (Python 3.12)
│       ├── src/                       # api.py + modules
│       ├── scripts/                   # build_index, generate_qcm, supabase_schema.sql, …
│       ├── tests/                     # pytest
│       ├── data/                      # données runtime (ignoré Git pour les .json générés)
│       ├── index/                     # index Chroma (ignoré Git)
│       ├── requirements.txt
│       ├── start.sh
│       ├── Dockerfile                 # Build FastAPI / uvicorn
│       └── .env.example
├── docs/                  # Rapports d'audit, roadmap, journal d'incidents, suivi
├── _archive/              # Anciens fichiers conservés hors `/public/` (ex. landingpage.html)
├── docker-compose.yml     # Dev local (frontend + backend)
├── railway.json           # Config Railway → cible apps/backend/Dockerfile
├── .github/workflows/     # CI/CD GitHub Actions
├── CLAUDE.md              # Instructions pour agents IA (à laisser à la racine)
├── README.md              # Ce fichier
└── .gitignore
```

## Démarrage rapide

### Frontend (Next.js)

```bash
cd apps/frontend
cp .env.local.example .env.local       # puis remplir NEXT_PUBLIC_API_URL etc.
npm install
npm run dev                            # http://localhost:3000
```

### Backend (FastAPI)

```bash
cd apps/backend
cp .env.example .env                   # puis remplir ANTHROPIC_API_KEY, SUPABASE_*, JWT_SECRET, …
pip install -r requirements.txt
bash start.sh                          # http://localhost:8000
# OU directement
uvicorn src.api:app --reload --port 8000
```

### Stack complète en Docker

```bash
docker compose up --build              # frontend:3000, backend:8000
```

## Déploiement

### Frontend → Vercel

- Project Settings → Root Directory : `apps/frontend`
- Framework Preset : Next.js (détecté auto)
- Variables d'environnement requises (Settings → Environment Variables) :
  - `NEXT_PUBLIC_API_URL=https://ma1-ton-assistant-de-la-route-production.up.railway.app` (ou `https://api.ma1.fr` à terme)
  - `NEXT_PUBLIC_FRONTEND_URL=https://ma1.fr`
  - `NEXT_PUBLIC_BETA_ACCESS_DAYS=30`
  - `NEXT_PUBLIC_BETA_PARTICULIER_PRICE=9`
  - `NEXT_PUBLIC_BETA_AUTOECOLE_PRICE=200`
  - `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=…` (à fournir par Damien au Sprint Étape 4/5)
  - `NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=…`
- Domaine custom : `ma1.fr` + `www.ma1.fr`

### Backend → Railway

- URL actuelle : [ma1-ton-assistant-de-la-route-production.up.railway.app](https://ma1-ton-assistant-de-la-route-production.up.railway.app)
- `railway.json` à la racine du repo force `apps/backend/Dockerfile`.
- Variables d'environnement requises (Settings → Variables) :
  - `APP_ENV=production`
  - `JWT_SECRET=…` (32+ caractères aléatoires — refus de démarrage sinon)
  - `CORS_ALLOWED_ORIGINS=https://ma1.fr,https://www.ma1.fr,https://<vercel-preview>.vercel.app`
  - `ANTHROPIC_API_KEY=sk-ant-…`
  - `CLAUDE_MODEL=claude-sonnet-4-…`
  - `SUPABASE_URL=https://<project>.supabase.co`
  - `SUPABASE_ANON_KEY=…`
  - `SUPABASE_SERVICE_KEY=…` (ou `SUPABASE_SERVICE_ROLE_KEY`)
  - `RESEND_API_KEY=re_…`
  - `RESEND_FROM_EMAIL=MA1 <noreply@ma1.fr>` (domaine à vérifier dans Resend)
  - `ADMIN_EMAILS=damien.miyouna@gmail.com`
  - `ADMIN_NOTIFICATION_EMAIL=damien.miyouna@gmail.com`
  - `PAYMENT_PROVIDER=sumup_link_manual`, `BETA_PAYMENT_MODE=manual`
  - `BETA_ACCESS_DAYS=30`, `BETA_PARTICULIER_PRICE=9`, `BETA_AUTOECOLE_PRICE=200`
  - `SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=…` (Sprint Étape 4)
  - `SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=…`
- Domaine custom recommandé : `api.ma1.fr` (Settings → Networking → Custom Domain).

## Sécurité & règles d'or

- **Aucun secret côté frontend** : seules les variables `NEXT_PUBLIC_*` sont publiques.
- **Pas de clé Supabase service role, Resend, Anthropic, SumUp** côté frontend.
- **`JWT_SECRET` strict en production** : refus de démarrage si défaut ou < 32 caractères.
- **CORS** : pas de `*` en production.
- **Pages légales** : `apps/frontend/public/legal/*.html`. Toute modification doit être validée — voir `docs/LEGAL_TODO_DAMIEN.md`.
- **Plan utilisateur réel** : sourcé exclusivement du backend (jamais du `localStorage` client). Cf `docs/SPRINT_ETAPE_2_NETTOYAGE_AVANT_PAIEMENT.md`.

## Documentation projet

Voir `docs/` :

- `AUDIT_MA1_v9.md` — audit initial.
- `AUDIT_BETA_OUVERTE_MA1.md` — audit bêta paiement 30 jours.
- `AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` — audit infrastructure.
- `ROADMAP_MA1_MARKET_LAUNCH.md` — sprints jusqu'au lancement.
- `SPRINT_0_RAPPORT_FIN.md` / `SPRINT_ETAPE_2_…md` / `SPRINT_ETAPE_3_…md` — rapports de sprint.
- `INCIDENTS_ET_CONTROLES.md` — méthodes et incidents.
- `LEGAL_TODO_DAMIEN.md` — checklist juridique à compléter.
- `SUIVI_AUDIT_BETA_OUVERTE.md` — suivi vivant.

## Prochaine étape

**Sprint Étape 4 — Supabase SQL et persistance** (migration schéma, RLS strictes, refonte backend RAM → DB).

---

© 2026 DamCompany. Édité avec ❤️ pour les candidats au permis.
