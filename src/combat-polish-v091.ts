import Phaser from 'phaser';
import './v091.css';
import { HERO_CLASSES, type HeroClass } from '../shared/constants';

const trackedGames = new Set<any>();
const styledMonsters = new WeakSet<any>();
let lastSkillAt = -99999;
const SKILL_COOLDOWN = 5000;

function installTracking() {
  const proto = (Phaser.Game as any)?.prototype;
  if (!proto || proto.__jwV091Tracked) return;
  const originalBoot = proto.boot;
  if (typeof originalBoot === 'function') {
    proto.boot = function (...args: any[]) {
      trackedGames.add(this);
      return originalBoot.apply(this, args);
    };
  }
  const originalDestroy = proto.destroy;
  if (typeof originalDestroy === 'function') {
    proto.destroy = function (...args: any[]) {
      trackedGames.delete(this);
      return originalDestroy.apply(this, args);
    };
  }
  proto.__jwV091Tracked = true;
}

installTracking();

function scene(): any | null {
  const games = [...trackedGames, ...((((Phaser as any).GAMES || []) as any[]))];
  for (const game of games) {
    const world = game?.scene?.keys?.world;
    if (world?.sys?.isActive?.()) return world;
    try {
      const found = game?.scene?.getScene?.('world');
      if (found?.sys?.isActive?.()) return found;
    } catch {}
  }
  return null;
}

function saveData(): any {
  try { return JSON.parse(localStorage.getItem('junja-world-v01') || 'null'); } catch { return null; }
}

function attackPower(save: any) {
  const hero = (save?.heroClass || 'warrior') as HeroClass;
  const base = HERO_CLASSES[hero]?.attack || 20;
  const rares = Array.isArray(save?.rareItems) ? save.rareItems : [];
  const rareBonus = rares.includes('blackIronBlade') ? 14 : 0;
  return base + Math.max(0, Number(save?.level || 1) - 1) * 5 + Number(save?.weaponLevel || 0) * 5 + rareBonus;
}

function alive(m: any) { return !!m && m.active !== false && m.visible !== false && !m.destroyed; }

function nearestMonsters(s: any, radius: number) {
  const p = s?.player;
  if (!p) return [];
  const list = (s?.monsters?.getChildren?.() || []).filter((m: any) => alive(m));
  if (alive(s?.bossEntity) && !list.includes(s.bossEntity)) list.push(s.bossEntity);
  return list
    .map((m: any) => ({ m, d: Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) }))
    .filter((x: any) => x.d <= radius)
    .sort((a: any, b: any) => a.d - b.d);
}

function floatingDamage(s: any, target: any, damage: number, color = '#ffe082') {
  try {
    const text = s.add.text(target.x, target.y - 48, `-${damage}`, {
      fontFamily: 'Noto Sans KR', fontSize: '16px', fontStyle: 'bold', color,
      stroke: '#17110b', strokeThickness: 4
    }).setOrigin(.5).setDepth(target.y + 100);
    s.tweens.add({ targets:text, y:text.y - 34, alpha:0, duration:520, ease:'Cubic.out', onComplete:() => text.destroy() });
  } catch {}
}

function hitTarget(s: any, target: any, damage: number, color?: string) {
  if (!alive(target)) return;
  const hp = Number(target.getData?.('hp') || 0) - damage;
  target.setData?.('hp', hp);
  floatingDamage(s, target, damage, color);
  try {
    target.setTintFill?.(0xffffff);
    s.time.delayedCall(80, () => target?.clearTint?.());
  } catch {}
  if (hp <= 0) {
    try { s.defeat?.(target); } catch {}
  }
}

