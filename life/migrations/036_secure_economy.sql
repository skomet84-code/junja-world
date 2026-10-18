-- Junja Village v36: isolated, opt-in trial economy. DO NOT run on production before DB backup/QA.
-- Does not ALTER or UPDATE village_saves, village_wallets, village_users or any prior table.
-- Authentication comes from existing village_sessions, but currency and items live exclusively here.
CREATE TABLE IF NOT EXISTS village_economy_v36_accounts (
  user_key TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 0 CHECK(version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS village_economy_v36_events (
  id BIGSERIAL PRIMARY KEY,
  user_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  request_hash CHAR(64) NOT NULL,
  action TEXT NOT NULL,
  amount_delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK(balance_after >= 0),
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_key,request_id)
);
CREATE INDEX IF NOT EXISTS village_economy_v36_events_user_created
  ON village_economy_v36_events(user_key,id DESC);
-- Reverse migration (only after explicit admin review): DROP TABLE village_economy_v36_events;
-- DROP TABLE village_economy_v36_accounts;
