# CLAUDE.md — Instructions pour les agents IA sur MA1

> À lire **avant toute intervention** sur ce dépôt, en complément de `Damcompany-code-guardrails.md`.
> Dernière mise à jour : Sprint 0 (2026-05-20)

---

## 1. Identité projet

**MA1 — Ton Assistant IA du Code de la Route**

- Éditeur : DamCompany
- Stack : Next.js 15 (App Router, React 19, TypeScript, Tailwind 3) + FastAPI (Python 3.11) + Claude (Anthropic) + Stripe + Supabase + Resend
- Repo : `MA1_v9_Final`
- Cible utilisateurs : candidats au Code de la route français (15 ans et +), auto-écoles (B2B)

## 2. État du produit (mai 2026)

**Statut : pré-lancement, Sprint 0 terminé.**

Phase de cadrage architecture. Failles P0 documentées dans `AUDIT_MA1_v9.md`. Roadmap publique : `ROADMAP_MA1_MARKET_LAUNCH.md`.

## 3. Routing canonique

| Route publique | Fichier | Rôle |
|---|---|---|
| `/` | `app/page.tsx` (redirect) → `/landing` | Entrée |
| `/landing` | `app/landing/page.tsx` | **Landing canonique** (Next.js) |
| `/landingpage.html` | Redirection 301 → `/landing` | Compat anciens liens |
| `/index-standalone.html` | `public/index-standalone.html` | App monolithe v7 (cible "Commencer" en attendant la stabilisation Next.js) |
| `/qcm`, `/exam`, `/dashboard`, `/settings`, etc. | `app/<route>/page.tsx` | App Next.js v8 (en cours) |
| `/legal/cgu.html`, etc. | `public/legal/*.html` | Pages légales statiques |
| `/api/*` | `app/api/*/route.ts` → proxies vers `BACKEND_URL` (FastAPI) | API |

**App cible long terme : Next.js v8** — la standalone v7 sera dépréciée en Sprint 2.

**Landing supprimée :** `public/landingpage.html` → archivée dans `_archive/landingpage.html` (hors `/public/`, donc non servi). Redirect 301 en place.

## 4. Règles pour Claude / agents IA

### 4.1 Avant toute intervention

1. Lire `Damcompany-code-guardrails.md` (guardrails DamCompany).
2. Lire ce `CLAUDE.md` (ce fichier).
3. Consulter `AUDIT_MA1_v9.md` pour comprendre les failles connues.
4. Consulter `ROADMAP_MA1_MARKET_LAUNCH.md` pour savoir dans quel sprint on est.

### 4.2 Interdictions absolues

- Ne pas réintroduire une seconde landing.
- Ne pas modifier la palette de couleurs (`#0a1628`, `#3a9db0`, `#7ec8e3`, `#d0eaf2`).
- Ne pas changer les polices (Sora display, Nunito Sans body).
- Ne pas refactoriser l'app shell (`app/layout.tsx`) sans ticket Sprint 1+.
- Ne pas écrire de nouvelles APIs côté `app/api/*` : utiliser le backend FastAPI.
- Ne pas commiter de secrets (`.env*`, clés Stripe/Anthropic).
- Ne pas activer le mock `goPrem()` dans `public/index-standalone.html` (ligne ~1372) en production.
- Ne pas ouvrir l'admin `/admin` au public tant que l'auth n'est pas refaite côté serveur.

### 4.3 Bonnes pratiques

- **Modification chirurgicale** : ne toucher que les lignes nécessaires.
- **Préserver la cohérence** : si une promesse change sur la landing, vérifier impact sur CGU, CGV, backend `PLAN_LIMITS`, modal pricing standalone.
- **Tests** : `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e` (Playwright) doivent passer.
- **Mobile-first** : tester systématiquement < 380 px.
- **Disclaimer IA** : toute réponse IA doit afficher "outil pédagogique, vérifier sur Légifrance".
- **Sources Légifrance** : citer les articles (R413-2, etc.) quand pertinent.

## 5. Glossaire des plans (source canonique : `backend/src/api.py` PLAN_LIMITS)

| Plan | Prix | Quota questions IA / jour | QCM / mois | Examens blancs / mois | Essai gratuit |
|---|---|---|---|---|---|
| Gratuit | 0 € | 10 | 80 | 1 | — |
| Premium | 10 € TTC / mois | illimité (fair use 200/jour cible) | illimité | illimité | 7 jours |
| Premium Annuel | 79 € TTC / an | idem Premium | idem | idem | — |
| Auto-École | 200 € TTC / mois | idem Premium (par moniteur) | idem | idem | — |

> Auto-École inclut 30 élèves (à enforcer en Sprint 2).
> Annuel à ajouter dans la CGV en Sprint 1 P0.

## 6. Conventions de code

- **TS strict** : pas de `any` sauf cas extrême documenté.
- **React** : composants fonctionnels, hooks, pas de class.
- **Imports** : alias `@/` pour la racine projet.
- **Tailwind** : classes utilitaires, pas de CSS-in-JS.
- **Zustand** : un seul store global (`lib/store.ts`).
- **FastAPI** : Pydantic models, type hints, async quand pertinent.

## 7. Workflow Git suggéré

- Branches : `feat/sprintN-task-court`, `fix/sprintN-bug-court`, `chore/sprintN-…`
- Commits : conventional commits FR (`feat(landing):`, `fix(auth):`, `chore(sprint0):`, …)
- PR : titre = ticket sprint, description = critères de réussite, checklist guardrails

## 8. Variables d'environnement minimales

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=…    # backend URL (ex: https://api.ma1.app)
NEXT_PUBLIC_APP_URL=…    # site URL (ex: https://ma1.app)
BACKEND_URL=…            # côté serveur (proxy)
```

### Backend (`backend/.env`)
```
ANTHROPIC_API_KEY=sk-ant-…
CLAUDE_MODEL=claude-sonnet-4-…
SUPABASE_URL=…
SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_KEY=…
STRIPE_SECRET_KEY=sk_live_…    # NE PAS COMMITER
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PREMIUM_PRICE_ID=price_…
STRIPE_ANNUAL_PRICE_ID=price_…
STRIPE_AUTOECOLE_PRICE_ID=price_…
RESEND_API_KEY=re_…
EMAIL_FROM=MA1 <noreply@ma1.app>
JWT_SECRET=…                   # 32+ chars, généré aléatoirement
JWT_EXPIRY_HOURS=168
APP_URL=https://ma1.app
PORT=8000
```

## 9. Quand demander avant d'agir

- Suppression d'un fichier ≥ 50 lignes
- Modification d'une page légale
- Changement d'une promesse marketing (landing, modal pricing)
- Ajout d'une dépendance
- Refactor d'un composant utilisé > 3 fois
- Ouverture d'une route publique sensible

## 10. Contacts

- DPO : `dpo@ma1.app`
- Support : `contact@ma1.app`
- Tech lead : ingénieur Damien Miyouna

---

*Ce fichier est la source de vérité opérationnelle pour tout agent IA travaillant sur MA1. Il évolue à chaque sprint.*
