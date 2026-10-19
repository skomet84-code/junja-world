-- Cloudflare D1 staging-only representation of v36-v38 trial-economy tables.
-- Experimental currency remains SEPARATE from official village_wallets/profile coins.
-- Do not automatically initialize, pay out, or copy trial balances into real wallets.
CREATE TABLE IF NOT EXISTS village_economy_v36_accounts (
 user_key TEXT PRIMARY KEY NOT NULL,
 state TEXT NOT NULL CHECK(json_valid(state)),
 version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS village_economy_v36_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 request_id TEXT NOT NULL,
 request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 action TEXT NOT NULL,
 amount_delta INTEGER NOT NULL,
 balance_after INTEGER NOT NULL CHECK(balance_after>=0),
 receipt TEXT NOT NULL CHECK(json_valid(receipt)),
 created_at TEXT NOT NULL,
 UNIQUE(user_key,request_id)
);
CREATE INDEX IF NOT EXISTS village_economy_v36_events_user_created
 ON village_economy_v36_events(user_key,id DESC);
CREATE TABLE IF NOT EXISTS village_economy_v37_checkpoints (
 user_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>=0),
 state TEXT NOT NULL CHECK(json_valid(state)),
 previous_hash TEXT CHECK(previous_hash IS NULL OR length(previous_hash)=64),
 state_hash TEXT NOT NULL CHECK(length(state_hash)=64),
 request_id TEXT,
 created_at TEXT NOT NULL,
 PRIMARY KEY(user_key,version),
 UNIQUE(user_key,request_id)
);
CREATE INDEX IF NOT EXISTS village_economy_v37_checkpoint_latest
 ON village_economy_v37_checkpoints(user_key,version DESC);
CREATE TABLE IF NOT EXISTS village_market_v38_listings (
 id TEXT PRIMARY KEY NOT NULL,
 seller_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 item TEXT NOT NULL CHECK(length(item) BETWEEN 1 AND 40 AND item NOT GLOB '*[^a-z_]*'),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20),
 unit_price INTEGER NOT NULL CHECK(unit_price>0),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),
 buyer_key TEXT REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 created_at TEXT NOT NULL,
 settled_at TEXT,
 CHECK ((status='sold' AND buyer_key IS NOT NULL AND settled_at IS NOT NULL)
     OR (status<>'sold' AND buyer_key IS NULL))
);
CREATE INDEX IF NOT EXISTS village_market_v38_active_idx
 ON village_market_v38_listings(created_at DESC) WHERE status='active';
CREATE INDEX IF NOT EXISTS village_market_v38_seller_idx
 ON village_market_v38_listings(seller_key,created_at DESC);
CREATE TABLE IF NOT EXISTS village_market_v38_requests (
 actor_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 request_id TEXT NOT NULL,request_hash TEXT NOT NULL CHECK(length(request_hash)=64),
 result TEXT NOT NULL CHECK(json_valid(result)),
 created_at TEXT NOT NULL,
 PRIMARY KEY(actor_key,request_id)
);
