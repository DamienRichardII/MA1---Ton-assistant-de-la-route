# AUDIT MA1 — PRÉPARATION BÊTA OUVERTE + PAIEMENT 30 JOURS

> Audit en mode lecture seule. Aucun fichier de code applicatif modifié.
> Trois livrables documentaires créés : ce rapport, `SUIVI_AUDIT_BETA_OUVERTE.md`, `INCIDENTS_ET_CONTROLES.md`.
> Conforme `Damcompany-code-guardrails.md` + `CLAUDE.md`.
> Date : 2026-05-20 · Auteur : Claude Cowork

---

## 1. Résumé exécutif

**Objectif visé :** ouvrir une bêta publique contrôlée avec deux liens de paiement carte bancaire pour 30 jours d'accès (Particulier 9 €, Auto-école 200 €), sans abonnement automatique.

**Verdicts directs :**

| Question | Réponse |
|---|---|
| MA1 est-il prêt pour une bêta ouverte ? | ❌ **NON en l'état.** Plusieurs blocants P0 sécurité + commerciaux + légaux à régler avant ouverture publique. Une bêta privée fermée reste envisageable après 3-4 corrections rapides. |
| MA1 peut-il accepter des paiements carte bancaire 30 jours ? | ⚠️ **Pas nativement.** Le code Stripe actuel est en `mode="subscription"` (abonnement récurrent), pas en paiement unique. La logique d'expiration n'existe ni en backend (`check_limit` ne regarde aucune date), ni en base (`supabase_schema.sql` sans `paid_until`). Mais l'intégration de 2 liens de paiement externes est faisable rapidement. |
| L'accès 30 jours peut-il être géré automatiquement ? | ⚠️ **Pas en l'état.** Nécessite : (a) ajout colonnes `paid_until` + `access_status` en DB, (b) job ou check à chaque requête, (c) webhook Stripe en `payment` (non subscription) OU API webhook fournie par Payment Link. Faisable Sprint C (3-5 j). |
| L'accès 30 jours doit-il être géré manuellement au départ ? | ✅ **OUI, recommandé.** V1 semi-manuel : Damien active depuis Supabase / admin minimaliste. Permet d'ouvrir la bêta en 2-3 jours, sans webhook, sans dépendance Stripe complète. V2 automatisé en Sprint C. |
| Blocants P0 avant ouverture (peu importe paiement) | (1) Endpoints backend `/rgpd/*`, `/profile/*`, `/dashboard/*` sans auth — Sprint 1 en cours. (2) `goPrem()` fake côté standalone — toujours actif. (3) Mot de passe admin en dur dans le bundle client. (4) Placeholders légaux non remplis. (5) CGV uniquement orientées "abonnement" — incompatible avec le modèle "paiement unique 30 jours". |
| Blocants P1 avant paiement | (1) Schéma Supabase à étendre (`paid_until`, `access_status`, `payment_provider`, `payment_reference`). (2) Page `/activation` à créer. (3) Webhook ou processus manuel d'activation. (4) Compteur "il reste X jours" côté UI. (5) Email confirmation + email J-3 expiration. |

### 5 corrections prioritaires AVANT ouverture bêta

1. **Désactiver / neutraliser** `goPrem()` ligne ~1372 du standalone + son fallback ligne 1750 qui active Premium en local si Stripe down.
2. **Auth backend** sur `/dashboard/*`, `/rgpd/*`, `/profile/*`, `/whitelabel/*` (sinon n'importe qui peut accéder à n'importe quel dashboard auto-école payé).
3. **CGV bêta ouverte** : nouvelle clause "Paiement unique 30 jours, sans renouvellement automatique" — remplace ou s'ajoute aux clauses actuelles d'abonnement.
4. **Schéma Supabase étendu** : ajout de `plan`, `access_status`, `paid_until`, `payment_provider`, `payment_reference`, `last_payment_at`. Migration SQL à fournir.
5. **2 liens de paiement** comme variables d'env (`PAYMENT_LINK_PARTICULIER_30_DAYS`, `PAYMENT_LINK_AUTOECOLE_30_DAYS`) + bouton CTA "Débloquer 30 jours" + page `/activation` (saisie email pour activation manuelle V1).

---

## 2. État actuel du paiement

### 2.1 Tableau

