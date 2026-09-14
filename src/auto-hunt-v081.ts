import Phaser from 'phaser';
import './v081.css';

const AUTO_KEY = 'junja-world-auto-hunt-v081';
let enabled = false;
let lastAttackAt = 0;
let lastTravelAt = 0;
let currentTarget: any = null;

function getWorldScene(): any | null {
  const games = ((Phaser as any).GAMES || []) as any[];
  for (const game of games) {
    const manager = game?.scene;
    const byKey = manager?.keys?.world;
    if (byKey?.sys?.isActive?.()) return byKey;
    try {
      const scene = manager?.getScene?.('world');
      if (scene?.sys?.isActive?.()) return scene;
    } catch {}
  }
  return null;
}

function alive(entity: any) {
  return !!entity && entity.active !== false && entity.visible !== false && !entity.destroyed;
}

function getNearestTarget(scene: any) {
  const player = scene?.player;
  if (!player) return null;
  const list: any[] = [];
  if (alive(scene.bossEntity)) list.push(scene.bossEntity);
  const children = scene?.monsters?.getChildren?.() || [];
  for (const child of children) if (alive(child)) list.push(child);
  if (!list.length) return null;
  list.sort((a, b) => {
    const da = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
    const db = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
    return da - db;
  });
  return list[0] || null;
}

function setFacing(scene: any, target: any) {
  const player = scene?.player;
  const facing = scene?.facing;
  if (!player || !facing || !target) return;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const len = Math.hypot(dx, dy) || 1;
  facing.set(dx / len, dy / len);
}

function stopAutoMovement(scene: any) {
  try { scene.autoTarget = undefined; } catch {}
  try { scene.player?.body?.setVelocity?.(0, 0); } catch {}
}

function setEnabled(next: boolean, reason = '') {
  enabled = next;
  localStorage.setItem(AUTO_KEY, enabled ? '1' : '0');
  const scene = getWorldScene();
  if (!enabled && scene) stopAutoMovement(scene);
  currentTarget = null;
  renderButton(reason);
}

function renderButton(reason = '') {
  const button = document.querySelector<HTMLButtonElement>('#jw-auto-hunt');
  if (!button) return;
  button.classList.toggle('on', enabled);
  button.classList.toggle('busy', enabled && !!currentTarget);
  const title = button.querySelector('strong');
  const sub = button.querySelector('small');
  if (title) title.textContent = enabled ? '⚔ 자동사냥 ON' : '⚔ 자동사냥 OFF';
  if (sub) {
    if (reason) sub.textContent = reason;
    else if (!enabled) sub.textContent = '가까운 몬스터 자동 탐색';
    else if (currentTarget) sub.textContent = sceneTargetLabel(currentTarget);
    else sub.textContent = '사냥 대상 탐색 중';
  }
}

function sceneTargetLabel(target: any) {
  const name = target?.getData?.('label') || target?.getData?.('name') || target?.name;
  return name ? `${name} 추적 중` : '가까운 몬스터 추적 중';
}

function createButton() {
  if (document.querySelector('#jw-auto-hunt')) return;
  const button = document.createElement('button');
  button.id = 'jw-auto-hunt';
  button.className = 'jw-auto-hunt';
  button.type = 'button';
  button.innerHTML = '<strong>⚔ 자동사냥 OFF</strong><small>가까운 몬스터 자동 탐색</small>';
  button.addEventListener('click', () => setEnabled(!enabled));
  document.body.appendChild(button);
  renderButton();
}

function syncPaperDoll() {
  const doll = document.querySelector<HTMLElement>('.jw-paperdoll');
  if (!doll) return;
  try {
    const save = JSON.parse(localStorage.getItem('junja-world-v01') || 'null');
    if (!save) return;
    doll.dataset.class = String(save.heroClass || 'warrior');
    doll.classList.toggle('has-weapon', Number(save.weaponLevel || 0) > 0 || (save.rareItems || []).includes('blackIronBlade'));
    doll.classList.toggle('has-armor', Number(save.armorLevel || 0) > 0);
    doll.classList.toggle('rare', Array.isArray(save.rareItems) && save.rareItems.length > 0);
    const weaponSlot = doll.querySelector<HTMLElement>('.s3');
    const armorSlot = doll.querySelector<HTMLElement>('.s2');
    if (weaponSlot) weaponSlot.innerHTML = `劍<small>무기 +${Number(save.weaponLevel || 0)}</small>`;
    if (armorSlot) armorSlot.innerHTML = `衣<small>갑옷 +${Number(save.armorLevel || 0)}</small>`;
  } catch {}
}

function stepAutoHunt() {
  if (!enabled) return;
  const gameUi = document.querySelector('#game-ui');
  if (!gameUi || gameUi.classList.contains('hidden')) return;
  const scene = getWorldScene();
  if (!scene?.player) {
    renderButton('게임 준비 중');
    return;
  }

  if (scene.zone === 'village') {
    const now = performance.now();
    if (now - lastTravelAt > 2500) {
      lastTravelAt = now;
      try {
        scene.travel?.('field');
        renderButton('청운들판으로 이동 중');
      } catch {
        renderButton('사냥터 이동 대기');
      }
    }
    return;
  }

  if (!alive(currentTarget)) currentTarget = getNearestTarget(scene);
  if (!currentTarget) {
    stopAutoMovement(scene);
    renderButton('몬스터 재생성 대기');
    return;
  }

  const player = scene.player;
  const distance = Phaser.Math.Distance.Between(player.x, player.y, currentTarget.x, currentTarget.y);
  setFacing(scene, currentTarget);

  if (distance > 104) {
    scene.autoTarget = new Phaser.Math.Vector2(currentTarget.x, currentTarget.y);
    renderButton();
    return;
  }

  stopAutoMovement(scene);
  const now = performance.now();
  if (now - lastAttackAt >= 560) {
    lastAttackAt = now;
    try { scene.attack?.(); } catch {}
  }
  renderButton();
}

function bindQuestPriority() {
  const quest = document.querySelector<HTMLElement>('#quest-panel');
  if (quest && quest.dataset.autoHuntGuard !== '1') {
    quest.dataset.autoHuntGuard = '1';
    quest.addEventListener('click', () => {
      if (enabled) setEnabled(false, '퀘스트 자동이동 우선');
    }, { capture: true });
  }
  document.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach(button => {
    if (button.dataset.autoHuntGuard === '1') return;
    button.dataset.autoHuntGuard = '1';
    button.addEventListener('click', () => { currentTarget = null; }, { capture: true });
  });
}

function boot() {
  createButton();
  bindQuestPriority();
  syncPaperDoll();
  enabled = localStorage.getItem(AUTO_KEY) === '1';
  renderButton();
  window.setInterval(stepAutoHunt, 140);
  window.setInterval(syncPaperDoll, 700);
  window.setInterval(bindQuestPriority, 1200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
