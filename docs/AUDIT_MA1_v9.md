# RAPPORT D'AUDIT LOCAL — MA1 v9_Final

> Audit réalisé en mode lecture seule, aucun fichier modifié.
> Conforme `Damcompany-code-guardrails.md` — analyse uniquement, zéro correction.
> Date : 2026-05-20 · Auditeur : Claude Cowork

---

## 1. Résumé exécutif

**Verdict global : projet riche mais NON prêt pour un lancement marché.**
MA1 v9_Final est un produit ambitieux et structuré (Next.js 15 + FastAPI + 48 endpoints + Stripe + Supabase + RAG + PDF + Resend) mais qui présente plusieurs **failles bloquantes critiques** rendant impossible toute mise en production payante en l'état. La promesse marketing est largement plus avancée que l'implémentation réelle.

**Niveau de maturité (estimation) :**

- Code & architecture : **7/10** (excellent squelette technique)
- Sécurité applicative : **2/10** (failles critiques exploitables)
- Sécurité IA / contenu pédagogique : **3/10** (hallucinations possibles, pas de validation humaine)
- Conformité légale / RGPD : **4/10** (textes présents mais placeholders bloquants)
- Cohérence offres / promesses marketing : **3/10** (contradictions multiples entre landing, app, CGU, CGV, backend)
- Backend / persistance : **3/10** (tout en mémoire RAM, perte totale au redémarrage)

**Peut-on lancer maintenant ? NON.** Ni en bêta publique, ni en payant.

**Bêta privée fermée (< 30 testeurs amis triés, sans paiement, sans données réelles, sans promesse pédagogique) : POSSIBLE en l'état, à condition d'ajouter un disclaimer "version pré-bêta" très visible et de désactiver l'admin panel.**

### 5 blocages prioritaires P0 (avant toute exposition publique)

1. **Mot de passe admin en clair dans le bundle client** (`app/admin/page.tsx` ligne 13) : `pw === 'ma1admin2026'`. N'importe quel visiteur peut ouvrir le source et accéder à l'admin → accès à /analytics, /cron/daily, etc.
2. **Toutes les routes `/rgpd/export/{user_id}`, `/rgpd/delete/{user_id}`, `/profile/{user_id}`, `/readiness/{user_id}`, `/dashboard/{owner_id}` sans authentification** : n'importe qui peut supprimer le compte d'un autre utilisateur ou siphonner ses données simplement en connaissant un user_id (qui est juste `u_` + 8 caractères hex, devinable par brute force).
3. **Stockage 100 % en RAM** (`_users`, `_profiles`, `_conversations`, `_referrals`, `_challenges`, `_groups`, `_whitelabel`, `_monitor_notes`, etc.). Au moindre redémarrage du serveur : tous les comptes payants, toutes les progressions, tous les abonnements Stripe rattachés sont **PERDUS définitivement**.
4. **Premium activé sans paiement dans la version standalone** (`public/index-standalone.html` ligne 1372) : `function goPrem(){ S.plan='premium'; S.qMax=999; ... alert('🎉 Premium active ! (Integrez Stripe)') }`. Le bouton "Premium" ne fait que mettre à jour le localStorage. Anyone clicks → Premium.
5. **Incohérences majeures sur les offres commerciales** entre la landing statique, la landing Next.js, l'app, les CGU et le backend — notamment : "2 examens blancs/jour" (landing statique) vs "1 examen blanc/mois" (CGU + backend). Risque DGCCRF / pratique commerciale trompeuse.

---

## 2. Pages et fichiers analysés

| Fichier | Rôle | Statut | Problème principal | Priorité |
|---|---|---|---|---|
| `public/landingpage.html` (361 l.) | Landing statique HTML | Présent | Promesses incohérentes avec CGU et backend | **P0** |
| `app/landing/page.tsx` (192 l.) | Landing Next.js + SEO + JSON-LD | Présent | Double landing avec valeurs différentes ; AggregateRating "4.8 / 150" fictif | **P0** |
| `public/index-standalone.html` (2 106 l. / 343 Ko) | App monolithique v7 | Présent et liée comme cible "Commencer" | Premium fake, security client-side, S.plan modifiable | **P0** |
| `app/page.tsx`, `app/dashboard/page.tsx`, `app/qcm/page.tsx`, `app/exam/page.tsx`, etc. | App Next.js (16 pages) | Présentes | Coexistence non documentée avec le standalone | **P1** |
| `public/legal/cgu.html` (68 l.) | CGU | Présentes | Placeholder "[ville à compléter]" non rempli | **P0** |
| `public/legal/cgv.html` (48 l.) | CGV | Présentes | **Plan Annuel 79€ ABSENT** ; nom du médiateur "[à compléter]" | **P0** |
| `public/legal/confidentialite.html` (94 l.) | Politique de confidentialité | Présente | Adresse DamCompany "[à compléter]" | **P0** |
| `public/legal/mentions-legales.html` (41 l.) | Mentions légales | Présentes | SIRET, RCS, forme juridique, adresse, directeur publication = **tous "[à compléter]"** | **P0** |
| `backend/src/api.py` (1 278 l.) | API FastAPI | Présente | Persistance RAM, auth manquante sur de nombreuses routes | **P0** |
| `backend/scripts/supabase_schema.sql` (68 l.) | Schéma Supabase | Présent | RLS `USING (true)` = ouvert à tous | **P0** |
| `app/api/*/route.ts` (16 routes) | Proxies Next vers backend | Présents | Forwards bruts sans validation, identiques d'une route à l'autre (copier-coller) | **P1** |
| `lib/store.ts` | Zustand persisté | Présent | Token persisté en localStorage avec userName, plan, profile | **P1** |
| `lib/api.ts` | Client API | Présent | Pas de gestion centralisée d'auth (token non envoyé en header) | **P1** |
| `components/auth/AuthModal.tsx` | Auth modale | Présente | Pas de validation côté client de l'email, message d'erreur générique | **P2** |
| `app/admin/page.tsx` | Page admin | Présente | **Mot de passe `ma1admin2026` en dur côté client** | **P0** |
| `components/ui/RGPDBanner.tsx` | Bannière cookies | Présente | Inutile : la politique dit "cookies techniques uniquement" qui n'exigent pas de consentement | **P2** |
| `app/settings/page.tsx` | Paramètres + RGPD | Présent | Export/delete sans vérif token | **P0** |
| `app/blog/*` (4 articles) | Blog SEO | Présent | Non audité en détail (à vérifier qualité contenu pédagogique) | **P2** |
| `e2e/*.spec.ts` (5 specs) | Tests Playwright | Présents | Non vérifiés à l'exécution | **P3** |
| `backend/tests/test_api.py` (180 l.) | Tests pytest | Présents | Non vérifiés à l'exécution | **P3** |
| `backend/.env.example` | Exemple de config | Présent | Bonne pratique : pas de secrets commités | OK |
| `.env.local.example` | Config front | Présente | OK | OK |

