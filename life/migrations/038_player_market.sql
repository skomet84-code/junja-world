-- v38: player market exists ONLY in the isolated trial economy (v36/37).
-- Apply to isolated Neon staging after reviewing. Never transfer legacy gold or profile items.
CREATE TABLE IF NOT EXISTS village_market_v38_listings (
  id UUID PRIMARY KEY,
  seller_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
  item TEXT NOT NULL CHECK(item ~ '^[a-z_]{1,40}$'),
  quantity INT NOT NULL CHECK(quantity BETWEEN 1 AND 20),
  unit_price BIGINT NOT NULL CHECK(unit_price > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),
  buyer_key TEXT REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  CHECK ((status='sold' AND buyer_key IS NOT NULL AND settled_at IS NOT NULL)
      OR (status<>'sold' AND buyer_key IS NULL))
);
CREATE INDEX IF NOT EXISTS village_market_v38_active_idx
  ON village_market_v38_listings(created_at DESC) WHERE status='active';
CREATE INDEX IF NOT EXISTS village_market_v38_seller_idx
  ON village_market_v38_listings(seller_key,created_at DESC);
CREATE TABLE IF NOT EXISTS village_market_v38_requests (
  actor_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  request_hash CHAR(64) NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_key,request_id)
);
-- No DELETE triggers, no automated confiscation, and no changes to existing profile or wallet tables.
