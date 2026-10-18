# JUNJA VILLAGE v41 — Walkable workshop plaza, interiors and read-only visitors
Date: 2026-10-19 (Asia/Seoul)

## What is actually implemented
- A separately mounted **3D personal workshop district** reachable from the personal farm's v41 button.
- Nine fixed physical sites in a 3×3 business park. Three existing v40 professional facilities have distinct modeled exterior/interior meshes, with scale and roof differences for levels 1–3.
- Real touch-to-move 3D avatar, facility tap/walk-to-door, enter workshop interior and exit.
- Accessible non-3D buttons to walk to each owned building.
- Server-authoritative relocation to vacant sites with collision checks, own-workshop-only restriction, 5 moves/day (KST).
- Successful relocation is persisted in existing v36 trial wallet JSON, with v36 receipt and v37 chained checkpoint in one DB transaction. No added tables, migrations, or new gold.
- Read-only public visiting: authenticated visitors see a limited list of workshop owners and can enter their 3D district/interiors.
- Visitor API accepts **GET only**. Public JSON includes owner identifier/display name and workshop role/tier/site, never state, gold, items, profession receipts, session credentials or character save.
- Own indoor "produce" action invokes existing authenticated v40 workshop transaction and existing server economic safeguards; guest view provides no mutation controls.
- The UI and renderer dispose GPU resources when the existing game modal is closed or a visitor scene replaces an owner's scene.
- Feature flag `ENABLE_VILLAGE_WORKSHOPS_V41=true` is required for the visitor endpoint and v40 placement action. Both default OFF.

## Verified QA
- `life/test_workshop_plots_v41.mjs`: site geometry, collision, owner-only moves, relocation quota, immutable previous state, privacy projection, walking and KST midnight reset.
- `life/test_workshop_browser_v41.mjs`: full Chromium 390x844 WebGL 3D scene render, walking to facility, indoor switch without a second WebGL canvas, guest mode, cleanup and screenshots. Separate CI workflow uploads screenshot artifact.
- `life/test_workshop_postgres_v41.mjs`: disposable real PostgreSQL 17, session authentication, public read-only visits, no guest writes, 5 repeated placement request IDs => exactly one mutation, no-site overlap, KST move limit, account+event+checkpoint consistency, fail-closed on corrupt balance.
- Existing village saved-game, v34-v40 economy and build CI remain enabled.

## Scope and outstanding conditions
- **Not a fully integrated open-world village**: this release mounts a stand-alone walkable 3D workshop *district* within the existing farm modal. The original map's portal/level architecture is unchanged.
- Interior workspace is a stylized 3D scene; facilities cannot yet be visited concurrently in real-time multiplayer with other avatars. "Guest" means read-only visiting of a saved public layout.
- Original player levels, official gold, possessions, save files and production Neon branches remain untouched. The v41 district is bound only to the isolated v36–v40 test economy and stores server workshop site in `state.workshops[role].site`.
- No forced public launch, no production DB migration; PR remains DRAFT. Live Vercel availability is not claimed.
- Actual iPhone Safari, authenticated Vercel preview/Neon staging integration, two-player live login walkthrough, save-reset investigation and cloud cost review are still required before deployment.

## Next
- Build seamless village portal and custom 3D residential zoning.
- Render guest avatars/presence only after server access controls and load testing are proven.
- Resolve the old live level/coin saving bug before migrating trial economy data.
- Test production-like feature flags on staging URL, then approve release separately.