| Élément | Statut actuel | Réel / fictif | Risque | Priorité |
|---|---|---|---|---|
| Stripe SDK Python | Installé (`stripe>=8.0.0` dans `backend/requirements.txt`) | Réel | OK | — |
| `STRIPE_SECRET_KEY` (backend env) | Présent dans `backend/.env.example` (vide) | Vide par défaut | Si non configuré → fallback `goPrem()` fake | **P0** |
| `STRIPE_WEBHOOK_SECRET` | Présent dans `backend/.env.example` | Vide par défaut | Webhook non signé valide ⇒ ouvert à attaques | **P0** |
| `STRIPE_PREMIUM_PRICE_ID` | Dans `.env.example` | Vide | OK config attendue | — |
| `STRIPE_AUTOECOLE_PRICE_ID` | Dans `.env.example` | Vide | OK config attendue | — |
| `STRIPE_ANNUAL_PRICE_ID` | **MANQUANT** dans `.env.example` mais utilisé dans `api.py:111` | Code l'attend, env ne le déclare pas | Plan annuel inutilisable | P1 |
| Endpoint `/stripe/checkout` (`api.py:563-572`) | Présent | Réel mais **mode subscription uniquement** | Pas adapté au modèle "30 jours sans renouvellement" | **P0** |
| Endpoint `/stripe/webhook` (`api.py:574-588`) | Présent, gère `checkout.session.completed` uniquement | Réel | Pas de `customer.subscription.deleted`, pas de `invoice.payment_failed`, pas de `payment_intent.succeeded` | **P0** |
| Page Premium / pricing UI Next.js | `app/landing/page.tsx` PRICING array | Réel mais CTAs vers `/index-standalone.html` (Sprint 0) | Pas de tunnel paiement Next.js direct | P1 |
| `goPrem()` standalone | `public/index-standalone.html:1372` | **FAKE** : `S.plan='premium'; alert('🎉 Premium active ! (Integrez Stripe)')` | **Fraude possible** : n'importe qui clique → Premium | **P0** |
| `stripeCheckout()` standalone | `public/index-standalone.html:1745-1768` | Branchée à `/stripe/checkout` mais fallback `goPrem()` si erreur | **Critique** : si Stripe down OU si l'utilisateur bloque le réseau OU si CORS échoue → Premium fake | **P0** |
| Webhook URL prod | Non documentée | Inconnu | Doit être déclarée dans le dashboard Stripe | P1 |
| Page de portail client (Stripe Customer Portal) | Absent | Fictif | Pas de gestion résiliation, factures, méthode de paiement | P1 |
| Logique d'expiration (`paid_until`) | **Inexistante** | Fictif | Plan activé = actif éternellement | **P0** pour modèle 30 jours |
| Statut "expired" / "trial" | **Inexistant** | Fictif | Pas de différenciation | P0 pour modèle 30 jours |
| Champ `payment_reference` | **Inexistant** en DB | Fictif | Impossible de tracer un paiement | P1 |
| Champ `payment_provider` | **Inexistant** | Fictif | Pas de séparation Stripe / PayPal / SumUp / manuel | P1 |
| Stripe Payment Links | Non utilisés | n/a | C'est la solution recommandée pour cette bêta | — |
| PayPal | Non intégré | n/a | Alternative possible | — |
| SumUp | Non intégré | n/a | Alternative possible | — |
| Email confirmation paiement | Pas spécifique : `send_welcome_email` existe mais pas pour le paiement | Fictif | À ajouter Sprint C | P1 |
| Page `/activation` | **Inexistante** | Fictif | À créer en Sprint B | **P0** pour modèle semi-manuel |
| Compteur "il reste X jours" côté UI | **Inexistant** | Fictif | Mauvaise UX | P1 |
| Email J-3 avant expiration | **Inexistant** | Fictif | À ajouter Sprint C | P2 |

### 2.2 Lecture du code clé

**`backend/src/api.py` PLAN_LIMITS (lignes 102-107) :**

```python
PLAN_LIMITS = {
    "free":      {"questions_per_day": 10,  "qcm_per_month": 80,    "exam_per_month": 1},
    "premium":   {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
    "autoecole": {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
    "annual":    {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
}
```

→ Aucune notion de durée. Aucun champ `expires_at`.

**`backend/src/api.py` check_limit (lignes 297-302) :**

```python
def check_limit(uid, action):
    u = get_usage(uid)
    lim = PLAN_LIMITS.get(u.get("plan","free"), PLAN_LIMITS["free"])
    ...
```

→ Récupère le plan, applique les quotas. **N'AUCUNE vérification de date.** Si plan = `premium`, ça reste premium pour toujours.

**`backend/src/api.py` Stripe checkout (ligne 570) :**

```python
session=stripe.checkout.Session.create(
  payment_method_types=["card"],
  line_items=[{"price":price_id,"quantity":1}],
  mode="subscription",   # ← ABONNEMENT RÉCURRENT
  ...
)
```

→ Pour un paiement "30 jours unique", il faudrait `mode="payment"` (one-time) ou utiliser un **Stripe Payment Link** externe.

**`public/index-standalone.html` lignes 1745-1768 :**

```js
async function stripeCheckout(plan){
  try{
    const r=await fetch(`${API}/stripe/checkout?user_id=${S.userId}&plan=${plan}`,{method:'POST'});
    if(!r.ok){
      const e=await r.json();
      if(r.status===503){goPrem();return}// Stripe not configured, fallback to demo
      throw new Error(e.detail||'Erreur');
    }
    const d=await r.json();
    if(d.checkout_url)window.location.href=d.checkout_url;
  }catch(e){
    console.log('Stripe non dispo, mode demo');
    goPrem();   // ← FRAUDE : si fetch échoue, Premium gratuit
  }
}
```

→ **Critique** : un utilisateur qui bloque le réseau ou exploite un délai serveur peut déclencher `goPrem()` et obtenir Premium gratuit. Sécurité : 0/10.

---

## 3. Audit des offres

### 3.1 Inventaire complet des offres présentes dans le projet

| Source | Plans listés | Tarif | Modèle | Remarque |
|---|---|---|---|---|
| `app/landing/page.tsx` (canonique Sprint 0) | Gratuit / Premium / Annuel / Auto-école | 0 € / 10 €/mois / 79 €/an / 200 €/mois | Abo | "7 jours d'essai gratuit" Premium |
| `public/index-standalone.html` (modal pricing l.1196-1198) | Gratuit / Premium / Auto-École | 0 € / 10 €/mois / 200 €/mois | Abo | Pas d'annuel ; "7 jours gratuits →" |
| `_archive/landingpage.html` (archivé Sprint 0) | Gratuit / Premium / Annuel / Auto-école | 0 / 10 / 79 / 200 | Abo | Mort, redirigé |
| `public/legal/cgv.html` (l.20-21) | Premium / Auto-École | 10 €/mois / 200 €/mois | **Abo mensuel récurrent** | Annuel ABSENT |
| `public/legal/cgu.html` (l.49-51) | Gratuit / Premium / Auto-École | 10 €/mois / 200 €/mois | Abo | Annuel ABSENT |
| `backend/src/api.py` PLAN_LIMITS | free / premium / autoecole / annual | n/a | Quota uniquement | 4 plans |
| `backend/src/api.py` PRICING | free / premium / annual / autoecole | 0 / 10 / 79 / 200 € | Abo (Stripe subscription) | 4 plans |
| `backend/src/api.py` endpoint /pricing | free / premium / annual / autoecole | 0 / 10 / 79 / 200 € | Abo | "trial_days: 7" sur Premium |
| `lib/store.ts` setUser | free / premium / autoecole (annual absent) | n/a | Quota client | 3 plans (incohérence avec backend) |
| `backend/scripts/supabase_schema.sql` | `CHECK (plan IN ('free', 'premium', 'autoecole'))` | n/a | DB | **3 plans seulement** — `'annual'` violerait la contrainte ! |
| `app/settings/page.tsx` (l.57) | free → "Gratuit", premium → "Premium (10€/mois)", autre → "Auto-École (200€/mois)" | n/a | Affichage texte | Pas de gestion expiration |

