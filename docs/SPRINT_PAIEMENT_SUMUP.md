# Paiement — abonnements récurrents SumUp (carte enregistrée)

Statut : **code livré, désactivé par défaut, à valider en sandbox SumUp avant ouverture.**

## Principe
SumUp encaisse mais ne gère pas les abonnements : MA1 les gère.
1. `POST /payment/subscribe` (JWT) → checkout SumUp `purpose=SETUP_RECURRING_PAYMENT` (Hosted Checkout, 3DS géré par SumUp) → l'utilisateur est redirigé vers SumUp.
2. SumUp appelle `POST /payment/webhook/sumup?t=<SUMUP_WEBHOOK_SECRET>`. **Le callback n'est jamais cru** : le backend relit le checkout via l'API (statut `PAID`, référence, montant, devise), récupère la carte enregistrée (`payment-instruments`), active le plan, envoie l'email.
3. `POST /cron/billing` (1×/jour, header `X-Cron-Secret`) prélève les échéances avec le jeton de carte. Échec → relances J+1, J+3, J+5 (accès conservé), puis résiliation + retour au plan gratuit.
4. Résiliation en ligne : `POST /payment/cancel` (accès jusqu'à fin de période), `POST /payment/resume`.
5. Essai Premium 7 jours : paiement de configuration à 0 €, premier prélèvement à J+7 (une seule fois par compte).

Fichiers : `apps/backend/src/{sumup_client,billing,billing_store}.py`, routes dans `api.py` (bloc « PAIEMENT SUMUP »), migration `apps/backend/scripts/016_create_subscriptions.sql`, front `apps/frontend/components/web/WebPricing.tsx` + `app/abonnement/merci`.
Tout ce qui parle à SumUp est dans `sumup_client.py` (un seul fichier à ajuster après la sandbox).

## Mise en service
1. **Supabase** : exécuter `016_create_subscriptions.sql` (crée `subscriptions`, `payments`, ajoute `annual` à la contrainte `users.plan`).
2. **SumUp** : activer les paiements en ligne sur le compte, créer une clé API secrète, noter le code marchand.
3. **Railway (backend)** : `PAYMENT_PROVIDER=sumup_api`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_WEBHOOK_SECRET`, `CRON_SECRET`, `API_PUBLIC_URL`, `FRONTEND_URL`, + `SUPABASE_SERVICE_KEY` (obligatoire). Voir `.env.example`.
4. **Cron** : appel quotidien `POST {API}/cron/billing` avec `X-Cron-Secret: <CRON_SECRET>` (Railway cron / GitHub Actions).
5. Vérifier `GET /payment/config` → `{"enabled": true}`.

## À valider en sandbox (non vérifiable sans compte — documentation SumUp inaccessible lors du développement)
- [ ] `POST /v0.1/checkouts` accepte `purpose=SETUP_RECURRING_PAYMENT`, `customer_id`, `hosted_checkout:{enabled:true}`, `return_url`, `redirect_url` et renvoie `hosted_checkout_url`.
- [ ] **Montant 0 € accepté pour le paiement de configuration (essai)**. Sinon : `SUMUP_TRIAL_DAYS_PREMIUM=0` (premier prélèvement immédiat) et retirer le badge « 7 jours gratuits ».
- [ ] Format du callback (champ `id` du checkout) et re-tentatives en cas de 502.
- [ ] `GET /v0.1/customers/{id}/payment-instruments` : champs `token`, `active`, `card.last_4_digits`, `card.type`.
- [ ] `PUT /v0.1/checkouts/{id}` avec `{payment_type:"card", token, customer_id}` : prélèvement sans 3DS, statut final relu en `GET`.
- [ ] Unicité de `checkout_reference` (doublon → 409, géré : pas de re-débit).
- [ ] Cartes de test : succès, refus, 3DS ; un renouvellement refusé enchaîne bien relances puis résiliation.

## Juridique / comptable (à traiter avant l'ouverture)
- CGV : ajouter l'annuel, le renouvellement automatique, l'essai, la résiliation en ligne, le droit de rétractation (case à cocher actuelle : texte provisoire à faire valider).
- Factures/reçus : le journal `payments` conserve chaque paiement (conservé après suppression de compte : obligation comptable) ; vérifier si SumUp émet le reçu client, sinon l'émettre.
- Politique de confidentialité : SumUp sous-traitant de paiement ; MA1 ne stocke aucun numéro de carte (jeton + 4 derniers chiffres).

## Limites connues
- Auto-École : le plafond « 30 élèves » n'est pas encore appliqué (Sprint 2).
- Carte expirée / 3DS exigé sur un renouvellement : traité comme un échec (relances puis résiliation) ; pas encore de parcours « mettre à jour ma carte » (l'utilisateur se réabonne).
- Comptes : la source de vérité est la table Supabase `users` ; le cache mémoire `_users` est rechargé au démarrage (`[startup] N comptes rechargés`) et à la demande. Auparavant, chaque redéploiement effaçait tous les comptes (connexion impossible, erreurs 401). Le plan est relu depuis `subscriptions` à la connexion et sur `/auth/me`.
- Stripe (`/stripe/*`) reste en place mais inutilisé.
