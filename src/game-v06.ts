import Phaser from 'phaser';
import './v05.css';
import './v06.css';
import { HERO_CLASSES, PLAYER_SPEED, WORLD_HEIGHT, WORLD_WIDTH, type HeroClass } from '../shared/constants';

type ZoneKey = 'village' | 'field' | 'mine' | 'forest';
type ResourceKey = 'wood' | 'herb' | 'ore' | 'crystal';
type RareItemKey = 'cloudCharm' | 'blackIronBlade' | 'moonRing';

type SaveData = {
  name: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
  hp: number;
  kills: number;
  quest: number;
  gold: number;
  potions: number;
  weaponLevel: number;
  armorLevel: number;
  resources: Record<ResourceKey, number>;
  crafted: number;
  unlocked: ZoneKey[];
  autoPotion: boolean;
  autoLoot: boolean;
  rareItems: RareItemKey[];
  bossKills: string[];
};

type ZoneDef = { label: string; minLevel: number; tint: number; monsterTier: number; map: 'world-map' | 'field-map' };
type BossDef = {
  id: string;
  hour: number;
  minute: number;
  durationMin: number;
  zone: Exclude<ZoneKey, 'village'>;
  label: string;
  hp: number;
  damage: number;
  xp: number;
  gold: number;
  tint: number;
  rareItem: RareItemKey;
  rareChance: number;
};

const SAVE_KEY = 'junja-world-v01';
const AUTO_POTION_THRESHOLD = 0.4;
const AUTO_POTION_COOLDOWN = 4500;
const AUTO_LOOT_RADIUS = 320;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const ZONES: Record<ZoneKey, ZoneDef> = {
  village: { label: '백운성', minLevel: 1, tint: 0xffffff, monsterTier: 0, map: 'world-map' },
  field: { label: '청운들판', minLevel: 1, tint: 0xffffff, monsterTier: 1, map: 'field-map' },
  mine: { label: '흑철광산', minLevel: 5, tint: 0xb9c3cf, monsterTier: 2, map: 'field-map' },
  forest: { label: '월영숲', minLevel: 10, tint: 0x9acb9b, monsterTier: 3, map: 'field-map' }
};

const RES_LABEL: Record<ResourceKey, string> = {
  wood: '참나무 목재', herb: '청심초', ore: '흑철광석', crystal: '월광결정'
};

const RARE_ITEMS: Record<RareItemKey, { label: string; attack: number; hp: number; defense: number; description: string; tint: number }> = {
  cloudCharm: { label: '청운의 호부', attack: 6, hp: 20, defense: 0, description: '공격력 +6 · 체력 +20', tint: 0x72ddff },
  blackIronBlade: { label: '흑철귀검', attack: 14, hp: 0, defense: 0.03, description: '공격력 +14 · 피해감소 +3%', tint: 0xb389ff },
  moonRing: { label: '월영 수호반지', attack: 10, hp: 55, defense: 0.05, description: '공격력 +10 · 체력 +55 · 피해감소 +5%', tint: 0xff72c7 }
};

const BOSS_SCHEDULE: BossDef[] = [
  { id: 'cloud-ogre', hour: 12, minute: 0, durationMin: 20, zone: 'field', label: '청운귀왕', hp: 650, damage: 17, xp: 420, gold: 650, tint: 0x70d8ff, rareItem: 'cloudCharm', rareChance: 0.08 },
  { id: 'iron-king', hour: 18, minute: 0, durationMin: 20, zone: 'mine', label: '흑철마왕', hp: 1350, damage: 28, xp: 780, gold: 1300, tint: 0xb7a6ff, rareItem: 'blackIronBlade', rareChance: 0.05 },
  { id: 'moon-lord', hour: 22, minute: 0, durationMin: 20, zone: 'forest', label: '월식군주', hp: 2400, damage: 42, xp: 1500, gold: 2800, tint: 0xff77c8, rareItem: 'moonRing', rareChance: 0.03 }
];

const q = <T extends Element>(s: string) => document.querySelector<T>(s)!;
const ui = {
  auth: q<HTMLElement>('#auth-layer'), game: q<HTMLElement>('#game-ui'), nameInput: q<HTMLInputElement>('#hero-name'), enter: q<HTMLButtonElement>('#enter-game'),
  classCards: [...document.querySelectorAll<HTMLButtonElement>('.class-card')], name: q<HTMLElement>('#ui-name'), heroClass: q<HTMLElement>('#ui-class'), hp: q<HTMLElement>('#hp-text'), hpBar: q<HTMLElement>('#hp-bar'), xp: q<HTMLElement>('#xp-text'), xpBar: q<HTMLElement>('#xp-bar'),
  atk: q<HTMLElement>('#atk-text'), kills: q<HTMLElement>('#kill-text'), gold: q<HTMLElement>('#gold-text'), quest: q<HTMLElement>('#quest-panel'), questTitle: q<HTMLElement>('#quest-title'), questText: q<HTMLElement>('#quest-text'), questBar: q<HTMLElement>('#quest-bar'),
  toast: q<HTMLElement>('#toast'), inventory: q<HTMLElement>('#inventory-panel'), inventoryBtn: q<HTMLButtonElement>('#inventory-button'), inventoryClose: q<HTMLButtonElement>('#inventory-close'), resourceText: q<HTMLElement>('#resource-text'), equipText: q<HTMLElement>('#equip-text'), rareItems: q<HTMLElement>('#rare-items'),
  usePotion: q<HTMLButtonElement>('#use-potion'), craftPotion: q<HTMLButtonElement>('#craft-potion'), craftWeapon: q<HTMLButtonElement>('#craft-weapon'), craftArmor: q<HTMLButtonElement>('#craft-armor'), autoPotion: q<HTMLButtonElement>('#auto-potion-toggle'), autoLoot: q<HTMLButtonElement>('#auto-loot-toggle'),
  mobileAttack: q<HTMLButtonElement>('#mobile-attack'), mobileAction: q<HTMLButtonElement>('#mobile-action'), reset: q<HTMLButtonElement>('#reset-save'), zoneButtons: [...document.querySelectorAll<HTMLButtonElement>('[data-zone]')], dragHint: q<HTMLElement>('#drag-hint'), bossStatus: q<HTMLElement>('#boss-status'), bossTimer: q<HTMLElement>('#boss-timer')
};

let chosenClass: HeroClass = 'warrior';
let sceneRef: WorldScene | undefined;
let game: any;
let launchSave: SaveData | undefined;
let toastTimer = 0;

