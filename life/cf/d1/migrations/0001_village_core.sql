-- JUNJA Village v50 Cloudflare D1 STAGING schema.
-- This file ONLY creates new tables in a new isolated D1 database. Never apply
-- against PostgreSQL or an existing Cloudflare production D1 without review.
-- Preserve UUIDs, original timestamp strings, login password salt/hash,
-- cloud save revisions, and idempotency keys. No record is reset here.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS village_users (
 id TEXT PRIMARY KEY NOT NULL,
 username TEXT NOT NULL COLLATE NOCASE UNIQUE,
 nickname TEXT NOT NULL COLLATE NOCASE UNIQUE,
 password_salt TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player','admin')),
 created_at TEXT NOT NULL,
 last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS village_single_admin
 ON village_users(role) WHERE role='admin';

CREATE TABLE IF NOT EXISTS village_saves (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES village_users(id) ON DELETE CASCADE,
 profile TEXT NOT NULL CHECK(json_valid(profile)),
 owned TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(owned)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=0),
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS village_sessions (
 token_hash TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES village_users(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS village_sessions_user_idx ON village_sessions(user_id);

CREATE TABLE IF NOT EXISTS village_wallets (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES village_users(id) ON DELETE CASCADE,
 balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS village_wallet_transfers (
 id TEXT PRIMARY KEY NOT NULL,
 sender_id TEXT REFERENCES village_users(id),
 recipient_id TEXT NOT NULL REFERENCES village_users(id),
 amount INTEGER NOT NULL CHECK(amount>0),
 kind TEXT NOT NULL CHECK(kind IN ('peer','admin_grant','admin_reclaim')),
 idempotency_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL,
 CHECK(sender_id IS NULL OR sender_id<>recipient_id)
);
CREATE INDEX IF NOT EXISTS village_wallet_transfers_recipient_idx ON village_wallet_transfers(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS village_wallet_transfers_sender_idx ON village_wallet_transfers(sender_id,created_at DESC);

CREATE TABLE IF NOT EXISTS village_auth_limits (
 key_hash TEXT NOT NULL, bucket INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY (key_hash,bucket)
);
CREATE TABLE IF NOT EXISTS village_presence (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES village_users(id) ON DELETE CASCADE,
 x REAL NOT NULL,y REAL NOT NULL,
 updated_at TEXT NOT NULL,xp REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS village_live_peers (
 client_id TEXT PRIMARY KEY NOT NULL,room TEXT NOT NULL,nick TEXT NOT NULL,
 x REAL NOT NULL DEFAULT 0,y REAL NOT NULL DEFAULT 0,dir TEXT NOT NULL DEFAULT 'down',
 coat TEXT,hat TEXT,fashion TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(fashion)),
 phrase TEXT,phrase_at TEXT,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS village_live_peers_room_recent_idx ON village_live_peers(room,updated_at DESC);