### 3.2 Modèle "paiement unique 30 jours" : présence actuelle dans le code

**AUCUNE.** Le modèle 30 jours unique n'existe nulle part. Tout le code est orienté abonnement récurrent.

### 3.3 Proposition d'offre bêta ouverte harmonisée

> À valider avant tout dev. Si validée, sera la **source canonique** pendant la bêta ouverte (à ajouter dans `CLAUDE.md` §5 et faire passer en CGV).

#### Gratuit (inchangé)
- **Prix :** 0 €.
- **Quotas :** 10 questions IA / jour, QCM adaptatifs illimités sur 9 thèmes, 1 examen blanc / mois.
- **Objectif :** découverte du produit, tunnel d'acquisition.
- **Pas de carte bancaire requise.**

#### Particulier — 9 € / 30 jours (NOUVEAU plan bêta)
- **Prix :** 9 € TTC, paiement unique par carte bancaire (lien externe).
- **Durée :** **30 jours calendaires** à compter de l'activation par l'équipe MA1.
- **Accès :** chat IA illimité (fair use 200 q/j), QCM illimités sur tous les thèmes (y compris eco / moto / nuit), examens blancs illimités, vision panneaux, plan 30 jours, export PDF rapport.
- **Renouvellement :** **manuel uniquement.** Pas de prélèvement automatique. Email J-3 avant expiration suggérant le renouvellement.
- **Expiration :** retour automatique au plan Gratuit. Données conservées 3 ans (cohérent CGU §5).
- **Code interne (proposition) :** `plan = 'beta_premium'`.

#### Auto-école — 200 € / 30 jours (NOUVEAU plan bêta B2B)
- **Prix :** 200 € TTC, paiement unique par carte bancaire (lien externe).
- **Durée :** 30 jours calendaires.
- **Accès :** dashboard moniteur, **jusqu'à 30 élèves inclus** (à ENFORCER côté backend, cf §6), suivi progression, notes moniteur, groupes/promotions, export PDF/CSV, white-label si réellement fonctionnel (sinon retirer de l'offre).
- **Renouvellement :** **manuel uniquement.** Email J-7 avant expiration.
- **Expiration :** retour à statut `expired` (lecture seule dashboard pendant 7 jours, puis fermeture).
- **Code interne (proposition) :** `plan = 'beta_autoecole'`.

#### À retirer / suspendre pendant la bêta ouverte
- **Premium 10 €/mois récurrent** : à retirer ou marquer "Bientôt disponible" (sera réintroduit après bêta).
- **Premium Annuel 79 €** : à retirer (pas couvert par CGV, viole le schéma Supabase).
- **Essai gratuit 7 jours** : retiré pendant la bêta (incompatible avec paiement unique).

---

## 4. Audit UX du tunnel de paiement

### 4.1 État actuel

