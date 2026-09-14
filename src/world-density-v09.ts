import Phaser from 'phaser';
import './v09.css';

const trackedGames = new Set<any>();
const decorated = new WeakMap<any, { zone: string; objects: any[] }>();
const gearPatched = new WeakSet<any>();

function installGameTracking() {
  const proto = (Phaser.Game as any)?.prototype;
  if (!proto || proto.__jwV09Tracked) return;
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
  proto.__jwV09Tracked = true;
}

installGameTracking();

function worldScene(): any | null {
  const globalGames = (((Phaser as any).GAMES || []) as any[]);
  for (const game of [...trackedGames, ...globalGames]) {
    const scene = game?.scene?.keys?.world;
    if (scene?.sys?.isActive?.()) return scene;
    try {
      const found = game?.scene?.getScene?.('world');
      if (found?.sys?.isActive?.()) return found;
    } catch {}
  }
  return null;
}

function makeTexture(scene: any, key: string, w: number, h: number, paint: (g: any) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function ensureTextures(scene: any) {
  makeTexture(scene, 'jw09-lantern', 32, 54, g => {
    g.fillStyle(0x2b1c12).fillRect(14, 0, 4, 18).fillRect(8, 16, 16, 3);
    g.fillStyle(0x56321d).fillRoundedRect(6, 18, 20, 28, 5);
    g.fillStyle(0xffd577).fillRoundedRect(9, 21, 14, 20, 4);
    g.lineStyle(2, 0x9b5a2b, 1).strokeRoundedRect(6, 18, 20, 28, 5);
    g.fillStyle(0x24170e).fillRect(11, 46, 10, 4);
  });
  makeTexture(scene, 'jw09-banner', 48, 86, g => {
    g.fillStyle(0x3a2618).fillRect(21, 0, 5, 86);
    g.fillStyle(0x7e2f2b).fillRoundedRect(5, 8, 35, 49, 3);
    g.fillStyle(0xc8934d).fillTriangle(5, 57, 22, 73, 40, 57);
    g.lineStyle(2, 0xd3b16c, .75).strokeRoundedRect(7, 10, 31, 43, 2);
  });
  makeTexture(scene, 'jw09-bush', 72, 54, g => {
    g.fillStyle(0x0e1a13, .24).fillEllipse(36, 47, 58, 12);
    g.fillStyle(0x315d39).fillCircle(23, 31, 17).fillCircle(38, 24, 20).fillCircle(51, 32, 16);
    g.fillStyle(0x4d7e48).fillCircle(30, 22, 10).fillCircle(47, 20, 9);
    g.fillStyle(0x8eb85f).fillCircle(22, 20, 4).fillCircle(54, 27, 4);
  });
  makeTexture(scene, 'jw09-fence', 92, 46, g => {
    g.fillStyle(0x4b331f).fillRect(5, 12, 6, 33).fillRect(81, 12, 6, 33);
    g.fillStyle(0x6c4a2b).fillRoundedRect(0, 18, 92, 8, 3).fillRoundedRect(0, 33, 92, 7, 3);
    g.lineStyle(2, 0x9b7045, .45).lineBetween(4, 20, 88, 20).lineBetween(4, 35, 88, 35);
  });
  makeTexture(scene, 'jw09-stone', 58, 28, g => {
    g.fillStyle(0x17201c, .18).fillEllipse(29, 23, 50, 8);
    g.fillStyle(0x8d9284).fillEllipse(29, 15, 46, 21);
    g.fillStyle(0xaeb09f).fillEllipse(24, 11, 26, 8);
    g.lineStyle(1, 0x666b60, .65).strokeEllipse(29, 15, 46, 21);
  });
  makeTexture(scene, 'jw09-flower', 42, 38, g => {
    g.lineStyle(2, 0x416c3e, .85).lineBetween(21, 35, 21, 15).lineBetween(19, 26, 12, 21).lineBetween(22, 24, 30, 19);
    g.fillStyle(0xd88b9f).fillCircle(16, 13, 5).fillCircle(24, 11, 5).fillCircle(21, 18, 5);
    g.fillStyle(0xf0d577).fillCircle(21, 14, 3);
  });
  makeTexture(scene, 'jw09-crystal', 40, 52, g => {
    g.fillStyle(0x18222a, .2).fillEllipse(20, 47, 34, 8);
    g.fillStyle(0x63b9d0).fillTriangle(20, 2, 31, 41, 18, 49).fillTriangle(20, 2, 9, 40, 18, 49);
    g.fillStyle(0xc4f4ff, .7).fillTriangle(20, 5, 23, 31, 17, 37);
  });
}

function addSprite(scene: any, objects: any[], key: string, x: number, y: number, scale = 1, depthOffset = 0, tint?: number) {
  const s = scene.add.image(x, y, key).setScale(scale).setDepth(y + depthOffset);
  if (tint) s.setTint(tint);
  objects.push(s);
  return s;
}

function addVillage(scene: any, objects: any[]) {
  [[920,660],[1220,650],[860,860],[1320,850]].forEach(([x,y],i) => {
    const l = addSprite(scene, objects, 'jw09-lantern', x, y, 1, 20);
    const glow = scene.add.circle(x, y + 10, 34, 0xffc766, .08).setDepth(y + 5);
    objects.push(glow);
    scene.tweens.add({ targets:[l,glow], alpha:{from:.72,to:1}, duration:900 + i*120, yoyo:true, repeat:-1 });
  });
  [[780,630],[1450,640]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-banner', x, y, 1, 8));
  [[720,760],[770,790],[1510,760],[1450,820],[900,980],[1320,980]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-bush', x, y, .9, 2));
  [[650,920],[735,920],[1490,925],[1575,925]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-fence', x, y, .9, 0));
  [[1010,820],[1080,842],[1150,826],[1215,850]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-stone', x, y, .78, -4));
  [[830,900],[890,910],[1380,910],[1435,890]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-flower', x, y, .85, 4));
}

function addField(scene: any, objects: any[]) {
  for (let i = 0; i < 12; i++) {
    const x = 420 + (i % 6) * 260 + (i % 2) * 45;
    const y = 430 + Math.floor(i / 6) * 610 + (i % 3) * 38;
    addSprite(scene, objects, i % 3 === 0 ? 'jw09-flower' : 'jw09-bush', x, y, i % 3 === 0 ? .8 : .7, 0);
  }
}

function addMine(scene: any, objects: any[]) {
  [[520,420],[910,500],[1320,460],[1680,600],[770,980],[1430,1040]].forEach(([x,y],i) => {
    const c = addSprite(scene, objects, 'jw09-crystal', x, y, 1 + (i%2)*.18, 5, i%2 ? 0x9c8dff : 0x73d7ef);
    scene.tweens.add({ targets:c, alpha:{from:.62,to:1}, duration:850 + i*90, yoyo:true, repeat:-1 });
  });
  [[640,700],[1540,760]].forEach(([x,y]) => addSprite(scene, objects, 'jw09-lantern', x, y, 1, 8, 0xdca96b));
}

function addForest(scene: any, objects: any[]) {
  [[470,520],[730,680],[980,470],[1260,700],[1510,500],[1770,760],[860,1080],[1390,1100]].forEach(([x,y],i) => {
    const b = addSprite(scene, objects, 'jw09-bush', x, y, 1.05, 2, i%2 ? 0x7ba566 : 0x6e9560);
    if (i % 3 === 0) scene.tweens.add({ targets:b, angle:{from:-1.2,to:1.2}, duration:1500, yoyo:true, repeat:-1 });
  });
  for (let i=0;i<10;i++) {
    const dot = scene.add.circle(500 + (i*137)%1250, 420 + (i*83)%700, 2 + (i%2), 0xe4f29a, .6).setDepth(10);
    objects.push(dot);
    scene.tweens.add({ targets:dot, y:dot.y-34-(i%3)*12, x:dot.x+18-(i%2)*36, alpha:{from:.15,to:.9}, duration:1800+i*170, yoyo:true, repeat:-1 });
  }
}

function clearDecoration(state?: { objects: any[] }) {
  if (!state) return;
  for (const obj of state.objects) {
    try { obj?.destroy?.(); } catch {}
  }
}

function decorate(scene: any) {
  ensureTextures(scene);
  const zone = String(scene.zone || 'village');
  const prev = decorated.get(scene);
  if (prev?.zone === zone) return;
  clearDecoration(prev);
  const objects: any[] = [];
  if (zone === 'village') addVillage(scene, objects);
  else if (zone === 'field') addField(scene, objects);
  else if (zone === 'mine') addMine(scene, objects);
  else addForest(scene, objects);
  decorated.set(scene, { zone, objects });
}

function patchGear(scene: any) {
  if (gearPatched.has(scene) || typeof scene.updateGearVisual !== 'function') return;
  const original = scene.updateGearVisual.bind(scene);
  scene.updateGearVisual = function(time: number) {
    original(time);
    const player = scene.player;
    const facing = scene.facing;
    const weapon = scene.gearWeapon;
    const armor = scene.gearArmor;
    if (!player || !facing || !weapon || !armor) return;
    const movingSide = Math.abs(facing.x) > Math.abs(facing.y);
    const up = facing.y < -.35 && !movingSide;
    const down = facing.y > .35 && !movingSide;
    if (up) {
      weapon.setPosition(player.x - 18, player.y + 2).setRotation(-.32).setDepth(player.y - 8).setAlpha(.82);
      armor.setPosition(player.x, player.y + 4).setDepth(player.y + 8).setAlpha(.9);
    } else if (down) {
      weapon.setPosition(player.x + 24, player.y + 5).setRotation(.22).setDepth(player.y + 24).setAlpha(1);
      armor.setPosition(player.x, player.y + 3).setDepth(player.y + 15).setAlpha(1);
    } else {
      const side = facing.x < 0 ? -1 : 1;
      weapon.setPosition(player.x + side * 27, player.y + 3).setFlipX(side < 0).setRotation(side < 0 ? -.22 : .22).setDepth(player.y + 19).setAlpha(1);
      armor.setPosition(player.x, player.y + 3).setDepth(player.y + 11).setAlpha(.96);
    }
  };
  gearPatched.add(scene);
}

function addVersionBadge() {
  if (document.querySelector('.jw-v09-badge')) return;
  const badge = document.createElement('div');
  badge.className = 'jw-v09-badge';
  badge.innerHTML = '<b>JUNJA WORLD v0.9</b> · WORLD REBUILD';
  document.body.appendChild(badge);
}

function setVersionLabel() {
  document.querySelectorAll<HTMLElement>('.login-footer span').forEach(node => {
    if (node.textContent?.includes('JUNJA WORLD')) node.textContent = 'JUNJA WORLD v0.9.0';
  });
}

function tick() {
  const scene = worldScene();
  if (!scene?.player) return;
  patchGear(scene);
  decorate(scene);
}

function boot() {
  addVersionBadge();
  setVersionLabel();
  window.setInterval(tick, 350);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
