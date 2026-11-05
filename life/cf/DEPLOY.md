# Cloudflare v50 API bridge deployment

This release moves static game hosting and the WebSocket relay to Cloudflare.
Accounts, save data and all economy operations still run through the existing
https://junja-village-friends.vercel.app API and PostgreSQL database.
It is NOT a completed database/backend migration. Keep the Vercel service enabled.
No database reset, export, import or secret copy is needed for this bridge.

Cloudflare Git build settings (repository root):
- Repository: skomet84-code/junja-world
- Production branch: feat/village-v50-cloudflare-cutover
- Project/Worker name: junja-world
- Root directory: / (repository root)
- Build command: npm --prefix life run build
- Deploy command: npx wrangler@4.45.0 deploy --config life/cf/wrangler.jsonc
- Non-production deployment: disable automatic non-production builds for this initial release.

After deployment, verify /health, log in with an existing account, compare the
saved level/inventory with the old site, save and re-login, and test two-player
visibility. Do not advertise the replacement until these checks pass. Cookies
are host-only, so users must log in again on the new hostname. Their existing
account and save remain in the same database. Do not play in both sites at once:
save version conflicts deliberately block stale writes.

Validation performed locally: API bridge unit tests, room protocol checks,
browser asset build. /api/account?action=me on the existing production service
returned 401 JSON (authentication required). Real-account save writes were not
performed. /health reports bridge configuration, not live database health.

The bridge uses a fixed upstream and exact route allowlist, passes only the
village_session cookie, preserves conflict responses and session cookie flags,
rejects cross-origin writes, caps request bodies, refuses upstream redirects,
and never automatically retries writes. Upstream outages block account/save
operations instead of falling back to guest/local progress.
