# 준자마을 v30 — inventory and combat progression

Continues `village-inventory-combat-v29` at `14f918f350d1f4b765997c48595f9474fa29cda7`.

- Seven paid bag tiers (24 / 40 / 64 / 100 / 150 / 220 / 320). Legacy excess inventory remains; every subsequent upgrade now adds real capacity.
- Bag → market shortcut retained. One-use fish liquidation vouchers cost 350G and remain available from monthly goals. Fish sale locks apply to manual and voucher sales. Vouchers exclude crafting materials, equipment and museum history.
- Skill books: strike 650G at Lv3 (3s / 12MP), whirl 2,800G at Lv5 (7s / 25MP), star 12,000G at Lv12 (20s / 48MP). Basic attacks remain free. Cooldowns persist across reloads.
- Five weapon and five shield tiers, including free defaults. Purchase, permanent ownership, equipping, attack/defense/HP bonuses and rig-attached sword/shield visuals.
- Normal/advanced HP and MP potion selection in the potion shop. Shared cooldown per resource family; remaining HP/MP shown numerically. Zero MP no longer restores to full on load.
- Zone-based incoming damage with diminishing defense reduction, HP regeneration after 6s without hits, and reduced passive MP regeneration.
- Preserves existing daily diminishing coin rewards. Purchases record currency sinks in the existing ledger.

Validation: npm test; mobile Chromium v29 inventory regression; v30 UI purchases, equipped statistics, reload, advanced potions and protected sale. Real iPhone Safari and long-duration player balance remain unverified.

Deployment: public Vercel project `junja-village-friends` was identified. Current public hunt.js lacks v29 inventory/potion imports. Scoped Vercel deployment inspection returned 403 for `team_H5OrTpIyBffdazqUy0qzf5uD`; no authenticated local Vercel CLI was available. This file does not assert production release.

Existing architecture limitation: player inventory, currency and progression are browser-local, not server-authoritative. These balance changes do not provide tamper-resistant online currency.