function fresh(name: string, heroClass: HeroClass): SaveData {
  return { name, heroClass, level: 1, xp: 0, hp: HERO_CLASSES[heroClass].maxHp, kills: 0, quest: 0, gold: 0, potions: 2, weaponLevel: 0, armorLevel: 0, resources: { wood: 0, herb: 0, ore: 0, crystal: 0 }, crafted: 0, unlocked: ['village', 'field'], autoPotion: true, autoLoot: true, rareItems: [], bossKills: [] };
}

function normalize(raw: any): SaveData | null {
  if (!raw?.name || !HERO_CLASSES[raw.heroClass as HeroClass]) return null;
  const base = fresh(raw.name, raw.heroClass as HeroClass);
  return { ...base, ...raw, quest: Number(raw.quest ?? 0), resources: { ...base.resources, ...(raw.resources || {}) }, unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : base.unlocked, autoPotion: raw.autoPotion ?? true, autoLoot: raw.autoLoot ?? true, rareItems: Array.isArray(raw.rareItems) ? raw.rareItems : [], bossKills: Array.isArray(raw.bossKills) ? raw.bossKills : [] };
}

function readSave() { try { return normalize(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); } catch { return null; } }
function persist(s: SaveData) { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }
function notify(msg: string) { clearTimeout(toastTimer); ui.toast.textContent = msg; ui.toast.classList.remove('hidden'); toastTimer = window.setTimeout(() => ui.toast.classList.add('hidden'), 2700); }
function rareAttack(s: SaveData) { return s.rareItems.reduce((n, key) => n + RARE_ITEMS[key].attack, 0); }
function rareHp(s: SaveData) { return s.rareItems.reduce((n, key) => n + RARE_ITEMS[key].hp, 0); }
function rareDefense(s: SaveData) { return s.rareItems.reduce((n, key) => n + RARE_ITEMS[key].defense, 0); }
function maxHp(s: SaveData) { return HERO_CLASSES[s.heroClass].maxHp + (s.level - 1) * 14 + s.armorLevel * 16 + rareHp(s); }
function attackPower(s: SaveData) { return HERO_CLASSES[s.heroClass].attack + (s.level - 1) * 5 + s.weaponLevel * 5 + rareAttack(s); }

