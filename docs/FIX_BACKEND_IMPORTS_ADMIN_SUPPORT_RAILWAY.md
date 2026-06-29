# FIX — Stack admin/support non chargée sur Railway

Date : 2026-06-29
Fichiers modifiés (2) : `apps/backend/Dockerfile` et `apps/backend/start.sh`
Aucun fichier Python touché. Aucun frontend touché.

---

## 1. Erreur observée

Logs Railway au démarrage du backend :

```
[WARN] Stack admin/support non chargée: No module named 'email_service'
```

Conséquences côté API :
```
POST /admin/auth/login HTTP/1.1 → 503 Service Unavailable
POST /qcm/generate HTTP/1.1 → 502 Bad Gateway
```

Côté frontend, `/admin/login` affiche : **"Stack admin non disponible"**.

## 2. Cause racine

Dans `apps/backend/src/api.py`, la stack Sprint Admin est importée avec des imports **sans préfixe `src.`** :

```python
try:
    from email_service import send_email
    from email_templates import (welcome_user as tpl_welcome, ...)
    import admin_auth as admin_auth_mod
    import support_service as support_svc
    import presence_service as presence_svc
    import reporting_service as reporting_svc
    HAS_ADMIN_STACK = True
except ImportError as _e:
    print(f"[WARN] Stack admin/support non chargée: {_e}")
    HAS_ADMIN_STACK = False
```

