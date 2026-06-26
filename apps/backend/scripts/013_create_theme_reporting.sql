-- MA1 Migration 013 — Reporting par thème
-- [Sprint Admin/Emails/Support] Table qcm_attempts pour calculer taux réussite/échec par thème.
-- Reporting calcule à la volée depuis cette table (pas de matview pour démarrer).

BEGIN;

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
CREATE INDEX IF NOT EXISTS idx_qcm_topic_correct ON qcm_attempts(topic, is_correct);

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

-- RLS strictes
ALTER TABLE qcm_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own qcm" ON qcm_attempts;
CREATE POLICY "Users read own qcm" ON qcm_attempts
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users read own exam" ON exam_attempts;
CREATE POLICY "Users read own exam" ON exam_attempts
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

COMMIT;
