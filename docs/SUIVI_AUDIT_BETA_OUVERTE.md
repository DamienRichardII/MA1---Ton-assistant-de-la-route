# SUIVI — Audit bêta ouverte MA1 + paiement 30 jours

> Fichier vivant. Mis à jour à chaque étape de l'audit.
> Démarrage : 2026-05-20

---

## Statut global

| Phase | Statut | Horodatage |
|---|---|---|
| 1. Création fichier de suivi (ce fichier) | ✅ TERMINÉ | 2026-05-20 |
| 2. Création registre incidents & contrôles | ✅ TERMINÉ | 2026-05-20 |
| 3. Recherches ciblées (grep paiement / expiration / 30 jours) | ✅ TERMINÉ | 2026-05-20 |
| 4. Audit légal CGV / CGU pour modèle "paiement unique 30 jours" | ✅ TERMINÉ | 2026-05-20 |
| 5. Audit UI tunnel paiement actuel (standalone + Next.js) | ✅ TERMINÉ | 2026-05-20 |
| 6. Rédaction rapport `AUDIT_BETA_OUVERTE_MA1.md` | ✅ TERMINÉ (778 lignes) | 2026-05-20 |
| 7. Contrôle anti-troncature des fichiers livrés | ✅ TERMINÉ — 3 fichiers OK | 2026-05-20 |

## Résultat final

**Audit livré. Tous les fichiers intègres.**

Verdict produit : MA1 ne peut PAS encore ouvrir une bêta avec paiement 30 jours sans corrections P0 (cf §1 du rapport). Plan d'action en 5 sprints (A → E) proposé.

**Action requise de Damien :**
1. Lire `AUDIT_BETA_OUVERTE_MA1.md`.
2. Valider ou amender la grille tarifaire proposée (§3.3).
3. Valider la migration SQL proposée (§6.2) avant tout dev.
4. Valider la rédaction CGV §11 (§7.3) — faire relire par un juriste.
5. Fournir les liens de paiement (Stripe Payment Link recommandé) ou alternative.
6. Autoriser le démarrage du Sprint A (corrections + nettoyage) après validation.

## Hypothèses de départ (à valider pendant l'audit)

| # | Hypothèse | Source | Statut |
|---|---|---|---|
| H1 | Le backend `PLAN_LIMITS` ne gère pas l'expiration : pas de `paid_until` | `backend/src/api.py:102-107, 297-302` | ✅ CONFIRMÉ — `check_limit` ne regarde aucune date |
| H2 | Stripe checkout en `mode="subscription"` uniquement | `backend/src/api.py:570` | ✅ CONFIRMÉ — `mode="subscription"` en dur |
| H3 | Aucun champ `expires_at` ni `paid_until` dans `supabase_schema.sql` | `backend/scripts/supabase_schema.sql` | ✅ CONFIRMÉ — schéma minimal |
| H4 | CGV n'évoque que des abonnements mensuels | `public/legal/cgv.html:20-39` | ✅ CONFIRMÉ — 5 mentions auto-renouvellement, 0 mention paiement unique |
| H5 | Premium fake `goPrem()` toujours actif | `public/index-standalone.html:1372,1750,1757` | ✅ CONFIRMÉ — actif ET fallback Stripe-down ET catch fetch |
| H6 | Aucune variable d'env `PAYMENT_LINK_*` | `backend/.env.example`, `.env.local.example` | ✅ CONFIRMÉ — à ajouter |
| H7 | Endpoints `/profile/{user_id}`, `/dashboard/{owner_id}`, `/rgpd/*` toujours sans auth | `backend/src/api.py` | ✅ CONFIRMÉ — Sprint 1 ROADMAP non démarré |

## Découvertes pendant l'audit

