-- MA1 Migration 011 — Messagerie support utilisateur ↔ admin
-- [Sprint Admin/Emails/Support] Création tables support_threads + support_messages.

BEGIN;

CREATE TABLE IF NOT EXISTS support_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  subject TEXT,
  category TEXT CHECK (category IN ('bug','question','paiement','compte','suggestion','erreur_qcm_ia','autre')) DEFAULT 'autre',
  status TEXT CHECK (status IN ('open','pending','answered','closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_for_admin BOOLEAN DEFAULT TRUE,
  unread_for_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON support_threads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_threads_status ON support_threads(status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin')),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON support_messages(thread_id, created_at);

-- RLS : utilisateur lit seulement ses threads ; admin via service role lit tout.
ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own threads" ON support_threads;
CREATE POLICY "Users read own threads" ON support_threads
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users read messages of own threads" ON support_messages;
CREATE POLICY "Users read messages of own threads" ON support_messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM support_threads
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

COMMIT;
