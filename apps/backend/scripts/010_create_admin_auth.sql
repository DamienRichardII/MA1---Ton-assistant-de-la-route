-- MA1 Migration 010 — Admin auth
-- [Sprint Admin/Emails/Support] Création tables admin_users + admin_password_resets.
-- À jouer après backup. Idempotent (IF NOT EXISTS).

BEGIN;

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
CREATE INDEX IF NOT EXISTS idx_admin_resets_admin ON admin_password_resets(admin_id, used_at);

-- RLS strictes : seul le backend (service role) peut lire/écrire ces tables.
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_password_resets ENABLE ROW LEVEL SECURITY;
-- Aucune policy ouverte créée — accès via SUPABASE_SERVICE_KEY uniquement côté backend.

COMMIT;
