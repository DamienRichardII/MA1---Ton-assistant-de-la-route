"""
MA1 Code de la Route - Backend API v6
Market-ready: Auth(bcrypt+JWT) + Supabase + Stripe + SSE + Dashboard + Analytics + RGPD + PDF + Emails
"""
from __future__ import annotations
import asyncio, base64, json, os, re, random, time, uuid, io, httpx
from collections import defaultdict
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional
import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# [Sprint Admin/Emails/Support] Modules métiers dédiés.
# Imports optionnels (le backend doit pouvoir démarrer même sans Supabase configurée).
try:
    from email_service import send_email
    from email_templates import (
        welcome_user as tpl_welcome,
        login_notification as tpl_login,
        admin_password_reset as tpl_admin_reset,
        support_message_received as tpl_support_received,
        support_reply_user as tpl_support_reply,
        admin_new_support_message as tpl_admin_new_support,
    )
    import admin_auth as admin_auth_mod
    import support_service as support_svc
    import presence_service as presence_svc
    import reporting_service as reporting_svc
    import xp_service as xp_svc
    HAS_ADMIN_STACK = True
except ImportError as _e:
    print(f"[WARN] Stack admin/support non chargée: {_e}")
    HAS_ADMIN_STACK = False

# Security: bcrypt + JWT
try:
    import bcrypt
    def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    def check_pw(pw, hashed): return bcrypt.checkpw(pw.encode(), hashed.encode())
except ImportError:
    import hashlib
    def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()
    def check_pw(pw, hashed): return hashlib.sha256(pw.encode()).hexdigest() == hashed

# [Sprint Étape 2] JWT_SECRET robuste : refus de démarrage si défaut/trop faible en production
_JWT_DEFAULT = "ma1-dev-secret-change-in-production-min32chars!"
_APP_ENV = os.getenv("APP_ENV", "development").lower()
_JWT_SECRET_RAW = os.getenv("JWT_SECRET", "")

if _APP_ENV in ("production", "prod"):
    if not _JWT_SECRET_RAW:
        raise RuntimeError(
            "[SECURITY] JWT_SECRET est obligatoire en production. "
            "Définissez la variable d'environnement JWT_SECRET (>=32 caractères aléatoires)."
        )
    if _JWT_SECRET_RAW == _JWT_DEFAULT or len(_JWT_SECRET_RAW) < 32:
        raise RuntimeError(
            "[SECURITY] JWT_SECRET trop faible ou par défaut en production. "
            "Doit faire >=32 caractères et différer du secret par défaut."
        )
    JWT_SECRET = _JWT_SECRET_RAW
else:
    # Dev/local : tolère le secret par défaut mais log un warning
    JWT_SECRET = _JWT_SECRET_RAW or _JWT_DEFAULT
    if JWT_SECRET == _JWT_DEFAULT:
        print("[WARN] JWT_SECRET = valeur par défaut. OK en dev, INTERDIT en production.")

try:
    import jwt as pyjwt
    JWT_EXPIRY = int(os.getenv("JWT_EXPIRY_HOURS", "168"))
    def mk_token(uid):
        return pyjwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY)}, JWT_SECRET, algorithm="HS256")
    def verify_token(token):
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            return payload.get("sub")
        except: return None
except ImportError:
    def mk_token(uid): return str(uuid.uuid4()) + ":" + uid
    def verify_token(token):
        for u in _users.values():
            if u.get("token") == token: return u["user_id"]
        return None

# [Sprint Étape 2] Helpers d'authentification.
# Modèle : front envoie "Authorization: Bearer <jwt>".
# Pour rétro-compat, on accepte aussi "?token=<jwt>" en query string.
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}

def _extract_token(authorization: Optional[str], token_q: Optional[str]) -> Optional[str]:
    if authorization:
        if authorization.lower().startswith("bearer "):
            return authorization.split(" ", 1)[1].strip()
        return authorization.strip()
    return token_q

def require_auth(authorization: Optional[str] = Header(None), token: Optional[str] = None) -> str:
    """Exige un JWT valide. Renvoie l'user_id de l'appelant authentifié."""
    tok = _extract_token(authorization, token)
    if not tok:
        raise HTTPException(401, "Authentification requise (Authorization: Bearer <token>)")
    uid = verify_token(tok)
    if not uid:
        raise HTTPException(401, "Token invalide ou expiré")
    return uid

def require_auth_user_match(user_id: str, authorization: Optional[str] = Header(None), token: Optional[str] = None) -> str:
    """Exige que le token corresponde à l'user_id du path. Bypass pour admins."""
    caller_uid = require_auth(authorization, token)
    if caller_uid == user_id:
        return caller_uid
    # Bypass admin
    for u in _users.values():
        if u.get("user_id") == caller_uid and u.get("email", "").lower() in ADMIN_EMAILS:
            return caller_uid
    raise HTTPException(403, "Accès refusé : vous ne pouvez accéder qu'à vos propres données.")

def require_auth_owner_match(owner_id: str, authorization: Optional[str] = Header(None), token: Optional[str] = None) -> str:
    """Variante owner pour les routes auto-école. Même logique que user_match."""
    caller_uid = require_auth(authorization, token)
    if caller_uid == owner_id:
        return caller_uid
    for u in _users.values():
        if u.get("user_id") == caller_uid and u.get("email", "").lower() in ADMIN_EMAILS:
            return caller_uid
    raise HTTPException(403, "Accès refusé : ce dashboard ne vous appartient pas.")

def require_admin(authorization: Optional[str] = Header(None), token: Optional[str] = None) -> str:
    """Exige un rôle admin. Accepte 3 voies :
    1. JWT sub == 'env-admin' (fallback env ADMIN_PASSWORD_HASH)
    2. JWT sub existe dans la table admin_users (Supabase)
    3. JWT sub == user_id dont l'email est listé dans ADMIN_EMAILS (legacy)
    """
    caller_uid = require_auth(authorization, token)
    if caller_uid == "env-admin":
        return caller_uid
    if HAS_ADMIN_STACK:
        try:
            if admin_auth_mod.is_admin_user_id(get_supabase(), caller_uid):
                return caller_uid
        except Exception:
            pass
    for u in _users.values():
        if u.get("user_id") == caller_uid and u.get("email", "").lower() in ADMIN_EMAILS:
            return caller_uid
    raise HTTPException(403, "Accès admin requis.")

# Rate limiting
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
    HAS_LIMITER = True
except ImportError:
    HAS_LIMITER = False

# PDF generation
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as pdf_canvas
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

# Email
try:
    import resend
    RESEND_KEY = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "MA1 <noreply@ma1.app>")
    HAS_EMAIL = bool(RESEND_KEY)
    if HAS_EMAIL: resend.api_key = RESEND_KEY
except ImportError:
    HAS_EMAIL = False

load_dotenv()

# QCM cache & model router
try:
    from qcm_cache import qcm_cache
    HAS_CACHE = True
except ImportError:
    HAS_CACHE = False

try:
    from model_router import get_model
except ImportError:
    def get_model(task): return os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

AI_DISCLAIMER = "\n\n---\n⚠️ *MA1 est un outil pédagogique. Ces informations ne constituent pas un conseil juridique. Vérifiez sur Légifrance.*"

BASE_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = BASE_DIR / "public"
QCM_BANK_PATH = BASE_DIR / "data" / "qcm_bank.json"
VEILLE_PATH = BASE_DIR / "data" / "veille_legifrance.json"
CHROMA_DIR = str(BASE_DIR / "index" / "chroma_code_route")
COLLECTION_NAME = "code_de_la_route_onnx"
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
# [FIX presence/admin/XP] Serveur de confiance : cle service_role pour ecrire malgre RLS.
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
               or os.getenv("SUPABASE_ANON_KEY", ""))
_SUPABASE_KEY_IS_SERVICE = bool(os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

PLAN_LIMITS = {
    "free":      {"questions_per_day": 10,  "qcm_per_month": 80,    "exam_per_month": 1},
    "premium":   {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
    "autoecole": {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
    "annual":    {"questions_per_day": 999, "qcm_per_month": 99999, "exam_per_month": 99999},
}
PRICING = {
    "free":      {"name": "Gratuit",    "price_eur": 0,   "stripe_price_id": None},
    "premium":   {"name": "Premium",    "price_eur": 10,  "stripe_price_id": os.getenv("STRIPE_PREMIUM_PRICE_ID", "")},
    "annual":    {"name": "Premium Annuel", "price_eur": 79, "stripe_price_id": os.getenv("STRIPE_ANNUAL_PRICE_ID", "")},
    "autoecole": {"name": "Auto-Ecole", "price_eur": 200, "stripe_price_id": os.getenv("STRIPE_AUTOECOLE_PRICE_ID", "")},
}

SYSTEM_PROMPT = """Tu es MA1, un assistant IA expert du Code de la Route francais.
Tu accompagnes les apprentis conducteurs avec pedagogie et bienveillance.
Regles :
- Reponds en francais, ton pedagogique et encourageant
- Cite les articles officiels (Art. R413-2, etc.) quand pertinent
- Utilise le contexte Legifrance entre <contexte> si disponible
- Utilise des emojis pour structurer tes reponses
- Ne traite PAS les sujets hors code de la route
- Reponses concises 150-300 mots max"""

QCM_PROMPT = """Tu es un expert du Code de la Route francais.
Genere exactement {n} questions QCM sur : "{topic}" - niveau {difficulty}.
{diff_note}

IMPORTANT: Pour chaque question, ajoute un champ "situation" decrivant une scene de conduite realiste (ex: "Vous roulez sur une route nationale a 80km/h. Un panneau triangulaire avec un virage apparait...").

Reponds UNIQUEMENT avec du JSON valide :
[{{"id":"q1","question":"...","choices":["A","B","C","D"],"answer_index":0,"explanation":"...","ref":"Art. XXXX","situation":"..."}}]"""

VISION_PROMPT = """Tu es un expert en signalisation routiere francaise.
Analyse cette image : 1) Panneau(x) visible(s) 2) Signification Code de la Route 3) Action conducteur 4) Article de loi.
Reponds en francais avec emojis, precis et complet."""

ADAPTIVE_SYSTEM = """Tu es MA1, assistant adaptatif du Code de la Route.
Profil apprenant : {profile_summary}
Adapte tes explications :
- Debutant : simples, exemples, encouragements
- Intermediaire : equilibrees, details techniques
- Avance : precises, articles de loi, nuances
{base_system}"""

REVISION_PLAN = [
    {"day":1,"topic":"signalisation","title":"Panneaux d'interdiction","type":"qcm","n":10},
    {"day":2,"topic":"signalisation","title":"Panneaux d'obligation","type":"qcm","n":10},
    {"day":3,"topic":"signalisation","title":"Panneaux de danger","type":"qcm","n":10},
    {"day":4,"topic":"vitesse","title":"Limitations de vitesse","type":"qcm","n":10},
    {"day":5,"topic":"vitesse","title":"Distances de freinage","type":"qcm","n":10},
    {"day":6,"topic":"priorite","title":"Priorite a droite","type":"qcm","n":10},
    {"day":7,"topic":"priorite","title":"Ronds-points","type":"qcm","n":10},
    {"day":8,"topic":"signalisation","title":"Feux & marquages","type":"revision"},
    {"day":9,"topic":"alcool","title":"Alcool & stupefiants","type":"qcm","n":10},
    {"day":10,"topic":"alcool","title":"Sanctions alcool","type":"qcm","n":10},
    {"day":11,"topic":"permis","title":"Permis probatoire","type":"qcm","n":10},
    {"day":12,"topic":"permis","title":"Points & infractions","type":"qcm","n":10},
    {"day":13,"topic":"securite","title":"Ceinture & airbags","type":"qcm","n":10},
    {"day":14,"topic":"securite","title":"Securite enfants","type":"qcm","n":10},
    {"day":15,"topic":"mix","title":"Examen blanc #1","type":"exam"},
    {"day":16,"topic":"autoroute","title":"Conduite autoroute","type":"qcm","n":10},
    {"day":17,"topic":"autoroute","title":"Insertion & depassement","type":"qcm","n":10},
    {"day":18,"topic":"stationnement","title":"Regles stationnement","type":"qcm","n":10},
    {"day":19,"topic":"stationnement","title":"Arret & stationnement","type":"qcm","n":10},
    {"day":20,"topic":"premiers_secours","title":"Gestes qui sauvent","type":"qcm","n":10},
    {"day":21,"topic":"premiers_secours","title":"Alerter les secours","type":"qcm","n":10},
    {"day":22,"topic":"eco","title":"Eco-conduite","type":"qcm","n":10},
    {"day":23,"topic":"mix","title":"Revision points faibles","type":"revision"},
    {"day":24,"topic":"nuit","title":"Conduite de nuit","type":"qcm","n":10},
    {"day":25,"topic":"mix","title":"Examen blanc #2","type":"exam"},
    {"day":26,"topic":"signalisation","title":"Revision panneaux","type":"vision"},
    {"day":27,"topic":"mix","title":"QCM intensif mixte","type":"qcm","n":15},
    {"day":28,"topic":"mix","title":"Points faibles cibles","type":"revision"},
    {"day":29,"topic":"mix","title":"Examen blanc final","type":"exam"},
    {"day":30,"topic":"mix","title":"Dernier check-up","type":"revision"},
]

app = FastAPI(title="MA1 Code de la Route API", version="8.0.0")
if HAS_LIMITER:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Timing middleware
try:
    from middleware import TimingMiddleware
    app.add_middleware(TimingMiddleware)
except ImportError:
    pass
# [Sprint Étape 2] CORS restreint via env. En prod : interdit les wildcards.
_CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8000"
).split(",") if o.strip()]
if _APP_ENV in ("production", "prod") and "*" in _CORS_ORIGINS:
    raise RuntimeError(
        "[SECURITY] CORS '*' interdit en production. "
        "Définissez CORS_ALLOWED_ORIGINS=https://ma1.fr,https://www.ma1.fr,..."
    )
# CORS must be added LAST so it wraps outermost (processes first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    allow_credentials=True,
    expose_headers=["*"],
)

if PUBLIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")

# [Sprint Admin/Emails/Support] Seed admin au démarrage si table admin_users vide.
@app.on_event("startup")
async def _seed_admin_on_startup():
    if HAS_ADMIN_STACK:
        try:
            admin_auth_mod.ensure_admin_seed(get_supabase())
        except Exception as e:
            print(f"[startup] seed admin warning: {e}")

_conversations = defaultdict(list)
_usage = {}
_profiles = {}
_users = {}
_analytics = []
_autoecole_students = {}
_chroma_col = None
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is not None: return _supabase
    if not SUPABASE_URL or not SUPABASE_KEY: return None
    try:
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        _mode = "service_role (RLS bypass)" if _SUPABASE_KEY_IS_SERVICE else "ANON (ecritures bloquees par RLS)"
        print(f"[OK Supabase] Connecte - cle={_mode}")
        if not _SUPABASE_KEY_IS_SERVICE:
            print("[WARN Supabase] SUPABASE_SERVICE_KEY absent : heartbeat/profiles/attempts echoueront (RLS). A definir sur Railway.")
        return _supabase
    except Exception as e:
        print(f"[WARN Supabase] {e}")
        return None

_PROFILE_COLS = {
    "level", "score_total", "score_correct", "weak_topics", "strong_topics",
    "theme_scores", "plan_day", "plan_started", "exam_results", "streak_days", "last_seen",
}

async def sb_upsert_profile(uid, profile):
    sb = get_supabase()
    if sb:
        row = {"user_id": uid}
        for k, v in profile.items():
            if k in _PROFILE_COLS:
                row[k] = v
        try: sb.table("profiles").upsert(row, on_conflict="user_id").execute()
        except Exception as e: print(f"[profiles] upsert warn: {e}")

async def sb_track(event):
    sb = get_supabase()
    if sb:
        try: sb.table("analytics").insert(event).execute()
        except: pass
    _analytics.append(event)

def get_chroma():
    global _chroma_col
    if _chroma_col is not None: return _chroma_col
    if not Path(CHROMA_DIR).exists(): return None
    try:
        import chromadb
        from chromadb.config import Settings
        from chromadb.utils import embedding_functions
        client = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))
        ef = embedding_functions.DefaultEmbeddingFunction()
        _chroma_col = client.get_collection(COLLECTION_NAME, embedding_function=ef)
        print(f"[OK RAG] {_chroma_col.count()} chunks")
        return _chroma_col
    except Exception as e:
        print(f"[WARN RAG] {e}")
        return None

def retrieve_context(query, n=4):
    col = get_chroma()
    if not col: return "", []
    try:
        res = col.query(query_texts=[query], n_results=n, include=["documents","metadatas","distances"])
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        sources, passages = [], []
        for doc, md, dist in zip(docs, metas, dists):
            if dist < 1.6:
                sources.append({"article_id": md.get("article_id"), "num_article": md.get("num_article"), "url": md.get("url"), "excerpt": doc[:300], "score": round(1-dist/2, 3)})
                passages.append(f"[{md.get('num_article','')}] {doc[:500]}")
        return "\n\n".join(passages), sources
    except: return "", []

def get_profile(uid):
    if uid not in _profiles:
        _profiles[uid] = {"user_id":uid,"level":"debutant","score_total":0,"score_correct":0,"weak_topics":[],"strong_topics":[],"sessions":0,"last_seen":date.today().isoformat(),"streak_days":0,"theme_scores":{},"plan_day":0,"plan_started":None,"exam_results":[],"xp":0}
    return _profiles[uid]

def update_profile(uid, topic, correct):
    p = get_profile(uid)
    p["score_total"] += 1
    if correct: p["score_correct"] += 1; p["xp"] += 10
    ts = p["theme_scores"].setdefault(topic, {"correct":0,"total":0})
    ts["total"] += 1
    if correct: ts["correct"] += 1
    rate = p["score_correct"] / max(p["score_total"], 1)
    if rate >= 0.80 and p["score_total"] >= 20: p["level"] = "avance"
    elif rate >= 0.55 and p["score_total"] >= 10: p["level"] = "intermediaire"
    else: p["level"] = "debutant"
    p["weak_topics"] = [t for t,v in p["theme_scores"].items() if v["total"]>=3 and v["correct"]/v["total"]<0.5]
    p["strong_topics"] = [t for t,v in p["theme_scores"].items() if v["total"]>=3 and v["correct"]/v["total"]>=0.75]

def profile_summary(uid):
    p = get_profile(uid)
    rate = round(p["score_correct"]/max(p["score_total"],1)*100)
    weak = ", ".join(p["weak_topics"]) or "aucun identifie"
    return f"Niveau:{p['level']}|Reussite:{rate}%({p['score_correct']}/{p['score_total']})|Faibles:{weak}"

def get_usage(uid):
    today = date.today().isoformat()
    if uid not in _usage or _usage[uid]["date"] != today:
        plan = _usage.get(uid, {}).get("plan", "free")
        _usage[uid] = {"date":today,"questions":0,"qcm_count":0,"exam_count":0,"plan":plan}
    return _usage[uid]

def check_limit(uid, action):
    u = get_usage(uid)
    lim = PLAN_LIMITS.get(u.get("plan","free"), PLAN_LIMITS["free"])
    if action=="question": return u["questions"]<lim["questions_per_day"]
    if action=="exam": return u.get("exam_count",0)<lim["exam_per_month"]
    return u["qcm_count"]<lim["qcm_per_month"]

def get_claude():
    key = os.getenv("ANTHROPIC_API_KEY","")
    if not key: raise HTTPException(503,"ANTHROPIC_API_KEY manquante")
    return anthropic.Anthropic(api_key=key)

# Pydantic
class Message(BaseModel):
    role:str; content:str
class ChatRequest(BaseModel):
    message:str; user_id:Optional[str]="anonymous"; history:Optional[List[Message]]=None
class QCMGenerateRequest(BaseModel):
    topic:str; n:int=6; user_id:Optional[str]="anonymous"; difficulty:Optional[str]="auto"
class QCMResultRequest(BaseModel):
    user_id:str; topic:str; correct:bool
class PlanRequest(BaseModel):
    user_id:str; plan:str
class ClearRequest(BaseModel):
    user_id:str
class AuthRegisterRequest(BaseModel):
    email:str; password:str; name:Optional[str]=""; birth_year:Optional[int]=None
class AuthLoginRequest(BaseModel):
    email:str; password:str
class ExamResultRequest(BaseModel):
    user_id:str; correct:int; total:int; time_seconds:int
class AnalyticsEvent(BaseModel):
    user_id:str; event:str; data:Optional[dict]={}
class DashStudentAdd(BaseModel):
    owner_id:str; student_email:str

# ═══════════ ROUTES ═══════════

@app.get("/")
def root():
    idx = PUBLIC_DIR/"index.html"
    return FileResponse(str(idx)) if idx.exists() else JSONResponse({"status":"MA1 v5"})

@app.get("/health")
def health():
    col=get_chroma(); sb=get_supabase()
    return {"status":"ok","version":"8.0.0","claude":CLAUDE_MODEL,"rag":col is not None,"supabase":sb is not None,"stripe":bool(STRIPE_SECRET_KEY),"api_key":bool(os.getenv("ANTHROPIC_API_KEY")),"ts":datetime.now(timezone.utc).isoformat()}

