#!/usr/bin/env bash
set -e
echo "🚗 MA1 Code de la Route v6 — Démarrage"
echo "========================================"
python scripts/check_env.py
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env créé — remplissez vos clés API"
fi
echo ""
echo "🌐 http://localhost:8000"
echo "📄 API Docs: http://localhost:8000/docs"
echo ""
uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000} --reload
