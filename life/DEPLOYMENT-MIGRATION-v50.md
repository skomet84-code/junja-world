# v50 release and hosting migration gate

## Non-negotiable
- Keep junja-village-friends.vercel.app on the current known-good release until tested replacement is healthy.
- Never reset or copy over live village_users / village_saves / village_sessions / village_wallets.
- Do not expose DB credentials in GitHub or logs.
- Verify authenticated save load, save conflict handling, XP, money, inventory, energy, farm and housing with two independent real accounts before changing a public alias.

## Current architecture audit
- life/vercel.json routes /api/account and economy/market/professions/business/workshop APIs to Vercel Functions.
- life/api/account.js uses VILLAGE_DATABASE_URL or DATABASE_URL and PostgreSQL session cookies.
- life/server.mjs is a local preview relay, NOT a drop-in replacement for production: it serves static files and temporary WebSocket rooms, and explicitly says its preview economy is client-only.
- Existing local relay supports up to eight connected players in a room. Test service capacity separately.
- v50 economic guide is read-only and does not unify trial currency with official wallet.
- Therefore deploying server.mjs alone on Render/Railway would silently lose production API functionality. A proper Node adapter or equivalent is mandatory.

## Migration steps
1. Recover deploy access to the authorized Vercel team/project or choose a confirmed alternative workspace.
2. Keep the existing remote PostgreSQL DB attached through a restricted secret; no data export/import required when staying with the same DB.
3. Implement and test a full Node-compatible routing layer for every required /api/* endpoint with authentication, body parsing and correct cookies. Serve /api/ws on a WebSocket-capable host.
4. Set explicit safe environment variables in host UI only, never in code.
5. Run test suite and browser mobile/desktop end-to-end; verify users' save versions and XP do not regress.
6. Deploy isolated staging, confirm multiplayer and re-login, then move domain/communication URL only when healthy.
7. Preserve old deployment for rollback; rollback code only, never database state.

## Hosting constraints
- Render Free idles after 15 min and has ephemeral filesystem; suitable for a small hobby test, not guaranteed always-on multiplayer. Use external durable DB.
- Railway Free includes $1/month usage credit; not an unconditional always-on host.
- Verify account-specific availability, limits and any charges before choosing.
