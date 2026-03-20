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
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Security: bcrypt + JWT
try:
    import bcrypt
    def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    def check_pw(pw, hashed): return bcrypt.checkpw(pw.encode(), hashed.encode())
except ImportError:
    import hashlib
    def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()
    def check_pw(pw, hashed): return hashlib.sha256(pw.encode()).hexdigest() == hashed

try:
    import jwt as pyjwt
    JWT_SECRET = os.getenv("JWT_SECRET", "ma1-dev-secret-change-in-production-min32chars!")
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
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

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
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
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

if PUBLIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")

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
        print("[OK Supabase] Connecte")
        return _supabase
    except Exception as e:
        print(f"[WARN Supabase] {e}")
        return None

async def sb_upsert_profile(uid, profile):
    sb = get_supabase()
    if sb:
        try: sb.table("profiles").upsert({"user_id": uid, **profile}).execute()
        except: pass

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
        try: sb.table("users").insert({"user_id":uid,"email":email,"name":req.name,"plan":"free"}).execute()
        except: pass
    await sb_track({"user_id":uid,"event":"register","ts":time.time()})
    # Send welcome email
    if HAS_EMAIL:
        try: await send_welcome_email(email, req.name)
        except: pass
    return {"success":True,"user_id":uid,"token":token,"name":req.name,"plan":"free"}

@app.post("/auth/login")
async def auth_login(req:AuthLoginRequest):
    email=req.email.lower().strip()
    user=_users.get(email)
    if not user or not check_pw(req.password, user["pw_hash"]): raise HTTPException(401,"Email ou mot de passe incorrect")
    token=mk_token(user["user_id"]); user["token"]=token
    await sb_track({"user_id":user["user_id"],"event":"login","ts":time.time()})
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
async def qcm_result(req:QCMResultRequest):
    update_profile(req.user_id,req.topic,req.correct)
    p=get_profile(req.user_id)
    await sb_upsert_profile(req.user_id,p)
    return {"profile":p}

# EXAM
@app.post("/exam/result")
async def exam_result(req:ExamResultRequest):
    p=get_profile(req.user_id)
    r={"date":date.today().isoformat(),"correct":req.correct,"total":req.total,"pct":round(req.correct/max(req.total,1)*100),"passed":req.correct>=32,"time_s":req.time_seconds}
    p.setdefault("exam_results",[]).append(r)
    if len(p["exam_results"])>50: p["exam_results"]=p["exam_results"][-50:]
    await sb_upsert_profile(req.user_id,p)
    await sb_track({"user_id":req.user_id,"event":"exam","data":r,"ts":time.time()})
    return {"profile":p,"result":r}

# 30 DAY PLAN
@app.get("/plan/30days")
def get_30day_plan(): return {"plan":REVISION_PLAN,"total_days":30}

@app.post("/plan/progress")
async def update_plan_progress(user_id:str,day:int):
    p=get_profile(user_id); p["plan_day"]=max(p.get("plan_day",0),day)
    if not p.get("plan_started"): p["plan_started"]=date.today().isoformat()
    await sb_upsert_profile(user_id,p)
    return {"plan_day":p["plan_day"]}

@app.get("/profile/{user_id}")
def get_user_profile(user_id:str): return get_profile(user_id)

# READINESS
@app.get("/readiness/{user_id}")
def get_readiness(user_id:str):
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
def upgrade_plan(req:PlanRequest):
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
def get_user_usage(user_id:str): return get_usage(user_id)

# DASHBOARD MONITEUR
@app.get("/dashboard/{owner_id}")
async def dashboard(owner_id:str):
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
async def add_student(req:DashStudentAdd):
    students=_autoecole_students.setdefault(req.owner_id,[])
    user=_users.get(req.student_email.lower())
    if not user: raise HTTPException(404,"Eleve non trouve")
    sid=user["user_id"]
    if sid not in students: students.append(sid)
    return {"success":True,"student_id":sid,"total":len(students)}

# ANALYTICS
@app.post("/analytics/event")
async def track_event(req:AnalyticsEvent):
    await sb_track({"user_id":req.user_id,"event":req.event,"data":req.data,"ts":time.time(),"date":date.today().isoformat()})
    return {"tracked":True}

