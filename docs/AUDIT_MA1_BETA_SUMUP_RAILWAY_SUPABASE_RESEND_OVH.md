# AUDIT MA1 — BÊTA OUVERTE SUMUP / RAILWAY / SUPABASE / RESEND / OVH

> Audit en lecture seule. Aucun fichier de code modifié.
> Livrables : ce rapport + `LEGAL_TODO_DAMIEN.md` + MAJ `SUIVI_AUDIT_BETA_OUVERTE.md`.
> Conforme `Damcompany-code-guardrails.md` + `CLAUDE.md` + `INCIDENTS_ET_CONTROLES.md`.
> Date : 2026-05-20 · Auteur : Claude Cowork

---

## 1. Résumé exécutif

**Question centrale :** MA1 est-il prêt techniquement, commercialement et opérationnellement pour une bêta ouverte avec paiement SumUp 30 jours (9 € particulier / 200 € auto-école) ?

**Verdict global : NON en l'état.**
MA1 a une base technique sérieuse (Next.js 15 + FastAPI + Resend installé + Stripe SDK + Supabase SDK), mais le périmètre "bêta ouverte SumUp 30 jours" exige 8 chantiers spécifiques **dont aucun n'est démarré** :
1. Intégration SumUp (0 % fait — pas une ligne de code SumUp dans le repo).
2. Backend Railway séparé proprement du frontend (mono-dossier actuellement).
3. Configuration Railway production (pas de `railway.json`, pas de domaine custom `api.ma1.X`).
4. Migration Supabase pour stockage paiements + accès 30 jours (4 tables actuellement, 14-15 attendues).
5. Domaine Resend vérifié + SPF/DKIM/DMARC (domaine `ma1.app` utilisé par défaut, vérification non garantie).
6. Achat + configuration domaine OVH (objectif `ma1.com`, fallback à proposer).
7. CGV bêta refondues (le modèle "paiement unique 30 jours sans renouvellement" n'est PAS couvert par les CGV actuelles — voir audit précédent `AUDIT_BETA_OUVERTE_MA1.md` §7).
8. Parcours client complet (landing → pricing-beta → SumUp → activation → utilisation → expiration → renouvellement). Aujourd'hui : un seul étage existe (landing post-Sprint 0).

| Question | Réponse |
|---|---|
| Bêta gratuite ouverte ? | ⚠️ **Tolérable en mode privé fermé (10-30 invités)** après désactivation `goPrem()` standalone + auth backend ; **NON en public** tant que persistance RAM-only et CORS `*`. |
| Bêta payante 9 € SumUp ? | ❌ **NON** sans Sprint A-G complets. Compter 8-12 jours dev. |
| Bêta auto-école 200 € ? | ❌ **NON** + en plus exige enforcement quota 30 élèves + auth dashboard owner. |
| Activation : manuelle ou auto ? | ✅ **MANUELLE recommandée** pour démarrer (V1, Sprint D). Bascule auto après 20-30 paiements/mois (V2). |

### 5 blocages prioritaires (P0 absolus)

1. **Premium fake `goPrem()`** dans `public/index-standalone.html:1372` (et fallbacks ligne 1750/1757) → permet de débloquer Premium sans payer. Si la bêta s'ouvre demain avec ces lignes, le revenu est zéro.
2. **Endpoints backend sans auth** : `/rgpd/*`, `/dashboard/{owner_id}`, `/profile/{user_id}`, `/whitelabel/{owner_id}`, `/usage/{user_id}`. Un attaquant qui devine un user_id (8 hex) supprime un compte ou siphonne un dashboard payé.
3. **Persistance backend = 100 % RAM** (`_users`, `_profiles`, `_subscriptions`…). Tout reboot Railway = perte des paiements activés. Insupportable pour un service payant.
4. **Aucune logique d'expiration 30 jours** ni en backend (`check_limit` ne lit aucune date) ni en DB (`paid_until` n'existe pas). Plan = string statique éternelle.
5. **CGV incompatibles** avec le modèle paiement unique : elles ne mentionnent QUE l'abonnement récurrent. Encaisser des paiements 30 jours sans CGV adaptées = pratique commerciale fragilisable.

---

## 2. Audit du parcours client

### 2.1 Parcours Particulier

| # | Étape | État actuel | Statut | Risque | Priorité |
|---|---|---|---|---|---|
| 1 | Arrivée landing | ✅ `/landing` Next.js (Sprint 0) | Existant | Wrappée dans app shell (sidebar visible) | P1 |
| 2 | Compréhension offre | ❌ Pas de mention "bêta ouverte" ni "30 jours" ni "9 €" | Absent | Promesse ambiguë | P0 |
| 3 | Création de compte | ✅ `AuthModal.tsx` + backend `/auth/register` | Existant | Données stockées en RAM, perdues au reboot | **P0** |
| 4 | Connexion | ✅ `AuthModal.tsx` + `/auth/login` | Existant | JWT_SECRET par défaut + RAM | **P0** |
| 5 | Choix offre 9 € / 30 jours | ❌ Pas de page `/pricing-beta`, pas de CTA "Débloquer 30 j" | Absent | Tunnel inexistant | P0 |
| 6 | Paiement SumUp | ❌ Zéro intégration SumUp | Absent | À créer | P0 |
| 7 | Retour après paiement | ❌ Pas de page `/activation` ni `/payment/success` | Absent | À créer | P0 |
| 8 | Activation accès | ❌ Pas de flow (ni manuel ni auto). Aujourd'hui : `goPrem()` fake | Fictif | Fraude | **P0** |
| 9 | Réception email | ⚠️ Templates Resend existants (welcome) mais pas "paiement confirmé" ni "activation" | Partiel | Domaine non vérifié + 3 templates manquants | P0 |
| 10 | Utilisation des options Premium | ✅ Chat / QCM / Examen / Vision / Plan30 / Leaderboard fonctionnent (Next.js + standalone) | Existant | OK fonctionnel, sécu KO | P1 |
| 11 | Affichage jours restants | ❌ Nulle part | Absent | UX dégradée | P1 |
| 12 | Expiration après 30 jours | ❌ Aucun mécanisme | Absent | Plan = éternel | **P0** |
| 13 | Renouvellement manuel | ❌ Aucun mécanisme | Absent | À créer | P0 |

**Verdict parcours particulier :** seulement 4 étapes sur 13 fonctionnent (1, 3, 4, 10). Les 9 autres sont absentes ou fictives.

### 2.2 Parcours Auto-École

| # | Étape | État actuel | Statut | Risque | Priorité |
|---|---|---|---|---|---|
| 1 | Arrivée landing | ✅ `/landing` carte Auto-École présente | Existant | CTA va sur `mailto:` (Sprint 0) — pas de tunnel auto | P1 |
| 2 | Compréhension offre AE | ⚠️ Carte landing dit "200€/mois" — incompatible bêta unique 30 j | Partiel | Promesse fausse | P0 |
| 3 | Création compte auto-école | ⚠️ Inscription normale, pas de rôle `autoecole_owner` distinct | Partiel | Pas de différenciation rôle | P0 |
| 4 | Paiement 200 € / 30 jours | ❌ Idem particulier : zéro SumUp | Absent | À créer | P0 |
| 5 | Activation espace AE | ❌ Idem : pas de flow d'activation | Absent | À créer | P0 |
| 6 | Accès dashboard | ⚠️ `DashboardPanel.tsx` + `/dashboard/{owner_id}` mais **AUCUNE AUTH** | Partiel + KO sécu | Espionnage triviale | **P0** |
| 7 | Ajout élèves | ⚠️ `dashAddStudent()` (standalone) + `/dashboard/add-student` mais quota 30 non enforcé | Partiel | Promesse non tenue | P0 |
| 8 | Suivi progression | ✅ Données calculées (`readiness`, `success_rate`, `weak_topics`) | Existant | OK fonctionnel | P2 |
| 9 | Réception emails | ❌ Aucun template AE (création, paiement, expiration, ajout élève) | Absent | À créer | P0 |
| 10 | Expiration après 30 jours | ❌ Idem particulier : aucun mécanisme | Absent | **P0** |
| 11 | Renouvellement manuel | ❌ Absent | Absent | P0 |

