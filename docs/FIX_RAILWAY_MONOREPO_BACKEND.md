# FIX — Railway build échoue après passage monorepo (backend déplacé vers apps/backend)

Date : 2026-06-29
Fichier modifié : `railway.json` (racine)
Configuration UI à appliquer dans Railway : voir §4.

---

## 1. Erreur observée

Au déploiement Railway après le merge monorepo (déplacement de `backend/` → `apps/backend/`) :

```
Build Failed: resolve ... /snapshot-target-unpack/backend: no such file or directory
```

Railway tente d'accéder à un dossier `backend/` qui n'existe plus à la racine du repo.

## 2. Cause racine

Railway cherchait :
- Soit le Dockerfile à `backend/Dockerfile` (path hérité du `railway.json` précédent qui pointait sur `apps/backend/Dockerfile` mais avec un Root Directory mal configuré)
- Soit l'ancien chemin `backend/` (configuration UI Railway non mise à jour)

Le `railway.json` précédent (V1 Sprint Étape 3) spécifiait :

```json
{
  "build": {
    "dockerfilePath": "apps/backend/Dockerfile",
    "watchPatterns": ["apps/backend/**"]
  }
}
```

→ ce chemin **absolu depuis la racine du repo** combiné à un Root Directory UI mal configuré côté Railway (resté sur l'ancien `backend/` ou à blank) crée le conflit "snapshot-target-unpack/backend: no such file or directory".

## 3. Correction appliquée

Nouveau `railway.json` simplifié pour fonctionner avec **Root Directory = `apps/backend`** configuré dans Railway UI :

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "bash start.sh",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Changements :
- `dockerfilePath`: `"apps/backend/Dockerfile"` → `"Dockerfile"` (relatif au Root Directory configuré dans Railway UI)
- `watchPatterns`: supprimé (géré par Root Directory)
- `startCommand`: `uvicorn src.api:app --host 0.0.0.0 --port $PORT` → `bash start.sh` (utilise le script existant qui fait `python scripts/check_env.py` + `uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000} --reload`)
- `healthcheckPath`, `healthcheckTimeout`, `restartPolicyType`, `restartPolicyMaxRetries`: conservés

## 4. Configuration Railway UI à appliquer ⚠️ ÉTAPE CRITIQUE

Le `railway.json` seul ne suffit pas — il faut aussi configurer le **Root Directory** dans le dashboard Railway :

1. Aller sur [railway.app/dashboard](https://railway.app/dashboard) → ton projet MA1
2. Service backend → onglet **Settings**
3. Section **Source** ou **Build & Deploy** → champ **Root Directory**
4. Saisir : **`apps/backend`**
5. **Save**
6. Onglet **Deployments** → menu **...** sur le dernier deployment → **Redeploy**

Vérification dans les logs après redeploy :

```
Build : Successful   (Dockerfile lu depuis apps/backend/Dockerfile)
Deploy: ✅ MA1 Code de la Route v6 — Démarrage
        ...
        🌐 http://localhost:8000
        Uvicorn running on http://0.0.0.0:$PORT
        Application startup complete
```

**Endpoint healthcheck** : Railway va appeler `https://<railway-url>/health` toutes les 30 sec → doit retourner 200 + JSON `{"status":"ok"...}`.

## 5. Fichiers modifiés

| Fichier | Avant | Après |
|---|---|---|
| `railway.json` | `dockerfilePath: "apps/backend/Dockerfile"` + `watchPatterns: ["apps/backend/**"]` + `startCommand: "uvicorn src.api:app --host 0.0.0.0 --port $PORT"` | `dockerfilePath: "Dockerfile"` + `startCommand: "bash start.sh"` + healthcheck `/health` |

**Aucun autre fichier modifié.** `apps/backend/Dockerfile` et `apps/backend/start.sh` sont restés intacts.

## 6. Vérifications backend (déjà passées)

| Fichier | Statut | Commentaire |
|---|---|---|
| `apps/backend/Dockerfile` | ✅ Présent (309 octets) | `FROM python:3.12-slim` + `COPY requirements.txt` + `COPY .` + `CMD uvicorn src.api:app` — autonome |
| `apps/backend/start.sh` | ✅ Présent (435 octets) | Lance `python scripts/check_env.py` puis `uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000} --reload` |
| `apps/backend/requirements.txt` | ✅ Présent (360 octets) | fastapi, uvicorn, anthropic, supabase, resend, bcrypt, etc. |
| `apps/backend/src/api.py` | ✅ Présent (84 817 octets, 1772 lignes) | Tous les endpoints Sprint Admin/Concours |
| `apps/backend/scripts/check_env.py` | ✅ Présent | Vérifie env vars au démarrage |

## 7. Procédure de push

```cmd
cd C:\Users\HP-15\Downloads\MA1_v9_Final
git add railway.json docs/FIX_RAILWAY_MONOREPO_BACKEND.md
git commit -m "fix(railway): simplifie railway.json pour Root Directory apps/backend"
git push
```

Si tu es encore sur la branche feature (et que tu as déjà mergé sur main), pousse aussi directement sur main :

```cmd
git checkout main
git pull origin main
git cherry-pick <hash-du-commit>   REM ou refaire le commit directement sur main
git push origin main
```

→ Railway déclenchera un redéploy automatique sur le push de main (uniquement si tu as bien configuré Root Directory = `apps/backend` dans la UI Railway — sans ça, même push, même erreur).

## 8. Notes complémentaires

- **`--reload` dans `start.sh`** : pas optimal pour la production (recharge à chaque modif de fichier, consomme plus de CPU/RAM). À enlever lors d'un sprint dédié post-concours. Pour l'instant, ça fonctionne et c'est priorité basse.
- **Variables d'environnement Railway** : aucune modification nécessaire dans ce fix. Conservez ce qui était déjà en place (ANTHROPIC_API_KEY, SUPABASE_URL, etc.).
- **Pas de Root Directory dans `railway.json`** : Railway ne supporte pas cette clé dans le JSON. Le Root Directory **doit** être configuré côté UI dashboard (cf §4).
- **`watchPatterns` supprimé** : maintenant que Root Directory = `apps/backend`, Railway watche déjà tout ce dossier par défaut. Pas besoin de spécifier.

## 9. Si le build échoue encore après ce fix

| Symptôme | Cause probable | Action |
|---|---|---|
| Même erreur `snapshot-target-unpack/backend` | Root Directory pas changé dans Railway UI | Refaire §4 |
| `Dockerfile not found` | Root Directory mal saisi (espace, slash, etc.) | Vérifier valeur exacte = `apps/backend` (sans slash début/fin) |
| `requirements.txt: No such file` | Root Directory pointe trop haut (racine repo) | Vérifier que Root Dir = `apps/backend`, pas `apps` ni racine |
| Build OK mais runtime crash sur `python scripts/check_env.py` | Variable d'env manquante | Voir logs Railway, ajouter la var manquante |
| Healthcheck échoue (timeout) | API ne démarre pas, port mal binding | Vérifier `$PORT` dans logs, Railway l'injecte automatiquement |

---

*Fix Railway monorepo terminé. 1 fichier modifié (`railway.json`). À combiner avec la configuration UI Root Directory = `apps/backend` (§4) pour résoudre l'erreur de build.*

— FIN DU RAPPORT — marker_eof_FIX_RAILWAY_MONOREPO_BACKEND
