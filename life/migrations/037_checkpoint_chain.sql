-- JUNJA v37 - append-only trial economy recovery checkpoints.
-- SAFE SCOPE: independent experimental wallet, never legacy saves/wallets.
-- First execute ONLY on a disposable/staging Neon branch cloned from village-auth.
CREATE TABLE IF NOT EXISTS village_economy_v37_checkpoints (
 user_key TEXT NOT NULL REFERENCES village_economy_v36_accounts(user_key) ON DELETE RESTRICT,
 version BIGINT NOT NULL CHECK(version >= 0),
 state JSONB NOT NULL,
 previous_hash CHAR(64),
 state_hash CHAR(64) NOT NULL,
 request_id UUID,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_key,version),
 UNIQUE(user_key,request_id),
 CONSTRAINT village_economy_v37_hash_shape CHECK (
  state_hash ~ '^[0-9a-f]{64}$' AND
  (previous_hash IS NULL OR previous_hash ~ '^[0-9a-f]{64}$')
 )
);
CREATE INDEX IF NOT EXISTS village_economy_v37_checkpoint_latest
  ON village_economy_v37_checkpoints(user_key, version DESC);
-- Recovery never happens automatically. Compare a confirmed checkpoint and its account
-- under a locked transaction, and require explicit operator approval before an overwrite.