**Verdict parcours auto-école :** 1 étape sur 11 vraiment OK (8), reste à créer ou sécuriser.

---

## 3. Audit paiement SumUp

### 3.1 État SumUp actuel

| Élément | Statut | Risque | Recommandation |
|---|---|---|---|
| Compte SumUp vérifié (côté Damien) | ✅ (déclaration) | OK | Confirmer en interne |
| SDK / API SumUp dans le code | ❌ **0 ligne** | n/a | À ajouter Sprint D |
| Lien de paiement SumUp particulier (9 €) | ❌ Inexistant | À créer | Génération côté dashboard SumUp |
| Lien de paiement SumUp auto-école (200 €) | ❌ Inexistant | À créer | Idem |
| Variables d'env SumUp | ❌ Inexistantes | À ajouter (cf annexe) | `.env.example` à étendre |
| Page activation post-paiement | ❌ Inexistante | À créer | `app/activation/page.tsx` |
| Webhook SumUp | ❌ Inexistant | À créer (V2 auto) | Endpoint `POST /payment/webhook/sumup` |
| Stockage référence paiement | ❌ Pas de colonne `payment_reference` en DB | À créer | Cf §6 |
| Protection contre auto-activation sans paiement | ❌ Aucune (et `goPrem()` permet exactement ça) | **Fraude triviale** | Neutralisation `goPrem()` + auth admin |
| Email confirmation paiement | ❌ Template inexistant | À créer | Cf §7 |
| Champ `paid_until` | ❌ Inexistant | À créer | Cf §6 |

### 3.2 Réalités de la solution SumUp pour ce cas d'usage

**Disclaimer :** ces points sont à vérifier dans la documentation SumUp officielle avant tout dev. SumUp est principalement positionné comme **terminal de paiement physique + e-commerce simple**, moins comme une plateforme abonnement type Stripe Subscriptions.

| Capability | Connue / supposée | À vérifier par Damien dans dashboard SumUp |
|---|---|---|
| Génération de **Payment Links** statiques (URL fixe pour un produit donné) | ✅ Existe via "Online Payments → Payment Links" | URL + activation côté dashboard |
| Personnalisation montant à la volée | ⚠️ Limité — généralement montant fixe par lien | Confirmer si checkout dynamique possible |
| URL de redirection succès / échec | ✅ Configurable lien par lien | Mettre `https://ma1.app/payment/success?provider=sumup` |
| Webhook serveur sur paiement réussi | ⚠️ Existant via "SumUp API" mais nécessite des credentials OAuth + Merchant Code (pas natif sur les Payment Links basiques) | Activer côté dashboard si possible |
| Mode test / sandbox | ✅ Existe (Sandbox SumUp) | À utiliser AVANT prod |
| `client_reference_id` ou metadata custom | ⚠️ Limité comparé à Stripe — souvent il faut passer l'identifiant client en query string du lien (`?ref=user_xxx`) | À tester |
| Disponibilité géographique | ✅ France OK | Confirmer pays |
| Frais | ~1,95 % en France (variable selon volume) | Comparer à Stripe (1,5 % + 0,25 €) |

