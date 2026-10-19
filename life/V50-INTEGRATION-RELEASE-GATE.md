# v50 integration and release gate

This branch is based on feat/village-v50-cloudflare-cutover. It is a safe preview branch, **not** a live release.

## Verified from repository
- v50 economy and Cloudflare relay source are present.
- life/package.json references v16-v50 regression tests, including persistence, fishing, hunting, fashion, multiplayer and economy.
- Cloudflare room protocol limits rooms to 8 and validates avatars and allowed phrases.

## Required before deployment
1. Run `cd life && npm ci && npm test && npm run build` in an isolated runner.
2. Confirm Cloudflare worker deployment and secrets, account database connectivity, and non-guest authenticated save operations.
3. Back up production database and validate account/level/currency/inventory restoration in staging.
4. Test two simultaneous clients, reconnect, room transitions, and save/reload.
5. Validate the actual preview URL and only then plan a production cutover.

Do not merge into main or modify JUNJA LAND/Adventure production services as part of this checklist.
