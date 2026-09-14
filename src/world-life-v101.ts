import Phaser from 'phaser';
import './v101.css';

const trackedGames = new Set<any>();
const npcState = new WeakMap<any,{npcs:any[]; zone:string}>();
const actionPatched = new WeakSet<any>();
const eliteState = new WeakMap<any,{zone:string; elite:any|null}>();

function installTracking(){
  const proto=(Phaser.Game as any)?.prototype;
  if(!proto || proto.__jwV101Tracked) return;
  const boot=proto.boot, destroy=proto.destroy;
  if(typeof boot==='function') proto.boot=function(...args:any[]){trackedGames.add(this); return boot.apply(this,args);};
  if(typeof destroy==='function') proto.destroy=function(...args:any[]){trackedGames.delete(this); return destroy.apply(this,args);};
  proto.__jwV101Tracked=true;
}
installTracking();

function scene():any|null{
  const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];
  for(const game of games){const s=game?.scene?.keys?.world;if(s?.sys?.isActive?.()) return s;try{const x=game?.scene?.getScene?.('world');if(x?.sys?.isActive?.())return x;}catch{}}
  return null;
}

function makeTexture(s:any,key:string,robe:number,accent:number){
  if(s.textures.exists(key)) return;
  const g=s.add.graphics();
  g.fillStyle(0x111816,.25).fillEllipse(24,64,34,8);
  g.fillStyle(0xe0b089).fillCircle(24,18,12);
  g.fillStyle(0x27211d).fillRoundedRect(13,4,22,13,6);
  g.fillStyle(robe).fillRoundedRect(11,29,26,30,8);
  g.fillStyle(accent).fillRect(20,30,8,26);
  g.fillStyle(0x242a27).fillRect(13,56,9,10).fillRect(26,56,9,10);
  g.lineStyle(2,0x19211e,.85).strokeRoundedRect(11,29,26,30,8);
  g.generateTexture(key,48,70);g.destroy();
}

const npcDefs=[
  {id:'merchant',key:'jw101-merchant',x:900,y:720,name:'상인 연화',role:'백운성 잡화상',robe:0x7c4e42,accent:0xd9b764,lines:['여행에는 준비가 반이야. 제작소에서 장비를 먼저 챙겨.','강화 수치가 높아지면 장비 외형도 달라질 거야.']},
  {id:'guard',key:'jw101-guard',x:1310,y:725,name:'경비 무진',role:'백운성 수비대',robe:0x3f5e6c,accent:0xc69c4f,lines:['성 밖은 요괴가 많다. 자동사냥을 켜도 체력은 꼭 확인해.','정예 요괴는 덩치가 크고 보상도 더 좋다.']},
  {id:'herbalist',key:'jw101-herbalist',x:820,y:900,name:'약초꾼 소담',role:'약초와 채집 안내',robe:0x526b47,accent:0xa8bf72,lines:['청심초를 모으면 회복약을 만들 수 있어.','광산과 숲에는 더 귀한 재료가 숨어 있단다.']}
];

function createNpc(s:any,def:any){
  makeTexture(s,def.key,def.robe,def.accent);
  const shadow=s.add.ellipse(0,31,34,9,0x0c1712,.28);
  const art=s.add.image(0,0,def.key);
  const mark=s.add.text(0,-46,'◆',{fontFamily:'serif',fontSize:'11px',color:'#e7c771',stroke:'#2c2112',strokeThickness:3}).setOrigin(.5);
  const label=s.add.text(0,43,def.name,{fontFamily:'Noto Sans KR',fontSize:'9px',fontStyle:'bold',color:'#f3ead0',stroke:'#111917',strokeThickness:4}).setOrigin(.5);
  const c=s.add.container(def.x,def.y,[shadow,art,mark,label]).setDepth(def.y+24);
  c.setData('jwNpc',def);
  s.tweens.add({targets:art,y:{from:-1,to:1},duration:1100+Math.round(def.x%250),yoyo:true,repeat:-1,ease:'Sine.inOut'});
  return c;
}

function ensureNpcs(s:any){
  const zone=String(s.zone||'village');
  let state=npcState.get(s);
  if(!state){state={npcs:npcDefs.map(d=>createNpc(s,d)),zone};npcState.set(s,state);}
  state.zone=zone;
  state.npcs.forEach((n:any)=>n.setVisible(zone==='village'));
}

function nearestNpc(s:any,radius=120){
  const state=npcState.get(s);if(!state||String(s.zone)!=='village')return null;
  let best:any=null,bestD=radius;
  for(const n of state.npcs){if(!n.visible)continue;const d=Phaser.Math.Distance.Between(s.player.x,s.player.y,n.x,n.y);if(d<bestD){bestD=d;best=n;}}
  return best;
}