function flashScreen() {
  const el = document.querySelector<HTMLElement>('.jw-combat-flash');
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function warriorSkill(s: any, power: number) {
  const targets = nearestMonsters(s, 165).slice(0, 3);
  if (!targets.length) return false;
  const p = s.player;
  const arc = s.add.arc(p.x, p.y, 96, 210, 510, false, 0xffcf66, .20).setStrokeStyle(9, 0xffe7a3, .92).setDepth(p.y + 80);
  s.tweens.add({ targets:arc, scale:1.35, alpha:0, duration:250, onComplete:() => arc.destroy() });
  targets.forEach(({m}: any) => hitTarget(s, m, Math.max(1, Math.round(power * 1.5)), '#ffd77a'));
  return true;
}

function mageSkill(s: any, power: number) {
  const targets = nearestMonsters(s, 225).slice(0, 6);
  if (!targets.length) return false;
  const p = s.player;
  const ring = s.add.circle(p.x, p.y, 42, 0x6cc9ff, .12).setStrokeStyle(5, 0xa6e8ff, .9).setDepth(p.y + 70);
  s.tweens.add({ targets:ring, scale:4.6, alpha:0, duration:430, ease:'Cubic.out', onComplete:() => ring.destroy() });
  targets.forEach(({m}: any, i: number) => {
    s.time.delayedCall(i * 45, () => hitTarget(s, m, Math.max(1, Math.round(power * 1.25)), '#9be7ff'));
  });
  return true;
}

function rangerSkill(s: any, power: number) {
  const target = nearestMonsters(s, 390)[0]?.m;
  if (!target) return false;
  const p = s.player;
  const line = s.add.line(0, 0, p.x, p.y, target.x, target.y, 0xb8f08a, .9).setOrigin(0).setLineWidth(4).setDepth(Math.max(p.y,target.y)+90);
  s.tweens.add({ targets:line, alpha:0, duration:180, onComplete:() => line.destroy() });
  hitTarget(s, target, Math.max(1, Math.round(power * 1.7)), '#c9ff96');
  return true;
}

function useSkill(fromAuto = false) {
  const s = scene();
  if (!s?.player || s.zone === 'village') return false;
  const now = performance.now();
  if (now - lastSkillAt < SKILL_COOLDOWN) return false;
  const save = saveData();
  if (!save) return false;
  const hero = (save.heroClass || 'warrior') as HeroClass;
  const power = attackPower(save);
  let used = false;
  if (hero === 'mage') used = mageSkill(s, power);
  else if (hero === 'ranger') used = rangerSkill(s, power);
  else used = warriorSkill(s, power);
  if (!used) return false;
  lastSkillAt = now;
  flashScreen();
  try { s.cameras?.main?.shake?.(hero === 'warrior' ? 90 : 55, hero === 'warrior' ? .004 : .002); } catch {}
  renderSkillButton(fromAuto ? '자동 발동' : '사용 완료');
  return true;
}

function skillName(hero: HeroClass) {
  if (hero === 'mage') return '천뢰진';
  if (hero === 'ranger') return '관통시';
  return '월광참';
}

function renderSkillButton(reason = '') {
  const button = document.querySelector<HTMLButtonElement>('#jw-skill-button');
  if (!button) return;
  const save = saveData();
  const hero = (save?.heroClass || 'warrior') as HeroClass;
  const elapsed = performance.now() - lastSkillAt;
  const left = Math.max(0, SKILL_COOLDOWN - elapsed);
  const ready = left <= 0;
  button.classList.toggle('ready', ready);
  button.classList.toggle('cooldown', !ready);
  const strong = button.querySelector('strong');
  const small = button.querySelector('small');
  if (strong) strong.textContent = `✦ ${skillName(hero)} · Q`;
  if (small) small.textContent = reason || (ready ? '사용 가능' : `재사용 ${(left / 1000).toFixed(1)}초`);
}

function createUi() {
  if (!document.querySelector('.jw-combat-flash')) {
    const flash = document.createElement('div');
    flash.className = 'jw-combat-flash';
    document.body.appendChild(flash);
  }
  if (!document.querySelector('#jw-skill-button')) {
    const button = document.createElement('button');
    button.id = 'jw-skill-button';
    button.className = 'jw-skill-button ready';
    button.type = 'button';
    button.innerHTML = '<strong>✦ 월광참 · Q</strong><small>사용 가능</small>';
    button.addEventListener('click', () => useSkill(false));
    document.body.appendChild(button);
  }
}

function styleMonsters() {
  const s = scene();
  if (!s?.monsters) return;
  const zone = String(s.zone || 'field');
  for (const m of s.monsters.getChildren?.() || []) {
    if (!alive(m) || styledMonsters.has(m)) continue;
    const seed = Math.abs(Math.round((m.x || 0) + (m.y || 0))) % 3;
    try {
      if (zone === 'mine') m.setTint?.(seed === 0 ? 0xaeb4c7 : seed === 1 ? 0x8c92aa : 0xc0a6d2);
      else if (zone === 'forest') m.setTint?.(seed === 0 ? 0x91bb82 : seed === 1 ? 0xb0c777 : 0x77a991);
      else m.setTint?.(seed === 0 ? 0x9bcfbc : seed === 1 ? 0xb3d58f : 0x8ebcca);
      m.setScale?.((m.scaleX || 1) * (0.94 + seed * .05));
    } catch {}
    styledMonsters.add(m);
  }
}

function bindKeys() {
  window.addEventListener('keydown', e => {
    const target = e.target as HTMLElement | null;
    if (target?.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (e.code === 'KeyQ') {
      e.preventDefault();
      useSkill(false);
    }
  });
}

function autoSkillTick() {
  const auto = document.querySelector('#jw-auto-hunt');
  if (!auto?.classList.contains('on')) return;
  useSkill(true);
}

function setVersion() {
  document.querySelectorAll<HTMLElement>('.login-footer span').forEach(node => {
    if (node.textContent?.includes('JUNJA WORLD')) node.textContent = 'JUNJA WORLD v0.9.1';
  });
  const badge = document.querySelector<HTMLElement>('.jw-v09-badge b');
  if (badge) badge.textContent = 'JUNJA WORLD v0.9.1';
}

function boot() {
  createUi();
  bindKeys();
  setVersion();
  window.setInterval(renderSkillButton, 120);
  window.setInterval(styleMonsters, 700);
  window.setInterval(autoSkillTick, 900);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
