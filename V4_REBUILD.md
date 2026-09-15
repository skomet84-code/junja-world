# JUNJA WORLD v4 Rebuild

## Non-negotiable rule

v4 replaces the client presentation and interaction layer only. The existing JUNJA WORLD rules/data remain canonical unless a separate gameplay change is explicitly approved.

### Preserve
- account/login/cloud save
- character identity and progression
- level/EXP/stat rules
- item/equipment data and enhancement rules
- quests/story progression
- monster/drop/crafting/gathering rules
- dungeon/boss/reward rules
- J-Coin bridge contract
- administrator/account operations

### Rebuild from zero
- world renderer
- map art and collision/navigation presentation
- player/NPC/monster sprites
- equipment appearance system
- skill/combat VFX and motion
- HUD, menus, quest UI and inventory UI
- mobile touch/drag controls
- quest auto-move navigation
- responsive layout and browser compatibility

## Architecture

`src/v4/` is isolated from the patch stack used by v3. v4 modules must not depend on v15/v2x/v29x visual patch modules.

- `main.ts` — application shell and HUD
- `world.ts` — world scene, camera, navigation and rendering
- `legacy.ts` — compatibility bridge to existing save/account contracts
- `style.css` — responsive v4 UI

## Release policy

The current v3 live client stays on `main` until v4 passes:
1. TypeScript + Vite build
2. mobile Chromium smoke test
3. mobile WebKit smoke test
4. login / character load migration test
5. movement / quest auto-move / combat test
6. user visual approval

Backup baseline: `backup/pre-v4-rebuild-20260915`.
Development branch: `rebuild/v4-world-client`.
