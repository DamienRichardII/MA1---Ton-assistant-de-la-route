-- MA1 Migration 016 — Abonnements récurrents SumUp (carte enregistrée) + journal des paiements.
-- Accès exclusivement via la clé service_role (backend) : RLS activée SANS policy = aucun accès client.
-- Le jeton de carte (payment_token) n'est jamais renvoyé au front.

BEGIN;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('premium', 'annual', 'autoecole')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'failed')),
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  interval_months INT NOT NULL CHECK (interval_months IN (1, 12)),
  trial_days INT NOT NULL DEFAULT 0,
  sumup_customer_id TEXT,
  setup_checkout_id TEXT UNIQUE,
  setup_reference TEXT,
  payment_token TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  anchor_at TIMESTAMPTZ,            -- date d'ancrage de la facturation (évite la dérive des fins de mois)
  periods_paid INT NOT NULL DEFAULT 0,
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_charge_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_due ON subscriptions(status, next_charge_at);
-- Un seul abonnement « vivant » par utilisateur (garde-fou contre le double abonnement).
CREATE UNIQUE INDEX IF NOT EXISTS uq_subs_one_live_per_user
  ON subscriptions(user_id) WHERE status IN ('trialing', 'active', 'past_due');

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  checkout_id TEXT UNIQUE NOT NULL,        -- idempotence : un paiement n'est enregistré qu'une fois
  checkout_reference TEXT UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('setup', 'renewal')),
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- users.plan acceptait seulement free/premium/autoecole : on ajoute 'annual'.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'premium', 'annual', 'autoecole'));

COMMIT;