function kstParts(now = Date.now()) {
  const d = new Date(now + KST_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
function kstEpoch(year: number, month: number, day: number, hour: number, minute: number) { return Date.UTC(year, month - 1, day, hour, minute) - KST_OFFSET_MS; }
function bossKey(def: BossDef, start: number) { const p = kstParts(start); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}-${def.id}`; }
function activeBoss(now = Date.now()) {
  const p = kstParts(now);
  for (const def of BOSS_SCHEDULE) {
    const start = kstEpoch(p.year, p.month, p.day, def.hour, def.minute);
    const end = start + def.durationMin * 60000;
    if (now >= start && now < end) return { def, start, end, key: bossKey(def, start) };
  }
  if (new URLSearchParams(location.search).has('bossnow')) {
    const def = BOSS_SCHEDULE[0];
    return { def, start: now - 60000, end: now + 19 * 60000, key: `debug-${def.id}` };
  }
  return null;
}
function nextBoss(now = Date.now()) {
  const p = kstParts(now); const list: { def: BossDef; start: number }[] = [];
  for (let plus = 0; plus <= 1; plus++) {
    const date = new Date(Date.UTC(p.year, p.month - 1, p.day + plus));
    for (const def of BOSS_SCHEDULE) {
      const start = kstEpoch(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), def.hour, def.minute);
      if (start > now) list.push({ def, start });
    }
  }
  return list.sort((a, b) => a.start - b.start)[0];
}
function countdown(ms: number) { const t = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor(t % 3600 / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }

function refreshHud(s: SaveData) {
  const need = s.level * 100;
  ui.name.textContent = s.name; ui.heroClass.textContent = `Lv.${s.level} ${HERO_CLASSES[s.heroClass].label}`; ui.hp.textContent = `${Math.max(0, Math.ceil(s.hp))} / ${maxHp(s)}`; ui.hpBar.style.width = `${Math.max(0, Math.min(100, s.hp / maxHp(s) * 100))}%`; ui.xp.textContent = `${s.xp} / ${need}`; ui.xpBar.style.width = `${Math.min(100, s.xp / need * 100)}%`; ui.atk.textContent = String(attackPower(s)); ui.kills.textContent = String(s.kills); ui.gold.textContent = String(s.gold);
  const quests: [string, string, string][] = [
    ['낯선 마을의 부름', '촌장 백운을 찾아가자. · 클릭하면 자동이동', '12%'],
    ['청운들판 토벌', `청운들판 요괴 5마리 처치 (${Math.min(s.kills, 5)}/5) · 완료 EXP +100`, '48%'],
    ['백운에게 보고', '촌장 백운에게 돌아가 보상을 받자. · 완료 EXP +220', '82%'],
    ['흑철광산 조사', `흑철광석 5개 채집 (${Math.min(s.resources.ore, 5)}/5) · 완료 EXP +300`, '92%'],
    ['월영숲의 문', 'Lv.10 달성 후 월영숲 입장 · 완료 EXP +500', '100%']
  ];
  const quest = quests[Math.min(s.quest, quests.length - 1)]; ui.questTitle.textContent = quest[0]; ui.questText.textContent = quest[1]; ui.questBar.style.width = quest[2];
  ui.resourceText.textContent = `목재 ${s.resources.wood} · 청심초 ${s.resources.herb} · 흑철광석 ${s.resources.ore} · 월광결정 ${s.resources.crystal}`;
  ui.equipText.textContent = `무기 +${s.weaponLevel} · 방어구 +${s.armorLevel} · 회복약 ${s.potions}`;
  ui.autoPotion.textContent = `자동 물약 ${s.autoPotion ? 'ON' : 'OFF'} · HP 40%`;
  ui.autoLoot.textContent = `자동 줍기 ${s.autoLoot ? 'ON' : 'OFF'} · ${AUTO_LOOT_RADIUS}px`;
  ui.autoPotion.classList.toggle('enabled', s.autoPotion); ui.autoLoot.classList.toggle('enabled', s.autoLoot);
  ui.rareItems.innerHTML = s.rareItems.length ? s.rareItems.map(key => `<div class="rare-line"><b>★ ${RARE_ITEMS[key].label}</b><small>${RARE_ITEMS[key].description}</small></div>`).join('') : '<div class="rare-empty">아직 획득한 희귀 장비가 없습니다.</div>';
  ui.zoneButtons.forEach(b => { const z = b.dataset.zone as ZoneKey; b.classList.toggle('locked', s.level < ZONES[z].minLevel); b.title = s.level < ZONES[z].minLevel ? `Lv.${ZONES[z].minLevel} 필요` : ZONES[z].label; });
}

function startGame(s: SaveData) {
  ui.auth.classList.add('hidden'); ui.game.classList.remove('hidden'); launchSave = s; refreshHud(s); game?.destroy(true);
  // iOS WebKit in embedded browsers can create a WebGL surface but leave it
  // blank after resuming/navigation. Canvas is slower but renders reliably.
  const iosWebKit=/iP(?:hone|ad|od)/i.test(navigator.userAgent);
  game = new Phaser.Game({ type: iosWebKit ? Phaser.CANVAS : Phaser.AUTO, parent: 'game-container', width: innerWidth, height: innerHeight, backgroundColor: '#182a22', physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } }, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [WorldScene] });
}

ui.classCards.forEach(c => c.addEventListener('click', () => { chosenClass = c.dataset.class as HeroClass; ui.classCards.forEach(x => x.classList.toggle('selected', x === c)); }));
const existing = readSave(); if (existing) { ui.nameInput.value = existing.name; chosenClass = existing.heroClass; ui.enter.textContent = `${existing.name}로 계속하기`; ui.classCards.forEach(c => c.classList.toggle('selected', c.dataset.class === chosenClass)); }
ui.enter.addEventListener('click', () => { const name = ui.nameInput.value.trim() || '준자'; const old = readSave(); startGame(old && old.name === name && old.heroClass === chosenClass ? old : fresh(name, chosenClass)); });
ui.nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') ui.enter.click(); });
ui.reset.addEventListener('click', () => { if (confirm('현재 캐릭터 기록을 지우고 처음부터 시작할까?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } });
ui.quest.addEventListener('click', () => sceneRef?.questNavigate()); ui.inventoryBtn.addEventListener('click', () => sceneRef?.toggleInventory()); ui.inventoryClose.addEventListener('click', () => sceneRef?.toggleInventory(false)); ui.mobileAttack.addEventListener('pointerdown', () => sceneRef?.attack()); ui.mobileAction.addEventListener('pointerdown', () => sceneRef?.contextAction()); ui.usePotion.addEventListener('click', () => sceneRef?.usePotion(false)); ui.craftPotion.addEventListener('click', () => sceneRef?.craft('potion')); ui.craftWeapon.addEventListener('click', () => sceneRef?.craft('weapon')); ui.craftArmor.addEventListener('click', () => sceneRef?.craft('armor')); ui.autoPotion.addEventListener('click', () => sceneRef?.toggleAutoPotion()); ui.autoLoot.addEventListener('click', () => sceneRef?.toggleAutoLoot()); ui.zoneButtons.forEach(b => b.addEventListener('click', () => sceneRef?.travel(b.dataset.zone as ZoneKey)));

class WorldScene extends Phaser.Scene {
  private save!: SaveData; private zone: ZoneKey = 'village'; private player: any; private nameText: any; private shadow: any; private elder: any; private map: any; private monsters: any; private nodes: any; private drops: any; private cursors: any; private keys: Record<string, any> = {}; private facing = new Phaser.Math.Vector2(0, 1); private dragVector = new Phaser.Math.Vector2(); private dragStart?: any; private autoTarget?: any; private inventoryOpen = false; private lastAttack = 0; private lastHurt = 0; private lastAutoPotion = -99999; private actionLabel?: any; private bossEntity?: any; private bossEntityKey?: string; private gearWeapon?: any; private gearArmor?: any; private gearAura?: any;
  constructor() { super('world'); }
  init() { this.save = { ...(launchSave ?? fresh('준자', 'warrior')) }; this.save.resources = { ...this.save.resources }; this.save.unlocked = [...this.save.unlocked]; this.save.rareItems = [...this.save.rareItems]; this.save.bossKills = [...this.save.bossKills]; sceneRef = this; }
  preload() { this.load.image('world-map', '/assets/baegun-village.webp'); this.load.image('field-map', '/assets/cheongun-field-v1.webp'); this.load.spritesheet('hero-warrior', '/assets/hero-warrior-sheet.webp', { frameWidth: 300, frameHeight: 300 }); this.load.spritesheet('hero-mage', '/assets/hero-mage-sheet.webp', { frameWidth: 300, frameHeight: 300 }); this.load.spritesheet('hero-ranger', '/assets/hero-ranger-sheet.webp', { frameWidth: 300, frameHeight: 300 }); this.load.spritesheet('slime', '/assets/dokkaebi-slime-sheet.webp', { frameWidth: 500, frameHeight: 500 }); this.load.image('elder-art', '/assets/elder-baegun-trim.webp'); }
  create() { this.makeTextures(); this.makeAnimations(); this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT); this.map = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'world-map').setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT).setDepth(-20); this.createPlayer(); this.createElder(); this.monsters = this.physics.add.group(); this.nodes = this.physics.add.group({ allowGravity: false, immovable: true }); this.drops = this.physics.add.group({ allowGravity: false }); this.physics.add.overlap(this.player, this.monsters, (_p: any, m: any) => this.hurt(m)); this.physics.add.overlap(this.player, this.drops, (_p: any, d: any) => this.collectDrop(d)); this.bindControls(); this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT); this.cameras.main.startFollow(this.player, true, .1, .1); this.enterZone('village', 1160, 790, false); this.updateBossClock(); this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateBossClock() }); refreshHud(this.save); persist(this.save); this.time.delayedCall(500, () => notify('자동 줍기·자동 물약 ON · 장비 외형 표시 · 시간제 보스 활성화')); }

  private makeTextures() {
    const make = (k: string, w: number, h: number, draw: (g: any) => void) => { if (this.textures.exists(k)) return; const g = this.add.graphics(); draw(g); g.generateTexture(k, w, h); g.destroy(); };
    make('node-tree', 88, 72, g => { g.fillStyle(0x15241c, .25).fillEllipse(44, 62, 72, 15); g.fillStyle(0x52331e).fillRoundedRect(8, 30, 68, 25, 12); g.lineStyle(3, 0x342013, .8).strokeRoundedRect(8, 30, 68, 25, 12); g.fillStyle(0x8a5d35).fillEllipse(72, 42, 20, 25); g.lineStyle(2, 0x4b2c18, .8).strokeEllipse(72, 42, 15, 19).strokeEllipse(72, 42, 8, 12); g.lineStyle(2, 0xb07b49, .55).lineBetween(18, 35, 55, 35).lineBetween(17, 44, 48, 44); g.fillStyle(0x6c9b45).fillEllipse(22, 25, 19, 12).fillEllipse(32, 20, 17, 10); g.fillStyle(0xd8c46f).fillCircle(42, 26, 3).fillCircle(48, 23, 2); });
    make('node-herb', 72, 72, g => { g.fillStyle(0x15241c, .22).fillEllipse(36, 62, 54, 11); g.lineStyle(3, 0x356c3c, .95); g.lineBetween(35, 58, 36, 20).lineBetween(35, 45, 18, 31).lineBetween(36, 43, 55, 27).lineBetween(35, 51, 22, 47).lineBetween(36, 50, 53, 46); g.fillStyle(0x63a85f).fillEllipse(18, 30, 23, 13).fillEllipse(54, 27, 24, 13).fillEllipse(21, 47, 22, 12).fillEllipse(53, 46, 21, 12); g.fillStyle(0x9bd06e).fillEllipse(31, 24, 18, 11).fillEllipse(43, 20, 17, 10); g.fillStyle(0xf2cf73).fillCircle(36, 15, 6); g.fillStyle(0xffead0).fillCircle(36, 14, 2); });
    make('node-ore', 82, 68, g => { g.fillStyle(0x111820, .28).fillEllipse(41, 59, 68, 13); g.fillStyle(0x424b55).fillTriangle(6, 55, 23, 17, 43, 55).fillTriangle(27, 56, 51, 9, 76, 56); g.fillStyle(0x626d77).fillTriangle(17, 45, 27, 22, 42, 45).fillTriangle(43, 47, 54, 15, 68, 48); g.fillStyle(0x252d36).fillTriangle(15, 56, 33, 34, 49, 57); g.lineStyle(5, 0xb3c2cf, .9).lineBetween(29, 23, 37, 42).lineBetween(54, 19, 61, 39); g.lineStyle(2, 0xf0f6ff, .75).lineBetween(29, 22, 34, 31).lineBetween(55, 18, 58, 28); });
    make('node-crystal', 78, 82, g => { g.fillStyle(0x10222c, .25).fillEllipse(39, 72, 62, 12); g.fillStyle(0x4aa7c9, .25).fillCircle(39, 42, 28); g.fillStyle(0x74d7ee).fillTriangle(39, 5, 52, 58, 37, 71).fillTriangle(39, 5, 24, 57, 37, 71); g.fillStyle(0x9ceaff).fillTriangle(19, 24, 31, 60, 17, 68).fillTriangle(58, 18, 68, 59, 52, 67); g.fillStyle(0xcaf7ff, .9).fillTriangle(39, 8, 43, 46, 35, 51).fillTriangle(58, 20, 61, 48, 55, 52); g.fillStyle(0xe8fcff).fillCircle(18, 16, 2).fillCircle(64, 10, 2).fillCircle(69, 31, 2); });
    make('coin', 26, 26, g => { g.fillStyle(0x8b571c, .3).fillEllipse(13, 21, 20, 6); g.fillStyle(0xf2c653).fillCircle(13, 12, 10); g.lineStyle(2, 0xa76a22).strokeCircle(13, 12, 7); g.fillStyle(0xffe69a).fillRect(11, 7, 4, 10); });
    make('drop-potion', 28, 34, g => { g.fillStyle(0xe1d8bc).fillRoundedRect(9, 2, 10, 7, 2); g.fillStyle(0x8c203c).fillRoundedRect(5, 8, 18, 22, 7); g.fillStyle(0xed607b).fillCircle(12, 17, 5); });
    make('rare-drop', 54, 54, g => { g.fillStyle(0x3c174f, .25).fillCircle(27, 27, 25); g.fillStyle(0xa95cff, .55).fillCircle(27, 27, 20); g.lineStyle(3, 0xffdf78, 1).strokeCircle(27, 27, 17); g.fillStyle(0xfff1a7).fillTriangle(27, 7, 32, 21, 47, 21).fillTriangle(47, 21, 35, 31, 40, 47).fillTriangle(40, 47, 27, 38, 14, 47).fillTriangle(14, 47, 19, 31, 7, 21).fillTriangle(7, 21, 22, 21, 27, 7); });
    make('boss', 130, 120, g => { g.fillStyle(0x120d18, .35).fillEllipse(65, 105, 100, 18); g.fillStyle(0x2a1b35).fillRoundedRect(21, 35, 88, 70, 35); g.fillStyle(0x6c3e8f).fillCircle(43, 42, 30).fillCircle(85, 42, 31); g.fillStyle(0xd9b3ff).fillTriangle(26, 29, 37, 4, 48, 31).fillTriangle(80, 30, 94, 3, 104, 35); g.fillStyle(0xffe66d).fillCircle(47, 58, 6).fillCircle(83, 58, 6); g.lineStyle(5, 0xe5bcff, .75).beginPath().moveTo(43, 83).lineTo(65, 92).lineTo(87, 82).strokePath(); });
    make('gear-armor', 62, 50, g => { g.fillStyle(0x22344a, .95).fillRoundedRect(14, 14, 34, 30, 8); g.fillStyle(0x4d6c91).fillTriangle(14, 16, 2, 24, 16, 29).fillTriangle(48, 16, 60, 24, 46, 29); g.lineStyle(3, 0xc4d4e8, .8).strokeRoundedRect(18, 17, 26, 22, 6); g.fillStyle(0xe5b95e).fillRect(27, 18, 7, 20); });
    make('gear-weapon', 24, 74, g => { g.fillStyle(0x55391f).fillRoundedRect(9, 48, 6, 21, 2); g.fillStyle(0xd4a94e).fillRect(4, 46, 16, 5); g.fillStyle(0xd8e5ee).fillTriangle(12, 2, 20, 45, 4, 45); g.fillStyle(0xffffff, .7).fillTriangle(12, 6, 14, 39, 9, 39); });
    make('gear-aura', 90, 90, g => { g.lineStyle(5, 0xffffff, .35).strokeCircle(45, 45, 34); g.lineStyle(2, 0xffffff, .6).strokeCircle(45, 45, 42); g.fillStyle(0xffffff, .8).fillCircle(13, 24, 2).fillCircle(72, 15, 2).fillCircle(77, 61, 2).fillCircle(18, 70, 2); });
  }

  private makeAnimations() { const frames = { down: [1, 4, 1], up: [2, 3, 2], side: [7, 9, 7] }; (Object.keys(HERO_CLASSES) as HeroClass[]).forEach(c => Object.entries(frames).forEach(([d, n]) => { const k = `walk-${c}-${d}`; if (!this.anims.exists(k)) this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(`hero-${c}`, { frames: n }), frameRate: 7, repeat: -1 }); })); if (!this.anims.exists('slime-idle')) this.anims.create({ key: 'slime-idle', frames: this.anims.generateFrameNumbers('slime', { frames: [0, 1, 2, 1] }), frameRate: 4, repeat: -1 }); }
  private createPlayer() { this.shadow = this.add.ellipse(1160, 815, 38, 12, 0x10251d, .35); this.player = this.physics.add.sprite(1160, 790, `hero-${this.save.heroClass}`, 1).setScale(.24).setCollideWorldBounds(true); this.player.setSize(70, 86).setOffset(115, 196); this.gearAura = this.add.image(1160, 790, 'gear-aura').setVisible(false).setDepth(780); this.gearArmor = this.add.image(1160, 790, 'gear-armor').setVisible(false).setDepth(805); this.gearWeapon = this.add.image(1160, 790, 'gear-weapon').setVisible(false).setDepth(830); this.nameText = this.add.text(1160, 738, this.save.name, { fontFamily: 'Noto Sans KR', fontSize: '11px', fontStyle: 'bold', color: '#fff', stroke: '#14232b', strokeThickness: 4 }).setOrigin(.5).setDepth(3000); this.refreshGearVisual(); }
  private createElder() { const art = this.add.image(0, 18, 'elder-art').setScale(.058); const mark = this.add.text(0, -70, '!', { fontFamily: 'serif', fontSize: '30px', fontStyle: 'bold', color: '#ffd55c', stroke: '#47320b', strokeThickness: 6 }).setOrigin(.5); const label = this.add.text(0, 72, '촌장 백운', { fontFamily: 'Noto Sans KR', fontSize: '12px', fontStyle: 'bold', color: '#fff1c8', stroke: '#13212a', strokeThickness: 5 }).setOrigin(.5); this.elder = this.add.container(1070, 645, [art, mark, label]).setDepth(2000); }
  private refreshGearVisual() { const bestRare = this.save.rareItems.includes('moonRing') ? 'moonRing' : this.save.rareItems.includes('blackIronBlade') ? 'blackIronBlade' : this.save.rareItems.includes('cloudCharm') ? 'cloudCharm' : undefined; this.gearArmor?.setVisible(this.save.armorLevel > 0).setTint(this.save.armorLevel >= 5 ? 0xe9c96d : this.save.armorLevel >= 3 ? 0x9b73dc : 0x718aa6).setScale(.72 + Math.min(5, this.save.armorLevel) * .025); this.gearWeapon?.setVisible(this.save.weaponLevel > 0 || this.save.rareItems.includes('blackIronBlade')).setTint(this.save.rareItems.includes('blackIronBlade') ? RARE_ITEMS.blackIronBlade.tint : this.save.weaponLevel >= 5 ? 0xffd970 : this.save.weaponLevel >= 3 ? 0x86d9ff : 0xdbe7ef).setScale(.72 + Math.min(5, this.save.weaponLevel) * .03); this.gearAura?.setVisible(!!bestRare); if (bestRare) this.gearAura.setTint(RARE_ITEMS[bestRare].tint); }
  private updateGearVisual(time: number) { const side = this.facing.x < -.25 ? -1 : 1; this.gearArmor.setPosition(this.player.x, this.player.y + 1).setDepth(this.player.y + 18); this.gearWeapon.setPosition(this.player.x + side * 27, this.player.y + 2).setFlipX(side < 0).setRotation(side < 0 ? -.18 : .18).setDepth(this.player.y + 24); this.gearAura.setPosition(this.player.x, this.player.y).setDepth(this.player.y - 4).setRotation(time * .00045).setAlpha(.45 + Math.sin(time * .004) * .12); }
  private bindControls() { this.cursors = this.input.keyboard!.createCursorKeys(); this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,I,SPACE') as Record<string, any>; this.keys.SPACE.on('down', () => this.attack()); this.keys.E.on('down', () => this.contextAction()); this.keys.I.on('down', () => this.toggleInventory()); this.input.on('pointerdown', (p: any) => { if (!p.event || this.isUiTarget(p.event.target as Element)) return; this.autoTarget = undefined; this.dragStart = new Phaser.Math.Vector2(p.x, p.y); this.dragVector.set(0, 0); ui.dragHint.classList.remove('hidden'); }); this.input.on('pointermove', (p: any) => { if (!p.isDown || !this.dragStart) return; const delta = new Phaser.Math.Vector2(p.x - this.dragStart.x, p.y - this.dragStart.y); if (delta.length() < 10) this.dragVector.set(0, 0); else this.dragVector.copy(delta).limit(90).scale(1 / 90); }); const end = () => { this.dragStart = undefined; this.dragVector.set(0, 0); ui.dragHint.classList.add('hidden'); }; this.input.on('pointerup', end); this.input.on('pointerupoutside', end); }
  private isUiTarget(el: Element | null) { return !!el?.closest('#game-ui button,#game-ui aside,.top-bar,.dialogue'); }

  update(time: number) { if (!this.player.active) return; let x = (this.cursors.left.isDown || this.keys.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0) + this.dragVector.x; let y = (this.cursors.up.isDown || this.keys.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0) + this.dragVector.y; if (this.autoTarget && !this.inventoryOpen) { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.autoTarget.x, this.autoTarget.y); if (d < 28) { this.autoTarget = undefined; notify('목적지에 도착했습니다.'); } else { const v = new Phaser.Math.Vector2(this.autoTarget.x - this.player.x, this.autoTarget.y - this.player.y).normalize(); x = v.x; y = v.y; } } const v = new Phaser.Math.Vector2(x, y); if (v.lengthSq() > 1) v.normalize(); v.scale(this.inventoryOpen ? 0 : PLAYER_SPEED); this.player.setVelocity(v.x, v.y); this.animatePlayer(v); this.updateMonsters(time); this.updateDrops(); this.tryAutoPotion(); this.nameText.setPosition(this.player.x, this.player.y - 52); this.shadow.setPosition(this.player.x, this.player.y + 25).setDepth(this.player.y - 2); this.player.setDepth(this.player.y + 20); this.updateGearVisual(time); this.updateContext(); }
  private animatePlayer(v: any) { if (v.lengthSq() > 0) { this.facing.copy(v).normalize(); const d = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : (v.y < 0 ? 'up' : 'down'); if (d === 'left' || d === 'right') this.player.setFlipX(d === 'right').play(`walk-${this.save.heroClass}-side`, true); else this.player.setFlipX(false).play(`walk-${this.save.heroClass}-${d}`, true); } else { this.player.stop(); const d = Math.abs(this.facing.x) > Math.abs(this.facing.y) ? (this.facing.x < 0 ? 'left' : 'right') : (this.facing.y < 0 ? 'up' : 'down'); if (d === 'left' || d === 'right') this.player.setFrame(7).setFlipX(d === 'right'); else this.player.setFrame(d === 'up' ? 2 : 1).setFlipX(false); } }

  private spawnZone() { this.monsters.clear(true, true); this.nodes.clear(true, true); this.drops.clear(true, true); this.bossEntity = undefined; this.bossEntityKey = undefined; if (this.zone === 'village') return; const tier = ZONES[this.zone].monsterTier; const names = tier === 1 ? ['들슬라임', '푸른 물방울', '도깨비불'] : tier === 2 ? ['광산박쥐', '흑철골렘', '동굴도깨비'] : ['월영늑대', '그림자요괴', '고목정령']; for (let i = 0; i < 12; i++) { const x = 350 + (i % 4) * 520 + Phaser.Math.Between(-80, 80), y = 260 + Math.floor(i / 4) * 390 + Phaser.Math.Between(-70, 70); const hp = 45 + tier * 55 + i * 3, damage = 6 + tier * 7, xp = 18 + tier * 32, gold = 10 + tier * 18; const m = this.monsters.create(x, y, 'slime'); m.setScale(.09 + tier * .018).setTint(tier === 1 ? 0xffffff : tier === 2 ? 0xaab5c5 : 0x9b7cff).setSize(260, 180).setOffset(120, 300).setData({ name: names[i % names.length], hp, maxHp: hp, damage, xp, gold, bornX: x, bornY: y, nextMove: 0, isBoss: false }).play('slime-idle'); }
    const nodeType: ResourceKey = this.zone === 'field' ? 'herb' : this.zone === 'mine' ? 'ore' : 'crystal'; const tex = this.zone === 'field' ? 'node-herb' : this.zone === 'mine' ? 'node-ore' : 'node-crystal'; for (let i = 0; i < 9; i++) { const n = this.nodes.create(280 + (i % 3) * 780 + Phaser.Math.Between(-80, 80), 240 + Math.floor(i / 3) * 430 + Phaser.Math.Between(-60, 60), tex); n.setData({ kind: nodeType, amount: this.zone === 'forest' ? 1 : Phaser.Math.Between(1, 2), ready: true }).setDepth(n.y + 5); if (nodeType === 'crystal') this.tweens.add({ targets: n, alpha: .72, duration: 900 + i * 60, yoyo: true, repeat: -1 }); }
    if (this.zone === 'field') for (let i = 0; i < 6; i++) { const n = this.nodes.create(420 + (i % 3) * 650, 420 + Math.floor(i / 3) * 500, 'node-tree'); n.setData({ kind: 'wood', amount: Phaser.Math.Between(1, 2), ready: true }).setDepth(n.y + 5); }
    this.spawnScheduledBoss();
  }
  private spawnScheduledBoss() { const active = activeBoss(); if (!active || active.def.zone !== this.zone || this.save.bossKills.includes(active.key)) return; const def = active.def, x = WORLD_WIDTH * .72, y = WORLD_HEIGHT * .48; const boss = this.monsters.create(x, y, 'boss'); boss.setTint(def.tint).setScale(1.05).setSize(92, 82).setData({ name: def.label, hp: def.hp, maxHp: def.hp, damage: def.damage, xp: def.xp, gold: def.gold, bornX: x, bornY: y, nextMove: 0, isBoss: true, bossKey: active.key, rareItem: def.rareItem, rareChance: def.rareChance }).setDepth(y + 20); this.bossEntity = boss; this.bossEntityKey = active.key; this.tweens.add({ targets: boss, scaleX: 1.11, scaleY: 1.11, duration: 700, yoyo: true, repeat: -1 }); notify(`⚠ ${def.label} 출현! 희귀 드랍 ${(def.rareChance * 100).toFixed(0)}%`); }
  private updateBossClock() { const now = Date.now(), active = activeBoss(now); if (active) { ui.bossStatus.textContent = `출현중 · ${active.def.label} · ${ZONES[active.def.zone].label}`; ui.bossTimer.textContent = `종료까지 ${countdown(active.end - now)} · 희귀 ${(active.def.rareChance * 100).toFixed(0)}%`; if (active.def.zone === this.zone && !this.save.bossKills.includes(active.key) && (!this.bossEntity || !this.bossEntity.active)) this.spawnScheduledBoss(); } else { const next = nextBoss(now); if (next) { ui.bossStatus.textContent = `다음 보스 · ${next.def.label} · ${ZONES[next.def.zone].label}`; ui.bossTimer.textContent = `${countdown(next.start - now)} 후 · KST ${String(next.def.hour).padStart(2, '0')}:${String(next.def.minute).padStart(2, '0')}`; } } }
  private updateMonsters(time: number) { this.monsters.getChildren().forEach((m: any) => { if (!m.active) return; const d = Phaser.Math.Distance.Between(m.x, m.y, this.player.x, this.player.y); const boss = !!m.getData('isBoss'); if (d < (boss ? 430 : 280)) this.physics.moveToObject(m, this.player, boss ? 82 : 48 + ZONES[this.zone].monsterTier * 12); else if (time > (m.getData('nextMove') || 0)) { m.setData('nextMove', time + Phaser.Math.Between(1300, 2600)); m.setVelocity(Phaser.Math.Between(boss ? -65 : -45, boss ? 65 : 45), Phaser.Math.Between(boss ? -65 : -45, boss ? 65 : 45)); } m.setFlipX(m.body.velocity.x < 0); m.setDepth(m.y + 10); }); }
  private updateDrops() { if (!this.save.autoLoot) return; this.drops.getChildren().forEach((d: any) => { if (!d.active) return; const distance = Phaser.Math.Distance.Between(d.x, d.y, this.player.x, this.player.y); if (distance < AUTO_LOOT_RADIUS) this.physics.moveToObject(d, this.player, 360); if (distance < 28) this.collectDrop(d); }); }

  private updateContext() { if (this.actionLabel) { this.actionLabel.destroy(); this.actionLabel = undefined; } const node = this.nearestNode(100); const elderNear = this.zone === 'village' && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1070, 645) < 120; if (node || elderNear) { const text = node ? `${RES_LABEL[node.getData('kind') as ResourceKey]} 채집 · E / 행동` : '촌장과 대화 · E / 행동'; this.actionLabel = this.add.text(this.player.x, this.player.y - 85, text, { fontFamily: 'Noto Sans KR', fontSize: '11px', color: '#fff2bd', stroke: '#18232a', strokeThickness: 5 }).setOrigin(.5).setDepth(4000); } }
  private nearestNode(radius: number) { let best: any, dist = radius; this.nodes.getChildren().forEach((n: any) => { if (!n.active || !n.getData('ready')) return; const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y); if (d < dist) { dist = d; best = n; } }); return best; }
  contextAction() { const node = this.nearestNode(105); if (node) { this.gather(node); return; } if (this.zone === 'village' && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1070, 645) < 130) { this.talk(); return; } notify('가까운 NPC나 채집물이 없습니다.'); }
  private gather(node: any) { const kind = node.getData('kind') as ResourceKey, amount = node.getData('amount') as number; node.setData('ready', false).setAlpha(.18).disableBody(true, false); this.save.resources[kind] += amount; notify(`${RES_LABEL[kind]} +${amount}`); if (this.save.quest === 3 && kind === 'ore' && this.save.resources.ore >= 5) { this.save.quest = 4; this.questReward('흑철광산 조사', 300, 180, 1); } persist(this.save); refreshHud(this.save); this.time.delayedCall(12000, () => { if (node.scene) { node.enableBody(false, node.x, node.y, true, true).setAlpha(1); node.setData('ready', true); } }); }
  private talk() { if (this.save.quest === 0) { this.save.quest = 1; notify('임무 시작 · 청운들판 요괴 5마리 토벌'); this.time.delayedCall(650, () => this.travel('field')); } else if (this.save.quest === 2) { this.save.quest = 3; this.questReward('백운에게 보고', 220, 300, 3); } else notify('채집과 제작, 시간제 보스 사냥으로 더 강해지게.'); persist(this.save); refreshHud(this.save); }
  private questReward(title: string, xp: number, gold: number, potions = 0) { this.save.gold += gold; this.save.potions += potions; this.gainXp(xp); notify(`✓ ${title} 완료 · 보너스 EXP +${xp} · ${gold}엽전${potions ? ` · 물약 ${potions}` : ''}`); this.cameras.main.flash(260, 255, 220, 90); }
  questNavigate() { if (this.save.quest === 0 || this.save.quest === 2) { if (this.zone !== 'village') this.enterZone('village', 1160, 790, true); this.autoTarget = new Phaser.Math.Vector2(1070, 720); notify('촌장 백운에게 자동이동합니다.'); } else if (this.save.quest === 1) this.travel('field'); else if (this.save.quest === 3) this.travel('mine'); else this.travel('forest'); }
  travel(zone: ZoneKey) { const min = ZONES[zone].minLevel; if (this.save.level < min) { notify(`${ZONES[zone].label}은 Lv.${min}부터 입장할 수 있습니다.`); return; } this.enterZone(zone, zone === 'village' ? 1160 : 260, zone === 'village' ? 790 : 680, true); if (zone === 'forest' && this.save.quest === 4 && this.save.level >= 10) { this.save.quest = 5; this.questReward('월영숲의 문', 500, 500, 2); persist(this.save); refreshHud(this.save); } }
  private enterZone(zone: ZoneKey, x: number, y: number, flash = true) { this.zone = zone; this.map.setTexture(ZONES[zone].map).setTint(ZONES[zone].tint); this.player.setPosition(x, y).setVelocity(0, 0); this.autoTarget = undefined; this.elder.setVisible(zone === 'village'); this.spawnZone(); q<HTMLElement>('.zone strong').textContent = `${ZONES[zone].label} · 권장 Lv.${ZONES[zone].minLevel}+`; if (flash) { this.cameras.main.flash(280, 240, 215, 150); notify(`${ZONES[zone].label}에 도착했습니다.`); } }

  attack() { if (this.inventoryOpen || this.time.now - this.lastAttack < 380) return; this.lastAttack = this.time.now; const point = new Phaser.Math.Vector2(this.player.x, this.player.y).add(this.facing.clone().scale(64)); let target: any, dist = 125; this.monsters.getChildren().forEach((m: any) => { if (!m.active) return; const d = Phaser.Math.Distance.Between(point.x, point.y, m.x, m.y); if (d < dist) { dist = d; target = m; } }); const slash = this.add.arc(point.x, point.y, 44, 220, 500, false, 0xffd877, .28).setStrokeStyle(5, 0xffefb0, .9).setDepth(3500); this.tweens.add({ targets: slash, alpha: 0, scale: 1.3, duration: 160, onComplete: () => slash.destroy() }); if (!target) return; const damage = Math.max(1, attackPower(this.save) + Phaser.Math.Between(-4, 6)); target.setData('hp', target.getData('hp') - damage); if (target.getData('hp') <= 0) this.defeat(target); }
  private defeat(m: any) { const x = m.x, y = m.y, xp = m.getData('xp') as number, gold = m.getData('gold') as number, name = m.getData('name') as string, bx = m.getData('bornX') as number, by = m.getData('bornY') as number, max = m.getData('maxHp') as number, boss = !!m.getData('isBoss'); m.disableBody(true, true); this.save.kills++; this.save.gold += gold; this.gainXp(xp); if (boss) this.defeatBoss(m, x, y); else { if (this.save.quest === 1 && this.save.kills >= 5) { this.save.quest = 2; this.questReward('청운들판 토벌', 100, 120, 1); } else notify(`${name} 처치 · EXP +${xp} · ${gold}엽전`); this.createDrop(x, y, 'gold', Phaser.Math.Between(2, 8)); if (Math.random() < .24) this.createDrop(x + 20, y, 'potion', 1); this.time.delayedCall(8000, () => { if (m.scene && this.zone !== 'village') { m.enableBody(true, bx + Phaser.Math.Between(-50, 50), by + Phaser.Math.Between(-50, 50), true, true); m.setData('hp', max); } }); } persist(this.save); refreshHud(this.save); }
  private defeatBoss(m: any, x: number, y: number) { const key = m.getData('bossKey') as string, chance = m.getData('rareChance') as number, rareItem = m.getData('rareItem') as RareItemKey; if (!this.save.bossKills.includes(key)) this.save.bossKills.push(key); this.bossEntity = undefined; this.bossEntityKey = undefined; this.createDrop(x - 25, y, 'gold', Phaser.Math.Between(80, 180)); this.createDrop(x + 10, y, 'potion', 3); const wonRare = Math.random() < chance; if (wonRare) this.createDrop(x + 45, y, 'rare', 1, rareItem); else { this.save.resources.crystal += 2; notify(`★ ${m.getData('name')} 격파! 희귀 장비는 실패 · 월광결정 +2`); } if (wonRare) notify(`★ ${m.getData('name')} 격파! 희귀 장비가 떨어졌다!`); this.cameras.main.flash(650, 255, 205, 60); }
  private createDrop(x: number, y: number, kind: 'gold' | 'potion' | 'rare', amount: number, rareItem?: RareItemKey) { const texture = kind === 'gold' ? 'coin' : kind === 'potion' ? 'drop-potion' : 'rare-drop'; const d = this.drops.create(x, y, texture); d.setData({ kind, amount, rareItem }).setDepth(y + 50); if (kind === 'rare') { d.setScale(1.15); this.tweens.add({ targets: d, angle: 360, duration: 2400, repeat: -1 }); } this.tweens.add({ targets: d, y: y - 16, duration: 240, yoyo: true, ease: 'Quad.out' }); }
  private collectDrop(d: any) { if (!d?.active) return; const kind = d.getData('kind') as string, amount = d.getData('amount') as number; if (kind === 'gold') this.save.gold += amount; else if (kind === 'potion') this.save.potions += amount; else if (kind === 'rare') { const item = d.getData('rareItem') as RareItemKey; if (!this.save.rareItems.includes(item)) { this.save.rareItems.push(item); notify(`★ 희귀 장비 획득 · ${RARE_ITEMS[item].label} · 자동 착용`); this.refreshGearVisual(); } else { this.save.resources.crystal += 5; notify(`중복 희귀 장비 분해 · 월광결정 +5`); } } d.destroy(); persist(this.save); refreshHud(this.save); }
  private hurt(m: any) { if (this.time.now - this.lastHurt < 900) return; this.lastHurt = this.time.now; const reduction = Math.min(.6, this.save.armorLevel * .04 + rareDefense(this.save)); this.save.hp -= Math.max(1, Math.round((m.getData('damage') as number) * (1 - reduction))); this.tryAutoPotion(); if (this.save.hp <= 0) { this.save.hp = maxHp(this.save); this.enterZone('village', 1160, 790, true); notify('기력이 다해 백운성에서 회복했습니다.'); } persist(this.save); refreshHud(this.save); }
  private tryAutoPotion() { if (!this.save.autoPotion || this.save.potions < 1 || this.time.now - this.lastAutoPotion < AUTO_POTION_COOLDOWN) return; if (this.save.hp / maxHp(this.save) <= AUTO_POTION_THRESHOLD) { this.lastAutoPotion = this.time.now; this.usePotion(true); } }
  private gainXp(amount: number) { this.save.xp += amount; while (this.save.xp >= this.save.level * 100) { this.save.xp -= this.save.level * 100; this.save.level++; this.save.hp = maxHp(this.save); if (this.save.level >= 5 && !this.save.unlocked.includes('mine')) this.save.unlocked.push('mine'); if (this.save.level >= 10 && !this.save.unlocked.includes('forest')) this.save.unlocked.push('forest'); notify(`레벨 업! Lv.${this.save.level} · 체력 완전 회복`); } }

  toggleInventory(force?: boolean) { this.inventoryOpen = force ?? !this.inventoryOpen; ui.inventory.classList.toggle('hidden', !this.inventoryOpen); if (this.inventoryOpen) this.player.setVelocity(0, 0); }
  toggleAutoPotion() { this.save.autoPotion = !this.save.autoPotion; persist(this.save); refreshHud(this.save); notify(`자동 물약 ${this.save.autoPotion ? 'ON' : 'OFF'}`); }
  toggleAutoLoot() { this.save.autoLoot = !this.save.autoLoot; persist(this.save); refreshHud(this.save); notify(`자동 줍기 ${this.save.autoLoot ? 'ON' : 'OFF'}`); }
  usePotion(auto = false) { if (this.save.potions < 1) { if (!auto) notify('회복약이 없습니다.'); return; } if (this.save.hp >= maxHp(this.save)) { if (!auto) notify('체력이 가득 찼습니다.'); return; } this.save.potions--; this.save.hp = Math.min(maxHp(this.save), this.save.hp + 65); persist(this.save); refreshHud(this.save); notify(auto ? '자동 물약 사용 · 체력 +65' : '체력 +65'); }
  craft(kind: 'potion' | 'weapon' | 'armor') { if (kind === 'potion') { if (this.save.resources.herb < 3) { notify('청심초 3개가 필요합니다.'); return; } this.save.resources.herb -= 3; this.save.potions += 2; notify('회복약 2개 제작 완료'); } else if (kind === 'weapon') { const ore = 2 + this.save.weaponLevel * 2, wood = 2; if (this.save.resources.ore < ore || this.save.resources.wood < wood) { notify(`흑철광석 ${ore} · 목재 ${wood} 필요`); return; } this.save.resources.ore -= ore; this.save.resources.wood -= wood; this.save.weaponLevel++; notify(`무기 +${this.save.weaponLevel} 완성 · 캐릭터 외형 반영`); } else { const ore = 3 + this.save.armorLevel * 2, crystal = this.save.armorLevel >= 2 ? 1 : 0; if (this.save.resources.ore < ore || this.save.resources.crystal < crystal) { notify(`흑철광석 ${ore}${crystal ? ` · 월광결정 ${crystal}` : ''} 필요`); return; } this.save.resources.ore -= ore; this.save.resources.crystal -= crystal; this.save.armorLevel++; this.save.hp = maxHp(this.save); notify(`방어구 +${this.save.armorLevel} 완성 · 캐릭터 외형 반영`); } this.save.crafted++; persist(this.save); refreshHud(this.save); this.refreshGearVisual(); }
}
