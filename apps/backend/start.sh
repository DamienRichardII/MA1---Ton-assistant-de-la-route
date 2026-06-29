#!/usr/bin/env bash
set -e

# [Fix imports admin/support] Idem Dockerfile : permet à api.py de trouver
# email_service, admin_auth, support_service, etc. (modules dans src/ importés
# sans préfixe `src.`). Sans cette ligne : "[WARN] Stack admin/support non chargée".
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/src"

echo "🚗 MA1 Code de la Route v6 — Démarrage"
echo "========================================"
python scripts/check_env.py
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env créé — remplissez vos clés API"
fi
echo ""
echo "🌐 http://localhost:${PORT:-8000}"
echo "📄 API Docs: http://localhost:${PORT:-8000}/docs"
echo "🐍 PYTHONPATH=$PYTHONPATH"
echo ""
uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000} --reload