| # | Découverte | Fichier / ligne | Impact bêta ouverte | Priorité |
|---|---|---|---|---|
| D1 | `stripeCheckout` fallback `goPrem()` même en cas de **panne réseau** ou **CORS bloqué** | `public/index-standalone.html:1755-1758` | Tout utilisateur qui bloque le réseau obtient Premium gratuit | **P0 fraude** |
| D2 | `STRIPE_ANNUAL_PRICE_ID` utilisé dans `api.py:111` mais ABSENT de `backend/.env.example` | `backend/src/api.py:111` vs `backend/.env.example:15-16` | Plan Annuel inutilisable | P1 |
| D3 | Schéma Supabase `CHECK (plan IN ('free', 'premium', 'autoecole'))` exclut `'annual'` | `backend/scripts/supabase_schema.sql:11` | Inscription en plan annuel = violation contrainte | P1 |
| D4 | Quota 30 élèves auto-école **non enforcé** par le backend | `backend/src/api.py:622-629` (`add_student`) | Promesse 30 élèves non tenue → risque commercial | P1 |
| D5 | `_users`, `_profiles` en RAM → reboot = perte abos payés | `backend/src/api.py:200, _profiles dict` | Toute bêta payante = bombe à retardement | **P0** |
| D6 | `lib/store.ts:80,104` : `qMax = plan === 'free' ? 10 : 999` — quota client-side, contournable | `lib/store.ts` | Bypass trivial via devtools | **P0** |
| D7 | Sidebar gating client : `href={plan === 'free' ? '#' : '/qcm'}` | `components/ui/Sidebar.tsx:29` | Pas un blocage, juste un déguisement | P1 |
| D8 | `check_limit` lit `_usage` (RAM) → quota free de 10 q/jour resetté au reboot serveur | `backend/src/api.py:290-302` | Trichable | P1 |
| D9 | Aucun email post-paiement spécifique (seul `send_welcome_email` à l'inscription) | `backend/src/api.py:799-814` | UX pauvre après paiement | P1 |
| D10 | Aucune notion de "trial / pending / expired" en DB | `supabase_schema.sql` | Imposible de différencier paiement reçu en attente vs accès actif | **P0 pour 30 jours** |

## Fichiers à créer (livrables)

| Fichier | Créé | Lignes | Marker fin | Anti-troncature CTRL-1 |
|---|---|---|---|---|
| `SUIVI_AUDIT_BETA_OUVERTE.md` | ✅ | 60 → ~110 après MAJ finale | (pas applicable) | ✅ vérifié |
| `INCIDENTS_ET_CONTROLES.md` | ✅ | 183 | "À enrichir d'un nouvel incident…" | ✅ vérifié |
| `AUDIT_BETA_OUVERTE_MA1.md` | ✅ | 778 | "marker_eof_AUDIT_BETA_OUVERTE_MA1" | ✅ vérifié + marker présent (grep count = 1) |

## Règles de cet audit (rappel)

- AUCUNE modification de code applicatif (next.config.js, app/, components/, backend/, public/, lib/).
- AUCUNE modification de page légale.
- Création uniquement des 3 fichiers `.md` ci-dessus.
- Vérification anti-troncature systématique (`wc -l` + `tail -n 3` + grep marker de fin) après chaque écriture.
- Aucune correction tant que Damien n'a pas validé le rapport.

## Journal des actions

| Horodatage | Action | Résultat |
|---|---|---|
| Démarrage | Création TaskList (7 tâches) | OK |
| +1 | Création de ce fichier de suivi | OK |
| +2 | Création `INCIDENTS_ET_CONTROLES.md` (183 l.) | OK |
| +3 | Grep ciblés paiement / expiration / 30 jours / Stripe | 10 découvertes (cf section "Découvertes") |
| +4 | Lecture CGV `public/legal/cgv.html` | Confirmation H4 : 100% orienté abo récurrent |
| +5 | Lecture `backend/src/api.py:285-310, 562-588` | Confirmation H1, H2 |
| +6 | Lecture `public/index-standalone.html:1700-1790` (Stripe checkout) | Confirmation H5 + découverte D1 (fallback fetch-fail) |
| +7 | Rédaction `AUDIT_BETA_OUVERTE_MA1.md` (778 l.) | OK |
| +8 | Contrôle anti-troncature CTRL-1 sur les 3 livrables | ✅ Tous OK, marker AUDIT présent |
| +9 | Mise à jour finale de ce suivi | OK |

---

## EXTENSION — Audit SumUp / Railway / Supabase / Resend / OVH (2026-05-20+)

| Horodatage | Action | Résultat |
|---|---|---|
| +10 | TaskList étendue (8 tâches) | OK |
| +11 | Grep SumUp → 0 match code | ⚠️ SumUp non intégré, intégration ex nihilo |
| +12 | Grep Railway → URL hardcodée standalone:1214 | ⚠️ Pas de `railway.json` |
| +13 | Grep Resend → installé, 8 templates répartis api.py + email_sequences.py | ✅ SDK OK, domaine non vérifié |
| +14 | Grep OVH / DNS → 0 match | ⚠️ Aucune préparation DNS |
| +15 | Lecture Dockerfiles, docker-compose, requirements | Architecture mono-repo confirmée |
| +16 | Lecture `email_sequences.py` complète | 5 séquences (J0, J1, J3, J5, J7), domaine `ma1.app` partout |
| +17 | Rédaction `AUDIT_MA1_BETA_SUMUP_RAILWAY_SUPABASE_RESEND_OVH.md` | OK (à venir) |
| +18 | Rédaction `LEGAL_TODO_DAMIEN.md` | OK (à venir) |
| +19 | Contrôle anti-troncature CTRL-1 final sur les 2 nouveaux livrables | À venir |

### Hypothèses validation extension

| # | Hypothèse | Statut |
|---|---|---|
| EH1 | SumUp non intégré dans le code | ✅ CONFIRMÉ (0 grep match) |
| EH2 | URL Railway hardcodée dans le standalone uniquement | ✅ CONFIRMÉ (1 occurrence ligne 1214) |
| EH3 | Aucun `railway.json`, aucun `Procfile`, aucun `vercel.json` | ✅ CONFIRMÉ |
| EH4 | Resend installé mais domaine `ma1.app` non vérifié | ✅ Code confirmé ; statut Resend (à valider par Damien dans son dashboard) |
| EH5 | Aucune référence à OVH ni `ma1.com` | ✅ CONFIRMÉ |
| EH6 | Backend et frontend dans le même dossier Git | ✅ CONFIRMÉ |
| EH7 | 2 Dockerfiles séparés (racine pour Next.js, `backend/` pour FastAPI) | ✅ CONFIRMÉ |
| EH8 | Domaine utilisé : `ma1.app` (vs `ma1.com` demandé) | ✅ CONFIRMÉ — à arbitrer par Damien |
| EH9 | Aucune table Supabase pour paiements / accès 30 jours / emails | ✅ CONFIRMÉ (4 tables seulement : users, profiles, analytics, autoecole_students) |
