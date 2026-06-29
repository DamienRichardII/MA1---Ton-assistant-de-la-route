# ROADMAP MA1 — Lancement marché

> Roadmap opérationnelle des sprints menant de l'état Sprint 0 (cadrage terminé) au lancement Premium + B2B.
> Source : `AUDIT_MA1_v9.md` (failles identifiées) + `SPRINT_0_RAPPORT_FIN.md` (consolidation landing).
> Dernière mise à jour : 2026-05-20

---

## Sprint 0 — Cadrage architecture ✅ **TERMINÉ**

**Objectif :** clarifier l'architecture publique, supprimer les doublons, poser les guardrails docs.

**Livrables :**

- [x] Choix landing canonique : `app/landing/page.tsx` (Next.js)
- [x] Archivage `public/landingpage.html` → `_archive/`
- [x] Redirection 301 `/landingpage.html` → `/landing`
- [x] CTAs landing corrigés (évite la boucle `/` → `/landing` → `/`)
- [x] Décision app cible : Next.js v8 (standalone v7 toléré jusqu'au Sprint 2)
- [x] `CLAUDE.md` racine
- [x] `ROADMAP_MA1_MARKET_LAUNCH.md` (ce fichier)
- [x] `SPRINT_0_RAPPORT_FIN.md`

**Durée :** 1 jour.

---

## Sprint 1 — Sécurité critique P0 🔥 **PROCHAIN**

**Objectif :** rendre la bêta privée fermée juridiquement et techniquement viable.

**Périmètre :**

1. **Authentification stricte sur endpoints sensibles** (P0 sécurité)
   - Décorateur `@require_auth` (FastAPI) sur : `/rgpd/export/*`, `/rgpd/delete/*`, `/profile/*`, `/readiness/*`, `/dashboard/*`, `/usage/*`, `/whitelabel/*`, `/dashboard/note`, `/dashboard/group/*`, `/dashboard/notes/*`, `/dashboard/alerts/*`, `/dashboard/pdf/*`, `/challenge/*`, `/export/pdf/*`, `/referral/apply`, `/plan/upgrade`, `/cron/daily`.
   - Vérification : `verify_token(header)` → 401 si invalide ou si user_id mismatch.
   - Tests unitaires pytest dédiés.

2. **Désactivation Premium fake standalone** (P0 fraude)
   - `public/index-standalone.html` ligne ~1372 : `goPrem()` doit déclencher un vrai checkout Stripe (ou afficher un message "Bientôt disponible" si Stripe pas prêt).

3. **Désactivation admin client-side** (P0 sécurité)
   - `app/admin/page.tsx` : retirer mot de passe en dur, exiger un token JWT avec claim `role: 'admin'`.
   - Côté backend : middleware role-check sur `/analytics/summary`, `/cron/daily`.

4. **Placeholders légaux** (P0 légal)
   - Compléter dans `public/legal/mentions-legales.html` : forme juridique, SIRET, RCS, adresse, directeur de publication.
   - Compléter dans `public/legal/cgu.html` : ville des tribunaux compétents.
   - Compléter dans `public/legal/cgv.html` : nom du médiateur consommation, **ajouter le plan Annuel** (prix, modalités, rétractation).
   - Compléter dans `public/legal/confidentialite.html` : adresse du responsable de traitement.

5. **Cohérence offres** (P0 commercial)
   - Aligner quotas examen blanc : 1/mois partout (landing, modal pricing standalone, CGU, backend).
   - Retirer mention "Vérif. Technique" de la landing publique OU enlever le paywall.
   - Retirer "aggregateRating 4.8 / 150" fictif du JSON-LD landing.
   - Corriger FAQ landing : "données restent sur l'appareil" → mention véridique (sous-traitants Anthropic, Vercel, Supabase).

6. **CORS + JWT_SECRET prod** (P0 sécurité)
   - `backend/src/api.py` : refuser le démarrage si `JWT_SECRET` == valeur par défaut.
   - CORS restreint aux origines `https://ma1.app`, `https://*.vercel.app`, `http://localhost:*`.

7. **Sanitisation des sorties IA** (P0 XSS)
   - `ChatPanel.tsx`, `VisionPanel.tsx` : remplacer `dangerouslySetInnerHTML` par DOMPurify + react-markdown.

8. **Création API key auth** (P0 sécurité)
   - `/api/v1/keys/create` doit exiger un token utilisateur premium ou auto-école.

**Critères de réussite Sprint 1 :**

- Tous les endpoints backend exigent un token JWT validé.
- Aucun secret côté client.
- Toutes les pages légales sont remplies (validation juridique recommandée).
- Le tunnel d'achat Premium affiche soit Stripe soit "Bientôt".
- `npm run build` + `npm run test:e2e` passent.
- Audit Lighthouse landing ≥ 90.

**Durée estimée :** 5-7 jours.

---

## Sprint 2 — Persistance + déprécation standalone

**Objectif :** rendre les données réellement persistées et migrer définitivement vers Next.js.

**Périmètre :**

1. **Migration mémoire RAM → Supabase**
   - Réécrire `_users`, `_profiles`, `_conversations`, `_subscriptions`, `_referrals`, `_challenges`, `_groups`, `_whitelabel`, `_monitor_notes`, `_autoecole_students`, `API_KEYS` en tables Supabase.
   - RLS : `USING (auth.uid()::text = user_id)` partout.
   - Ajouter `subscriptions`, `payments`, `consents`, `email_consents`, `students` (élèves auto-école), `api_keys`.
   - Migration script + rollback.

2. **Migration tests Next.js app**
   - Compléter les fonctions manquantes côté Next.js (positioning, plan30, leaderboard, settings).
   - Tests E2E couvrant le parcours complet.

3. **Déprécation standalone v7**
   - Banner "Cette version est dépréciée, passez à la nouvelle app" sur `/index-standalone.html`.
   - Redirection progressive (clic → onboarding Next.js).
   - Conservation 30 jours puis suppression.

4. **App shell refactor**
   - Route group `app/(public)/` (sans shell) pour `/landing` et pages légales (si on les passe en Next.js).
   - Route group `app/(app)/` (avec Header, Sidebar, RightPanel, MobileNav) pour les modules.

5. **Quota auto-école effectif**
   - `add_student` vérifie le nombre d'élèves vs plan.
   - Surcharge possible avec facturation au prorata (Sprint 3+).

**Critères de réussite Sprint 2 :**

- Aucun stockage en RAM côté backend.
- Reboot du backend → aucune perte de données.
- Standalone v7 dépréciée et bannerée.
- `/landing` ne montre plus le sidebar.

**Durée estimée :** 7-10 jours.

---

## Sprint 3 — Tunnel Premium fonctionnel + emails

**Objectif :** rendre Premium 10 €/mois et 79 €/an réellement encaissables.

**Périmètre :**

1. **Stripe end-to-end**
   - Checkout Premium 10 €/mois (essai 7 jours).
   - Checkout Annuel 79 €/an.
   - Webhook `checkout.session.completed` → update plan en DB.
   - Webhook `customer.subscription.deleted` → downgrade.
   - Webhook `invoice.payment_failed` → email + rétrogradation après 7 jours.
   - Tests Playwright + Stripe CLI.

2. **Emails transactionnels (Resend)**
   - Bienvenue (existe déjà, vérifier déclenchement).
   - Rappel essai 7 jours à J+5 (existe, brancher cron réel).
   - Confirmation achat.
   - Échec paiement.
   - Annulation.
   - Streak en danger (J+1 inactif).

3. **Cron quotidien réel**
   - Supabase Edge Function ou Vercel Cron.
   - Appelle `/cron/daily` chaque jour à 7h Paris.

4. **Page `/factures`**
   - Liste des factures du compte connecté.
   - Téléchargement PDF (Stripe-hosted ou regénéré).

5. **Droit de rétractation 14 jours**
   - Bouton "Demander un remboursement" pendant les 14 jours suivant la souscription.
   - Workflow : email DamCompany + remboursement Stripe partiel/total.

**Critères de réussite Sprint 3 :**

- Un utilisateur peut souscrire Premium et recevoir une facture.
- Un utilisateur peut annuler depuis ses paramètres.
- Email rappel essai déclenché.
- Tests E2E Stripe verts.

**Durée estimée :** 7-10 jours.

---

## Sprint 4 — Pédagogie sérieuse

**Objectif :** garantir la fiabilité du contenu pédagogique.

**Périmètre :**

1. **Banque QCM validée**
   - Constitution de 500 QCM par un expert moniteur (DamCompany ou freelance auto-école).
   - Format JSON typé.
   - Source citée (article R…).
   - Stockée en base, l'IA n'intervient plus que pour reformuler/expliquer.

2. **Seuil examen corrigé**
   - 35/40 = 87,5 % (seuil ANTS 2026).
   - Mettre à jour `api.py` ligne 507 et tous les affichages.

3. **Bouton "Signaler une erreur"**
   - Sur chaque QCM et chaque réponse chat.
   - Crée un ticket interne consulté par l'expert.

4. **Veille Légifrance**
   - Brancher flux Légifrance officiel (RSS ou API SOAP).
   - Désactiver génération Claude pure.
   - Cache 24 h, contenu vérifiable.

5. **Badge "Question IA" / "Question validée"**
   - Visible sur chaque QCM.
   - Transparence pédagogique.

6. **Couverture 10 thèmes officiels**
   - Aligner sur la classification ANTS R1-R10.
   - Adapter `lib/constants.ts` TOPICS + backend.

**Critères de réussite Sprint 4 :**

- ≥ 500 QCM validés disponibles.
- Examen blanc = 40 questions tirées de la banque validée.
- 0 hallucination détectée sur 100 questions test.

**Durée estimée :** 10-15 jours (dépend du temps expert).

---

## Sprint 5 — UX, accessibilité, performance, observabilité

**Objectif :** finir la production-readiness.

**Périmètre :**

1. **Accessibilité WCAG AA**
   - `aria-label`, contrastes, focus visible, navigation clavier.
   - Audit axe-core.

2. **Performance**
   - Lighthouse landing ≥ 95.
   - Lazy load images.
   - Réduire bundle.

3. **Monitoring**
   - Sentry frontend + backend.
   - UptimeRobot ou Better Stack.
   - Alerting Discord/Slack.

4. **Logs structurés**
   - Backend : remplacer `print` et `except: pass` par logger.
   - Frontend : analytics events.

5. **Backup Supabase**
   - Backup quotidien automatique.
   - Test de restauration mensuel.

6. **Mobile-first**
   - Tester sur 5 devices (iPhone SE, iPhone 14, Pixel 6, Galaxy S22, iPad mini).
   - Corriger ce qui casse.

**Critères de réussite Sprint 5 :**

- Lighthouse landing ≥ 95.
- Sentry capte les erreurs.
- 0 erreur console sur le parcours canonique.

**Durée estimée :** 5-7 jours.

---

## Sprint 6 — Bêta privée fermée 🚀

**Objectif :** premier lancement réel auprès de 20-50 utilisateurs invités.

**Périmètre :**

1. **Recrutement bêta**
   - Liste 30 candidats permis + 5 moniteurs auto-école.
   - Onboarding par invitation email avec code.

2. **Disclaimer "Bêta"**
   - Banner visible sur toute l'app.
   - Mention "version bêta, données pouvant être effacées".

3. **Collecte feedback**
   - Bouton feedback global.
   - NPS hebdomadaire.
   - Interviews individuelles 30 min × 10.

4. **Suivi métriques**
   - Activation (premier QCM répondu).
   - Rétention J+1, J+7, J+30.
   - Conversion vers Premium (au cas où on offre l'achat).

**Critères de réussite Sprint 6 :**

- 30+ comptes actifs.
- NPS ≥ 30.
- 0 incident sécurité.
- 0 plainte RGPD.

**Durée estimée :** 4 semaines (bêta active).

---

## Sprint 7 — Bêta publique gratuite

**Objectif :** ouverture publique du produit gratuit, collecte massive d'avis.

**Périmètre :**

1. **Lancement Product Hunt / Reddit / LinkedIn**
2. **Banner "Lancement bêta publique" + countdown vers Premium**
3. **Pages SEO blog** (5 articles longs : "Comment réussir son Code", "Code de la route en 30 jours", etc.)
4. **Témoignages bêta privée** (consentement signé)
5. **Tracking conversion bien instrumenté**

**Critères de réussite Sprint 7 :**

- 1 000+ inscrits.
- ≥ 30 % de rétention J+7.
- Avis Trustpilot / Google : ≥ 4 / 5 (≥ 30 avis).

**Durée estimée :** 6-8 semaines.

---

## Sprint 8 — Lancement Premium 🎯

**Objectif :** ouverture des abonnements Premium et Annuel.

**Périmètre :**

1. **Activation Stripe en production**
2. **Email "Nouveau : Premium est là" à la base bêta publique**
3. **Offre de lancement** (ex : -50 % le premier mois pour les 100 premiers)
4. **Support client formalisé** (Crisp / Intercom / mailto monitoré)
5. **Comparatif concurrents** dans la landing (Ornikar, En Voiture Simone, etc.)

**Critères de réussite Sprint 8 :**

- 50 abonnés Premium dans le premier mois.
- Taux de conversion gratuit→Premium ≥ 3 %.
- Churn ≤ 10 % / mois.

**Durée estimée :** 4 semaines actives + suivi continu.

---

## Sprint 9 — Lancement B2B Auto-École

**Objectif :** vendre l'offre 200 €/mois à des auto-écoles.

**Périmètre :**

1. **Page B2B dédiée** (témoignages, démo vidéo, ROI)
2. **Démo personnalisée** (Calendly + script)
3. **Onboarding 1-1** (30 min de paramétrage white-label + import élèves)
4. **Contrat-type B2B** (DPA, SLA, conditions de paiement)
5. **Factures pro-forma + paiement par virement** (en plus de Stripe)

**Critères de réussite Sprint 9 :**

- 5 auto-écoles signées dans le trimestre.
- NPS auto-écoles ≥ 50.

**Durée estimée :** 8 semaines + suivi continu.

---

## Gouvernance roadmap

- Mise à jour à chaque fin de sprint dans le rapport de sprint correspondant.
- Critères de réussite NON négociables : un sprint n'est terminé que si tous les critères verts.
- Régressions = retour au sprint précédent.
- Sécurité passe TOUJOURS avant nouveauté.

---

*Validation : DamCompany / ingénieur Damien Miyouna.*