@app.get("/analytics/summary")
async def analytics_summary(days:int=7):
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
async def rgpd_export(user_id: str):
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
async def rgpd_delete(user_id: str):
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
async def export_pdf(user_id: str):
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
async def positionnement_test(user_id: str, answers: List[dict]):
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
    """Global XP leaderboard."""
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
    return {"leaderboard": entries[:limit], "total": len(entries)}

# REFERRAL / PARRAINAGE
@app.get("/referral/{user_id}")
async def get_referral(user_id: str):
    """Get or create referral code."""
    if user_id not in _referrals:
        code = "MA1-" + uuid.uuid4().hex[:6].upper()
        _referrals[user_id] = {"code": code, "referred": []}
    ref = _referrals[user_id]
    return {"code": ref["code"], "referred_count": len(ref["referred"]),
            "url": f"{os.getenv('APP_URL', 'https://ma1.app')}/?ref={ref['code']}"}

@app.post("/referral/apply")
async def apply_referral(user_id: str, code: str):
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
async def get_whitelabel(owner_id: str):
    """Get white-label config for an auto-école."""
    return _whitelabel.get(owner_id, {
        "owner_id": owner_id,
        "logo_url": None,
        "school_name": None,
        "primary_color": "#3a9db0",
        "welcome_message": None,
    })

@app.post("/whitelabel/{owner_id}")
async def set_whitelabel(owner_id: str, request: Request):
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
async def dashboard_pdf(owner_id: str):
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
async def create_challenge(user_id: str, target_email: str, topic: str = "mix"):
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
async def submit_challenge(challenge_id: str, user_id: str, score: int):
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
async def list_challenges(user_id: str):
    """List challenges for a user."""
    mine = [ch for ch in _challenges.values() if user_id in (ch["from"], ch["to"])]
    return {"challenges": sorted(mine, key=lambda x: x["created"], reverse=True)[:20]}


# ═══ V8.1 DASHBOARD ENHANCEMENTS ═══

# STUDENT STAGNATION ALERTS
@app.get("/dashboard/alerts/{owner_id}")
async def dashboard_alerts(owner_id: str):
    """Get alerts for stagnant students (3+ days inactive)."""
    from scheduler import check_stagnant_students
    stagnant = await check_stagnant_students(_profiles, _autoecole_students)
    owner_alerts = [s for s in stagnant if s["owner_id"] == owner_id]
    return {"alerts": owner_alerts, "count": len(owner_alerts)}

# MONITOR NOTES
_monitor_notes: dict[str, list] = {}  # student_id -> [{note, date, author}]

@app.post("/dashboard/note")
async def add_note(owner_id: str, student_id: str, note: str):
    """Add a monitor note for a student."""
    from datetime import date
    notes = _monitor_notes.setdefault(student_id, [])
    notes.append({"note": note, "date": date.today().isoformat(), "author": owner_id})
    if len(notes) > 100: _monitor_notes[student_id] = notes[-100:]
    return {"success": True, "notes": notes}

@app.get("/dashboard/notes/{student_id}")
async def get_notes(student_id: str):
    return {"notes": _monitor_notes.get(student_id, [])}

# GROUPS / PROMOTIONS
_groups: dict[str, dict] = {}  # group_id -> {name, owner, students[], created}

@app.post("/dashboard/group")
async def create_group(owner_id: str, name: str):
    """Create a student group/promotion."""
    gid = "g_" + __import__("uuid").uuid4().hex[:8]
    _groups[gid] = {"id": gid, "name": name, "owner": owner_id, "students": [], "created": __import__("datetime").date.today().isoformat()}
    return {"success": True, "group": _groups[gid]}

@app.post("/dashboard/group/{group_id}/add")
async def add_to_group(group_id: str, student_id: str):
    g = _groups.get(group_id)
    if not g: raise HTTPException(404, "Groupe non trouve")
    if student_id not in g["students"]: g["students"].append(student_id)
    return {"success": True, "group": g}

@app.get("/dashboard/groups/{owner_id}")
async def list_groups(owner_id: str):
    owner_groups = [g for g in _groups.values() if g["owner"] == owner_id]
    return {"groups": owner_groups}

# PUSH SUBSCRIPTION
@app.post("/push/subscribe")
async def push_subscribe(user_id: str, request: Request):
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
async def cron_daily():
    """Run all daily tasks. Call via external cron or Supabase Edge Function."""
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
async def create_api_key(owner_id: str, plan: str = "basic"):
    """Create an API key for third-party access."""
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
