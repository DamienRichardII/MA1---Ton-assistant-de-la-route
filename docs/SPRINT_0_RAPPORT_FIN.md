# SPRINT 0 — RAPPORT DE FIN

Date : 2026-05-20
Durée effective : 1 session
Périmètre : cadrage architecture, choix landing canonique, choix app cible, docs structurants.
**Conforme `Damcompany-code-guardrails.md` : modifications chirurgicales, aucune refonte design.**

---

## 1. Décision prise

- **Landing gardée :** `app/landing/page.tsx` (Next.js, accessible sur `/landing`).
- **Landing supprimée / désactivée :** `public/landingpage.html` → déplacée dans `_archive/landingpage.html` (hors `/public/`, donc **non servie statiquement**) + redirection 301 `/landingpage.html` → `/landing`.
- **Version app cible :** **Next.js v8** (architecture `app/` + `components/`). La version standalone `public/index-standalone.html` est conservée temporairement comme cible des CTAs "Commencer gratuitement" jusqu'au Sprint 2 (déprécation effective).

---

## 2. Justification

### Pourquoi `app/landing/page.tsx` (Next.js)

| Critère | Next.js (`app/landing`) | Statique (`public/landingpage.html`) |
|---|---|---|
| Maintenabilité | ✅ React + TS + composants | ❌ 360 lignes inline, JS canvas + observer mêlés |
| Intégration Next.js | ✅ Native | ❌ Doublon hors flux |
| SEO | ✅ `Metadata` + `JSON-LD` + `sitemap.ts` + `robots.ts` | ⚠️ OG basiques |
| Cohérence avec l'app | ✅ Même routing, mêmes constants accessibles | ❌ Hors écosystème |
| Facilité de correction | ✅ Typage TS, props, FAQ array, PRICING array | ❌ Strings inline, accents systématiquement retirés |
| Compatibilité Vercel | ✅ Optimal (SSR/SSG natifs) | ⚠️ Sert le fichier brut |
| CTA testés | ✅ Tests E2E `e2e/landing.spec.ts` ciblent `/landing` | ❌ Aucun test |
| Suppression doublons | ✅ Source canonique unique | ❌ Source d'incohérences (cf audit §3.1 vs §3.2) |
| Potentiel de conversion | ✅ FAQ + 4 plans + stats + JSON-LD | ✅ Visuel polished mais cul-de-sac CTAs |

### Pourquoi `public/landingpage.html` a été retirée

- **Doublon** générant des incohérences (cf `AUDIT_MA1_v9.md` §3 et §5).
- **Cul-de-sac UX** : tous les CTAs renvoient vers `/index-standalone.html`, sans tunnel Stripe.
- **Quotas faux** : "2 examens blancs / jour" contradictoire avec CGU et backend (1/mois).
- **Suspect SEO** : duplicate content avec `/landing`.
- **Tests E2E** déjà alignés sur la version Next.js.

### Pourquoi Next.js comme app cible (long terme)

- Architecture modulaire vs monolithe 343 Ko inline.
- Zéro `goPrem()` fake hardcoded.
- Tests Playwright + pytest possibles.
- Hot reload, TypeScript strict, ESLint.
- Persistance via Zustand + Supabase plus propre.
- Standalone gardée 1 sprint pour ne pas casser l'expérience utilisateur durant le Sprint 1 sécurité.

---

## 3. Fichiers modifiés

| Fichier | Modification | Raison |
|---|---|---|
| `app/page.tsx` | `redirect('/landingpage.html')` → `redirect('/landing')` + commentaire Sprint 0 | Pointer vers la landing canonique Next.js |
| `next.config.js` | Ajout `async redirects()` permanent `/landingpage.html` → `/landing` et `/landingpage` → `/landing` | Préserver les liens externes / SEO |
| `app/landing/page.tsx` | CTAs `href="/"` et `href="/?upgrade=…"` et `href="/dashboard"` → `APP_URL = /index-standalone.html` et `SALES_MAIL = mailto:contact@ma1.app` (constantes en tête de fichier) | **Éviter la boucle infinie** `/` → `/landing` → `/` qu'aurait créée le nouveau redirect ; éviter le cul-de-sac UX "Contacter les ventes" |
| `public/landingpage.html` | **Supprimée** de `/public/` (déplacée vers `_archive/landingpage.html`) | Consolidation : une seule landing canonique |
| `_archive/landingpage.html` | **Créée** (déplacement de l'ancienne) | Archive de référence non publique |
| `_archive/README.md` | **Créé** | Documente la politique d'archivage |
| `CLAUDE.md` (racine) | **Créé** (141 lignes) | Instructions pour agents IA, glossaire plans, routing canonique, règles de modification |
| `ROADMAP_MA1_MARKET_LAUNCH.md` | **Créé** (360 lignes) | Sprints 0 → 9 jusqu'au lancement B2B |
| `SPRINT_0_RAPPORT_FIN.md` | **Créé** (ce fichier) | Rapport de fin de sprint |

Aucun autre fichier touché. Le design, le CSS, les pages légales, le backend, les composants, l'app standalone : **strictement inchangés**.

---

## 4. Liens vérifiés

| Lien | Statut | Détail |
|---|---|---|
| `/` → redirection vers `/landing` | ✅ | `app/page.tsx` valide (parsé OK) |
| `/landing` → `app/landing/page.tsx` | ✅ | Composant React valide |
| `/landingpage.html` → redirection 301 vers `/landing` | ✅ | `next.config.js` `redirects()` testé via node : retourne bien les 2 entrées |
| `/landingpage` → redirection 301 vers `/landing` | ✅ | Idem |
| Landing CTA "Commencer gratuitement" (hero) → `/index-standalone.html` | ✅ | Variable `APP_URL` |
| Landing CTA "Commencer mes révisions" (final) → `/index-standalone.html` | ✅ | Variable `APP_URL` |
| Landing pricing CTA "Commencer gratuitement" (Gratuit) → `/index-standalone.html` | ✅ | Array `PRICING[0].href` |
| Landing pricing CTA "7 jours gratuits" (Premium) → `/index-standalone.html` | ✅ | Array `PRICING[1].href` |
| Landing pricing CTA "Économiser 41€" (Annuel) → `/index-standalone.html` | ✅ | Array `PRICING[2].href` |
| Landing pricing CTA "Contacter les ventes" (Auto-École) → `mailto:contact@ma1.app?subject=Demande Auto-école MA1` | ✅ | Variable `SALES_MAIL` |
| Landing CTA "Voir les plans" → `#pricing` (anchor) | ✅ | Anchor existante |
| Footer landing → CGU/CGV/Confidentialité/Mentions légales | ✅ | Liens `public/legal/*.html` intacts |
| Tests E2E Playwright `e2e/landing.spec.ts` → `/landing` | ✅ | Déjà aligné, aucune modif requise |
| `app/api-docs/page.tsx` ligne 63 "Retour à MA1" → `/` | ⚠️ | Pointe vers `/` qui redirige vers `/landing` — fonctionnel mais inattendu. Acceptable pour Sprint 0, à revoir Sprint 5 UX. |
| `sitemap.ts` liste `/` (priorité 1) et `/landing` (priorité 0.9) | ✅ | Cohérent. À ajuster Sprint 1 : `/landing` priorité 1, `/` priorité 0.5 |
| Recherche `grep "landingpage.html"` dans `app/` `components/` `public/` `e2e/` `backend/` | ✅ | **Aucune référence résiduelle** dans le code applicatif (les mentions dans `AUDIT_MA1_v9.md`, `CLAUDE.md`, `ROADMAP_…md` et ce rapport sont documentaires) |
| Recherche `grep "/landing\b"` | ✅ | 5 références — toutes dans `e2e/landing.spec.ts` (tests Playwright ciblant la landing canonique) |

---

## 5. Tests exécutés

| Test | Résultat | Détail |
|---|---|---|
| Vérification chargement `next.config.js` via `node` | ✅ | `Object.keys(c) = [reactStrictMode, images, headers, redirects]` |
| Exécution `redirects()` | ✅ | Retourne bien les 2 entrées 301 attendues |
| Exécution `headers()` | ✅ | `source: '/(.*)'` toujours présent |
| Vérification regex `app/page.tsx` | ✅ | `import redirect`, `redirect('/landing')`, `export default function HomePage` tous présents |
| Vérification regex `app/landing/page.tsx` | ✅ | `APP_URL`, `SALES_MAIL`, `href: APP_URL`, `href: SALES_MAIL`, `<Link href={APP_URL}>` tous présents |
| Vérification présence `_archive/landingpage.html` | ✅ | 361 lignes intactes |
| Vérification absence `public/landingpage.html` | ✅ | Plus dans `public/` |
| Vérification `package.json` parsable | ✅ | name = "ma1-code-de-la-route", version 8.0.0 |
| Vérification `tsconfig.json` parsable | ✅ | clés `compilerOptions`, `include`, `exclude` |
| `npm install` | ⚠️ **Non exécuté en sandbox** | `npm install` dépasse le budget temps de la sandbox (45 s). Le `node_modules/` n'existait pas → impossible de lancer `npm run lint` / `npm run build` ici. **À exécuter par l'utilisateur sur sa machine Windows** : `npm install && npm run lint && npm run build`. |
| `npm run lint` | ⚠️ **Non exécuté** | Voir ci-dessus. Aucune erreur de syntaxe détectable par check statique. |
| `npm run build` | ⚠️ **Non exécuté** | Voir ci-dessus. Toutes les modifications sont conservatrices (commentaires + variables locales + `async redirects()`) — risque de régression faible. |
| Tests Playwright `e2e/landing.spec.ts` | ⚠️ **Non exécuté** | Idem. Aucune modification du chemin `/landing` ni des éléments testés. |

**Commande à lancer côté Windows pour valider :**

```bash
cd C:\Users\HP-15\Downloads\MA1_v9_Final
npm install
npm run lint
npm run build
npm run test:e2e    # optionnel, nécessite backend lancé
```

Si l'une de ces commandes échoue, rapport immédiat — la régression sera étroitement liée aux 3 fichiers modifiés (faciles à diff).

---

## 6. Risques restants (traités au Sprint 1)

| # | Risque | Impact | Sprint cible |
|---|---|---|---|
| R1 | **Layout app shell appliqué à `/landing`** : `app/layout.tsx` enveloppe TOUTES les pages avec Header, Sidebar, RightPanel, MobileNav, RGPDBanner, Onboarding → la landing publique affiche le sidebar et l'onboarding modal. UX dégradée pour un visiteur non connecté. | Élevé UX | Sprint 1 ou Sprint 2 — refactor route groups `(public)/(app)` |
| R2 | **`AggregateRating` 4.8 / 150 fictif** dans le JSON-LD landing (ligne 188) | Élevé légal + SEO | Sprint 1 |
| R3 | **FAQ landing mensonge** "Vos données restent sur votre appareil (localStorage)" | Élevé légal | Sprint 1 |
| R4 | **`goPrem()` fake Premium** dans `public/index-standalone.html` ligne 1372 | Critique fraude | Sprint 1 |
| R5 | **Endpoints backend `/rgpd/*`, `/profile/*`, `/dashboard/*`, etc. sans auth** | Critique RGPD | Sprint 1 |
| R6 | **Mot de passe admin `ma1admin2026` en clair côté client** (`app/admin/page.tsx:13`) | Critique sécu | Sprint 1 |
| R7 | **Placeholders légaux non remplis** (SIRET, RCS, adresse, médiateur, plan Annuel absent CGV) | Critique légal | Sprint 1 |
| R8 | **Persistance 100 % RAM côté backend** | Critique données | Sprint 2 |
| R9 | **Standalone v7 toujours accessible publiquement** | Maintenabilité + sécurité (cf R4) | Sprint 2 (déprécation) |
| R10 | **CORS `*` et JWT_SECRET défaut** dans `backend/src/api.py` | Critique sécu | Sprint 1 |
| R11 | **`dangerouslySetInnerHTML` sur sortie IA** (ChatPanel, VisionPanel) | Critique XSS | Sprint 1 |
| R12 | **Quota examen blanc incohérent** entre landing (1/mois OK Next, mais à vérifier ailleurs) et standalone modal | Élevé commercial | Sprint 1 |
| R13 | **Seuil examen 80 % (32/40)** au lieu du 87,5 % officiel (35/40) | Élevé pédago | Sprint 1 ou Sprint 4 |
| R14 | **Veille juridique Claude pure** (inventions garanties) | Élevé pédago | Sprint 4 |
| R15 | **Banque QCM non validée humaine** | Critique pédago | Sprint 4 |

Tous les risques détaillés dans `AUDIT_MA1_v9.md` (§7, §8, §9).

---

## 7. Prochaine étape

**Sprint 1 — Sécurité critique P0.**

Périmètre détaillé : voir `ROADMAP_MA1_MARKET_LAUNCH.md` §"Sprint 1 — Sécurité critique P0".

Critères de démarrage Sprint 1 :

- Validation utilisateur de ce rapport.
- Exécution réussie de `npm install && npm run lint && npm run build` sur la machine de l'utilisateur (pour valider Sprint 0).
- Aucune régression visuelle constatée sur `/landing` ouverte en mobile et desktop.

Une fois Sprint 0 validé, ouvrir une branche `feat/sprint1-security-p0` et attaquer dans l'ordre :

1. Auth backend sur tous les endpoints user-scoped.
2. Désactivation Premium fake standalone.
3. Désactivation admin client-side.
4. Remplissage des placeholders légaux.
5. Correction des 2 mensonges marketing (aggregateRating + FAQ "localStorage").
6. CORS + JWT_SECRET prod.
7. Sanitisation IA sortie.
8. Création API key auth.

Critères de réussite Sprint 1 listés dans la ROADMAP.

---

*Sprint 0 terminé. Aucun design refondu. Aucune page légale modifiée. Aucune correction sécurité ou backend (sauf le routing `next.config.js` qui était strictement nécessaire). Le repo est dans un état build-able sous réserve du test `npm install && npm run build` côté utilisateur.*