| Étape | Standalone v7 | Next.js v8 |
|---|---|---|
| L'utilisateur clique sur "Passer Premium" | Ouvre modal pricing (`openPricing`) → bouton "7 jours gratuits →" appelle `goPrem()` (fake) OU `stripeCheckout('premium')` après patch ligne 1761 | CTA landing pointe vers `/index-standalone.html` (cf Sprint 0) — pas de flux propre dans Next.js |
| Ce qu'il voit avant paiement | Modal pricing avec 3 cartes (Gratuit / Premium / Auto-École). Aucune mention "30 jours" ni "sans abonnement" | Section pricing landing avec 4 cartes |
| Paiement effectif | Stripe Checkout subscription OU `goPrem()` fake | Inexistant côté Next.js |
| Ce qu'il voit après paiement | Redirige sur `/?checkout=success&plan=…` → JS détecte param → met `S.plan` localement, addXP, confetti | Inexistant |
| Activation de l'accès | Côté backend : webhook `checkout.session.completed` met `_users[email]['plan'] = plan` en RAM (perdu au reboot) ; côté frontend : `S.plan = 'premium'` en localStorage | n/a |
| "Il reste X jours" | **Aucune indication** | n/a |
| Renouvellement | **Aucun mécanisme** (et serait automatique en cas d'abo récurrent, ce qui contredit le modèle bêta) | n/a |
| Support paiement fait / accès non activé | Email `contact@ma1.app` (manuel, pas de système de ticket) | idem |

**Verdict UX actuel :** tunnel cassé, pas adapté à un modèle 30 jours, fraude possible (`goPrem()`).

### 4.2 Tunnel recommandé — V1 semi-manuel (à viser pour ouverture bêta J0)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Page /landing                                                    │
│    Bouton "Débloquer 30 jours - 9 €" (Particulier)                  │
│    Bouton "Auto-école 30 jours - 200 €" (B2B)                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Page /pricing-beta (NOUVELLE — courte)                           │
│    Détail offre + "Paiement unique, sans abonnement, manuel"        │
│    Bouton "Procéder au paiement" → ouvre lien externe               │
│    Le lien provient de env :                                        │
│      NEXT_PUBLIC_PAYMENT_LINK_PARTICULIER_30_DAYS                   │
│      NEXT_PUBLIC_PAYMENT_LINK_AUTOECOLE_30_DAYS                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Page externe Stripe Payment Link / PayPal / SumUp                │
│    Utilisateur paie                                                 │
│    Redirection success URL ← configurée dans le lien                │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Page /activation (NOUVELLE)                                      │
│    "Merci pour votre paiement ! Pour activer votre accès :"         │
│    Champ Email (rempli depuis localStorage si connecté)             │
│    Champ Référence transaction (optionnel)                          │
│    Bouton "Demander l'activation"                                   │
│    → POST /activation/request (NOUVEL endpoint backend)             │
│      crée une entrée pending dans la table activations_pending      │
│    → Email auto à damien@ma1.app avec les infos                     │
│    → Affichage : "Votre demande sera traitée sous 24h."             │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Admin (Supabase Studio OU page admin sécurisée)                  │
│    Damien voit les demandes pending                                 │
│    Vérifie le paiement reçu (dashboard Stripe / PayPal)             │
│    Clique "Activer"                                                 │
│    → UPDATE users SET plan='beta_premium',                          │
│             paid_until=now()+30days,                                │
│             payment_provider='stripe_link',                         │
│             payment_reference='pi_xxx',                             │
│             last_payment_at=now()                                   │
│    → Email auto à l'utilisateur : "Votre accès est activé !"       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. L'utilisateur retrouve son compte                                │
│    Header affiche "Premium · 29 jours restants"                     │
│    Toutes les options débloquées                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Coût d'implémentation V1 semi-manuel :**
- 1 page Next.js `/pricing-beta` (~80 lignes)
- 1 page Next.js `/activation` (~120 lignes)
- 1 endpoint backend `POST /activation/request` (~30 lignes)
- 1 page admin minimaliste pour activer (~60 lignes)
- 1 migration SQL (10 lignes)
- 1 modification `check_limit` pour valider `paid_until` (5 lignes)
- 1 ENV `PAYMENT_LINK_*` × 2
- Email Resend templates × 2
→ **2-3 jours dev** + temps de QA. Aucun webhook nécessaire.

### 4.3 Tunnel recommandé — V2 automatisé (à viser Sprint C)

```
1. Utilisateur clique "Débloquer 30 jours - 9 €"
2. Backend POST /payment/create-link → renvoie URL Stripe Payment Link
   (ou utilise lien statique avec ?prefilled_email=user@x.com&client_reference_id=user_xxx)
3. Stripe gère le paiement
4. Webhook Stripe POST /payment/webhook
   - Vérifie signature
   - Récupère client_reference_id
   - UPDATE users SET plan='beta_premium', paid_until=now()+30days, …
5. Redirige sur /payment/success avec session_id
6. Frontend POST /me pour rafraîchir les permissions
7. Email confirmation auto
```

**Coût V2 :** +2-3 jours sur V1.

---

## 5. Audit sécurité (focus bêta ouverte)

| # | Contrôle | État | Risque pour bêta ouverte | Priorité |
|---|---|---|---|---|
| 5.1 | `goPrem()` fake activable sans paiement (`standalone:1372`) | **TOUJOURS ACTIF** | Fraude massive | **P0 BLOQUANT** |
| 5.2 | `stripeCheckout` fallback `goPrem()` si Stripe down (`standalone:1750, 1757`) | TOUJOURS ACTIF | Fraude conditionnelle | **P0 BLOQUANT** |
| 5.3 | Premium activable via localStorage | OUI (`S.plan='premium'` côté JS = persistance Zustand) | Fraude triviale (devtools → setItem) | **P0** |
| 5.4 | Route `/dashboard/{owner_id}` accessible sans auth (`api.py:610`) | OUI | Espionnage dashboard auto-école payé | **P0** |
| 5.5 | Route `/whitelabel/{owner_id}` accessible sans auth (`api.py:964`) | OUI | Modification white-label d'une autre auto-école | **P0** |
| 5.6 | Route `/rgpd/delete/{user_id}` accessible sans auth | OUI | Suppression de comptes arbitraires | **P0** |
| 5.7 | Accès 30 jours modifiable côté client | OUI (Zustand persisté en localStorage : `ma1-store-v8`) | Bypass total côté client | **P0** |
| 5.8 | Expiration vérifiée côté backend | NON | Plan reste éternel | **P0** |
| 5.9 | Quotas vérifiés côté backend | OUI (`check_limit` lignes 297-302) — mais ne lit que `_usage` RAM | OK quotas, mais RAM = perte au reboot | P1 |
| 5.10 | Dashboard auto-école protégé par rôle | NON (n'importe qui accède s'il connaît l'owner_id) | Cf 5.4 | **P0** |
| 5.11 | Admin protégé | NON — mot de passe `ma1admin2026` en dur côté client (`app/admin/page.tsx:13`) | Accès admin trivial | **P0** |
| 5.12 | CORS restreint | `allow_origins=["*"]` | API joignable depuis tout domaine | **P0** |
| 5.13 | JWT sécurisé | Secret défaut `ma1-dev-secret-change-in-production-min32chars!` si env non set | Forge de tokens | **P0** |
| 5.14 | Endpoints `/api/v1/keys/create` ouverts (`api.py:1175`) | OUI sans auth | Brute force de clés API publiques | **P0** |
| 5.15 | Endpoints payment (à créer) auth | n/a | À designer dès le départ avec auth | P1 (préventif) |

**Verdict sécu bêta ouverte :** 8 points P0 sécurité. Tant que **5.1, 5.2, 5.3, 5.4, 5.10, 5.11** ne sont pas réglés, ouvrir au public = invitation à la fraude et la fuite de données.

---

## 6. Audit Supabase / données

### 6.1 Schéma actuel (`backend/scripts/supabase_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'autoecole')),
  birth_date DATE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Manque pour modèle 30 jours :**
- `access_status` (active / expired / pending_activation / suspended)
- `paid_until` (timestamptz, NULL pour plan free)
- `payment_provider` (stripe_link / paypal_link / sumup_link / manual)
- `payment_reference` (id transaction)
- `last_payment_at` (timestamptz)
- `role` (user / autoecole_owner / admin)
- `school_id` (FK vers une future table `schools` pour lier élèves)
- `is_autoecole` (bool, dérivé de role)

**Contrainte CHECK :**
- N'accepte pas `'beta_premium'` ni `'beta_autoecole'` ni `'annual'`. Doit être étendue ou supprimée.

**RLS :**
- Toutes les politiques sont en `USING (true)` (cf audit Sprint 0). À refaire avant bêta ouverte (P0 RGPD).

### 6.2 Migration SQL proposée (À VALIDER — NE PAS APPLIQUER sans accord)

```sql
-- Migration MA1 — Bêta ouverte + accès 30 jours
-- À jouer après backup Supabase
-- NE PAS exécuter avant validation par Damien

BEGIN;

-- 1. Étendre la contrainte plan
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'beta_premium', 'beta_autoecole', 'premium', 'annual', 'autoecole'));

-- 2. Ajouter les colonnes d'accès 30 jours
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'active'
    CHECK (access_status IN ('active', 'expired', 'pending_activation', 'suspended')),
  ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
    CHECK (role IN ('user', 'autoecole_owner', 'admin')),
  ADD COLUMN IF NOT EXISTS school_id UUID;

-- 3. Index pour requêtes d'expiration
CREATE INDEX IF NOT EXISTS idx_users_paid_until ON users(paid_until)
  WHERE paid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_plan_status ON users(plan, access_status);

-- 4. Table activations_pending (pour tunnel semi-manuel V1)
CREATE TABLE IF NOT EXISTS activations_pending (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  plan_requested TEXT NOT NULL CHECK (plan_requested IN ('beta_premium', 'beta_autoecole')),
  payment_reference TEXT,
  payment_provider TEXT,
  amount_eur INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_activations_status ON activations_pending(status, requested_at);

-- 5. Table payments (audit trail)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_eur INT NOT NULL,
  payment_provider TEXT NOT NULL,
  payment_reference TEXT,
  plan_granted TEXT NOT NULL,
  access_days INT DEFAULT 30,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, paid_at);

-- 6. Table schools (auto-écoles)
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(user_id),
  name TEXT NOT NULL,
  max_students INT DEFAULT 30,
  white_label_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_owner ON schools(owner_id);

-- 7. RLS sur les nouvelles tables (modèle restrictif)
ALTER TABLE activations_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs ne lisent que leurs propres activations et paiements
CREATE POLICY "Users read own activations" ON activations_pending
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users read own payments" ON payments
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "School owners read own school" ON schools
  FOR SELECT USING (owner_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- L'admin (rôle service) peut tout faire (à utiliser via SUPABASE_SERVICE_KEY côté backend)

COMMIT;
```

**Risques migration :**
- L'ALTER CHECK sur `users.plan` échoue s'il existe des lignes avec un plan non listé. À précéder d'un `SELECT DISTINCT plan FROM users;`.
- Les RLS s'appuient sur `request.jwt.claims.sub` — il faut que le backend setup correctement la session Postgres avec le JWT en clair (cf Supabase JWT pattern).

### 6.3 Compteur "jours restants" côté UI

Source unique de vérité = `users.paid_until` (DB). Frontend l'affiche en lecture, ne le modifie jamais.

Logique côté backend (à ajouter dans `check_limit`) :

```python
def check_limit(uid, action):
    u = get_usage(uid)
    plan = u.get("plan", "free")
    
    # NOUVEAU : vérifier expiration si plan payant
    if plan in ("beta_premium", "beta_autoecole", "premium", "autoecole", "annual"):
        sb = get_supabase()
        if sb:
            try:
                row = sb.table("users").select("paid_until,access_status").eq("user_id", uid).single().execute()
                paid_until = row.data.get("paid_until")
                if paid_until and datetime.fromisoformat(paid_until) < datetime.now(timezone.utc):
                    # Expiration silencieuse : downgrade
                    sb.table("users").update({"plan": "free", "access_status": "expired"}).eq("user_id", uid).execute()
                    plan = "free"
            except: pass
    
    lim = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    if action=="question": return u["questions"] < lim["questions_per_day"]
    ...
```

---

## 7. Audit légal / CGV

### 7.1 Constat sur les CGV actuelles (`public/legal/cgv.html`)

Les CGV décrivent **exclusivement un modèle d'abonnement récurrent mensuel** :

- §3 : "À l'issue de la période d'essai, l'abonnement est automatiquement converti en abonnement payant"
- §4 : "L'abonnement est renouvelé automatiquement chaque mois"
- §6 : "L'abonnement peut être résilié à tout moment"
- §7 : "Une facture est émise automatiquement à chaque prélèvement"

**Ces clauses sont INCOMPATIBLES avec un modèle "paiement unique 30 jours sans renouvellement".**

### 7.2 Couverture des points obligatoires pour la bêta ouverte

| Point | Présent en CGV ? | Statut |
|---|---|---|
| Paiement unique 30 jours | ❌ NON | À ajouter |
| Pas d'abonnement automatique | ❌ NON (au contraire, parle d'auto-renouvellement) | À ajouter |
| Absence de renouvellement automatique | ❌ NON | À ajouter |
| Durée d'accès (30 jours calendaires) | ❌ NON | À ajouter |
| Expiration et conséquences | ❌ NON | À ajouter |
| Rétractation 14 j | ✅ Présente (§5) mais avec exception "si vous avez expressément commencé à utiliser le service" | OK mais à reformuler pour bêta |
| Remboursement | ✅ §5 + §8 (avoir) | OK |
| Support | ⚠️ `contact@ma1.app` mentionné mais pas de SLA | OK pour bêta |
| Offre particulier 9 € | ❌ NON | À ajouter |
| Offre auto-école 200 € | ⚠️ Mentionnée mais en abo récurrent | À modifier |
| Facture | ✅ §7 | OK (si on émet bien une facture pour le paiement unique) |
| Données personnelles | ✅ Renvoi vers confidentialite.html | OK |
| Mineurs | ⚠️ Mentionné en CGU §4 mais pas en CGV | À ajouter en CGV |
| Mention "bêta" | ❌ NON | À ajouter |

### 7.3 Nouvelle clause CGV à insérer (rédaction proposée — à valider juridiquement)

```
## 11. Offre Bêta Ouverte — Accès 30 jours (paiement unique)

Pendant la phase de bêta ouverte, MA1 propose deux offres à paiement unique
sans engagement et sans renouvellement automatique :

- **Particulier — 9 € TTC pour 30 jours** : accès complet aux fonctionnalités
  Premium pendant 30 jours calendaires à compter de l'activation par
  l'équipe MA1.
- **Auto-école — 200 € TTC pour 30 jours** : accès à l'espace auto-école et
  jusqu'à 30 élèves pendant 30 jours calendaires.

Ces offres sont expressément des **paiements uniques**. Aucun prélèvement
automatique n'est effectué à l'issue des 30 jours. Pour continuer à
bénéficier des fonctionnalités payantes, l'utilisateur devra effectuer un
nouveau paiement.

À l'expiration des 30 jours, le compte revient automatiquement au plan
Gratuit. Les données de progression sont conservées conformément à notre
politique de confidentialité.

**Caractère bêta** : ces offres sont proposées pendant une phase de test
contrôlée. Certaines fonctionnalités peuvent être instables ou indisponibles.
Le service peut être interrompu sans préavis. MA1 ne remplace pas une
formation en auto-école ni l'examen officiel du Code de la route.

**Droit de rétractation** : conformément à l'article L221-18 du Code de la
consommation, le délai de rétractation de 14 jours s'applique. Toutefois,
si vous commencez à utiliser activement le service avant la fin de ce
délai, vous renoncez expressément à ce droit (art. L221-28).

**Activation** : le paiement est traité via un prestataire externe sécurisé
(Stripe / autre). L'activation de l'accès intervient sous 24 heures
ouvrables après réception du paiement. Pour toute question, contactez
contact@ma1.app.
```

---

## 8. Audit landing / conversion bêta ouverte

### 8.1 État actuel de `/landing` (canonique post-Sprint 0)

La landing actuelle ne mentionne PAS :
- ❌ "Bêta ouverte"
- ❌ "Accès 30 jours"
- ❌ "Particulier 9 €" (affiche 10 €/mois)
- ❌ "Auto-école 200 €" reste 200 €/mois (récurrent)
- ❌ "Paiement unique, sans abonnement"
- ❌ "Renouvellement manuel"
- ❌ "Certaines fonctionnalités sont encore en bêta"
- ✅ "MA1 ne remplace pas une auto-école" (présent en FAQ)

### 8.2 Textes à modifier (proposition — à valider)

| Élément | Avant | Après proposé |
|---|---|---|
| Badge hero | (absent) | "Bêta ouverte · Accès 30 jours" |
| Hero `<p>` | "10 questions gratuites par jour" | "Testez l'IA gratuitement. Débloquez 30 jours pour 9 €, sans engagement." |
| PRICING.name `Premium` | "Premium" | "Particulier · 30 jours" |
| PRICING.price `Premium` | "10€ /mois" | "9€ /30 jours" |
| PRICING.features `Premium` | "Streaming temps réel", "7 jours d'essai gratuit" | "Paiement unique sans abonnement", "Renouvellement manuel", "Accès complet 30 jours" |
| PRICING.cta `Premium` | "7 jours gratuits" | "Débloquer 30 jours - 9 €" |
| PRICING.href `Premium` | `APP_URL` (standalone) | `/pricing-beta` (nouvelle page) ou directement env var lien externe |
| PRICING `Annuel` | (présent) | À MASQUER pendant la bêta |
| PRICING.name `Auto-École` | "Auto-École" | "Auto-École · 30 jours" |
| PRICING.price `Auto-École` | "200€ /mois" | "200€ /30 jours" |
| PRICING.features `Auto-École` | "Dashboard moniteur", "Suivi de 30 élèves", "White-label personnalisable" | Idem + "Paiement unique, sans abonnement", "30 élèves inclus", "Renouvellement manuel" |
| FAQ "MA1 est-il vraiment gratuit ?" | (existe) | Garder + ajouter une FAQ "C'est quoi 9€ / 30 jours ?" |
| FAQ "Comment fonctionne l'essai gratuit Premium ?" | (existe) | À retirer pendant la bêta OU adapter |
| Footer | (existe) | Ajouter mention "Version bêta — données protégées, mais service susceptible d'évolutions" |

### 8.3 Page `/pricing-beta` à créer (recommandation)

Contenu minimal :

```
H1 : Bêta ouverte MA1 — Choisissez votre formule 30 jours

[Carte Particulier]
9 € · 30 jours
Accès complet à l'IA, QCM illimités, examens blancs, vision panneaux, plan de révision.
Paiement unique sans abonnement.
Bouton "Procéder au paiement" → href={NEXT_PUBLIC_PAYMENT_LINK_PARTICULIER_30_DAYS}

[Carte Auto-école]
200 € · 30 jours
Dashboard moniteur, jusqu'à 30 élèves inclus, suivi progression, export PDF.
Paiement unique sans abonnement.
Bouton "Procéder au paiement" → href={NEXT_PUBLIC_PAYMENT_LINK_AUTOECOLE_30_DAYS}

Notes en bas de page :
- Une facture est émise après réception du paiement.
- Activation sous 24 h ouvrables.
- Pas de prélèvement automatique.
- Lecture seule des CGV (lien).
- Contact support : contact@ma1.app
```

---

## 9. Plan de correction recommandé

### Sprint A — Nettoyage paiement & offres (J+1 à J+3) — préalable obligatoire

- A.1 Désactiver `goPrem()` et son fallback Stripe-down dans le standalone.
- A.2 Retirer le plan Annuel des deux landings + de l'endpoint `/pricing` (ou flagger "Bientôt").
- A.3 Retirer la mention "essai gratuit 7 jours" pendant la bêta (incompatible paiement unique).
- A.4 Modifier les libellés pricing (cf §8.2) sur la landing Next.js.
- A.5 Mettre à jour `CLAUDE.md` §5 avec la nouvelle grille bêta.
- A.6 Bloc CGV nouvelle clause §11 (rédaction §7.3) — à faire valider juridiquement avant publication.

### Sprint B — Paiement 30 jours semi-manuel (J+3 à J+6)

- B.1 Variables d'env :
  - `NEXT_PUBLIC_PAYMENT_LINK_PARTICULIER_30_DAYS` (frontend)
  - `NEXT_PUBLIC_PAYMENT_LINK_AUTOECOLE_30_DAYS` (frontend)
  - `BETA_PAYMENT_MODE=manual` (backend)
  - `BETA_ACCESS_DAYS=30` (backend)
  - `BETA_PARTICULIER_PRICE=9` (backend)
  - `BETA_AUTOECOLE_PRICE=200` (backend)
  - Mise à jour `backend/.env.example` et `.env.local.example`
- B.2 Migration Supabase (cf §6.2) après backup.
- B.3 Page `/pricing-beta` (Next.js).
- B.4 Page `/activation` (Next.js, formulaire email + référence).
- B.5 Endpoint backend `POST /activation/request` (crée entrée `activations_pending`, envoie email à `damien@ma1.app`).
- B.6 Page admin `/admin/activations` (liste des `pending` + bouton "Activer" qui :
  - UPDATE users : plan, paid_until, payment_provider, payment_reference, last_payment_at
  - UPDATE activations_pending : status='activated', processed_at, processed_by
  - INSERT payments : ligne audit
  - Envoie email "Votre accès est activé"
  - Sécurité : middleware admin (cf Sprint 1 Sécurité — pas en clair côté client)
- B.7 Logique `check_limit` étendue pour expiration (cf §6.3).
- B.8 Header affiche "X jours restants" si `paid_until` set.

### Sprint C — Paiement 30 jours automatisé (J+6 à J+10)

- C.1 Choix prestataire définitif (Stripe Payment Links / Stripe Checkout custom / autre).
- C.2 Si Stripe Payment Links :
  - Créer 2 Payment Links côté dashboard Stripe (one-shot, montant fixe, success_url=`/payment/success?provider=stripe`)
  - Webhook `payment_intent.succeeded` → POST `/payment/webhook`
  - Vérifier signature
  - Récupérer `client_reference_id` (passé en query string du Payment Link)
  - Activer automatiquement
- C.3 Email confirmation auto via Resend.
- C.4 Email J-3 avant expiration.
- C.5 Tests automatisés Stripe CLI.

### Sprint D — Sécurité bêta ouverte (J+10 à J+14)

Reprend les P0 sécurité du Sprint 1 ROADMAP (déjà documentés dans `ROADMAP_MA1_MARKET_LAUNCH.md`) :

- D.1 Auth backend sur `/dashboard/*`, `/rgpd/*`, `/profile/*`, `/whitelabel/*`, `/cron/*`
- D.2 CORS restreint à `https://ma1.app` + `https://*.vercel.app` + `http://localhost:*`
- D.3 JWT_SECRET refus de démarrage si valeur défaut
- D.4 Admin auth via backend role-check (pas client-side)
- D.5 RLS Supabase fermées (USING `auth.uid()::text = user_id`)
- D.6 Sanitisation `dangerouslySetInnerHTML` IA outputs

### Sprint E — Préparation ouverture publique (J+14 à J+21)

- E.1 Landing finalisée (badge bêta visible, FAQ adaptée).
- E.2 CGV publiées avec nouvelle clause §11.
- E.3 Page contact + email support monitoré.
- E.4 Monitoring : Sentry frontend + backend, UptimeRobot.
- E.5 Test complet de bout en bout : inscription → paiement lien → activation manuelle → expiration → re-paiement.
- E.6 Documentation interne pour Damien : "Comment activer un paiement reçu en 3 étapes".
- E.7 Communiqué d'ouverture (LinkedIn, Discord auto-écoles, etc.).

---

## 10. Verdict final

### Q1. Peut-on ouvrir la bêta gratuitement ?

**OUI, en mode bêta privée fermée** (10-30 testeurs invités, sans paiement, sans promesse de SLA, avec disclaimer "version bêta") — **après** avoir réglé : `goPrem()` fake (5.1, 5.2, 5.3), auth des endpoints dashboard / rgpd (5.4, 5.10), admin (5.11). Compter 2-3 jours dev.

**NON, en bêta publique gratuite ouverte au monde**, tant que la persistance backend (RAM only) n'est pas résolue : tout reboot serveur = perte des comptes et progressions. À régler en Sprint 2 ROADMAP existante.

### Q2. Peut-on ouvrir la bêta avec paiement 9 € / 30 jours particulier ?

**OUI, en mode semi-manuel V1** après Sprint A + B (compter 6 jours dev), à condition de :
- Avoir mis à jour la CGV (clause §11).
- Avoir 2 liens de paiement opérationnels (Stripe Payment Link recommandé).
- Avoir réglé les P0 sécurité 5.1, 5.2, 5.3, 5.4, 5.10, 5.11 (Sprint D peut être parallèle).
- Communiquer clairement "activation sous 24 h ouvrables" (gérable manuellement par Damien à faible volume).

**NON, en mode automatique** tant que Sprint C n'est pas fait.

### Q3. Peut-on ouvrir la bêta auto-école 200 € / 30 jours ?

**OUI, dans les mêmes conditions que Q2**, avec en plus :
- Quota 30 élèves ENFORCÉ côté backend (actuellement non plafonné — `add_student` accepte n'importe combien). À régler dans Sprint B ou Sprint D.
- Dashboard `/dashboard/{owner_id}` réellement protégé par auth (P0 5.4).
- White-label vraiment fonctionnel OU retiré temporairement de la promesse (actuellement stocké en RAM → perdu au reboot).
- Contrat-type B2B simplifié (1-2 pages) à fournir avant facturation.

### Q4. Le paiement doit-il être manuel ou automatique au départ ?

**MANUEL recommandé** (V1 Sprint B).

Raisons :
- Réduit la surface d'attaque (pas de webhook = pas de signature à valider, pas de race condition).
- Permet de débuter en 6 jours dev au lieu de 10-12.
- Damien valide chaque paiement reçu → contrôle qualité élevé pour la première dizaine de clients.
- Aucun risque de double-activation, de fraude webhook, de timezone bug.
- Au-delà de 20-30 paiements/mois → bascule V2 automatique (Sprint C) devient rentable.

### Q5. Quelles sont les 5 corrections prioritaires ?

| # | Correction | Effort | Impact |
|---|---|---|---|
| 1 | **Neutraliser `goPrem()`** dans `public/index-standalone.html:1372` ET son fallback ligne 1750/1757 (les deux remplacer par `alert('Paiement requis. Allez sur /pricing-beta')` ou redirect). | 15 min | Élimine la fraude la plus triviale |
| 2 | **Auth backend** (token + check user_id match) sur `/dashboard/{owner_id}`, `/rgpd/export/{user_id}`, `/rgpd/delete/{user_id}`, `/profile/{user_id}`, `/whitelabel/{owner_id}`. Pattern : décorateur `@require_auth_user_match`. | 1 j | Protège les données payées (dashboard auto-école, RGPD) |
| 3 | **Migration Supabase** (cf §6.2) : `paid_until`, `access_status`, `payment_provider`, `payment_reference`, `last_payment_at`, `role`, table `activations_pending`, table `payments`, table `schools`. À faire avant tout dev paiement. | 30 min après backup | Permet de gérer l'expiration 30 jours |
| 4 | **CGV §11** "Offre Bêta Ouverte" (rédaction §7.3). À faire valider juridiquement. Tant que pas publié = pas de paiement encaissable légalement sur le modèle 30 jours. | 1-2 j (avec relecture juridique) | Permet d'encaisser légalement |
| 5 | **Page `/pricing-beta` + page `/activation`** + endpoint `POST /activation/request` + page admin `/admin/activations` (auth-checked) + variables d'env `PAYMENT_LINK_*`. | 2-3 j | Tunnel paiement opérationnel V1 |

---

## Annexe A — Variables d'environnement à ajouter

### Frontend (`.env.local` + `.env.local.example`)
```
NEXT_PUBLIC_PAYMENT_LINK_PARTICULIER_30_DAYS=
NEXT_PUBLIC_PAYMENT_LINK_AUTOECOLE_30_DAYS=
NEXT_PUBLIC_BETA_BANNER=true
NEXT_PUBLIC_BETA_ACCESS_DAYS=30
NEXT_PUBLIC_BETA_PARTICULIER_PRICE=9
NEXT_PUBLIC_BETA_AUTOECOLE_PRICE=200
```

### Backend (`backend/.env` + `backend/.env.example`)
```
# ── Bêta ouverte (paiement 30 jours) ─────────────────
PAYMENT_PROVIDER=external_link
BETA_PAYMENT_MODE=manual
BETA_ACCESS_DAYS=30
BETA_PARTICULIER_PRICE=9
BETA_AUTOECOLE_PRICE=200
ADMIN_NOTIFICATION_EMAIL=damien.miyouna@gmail.com

# ── Stripe (si activation V2) ────────────────────────
STRIPE_PAYMENT_LINK_PARTICULIER_ID=plink_xxx
STRIPE_PAYMENT_LINK_AUTOECOLE_ID=plink_xxx
```

### Règle de sécurité
Aucun lien de paiement ne doit être hardcodé dans le code source. Les `PAYMENT_LINK_*` sont fournis par Damien et déclarés en `.env` (jamais commités).

---

## Annexe B — Cohérence avec les autres documents

- `AUDIT_MA1_v9.md` reste valide. Ce rapport vient le compléter sur l'axe "bêta ouverte + paiement 30 jours".
- `CLAUDE.md` §5 sera mis à jour en Sprint A pour refléter la nouvelle grille bêta.
- `ROADMAP_MA1_MARKET_LAUNCH.md` : insérer un "Sprint A → E (Bêta ouverte)" entre les Sprint 1 (sécurité) et Sprint 2 (persistance + déprécation standalone) existants — OU re-séquencer pour faire passer la bêta ouverte avant le lancement Premium récurrent.
- `INCIDENTS_ET_CONTROLES.md` : à compléter de tout incident rencontré pendant les Sprints A-E.
- `SUIVI_AUDIT_BETA_OUVERTE.md` : statut à jour, livré avec ce rapport.

---

*Aucun fichier de code n'a été modifié pendant cet audit. Trois fichiers documentaires `.md` créés : ce rapport, `SUIVI_AUDIT_BETA_OUVERTE.md`, `INCIDENTS_ET_CONTROLES.md`. À valider par Damien avant tout dev.*

— FIN DU RAPPORT — marker_eof_AUDIT_BETA_OUVERTE_MA1