# AUTH
@app.post("/auth/register")
async def auth_register(req:AuthRegisterRequest):
    email=req.email.lower().strip()
    if email in _users: raise HTTPException(400,"Email deja utilise")
    if req.birth_year:
        age = date.today().year - req.birth_year
        if age < 15: raise HTTPException(400, "Vous devez avoir au moins 15 ans (conduite accompagnee)")
        if age < 18 and age >= 15: pass  # 15-17: OK for conduite accompagnee
    uid="u_"+uuid.uuid4().hex[:12]; token=mk_token(uid)
    _users[email]={"user_id":uid,"email":email,"name":req.name,"pw_hash":hash_pw(req.password),"token":token,"plan":"free","birth_year":req.birth_year,"created":datetime.now(timezone.utc).isoformat()}
    sb=get_supabase()
    if sb:
        user_row={"user_id":uid,"email":email,"name":req.name or "","password_hash":_users[email]["pw_hash"],"plan":"free"}
        if req.birth_year:
            user_row["birth_date"]=f"{int(req.birth_year)}-01-01"
        try: sb.table("users").upsert(user_row, on_conflict="user_id").execute()
        except Exception as e: print(f"[users] insert ERROR: {e}", flush=True)
        try: sb.table("profiles").upsert({"user_id":uid,"level":"debutant","xp":0}, on_conflict="user_id").execute()
        except Exception as e: print(f"[profiles] seed ERROR: {e}", flush=True)
    if HAS_ADMIN_STACK:
        try: xp_svc.award_xp(sb, user_id=uid, type_="account_created")
        except Exception as e: print(f"[XP] account_created warn: {e}")
    await sb_track({"user_id":uid,"event":"register","ts":time.time()})
    # [Fix email welcome] Logs explicites + on lit le status renvoyé par send_email
    # (avant : le status était jeté + pas de log si "skipped" ou "failed" propre côté Resend)
    print(f"[EMAIL] welcome start {email}", flush=True)
    if HAS_ADMIN_STACK:
        try:
            tpl = tpl_welcome(req.name or "", email)
            result = send_email(
                template="welcome_user", to_email=email,
                subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                user_id=uid, supabase=get_supabase(), force=True,
            )
            status = (result or {}).get("status", "unknown")
            if status == "sent":
                print(f"[EMAIL] welcome sent {email} (id={(result or {}).get('message_id','')})", flush=True)
            elif status == "skipped":
                print(f"[EMAIL] welcome skipped {email}: {(result or {}).get('error','no reason')}", flush=True)
            else:
                print(f"[EMAIL] welcome failed {email}: {(result or {}).get('error','unknown error')}", flush=True)
        except Exception as e:
            print(f"[EMAIL] welcome failed {email}: exception {type(e).__name__}: {e}", flush=True)
    elif HAS_EMAIL:
        try:
            await send_welcome_email(email, req.name)
            print(f"[EMAIL] welcome sent {email} (legacy path)", flush=True)
        except Exception as e:
            print(f"[EMAIL] welcome failed {email}: legacy {type(e).__name__}: {e}", flush=True)
    else:
        print(f"[EMAIL] welcome skipped {email}: ni HAS_ADMIN_STACK ni HAS_EMAIL — vérifier PYTHONPATH + RESEND_API_KEY", flush=True)
    # Log event register
    if HAS_ADMIN_STACK:
        try:
            sb = get_supabase()
            if sb is not None:
                sb.table("login_events").insert(
                    {"user_id": uid, "email": email, "event": "register"}
                ).execute()
        except Exception: pass
    return {"success":True,"user_id":uid,"token":token,"name":req.name,"plan":"free"}

@app.post("/auth/login")
async def auth_login(req:AuthLoginRequest):
    email=req.email.lower().strip()
    user=_users.get(email)
    if not user or not check_pw(req.password, user["pw_hash"]): raise HTTPException(401,"Email ou mot de passe incorrect")
    token=mk_token(user["user_id"]); user["token"]=token
    if HAS_ADMIN_STACK:
        try: xp_svc.award_xp(get_supabase(), user_id=user["user_id"], type_="daily_login")
        except Exception as e: print(f"[XP] daily_login warn: {e}")
    await sb_track({"user_id":user["user_id"],"event":"login","ts":time.time()})
    # [Sprint Admin/Emails/Support] Email notification de connexion (throttle 1/h via email_service) + log
    if HAS_ADMIN_STACK:
        try:
            when = datetime.now(timezone.utc).strftime("%d/%m/%Y à %H:%M UTC")
            tpl = tpl_login(user.get("name", ""), when)
            send_email(template="login_notification", to_email=user["email"],
                       subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                       user_id=user["user_id"], supabase=get_supabase())
        except Exception as e:
            print(f"[email] login_notification failed: {e}")
        try:
            sb = get_supabase()
            if sb is not None:
                sb.table("login_events").insert(
                    {"user_id": user["user_id"], "email": user["email"], "event": "login"}
                ).execute()
        except Exception: pass
    return {"success":True,"user_id":user["user_id"],"token":token,"name":user.get("name",""),"plan":user.get("plan","free"),"profile":get_profile(user["user_id"])}

@app.get("/auth/me")
async def auth_me(token:str):
    uid = verify_token(token)
    if uid:
        for u in _users.values():
            if u["user_id"] == uid:
                return {"user_id":u["user_id"],"email":u["email"],"name":u.get("name",""),"plan":u.get("plan","free"),"profile":get_profile(u["user_id"])}
    # Fallback: check raw token
    for u in _users.values():
        if u.get("token")==token:
            return {"user_id":u["user_id"],"email":u["email"],"name":u.get("name",""),"plan":u.get("plan","free"),"profile":get_profile(u["user_id"])}
    raise HTTPException(401,"Token invalide")

# CHAT
@app.post("/chat")
async def chat(req:ChatRequest):
    uid=req.user_id or "anonymous"
    if not check_limit(uid,"question"): raise HTTPException(429,{"error":"limit_reached","message":"Limite 10 questions/jour. Passez Premium !"})
    ctx,sources=retrieve_context(req.message,4)
    enriched=(f"{req.message}\n\n<contexte>\n{ctx}\n</contexte>" if ctx else req.message)
    sys_p=ADAPTIVE_SYSTEM.format(profile_summary=profile_summary(uid),base_system=SYSTEM_PROMPT)
    hist=([{"role":m.role,"content":m.content} for m in req.history] if req.history else _conversations[uid].copy())
    hist.append({"role":"user","content":enriched})
    client=get_claude()
    try:
        resp=client.messages.create(model=get_model("chat"),max_tokens=1200,system=sys_p,messages=hist)
        answer=resp.content[0].text
    except anthropic.APIError as e: raise HTTPException(502,str(e))
    _conversations[uid].append({"role":"user","content":req.message})
    _conversations[uid].append({"role":"assistant","content":answer})
    if len(_conversations[uid])>40: _conversations[uid]=_conversations[uid][-40:]
    get_usage(uid)["questions"]+=1; get_profile(uid)["sessions"]+=1
    await sb_track({"user_id":uid,"event":"chat","ts":time.time()})
    return {"answer":answer + AI_DISCLAIMER,"sources":sources,"rag_used":bool(ctx),"profile":get_profile(uid),"usage":get_usage(uid)}

