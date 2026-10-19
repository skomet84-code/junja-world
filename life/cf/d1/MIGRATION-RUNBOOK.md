# JUNJA Village v50 — Cloudflare D1 staging / lossless cutover

**Status: STAGING ONLY. Do not redirect players or disable Vercel/Neon.**

This branch is intentionally isolated from `feat/village-v50-cloudflare-cutover`.
It does **not** automatically deploy to the live `junja-world` Worker.
Its `worker-staging.js` uses the distinct Worker name `junja-world-d1-staging`.

## What has been implemented

- D1-compatible core schema (accounts, password hashes, sessions, per-user saves and versions,
  wallets, idempotent transfers, admin uniqueness, online presence).
- Separate v36-v38 experimental-economy schema: trial currency stays separate from game gold.
- Read-only, repeatable-read Neon audit/private staging export utility.
- Release blocker if there are users with no cloud save, or existing experimental economy data
  not included in the exporter.
- D1 staging `/api/account` register, login, logout, me, save GET and version-checked
  save POST. This is **NOT** a full replacement for production APIs.
- Staging service fails closed on all unsupported economy and admin routes. No silent guest reset.
- Local SQLite constraints test, staging API unauthenticated tests and game regression CI.

## Observed Neon inventory (read only)

Project: `junja-village-auth-prod`; current counts at audit (2026-10-20 KST):

| Table | Rows |
| --- | ---: |
| village_users | 13 |
| village_saves | 3 |
| village_sessions | 15 |
| village_wallets | 0 |
| village_wallet_transfers | 0 |

These figures **must** be refreshed at cutover. Only three server-save rows for
thirteen users: that does not prove ten lost characters, but is a mandatory reconciliation
checkpoint. Some characters may have been saved locally and should not be initialized
from scratch without owner validation.

A separate Neon project `junja-world-prod` has a different schema
(`world_saves`, `world_save_backups`), and may belong to a different game.
Do not automatically merge it with `junja-village-auth-prod`.

## Private audit/export (operator-controlled shell ONLY)

Use a device/session you control. Never paste tokens, DB passwords, raw export SQL,
password hashes or save records into chat/GitHub.

```bash
cd life
npm install --ignore-scripts
# Set VILLAGE_DATABASE_URL in a private shell environment, not in code.
node cf/d1/export-neon.mjs
```

The default command performs read-only auditing and creates no export. It aborts
if accounts have no cloud saves.

**Staging only**, when authorized to investigate missing saves, one may run:

```bash
node cf/d1/export-neon.mjs --staging-allow-missing-saves --out /secure/path/village.private-d1.sql
```

The export is a private 0600 file containing original password salt/hash and save
profiles. **Never commit it.** It does not include live sessions, so users must log in again
after a verified eventual cutover. It refuses to omit existing experimental-economy tables.

## Cloudflare staging steps — only after Cloudflare authentication is available

Create a **new empty** D1 database and do not touch any existing Worker or DB.

```bash
cd life
npx wrangler@4.45.0 d1 create junja-world-d1-staging --location apac
# Copy cf/d1/wrangler.staging.example.jsonc to cf/d1/wrangler.staging.jsonc
# and replace only the database_id with the exact UUID returned.
npx wrangler@4.45.0 d1 migrations apply junja-world-d1-staging --config cf/d1/wrangler.staging.jsonc --remote
# Import an approved PRIVATE staging snapshot. This cannot be treated as a live cutover.
npx wrangler@4.45.0 d1 execute junja-world-d1-staging --config cf/d1/wrangler.staging.jsonc --remote --file /secure/path/village.private-d1.sql
npm run build
npx wrangler@4.45.0 deploy --config cf/d1/wrangler.staging.jsonc
```

Use `wrangler d1 execute ... --remote --command 'SELECT count(*) ...'` for count
comparisons. Compare per-user XP, level, profile, owned inventory, wallet
and save version **before** allowing game progression on the new host.

## Release blocking issues

1. **Cloudflare account access**: We currently have no authenticated management
   connection to create the remote D1 database or bind it. No live migration executed.
2. **Missing saved-character records**: Reconcile users lacking server saves. Do not
   synthesize a level-1 record for a previously used account.
3. **Missing API parity**: Admin, wallet transfer, production economy and business
   APIs remain on Vercel. Staging explicitly returns 503 for these routes.
4. **Cloudflare Workers Free CPU budget**: 10ms/request. Existing scrypt password hashes
   may exceed this limit. Measure actual login requests on a D1 staging Worker first;
   do not reduce security or promise free authentication without verification.
5. **Production change freeze**: For eventual final export, block writes on the old
   service, take a consistent final snapshot, validate count/version/hash, switch
   API atomically, and maintain a rollback path. Never dual-write player state.
6. **End-to-end QA**: Two real users on mobile and PC; verify auth, XP/level, owned items,
   quest/farm/home, wallet, 409 save conflicts, multiplayer, logout/relogin and backups.

## Safety and rollback

Never reset `village_users`, `village_saves`, `village_wallets` or user
device storage. Stop at staging if any source/destination record differs or a D1
write fails. Keep the original Vercel and Neon accessible until a fully
verified cutover and recovery plan are accepted.
