-- MA1 Migration 015 — XP centralisé + présence enrichie
-- [Sprint Admin/Classement/Espace joueur] XP stable côté Supabase.
-- Source de vérité XP : table xp_events (chaque gain est journalisé, recalculable).
-- profiles.xp reste le total dénormalisé (mis à jour à chaque event).

BEGIN;

-- 1) Journal des événements XP (source de vérité, recalculable)
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,          -- account_created | daily_login | qcm_completed | qcm_correct | qcm_perfect | exam_completed | exam_passed | assistant_useful | weak_theme_improved | referral
  xp INT NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_type_day ON xp_events(user_id, type, created_at DESC);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own xp" ON xp_events;
CREATE POLICY "Users read own xp" ON xp_events
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 2) Présence enrichie : module courant
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS current_module TEXT;

-- 3) Colonnes profil utiles si absentes (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_xp_login DATE;

-- 4) Vue admin agrégée : 1 ligne par utilisateur réel (users LEFT JOIN profiles)
--    + dernière présence + comptage tentatives. Lecture admin uniquement (service key).
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  u.user_id,
  u.email,
  u.name,
  u.plan,
  u.created_at,
  COALESCE(p.level, 'debutant')      AS level,
  COALESCE(p.xp, 0)                  AS xp,
  COALESCE(p.score_total, 0)         AS score_total,
  COALESCE(p.score_correct, 0)       AS score_correct,
  COALESCE(p.streak_days, 0)         AS streak_days,
  s.last_seen_at,
  s.current_module,
  (SELECT COUNT(*) FROM qcm_attempts qa WHERE qa.user_id = u.user_id)  AS qcm_count,
  (SELECT COUNT(*) FROM exam_attempts ea WHERE ea.user_id = u.user_id) AS exam_count
FROM users u
LEFT JOIN profiles p ON p.user_id = u.user_id
LEFT JOIN LATERAL (
  SELECT last_seen_at, current_module
  FROM user_sessions us
  WHERE us.user_id = u.user_id
  ORDER BY last_seen_at DESC
  LIMIT 1
) s ON TRUE;

COMMIT;
