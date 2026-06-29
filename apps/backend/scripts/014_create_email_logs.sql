-- MA1 Migration 014 — Logs emails + login events
-- [Sprint Admin/Emails/Support] Audit trail emails Resend + connexions utilisateurs.

BEGIN;

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  from_email TEXT,
  reply_to TEXT,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed','skipped')),
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  error TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_to ON email_logs(to_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS login_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  event TEXT NOT NULL CHECK (event IN ('register','login','logout','login_failed','admin_login','admin_login_failed')),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(event, created_at DESC);

-- RLS : logs lus uniquement via service role backend
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

COMMIT;