# CHAT STREAMING SSE
@app.post("/chat/stream")
async def chat_stream(req:ChatRequest):
    uid=req.user_id or "anonymous"
    if not check_limit(uid,"question"): raise HTTPException(429,{"error":"limit_reached"})
    ctx,sources=retrieve_context(req.message,4)
    enriched=(f"{req.message}\n\n<contexte>\n{ctx}\n</contexte>" if ctx else req.message)
    sys_p=ADAPTIVE_SYSTEM.format(profile_summary=profile_summary(uid),base_system=SYSTEM_PROMPT)
    hist=([{"role":m.role,"content":m.content} for m in req.history] if req.history else _conversations[uid].copy())
    hist.append({"role":"user","content":enriched})
    client=get_claude()
    async def gen():
        full=""
        try:
            with client.messages.stream(model=get_model("chat"),max_tokens=1200,system=sys_p,messages=hist) as stream:
                if sources: yield f"data: {json.dumps({'type':'sources','sources':sources})}\n\n"
                for text in stream.text_stream:
                    full+=text
                    yield f"data: {json.dumps({'type':'token','text':text})}\n\n"
            _conversations[uid].append({"role":"user","content":req.message})
            _conversations[uid].append({"role":"assistant","content":full})
            if len(_conversations[uid])>40: _conversations[uid]=_conversations[uid][-40:]
            get_usage(uid)["questions"]+=1; get_profile(uid)["sessions"]+=1
            yield f"data: {json.dumps({'type':'done','usage':get_usage(uid)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"
    return StreamingResponse(gen(),media_type="text/event-stream",headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

@app.post("/chat/clear")
def clear_history(req:ClearRequest):
    _conversations[req.user_id]=[]; return {"success":True}

# VISION
@app.post("/vision")
async def analyze_panneau(file:UploadFile=File(...),user_id:str=Form("anonymous")):
    if not check_limit(user_id,"question"): raise HTTPException(429,{"error":"limit_reached"})
    content=await file.read()
    if len(content)>5*1024*1024: raise HTTPException(413,"Max 5 Mo")
    mime=file.content_type or "image/jpeg"
    b64=base64.standard_b64encode(content).decode("utf-8")
    client=get_claude()
    try:
        resp=client.messages.create(model=get_model("vision"),max_tokens=800,messages=[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":mime,"data":b64}},{"type":"text","text":VISION_PROMPT}]}])
        answer=resp.content[0].text
    except anthropic.APIError as e: raise HTTPException(502,str(e))
    get_usage(user_id)["questions"]+=1
    await sb_track({"user_id":user_id,"event":"vision","ts":time.time()})
    return {"analysis":answer,"mime":mime}

# QCM
@app.post("/qcm/generate")
async def generate_qcm(req:QCMGenerateRequest):
    uid=req.user_id or "anonymous"
    if not check_limit(uid,"qcm"): raise HTTPException(429,{"error":"limit_reached"})
    diff=req.difficulty
    if diff=="auto":
        lvl=get_profile(uid).get("level","debutant")
        diff={"debutant":"facile","intermediaire":"moyen","avance":"difficile"}.get(lvl,"moyen")
    dn={"facile":"Questions simples, vocabulaire accessible.","moyen":"Niveau examen, subtilites.","difficile":"Questions pointues, articles precis."}.get(diff,"")
    # Check cache first
    if HAS_CACHE:
        cached=qcm_cache.get(req.topic,diff,min(req.n,15))
        if cached:
            get_usage(uid)["qcm_count"]+=len(cached)
            return {"questions":cached,"topic":req.topic,"difficulty":diff,"source":"cached","profile_level":get_profile(uid).get("level")}
    prompt=QCM_PROMPT.format(n=min(req.n,15),topic=req.topic,difficulty=diff,diff_note=dn)
    client=get_claude()
    try:
        resp=client.messages.create(model=get_model("qcm_generate"),max_tokens=3000,messages=[{"role":"user","content":prompt}])
        raw=resp.content[0].text.strip()
        raw=re.sub(r"^```(?:json)?\s*","",raw); raw=re.sub(r"\s*```$","",raw)
        questions=json.loads(raw)
        valid=[]
        for i,q in enumerate(questions):
            if all(k in q for k in ["question","choices","answer_index"]):
                q.setdefault("id",f"ai_{req.topic}_{i}"); q.setdefault("explanation",""); q.setdefault("ref","Code de la Route")
                valid.append(q)
    except json.JSONDecodeError as e: raise HTTPException(500,f"JSON invalide: {e}")
    except anthropic.APIError as e: raise HTTPException(502,str(e))
    # Store in cache
    if HAS_CACHE and valid: qcm_cache.put(req.topic,diff,min(req.n,15),valid)
    get_usage(uid)["qcm_count"]+=len(valid)
    await sb_track({"user_id":uid,"event":"qcm","data":{"topic":req.topic,"n":len(valid)},"ts":time.time()})
    return {"questions":valid,"topic":req.topic,"difficulty":diff,"source":"claude_generated","profile_level":get_profile(uid).get("level")}

@app.post("/qcm/result")
async def qcm_result(req:QCMResultRequest, _uid: str = Depends(require_auth)):
    # [Sprint Étape 2] Auth requis. Anonyme refusé pour empêcher pollution profil.
    if _uid != req.user_id:
        is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
        if not is_admin:
            raise HTTPException(403, "user_id ne correspond pas à votre compte.")
    update_profile(req.user_id,req.topic,req.correct)
    p=get_profile(req.user_id)
    await sb_upsert_profile(req.user_id,p)
    sb=get_supabase()
    if sb is not None:
        try: sb.table("qcm_attempts").insert({"user_id":req.user_id,"topic":req.topic,"is_correct":bool(req.correct)}).execute()
        except Exception as e: print(f"[qcm_attempts] insert warn: {e}")
    xp_gain=0
    if HAS_ADMIN_STACK and req.correct:
        try: xp_gain=xp_svc.award_xp(sb, user_id=req.user_id, type_="qcm_correct", meta={"topic":req.topic})
        except Exception as e: print(f"[XP] qcm_correct warn: {e}")
    return {"profile":p,"xp_gain":xp_gain}

# EXAM
@app.post("/exam/result")
async def exam_result(req:ExamResultRequest, _uid: str = Depends(require_auth)):
    if _uid != req.user_id:
        is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
        if not is_admin:
            raise HTTPException(403, "user_id ne correspond pas à votre compte.")
    p=get_profile(req.user_id)
    r={"date":date.today().isoformat(),"correct":req.correct,"total":req.total,"pct":round(req.correct/max(req.total,1)*100),"passed":req.correct>=32,"time_s":req.time_seconds}
    p.setdefault("exam_results",[]).append(r)
    if len(p["exam_results"])>50: p["exam_results"]=p["exam_results"][-50:]
    await sb_upsert_profile(req.user_id,p)
    sb=get_supabase()
    if sb is not None:
        try: sb.table("exam_attempts").insert({"user_id":req.user_id,"correct_count":req.correct,"total_count":req.total,"pct":r["pct"],"passed":r["passed"],"duration_seconds":req.time_seconds}).execute()
        except Exception as e: print(f"[exam_attempts] insert warn: {e}")
    xp_gain=0
    if HAS_ADMIN_STACK:
        try:
            xp_gain=xp_svc.award_xp(sb, user_id=req.user_id, type_="exam_completed")
            if r["passed"]:
                xp_gain+=xp_svc.award_xp(sb, user_id=req.user_id, type_="exam_passed")
        except Exception as e: print(f"[XP] exam warn: {e}")
    await sb_track({"user_id":req.user_id,"event":"exam","data":r,"ts":time.time()})
    return {"profile":p,"result":r,"xp_gain":xp_gain}

# 30 DAY PLAN
@app.get("/plan/30days")
def get_30day_plan(): return {"plan":REVISION_PLAN,"total_days":30}

@app.post("/plan/progress")
async def update_plan_progress(user_id:str,day:int, _uid: str = Depends(require_auth_user_match)):
    p=get_profile(user_id); p["plan_day"]=max(p.get("plan_day",0),day)
    if not p.get("plan_started"): p["plan_started"]=date.today().isoformat()
    await sb_upsert_profile(user_id,p)
    return {"plan_day":p["plan_day"]}

@app.get("/profile/{user_id}")
def get_user_profile(user_id:str, _uid: str = Depends(require_auth_user_match)):
    return get_profile(user_id)

# READINESS
@app.get("/readiness/{user_id}")
def get_readiness(user_id:str, _uid: str = Depends(require_auth_user_match)):
    p=get_profile(user_id); factors=[]
    rate=p["score_correct"]/max(p["score_total"],1)
    factors.append(min(rate/0.8,1.0)*30)
    factors.append(min(p["score_total"]/200,1.0)*20)
    all_t=["vitesse","signalisation","priorite","alcool","permis","autoroute","stationnement","securite","premiers_secours"]
    covered=sum(1 for t in all_t if t in p.get("theme_scores",{}))
    factors.append((covered/len(all_t))*25)
    exams=p.get("exam_results",[])
    if exams: factors.append(min(max(e["pct"] for e in exams[-5:])/80,1.0)*25)
    else: factors.append(0)
    score=round(sum(factors))
    status="pret" if score>=75 else "en bonne voie" if score>=50 else "continuez"
    return {"readiness":score,"status":status}

# VEILLE
@app.get("/veille")
async def veille():
    if VEILLE_PATH.exists():
        data=json.loads(VEILLE_PATH.read_text(encoding="utf-8"))
        if data.get("date")==date.today().isoformat(): return data
    client=get_claude()
    prompt="Synthese des dernieres modifications du Code de la Route francais (2023-2025): vitesse, ZFE, trottinettes, alcool. Format liste avec emojis."
    try:
        resp=client.messages.create(model=get_model("veille"),max_tokens=1000,messages=[{"role":"user","content":prompt}])
        syn=resp.content[0].text
    except: syn="Veille temporairement indisponible."
    result={"date":date.today().isoformat(),"synthese":syn,"source":"Claude IA"}
    VEILLE_PATH.parent.mkdir(parents=True,exist_ok=True)
    VEILLE_PATH.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    return result

# STRIPE
@app.post("/stripe/checkout")
async def create_checkout(user_id:str,plan:str):
    if not STRIPE_SECRET_KEY: raise HTTPException(503,"Stripe non configure")
    import stripe; stripe.api_key=STRIPE_SECRET_KEY
    price_id=PRICING.get(plan,{}).get("stripe_price_id")
    if not price_id: raise HTTPException(400,"Plan invalide")
    try:
        session=stripe.checkout.Session.create(payment_method_types=["card"],line_items=[{"price":price_id,"quantity":1}],mode="subscription",success_url=os.getenv("APP_URL","http://localhost:8000")+"/?checkout=success&plan="+plan,cancel_url=os.getenv("APP_URL","http://localhost:8000")+"/?checkout=cancel",metadata={"user_id":user_id,"plan":plan})
        return {"checkout_url":session.url,"session_id":session.id}
    except Exception as e: raise HTTPException(502,f"Erreur Stripe: {e}")

@app.post("/stripe/webhook")
async def stripe_webhook(request:Request):
    if not STRIPE_SECRET_KEY: raise HTTPException(503,"Stripe non configure")
    import stripe; stripe.api_key=STRIPE_SECRET_KEY
    payload=await request.body(); sig=request.headers.get("stripe-signature")
    try: event=stripe.Webhook.construct_event(payload,sig,STRIPE_WEBHOOK_SECRET)
    except Exception as e: raise HTTPException(400,f"Webhook invalide: {e}")
    if event["type"]=="checkout.session.completed":
        s=event["data"]["object"]; uid=s.get("metadata",{}).get("user_id"); plan=s.get("metadata",{}).get("plan","premium")
        if uid:
            get_usage(uid)["plan"]=plan
            for u in _users.values():
                if u["user_id"]==uid: u["plan"]=plan; break
            await sb_track({"user_id":uid,"event":"subscription","data":{"plan":plan},"ts":time.time()})
    return {"status":"ok"}

# PRICING
@app.post("/plan/upgrade")
def upgrade_plan(req:PlanRequest, _admin: str = Depends(require_admin)):
    """[Sprint Étape 2] Admin-only. L'attribution d'un plan payant passe désormais par
    le tunnel d'activation manuelle (Sprint D). Cette route reste pour les admins."""
    if req.plan not in PLAN_LIMITS: raise HTTPException(400,"Plan invalide")
    get_usage(req.user_id)["plan"]=req.plan
    return {"success":True,"plan":req.plan,"limits":PLAN_LIMITS[req.plan]}

@app.get("/pricing")
def pricing():
    return {"plans":[
        {"id":"free","name":"Gratuit","price_eur":0,"limits":PLAN_LIMITS["free"]},
        {"id":"premium","name":"Premium","price_eur":10,"limits":PLAN_LIMITS["premium"],"trial_days":7},
        {"id":"annual","name":"Premium Annuel","price_eur":79,"limits":PLAN_LIMITS["annual"],"period":"year","savings":"41€ economises"},
        {"id":"autoecole","name":"Auto-Ecole","price_eur":200,"limits":PLAN_LIMITS["autoecole"]},
    ]}

@app.get("/usage/{user_id}")
def get_user_usage(user_id:str, _uid: str = Depends(require_auth_user_match)):
    return get_usage(user_id)

# DASHBOARD MONITEUR
@app.get("/dashboard/{owner_id}")
async def dashboard(owner_id:str, _uid: str = Depends(require_auth_owner_match)):
    students=_autoecole_students.get(owner_id,[])
    data=[]
    for sid in students:
        p=get_profile(sid); rate=p["score_correct"]/max(p["score_total"],1)
        exams=p.get("exam_results",[]); best=max((e["pct"] for e in exams[-5:]),default=0) if exams else 0
        rdns=round(min(rate/0.8,1)*40+min(p["score_total"]/200,1)*30+min(best/80,1)*30)
        data.append({"user_id":sid,"name":next((u["name"] for u in _users.values() if u["user_id"]==sid),sid),"level":p["level"],"score_total":p["score_total"],"success_rate":round(rate*100),"weak_topics":p["weak_topics"],"exams":len(exams),"best_exam":best,"readiness":rdns,"plan_day":p.get("plan_day",0),"xp":p.get("xp",0)})
    tot=len(data); avg=round(sum(s["success_rate"] for s in data)/max(tot,1)); ready=sum(1 for s in data if s["readiness"]>=75)
    return {"owner_id":owner_id,"total_students":tot,"avg_success_rate":avg,"ready_for_exam":ready,"students":sorted(data,key=lambda s:s["readiness"],reverse=True)}

@app.post("/dashboard/add-student")
async def add_student(req:DashStudentAdd, _uid: str = Depends(require_auth)):
    # [Sprint Étape 2] L'appelant doit être le owner_id du body OU admin
    if _uid != req.owner_id:
        is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
        if not is_admin:
            raise HTTPException(403, "Vous ne pouvez ajouter des élèves qu'à votre propre auto-école.")
    students=_autoecole_students.setdefault(req.owner_id,[])
    user=_users.get(req.student_email.lower())
    if not user: raise HTTPException(404,"Eleve non trouve")
    sid=user["user_id"]
    if sid not in students: students.append(sid)
    return {"success":True,"student_id":sid,"total":len(students)}

# ANALYTICS
@app.post("/analytics/event")
async def track_event(req:AnalyticsEvent):
    # Note (Sprint Étape 2) : route publique tolérée pour suivi anonyme, mais sans modif de plan.
    await sb_track({"user_id":req.user_id,"event":req.event,"data":req.data,"ts":time.time(),"date":date.today().isoformat()})
    return {"tracked":True}

@app.get("/analytics/summary")
async def analytics_summary(days:int=7, _admin: str = Depends(require_admin)):
    cutoff=time.time()-(days*86400); recent=[e for e in _analytics if e.get("ts",0)>cutoff]
    by_type=defaultdict(int); users=set()
    for e in recent: by_type[e.get("event","?")]+=1; users.add(e.get("user_id",""))
    dau=defaultdict(set)
    for e in recent: dau[e.get("date","")].add(e.get("user_id",""))
    return {"period":days,"events":len(recent),"unique_users":len(users),"by_type":dict(by_type),"dau":{d:len(u) for d,u in sorted(dau.items())},"total_users":len(_users)}

@app.get("/qcm")
def get_qcm_static(topic:Optional[str]=None,n:int=10,user_id:Optional[str]=None):
    uid=user_id or "anonymous"
    if not check_limit(uid,"qcm"): raise HTTPException(429,{"error":"limit_reached"})
    if not QCM_BANK_PATH.exists(): return {"questions":[],"source":"no_bank"}
    with QCM_BANK_PATH.open("r",encoding="utf-8") as f: bank=json.load(f)
    if topic: bank=[q for q in bank if topic.lower() in str(q).lower()]
    random.shuffle(bank)
    return {"questions":bank[:n],"total":len(bank),"source":"static"}

# ═══════════════ V6 ADDITIONS ═══════════════

# LEGAL PAGES
@app.get("/legal/{page}")
def serve_legal(page: str):
    legal_dir = PUBLIC_DIR / "legal"
    allowed = {"mentions-legales.html", "cgu.html", "cgv.html", "confidentialite.html"}
    if page not in allowed:
        raise HTTPException(404, "Page non trouvee")
    fp = legal_dir / page
    if fp.exists():
        return FileResponse(str(fp), media_type="text/html")
    raise HTTPException(404, "Page non trouvee")

# RGPD: DATA EXPORT (Portability)
@app.get("/rgpd/export/{user_id}")
async def rgpd_export(user_id: str, _uid: str = Depends(require_auth_user_match)):
    """Export all user data as JSON (RGPD Art. 20 - Right to portability)."""
    profile = get_profile(user_id)
    usage = get_usage(user_id)
    user_data = None
    for u in _users.values():
        if u["user_id"] == user_id:
            user_data = {k: v for k, v in u.items() if k != "pw_hash"}
            break
    events = [e for e in _analytics if e.get("user_id") == user_id]
    export = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": user_data,
        "profile": profile,
        "usage": usage,
        "analytics_events": events[-100:],
    }
    return JSONResponse(export, headers={
        "Content-Disposition": f"attachment; filename=ma1_export_{user_id}.json"
    })

# RGPD: ACCOUNT DELETION (Right to be forgotten)
@app.delete("/rgpd/delete/{user_id}")
async def rgpd_delete(user_id: str, _uid: str = Depends(require_auth_user_match)):
    """Delete all user data (RGPD Art. 17 - Right to erasure)."""
    # Remove profile
    _profiles.pop(user_id, None)
    # Remove usage
    _usage.pop(user_id, None)
    # Remove conversations
    _conversations.pop(user_id, None)
    # Remove from users
    to_remove = [email for email, u in _users.items() if u["user_id"] == user_id]
    for email in to_remove:
        del _users[email]
    # Remove from auto-ecole students
    for owner, students in _autoecole_students.items():
        if user_id in students:
            students.remove(user_id)
    # Supabase cleanup
    sb = get_supabase()
    if sb:
        try:
            sb.table("profiles").delete().eq("user_id", user_id).execute()
            sb.table("users").delete().eq("user_id", user_id).execute()
            sb.table("analytics").delete().eq("user_id", user_id).execute()
        except: pass
    return {"success": True, "message": "Toutes vos donnees ont ete supprimees."}

# PDF EXPORT (Student progress report)
@app.get("/export/pdf/{user_id}")
async def export_pdf(user_id: str, _uid: str = Depends(require_auth_user_match)):
    """Generate a PDF report of student progress."""
    if not HAS_PDF:
        raise HTTPException(503, "reportlab non installe")
    p = get_profile(user_id)
    rate = round(p["score_correct"] / max(p["score_total"], 1) * 100)
    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    # Header
    c.setFillColorRGB(0.04, 0.09, 0.16)
    c.rect(0, h - 100, w, 100, fill=1)
    c.setFillColorRGB(0.82, 0.92, 0.95)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, h - 50, "MA1 — Rapport de Progression")
    c.setFont("Helvetica", 12)
    c.drawString(40, h - 75, f"Eleve: {user_id} | Date: {date.today().isoformat()}")
    # Stats
    y = h - 140
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, "Statistiques generales")
    y -= 30
    c.setFont("Helvetica", 12)
    stats = [
        f"Niveau: {p.get('level', 'debutant')}",
        f"Taux de reussite: {rate}%",
        f"Questions repondues: {p['score_total']}",
        f"Reponses correctes: {p['score_correct']}",
        f"XP accumules: {p.get('xp', 0)}",
        f"Plan jour: {p.get('plan_day', 0)}/30",
    ]
    for s in stats:
        c.drawString(60, y, s)
        y -= 22
    # Theme scores
    y -= 20
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, "Scores par theme")
    y -= 25
    c.setFont("Helvetica", 11)
    for topic, scores in p.get("theme_scores", {}).items():
        t_rate = round(scores["correct"] / max(scores["total"], 1) * 100)
        status = "OK" if t_rate >= 75 else "A revoir" if t_rate >= 50 else "Faible"
        c.drawString(60, y, f"{topic}: {t_rate}% ({scores['correct']}/{scores['total']}) — {status}")
        y -= 18
        if y < 80:
            c.showPage()
            y = h - 60
    # Exam results
    exams = p.get("exam_results", [])
    if exams:
        y -= 20
        c.setFont("Helvetica-Bold", 16)
        c.drawString(40, y, "Examens blancs")
        y -= 25
        c.setFont("Helvetica", 11)
        for ex in exams[-10:]:
            passed = "REUSSI" if ex.get("passed") else "ECHEC"
            c.drawString(60, y, f"{ex.get('date','')}: {ex['correct']}/{ex['total']} ({ex['pct']}%) — {passed}")
            y -= 18
            if y < 80:
                c.showPage()
                y = h - 60
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(40, 30, "MA1 — Ton Assistant de la Route | Document genere automatiquement | ma1.app")
    c.drawString(40, 18, "Ce document est un outil pedagogique et ne constitue pas un certificat officiel.")
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=MA1_Rapport_{user_id}_{date.today().isoformat()}.pdf"
    })

