-- ════════════════════════════════════════════════════════════════════════════
-- MA1 — Bootstrap minimal pour le Jeu Concours Bêta (29 juin → 17 juillet 2026)
-- ════════════════════════════════════════════════════════════════════════════
-- À jouer UNE FOIS dans le SQL Editor de Supabase (projet daqrwjdmokqnppqtwnbi).
-- Tout est idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) — peut être rejoué sans danger.
--
-- Ce script crée tout le minimum vital pour :
--   - Faire fonctionner l'admin (table admin_users + admin_password_resets)
--   - Suivre les inscriptions en temps réel (table users + login_events)
--   - Suivre la présence (table user_sessions)
--   - Logger les emails Resend (table email_logs)
--   - Calculer les KPIs concours et le leaderboard (tables users + profiles + qcm_attempts)
--
-- Ne crée PAS le support messaging ni le RAG — pas nécessaire pour le concours.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. USERS (étendue avec colonnes utiles concours) ──────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  password_hash TEXT,
  plan TEXT DEFAULT 'free',
  birth_year INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- ── 2. PROFILES (XP, niveau, scores — pour leaderboard) ────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  level TEXT DEFAULT 'debutant',
  score_total INT DEFAULT 0,
  score_correct INT DEFAULT 0,
  weak_topics JSONB DEFAULT '[]',
  strong_topics JSONB DEFAULT '[]',
  theme_scores JSONB DEFAULT '{}',
  plan_day INT DEFAULT 0,
  exam_results JSONB DEFAULT '[]',
  xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_seen DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- ── 3. ADMIN (auth + reset password) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_resets_token ON admin_password_resets(token_hash);

-- ── 4. PRÉSENCE (utilisateurs connectés temps réel) ────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON user_sessions(last_seen_at DESC);

-- ── 5. LOGS EMAILS (Resend audit trail) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  from_email TEXT,
  reply_to TEXT,
  subject TEXT,
  status TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  error TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template, created_at DESC);

-- ── 6. LOGIN EVENTS (suivi register/login/admin_login) ─────────────────────
CREATE TABLE IF NOT EXISTS login_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  event TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(event, created_at DESC);

-- ── 7. QCM ATTEMPTS (pour theme-stats — optionnel à brancher Sprint suivant) ──
CREATE TABLE IF NOT EXISTS qcm_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  question_id TEXT,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qcm_user ON qcm_attempts(user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_qcm_topic ON qcm_attempts(topic, answered_at DESC);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  correct_count INT NOT NULL,
  total_count INT NOT NULL,
  pct INT,
  passed BOOLEAN,
  duration_seconds INT,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_user ON exam_attempts(user_id, taken_at DESC);

-- ── 8. RLS — Pour le concours, on garde tout VERROUILLÉ ────────────────────
-- Le backend Python tape avec le SUPABASE_SERVICE_KEY (bypass RLS).
-- Les clients (frontend) n'attaquent JAMAIS Supabase directement → RLS activé sans
-- policy ouverte = aucun accès direct possible. Sécurité maximale par défaut.
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qcm_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts       ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- FIN — pour vérifier que tout est bien créé :
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
-- Tu devrais voir :
--   admin_password_resets, admin_users, email_logs, exam_attempts, login_events,
--   profiles, qcm_attempts, user_sessions, users
-- ════════════════════════════════════════════════════════════════════════════
