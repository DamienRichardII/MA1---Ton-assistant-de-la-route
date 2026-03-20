# 🚗 MA1 — Ton Assistant IA du Code de la Route

## Architecture v8 (Next.js)

```
ma1/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                 # Layout: Header, Sidebar, RightPanel, MobileNav
│   ├── chat/               # Chat & Vision panels
│   ├── qcm/                # QCM panel
│   ├── exam/               # Exam blanc panel
│   ├── auth/               # Auth modal
│   ├── dashboard/          # B2B dashboard
│   └── gamification/       # XP, leaderboard, badges
├── lib/                    # Zustand store, API client, constants
├── styles/                 # Tailwind + global CSS
├── public/                 # Static assets, SW, manifest, legal pages
├── backend/                # FastAPI backend (Python)
│   ├── src/api.py          # 48 endpoints
│   ├── src/qcm_cache.py    # QCM server-side cache
│   ├── src/model_router.py # Model routing (Haiku/Sonnet)
│   ├── tests/              # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
├── .github/workflows/ci.yml
└── package.json
```

## Quick Start

```bash
# Frontend
npm install && npm run dev    # → http://localhost:3000

# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env          # Fill API keys
bash start.sh                 # → http://localhost:8000

# Docker (both)
docker-compose up --build     # → frontend:3000, backend:8000
```

## What changed from v7 (monolith) → v8 (Next.js)

| Before (v7) | After (v8) |
|---|---|
| Single 283K HTML file | 40+ component files |
| Global `S` object | Zustand persisted store |
| Inline CSS (54K) | Tailwind CSS + CSS variables |
| Monkey-patched functions | Clean React components |
| No tests | 12 pytest tests + CI/CD |
| No Docker | Dockerfile + docker-compose |
| Logo base64 ×3 (120K waste) | External image, Next/Image optimized |
| No model routing | Haiku for QCM, Sonnet for chat |
| No QCM cache | Server-side cache (200 sets) |

---
© DamCompany — MA1 v8