# EMAIL: Send welcome email
async def send_welcome_email(email: str, name: str):
    if not HAS_EMAIL: return
    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [email],
            "subject": "Bienvenue sur MA1 — Ton Assistant du Code de la Route",
            "html": f"""
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1628;color:#d0eaf2;border-radius:16px">
                <h1 style="color:#7ec8e3;font-size:24px">Bienvenue {name or 'sur MA1'} !</h1>
                <p style="color:#a8dce8;line-height:1.6">Votre compte MA1 est cree. Commencez votre parcours de revision du Code de la Route des maintenant.</p>
                <a href="{os.getenv('APP_URL','https://ma1.app')}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3a9db0,#7ec8e3);color:#fff;border-radius:50px;text-decoration:none;font-weight:bold;margin:16px 0">Commencer mes revisions</a>
                <p style="font-size:12px;color:rgba(126,200,227,0.4);margin-top:24px">MA1 — Ton Assistant de la Route<br>Cet email a ete envoye suite a votre inscription.</p>
            </div>""",
        })
    except: pass

# EMAIL: Trial ending reminder
async def send_trial_reminder(email: str, name: str):
    if not HAS_EMAIL: return
    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [email],
            "subject": "Votre essai MA1 Premium se termine dans 48h",
            "html": f"""
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1628;color:#d0eaf2;border-radius:16px">
                <h1 style="color:#e8b84d;font-size:22px">Rappel : votre essai Premium se termine bientot</h1>
                <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
                <p style="color:#a8dce8;line-height:1.6">Votre periode d'essai gratuite de 7 jours se termine dans 48 heures. A l'issue, votre abonnement Premium sera active a 10€/mois.</p>
                <p style="color:#a8dce8;line-height:1.6">Si vous ne souhaitez pas continuer, vous pouvez annuler votre abonnement depuis votre compte avant la fin de la periode d'essai.</p>
                <p style="font-size:12px;color:rgba(126,200,227,0.4);margin-top:24px">Conformement a nos CGV, aucun prelevement ne sera effectue si vous annulez avant la fin de l'essai.</p>
            </div>""",
        })
    except: pass

# EMAIL: Streak reminder
async def send_streak_reminder(email: str, name: str, streak: int):
    if not HAS_EMAIL: return
    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [email],
            "subject": f"Ne cassez pas votre serie de {streak} jours !",
            "html": f"""
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0a1628;color:#d0eaf2;border-radius:16px">
                <h1 style="color:#ffa502;font-size:22px">🔥 Votre serie de {streak} jours est en danger !</h1>
                <p style="color:#a8dce8;line-height:1.6">Bonjour {name or ''},</p>
                <p style="color:#a8dce8;line-height:1.6">Vous n'avez pas revise aujourd'hui. Repondez a quelques questions pour maintenir votre serie !</p>
                <a href="{os.getenv('APP_URL','https://ma1.app')}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#3a9db0,#7ec8e3);color:#fff;border-radius:50px;text-decoration:none;font-weight:bold;margin:16px 0">Reviser maintenant</a>
            </div>""",
        })
    except: pass

# POSITIONING TEST
@app.post("/test/positionnement")
async def positionnement_test(user_id: str, answers: List[dict], _uid: str = Depends(require_auth_user_match)):
    """Analyze positioning test results and generate personalized 30-day plan."""
    p = get_profile(user_id)
    topic_scores = {}
    for a in answers:
        topic = a.get("topic", "mix")
        correct = a.get("correct", False)
        ts = topic_scores.setdefault(topic, {"correct": 0, "total": 0})
        ts["total"] += 1
        if correct: ts["correct"] += 1
    p["theme_scores"] = topic_scores
    # Determine weak topics
    weak = [t for t, v in topic_scores.items() if v["total"] >= 1 and v["correct"] / v["total"] < 0.5]
    strong = [t for t, v in topic_scores.items() if v["total"] >= 1 and v["correct"] / v["total"] >= 0.75]
    p["weak_topics"] = weak
    p["strong_topics"] = strong
    # Adjust level
    total_correct = sum(v["correct"] for v in topic_scores.values())
    total_q = sum(v["total"] for v in topic_scores.values())
    rate = total_correct / max(total_q, 1)
    if rate >= 0.75: p["level"] = "avance"
    elif rate >= 0.45: p["level"] = "intermediaire"
    else: p["level"] = "debutant"
    p["score_total"] = total_q
    p["score_correct"] = total_correct
    return {
        "level": p["level"],
        "weak_topics": weak,
        "strong_topics": strong,
        "success_rate": round(rate * 100),
        "recommendation": f"Concentrez-vous sur : {', '.join(weak) if weak else 'tous les themes'}"
    }

# HEALTH v6
@app.get("/health")
def health():
    col=get_chroma(); sb=get_supabase()
    return {"status":"ok","version":"8.0.0","claude":CLAUDE_MODEL,"rag":col is not None,
            "supabase":sb is not None,"stripe":bool(STRIPE_SECRET_KEY),
            "bcrypt":"bcrypt" in str(type(hash_pw)),"jwt":"pyjwt" in str(type(mk_token)),
            "rate_limiting":HAS_LIMITER,"pdf":HAS_PDF,"email":HAS_EMAIL,
            "api_key":bool(os.getenv("ANTHROPIC_API_KEY")),"ts":datetime.now(timezone.utc).isoformat()}

# ═══════════════ V6.1 — MISSING FEATURES ═══════════════

# LEADERBOARD
_referrals = {}  # user_id -> {code, referred: []}

@app.get("/leaderboard")
async def leaderboard(limit: int = 20):
    """Classement XP public — source Supabase (stable), fallback memoire. Aucune donnee perso."""
    limit = min(max(limit, 1), 100)
    if HAS_ADMIN_STACK:
        try:
            rows = reporting_svc.public_leaderboard(get_supabase(), limit=limit)
            if rows:
                print(f"[LEADERBOARD] refreshed count={len(rows)} (supabase)", flush=True)
                return {"leaderboard": rows, "total": len(rows), "source": "supabase"}
        except Exception as e:
            print(f"[LEADERBOARD] supabase warn: {e}")
    entries = []
    for uid, p in _profiles.items():
        name = uid
        for u in _users.values():
            if u["user_id"] == uid:
                name = u.get("name") or u.get("email", "").split("@")[0]
                break
        entries.append({
            "user_id": uid,
            "name": name,
            "xp": p.get("xp", 0),
            "level": p.get("level", "debutant"),
            "streak": p.get("streak_days", 0),
            "score_total": p.get("score_total", 0),
            "success_rate": round(p["score_correct"] / max(p["score_total"], 1) * 100),
        })
    entries.sort(key=lambda x: x["xp"], reverse=True)
    ranked = entries[:limit]
    for i, e in enumerate(ranked, start=1):
        e["rank"] = i
    return {"leaderboard": ranked, "total": len(entries), "source": "memory"}

# REFERRAL / PARRAINAGE
@app.get("/referral/{user_id}")
async def get_referral(user_id: str, _uid: str = Depends(require_auth_user_match)):
    """Get or create referral code."""
    if user_id not in _referrals:
        code = "MA1-" + uuid.uuid4().hex[:6].upper()
        _referrals[user_id] = {"code": code, "referred": []}
    ref = _referrals[user_id]
    return {"code": ref["code"], "referred_count": len(ref["referred"]),
            "url": f"{os.getenv('APP_URL', 'https://ma1.app')}/?ref={ref['code']}"}

@app.post("/referral/apply")
async def apply_referral(user_id: str, code: str, _uid: str = Depends(require_auth_user_match)):
    """Apply a referral code — both users get bonus XP."""
    # Find referrer
    referrer_id = None
    for uid, ref in _referrals.items():
        if ref["code"] == code.upper():
            referrer_id = uid
            break
    if not referrer_id:
        raise HTTPException(404, "Code de parrainage invalide")
    if referrer_id == user_id:
        raise HTTPException(400, "Vous ne pouvez pas utiliser votre propre code")
    if user_id in _referrals.get(referrer_id, {}).get("referred", []):
        raise HTTPException(400, "Code deja utilise")
    # Award XP
    _referrals[referrer_id]["referred"].append(user_id)
    get_profile(referrer_id)["xp"] = get_profile(referrer_id).get("xp", 0) + 50
    get_profile(user_id)["xp"] = get_profile(user_id).get("xp", 0) + 25
    # Give referrer 3 extra free questions
    u = get_usage(referrer_id)
    if u.get("plan") == "free":
        u["questions"] = max(0, u.get("questions", 0) - 3)
    return {"success": True, "referrer_bonus": 50, "user_bonus": 25}

# WHITE-LABEL CONFIG
_whitelabel = {}  # owner_id -> config

@app.get("/whitelabel/{owner_id}")
async def get_whitelabel(owner_id: str, _uid: str = Depends(require_auth_owner_match)):
    """Get white-label config for an auto-école."""
    return _whitelabel.get(owner_id, {
        "owner_id": owner_id,
        "logo_url": None,
        "school_name": None,
        "primary_color": "#3a9db0",
        "welcome_message": None,
    })

@app.post("/whitelabel/{owner_id}")
async def set_whitelabel(owner_id: str, request: Request, _uid: str = Depends(require_auth_owner_match)):
    """Set white-label config."""
    data = await request.json()
    config = _whitelabel.get(owner_id, {"owner_id": owner_id})
    for key in ["logo_url", "school_name", "primary_color", "welcome_message"]:
        if key in data:
            config[key] = data[key]
    _whitelabel[owner_id] = config
    return {"success": True, "config": config}

# DASHBOARD PDF EXPORT
@app.get("/dashboard/pdf/{owner_id}")
async def dashboard_pdf(owner_id: str, _uid: str = Depends(require_auth_owner_match)):
    """Export dashboard as PDF for auto-école."""
    if not HAS_PDF:
        raise HTTPException(503, "reportlab non installe")
    students = _autoecole_students.get(owner_id, [])
    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    # Header
    c.setFillColorRGB(0.04, 0.09, 0.16)
    c.rect(0, h - 90, w, 90, fill=1)
    c.setFillColorRGB(0.82, 0.92, 0.95)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, h - 45, "MA1 — Rapport Auto-Ecole")
    c.setFont("Helvetica", 11)
    c.drawString(40, h - 65, f"Date: {date.today().isoformat()} | Eleves: {len(students)}")
    y = h - 120
    c.setFillColorRGB(0, 0, 0)
    # Table header
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "Eleve")
    c.drawString(200, y, "Niveau")
    c.drawString(280, y, "Reussite")
    c.drawString(350, y, "Questions")
    c.drawString(430, y, "Readiness")
    c.drawString(500, y, "Statut")
    y -= 5
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.line(40, y, w - 40, y)
    y -= 18
    c.setFont("Helvetica", 10)
    for sid in students:
        p = get_profile(sid)
        rate = round(p["score_correct"] / max(p["score_total"], 1) * 100)
        exams = p.get("exam_results", [])
        best = max((e["pct"] for e in exams[-5:]), default=0) if exams else 0
        rdns = round(min(rate / 80, 1) * 40 + min(p["score_total"] / 200, 1) * 30 + min(best / 80, 1) * 30)
        name = sid
        for u in _users.values():
            if u["user_id"] == sid: name = u.get("name") or u.get("email", "").split("@")[0]; break
        c.drawString(40, y, name[:20])
        c.drawString(200, y, p.get("level", "?"))
        c.drawString(280, y, f"{rate}%")
        c.drawString(350, y, str(p["score_total"]))
        c.drawString(430, y, f"{rdns}%")
        c.drawString(500, y, "PRET" if rdns >= 75 else "En cours")
        y -= 16
        if y < 60:
            c.showPage()
            y = h - 60
    c.setFont("Helvetica", 7)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(40, 25, "MA1 — Document genere automatiquement | Ce rapport ne constitue pas un document officiel.")
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=MA1_Dashboard_{owner_id}_{date.today().isoformat()}.pdf"
    })

# CHALLENGE / DEFI ENTRE AMIS
_challenges = {}  # challenge_id -> {from, to, topic, scores}

@app.post("/challenge/create")
async def create_challenge(user_id: str, target_email: str, topic: str = "mix", _uid: str = Depends(require_auth_user_match)):
    """Create a challenge between two users."""
    target = _users.get(target_email.lower())
    if not target:
        raise HTTPException(404, "Utilisateur non trouve")
    cid = "ch_" + uuid.uuid4().hex[:8]
    _challenges[cid] = {
        "id": cid, "from": user_id, "to": target["user_id"],
        "topic": topic, "status": "pending",
        "scores": {user_id: None, target["user_id"]: None},
        "created": datetime.now(timezone.utc).isoformat(),
    }
    return {"challenge_id": cid, "status": "pending"}

@app.post("/challenge/{challenge_id}/submit")
async def submit_challenge(challenge_id: str, user_id: str, score: int, _uid: str = Depends(require_auth_user_match)):
    """Submit score for a challenge."""
    ch = _challenges.get(challenge_id)
    if not ch:
        raise HTTPException(404, "Defi non trouve")
    if user_id not in ch["scores"]:
        raise HTTPException(403, "Vous ne participez pas a ce defi")
    ch["scores"][user_id] = score
    # Check if both submitted
    if all(v is not None for v in ch["scores"].values()):
        ch["status"] = "complete"
        winner = max(ch["scores"], key=ch["scores"].get)
        ch["winner"] = winner
        get_profile(winner)["xp"] = get_profile(winner).get("xp", 0) + 30
    return {"challenge": ch}

@app.get("/challenge/list/{user_id}")
async def list_challenges(user_id: str, _uid: str = Depends(require_auth_user_match)):
    """List challenges for a user."""
    mine = [ch for ch in _challenges.values() if user_id in (ch["from"], ch["to"])]
    return {"challenges": sorted(mine, key=lambda x: x["created"], reverse=True)[:20]}


# ═══ V8.1 DASHBOARD ENHANCEMENTS ═══

# STUDENT STAGNATION ALERTS
@app.get("/dashboard/alerts/{owner_id}")
async def dashboard_alerts(owner_id: str, _uid: str = Depends(require_auth_owner_match)):
    """Get alerts for stagnant students (3+ days inactive)."""
    from scheduler import check_stagnant_students
    stagnant = await check_stagnant_students(_profiles, _autoecole_students)
    owner_alerts = [s for s in stagnant if s["owner_id"] == owner_id]
    return {"alerts": owner_alerts, "count": len(owner_alerts)}

# MONITOR NOTES
_monitor_notes: dict[str, list] = {}  # student_id -> [{note, date, author}]

@app.post("/dashboard/note")
async def add_note(owner_id: str, student_id: str, note: str, _uid: str = Depends(require_auth_owner_match)):
    """Add a monitor note for a student."""
    from datetime import date
    notes = _monitor_notes.setdefault(student_id, [])
    notes.append({"note": note, "date": date.today().isoformat(), "author": owner_id})
    if len(notes) > 100: _monitor_notes[student_id] = notes[-100:]
    return {"success": True, "notes": notes}

@app.get("/dashboard/notes/{student_id}")
async def get_notes(student_id: str, _uid: str = Depends(require_auth)):
    # [Sprint Étape 2] Lecture autorisée si : élève lui-même OU owner d'une auto-école qui inclut l'élève OU admin.
    if _uid == student_id:
        return {"notes": _monitor_notes.get(student_id, [])}
    is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
    if is_admin:
        return {"notes": _monitor_notes.get(student_id, [])}
    # Owner ?
    for owner_id, students in _autoecole_students.items():
        if owner_id == _uid and student_id in students:
            return {"notes": _monitor_notes.get(student_id, [])}
    raise HTTPException(403, "Vous n'êtes pas autorisé à consulter ces notes.")

# GROUPS / PROMOTIONS
_groups: dict[str, dict] = {}  # group_id -> {name, owner, students[], created}

@app.post("/dashboard/group")
async def create_group(owner_id: str, name: str, _uid: str = Depends(require_auth_owner_match)):
    """Create a student group/promotion."""
    gid = "g_" + __import__("uuid").uuid4().hex[:8]
    _groups[gid] = {"id": gid, "name": name, "owner": owner_id, "students": [], "created": __import__("datetime").date.today().isoformat()}
    return {"success": True, "group": _groups[gid]}

@app.post("/dashboard/group/{group_id}/add")
async def add_to_group(group_id: str, student_id: str, _uid: str = Depends(require_auth)):
    g = _groups.get(group_id)
    if not g: raise HTTPException(404, "Groupe non trouve")
    # [Sprint Étape 2] Seul le propriétaire du groupe (owner) peut y ajouter un élève.
    if g.get("owner") != _uid:
        is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
        if not is_admin:
            raise HTTPException(403, "Ce groupe ne vous appartient pas.")
    if student_id not in g["students"]: g["students"].append(student_id)
    return {"success": True, "group": g}