### 3.3 Tunnel V1 — paiement SumUp **manuel** (recommandé pour ouverture J0)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Landing /landing (Next.js)                                       │
│    Bouton "Débloquer 30 jours - 9 €"                                │
│    Bouton "Auto-école 30 jours - 200 €"                             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Page /pricing-beta (Next.js — À CRÉER)                           │
│    Description offre + "Paiement unique sans abonnement"            │
│    href = process.env.NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER…   │
│           process.env.NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE…     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Page SumUp externe                                               │
│    Utilisateur paie sur sumup.com (HTTPS)                           │
│    Redirection success → /activation?provider=sumup                 │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Page /activation (Next.js — À CRÉER)                             │
│    Formulaire :                                                     │
│    - Email (pré-rempli si connecté)                                 │
│    - Référence transaction SumUp (collée par l'utilisateur)         │
│    - Plan (caché si query string déjà set)                          │
│    POST /activation/request → backend                               │
│    Backend INSERT activations_pending → email à damien@…            │
│    Affichage : "Demande reçue. Activation sous 24 h ouvrables."     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Admin /admin/activations (Next.js — À CRÉER) + Backend           │
│    Damien vérifie le paiement reçu dans le dashboard SumUp          │
│    Compare avec la référence saisie                                 │
│    Clique "Activer"                                                 │
│    POST /admin/activations/:id/approve → backend                    │
│    UPDATE users SET                                                 │
│      plan='beta_premium' OU 'beta_autoecole',                       │
│      access_status='active',                                        │
│      paid_until=now()+30days,                                       │
│      payment_provider='sumup_manual',                               │
│      payment_reference='<ref>',                                     │
│      last_payment_at=now()                                          │
│    INSERT payments (audit trail)                                    │
│    UPDATE activations_pending SET status='activated'                │
│    Envoi email "Votre accès est activé" via Resend                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Header affiche "X jours restants" + accès débloqué               │
└─────────────────────────────────────────────────────────────────────┘
```

**Coût V1 :** 2-3 jours de dev. Aucune dépendance à l'API SumUp. Robuste, audit-trail complet.

### 3.4 Tunnel V2 — paiement SumUp **automatisé** (Sprint suivant)

```
1. Utilisateur clique "Débloquer 30 jours" sur /landing
2. POST /payment/create-sumup-link → backend renvoie URL SumUp avec ref=client_reference_id
   (variante : utilise le Payment Link statique + suffixe ?customer_email=)
3. SumUp gère le paiement
4. SumUp POST /payment/webhook/sumup (webhook serveur)
   - Vérifie signature (SUMUP_WEBHOOK_SECRET)
   - Extrait reference / customer_email
   - UPDATE users SET plan=…, paid_until=now()+30days,…
   - INSERT payments
   - Envoie email confirmation
5. Redirige vers /payment/success
6. Frontend re-fetch /auth/me → permissions à jour
```

**Coût V2 :** +2-3 jours sur V1. Prérequis : API SumUp + Merchant Code + Webhook accessibles. À valider avec Damien selon ses droits SumUp.

### 3.5 Variables d'env SumUp à prévoir (synthèse)

**Frontend `.env.local` :**
```
NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=https://pay.sumup.com/b2c/...
NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=https://pay.sumup.com/b2c/...
NEXT_PUBLIC_FRONTEND_URL=https://ma1.com   # OU ma1.app le temps de la transition
```

**Backend `.env` :**
```
# Paiement bêta
PAYMENT_PROVIDER=sumup_link_manual    # ou sumup_api_auto en V2
BETA_PAYMENT_MODE=manual              # ou auto en V2
BETA_ACCESS_DAYS=30
BETA_PARTICULIER_PRICE=9
BETA_AUTOECOLE_PRICE=200
SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=https://pay.sumup.com/...
SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=https://pay.sumup.com/...

# Activation
ADMIN_NOTIFICATION_EMAIL=damien.miyouna@gmail.com

# Si V2 SumUp API
SUMUP_CLIENT_ID=
SUMUP_CLIENT_SECRET=
SUMUP_MERCHANT_CODE=
SUMUP_WEBHOOK_SECRET=
```

### 3.6 Tables Supabase nécessaires pour SumUp

Cf §6.2. Minimum vital :
- `users` étendue avec `plan`, `access_status`, `paid_until`, `payment_provider`, `payment_reference`, `last_payment_at`, `role`
- `activations_pending` (file d'attente V1 manuelle)
- `payments` (audit trail)
- `payment_events` (raw events webhooks V2)

---

## 4. Audit séparation backend / frontend

### 4.1 État actuel

| Élément | Statut | Risque | Action recommandée |
|---|---|---|---|
| Architecture mono-dossier | ✅ Tout dans `MA1_v9_Final/` | Mélange déploiement Vercel + Railway | À séparer |
| `Dockerfile` (racine) | ✅ Build Next.js standalone (port 3000) | Si Railway pioche ce Dockerfile → backend = frontend (incorrect) | Documenter cible |
| `backend/Dockerfile` | ✅ Build FastAPI (port 8000) | OK | Cible Railway |
| `docker-compose.yml` | ✅ Lance les 2 services en local | OK dev | OK |
| `railway.json` | ❌ Absent | Railway en mode détection auto | À créer (force `backend/Dockerfile`) |
| `vercel.json` | ❌ Absent | OK (auto détection Next.js) | Optionnel |
| `node_modules/` | ❌ Pas dans le repo | OK | OK |
| `backend/__pycache__` | ❌ Pas dans le repo | OK | OK |
| `.gitignore` | ✅ Présent | Vérifier qu'il exclut `.env`, `node_modules`, `backend/.env`, `backend/data/*.json` (cache QCM) | À auditer |
| Secrets dans le repo | ❌ (`.env.example` n'a que des templates) | OK | OK |
| Variables Stripe / Resend / Anthropic | Backend uniquement (`backend/.env.example`) | OK | OK |
| `BACKEND_URL` côté Next.js | ✅ Variable env (proxy `app/api/*`) | OK | À renseigner avec URL Railway en prod |
| URL Railway hardcodée standalone (l.1214) | ⚠️ `'https://ma1-ton-assistant-de-la-route-production.up.railway.app'` | Pas exposable en cas de migration | À paramétrer via env (window injectable ou data-attribute) |
| API Next.js (`app/api/*`) = proxy uniquement | ✅ Pas de logique métier côté Vercel | OK | Garder |

### 4.2 Architecture cible recommandée

#### Option A — Mono-repo **avec dossiers séparés clairs** (recommandée à court terme — Sprint B léger)

```
MA1_v9_Final/                              # repo Git unique
├── apps/
│   ├── frontend/                          # Next.js
│   │   ├── app/
│   │   ├── components/
│   │   ├── public/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── e2e/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── vercel.json                    # à créer
│   │   └── .env.local.example
│   └── backend/                           # FastAPI (ex-dossier backend/)
│       ├── src/
│       ├── scripts/
│       ├── tests/
│       ├── data/
│       ├── index/
│       ├── requirements.txt
│       ├── start.sh
│       ├── Dockerfile
│       ├── railway.json                   # à créer
│       └── .env.example
├── docs/
│   ├── CLAUDE.md
│   ├── AUDIT_MA1_v9.md
│   ├── AUDIT_BETA_OUVERTE_MA1.md
│   ├── AUDIT_MA1_BETA_SUMUP_…OVH.md       # ce fichier
│   ├── ROADMAP_MA1_MARKET_LAUNCH.md
│   ├── SPRINT_0_RAPPORT_FIN.md
│   ├── INCIDENTS_ET_CONTROLES.md
│   ├── SUIVI_AUDIT_BETA_OUVERTE.md
│   └── LEGAL_TODO_DAMIEN.md
├── _archive/
├── docker-compose.yml                     # adapté
├── .gitignore
├── .github/workflows/ci.yml
└── README.md
```

**Avantages :**
- Aucune duplication Git (un seul repo, un seul historique).
- Vercel cible `apps/frontend/`, Railway cible `apps/backend/` → propre.
- Migration : `git mv` + ajustement chemins relatifs (~20 fichiers).
- Aucune fuite de secrets : `apps/backend/.env` n'est jamais buildé par Vercel.

**Inconvénients :**
- Refactor des `imports relative` dans backend si jamais présents (à vérifier).
- Vercel Project doit pointer "Root Directory = apps/frontend".
- Railway doit pointer "Root Directory = apps/backend".

#### Option B — 2 repos Git distincts (recommandée long terme — Sprint B lourd)

```
MA1-Frontend/ (Git repo 1) ───────── Vercel ─── https://ma1.com
MA1-Backend/  (Git repo 2) ───────── Railway ── https://api.ma1.com
```

**Avantages :**
- Isolation maximale (secrets, CI, droits Git).
- Possibilité d'ouvrir le backend en open-source/closed indépendamment.

**Inconvénients :**
- Double historique Git → migration plus lourde.
- Synchro des versions plus complexe.

#### Recommandation Sprint B

**Option A** (mono-repo `apps/`). Permet de boucler la sécu en moins de 4 heures sans perte d'historique. Le passage en Option B se fera plus tard si nécessaire.

### 4.3 Liste des fichiers à déplacer (Option A)

```
À déplacer vers apps/frontend/ :
  app/             components/      lib/        styles/        public/
  e2e/             package.json     next.config.js
  tailwind.config.js                tsconfig.json
  postcss.config.js                 playwright.config.ts
  Dockerfile (racine)               .env.local.example
  _archive/  (à laisser dans apps/frontend/ ou à la racine)

À déplacer vers apps/backend/ :
  backend/* → apps/backend/*  (un mv direct)

À garder à la racine :
  docs/      docker-compose.yml      .gitignore      .git/
  .github/   README.md
```

### 4.4 Imports à corriger après déplacement

- Aucun chemin absolu vers `backend/` dans Next.js (proxy `BACKEND_URL` géré par env).
- Aucun chemin absolu vers `frontend/` dans backend (aucun import croisé).
- `docker-compose.yml` à ajuster (`build: ./apps/frontend` au lieu de `build: .`).
- `.github/workflows/ci.yml` à ajuster (paths CI).
- README.md à ajuster.

→ Refactor estimé : ~30 min.

### 4.5 CORS à configurer

Backend `api.py` ligne 192 actuelle : `allow_origins=["*"]`. À changer en :

```python
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8000"
).split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)
```

Et configurer en Railway :
```
CORS_ALLOWED_ORIGINS=https://ma1.com,https://www.ma1.com,https://ma1-frontend.vercel.app,http://localhost:3000
```

---

## 5. Audit Railway

### 5.1 État Railway actuel

| Élément | Statut | Action |
|---|---|---|
| URL Railway | ✅ `https://ma1-ton-assistant-de-la-route-production.up.railway.app` (déclaré actif par Damien) | Confirmer en interne |
| Healthcheck endpoint | ✅ `/health` (api.py ligne 340 + 889) | Tester : `curl https://…/health` |
| `railway.json` | ❌ Absent | À créer (Sprint B) |
| Dockerfile cible Railway | ⚠️ Si pas de `railway.json`, Railway pioche le Dockerfile racine = build NEXT.JS au lieu du backend | **CRITIQUE** à clarifier |
| CORS autorisé | ❌ `*` actuellement | À restreindre (cf §4.5) |
| Variables d'env Railway | ❌ Inconnu si configurées | À auditer côté dashboard Railway |
| Logs | Standard Railway | Sentry à ajouter (Sprint G) |
| Domaine custom `api.ma1.X` | ❌ Non configuré | À créer Sprint F |
| Sécurité (rate limit / IP allow-list) | ❌ `slowapi` importé mais pas appliqué | Sprint G |
| Connexion Supabase | ⚠️ Code prêt (`get_supabase()` ligne 206) mais env probablement vide en Railway | À confirmer |
| Connexion Resend | ⚠️ Code prêt, env probablement vide en Railway | À confirmer |
| Connexion SumUp | ❌ Aucun code | À ajouter Sprint D |
| Persistance données | ❌ RAM (cf audit précédent) | À régler avec Supabase (Sprint C) |

### 5.2 Checklist variables d'environnement Railway (à renseigner)

| Variable | Valeur exemple | Critique |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | ✅ |
| `CLAUDE_MODEL` | `claude-sonnet-4-…` | ✅ |
| `SUPABASE_URL` | `https://<project>.supabase.co` | ✅ |
| `SUPABASE_ANON_KEY` | `eyJ…` | ✅ |
| `SUPABASE_SERVICE_KEY` (alias `SUPABASE_SERVICE_ROLE_KEY` côté dashboard Supabase) | `eyJ…` | ✅ |
| `JWT_SECRET` | 32+ chars random | ✅ **bloquant** |
| `JWT_EXPIRY_HOURS` | `168` | ⚠️ |
| `RESEND_API_KEY` | `re_…` | ✅ pour emails |
| `EMAIL_FROM` | `MA1 <noreply@ma1.com>` (à mettre à jour avec domaine final) | ✅ |
| `ADMIN_NOTIFICATION_EMAIL` | `damien.miyouna@gmail.com` | ✅ pour activations manuelles |
| `APP_URL` | `https://ma1.com` (ou `https://ma1.app` selon arbitrage) | ✅ |
| `FRONTEND_URL` | idem | ✅ |
| `BACKEND_URL` | `https://ma1-ton-assistant-de-la-route-production.up.railway.app` (ou custom `api.ma1.com`) | ✅ |
| `CORS_ALLOWED_ORIGINS` | `https://ma1.com,https://www.ma1.com,https://ma1-frontend.vercel.app` | ✅ **bloquant** |
| `PORT` | `8000` (ou fourni par Railway) | ⚠️ |
| `PAYMENT_PROVIDER` | `sumup_link_manual` | ✅ |
| `BETA_PAYMENT_MODE` | `manual` | ✅ |
| `BETA_ACCESS_DAYS` | `30` | ✅ |
| `BETA_PARTICULIER_PRICE` | `9` | ✅ |
| `BETA_AUTOECOLE_PRICE` | `200` | ✅ |
| `SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS` | `https://pay.sumup.com/...` | ✅ V1 |
| `SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS` | `https://pay.sumup.com/...` | ✅ V1 |
| `SUMUP_CLIENT_ID` | (vide en V1) | V2 |
| `SUMUP_CLIENT_SECRET` | (vide en V1) | V2 |
| `SUMUP_MERCHANT_CODE` | (vide en V1) | V2 |
| `SUMUP_WEBHOOK_SECRET` | (vide en V1) | V2 |
| `STRIPE_*` | Conserver mais marquer "désactivé en bêta" | ⚠️ |

### 5.3 `railway.json` à créer (Sprint B)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/backend/Dockerfile",
    "watchPatterns": ["apps/backend/**"]
  },
  "deploy": {
    "startCommand": "uvicorn src.api:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

À placer à la racine du repo après split Option A.

---

## 6. Audit Supabase et scripts SQL

### 6.1 Scripts SQL existants

| Script | Présent | Rôle |
|---|---|---|
| `backend/scripts/supabase_schema.sql` | ✅ (68 lignes) | Crée `users`, `profiles`, `analytics`, `autoecole_students`, RLS basique ouvert |

### 6.2 Tables nécessaires pour la bêta ouverte SumUp 30 jours

| Table | Présente | Manquante | Rôle | Priorité |
|---|---|---|---|---|
| `users` | ✅ | étendre | + `plan` étendu, + `access_status`, `paid_until`, `payment_provider`, `payment_reference`, `last_payment_at`, `role`, `school_id` | **P0** |
| `profiles` | ✅ | OK | Données de progression | — |
| `access_passes` | ❌ | **À créer** | Une ligne par achat 30 jours (audit + renouvellement) | **P0** |
| `payments` | ❌ | **À créer** | Audit trail des paiements (SumUp / autres) | **P0** |
| `payment_events` | ❌ | **À créer** | Raw events webhooks (V2) | P1 |
| `plans` | ❌ | À créer (option) | Référence prix / quotas (alternative à PLAN_LIMITS in-code) | P2 |
| `schools` | ❌ | **À créer** | Auto-écoles (owner_id, nom, quotas) | **P0** |
| `school_students` | ⚠️ Partiel | étendre | `autoecole_students` existe, refondre en `school_students` avec `school_id` FK | P0 |
| `qcm_attempts` | ❌ | À créer (option) | Historique QCM élèves (utile pour dashboard moniteur) | P1 |
| `exam_attempts` | ❌ | À créer (option) | Historique examens blancs | P1 |
| `ai_logs` | ❌ | **À créer** | Audit prompts/sorties IA (RGPD + qualité pédago) | P1 |
| `email_logs` | ❌ | **À créer** | Audit envois Resend (avec status, error, retry) | P1 |
| `notifications` | ❌ | À créer (option) | Notifications in-app | P2 |
| `feedback_reports` | ❌ | À créer | Signalement erreur QCM / réponse IA | P1 |
| `rgpd_exports` | ❌ | À créer | Historique demandes d'export | P1 |
| `deletion_requests` | ❌ | À créer | Historique demandes suppression compte | P1 |
| `activations_pending` | ❌ | **À créer** | File d'attente V1 paiement manuel | **P0** |
| `analytics` | ✅ | OK | Events utilisateurs | — |

### 6.3 Scripts SQL à créer (proposition de découpage)

| Script | Statut | Rôle |
|---|---|---|
| `001_extend_users.sql` | À créer | ALTER TABLE users (plan, access_status, paid_until, payment_provider, payment_reference, last_payment_at, role, school_id) |
| `002_create_access_passes_payments.sql` | À créer | CREATE access_passes, payments, payment_events, activations_pending |
| `003_create_schools_students.sql` | À créer | CREATE schools, refonte school_students (avec FK + max_students) |
| `004_create_qcm_exam_attempts.sql` | À créer (P1) | CREATE qcm_attempts, exam_attempts |
| `005_create_email_logs_notifications.sql` | À créer | CREATE email_logs, notifications |
| `006_create_feedback_rgpd.sql` | À créer (P1) | CREATE feedback_reports, rgpd_exports, deletion_requests |
| `007_enable_rls_policies.sql` | À créer | RLS strictes : USING (`auth.uid()::text = user_id`) sur toutes les tables sensibles |
| `008_create_indexes.sql` | À créer | Index sur `paid_until`, `email`, `school_id`, `created_at` |
| `009_seed_minimal.sql` | À créer (option) | Seed admin user pour debug |

### 6.4 RLS — modèle restrictif recommandé

```sql
-- Exemple type — à appliquer table par table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own" ON users
  FOR SELECT USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users update own" ON users
  FOR UPDATE USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Inscription : géré côté backend avec SUPABASE_SERVICE_KEY (bypass RLS)
-- Suppression : géré côté backend avec SUPABASE_SERVICE_KEY (cf RGPD)
```

### 6.5 Migration SQL prête à appliquer

> Voir `AUDIT_BETA_OUVERTE_MA1.md` §6.2 pour le détail des `ALTER TABLE` et `CREATE TABLE`. Ce rapport-ci confirme et étend la liste : `payment_events`, `email_logs`, `feedback_reports`, `rgpd_exports`, `deletion_requests`, `schools`, `school_students`.

**Ne pas appliquer sans backup** + sans `SELECT DISTINCT plan FROM users;` préalable pour vérifier qu'aucune ligne ne casserait la nouvelle contrainte CHECK.

---

## 7. Audit Resend et emails

### 7.1 État actuel Resend

| Élément | Statut | Détail |
|---|---|---|
| Package `resend>=0.7.0` | ✅ Installé | `backend/requirements.txt:15` |
| Import + setup | ✅ | `api.py:66-70`, `email_sequences.py:4-11` |
| `RESEND_API_KEY` | ⚠️ Dans `.env.example` (vide) | À renseigner Railway |
| `EMAIL_FROM` | ✅ Default `MA1 <noreply@ma1.app>` | À aligner avec domaine final |
| Domaine vérifié dans Resend | ❌ **À FAIRE** | `ma1.app` (ou `ma1.com`) doit être vérifié dans dashboard Resend |
| SPF / DKIM / DMARC | ❌ Configuration DNS à faire | Cf §8 |
| Templates existants | ✅ 8 templates répartis | Cf §7.2 |
| Logs envoi emails | ❌ `except: pass` partout (cf audit précédent) | À régler |
| Retry sur échec | ❌ Aucun mécanisme | À ajouter Sprint E |
| Table `email_logs` | ❌ Inexistante | À créer Sprint C |

### 7.2 Templates email existants vs nécessaires

| Email | Présent ? | Fichier | Statut | Priorité |
|---|---|---|---|---|
| **Particulier** | | | | |
| Confirmation création compte | ✅ `send_welcome_email` (api.py:799) + séquence J0 (`email_sequences.py:27-39`) | Doublon à fusionner | OK | — |
| Confirmation paiement 9 € | ❌ Absent | À créer | **P0** |
| Confirmation activation accès 30 jours | ❌ Absent | À créer | **P0** |
| Rappel J-7 avant expiration | ❌ Absent | À créer | **P0** |
| Rappel J-1 avant expiration | ❌ Absent | À créer | **P0** |
| Expiration accès | ❌ Absent | À créer | P1 |
| Renouvellement accès | ❌ Absent | À créer | P1 |
| Suppression compte | ❌ Absent | À créer | P1 |
| Export RGPD demandé | ❌ Absent | À créer | P1 |
| Streak en danger | ✅ `send_streak_reminder` (api.py:835) | OK | — |
| Rappel essai Premium 48h | ✅ `send_trial_reminder` (api.py:816) + séquence J5 | Désactiver pendant bêta (no trial) | P1 |
| Onboarding J1 / J3 / J7 | ✅ `email_sequences.py:40-72` | OK pour bêta | — |
| **Auto-école** | | | | |
| Confirmation création compte AE | ❌ Absent | À créer | **P0** |
| Confirmation paiement 200 € | ❌ Absent | À créer | **P0** |
| Activation espace AE | ❌ Absent | À créer | **P0** |
| Ajout élève (notif owner) | ❌ Absent | À créer | P1 |
| Rappel J-7 expiration AE | ❌ Absent | À créer | P0 |
| Rappel J-1 expiration AE | ❌ Absent | À créer | P0 |
| Expiration accès AE | ❌ Absent | À créer | P1 |
| Renouvellement AE | ❌ Absent | À créer | P1 |
| **Admin / chef de projet** | | | | |
| Nouveau compte créé | ❌ Absent | À créer | P1 |
| Nouveau paiement particulier | ❌ Absent | À créer | **P0** (sinon Damien ne sait pas quoi activer en V1) |
| Nouveau paiement auto-école | ❌ Absent | À créer | **P0** |
| Demande activation manuelle | ❌ Absent | À créer (déclenché par `/activation/request`) | **P0** |
| Erreur paiement | ❌ Absent | À créer | P1 |
| Erreur email Resend | ❌ Absent (catch silencieux) | À créer Sprint E | P1 |
| Demande suppression compte | ❌ Absent | À créer | P1 |
| Feedback utilisateur | ❌ Absent (et pas de table `feedback_reports`) | À créer | P1 |
| Signalement erreur QCM/IA | ❌ Absent | À créer | P1 |

### 7.3 Matrice événement → template

| Événement | Destinataire | Template | Déclencheur | Statut |
|---|---|---|---|---|
| Création compte | User + Admin | `welcome_user.html` + `admin_new_user.html` | POST /auth/register | Partiel (user OK, admin manquant) |
| Paiement reçu (manuel) | User + Admin | `payment_confirmed_user.html` + `admin_new_payment.html` | POST /activation/request | À créer |
| Activation accès | User + Admin | `activation_confirmed_user.html` + `admin_activation_done.html` | POST /admin/activations/:id/approve | À créer |
| J-7 avant expiration | User | `expiration_j7_user.html` | Cron quotidien | À créer |
| J-1 avant expiration | User | `expiration_j1_user.html` | Cron quotidien | À créer |
| Accès expiré | User | `expired_user.html` | Cron quotidien | À créer |
| Renouvellement effectué | User + Admin | `renewal_user.html` + `admin_renewal.html` | POST /admin/activations/:id/approve (renewal) | À créer |
| Création compte AE | Owner + Admin | `welcome_school.html` + `admin_new_school.html` | POST /auth/register (role=autoecole_owner) | À créer |
| Paiement AE reçu | Owner + Admin | `payment_school_user.html` + `admin_new_school_payment.html` | POST /activation/request (plan=beta_autoecole) | À créer |
| Élève ajouté | Owner | `student_added_school.html` | POST /dashboard/add-student | À créer (option) |
| Suppression compte demandée | Admin | `admin_delete_request.html` | DELETE /rgpd/delete/{user_id} | À créer |
| Export RGPD demandé | Admin (optionnel) + User | `rgpd_export_done_user.html` | GET /rgpd/export/{user_id} | À créer |
| Feedback / signalement | Admin | `admin_feedback.html` | POST /feedback (nouveau endpoint) | À créer |
| Erreur Resend | Admin (via alternate channel) | n/a | Catch raise | À créer |

### 7.4 Checklist domaine Resend vérifié

À faire dans le dashboard Resend (https://resend.com/domains) :

1. Ajouter le domaine (`ma1.com` ou `ma1.app` selon arbitrage final).
2. Récupérer les enregistrements DNS proposés par Resend :
   - **MX** pour `feedback-smtp.eu-west-1.amazonses.com` (selon région)
   - **TXT (SPF)** : `v=spf1 include:amazonses.com ~all`
   - **TXT (DKIM)** : généré par Resend, ex. `resend._domainkey`
   - **TXT (DMARC)** : `v=DMARC1; p=none; rua=mailto:dmarc@ma1.com`
3. Ajouter ces records côté OVH (cf §8).
4. Attendre validation Resend (5-30 min).
5. Tester envoi depuis `noreply@ma1.com`.

### 7.5 Variables d'env Resend

```
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=MA1 <noreply@ma1.com>     # ou EMAIL_FROM (alias)
RESEND_ADMIN_EMAIL=damien.miyouna@gmail.com  # destinataire admin notifs
RESEND_SUPPORT_EMAIL=contact@ma1.com         # destinataire support
```

---

## 8. Audit OVH / domaine

### 8.1 Constat

| Élément | Statut | Action |
|---|---|---|
| Domaine `ma1.com` | ⚠️ **Disponibilité non vérifiée** — peut être déjà pris | Damien à vérifier sur OVH/registar (à la commande) |
| Domaine `ma1.app` (utilisé dans le code) | ⚠️ Statut inconnu côté Damien | À confirmer |
| Alternatives à proposer | Cf §8.2 | — |
| Configuration DNS | ❌ Pas préparée | À faire |
| Liaison Vercel | ❌ À faire après achat | — |
| Liaison Railway (custom domain) | ❌ À faire | — |
| Resend DNS | ❌ À faire | Cf §7.4 |

### 8.2 Domaines alternatifs (proposition, ordre de préférence)

1. `ma1.com` — **idéal**, court, .com international. À vérifier OVH/Namecheap.
2. `ma1.app` — déjà utilisé dans le code (présomption qu'il est libre ou détenu). Vérifier auprès de Damien.
3. `ma1code.com` — explicite "Code de la route".
4. `ma1-code.fr` — version française.
5. `ma1.fr` — court, .fr (France target).
6. `ma1-permis.fr` — explicite "permis".
7. `ma1-route.fr` — explicite "route".
8. `ma1assistant.fr` — explicite "assistant".
9. `mon-ma1.fr` — possessif.
10. `ma1-app.com` — fallback si .com pris.

**Recommandation :** privilégier `ma1.com` ou `ma1.fr`. `.app` est techniquement bien (Google Registry, HTTPS forcé) mais hors-norme côté grand public.

### 8.3 Configuration DNS cible (chez OVH)

Si domaine final = `ma1.com` :

| Type | Nom | Valeur | TTL | Remarque |
|---|---|---|---|---|
| A | `@` | (IP Vercel auto via CNAME flatten OU Vercel A 76.76.21.21) | 3600 | Frontend |
| CNAME | `www` | `cname.vercel-dns.com.` | 3600 | Frontend |
| CNAME | `api` | `ma1-ton-assistant-de-la-route-production.up.railway.app.` | 3600 | Backend |
| TXT | `@` | `v=spf1 include:amazonses.com -all` (ou include Resend recommandé) | 3600 | Anti-spam |
| TXT | `resend._domainkey` | (clé DKIM générée Resend) | 3600 | DKIM Resend |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@ma1.com; ruf=mailto:dmarc@ma1.com; fo=1` | 3600 | DMARC |
| MX | `@` | `10 mx1.mail.ovh.net.` + `20 mx2.mail.ovh.net.` | 3600 | Si email OVH ; sinon n/a |
| CAA | `@` | `0 issue "letsencrypt.org"` | 3600 | Optionnel |

### 8.4 Checklist OVH (à la main par Damien)

- [ ] Acheter le domaine (OVH).
- [ ] Activer DNSSEC (optionnel mais recommandé).
- [ ] Ajouter A / CNAME pour Vercel (suivre doc Vercel).
- [ ] Ajouter CNAME `api` → Railway domain Railway.
- [ ] Récupérer DKIM Resend + ajouter en TXT.
- [ ] Ajouter SPF + DMARC.
- [ ] Vérifier propagation (24-48 h max, souvent < 1 h).
- [ ] Côté Vercel : ajouter `ma1.com` dans le projet + configurer redirect `www` → `ma1.com`.
- [ ] Côté Railway : ajouter `api.ma1.com` dans Settings → Networking → Custom domain.
- [ ] Côté Resend : ajouter le domaine puis "Verify".
- [ ] Mettre à jour `EMAIL_FROM` (Railway env) + `APP_URL` + `FRONTEND_URL` + `NEXT_PUBLIC_FRONTEND_URL` partout (code + env).
- [ ] Mettre à jour pages légales (mentions, CGU, CGV, confidentialité) : adresses email `dpo@ma1.com`, `contact@ma1.com`, etc.
- [ ] Sitemap + Robots.txt → bons URLs.
- [ ] OpenGraph images : URLs absolues `https://ma1.com/...`.
- [ ] Canonical URL : `<link rel="canonical" href="https://ma1.com/...">`.

### 8.5 Risque temporel

Acheter + configurer un domaine demande 1-3 heures de travail réel mais 24-48 h de propagation DNS dans le pire cas. **Ne pas l'engager le jour J de l'ouverture bêta.**

---

## 9. Audit sécurité (focus bêta SumUp)

| Risque | Statut | Correction recommandée | Priorité |
|---|---|---|---|
| Pas de secrets dans frontend | ✅ Vérifié grep | OK | — |
| Pas de Supabase service role côté client | ✅ Backend uniquement | OK | — |
| Pas de Resend key côté client | ✅ Backend uniquement | OK | — |
| Pas de SumUp key côté client | n/a (V1) ; à respecter en V2 | À veiller Sprint D | — |
| Premium activable via localStorage | ⚠️ Zustand `ma1-store-v8` + `S.plan='premium'` standalone | Backend doit re-vérifier à chaque requête | **P0** |
| `goPrem()` fake (`standalone:1372,1750,1757`) | ❌ Actif | Neutraliser (Sprint A) | **P0** |
| Accès 30 jours vérifié côté backend | ❌ `check_limit` ne lit aucune date | À implémenter (cf §6.3 du précédent rapport) | **P0** |
| Expiration non modifiable côté client | ⚠️ Aujourd'hui : non géré ; demain : `paid_until` doit être en DB, jamais en localStorage | Conception correcte Sprint D | **P0** |
| Admin sécurisé | ❌ Mot de passe en dur `ma1admin2026` client-side | Auth backend role-check | **P0** |
| CORS restreint | ❌ `*` | Restreindre cf §4.5 | **P0** |
| JWT robuste | ❌ Secret défaut si env vide | Refuser démarrage | **P0** |
| Routes RGPD protégées | ❌ Aucune auth | `@require_auth_user_match` | **P0** |
| Dashboard auto-école protégé | ❌ `/dashboard/{owner_id}` libre | Idem | **P0** |
| Rate limiting | ⚠️ `slowapi` importé mais pas appliqué via décorateurs | Appliquer sur `/auth/login`, `/chat`, `/qcm/generate`, `/vision`, `/activation/request` | **P0** |
| Logs erreurs | ❌ `except: pass` partout | Logger structuré (Sprint G) | P1 |
| Sanitize sortie IA (XSS) | ❌ `dangerouslySetInnerHTML` direct | DOMPurify | **P0** |
| Webhook SumUp signature | n/a V1 ; à implémenter V2 | Validation HMAC | P1 V2 |

---

## 10. Audit légal / RGPD

| Élément | Statut | Action |
|---|---|---|
| Paiement unique 30 jours en CGV | ❌ Couvre uniquement abo | Ajouter clause §11 (cf `AUDIT_BETA_OUVERTE_MA1.md` §7.3) |
| Absence d'abonnement automatique | ❌ CGV actuelles disent l'inverse | Mise à jour |
| Absence de renouvellement automatique | ❌ Idem | Mise à jour |
| Durée d'accès 30 jours | ❌ Non mentionnée | Ajouter |
| Expiration et conséquences | ❌ Non mentionnée | Ajouter |
| Paiement SumUp dans CGV | ❌ Stripe mentionné, pas SumUp | Renommer "prestataire de paiement sécurisé" + listing en politique de confidentialité |
| Emails transactionnels | ⚠️ Partiel (mentionne emails) | Préciser Resend dans politique de confidentialité |
| Données utilisateurs | ✅ Couvert | OK |
| Données mineurs | ⚠️ Mentionné en CGU §4 mais pas de procédure technique | Décision : exclure < 15 ans pendant bêta ? |
| Données auto-école | ❌ Non spécifique | Ajouter section AE |
| Suppression compte | ✅ Mentionnée | Sécuriser endpoint (P0) |
| Export RGPD | ✅ Mentionnée (Art. 20) | Sécuriser endpoint (P0) |
| Sous-traitant SumUp | ❌ Non listé | Ajouter à `confidentialite.html §4` |
| Sous-traitant Resend | ❌ Non listé | Ajouter à `confidentialite.html §4` |
| Sous-traitant Supabase | ✅ Mentionné (région eu-west) | Confirmer |
| Sous-traitant Railway | ❌ Non listé | Ajouter (US-based, SCCs à signer) |
| Sous-traitant Vercel | ✅ Mentionné | Confirmer |
| Sous-traitant Anthropic | ✅ Mentionné + SCCs | OK |
| Sous-traitant OVH | ❌ Non listé | À ajouter si OVH = registrar + DNS (basse criticité) |
| Droit de rétractation | ✅ §5 | OK |
| Remboursement | ✅ §5+§8 | OK |
| Facture | ✅ §7 | OK |
| Support | ⚠️ `contact@ma1.app` | Adapter au nouveau domaine |
| Placeholders légaux (SIRET, RCS, adresse, ville tribunaux, médiateur, DPO addr) | ❌ Non remplis | **À faire Sprint A — voir LEGAL_TODO_DAMIEN.md** |
| Mensonge FAQ landing "données restent sur l'appareil" | ❌ Présent | À corriger (cf audit précédent) |
| AggregateRating fictif JSON-LD | ❌ Présent | À retirer |

---

## 11. Roadmap de correction

### Sprint A — Finalisation parcours client (J+1 à J+4)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| A.1 Neutraliser `goPrem()` + fallbacks | `public/index-standalone.html:1372, 1750, 1757` | Élimine fraude | Faible | **P0** |
| A.2 Page `/pricing-beta` (Next.js) | `app/pricing-beta/page.tsx` (nouveau) | Tunnel commercial | Faible | **P0** |
| A.3 Page `/activation` (Next.js) | `app/activation/page.tsx` (nouveau) | Réception post-paiement | Faible | **P0** |
| A.4 Mise à jour landing CTAs et libellés | `app/landing/page.tsx` | Cohérence offre bêta | Faible | **P0** |
| A.5 Bandeau "Version bêta" persistant | `components/ui/BetaBanner.tsx` (nouveau) + `app/layout.tsx` | Transparence | Faible | P1 |
| A.6 Compteur "X jours restants" header | `components/ui/Header.tsx` | UX | Faible | P1 |
| A.7 Documentation `CLAUDE.md` §5 mise à jour | `CLAUDE.md` | Source de vérité | Faible | P1 |

### Sprint B — Séparation backend / frontend (J+4 à J+5)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| B.1 Décision Option A (mono-repo `apps/`) | Documentation | Cible architecture | Faible | **P0** |
| B.2 `git mv` vers `apps/frontend/` et `apps/backend/` | Tout le repo | Refactor | Moyen | **P0** |
| B.3 `railway.json` à la racine | `railway.json` (nouveau) | Build Railway prévisible | Faible | **P0** |
| B.4 `vercel.json` éventuel | `vercel.json` (nouveau, optionnel) | Build Vercel forcé sur `apps/frontend/` | Faible | P1 |
| B.5 `docker-compose.yml` ajusté | `docker-compose.yml` | Dev local | Faible | P1 |
| B.6 `.github/workflows/ci.yml` ajusté | CI | CI verte | Moyen | P1 |
| B.7 README + arborescence | `README.md` | Onboarding contributeurs | Faible | P2 |

### Sprint C — Supabase SQL et persistance (J+5 à J+8)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| C.1 `001_extend_users.sql` | `apps/backend/scripts/migrations/` | Schéma | Faible | **P0** |
| C.2 `002_create_access_passes_payments.sql` | idem | Schéma paiements | Moyen | **P0** |
| C.3 `003_create_schools_students.sql` | idem | Schéma AE | Moyen | **P0** |
| C.4 `004_create_qcm_exam_attempts.sql` | idem | Historique QCM | Moyen | P1 |
| C.5 `005_create_email_logs_notifications.sql` | idem | Traçabilité emails | Moyen | P1 |
| C.6 `006_create_feedback_rgpd.sql` | idem | RGPD + feedback | Moyen | P1 |
| C.7 `007_enable_rls_policies.sql` | idem | Sécurité | Moyen | **P0** |
| C.8 `008_create_indexes.sql` | idem | Perf | Faible | P1 |
| C.9 Refactor backend pour lecture/écriture Supabase systématique (plus RAM-only) | `apps/backend/src/api.py` | Persistance réelle | **Élevé** (1-2 j) | **P0** |
| C.10 Logique `check_limit` étendue avec `paid_until` | `apps/backend/src/api.py` | Expiration | Moyen | **P0** |
| C.11 Backup automatique quotidien Supabase | infra | Sauvegarde | Faible (config) | P1 |

### Sprint D — Paiement SumUp 30 jours (J+8 à J+12)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| D.1 Récupération des 2 liens SumUp (côté Damien) | n/a | Prérequis | Faible | **P0** |
| D.2 Variables env (Frontend + Railway) | `.env.local.example`, `apps/backend/.env.example` | Conf | Faible | **P0** |
| D.3 Endpoint `POST /activation/request` (V1) | `apps/backend/src/api.py` | Soumission demande | Faible | **P0** |
| D.4 Endpoint admin `POST /admin/activations/:id/approve` | idem | Activation manuelle | Moyen | **P0** |
| D.5 Page admin `/admin/activations` (auth role=admin) | `app/admin/activations/page.tsx` (nouveau) | Tableau pending → approuver | Moyen | **P0** |
| D.6 V2 (option) Webhook SumUp `POST /payment/webhook/sumup` | `apps/backend/src/api.py` | Auto | Élevé | P1 V2 |
| D.7 V2 (option) Endpoint `POST /payment/create-sumup-session` | idem | Création link dynamique | Moyen | P1 V2 |
| D.8 Frontend : bouton "Renouveler" sur `/settings` | `app/settings/page.tsx` | UX renouvellement | Faible | P1 |
| D.9 Tests E2E paiement (sandbox SumUp) | `e2e/payment.spec.ts` (nouveau) | Validation | Élevé | P1 |

### Sprint E — Resend et emails transactionnels (J+12 à J+15)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| E.1 Vérification domaine Resend | dashboard Resend | Délivrabilité | Faible | **P0** |
| E.2 DNS SPF / DKIM / DMARC (chez OVH) | dashboard OVH | Délivrabilité | Faible | **P0** |
| E.3 Templates emails manquants (cf §7.2) | `apps/backend/src/emails/` (nouveau dossier) | Communications | Moyen | **P0** |
| E.4 Service `email_service.py` avec logger + retry | `apps/backend/src/email_service.py` | Robustesse | Moyen | P1 |
| E.5 Logs `email_logs` table | DB Sprint C | Traçabilité | Faible | P1 |
| E.6 Test envoi sandbox Resend | manuel | Validation | Faible | **P0** |
| E.7 Email admin notification (activation pending) | template `admin_new_payment.html` | Workflow manuel | Faible | **P0** |
| E.8 Cron quotidien J-7 / J-1 / expiration | `apps/backend/src/scheduler.py` | Rappels | Moyen | **P0** |

### Sprint F — Domaine OVH et DNS (J+15 à J+17)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| F.1 Achat domaine `ma1.com` (ou alternative) | OVH | Identité | Faible | **P0** |
| F.2 Configuration DNS (A, CNAME, SPF, DKIM, DMARC, MX) | OVH | Service | Faible | **P0** |
| F.3 Liaison Vercel | dashboard Vercel | Frontend live | Faible | **P0** |
| F.4 Liaison Railway custom domain `api.ma1.com` | dashboard Railway | Backend live propre | Faible | **P0** |
| F.5 Mise à jour `EMAIL_FROM`, `APP_URL`, etc. | Railway env | Cohérence | Faible | **P0** |
| F.6 Mise à jour pages légales (emails @ma1.com) | `public/legal/*.html` | Cohérence | Faible | P1 |
| F.7 Sitemap + robots avec nouveau domaine | `app/sitemap.ts`, `app/robots.ts` | SEO | Faible | P1 |
| F.8 OpenGraph absolute URLs | `app/landing/page.tsx`, `app/layout.tsx` | SEO | Faible | P2 |

### Sprint G — Sécurité bêta ouverte (J+17 à J+20)

(Reprend les P0 Sprint 1 ROADMAP existante + spécificités bêta)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| G.1 `@require_auth` sur endpoints sensibles (cf §5 sécu) | `apps/backend/src/api.py` | Sécu | Moyen | **P0** |
| G.2 CORS restreint via env | `apps/backend/src/api.py` | Sécu | Faible | **P0** |
| G.3 JWT_SECRET refus démarrage si défaut | `apps/backend/src/api.py` | Sécu | Faible | **P0** |
| G.4 Admin auth backend role-check | `apps/backend/src/api.py` + `app/admin/page.tsx` | Sécu | Moyen | **P0** |
| G.5 Sanitize IA outputs (DOMPurify) | `ChatPanel.tsx`, `VisionPanel.tsx` | XSS | Faible | **P0** |
| G.6 Rate limiting effectif (slowapi) | `apps/backend/src/api.py` | Sécu | Faible | **P0** |
| G.7 RLS Supabase strictes (Sprint C.7) | DB | Sécu | (cf C.7) | **P0** |
| G.8 Sentry frontend + backend | conf | Observabilité | Faible | P1 |

### Sprint H — Tests complets et Go / No-Go (J+20 à J+22)

| Tâche | Fichier concerné | Impact | Difficulté | Priorité |
|---|---|---|---|---|
| H.1 E2E "Particulier → paiement → activation → 30 jours → expiration" | `e2e/` | Validation | Élevé | **P0** |
| H.2 E2E "Auto-école → paiement → dashboard → ajout élève → expiration" | `e2e/` | Validation | Élevé | **P0** |
| H.3 Test SumUp sandbox | manuel + script | Validation | Moyen | **P0** |
| H.4 Test envoi tous templates Resend | manuel | Validation | Moyen | **P0** |
| H.5 Audit Lighthouse landing (≥ 90 / 90 / 90 / 90) | manuel | Qualité | Faible | P1 |
| H.6 Pentest minimaliste (try forge JWT, try access other user_id, etc.) | manuel | Sécu | Moyen | **P0** |
| H.7 Décision Go / No-Go d'ouverture | meeting | Validation | n/a | **P0** |
| H.8 Communiqué d'ouverture (LinkedIn, Discord moniteurs, base existante) | comm | Lancement | Faible | P1 |

---

## 12. Verdict final

| Question | Réponse |
|---|---|
| MA1 peut-il ouvrir une bêta gratuite maintenant ? | ⚠️ **Privée fermée OUI** après Sprint A (24-48h) ; publique **NON** sans Sprint B+C+G complets. |
| MA1 peut-il accepter les paiements SumUp maintenant ? | ❌ **NON.** 0 ligne d'intégration SumUp dans le code. Compter Sprint D minimum + Sprint A/B/C/E préalables. |
| MA1 peut-il activer les accès 30 jours automatiquement maintenant ? | ❌ **NON.** Aucune logique d'expiration n'existe (ni en backend ni en DB). |
| MA1 doit-il commencer avec activation manuelle ? | ✅ **OUI, fortement recommandé.** V1 manuelle = 2-3 j dev vs 10-12 j auto. Bascule auto après 20-30 paiements/mois. |

### Les 10 éléments à corriger avant ouverture bêta ouverte

| # | Élément | Sprint | Effort |
|---|---|---|---|
| 1 | Neutraliser `goPrem()` standalone + fallbacks | A | 15 min |
| 2 | Auth backend sur endpoints user-scoped (`/rgpd/*`, `/dashboard/*`, `/profile/*`, `/whitelabel/*`) | G | 1 j |
| 3 | CORS restreint via env + JWT_SECRET refus démarrage si défaut | G | 30 min |
| 4 | Persistance Supabase réelle (plus RAM-only) | C | 1-2 j |
| 5 | Migration SQL : `paid_until`, `access_status`, `payment_provider`, `payment_reference`, `last_payment_at`, `role`, tables `activations_pending` + `payments` + `schools` | C | 30 min + backup |
| 6 | CGV nouvelle clause §11 "Offre Bêta — Paiement unique 30 j" (relecture juridique) | A | 1-2 j |
| 7 | Liens SumUp (2 × Payment Links) + variables env | D | 1 j (Damien côté SumUp) + 30 min dev |
| 8 | Page `/pricing-beta` + `/activation` + admin `/admin/activations` (auth role-check backend) | A + D | 2 j |
| 9 | Templates Resend manquants (paiement confirmé, activation, J-7, J-1, expiration, admin notifs) | E | 1 j |
| 10 | Domaine `ma1.com` (ou alternative) acheté + DNS + Vercel + Railway custom + Resend vérifié + SPF/DKIM/DMARC | F | 1 j + 24-48 h propagation |

**Total effort estimé pour ouverture bêta payante SumUp V1 manuelle :** ~10-14 jours de dev + 24-48 h de propagation DNS + relecture juridique.

---

## Annexe A — Récapitulatif variables d'environnement

### Frontend (`.env.local` + `.env.local.example`)
```
NEXT_PUBLIC_API_URL=https://api.ma1.com    # ou .app, ou URL Railway pendant transition
NEXT_PUBLIC_APP_URL=https://ma1.com
NEXT_PUBLIC_FRONTEND_URL=https://ma1.com
NEXT_PUBLIC_SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=
NEXT_PUBLIC_SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=
NEXT_PUBLIC_BETA_BANNER=true
NEXT_PUBLIC_BETA_ACCESS_DAYS=30
NEXT_PUBLIC_BETA_PARTICULIER_PRICE=9
NEXT_PUBLIC_BETA_AUTOECOLE_PRICE=200
BACKEND_URL=https://api.ma1.com            # proxy serveur Next.js
```

### Backend (`backend/.env` + `apps/backend/.env.example`)
```
# Anthropic
ANTHROPIC_API_KEY=sk-ant-…
CLAUDE_MODEL=claude-sonnet-4-…

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ…
SUPABASE_SERVICE_KEY=eyJ…      # alias service role

# JWT
JWT_SECRET=<32+ chars random>
JWT_EXPIRY_HOURS=168

# Resend
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=MA1 <noreply@ma1.com>
RESEND_ADMIN_EMAIL=damien.miyouna@gmail.com
RESEND_SUPPORT_EMAIL=contact@ma1.com
EMAIL_FROM=MA1 <noreply@ma1.com>   # alias rétro-compat

# App
APP_URL=https://ma1.com
FRONTEND_URL=https://ma1.com
BACKEND_URL=https://api.ma1.com
CORS_ALLOWED_ORIGINS=https://ma1.com,https://www.ma1.com,https://ma1-frontend.vercel.app,http://localhost:3000
PORT=8000
ADMIN_NOTIFICATION_EMAIL=damien.miyouna@gmail.com

# Bêta paiement
PAYMENT_PROVIDER=sumup_link_manual
BETA_PAYMENT_MODE=manual
BETA_ACCESS_DAYS=30
BETA_PARTICULIER_PRICE=9
BETA_AUTOECOLE_PRICE=200
SUMUP_PAYMENT_LINK_PARTICULIER_30_DAYS=
SUMUP_PAYMENT_LINK_AUTOECOLE_30_DAYS=

# Si V2 SumUp API/webhook
SUMUP_CLIENT_ID=
SUMUP_CLIENT_SECRET=
SUMUP_MERCHANT_CODE=
SUMUP_WEBHOOK_SECRET=

# Stripe (à désactiver / commenter pendant la bêta)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PREMIUM_PRICE_ID=
# STRIPE_AUTOECOLE_PRICE_ID=
# STRIPE_ANNUAL_PRICE_ID=
```

---

## Annexe B — Cohérence avec les autres documents

- `AUDIT_MA1_v9.md` — fondations, reste valide.
- `AUDIT_BETA_OUVERTE_MA1.md` — focus paiement 30 j + agnostique prestataire.
- **Ce rapport** — focus opérationnel SumUp + Railway + Supabase + Resend + OVH.
- `CLAUDE.md` — à mettre à jour Sprint A (offre bêta).
- `ROADMAP_MA1_MARKET_LAUNCH.md` — à enrichir avec ces 8 sprints A-H avant les sprints de lancement Premium long terme.
- `SPRINT_0_RAPPORT_FIN.md` — Sprint 0 archive.
- `INCIDENTS_ET_CONTROLES.md` — méthodes anti-régression appliquées.
- `SUIVI_AUDIT_BETA_OUVERTE.md` — suivi vivant.
- `LEGAL_TODO_DAMIEN.md` — fichier dédié aux infos juridiques à fournir par Damien (cf livraison séparée).

---

*Aucun fichier de code applicatif modifié pendant cet audit. À valider par Damien avant tout démarrage des sprints A-H.*

— FIN DU RAPPORT — marker_eof_AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH
