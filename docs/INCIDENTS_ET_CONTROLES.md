# INCIDENTS & CONTRÔLES — Projet MA1

> Journal des incidents rencontrés pendant l'exécution des sprints + procédures de contrôle systématiques mises en place pour éviter qu'ils se reproduisent.
> Dernière mise à jour : 2026-05-20 (Sprint 0 + démarrage audit bêta ouverte)

---

## 1. Procédures de contrôle systématiques (à respecter par tout agent IA)

### CTRL-1 — Anti-troncature de fichier

**Quand :** après chaque `Write` ou `Edit` sur un fichier de plus de 50 lignes.

**Procédure :**

1. Re-`Read` le fichier complet pour vérifier le contenu.
2. Sur le shell (mount Linux) : `wc -l` + `tail -n 3` du fichier.
3. Comparer le nombre de lignes : attendu (issu de `Write`) vs réel (`wc -l`).
4. Si écart : appliquer le **bypass cache inode** (`mv file file.bak && mv file.bak file`) puis re-`wc -l`.
5. Vérifier la dernière ligne attendue (marker de fin si on en a ajouté).
6. Si écart persiste après bypass : ré-écrire intégralement via `Write` (pas via `Edit`).

**Critère de réussite :** `wc -l` côté Linux == nombre de lignes attendu, ET dernière ligne == marker de fin.

### CTRL-2 — Cache stale du mount Linux

**Quand :** toute opération `bash` qui lit un fichier modifié juste avant via les file tools.

**Procédure :**

1. Attendre 3-5 secondes (`sleep 3`) avant le premier `cat` / `wc` / `grep`.
2. Si le contenu lu en bash ne correspond pas à ce que `Read` montre côté Windows : appliquer le bypass inode CTRL-1 étape 4.
3. Privilégier **toujours** la sortie `Read` comme source de vérité (vue Windows utilisateur).

### CTRL-3 — Vérification non-régression après Edit

**Quand :** chaque `Edit` ou `Write` qui modifie un fichier de configuration (`next.config.js`, `tsconfig.json`, `package.json`, `tailwind.config.js`, `backend/.env`).

**Procédure :**

1. Tenter de charger le fichier modifié avec un parser approprié :
   - JS : `node -e "const c = require('./file.js'); console.log(Object.keys(c))"`
   - JSON : `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('file.json'))))"`
   - TSX/TS : ne pas tenter (nécessite TS compiler) — se contenter de vérif regex.
2. Si parsing échoue : ne pas marquer la tâche `completed`, ré-écrire et re-tester.

### CTRL-4 — Modification chirurgicale

**Quand :** toute intervention sur un fichier déjà validé.

**Procédure :**

1. Lire le fichier complet avant Edit.
2. Lister explicitement ce qui doit changer (en commentaire de la PR / dans le rapport).
3. Vérifier après Edit que SEULES ces lignes ont changé (`git diff --stat` + relecture).
4. Aucune réécriture massive : un Edit local par changement.

### CTRL-5 — Validation des liens entrants avant suppression

**Quand :** suppression / déplacement d'un fichier référencé.

**Procédure :**

1. `Grep` sur le nom de fichier dans tout le repo (sauf `.git/`, `node_modules/`, `_archive/`).
2. Lister TOUS les liens entrants dans le rapport.
3. Pour chaque lien : décider redirection / suppression du lien / archivage.
4. Si redirection : ajouter une entrée dans `next.config.js` `async redirects()`.

### CTRL-6 — Création de fichier de suivi par sprint

**Quand :** au démarrage de chaque sprint ou audit majeur.

**Procédure :**

1. Créer un `SUIVI_<NOM>.md` à la racine.
2. Y consigner : statut de chaque tâche, hypothèses de départ, découvertes, journal des actions.
3. Mettre à jour à chaque étape (avant `TaskUpdate completed`).
4. À la fin : intégrer le suivi au rapport final ou archiver.

### CTRL-7 — Test build local avant validation sprint

**Quand :** fin de chaque sprint qui touche au code.

**Procédure :**

1. Côté Linux sandbox : impossible (`npm install` dépasse 45 s — cf incident INC-001).
2. **Documenter dans le rapport de sprint** les commandes que l'utilisateur doit lancer côté Windows :
   ```bash
   npm install
   npm run lint
   npm run build
   npm run test:e2e   # si backend lancé
   ```
3. Marquer le sprint `completed_with_caveat` tant que ces commandes n'ont pas été confirmées vertes.

### CTRL-8 — Pas de secret dans le code

**Quand :** toute écriture qui touche `.env*`, `*.config.js`, `package.json`, backend `api.py`.

**Procédure :**

1. Pas de clé API, mot de passe, token hardcodé.
2. Pour valeurs sensibles : `process.env.X` côté JS, `os.getenv("X")` côté Python.
3. Documenter dans `.env.local.example` / `backend/.env.example` avec valeurs vides ou placeholder explicite.
4. `grep -rE "sk_(test|live)_|sk-ant-|whsec_|re_[A-Za-z0-9]"` doit retourner UNIQUEMENT les `.env.example`.

---

## 2. Incidents passés

### INC-001 — Sandbox `npm install` time-out (Sprint 0)

- **Date :** 2026-05-20
- **Symptôme :** `npm install --no-audit --no-fund --prefer-offline` dépasse 45 s (timeout sandbox) et ne complète pas. `node_modules/` reste absent.
- **Impact :** Impossible de lancer `npm run lint`, `npm run build`, `npm run test:e2e` côté sandbox.
- **Cause racine :** Sandbox Linux limité à 45 s par appel `bash`. `npm install` de Next 15 + React 19 + Tailwind 3 + Playwright + Jest = plusieurs minutes.
- **Mitigation appliquée :**
  - Documentation explicite dans `SPRINT_0_RAPPORT_FIN.md` §5 : utilisateur doit lancer les commandes sur sa machine Windows.
  - Tests statiques de remplacement : `node -e "require('./next.config.js')"`, regex sur `app/page.tsx`, regex sur `app/landing/page.tsx`.
- **Recommandation à long terme :**
  - Ne pas dépendre de la sandbox pour les tests build.
  - Faire valider chaque sprint par un `npm run build` Windows reporté manuellement.
- **CTRL associé :** CTRL-7.

### INC-002 — Cache stale mount Linux après Edit (Sprint 0)

- **Date :** 2026-05-20
- **Symptôme :** Après `Edit` sur `next.config.js` et `app/page.tsx`, le mount Linux (`/sessions/.../mnt/MA1_v9_Final/`) continue de montrer l'ancienne version :
  - `wc -l next.config.js` → 16 lignes (au lieu des 26 attendues)
  - `wc -l app/page.tsx` → 3 lignes (au lieu des 7 attendues)
  - `Modify` timestamp = avant l'édition
- **Mais :** le tool `Read` (côté Windows path) renvoie bien le contenu nouveau.
- **Conséquence :** Risque de fausse alerte. J'ai cru initialement que mes edits avaient été **tronqués sur disque** alors qu'ils étaient en réalité corrects côté Windows.
- **Cause racine probable :** Cache d'inode du mount Linux qui ne reflète pas immédiatement les écritures faites via les tools Windows. Les nouveaux fichiers (`Write` de fichier inexistant) apparaissent OK, mais les `Edit` sur fichiers existants gardent l'ancien inode et donc l'ancien contenu en cache.
- **Mitigation appliquée :**
  - Bypass via `mv file file.bak && mv file.bak file` → force la création d'un nouvel inode → cache invalidé → `wc -l` correct.
  - Confirmation : `Read` (Windows) reste la source de vérité ultime.
- **Procédure systématique :** CTRL-1 + CTRL-2.

### INC-003 — Suppression de fichier interdite par défaut (Sprint 0)

- **Date :** 2026-05-20
- **Symptôme :** `rm -f _archive/sprint0_mount_test.txt` → `Operation not permitted`.
- **Cause :** Sandbox cowork bloque la suppression de fichiers tant que l'autorisation n'a pas été demandée via le tool `mcp__cowork__allow_cowork_file_delete`.
- **Mitigation :** Appeler `mcp__cowork__allow_cowork_file_delete` une fois pour le dossier concerné, puis `rm -f` fonctionne.
- **À retenir :** Ne pas tenter de supprimer un fichier sans avoir d'abord obtenu l'autorisation.

---

## 3. Checklist universelle "fin de sprint"

À cocher avant de marquer un sprint terminé :

- [ ] Tous les fichiers modifiés ont été vérifiés via `Read` complet (anti-troncature CTRL-1)
- [ ] `wc -l` côté Linux mount cohérent avec attendu (CTRL-1)
- [ ] Marker de fin présent sur chaque fichier livrable
- [ ] `git status --short` ne montre QUE les fichiers attendus
- [ ] Tous les liens entrants vers les fichiers modifiés/supprimés ont été reroutés
- [ ] Rapport de sprint produit + table des changements complète
- [ ] Tests à lancer côté Windows documentés
- [ ] Risques résiduels documentés et liés au sprint suivant
- [ ] Aucun secret écrit en clair
- [ ] Aucune modification non demandée (CTRL-4)

---

## 4. Politique de priorité (rappel guardrails)

En cas de conflit entre objectifs, l'ordre est :

1. Demande explicite de l'utilisateur.
2. Sécurité et protection des données.
3. Absence de régression.
4. Modification chirurgicale.
5. Simplicité.
6. Optimisation tokens.
7. Amélioration esthétique.

Une amélioration esthétique ne doit JAMAIS passer avant la stabilité du projet.

---

*Fichier maintenu par l'agent Claude Cowork à chaque sprint. À enrichir d'un nouvel incident chaque fois qu'une difficulté est rencontrée.*