@app.get("/dashboard/groups/{owner_id}")
async def list_groups(owner_id: str, _uid: str = Depends(require_auth_owner_match)):
    owner_groups = [g for g in _groups.values() if g["owner"] == owner_id]
    return {"groups": owner_groups}

# PUSH SUBSCRIPTION
@app.post("/push/subscribe")
async def push_subscribe(user_id: str, request: Request, _uid: str = Depends(require_auth_user_match)):
    """Save push notification subscription."""
    try:
        from push import save_subscription
        sub = await request.json()
        save_subscription(user_id, sub)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# DAILY CRON
@app.post("/cron/daily")
async def cron_daily(_admin: str = Depends(require_admin)):
    """Run all daily tasks. Call via external cron or Supabase Edge Function. [Sprint Étape 2] admin-only."""
    try:
        from scheduler import run_daily
        from email_sequences import check_sequences
        from push import send_push
        push_fn = send_push if HAS_EMAIL else None
        results = await run_daily(
            _users, _profiles, _autoecole_students,
            send_trial_fn=send_trial_reminder if HAS_EMAIL else (lambda *a: None),
            send_streak_fn=send_streak_reminder if HAS_EMAIL else (lambda *a: None),
            send_push_fn=push_fn,
        )
        results["email_sequences"] = await check_sequences(_users)
        return {"results": results}
    except Exception as e:
        return {"error": str(e), "ts": __import__("time").time()}


# ═══ PUBLIC API (Third-party access) ═══

API_KEYS = {}  # api_key -> {owner, plan, rate_limit, created}

@app.post("/api/v1/keys/create")
async def create_api_key(owner_id: str, plan: str = "basic", _uid: str = Depends(require_auth)):
    """Create an API key for third-party access. [Sprint Étape 2] Auth + match owner."""
    if _uid != owner_id:
        is_admin = any(u.get("user_id") == _uid and u.get("email", "").lower() in ADMIN_EMAILS for u in _users.values())
        if not is_admin:
            raise HTTPException(403, "owner_id ne correspond pas à votre compte.")
    import secrets
    key = "ma1_" + secrets.token_hex(24)
    API_KEYS[key] = {
        "owner": owner_id, "plan": plan,
        "rate_limit": 100 if plan == "basic" else 1000,
        "calls_today": 0, "created": __import__("datetime").date.today().isoformat(),
    }
    return {"api_key": key, "plan": plan, "rate_limit": API_KEYS[key]["rate_limit"]}

def validate_api_key(key: str) -> dict:
    info = API_KEYS.get(key)
    if not info:
        raise HTTPException(401, "Cle API invalide. Obtenez une cle sur ma1.app/api-docs")
    today = __import__("datetime").date.today().isoformat()
    if info.get("_date") != today:
        info["calls_today"] = 0
        info["_date"] = today
    if info["calls_today"] >= info["rate_limit"]:
        raise HTTPException(429, f"Rate limit atteint ({info['rate_limit']}/jour)")
    info["calls_today"] += 1
    return info

@app.post("/api/v1/qcm")
async def public_qcm(api_key: str, topic: str = "vitesse", n: int = 5, difficulty: str = "moyen"):
    """Public API: Generate QCM questions.
    
    Args:
        api_key: Your MA1 API key
        topic: vitesse|signalisation|priorite|alcool|permis|autoroute|stationnement|securite|premiers_secours
        n: Number of questions (1-10)
        difficulty: facile|moyen|difficile
    """
    info = validate_api_key(api_key)
    n = min(max(n, 1), 10)
    # Use cache if available
    if HAS_CACHE:
        cached = qcm_cache.get(topic, difficulty, n)
        if cached:
            return {"questions": cached[:n], "source": "cached", "remaining": info["rate_limit"] - info["calls_today"]}
    # Generate
    dn = {"facile": "Questions simples.", "moyen": "Niveau examen.", "difficile": "Questions pointues."}.get(difficulty, "")
    prompt = QCM_PROMPT.format(n=n, topic=topic, difficulty=difficulty, diff_note=dn)
    client = get_claude()
    resp = client.messages.create(model=get_model("qcm_generate"), max_tokens=3000, messages=[{"role": "user", "content": prompt}])
    raw = resp.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    questions = json.loads(raw)
    if HAS_CACHE:
        qcm_cache.put(topic, difficulty, n, questions)
    return {"questions": questions[:n], "source": "generated", "remaining": info["rate_limit"] - info["calls_today"]}

@app.post("/api/v1/chat")
async def public_chat(api_key: str, message: str, user_id: str = "api_user"):
    """Public API: Chat with MA1 about French driving code.
    
    Args:
        api_key: Your MA1 API key
        message: Your question about the French driving code
    """
    info = validate_api_key(api_key)
    context_text, sources = retrieve_context(message, n=3)
    enriched = (f"{message}\n\n<contexte>\n{context_text}\n</contexte>" if context_text else message)
    client = get_claude()
    resp = client.messages.create(model=get_model("chat"), max_tokens=800, system=SYSTEM_PROMPT, messages=[{"role": "user", "content": enriched}])
    answer = resp.content[0].text
    return {"answer": answer, "sources": sources, "remaining": info["rate_limit"] - info["calls_today"]}

@app.get("/api/v1/topics")
async def public_topics():
    """Public API: List available QCM topics."""
    return {"topics": [
        {"id": "vitesse", "label": "Limitations de vitesse"},
        {"id": "signalisation", "label": "Signalisation"},
        {"id": "priorite", "label": "Priorites"},
        {"id": "alcool", "label": "Alcool & drogues"},
        {"id": "permis", "label": "Permis probatoire"},
        {"id": "autoroute", "label": "Autoroute"},
        {"id": "stationnement", "label": "Stationnement"},
        {"id": "securite", "label": "Securite passive"},
        {"id": "premiers_secours", "label": "Premiers secours"},
    ]}

@app.get("/api/v1/docs")
async def public_api_docs():
    """Public API documentation."""
    return {
        "name": "MA1 Public API",
        "version": "1.0",
        "base_url": "https://api.ma1.app/api/v1",
        "auth": "API key required in 'api_key' parameter",
        "get_key": "POST /api/v1/keys/create with owner_id",
        "rate_limits": {"basic": "100 calls/day", "pro": "1000 calls/day"},
        "endpoints": [
            {"method": "POST", "path": "/api/v1/qcm", "desc": "Generate QCM questions", "params": "topic, n, difficulty"},
            {"method": "POST", "path": "/api/v1/chat", "desc": "Chat about French driving code", "params": "message"},
            {"method": "GET", "path": "/api/v1/topics", "desc": "List available topics"},
            {"method": "GET", "path": "/api/v1/docs", "desc": "This documentation"},
        ],
        "pricing": {"basic": "Gratuit (100 calls/jour)", "pro": "Sur devis (1000+ calls/jour)"},
    }


# ═══════════════════════════════════════════════════════════════════════════
# [Sprint Admin/Emails/Support] — Admin auth, support, presence, reporting
# ═══════════════════════════════════════════════════════════════════════════

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminForgotRequest(BaseModel):
    email: str

class AdminResetRequest(BaseModel):
    token: str
    new_password: str

class SupportThreadCreateRequest(BaseModel):
    subject: str
    category: Optional[str] = "autre"
    message: str

class SupportReplyRequest(BaseModel):
    message: str

class PresenceHeartbeatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = ""
    current_module: Optional[str] = ""

class XPEventRequest(BaseModel):
    type: str
    meta: Optional[dict] = None


# ── ADMIN AUTH ─────────────────────────────────────────────────────────────

@app.post("/admin/auth/login")
async def admin_auth_login(req: AdminLoginRequest, request: Request):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Stack admin non disponible")
    sb = get_supabase()
    admin = admin_auth_mod.authenticate_admin(sb, req.email, req.password)
    # Log tentative (succès / échec)
    try:
        if sb is not None:
            sb.table("login_events").insert({
                "user_id": admin["id"] if admin else "unknown",
                "email": (req.email or "").lower(),
                "event": "admin_login" if admin else "admin_login_failed",
            }).execute()
    except Exception: pass
    if not admin:
        raise HTTPException(401, "Email ou mot de passe incorrect")
    token = mk_token(admin["id"])
    return {"success": True, "token": token, "admin": {"id": admin["id"], "email": admin["email"], "display_name": admin.get("display_name", "")}}


@app.post("/admin/auth/forgot-password")
async def admin_auth_forgot(req: AdminForgotRequest, request: Request):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Stack admin non disponible")
    sb = get_supabase()
    ip = request.client.host if request.client else ""
    import hashlib as _h
    ip_hash = _h.sha256(ip.encode()).hexdigest()[:16] if ip else ""
    raw_token = admin_auth_mod.create_password_reset(sb, req.email, ip_hash)
    # Réponse identique (succès ou pas) pour éviter l'enumération
    if raw_token:
        try:
            reset_url = f"{os.getenv('FRONTEND_URL', 'https://ma1.fr').rstrip('/')}/admin/reset-password?token={raw_token}"
            tpl = tpl_admin_reset(reset_url, expiry_minutes=admin_auth_mod.ADMIN_RESET_TOKEN_EXPIRY_MIN)
            send_email(template="admin_password_reset", to_email=admin_auth_mod.ADMIN_EMAIL,
                       subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                       supabase=sb, force=True)
        except Exception as e:
            print(f"[admin_forgot] envoi email échec: {e}")
    return {"success": True, "message": "Si l'email correspond à un admin, un message a été envoyé."}


@app.post("/admin/auth/reset-password")
async def admin_auth_reset(req: AdminResetRequest):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Stack admin non disponible")
    if not req.new_password or len(req.new_password) < 8:
        raise HTTPException(400, "Mot de passe trop court (8 caractères minimum)")
    ok = admin_auth_mod.consume_password_reset(get_supabase(), req.token, req.new_password)
    if not ok:
        raise HTTPException(400, "Token invalide ou expiré")
    return {"success": True, "message": "Mot de passe mis à jour."}


@app.get("/admin/auth/me")
async def admin_auth_me(_admin: str = Depends(require_admin)):
    return {"success": True, "admin_id": _admin}


@app.post("/admin/auth/logout")
async def admin_auth_logout(_admin: str = Depends(require_admin)):
    # JWT stateless : la déconnexion réelle se fait côté client (oublier le token).
    return {"success": True}


# ── ADMIN DASHBOARD / REPORTING ────────────────────────────────────────────

@app.get("/admin/kpis")
async def admin_kpis(_admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"error": "stack admin indisponible"}
    sb = get_supabase()
    online = presence_svc.count_online_now(sb)
    sc = support_svc.support_counts_admin(sb)
    # [Fix Admin realtime] KPIs étendus avec new_today/new_week/best_xp/avg_success_rate
    k = reporting_svc.compute_kpis_extended(sb, presence_count=online, support_counts=sc)
    print(f"[ADMIN] kpis loaded users={k.get('total_users')} online={k.get('online_now')} new_today={k.get('new_today')}", flush=True)
    return k


