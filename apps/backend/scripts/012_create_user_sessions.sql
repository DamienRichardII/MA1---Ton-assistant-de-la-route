-- MA1 Migration 012 — Présence temps réel
-- [Sprint Admin/Emails/Support] Table user_sessions pour heartbeat utilisateur.

BEGIN;

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

-- RLS : utilisateur peut update sa propre session.
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sessions" ON user_sessions;
CREATE POLICY "Users manage own sessions" ON user_sessions
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

COMMIT;