Fichiers attendus mais absents :

- `public/robots.txt` statique (existe `app/robots.ts` Next.js, donc OK pour le Next mais le standalone n'en a pas)
- `public/sitemap.xml` statique (existe `app/sitemap.ts` Next.js, idem)
- Page "/contact" ou formulaire pour le CTA "Contacter les ventes" — absent
- Page récapitulative "comparaison plans" détaillée — absente
- Documentation `CLAUDE.md` racine (alors que les guardrails y font référence)

---

## 3. Audit landing page

Deux landings coexistent et ne disent pas la même chose, c'est le premier problème structurel.

### 3.1 `public/landingpage.html` (HTML statique servi à la racine)

**Points forts :**

- Direction artistique cohérente avec le standalone (palette navy / teal / sky, starfield).
- Hero clair : "Réussis ton Code avec l'IA".
- 6 features bien identifiées.
- 3 plans tarifaires affichés.
- Footer avec liens vers les 4 pages légales.

**Problèmes :**

| # | Problème | Détail | Priorité |
|---|---|---|---|
| 3.1.1 | **Texte fonctionnalité fausse** | Bloc "Vérif. Technique" listé comme feature publique, alors que dans le standalone (ligne 2022) elle est verrouillée Premium et redirige vers le paywall. | P0 |
| 3.1.2 | **Quota Examen Blanc incohérent** | Ligne 240 : "2 examens blancs / jour" pour le plan Gratuit. CGU (ligne 49) et backend (`PLAN_LIMITS["free"]["exam_per_month"] = 1`) disent : 1/mois. Écart × 60. Risque DGCCRF. | P0 |
| 3.1.3 | **CTA "200€/mois · 30 élèves inclus"** (ligne 309) | Pointe vers `/index-standalone.html` au lieu d'un formulaire de contact, alors que la page admin standalone est inaccessible sans avoir un plan auto-école déjà actif. Cul-de-sac UX. | P0 |
| 3.1.4 | **Aucun témoignage, aucune preuve sociale, aucune capture produit réelle** | Le bloc "Apercu du dashboard moniteur" est un simple texte centré ("24 élèves · 72% · 8 prêts") — pas une vraie capture. | P1 |
| 3.1.5 | **Aucun élément de réassurance** : pas d'avis, pas de logo média, pas de pourcentage de réussite. | Le concurrent Ornikar affiche % de réussite, témoignages vidéos, badges presse. | P1 |
| 3.1.6 | **Pas de mention du seuil de réussite officiel** (35/40 = officiel français) — la landing dit 80% / 32/40 ce qui est faux pour 2026 (le seuil officiel ANTS est 35/40 = 87,5 %). | Risque crédibilité pédagogique. | P0 |
| 3.1.7 | **Accents systématiquement supprimés** dans le HTML statique ("Reussis", "Decouvrir", "auto-ecoles"). | Lecture moins professionnelle, dégrade l'image premium. Probable choix volontaire pour éviter problèmes d'encodage mais à corriger. | P1 |
| 3.1.8 | Pas de balise `<html lang>` cohérente avec le contenu fr et accents absents. | Mineur. | P3 |
| 3.1.9 | **Lien "Acceder a MA1" dans la nav** = `/index-standalone.html` | OK techniquement, mais expose immédiatement la version v7 monolithe au lieu de l'app Next.js v8 listée comme la "nouvelle" version. | P1 |
| 3.1.10 | Aucun bandeau cookies ni lien vers la bannière RGPD. | Le RGPDBanner n'est utilisé que dans la version Next.js. | P1 |
| 3.1.11 | "Veille Juridique" en feature publique gratuite | Le backend `/veille` appelle Claude → coût Anthropic non couvert par le plan gratuit. | P1 |

### 3.2 `app/landing/page.tsx` (landing Next.js)

**Points forts :**

- SEO travaillé : title et keywords pertinents, JSON-LD `SoftwareApplication` avec offers.
- FAQ avec 6 questions.
- 4 plans listés (incluant l'Annuel).
- Stats numériques claires.
- Footer + 4 liens légaux.

**Problèmes :**

| # | Problème | Détail | Priorité |
|---|---|---|---|
| 3.2.1 | **JSON-LD invente des avis** : `"aggregateRating": { "ratingValue": "4.8", "ratingCount": "150" }` (ligne 188) | Google peut sanctionner (Rich Results) ET DGCCRF (avis fictif = pratique trompeuse). | **P0** |
| 3.2.2 | **Incohérence avec la landing statique** : ici "1 examen blanc / mois" (cohérent CGU) mais landing statique = "2/jour". | Lectrice / lecteur ne sait pas quelle landing fait foi. | P0 |
| 3.2.3 | **Coexistence non gérée des 2 landings** (statique + Next.js) | Risque doublon SEO, duplicate content. Choisir laquelle est canonique. | P0 |
| 3.2.4 | "Premium Annuel" : description annonce "Économisez 41€" alors que 12 × 10 − 79 = 41 €. Calcul juste mais : la CGV ne mentionne PAS cette offre annuelle. | Vente d'un produit non couvert par les CGV = pratique illégale. | P0 |
| 3.2.5 | CTA "Contacter les ventes" → `href: '/dashboard'` (ligne 43) | Donc clic envoie sur le dashboard auto-école pour quelqu'un qui n'est pas client. Cul-de-sac. | P1 |
| 3.2.6 | FAQ "MA1 est-il vraiment gratuit ?" → "10 questions IA par jour, des QCM adaptatifs sur 9 thèmes, et 1 examen blanc par mois" | OK cohérent ici, mais contredit la landing statique. | P0 |
| 3.2.7 | FAQ "Mes données sont-elles protégées ? → Vos données restent sur votre appareil (localStorage)" | **FAUX.** Les données sont envoyées à un backend FastAPI (Railway) + Anthropic + potentiellement Supabase. Mensonge RGPD. | **P0** |
| 3.2.8 | Pas de pixel analytics ni de mesure conversion (légitime par souci RGPD mais à mentionner explicitement dans une promesse). | P2 |
| 3.2.9 | Lien `/?upgrade=premium` vers `/` mais aucun handler ne lit ce param côté app pour ouvrir un checkout Stripe. | Promesse non branchée. | P1 |

### Verdict landing

Une landing fictivement crédible, mais **deux versions qui se contredisent + promesses parfois fausses + offre non couverte par les CGV + avis aggregateRating fabriqué**. À ne PAS publier en l'état.

---

## 4. Audit application IA (module par module)

L'app existe en deux versions :

- **Version v7 standalone** : `public/index-standalone.html` (2 106 l., 343 Ko), monolithique, JS inline.
- **Version v8 Next.js** : `app/` + `components/` (React, Zustand, Tailwind).

| Module | Statut v8 (Next.js) | Statut v7 (standalone) | Réel / mocké | Risque | Correction recommandée |
|---|---|---|---|---|---|
| Onboarding | Fonctionnel (`components/ui/Onboarding.tsx`) | Fonctionnel | Réel (UI) | UX OK | RAS |
| Test de positionnement | Fonctionnel (`app/positioning/page.tsx`) | Fonctionnel | Réel (sauf que les 10 questions de `POSITIONING_QUESTIONS` dans `lib/constants.ts` sont en dur — pas générées) | Trop peu de questions pour un vrai test de niveau | Passer à 20-30 questions par profil |
| Assistant IA (chat) | Fonctionnel via SSE (`ChatPanel.tsx`) | Fonctionnel | Réel, branché à Claude via `/chat/stream` | Hallucinations possibles, RAG optionnel | Ajouter validation des réponses |
| QCM adaptatifs | Fonctionnel (`QCMPanel.tsx`) | Fonctionnel | **Mi-réel mi-mocké** : QCM générés à la volée par Claude → contenu non validé pédagogiquement | **Élevé** : réponses fausses possibles | Constituer une banque validée |
| Examen blanc | Fonctionnel (`ExamPanel.tsx`) | Fonctionnel | Idem : 40 questions agrégées via 5 appels à `generateQCM` → 5 × coût Claude par examen | Seuil de réussite = 80 % (32/40), or seuil officiel France = 87,5 % (35/40) | Corriger le seuil |
| Vision panneaux | Fonctionnel (`VisionPanel.tsx`) | Fonctionnel | Réel, branché à Claude Vision | Coût élevé (5 Mo max OK) | RAS sauf quota Premium à imposer |
| Veille réglementation | Fonctionnel (`app/veille/page.tsx`) | Fonctionnel | **Mocké pédagogiquement** : Claude génère un texte sans source vérifiée, cached 1 jour | **Très élevé** : Claude peut inventer une "modif" du Code de la route | Brancher un vrai flux Légifrance ou désactiver |
| Plan 30 jours | Fonctionnel (`Plan30Panel.tsx`) | Fonctionnel | Réel (constants.ts) | Pas adapté au profil (même plan pour tous) | OK pour v1 |
| Readiness | Fonctionnel (`/readiness/{uid}`) | Fonctionnel | Réel mais formule non documentée | Métriques inventées | OK pour bêta, à transparentiser |
| Gamification XP/streak | Fonctionnel | Fonctionnel | Réel (zustand persisté) | Badges côté client → tricheables | OK pour v1 |
| Classement (leaderboard) | Fonctionnel (`LeaderboardPanel.tsx`) | Fonctionnel | Réel | Affiche tous les users sans pagination ni anonymisation (RGPD : montrer name + email → opt-in obligatoire) | Demander consentement |
| Parrainage | API présente (`/referral/`) | API présente | Réel mais aucune vérification que l'utilisateur a bien été parrainé avant d'être inscrit | Auto-attribution possible | Backend doit lier referral à inscription |
| Espace moniteur | Fonctionnel (`DashboardPanel.tsx`) | Fonctionnel (`loadAEPanel`) | **Mi-réel** : add-student fonctionne SI le student est déjà inscrit, sinon erreur. Pas d'invitation par email. | UX moyenne | Ajouter flow invitation |
| White-label | Présent (`WhiteLabelSettings.tsx`) | Présent | Réel (stocké en mémoire `_whitelabel`) → **perdu au reboot** | **Élevé** : promesse premium non tenue | Persister |
| Paramètres | Fonctionnel (`app/settings/page.tsx`) | Fonctionnel | Réel | Pas d'auth sur delete/export | **P0** |
| Export données RGPD | Fonctionnel | Fonctionnel | Réel mais aucune vérification d'identité | **P0 RGPD** | Token JWT obligatoire |
| Suppression compte | Fonctionnel | Fonctionnel | Idem **P0 RGPD** | Token JWT obligatoire |
| Gestion Premium / Stripe | Endpoint backend OK | **Fake** : `goPrem()` ligne 1372 modifie juste S.plan localement | Le standalone vend Premium SANS Stripe ! | **P0 fraude** | Désactiver `goPrem` ou brancher Stripe |
| Notifications push | Endpoint `/push/subscribe` présent | Pas dans le standalone | Backend OK, frontend partiel (`NotificationPrompt.tsx`) | Nécessite VAPID keys non documentées | RAS |
| Service worker (PWA) | `public/sw.js` (52 l.) | Activé | Réel mais sommaire | OK pour v1 | RAS |
| Responsive mobile | Tailwind utility + breakpoints | CSS dédié | Réel | À tester sur vrais device | Tests Playwright mobile |
| Admin panel | Présent `/admin` | Présent `loadAdminPanel` | **Auth bidon** : mot de passe en dur côté client | **P0 critique** | Auth backend obligatoire |
| API publique tierce | `/api/v1/keys/create`, `/api/v1/qcm`, `/api/v1/chat` | n/a | Réel mais création de clé SANS authentification ! Anyone peut s'auto-générer une clé | **P0** | Authentification obligatoire |

---

## 5. Audit offres / pricing

### 5.1 Tableau comparatif (incohérences détectées)

| Plan | landing/public | landing/Next.js | standalone | CGU | CGV | backend `PLAN_LIMITS` | backend `/pricing` | Schéma Supabase |
|---|---|---|---|---|---|---|---|---|
| **Gratuit** : questions IA / jour | 10 | 10 | 10 (hardcodé `qMax=10`) | 10 | non mentionné | 10 | dérivé de PLAN_LIMITS | OK |
| **Gratuit** : QCM / mois | non mentionné | non mentionné | non mentionné | non mentionné | non mentionné | 80 | dérivé | OK |
| **Gratuit** : examens blancs | **2 / jour** | **1 / mois** | non chiffré (mais `examFree=1` en localStorage) | 1 / mois | n.m. | **1 / mois** | dérivé | OK |
| **Gratuit** : analyse panneaux | non mentionné | inclus | inclus (mais consomme un "question" → comptabilisé dans les 10) | listé feature | n.m. | partagé avec quota questions | n.m. | n.a. |
| **Premium** : prix | 10 €/mois | 10 €/mois | 10 €/mois | 10 €/mois | 10 € TTC | 10 € | 10 € | 'premium' OK |
| **Premium** : essai gratuit | 7 j | 7 j | "7 jours gratuits" | non mentionné | **7 jours** + rappel 48 h | non géré côté backend | trial_days: 7 | non géré |
| **Premium** : thèmes PRO (eco, moto, nuit) | listé | "Tous les thèmes" | implémenté (constants.ts) | NON mentionné | NON mentionné | non vérifié | n.m. | n.a. |
| **Premium** : streaming temps réel | n.m. | listé | activé pour tous (pas de vérif plan) | n.m. | n.m. | non gated | n.m. | n.a. |
| **Premium** : plan 30 jours | listé | n.m. | accessible à tous | n.m. | n.m. | non gated | n.m. | n.a. |
| **Annuel** : prix | 79 €/an | 79 €/an | NON présent dans le pricing modal | NON présent | **NON présent** | 79 € | 79 € | **'annual' violera le CHECK** |
| **Annuel** : durée | "2 mois offerts" | "Économisez 41 €" | n/a | n/a | n/a | non géré | n.m. | INVALIDE |
| **Auto-école** : prix | 200 €/mois | 200 €/mois | 200 €/mois | 200 €/mois | 200 € TTC | 200 € | 200 € | 'autoecole' OK |
| **Auto-école** : nb élèves | 30 inclus | 30 | 30 apprenants | 30 apprenants | n.m. | non plafonné dans le code (`add_student` accepte illimité) | n.m. | non contrôlé |
| **Auto-école** : white-label | listé | listé | API présente | n.m. | n.m. | présent | n.m. | non persisté |

### 5.2 Liste des incohérences à corriger (priorité décroissante)

1. **P0** — Plan **Annuel** vendu sur les deux landings sans être présent ni dans les CGV (pas de prix, pas de modalités, pas de droit de rétractation propre, pas de mention engagement annuel) ni dans le schéma Supabase (`users.plan` accepte uniquement `('free','premium','autoecole')`). Toute tentative d'inscription en Annuel **plantera** la DB.
2. **P0** — Examens blancs gratuits : landing statique annonce 2/jour, CGU et backend disent 1/mois. Choisir et harmoniser.
3. **P0** — "Vérification technique" annoncée comme feature universelle dans la landing statique mais réservée Premium dans l'app (paywall ligne 2022 du standalone).
4. **P0** — Auto-école : le quota de 30 élèves n'est PAS contrôlé côté backend (`add_student` accepte une liste illimitée). Promesse non tenue / favorise l'abus.
5. **P0** — Standalone `goPrem()` (ligne 1372) attribue Premium SANS paiement. Bouton dans l'overlay pricing utilisé en production.
6. **P0** — Bouton "Contacter les ventes" inutilisable (ouvre alert() ou redirige vers `/dashboard`).
7. **P1** — Thèmes "PRO" (eco, moto, nuit) annoncés sur la landing statique mais absents des CGU/CGV. Si payés, la nature de la prestation doit être contractuelle.
8. **P1** — Le streaming "temps réel" listé comme avantage Premium n'est pas restreint côté code.
9. **P1** — Période d'essai 7 jours : la CGV dit "rappel 48 h avant la fin" mais aucun code backend ne déclenche réellement ce rappel (la fonction `send_trial_reminder` existe mais n'est appelée que via le cron, et le cron n'est pas planifié dans le repo).
10. **P1** — Aucune limite mensuelle sur l'usage QCM/exam pour Premium (`99 999` = illimité). Annoncer "illimité" est OK juridiquement seulement si on a une politique "fair use" écrite, qui manque.

### 5.3 Proposition d'offre harmonisée (à valider avant correction)

> Ne PAS l'implémenter sans approbation : ce n'est qu'une proposition.

#### Gratuit
- 10 questions IA / jour (chat + vision combinés)
- QCM adaptatifs illimités sur 9 thèmes (vitesse, signalisation, priorité, alcool, permis, autoroute, stationnement, sécurité, premiers secours)
- 1 examen blanc / mois
- Plan 30 jours (consultation uniquement, sans tracking personnalisé)
- Test de positionnement
- Accès Légifrance via RAG (sources citées)

#### Premium — 10 € TTC / mois (essai 7 jours)
- Tout Gratuit, plus :
- Questions IA illimitées (fair use 200/jour pour éviter abus)
- Examens blancs illimités
- 3 thèmes PRO : éco-conduite, moto, conduite de nuit
- Plan 30 jours personnalisé (recalcul selon points faibles)
- Vérifications techniques (10 questions)
- Export PDF rapport progression
- Mode hors-ligne (cache QCM avancé)
- Support email prioritaire (réponse ≤ 24 h)

#### Premium Annuel — 79 € TTC / an (à ajouter dans CGV)
- Tout Premium, plus :
- 2 mois offerts (équivalent 6,58 €/mois)
- Engagement annuel, résiliable à tout moment (effet à la fin de la période)

#### Auto-École — 200 € TTC / mois
- Tout Premium pour le compte propriétaire
- Dashboard moniteur avec **30 élèves inclus** (à enforcer côté backend)
- Élèves supplémentaires : 5 €/élève/mois
- Alertes inactivité, notes par élève, groupes (promotions)
- Export PDF/CSV de la progression
- White-label complet (logo, palette, nom)
- Support dédié + onboarding 30 min
- À mentionner explicitement dans CGV : contrat B2B, facturation, durée, résiliation, RGPD sous-traitant

---

## 6. Audit légal / RGPD

### 6.1 Conforme

- Présence des 4 pages obligatoires : CGU, CGV, Confidentialité, Mentions légales.
- Politique de confidentialité bien structurée : finalités, bases légales (Art. 6 RGPD), durées de conservation, droits (Art. 15-22), CNIL mentionnée.
- Mention claire des sous-traitants hors UE (Anthropic, Stripe, Vercel) et clauses SCC.
- Information sur les mineurs (RGPD français : seuil 15 ans).
- Disclaimer "MA1 n'est pas un service de conseil juridique" présent CGU §3 + en bas de chaque réponse chat (`AI_DISCLAIMER`).
- Droit de rétractation 14 jours + exception (utilisation immédiate du service Premium).
- DPO contact : `dpo@ma1.app`.

### 6.2 À compléter (P0 avant toute mise en ligne payante)

| # | Fichier | Champ manquant | Risque |
|---|---|---|---|
| 6.2.1 | `mentions-legales.html` | Forme juridique (SAS/SARL/AE), Siège social, SIRET, RCS, Directeur publication | **Obligation légale (LCEN 2004)** — amende 75 000 € PP / 375 000 € PM |
| 6.2.2 | `confidentialite.html` | Adresse postale du responsable de traitement | Obligation RGPD Art. 13 |
| 6.2.3 | `cgu.html §10` | "tribunaux compétents de **[ville à compléter]**" | Clause attributive incomplète |
| 6.2.4 | `cgv.html §9` | "médiateur compétent : **[Nom du médiateur à compléter]**" | Obligation Code consommation L612-1 |
| 6.2.5 | `cgv.html` | Plan Annuel 79 € **non mentionné** alors que vendu sur les 2 landings | Vente sans CGV applicables |
| 6.2.6 | `cgv.html` | Pas d'identification du vendeur (DamCompany, adresse, SIRET) | Obligation L221-5 |
| 6.2.7 | `cgu.html §4` | Pas de procédure de vérification du consentement parental pour < 15 ans (déclaration sur l'honneur ? upload de pièce ? email tuteur ?) | Risque CNIL |
| 6.2.8 | `confidentialite.html §7 Cookies` | "Le consentement est recueilli via la bannière cookies conforme ePrivacy" → mais la bannière n'a **PAS de gestion granulaire** (technique vs analytics) | Risque CNIL — sanction connue |

### 6.3 Risques RGPD / IA / mineurs

| # | Risque | Détail | Priorité |
|---|---|---|---|
| 6.3.1 | **Endpoints RGPD sans auth** | `/rgpd/export/{user_id}` et `/rgpd/delete/{user_id}` ne vérifient JAMAIS l'identité de l'appelant. Un attaquant qui connaît un user_id (8 hex = brute-forçable) peut exfiltrer ou supprimer un compte. | **P0** |
| 6.3.2 | **Pas de procédure d'âge réel** | L'inscription demande "année de naissance" (`birth_year`) en dropdown mais aucune vérification. Un enfant de 8 ans peut s'inscrire en cliquant "2008". | P0 |
| 6.3.3 | **Pas de consentement parental** | RGPD français Art. 8 : < 15 ans = consentement parental obligatoire. La CGU le mentionne mais aucun mécanisme technique. | P0 |
| 6.3.4 | **Mensonge dans la FAQ** | La FAQ landing Next.js dit "Vos données restent sur votre appareil (localStorage)" → faux, elles sont envoyées à FastAPI + Anthropic. | P0 |
| 6.3.5 | **JSON-LD avec aggregateRating fictif** | "4.8 / 150 avis" = fictif. Pratique trompeuse + sanction Google. | P0 |
| 6.3.6 | **Pas de DPA signé visible avec Anthropic** | Mentionné dans politique mais pas de preuve | P1 |
| 6.3.7 | **Bannière cookies trompeuse** | Le RGPDBanner dit "MA1 utilise des cookies" → mais seulement du localStorage technique → la bannière est superflue ET porte atteinte à la liberté du consentement (pas de "refuser tout" facile, design uniforme). | P1 |
| 6.3.8 | **Logs serveur 12 mois sans purge** | La politique annonce 12 mois mais aucun mécanisme de purge dans le code. | P2 |
| 6.3.9 | **Données envoyées à Anthropic** | Question chat + image transmise → contient potentiellement nom, données perso. Pas de mécanisme de redaction. | P1 |
| 6.3.10 | **Leaderboard expose les noms** sans consentement explicite | Affiche prénom + niveau + score → publication sans opt-in = violation RGPD. | P1 |

### 6.4 Verdict légal

**État : non conforme pour un lancement commercial.** Tous les placeholders doivent être remplis et les endpoints RGPD doivent vérifier le token JWT. Tant que ce n'est pas fait, le service ne peut pas être ouvert à un mineur, ni encaisser un paiement.

---

## 7. Audit IA / sécurité

### 7.1 Risques IA identifiés

| # | Risque | Détail | Priorité |
|---|---|---|---|
| 7.1.1 | **Hallucination QCM** | `QCM_PROMPT` demande à Claude de générer "exactement {n} questions QCM". Aucun mécanisme de relecture humaine. Une question fausse peut faire échouer un candidat à l'examen réel. | **P0** |
| 7.1.2 | **Hallucination chat** | Disclaimer présent ("ne constitue pas un conseil juridique") mais le ton encourageant ("réponds avec emojis") + RAG optionnel (si Chroma non présent, pas de contexte) → réponse peut citer un article inexistant. | P0 |
| 7.1.3 | **Pas de validation côté backend des QCM générés** | Le code prend `JSON.loads` brut. Si Claude renvoie un format légèrement différent, ça lève une exception 500 ou affiche du JSON mal formé à l'utilisateur. | P1 |
| 7.1.4 | **Prompts système visibles côté backend** | Les prompts sont en clair dans le code source. Un attaquant pourrait tenter du prompt injection via `req.message` (rien n'est sanitisé). | P1 |
| 7.1.5 | **Pas de garde-fou refus** | Le système prompt dit "Ne traite PAS les sujets hors code de la route" mais aucun mécanisme post-réponse ne le vérifie. | P2 |
| 7.1.6 | **Veille juridique = Claude pur** | `/veille` demande à Claude de "synthétiser les dernières modifications du Code de la route" — Claude ne dispose pas d'un flux web temps réel et **inventera**. Cached 1 jour donc l'invention persiste. | **P0** |
| 7.1.7 | **Vision sans modération de contenu** | L'utilisateur peut uploader n'importe quelle image (5 Mo max). Pas de filtre contenu (nudité, violence, contenu illégal). | P1 |
| 7.1.8 | **Pas de journalisation des erreurs IA** | Les `except: pass` (lignes 264, 363, 718, 814...) avalent silencieusement les erreurs Anthropic, Supabase, Resend, Stripe. | **P0** |
| 7.1.9 | **Pas de bouton "Signaler une erreur"** sur les réponses IA | Aucun moyen pour l'utilisateur de remonter une hallucination. | P1 |
| 7.1.10 | **Pas de mention claire que les QCM sont IA-générés** | L'utilisateur croit consommer du contenu validé. À distinguer visuellement (badge "IA"). | P1 |

### 7.2 Sécurité technique IA

| # | Risque | Détail | Priorité |
|---|---|---|---|
| 7.2.1 | **Clé Anthropic côté serveur** ✅ | Bonne pratique : `os.getenv("ANTHROPIC_API_KEY")` dans `backend/.env`. Pas exposée au frontend. | OK |
| 7.2.2 | **Le standalone HTML appelle directement le backend Railway** | URL hardcodée ligne 1214 : `https://ma1-ton-assistant-de-la-route-production.up.railway.app`. Pas de proxy intermédiaire, pas d'origine CORS restreinte (`allow_origins=["*"]`). N'importe qui peut interroger l'API depuis n'importe quel domaine. | **P0** |
| 7.2.3 | **JWT_SECRET avec valeur par défaut faible** | `"ma1-dev-secret-change-in-production-min32chars!"`. Si jamais déployé sans surcharger, un attaquant peut forger n'importe quel token. | **P0** |
| 7.2.4 | **Fallback bcrypt → sha256** | Si `bcrypt` n'est pas installé, le code retombe sur sha256 sans salt (lignes 24-27). Aucun warning. | **P0** |
| 7.2.5 | **CORS = `*`** | `allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]`. Toute origine peut envoyer des credentials. | **P0** |
| 7.2.6 | **Pas de rate limiting effectif sur endpoints sensibles** | `slowapi` importé mais pas appliqué via decorators sur les routes critiques. | P0 |
| 7.2.7 | **Création de clé API publique sans auth** | `/api/v1/keys/create` accepte n'importe quel `owner_id` et délivre une clé. Quota daily reset à minuit, donc abusable. | **P0** |
| 7.2.8 | **Token JWT envoyé en query string** | `/auth/me?token=...` → les tokens fuitent dans les logs serveur et reverse proxies. | P1 |

### 7.3 Système de sécurité IA recommandé (à valider)

1. **Prompt système renforcé** : "Si tu n'es pas sûr à 95 %, réponds 'Je ne peux pas garantir cette information, vérifie sur Légifrance' et cite l'article exact."
2. **Banque de QCM validée humaine** : 500 questions vérifiées (par DamCompany ou un partenaire moniteur d'auto-école) en backend, l'IA n'est utilisée que pour reformuler ou expliquer.
3. **Bouton "Signaler une erreur"** sur chaque QCM/réponse, alimente un dashboard interne.
4. **Disclaimer pédagogique** plus visible (déjà partiellement présent).
5. **Filtrage des inputs** : longueur max, blacklist de phrases (`ignore previous instructions`, etc.).
6. **Limitation d'abus** : `slowapi` actif sur `/chat`, `/qcm/generate`, `/vision`, `/auth/register`.
7. **Backend obligatoire pour les appels IA** : déjà OK (clé API côté serveur).
8. **Journalisation** : tous les appels Claude loggés avec model, tokens, latency, statut. Remplacer les `except: pass` par `logger.exception`.
9. **Validation JSON QCM** : schéma Pydantic strict, retry si malformé, fallback banque statique.

---

## 8. Audit technique

### 8.1 Frontend (Next.js + React)

| # | Problème | Détail | Priorité |
|---|---|---|---|
| 8.1.1 | **Coexistence Next.js / monolithe** | Deux apps qui rendent les mêmes fonctionnalités (chat, QCM, exam, dashboard). Maintenir les 2 est coûteux. | P0 (décider laquelle on supprime) |
| 8.1.2 | **API routes Next.js = proxies identiques copier-coller** | 16 fichiers `app/api/*/route.ts` strictement identiques. Une seule route catch-all `app/api/[...path]/route.ts` suffirait. | P2 |
| 8.1.3 | **Token JWT en localStorage** | `localStorage.setItem('ma1_token', d.token)` (AuthModal.tsx ligne 29) — vulnérable XSS. Plutôt un cookie HttpOnly Secure. | P1 |
| 8.1.4 | **`dangerouslySetInnerHTML`** | Utilisé dans `ChatPanel.tsx` ligne 92 et `VisionPanel.tsx` ligne 46 sur la réponse IA. Si Claude renvoie du HTML/JS → XSS. | **P0** |
| 8.1.5 | **Pas de gestion globale d'erreur** | Boundary React absent. Une erreur dans un composant casse toute la page. | P1 |
| 8.1.6 | **Performance landing statique** | 360+ lignes inline + 100 étoiles canvas animées + 2 glow flou 120 px → 50+ Mo RAM / mobile bas de gamme. | P2 |
| 8.1.7 | **Accessibilité quasi nulle** | Pas de `aria-label`, contrastes (`text-white/30` sur fond bleu marine) très faibles, `<button>` sans textuel. | P1 |
| 8.1.8 | **SEO partiel** | landing Next.js OK, landing statique sans og:image, sitemap.xml uniquement via Next.js (n'inclut donc pas les pages statiques). | P2 |
| 8.1.9 | **Favicon manquant ?** À vérifier (pas listé dans `public/`). | P3 |
| 8.1.10 | **Service worker bricolé** | `public/sw.js` 52 lignes — pas testé avec Workbox, risque de cache obsolète. | P2 |
| 8.1.11 | **Tailwind 3 vs Next 15 / React 19** | Pas de typo détectée mais combo récent → tester le build. | P2 |
| 8.1.12 | **MobileNav, RightPanel, Sidebar** | Non audités en profondeur (lignes courtes, à vérifier UX mobile). | P2 |
| 8.1.13 | **`fmt()` fragile dans ChatPanel** | Conversion markdown rudimentaire (regex sur `\*\*`, `\*`, `\n`). Casse sur listes, code, tableaux. | P3 |

### 8.2 Backend (FastAPI)

| # | Problème | Détail | Priorité |
|---|---|---|---|
| 8.2.1 | **TOUT en mémoire RAM** | `_users`, `_profiles`, `_conversations`, `_referrals`, `_challenges`, `_groups`, `_whitelabel`, `_monitor_notes`, `API_KEYS`, `_analytics`. Au redémarrage → tout est perdu. Supabase optionnel et même quand actif, fallback systématique sur la RAM. | **P0** |
| 8.2.2 | **Pas de migration de schéma** | `supabase_schema.sql` à exécuter manuellement, pas de versioning. | P1 |
| 8.2.3 | **RLS Supabase = ouvert** | `CREATE POLICY "Users read own" ON users FOR SELECT USING (true)` → tout le monde lit tout. Aucune policy INSERT/UPDATE/DELETE. | **P0** |
| 8.2.4 | **`except: pass` partout** | 15+ occurrences. Erreurs Stripe, Supabase, Anthropic, Resend silencieusement avalées. | **P0** |
| 8.2.5 | **Webhook Stripe non testé** | La fonction existe mais pas de e2e test. Risque que les paiements ne mettent jamais à jour le plan. | **P0** |
| 8.2.6 | **CORS `*`** | Cf 7.2.5. | **P0** |
| 8.2.7 | **JWT_SECRET défaut** | Cf 7.2.3. | **P0** |
| 8.2.8 | **`/auth/login` ne contrôle pas le rate** | Brute-force possible sur les mots de passe. | P0 |
| 8.2.9 | **Pas de logs structurés** | Mélange `print`, pas de niveau, pas de format. | P1 |
| 8.2.10 | **Pas de Sentry / monitoring** | Aucune visibilité erreurs prod. | P1 |
| 8.2.11 | **Endpoints `/profile/{user_id}`, `/readiness/{user_id}`, `/usage/{user_id}` sans auth** | Voir 1. | **P0** |
| 8.2.12 | **`/dashboard/{owner_id}` sans auth** | N'importe qui peut voir le dashboard d'une auto-école en connaissant son user_id. | **P0** |
| 8.2.13 | **`/dashboard/note?owner_id=&student_id=&note=` en POST query string** | Note (potentiellement données perso d'un mineur) en URL → leak dans logs. | P1 |
| 8.2.14 | **API publique tierce ouverte** | `/api/v1/keys/create` sans auth. Quota daily 100/key. Un script peut générer 1000 clés → bypass total. | **P0** |
| 8.2.15 | **Pas de versioning d'API** | Tout sur `/auth/*`, `/qcm/*`, etc. → casser la rétrocompatibilité brisera tous les clients. | P2 |

### 8.3 Données / persistance

- Backend in-memory : tout est volatile. Inacceptable pour une bêta payante.
- Supabase schéma fourni mais RLS ouvert et pas de table `subscriptions`, `payments`, `consents`, `email_consents`, `students` (les `_autoecole_students` n'ont pas leur table).
- Logs analytics stockés en mémoire (`_analytics`) puis (peut-être) en table Supabase — pas garanti.
- Aucun script de backup.
- Aucune politique de purge (cf 12 mois logs annoncés).

### 8.4 Tests & CI/CD

- `e2e/` 5 specs Playwright présentes (landing, onboarding, chat, qcm, exam) — non vérifiées en exécution.
- `backend/tests/test_api.py` 180 l. — non vérifié.
- `.github/workflows/ci.yml` (46 l.) — non vérifié.
- `playwright.config.ts` présent.
- Pas de coverage report.
- Pas de tests d'auth, ni de sécurité, ni de RGPD.

---

## 9. Audit pédagogique

| # | Problème | Détail | Priorité |
|---|---|---|---|
| 9.1 | **Aucune banque de QCM validée** | `backend/data/qcm_bank.json` référencé mais l'`generate_qcm_bank.py` génère via Claude → contenu non revu par expert. | **P0** |
| 9.2 | **Seuil de réussite 80 % (32/40)** | Le seuil officiel ANTS en France est **35/40 = 87,5 %** depuis 2016. Le backend affiche "passed=correct>=32" (api.py ligne 507). Promesse pédagogique fausse. | **P0** |
| 9.3 | **Pas de couverture des 10 thèmes officiels** | Les 10 thèmes officiels du Code de la route 2026 : R1 dispositions légales, R2 conducteur, R3 route, R4 autres usagers, R5 réglementation, R6 équipements, R7 mécanique, R8 environnement, R9 secours, R10 conduite. Le projet en a 9 (vitesse, signalisation, etc.) avec un mapping non aligné. | P0 |
| 9.4 | **Vérifications techniques** | 10 questions en dur dans le standalone (`VERIF_QUESTIONS`). Il en existe officiellement ~80 (40 vérification intérieure + 40 extérieure). Insuffisant. | P1 |
| 9.5 | **Plan 30 jours rigide** | Identique pour tous, ne s'adapte pas au profil. Promesse "personnalisé" mensongère. | P1 |
| 9.6 | **Pas de mode "Permis Code-en-poche"** ni distinction Permis B / A / EB. | Cible "Code de la route" uniquement = OK pour v1. | P2 |
| 9.7 | **Pas de mise à jour réglementaire 2025-2026** | Veille générée par Claude (donc inventée). Aucun branchement Légifrance temps réel. | P0 |
| 9.8 | **Pas de signalement d'erreur QCM** | L'utilisateur ne peut pas remonter une réponse fausse. | P1 |
| 9.9 | **Distinction "contenu validé / contenu IA" absente** | Tout est affiché de manière identique. | P0 |

---

## 10. Roadmap de correction

### Phase 1 — Blocants critiques avant bêta privée (P0)

| Tâche | Impact | Difficulté | Priorité | Fichier concerné |
|---|---|---|---|---|
| Désactiver `/admin` ou refaire auth côté backend (token + role check) | Critique | Moyen | P0 | `app/admin/page.tsx`, `backend/src/api.py` |
| Vérifier JWT sur `/rgpd/*`, `/profile/*`, `/readiness/*`, `/dashboard/*`, `/usage/*`, `/whitelabel/*`, `/dashboard/note`, `/dashboard/group/*`, `/challenge/*` | Critique RGPD | Moyen | P0 | `backend/src/api.py` |
| Désactiver Premium fake côté standalone (`goPrem` ligne 1372) | Critique fraude | Faible | P0 | `public/index-standalone.html` |
| Compléter les 4 placeholders légaux (SIRET, RCS, adresse, ville tribunaux, médiateur) | Critique légal | Faible (info à fournir) | P0 | `public/legal/*.html` |
| Ajouter le plan Annuel dans la CGV ou le retirer des landings | Critique légal | Faible | P0 | `public/legal/cgv.html` ou `app/landing/page.tsx` + `public/landingpage.html` |
| Aligner quotas examen blanc : 1/mois partout | Critique commercial | Faible | P0 | `public/landingpage.html` |
| Corriger FAQ "données restent sur l'appareil" | Critique légal | Faible | P0 | `app/landing/page.tsx` |
| Retirer `aggregateRating` fictif du JSON-LD | Critique légal | Faible | P0 | `app/landing/page.tsx` |
| Restreindre CORS à `https://ma1.app` + locaux dev | Critique sécu | Faible | P0 | `backend/src/api.py` |
| Refuser de démarrer si `JWT_SECRET` == valeur par défaut | Critique sécu | Faible | P0 | `backend/src/api.py` |
| Auth obligatoire sur `/api/v1/keys/create` | Critique sécu | Faible | P0 | `backend/src/api.py` |
| Persister `_users`, `_profiles`, `_subscriptions` dans Supabase (lecture/écriture systématique, pas optionnelle) | Critique données | Élevé | P0 | `backend/src/api.py`, `backend/scripts/supabase_schema.sql` |
| Réécrire RLS Supabase : `USING (auth.uid()::text = user_id)` | Critique RGPD | Moyen | P0 | `backend/scripts/supabase_schema.sql` |
| Sanitiser sortie IA avant `dangerouslySetInnerHTML` (DOMPurify) | Critique XSS | Faible | P0 | `ChatPanel.tsx`, `VisionPanel.tsx` |
| Désactiver `/veille` ou brancher Légifrance RSS | Critique pédago | Moyen | P0 | `backend/src/api.py` |
| Constituer 200 QCM validés humainement, banque de secours | Critique pédago | Élevé (manuel) | P0 | `backend/data/qcm_bank.json` |
| Corriger seuil examen à 35/40 (87,5 %) | Critique pédago | Très faible | P0 | `backend/src/api.py` ligne 507, `ExamPanel.tsx`, standalone |
| Désactiver le standalone OU la landing statique (choix unique) | Critique cohérence | Moyen | P0 | Décision produit |

### Phase 2 — Corrections avant bêta publique (P0/P1)

| Tâche | Impact | Difficulté | Priorité | Fichier |
|---|---|---|---|---|
| Stripe checkout réellement testé + webhook activant le plan | Élevé | Élevé | P0 | `backend/src/api.py` |
| Logger structuré + Sentry | Élevé | Moyen | P1 | backend |
| Cookie HttpOnly Secure plutôt que localStorage pour le token | Élevé | Moyen | P1 | front |
| Rate-limiting effectif sur `/auth/login`, `/auth/register`, `/chat`, `/qcm/generate`, `/vision` | Élevé | Moyen | P1 | backend |
| Bouton "Signaler une erreur" sur chaque QCM | Moyen | Faible | P1 | front + back |
| Test e2e Playwright passant en CI | Moyen | Moyen | P1 | `.github/workflows/ci.yml` |
| Badge "Question IA" vs "Question validée" | Moyen | Faible | P1 | QCMPanel |
| Bannière cookies CNIL-compliant ou suppression complète si vraiment 0 cookies tiers | Moyen | Faible | P1 | `RGPDBanner.tsx` |
| Plafond fair-use Premium (200 q/jour) | Moyen | Faible | P1 | backend |
| Plafond 30 élèves Auto-école effectif | Moyen | Faible | P1 | backend `add_student` |
| Email de rappel essai 48h via cron planifié (Supabase Edge Function ou Railway cron) | Élevé légal | Moyen | P0 | backend |
| Onboarding parental pour < 15 ans (upload pièce ou double opt-in email) | Élevé légal | Élevé | P0 | front + back |
| Opt-in leaderboard (toggle "Apparaître au classement") | Moyen RGPD | Faible | P1 | front + back |
| Page `/contact` ou form auto-école sales | Moyen UX | Faible | P1 | front |

### Phase 3 — Corrections avant lancement Premium

| Tâche | Impact | Difficulté | Priorité | Fichier |
|---|---|---|---|---|
| Tests automatisés sur tunnel d'achat Stripe (Playwright + Stripe CLI) | Élevé | Élevé | P0 | `e2e/` |
| Workflow remboursement automatique (rétractation 14 j) | Moyen | Moyen | P1 | back |
| Page `/factures` consultables par l'utilisateur | Moyen | Moyen | P1 | front + back |
| Politique de fair-use écrite et visible | Faible | Faible | P1 | CGV |
| Capture produit dans la landing + 3 témoignages réels (consentement signé) | Moyen | Moyen | P1 | landing |
| White-label réellement persisté et appliqué dynamiquement à l'UI | Moyen | Élevé | P1 | back + front |
| Monitoring uptime + alerting (UptimeRobot ou Better Stack) | Moyen | Faible | P1 | infra |
| Backup automatique Supabase quotidien | Élevé | Moyen | P0 | infra |
| DPA Anthropic / Stripe / Vercel signés et archivés | Élevé légal | Faible | P0 | légal |

### Phase 4 — Optimisation après lancement

| Tâche | Impact | Difficulté | Priorité | Fichier |
|---|---|---|---|---|
| Suppression du standalone (si Next.js retenu) | Maintenabilité | Moyen | P2 | `public/index-standalone.html` |
| Refactor des 16 routes API en catch-all | Maintenabilité | Faible | P2 | `app/api/` |
| Markdown rendu correct (react-markdown) | UX | Faible | P2 | `ChatPanel.tsx` |
| Accessibilité WCAG AA | Inclusion | Moyen | P2 | front |
| Pages comparaison concurrents | SEO | Faible | P2 | nouveau |
| Mode hors-ligne complet (PWA) | Marketing | Élevé | P3 | sw.js |

---

## 11. Recommandation finale

### À corriger maintenant (avant ANY exposition)

1. Auth backend sur **toutes** les routes manipulant un user_id.
2. Persistance Supabase obligatoire (plus de RAM-only).
3. Supprimer / désactiver l'admin client-side.
4. Désactiver `goPrem()` fake.
5. Remplir les placeholders légaux + ajouter Annuel à la CGV ou le retirer des landings.
6. Aligner les quotas (examen blanc) entre landing / CGU / backend.
7. Corriger les 2 mensonges marketing : aggregateRating fictif + "données restent sur l'appareil".
8. Sanitiser le HTML rendu dans le chat (DOMPurify).
9. Forcer un JWT_SECRET et un CORS restreint en prod.
10. Décider : landing statique OU landing Next.js. App standalone OU Next.js. Pas les deux.

### Ce qui peut attendre

- Refactor des 16 routes API copier-coller.
- Suppression de fichiers anciens.
- Améliorations UX (animations, micro-interactions).
- Mode hors-ligne avancé.
- Blog / SEO long-tail.

### Ce qu'il ne faut surtout PAS vendre trop tôt

- **Veille juridique Code de la route** : non fiable (Claude invente).
- **"Réussite assurée" / "Réviser et réussir du premier coup"** tant que la banque de QCM n'est pas validée par un expert.
- **Auto-école 200 €/mois** sans : facturation propre, gestion fine du nombre d'élèves, persistance, support documenté.
- **Premium Annuel 79 €** tant que non couvert par CGV.
- **API publique tierce** tant que l'auth n'est pas robuste.

### Meilleure stratégie de lancement (recommandation)

1. **Phase 0 — 1-2 semaines** : régler tous les P0 ci-dessus (focus sécurité + persistance + cohérence offres + placeholders légaux).
2. **Phase 1 — Bêta privée fermée** : 20-50 testeurs invités (proches, étudiants permis), gratuit, feedback structuré, banque QCM en construction parallèle.
3. **Phase 2 — Bêta publique gratuite** : lancement Product Hunt / réseaux, 100 % gratuit pendant 4 semaines, collecte avis, NPS, capture émotionnelle.
4. **Phase 3 — Lancement Premium 10 €/mois** (essai 7 jours) : seulement quand : Stripe testé end-to-end + 500 QCM validés humainement + monitoring en place + DPA signés.
5. **Phase 4 — B2B Auto-école** : à partir de 100 utilisateurs Premium engagés (preuve d'usage), avec offre dédiée + démo + onboarding 1-1.

---

## Verdict final

| Étape de lancement | Verdict | Bloquant principal |
|---|---|---|
| 1. Bêta privée fermée (< 30 testeurs amis, gratuit, NDA) | **Presque prêt** : à condition de désactiver l'admin, sanitiser les outputs IA, et ajouter un bandeau "version pré-bêta, données pouvant être effacées" | Persistance RAM + auth manquante (mineur car proches) |
| 2. Bêta publique gratuite (site ouvert) | **NON prêt** | Sécurité (admin client, endpoints sans auth, CORS *, JWT secret défaut, JS injection possible) + placeholders légaux |
| 3. Lancement Premium payant | **NON prêt** | Tout ci-dessus + Stripe non testé end-to-end + offre Annuel hors CGV + persistance RAM (perte d'abonnés au moindre reboot) |
| 4. Vente B2B Auto-école | **NON prêt** | Tout ci-dessus + quota 30 élèves non enforcé + white-label volatil + pas de contrat-type B2B + dashboard non sécurisé |

**Prochaine action prioritaire** : ouvrir un fichier `CLAUDE.md` racine + un fichier `ROADMAP_P0.md` listant les 17 tâches Phase 1 ci-dessus avec un seul responsable par tâche, et commencer par les 3 plus rapides à régler immédiatement (placeholders légaux, désactivation `goPrem`, désactivation admin client-side).

**Ne rien corriger tant que ce rapport n'est pas validé.** Toutes les remarques ci-dessus sont des constats audit, à transformer en tickets P0 / P1 / P2 / P3 sous votre arbitrage.

---

*Audit produit en mode lecture seule, conforme `Damcompany-code-guardrails.md`. Aucun fichier projet modifié. Tous les chemins, lignes et citations vérifiables dans le repo.*