@app.get("/admin/users")
async def admin_list_users(search: str = "", filter: str = "all",
                            sort: str = "recent", limit: int = 100,
                            _admin: str = Depends(require_admin)):
    """[Fix Admin realtime] Liste utilisateurs avec recherche/filtres/tri."""
    if not HAS_ADMIN_STACK:
        return {"users": [], "total": 0}
    users = reporting_svc.list_users(get_supabase(), search=search, filter_kind=filter,
                                     sort=sort, limit=min(max(limit, 1), 500))
    active = sum(1 for u in users if u.get("is_active"))
    print(f"[ADMIN] users count={len(users)} active={active} filter={filter} sort={sort}", flush=True)
    return {"users": users, "total": len(users), "active_count": active}


@app.get("/admin/activity")
async def admin_activity(limit: int = 50, _admin: str = Depends(require_admin)):
    """[Fix Admin realtime] Activité récente (auth events + analytics)."""
    if not HAS_ADMIN_STACK:
        return {"activity": []}
    events = reporting_svc.recent_activity(get_supabase(), limit=min(max(limit, 1), 200))
    return {"activity": events}


@app.get("/admin/recent-signups")
async def admin_recent_signups(limit: int = 20, _admin: str = Depends(require_admin)):
    """[Fix Admin realtime] Comptes créés récents."""
    if not HAS_ADMIN_STACK:
        return {"signups": []}
    return {"signups": reporting_svc.recent_signups(get_supabase(), limit=min(max(limit, 1), 100))}


@app.get("/admin/recent-errors")
async def admin_recent_errors(limit: int = 20, _admin: str = Depends(require_admin)):
    """[Fix Admin realtime] Dernières réponses QCM incorrectes."""
    if not HAS_ADMIN_STACK:
        return {"errors": []}
    return {"errors": reporting_svc.recent_qcm_errors(get_supabase(), limit=min(max(limit, 1), 100))}


@app.get("/admin/leaderboard")
async def admin_leaderboard(limit: int = 20, _admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"leaderboard": [], "total": 0}
    return {"leaderboard": reporting_svc.leaderboard(get_supabase(), limit=min(max(limit, 1), 100))}


@app.get("/admin/theme-stats")
async def admin_theme_stats(_admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"themes": []}
    return {"themes": reporting_svc.theme_stats(get_supabase())}


@app.get("/admin/realtime")
async def admin_realtime(_admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"online_now": 0, "recent_active": []}
    sb = get_supabase()
    online = presence_svc.count_online_now(sb)
    recent = presence_svc.list_recent_active(sb, limit=20)
    print(f"[ADMIN] active users count={online}", flush=True)
    return {"online_now": online, "recent_active": recent}


@app.get("/admin/weekly-summary")
async def admin_weekly_summary(_admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"error": "stack admin indisponible"}
    return reporting_svc.weekly_summary(get_supabase())


# ── ESPACE JOUEUR — Utilisateur connecté ───────────────────────────────────

def _user_identity(uid: str) -> dict:
    for u in _users.values():
        if u.get("user_id") == uid:
            return {"email": u.get("email", ""), "name": u.get("name", "")}
    sb = get_supabase()
    if sb is not None:
        try:
            r = sb.table("users").select("email,name").eq("user_id", uid).single().execute()
            d = getattr(r, "data", None) or {}
            return {"email": d.get("email", ""), "name": d.get("name", "")}
        except Exception:
            pass
    return {"email": "", "name": ""}


@app.get("/user/me")
async def user_me(_uid: str = Depends(require_auth)):
    ident = _user_identity(_uid)
    if HAS_ADMIN_STACK:
        sb = get_supabase()
        stats = reporting_svc.user_stats(sb, _uid)
        rank = reporting_svc.user_rank(sb, _uid)
    else:
        stats, rank = {}, {"rank": None, "total_players": 0}
    if not stats:
        p = get_profile(_uid)
        stats = {
            "level": p.get("level", "debutant"), "xp": p.get("xp", 0),
            "score_total": p.get("score_total", 0), "score_correct": p.get("score_correct", 0),
            "success_rate": round(p["score_correct"]/max(p["score_total"],1)*100),
            "streak_days": p.get("streak_days", 0),
            "qcm_count": p.get("score_total", 0), "exam_count": len(p.get("exam_results", [])),
            "weak_topics": p.get("weak_topics", []), "strong_topics": p.get("strong_topics", []),
            "themes": [],
        }
    return {"user_id": _uid, "name": ident["name"], "stats": stats, "rank": rank}


@app.get("/user/stats")
async def user_stats_ep(_uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {}
    return reporting_svc.user_stats(get_supabase(), _uid)


@app.get("/user/rank")
async def user_rank_ep(_uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"rank": None, "total_players": 0}
    return reporting_svc.user_rank(get_supabase(), _uid)


@app.get("/user/theme-stats")
async def user_theme_stats_ep(_uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"themes": []}
    return {"themes": reporting_svc.user_theme_stats(get_supabase(), _uid)}


@app.get("/user/activity")
async def user_activity_ep(limit: int = 20, _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"events": []}
    return {"events": xp_svc.list_events(get_supabase(), _uid, limit=min(max(limit, 1), 100))}


@app.get("/user/xp-events")
async def user_xp_events_ep(limit: int = 30, _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"events": []}
    return {"events": xp_svc.list_events(get_supabase(), _uid, limit=min(max(limit, 1), 100))}


_CLIENT_XP_TYPES = {"assistant_useful"}


@app.post("/xp/event")
async def xp_event_ep(req: XPEventRequest, _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"awarded": 0, "reason": "service indisponible"}
    if req.type not in _CLIENT_XP_TYPES:
        raise HTTPException(400, "Type XP non autorisé via cette route.")
    awarded = xp_svc.award_xp(get_supabase(), user_id=_uid, type_=req.type, meta=req.meta or {})
    return {"awarded": awarded, "type": req.type}


# ── SUPPORT — Utilisateur ──────────────────────────────────────────────────

@app.post("/support/threads")
async def support_create_thread(req: SupportThreadCreateRequest, _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Service support indisponible")
    if not (req.message or "").strip():
        raise HTTPException(400, "Le message ne peut pas être vide.")
    # Récupère l'email de l'appelant depuis _users
    user_email = ""
    user_name = ""
    for u in _users.values():
        if u.get("user_id") == _uid:
            user_email = u.get("email", "")
            user_name = u.get("name", "")
            break
    sb = get_supabase()
    out = support_svc.create_thread(
        sb, user_id=_uid, user_email=user_email,
        subject=req.subject, category=req.category or "autre", message=req.message,
    )
    if not out:
        raise HTTPException(500, "Création du thread échouée (Supabase indisponible ?).")
    # Email admin (notification)
    try:
        tpl = tpl_admin_new_support(user_name, user_email, req.subject, req.message, req.category or "autre")
        send_email(template="admin_new_support_message",
                   to_email=admin_auth_mod.ADMIN_EMAIL,
                   subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                   user_id=_uid, supabase=sb, force=True)
    except Exception as e:
        print(f"[support] admin notif failed: {e}")
    # Email utilisateur (confirmation)
    if user_email:
        try:
            tpl = tpl_support_received(user_name, req.subject)
            send_email(template="support_message_received", to_email=user_email,
                       subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                       user_id=_uid, supabase=sb)
        except Exception as e:
            print(f"[support] user confirm failed: {e}")
    return out


@app.get("/support/threads")
async def support_list_threads(_uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"threads": []}
    return {"threads": support_svc.list_threads_for_user(get_supabase(), _uid)}


@app.get("/support/threads/{thread_id}")
async def support_get_thread(thread_id: str, _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Service support indisponible")
    out = support_svc.get_thread_with_messages(get_supabase(), thread_id)
    if not out:
        raise HTTPException(404, "Thread introuvable")
    if out["thread"].get("user_id") != _uid:
        # Sauf admin
        try:
            if not admin_auth_mod.is_admin_user_id(get_supabase(), _uid):
                raise HTTPException(403, "Ce thread ne vous appartient pas.")
        except HTTPException: raise
        except Exception:
            raise HTTPException(403, "Ce thread ne vous appartient pas.")
    support_svc.mark_thread_read_for_user(get_supabase(), thread_id, _uid)
    return out


# ── SUPPORT — Admin ────────────────────────────────────────────────────────

@app.get("/admin/messages")
async def admin_list_messages(status: Optional[str] = None, _admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        return {"threads": [], "counts": {}}
    sb = get_supabase()
    return {
        "threads": support_svc.list_threads_admin(sb, status_filter=status),
        "counts": support_svc.support_counts_admin(sb),
    }


@app.get("/admin/messages/{thread_id}")
async def admin_get_thread(thread_id: str, _admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Service support indisponible")
    out = support_svc.get_thread_with_messages(get_supabase(), thread_id)
    if not out:
        raise HTTPException(404, "Thread introuvable")
    return out


@app.post("/admin/messages/{thread_id}/reply")
async def admin_reply_thread(thread_id: str, req: SupportReplyRequest, _admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Service support indisponible")
    if not (req.message or "").strip():
        raise HTTPException(400, "La réponse ne peut pas être vide.")
    sb = get_supabase()
    out = support_svc.reply_admin(sb, thread_id, _admin, req.message)
    if not out:
        raise HTTPException(500, "Envoi de la réponse échoué.")
    # Notifier l'utilisateur par email
    th = out.get("thread") or {}
    user_email = th.get("user_email", "")
    if user_email:
        try:
            tpl = tpl_support_reply(th.get("user_id", ""), th.get("subject", ""), req.message)
            send_email(template="support_reply_user", to_email=user_email,
                       subject=tpl["subject"], html=tpl["html"], text=tpl["text"],
                       user_id=th.get("user_id", ""), supabase=sb, force=True)
        except Exception as e:
            print(f"[support] reply notif failed: {e}")
    return out


@app.post("/admin/messages/{thread_id}/close")
async def admin_close_thread(thread_id: str, _admin: str = Depends(require_admin)):
    if not HAS_ADMIN_STACK:
        raise HTTPException(503, "Service support indisponible")
    ok = support_svc.close_thread(get_supabase(), thread_id)
    if not ok:
        raise HTTPException(500, "Fermeture échouée.")
    return {"success": True}


# ── PRESENCE — Heartbeat client ────────────────────────────────────────────

@app.post("/presence/heartbeat")
async def presence_heartbeat(req: PresenceHeartbeatRequest, request: Request,
                              _uid: str = Depends(require_auth)):
    if not HAS_ADMIN_STACK:
        return {"recorded": False, "reason": "service indisponible"}
    if req.user_id != _uid:
        # Bypass admin
        try:
            if not admin_auth_mod.is_admin_user_id(get_supabase(), _uid):
                raise HTTPException(403, "user_id ne correspond pas à votre compte.")
        except HTTPException: raise
        except Exception:
            raise HTTPException(403, "user_id ne correspond pas à votre compte.")
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")
    module = (req.current_module or "")[:32]
    ok = presence_svc.record_heartbeat(get_supabase(), user_id=req.user_id,
                                       session_id=req.session_id or "", user_agent=ua, ip=ip,
                                       current_module=module)
    # Log discret (sans email/IP pour éviter PII)
    print(f"[PRESENCE] heartbeat user_id={req.user_id[:12]}... module={module or '-'} ok={ok}", flush=True)
    return {"recorded": ok, "ts": datetime.now(timezone.utc).isoformat()}

