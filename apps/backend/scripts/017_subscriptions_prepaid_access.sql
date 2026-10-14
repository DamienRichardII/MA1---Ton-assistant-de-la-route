-- MA1 Migration 017 — Accès prépayé sans renouvellement automatique (repli tant que SumUp n'a pas activé l'enregistrement de cartes).
-- À exécuter AVANT d'activer PAYMENT_MODEL=one_time (par défaut). Sans danger à relancer.
BEGIN;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT TRUE;   -- FALSE = accès prépayé, aucun prélèvement
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;               -- email de rappel avant la fin d'accès
COMMIT;