Quand Railway/Docker lance `uvicorn src.api:app` depuis `WORKDIR /app` :
- Python charge correctement `src.api` (car `/app/` est dans `sys.path` par défaut)
- Mais quand `api.py` exécute `from email_service import ...`, Python cherche un module `email_service` à la racine `/app/` (qui n'existe pas) — **pas** dans `/app/src/` (où il vit pourtant)
- → `ImportError: No module named 'email_service'`
- → `HAS_ADMIN_STACK = False` → toutes les routes admin/support/presence retournent 503

Idem pour `email_templates`, `admin_auth`, `support_service`, `presence_service`, `reporting_service`, `qcm_cache`, `model_router`, `middleware`, `scheduler`, `push`, `email_sequences` (**14 imports concernés** dans `api.py`).

## 3. Correction appliquée

Ajout de `PYTHONPATH=/app/src` au runtime du container Docker (et à `start.sh` pour cohérence dev local). C'est l'option la moins invasive :

- **0 fichier Python modifié** (pas besoin de réécrire les 14 imports en `from .email_service import` ou `from src.email_service import`)
- **0 création de `__init__.py`** dans `src/`
- **2 lignes ajoutées** au total

### `apps/backend/Dockerfile` — ajout ligne `ENV PYTHONPATH=/app/src`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# [Fix imports admin/support] api.py fait `from email_service import ...` sans préfixe `src.`.
# Python doit donc trouver les modules directement dans /app/src/. On l'ajoute au PYTHONPATH.
ENV PYTHONPATH=/app/src

EXPOSE 8000
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `apps/backend/start.sh` — ajout ligne `export PYTHONPATH`

```bash
#!/usr/bin/env bash
set -e

# [Fix imports admin/support] Idem Dockerfile : permet à api.py de trouver
# email_service, admin_auth, support_service, etc. (modules dans src/ importés
# sans préfixe `src.`).
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/src"

# ... reste du script inchangé
```

`start.sh` est utilisé pour le dev local + également par Railway (selon `railway.json` qui pointe `startCommand: "bash start.sh"`). Donc la variable est posée deux fois (Dockerfile ENV + start.sh export) pour double sécurité : si Railway lance directement le CMD du Dockerfile, ça marche ; si Railway lance `bash start.sh`, ça marche aussi.

## 4. Imports concernés (14 dans api.py)

| Ligne | Import | Module cible |
|---|---|---|
| 22 | `from email_service import send_email` | `src/email_service.py` |
| 23 | `from email_templates import (...)` | `src/email_templates.py` |
| 31 | `import admin_auth as admin_auth_mod` | `src/admin_auth.py` |
| 32 | `import support_service as support_svc` | `src/support_service.py` |
| 33 | `import presence_service as presence_svc` | `src/presence_service.py` |
| 34 | `import reporting_service as reporting_svc` | `src/reporting_service.py` |
| 184 | `from qcm_cache import qcm_cache` | `src/qcm_cache.py` |
| 190 | `from model_router import get_model` | `src/model_router.py` |
| 293 | `from middleware import TimingMiddleware` | `src/middleware.py` |
| 1280 | `from scheduler import check_stagnant_students` | `src/scheduler.py` |
| 1343 | `from push import save_subscription` | `src/push.py` |
| 1355 | `from scheduler import run_daily` | idem |
| 1356 | `from email_sequences import check_sequences` | `src/email_sequences.py` |
| 1357 | `from push import send_push` | idem |

Tous résolus par le même `PYTHONPATH=/app/src`.

## 5. Validation locale exécutée

Depuis la sandbox (Linux), avec `PYTHONPATH=apps/backend/src` :

```bash
cd apps/backend
export PYTHONPATH=$(pwd)/src

python3 -c "import sys; print('sys.path includes src ?', any('src' in p for p in sys.path))"
# → sys.path includes src ? True

python3 -c "import email_service; print('✅ email_service importable')"     # ✅
python3 -c "import email_templates; print('✅ email_templates importable')" # ✅
python3 -c "import admin_auth; print('✅ admin_auth importable')"           # ✅
python3 -c "import support_service; print('✅ support_service importable')" # ✅
python3 -c "import presence_service; print('✅ presence_service importable')" # ✅
python3 -c "import reporting_service; print('✅ reporting_service importable')" # ✅
```

**Tous les 6 modules Sprint Admin sont importables** avec ce fix.

Note : l'import complet de `src.api` échoue dans la sandbox avec `No module named 'httpx'`. C'est attendu car la sandbox n'a pas `pip install -r requirements.txt`. Sur Railway, le Dockerfile installe les dépendances **avant** le start, donc `httpx` (et toutes les autres) seront présentes.

## 6. Commandes à exécuter par Damien

```cmd
cd C:\Users\HP-15\Downloads\MA1_v9_Final
git add apps/backend/Dockerfile apps/backend/start.sh docs/FIX_BACKEND_IMPORTS_ADMIN_SUPPORT_RAILWAY.md
git commit -m "fix(backend): PYTHONPATH=/app/src pour import stack admin/support"
git push
```

→ Railway redéploie automatiquement (déclenché par le push sur main).

## 7. Résultat attendu Railway

Au prochain démarrage :

```
[INFO] Building Docker image...
[INFO] Pushing image to registry...
[INFO] Starting container...
🚗 MA1 Code de la Route v6 — Démarrage
========================================
🐍 PYTHONPATH=:/app/src
🌐 http://localhost:$PORT
📄 API Docs: http://localhost:$PORT/docs
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:$PORT (Press CTRL+C to quit)
```

**Ne doit PLUS apparaître** :
- ~~`[WARN] Stack admin/support non chargée: No module named 'email_service'`~~

**Test rapide après deploy** :

```bash
# Healthcheck
curl -i https://ma1-ton-assistant-de-la-route-production.up.railway.app/health
# → 200 OK + JSON

# Endpoint admin (sans token = 401 attendu, pas 503)
curl -i -X POST https://ma1-ton-assistant-de-la-route-production.up.railway.app/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@ma1.fr","password":"Flash"}'
# → 200 + token JWT (si ADMIN_PASSWORD_HASH bien posé sur Railway)
# → ou 401 "Email ou mot de passe incorrect" (mauvais password)
# → JAMAIS 503 "Stack admin non disponible"

# Endpoint QCM (sans token = 401, pas 502)
curl -i -X POST https://ma1-ton-assistant-de-la-route-production.up.railway.app/qcm/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"vitesse","n":1}'
# → réponse normale ou 401
# → JAMAIS 502 Bad Gateway
```

## 8. Pourquoi ce choix vs alternatives

| Solution | Modif | Risque | Choisi ? |
|---|---|---|---|
| **PYTHONPATH** dans Dockerfile + start.sh | 2 lignes | Aucun (env var standard Python) | ✅ |
| Imports relatifs (`from .email_service`) | 14 lignes Python + créer `__init__.py` | Moyen (peut casser tests pytest si lancés différemment) | ❌ |
| Préfixer tous les imports `from src.email_service` | 14 lignes Python | Faible mais invasif | ❌ |
| `sys.path.insert(0, ...)` en tête de api.py | 2 lignes Python | Hack non-standard | ❌ |
| `WORKDIR /app/src` dans Dockerfile | 1 ligne mais casse les chemins relatifs (`scripts/`, `data/`, `index/`) | Élevé | ❌ |

L'option `PYTHONPATH` respecte la directive "Correction minimale. Pas de refactor."

---

*Fix terminé. 2 fichiers modifiés (`Dockerfile` + `start.sh`). 0 Python modifié. 0 frontend modifié. À pousser pour résoudre l'erreur Railway.*

— FIN DU RAPPORT — marker_eof_FIX_BACKEND_IMPORTS_ADMIN_SUPPORT_RAILWAY