function createDialogue(){
  if(document.querySelector('.jw-dialogue'))return;
  const box=document.createElement('section');box.className='jw-dialogue hidden';
  box.innerHTML='<div class="jw-dialogue-head"><div><b id="jw-dialogue-name">NPC</b><span id="jw-dialogue-role">백운성 주민</span></div><button type="button" id="jw-dialogue-close">×</button></div><p id="jw-dialogue-text"></p><div class="jw-dialogue-hint">대화를 닫고 이동을 계속할 수 있습니다.</div>';
  document.body.appendChild(box);
  box.querySelector('#jw-dialogue-close')?.addEventListener('click',()=>box.classList.add('hidden'));
}

function showDialogue(npc:any){
  createDialogue();const box=document.querySelector<HTMLElement>('.jw-dialogue');const def=npc?.getData?.('jwNpc');if(!box||!def)return;
  const name=box.querySelector<HTMLElement>('#jw-dialogue-name');const role=box.querySelector<HTMLElement>('#jw-dialogue-role');const text=box.querySelector<HTMLElement>('#jw-dialogue-text');
  if(name)name.textContent=def.name;if(role)role.textContent=def.role;if(text)text.textContent=def.lines[Math.floor(Math.random()*def.lines.length)];box.classList.remove('hidden');
}

function patchAction(s:any){
  if(actionPatched.has(s)||typeof s.contextAction!=='function')return;
  const original=s.contextAction.bind(s);
  s.contextAction=function(){const npc=nearestNpc(s);if(npc){showDialogue(npc);return;}original();};
  actionPatched.add(s);
}

function createEliteAlert(){
  if(document.querySelector('.jw-elite-alert'))return;const el=document.createElement('div');el.className='jw-elite-alert';el.textContent='정예 요괴가 출현했습니다';document.body.appendChild(el);
}
function alertElite(name:string){createEliteAlert();const el=document.querySelector<HTMLElement>('.jw-elite-alert');if(!el)return;el.textContent=`⚠ ${name} 출현`;el.classList.add('show');window.setTimeout(()=>el.classList.remove('show'),2200);}

function chooseElite(s:any){
  const zone=String(s.zone||'village');let state=eliteState.get(s);
  if(!state||state.zone!==zone){state={zone,elite:null};eliteState.set(s,state);}
  if(zone==='village'){state.elite=null;return;}
  if(state.elite?.scene) return;
  const candidates=(s.monsters?.getChildren?.()||[]).filter((m:any)=>m?.active&&!m.getData?.('isBoss'));
  const m=candidates[0];if(!m)return;
  const baseMax=Number(m.getData?.('jwBaseMaxHp')||m.getData?.('maxHp')||m.getData?.('hp')||50);
  const baseDmg=Number(m.getData?.('jwBaseDamage')||m.getData?.('damage')||5);
  const baseXp=Number(m.getData?.('jwBaseXp')||m.getData?.('xp')||10);
  const baseGold=Number(m.getData?.('jwBaseGold')||m.getData?.('gold')||5);
  if(!m.getData?.('jwBaseMaxHp')){m.setData?.('jwBaseMaxHp',baseMax);m.setData?.('jwBaseDamage',baseDmg);m.setData?.('jwBaseXp',baseXp);m.setData?.('jwBaseGold',baseGold);}
  const max=Math.round(baseMax*2.2);
  m.setData?.('maxHp',max);m.setData?.('hp',max);m.setData?.('damage',Math.max(1,Math.round(baseDmg*1.35)));m.setData?.('xp',Math.round(baseXp*2.1));m.setData?.('gold',Math.round(baseGold*2.4));
  const raw=String(m.getData?.('name')||'요괴').replace(/^정예\s+/,'');m.setData?.('name',`정예 ${raw}`);m.setData?.('jwElite',true);
  m.setScale?.((m.scaleX||1)*1.2);m.setTint?.(zone==='mine'?0xd2adff:zone==='forest'?0xc8df87:0xf0bc72);
  state.elite=m;alertElite(`정예 ${raw}`);
}

function version(){document.querySelectorAll<HTMLElement>('.login-footer span').forEach(n=>{if(n.textContent?.includes('JUNJA WORLD'))n.textContent='JUNJA WORLD v1.0.1';});const b=document.querySelector<HTMLElement>('.jw-v09-badge b');if(b)b.textContent='JUNJA WORLD v1.0.1';}

function tick(){const s=scene();if(!s?.player)return;ensureNpcs(s);patchAction(s);chooseElite(s);}
function boot(){createDialogue();createEliteAlert();version();window.setInterval(tick,300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
