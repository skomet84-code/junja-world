import Phaser from 'phaser';
import './v16.css';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../shared/constants';

const VERSION='1.6.0';
const trackedGames=new Set<any>();
const sceneStates=new WeakMap<any,{zone:string;plates:Plate[];patrols:any[]}>();
type Plate={m:any;label:any;bg:any;fill:any;badge:any};

const zoneMeta:Record<string,{label:string;range:string;bg:string}>={
  village:{label:'백운성',range:'안전 지역',bg:'#183328'},
  field:{label:'청운들판',range:'권장 Lv.1~7',bg:'#244b32'},
  mine:{label:'흑철광산',range:'권장 Lv.5~14',bg:'#2f3540'},
  forest:{label:'월영숲',range:'권장 Lv.10+',bg:'#273745'}
};

function installTracking(){
  const proto=(Phaser.Game as any)?.prototype;
  if(!proto||proto.__jwV16Tracked)return;
  const boot=proto.boot,destroy=proto.destroy;
  if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};
  if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};
  proto.__jwV16Tracked=true;
}
installTracking();

function scene():any|null{
  const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];
  for(const game of games){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}

function createHud(){
  if(!document.querySelector('.jw16-world-panel')){
    const panel=document.createElement('aside');panel.className='jw16-world-panel';
    panel.innerHTML='<div class="jw16-world-head"><b>지역 지도 · v1.6</b><span id="jw16-zone-label">백운성</span></div><div class="jw16-map-wrap"><canvas id="jw16-minimap" width="238" height="132"></canvas></div><div class="jw16-map-legend"><span><b>●</b> 내 위치</span><span>● 요괴</span><span>● 채집물</span></div><div class="jw16-world-stats"><span id="jw16-zone-range">안전 지역</span><span id="jw16-density">주민 순찰중</span></div>';
    document.body.appendChild(panel);
  }
  if(!document.querySelector('.jw16-compass')){
    const button=document.createElement('button');button.type='button';button.className='jw16-compass';
    button.innerHTML='<span class="jw16-compass-arrow">↑</span><span class="jw16-compass-copy"><b>메인 임무 추적</b><small>임무를 누르면 자동이동</small></span>';
    button.addEventListener('click',()=>document.querySelector<HTMLElement>('#quest-panel')?.click());
    document.body.appendChild(button);
  }
  if(!document.querySelector('.jw16-patrol-badge')){
    const badge=document.createElement('div');badge.className='jw16-patrol-badge';badge.innerHTML='<b>백운성 경비대</b> · 순찰 중';document.body.appendChild(badge);
  }
}

function syncVersion(){
  // Version display is owned by version-v15.ts. Do not rewrite it from this 120ms world tick.
}

function alive(o:any){return !!o&&o.active!==false&&o.visible!==false&&!o.destroyed;}
function knownRegular(name:string){return /들슬라임|푸른 물방울|도깨비불|광산박쥐|흑철골렘|동굴도깨비|월영늑대|그림자요괴|고목정령/.test(name);}
function archetype(name:string){
  if(/골렘|고목/.test(name))return '강인';
  if(/박쥐|늑대/.test(name))return '민첩';
  if(/도깨비불|그림자/.test(name))return '술법';
  if(/푸른/.test(name))return '원소';
  return '일반';
}
function tintAndScale(name:string,current:number){
  if(/들슬라임/.test(name))return {tint:0x8fd27a,scale:.095};
  if(/푸른 물방울/.test(name))return {tint:0x78cfff,scale:.102};
  if(/도깨비불/.test(name))return {tint:0xffd56f,scale:.086};
  if(/광산박쥐/.test(name))return {tint:0xc1a7dc,scale:.087};
  if(/흑철골렘/.test(name))return {tint:0x8d9aa7,scale:.135};
  if(/동굴도깨비/.test(name))return {tint:0xb59be8,scale:.108};
  if(/월영늑대/.test(name))return {tint:0xa9bdc8,scale:.11};
  if(/그림자요괴/.test(name))return {tint:0x876ac4,scale:.096};
  if(/고목정령/.test(name))return {tint:0x9fca78,scale:.13};
  return {tint:current||0xffffff,scale:1};
}

function styleMonster(m:any){
  if(!m||m.getData?.('isBoss')||m.getData?.('jw16Styled')||m.getData?.('jw14Label'))return;
  const name=String(m.getData?.('name')||'');if(!knownRegular(name))return;
  const current=Number(m.tintTopLeft||0xffffff),look=tintAndScale(name,current);
  m.setData?.('jw16Styled',true);m.setData?.('jw16Archetype',archetype(name));
  m.setTint?.(look.tint);m.setScale?.(look.scale);
}

function destroyPlates(state:{plates:Plate[]}){
  for(const p of state.plates){for(const o of [p.label,p.bg,p.fill,p.badge])try{o?.destroy?.();}catch{}}
  state.plates=[];
}
function makePlate(s:any,m:any):Plate|null{
  const name=String(m.getData?.('name')||'');if(!knownRegular(name)||m.getData?.('jw14Label'))return null;
  const badge=s.add.text(m.x,m.y-55,archetype(name),{fontFamily:'Noto Sans KR',fontSize:'7px',fontStyle:'bold',color:'#ddc684',stroke:'#151918',strokeThickness:3}).setOrigin(.5).setDepth(4900);
  const label=s.add.text(m.x,m.y-43,name,{fontFamily:'Noto Sans KR',fontSize:'8px',fontStyle:'bold',color:'#f2eee2',stroke:'#111817',strokeThickness:4}).setOrigin(.5).setDepth(4901);
  const bg=s.add.rectangle(m.x,m.y-31,58,4,0x111615,.9).setOrigin(.5).setDepth(4898);
  const fill=s.add.rectangle(m.x-29,m.y-31,58,4,0xc85c54,1).setOrigin(0,.5).setDepth(4899);
  return {m,label,bg,fill,badge};
}
function updatePlates(s:any,state:{plates:Plate[]}){
  const monsters=(s.monsters?.getChildren?.()||[]) as any[];
  for(const m of monsters){
    styleMonster(m);
    if(!m?.active||m.getData?.('isBoss')||m.getData?.('jw14Label'))continue;
    if(!state.plates.some(p=>p.m===m)){const p=makePlate(s,m);if(p)state.plates.push(p);}
  }
  for(const p of [...state.plates]){
    if(!p.m?.scene){for(const o of [p.label,p.bg,p.fill,p.badge])try{o?.destroy?.();}catch{}state.plates.splice(state.plates.indexOf(p),1);continue;}
    const show=!!p.m.active&&knownRegular(String(p.m.getData?.('name')||''));
    for(const o of [p.label,p.bg,p.fill,p.badge])o?.setVisible?.(show);
    if(!show)continue;
    const x=Number(p.m.x),y=Number(p.m.y),max=Math.max(1,Number(p.m.getData?.('maxHp')||1)),hp=Math.max(0,Number(p.m.getData?.('hp')||0));
    p.badge.setPosition(x,y-55);p.label.setPosition(x,y-43);p.bg.setPosition(x,y-31);p.fill.setPosition(x-29,y-31).setDisplaySize(58*Math.min(1,hp/max),4);
  }
}

function ensureGuardTexture(s:any){
  if(s.textures?.exists?.('jw16-patrol'))return;
  const g=s.add.graphics();g.fillStyle(0x111815,.25).fillEllipse(24,66,34,8);g.fillStyle(0xe0b28c).fillCircle(24,18,11);g.fillStyle(0x1e2526).fillRoundedRect(12,5,24,10,5);g.fillStyle(0x405c69).fillRoundedRect(10,30,28,30,7);g.fillStyle(0xc7a554).fillRect(20,31,8,27);g.fillStyle(0x222b2e).fillRect(13,57,9,10).fillRect(27,57,9,10);g.lineStyle(3,0xd8dce0,.8).lineBetween(40,28,44,62);g.generateTexture('jw16-patrol',48,70);g.destroy();
}
function spawnPatrols(s:any,state:{patrols:any[]}){
  if(state.patrols.length)return;ensureGuardTexture(s);
  const defs=[
    {name:'경비대 호진',points:[[1010,785],[1180,785],[1310,850],[1160,910],[990,855]]},
    {name:'경비대 담우',points:[[1230,690],[1390,700],[1410,830],[1270,875],[1160,790]]}
  ];
  defs.forEach((d,i)=>{
    const art=s.add.image(0,0,'jw16-patrol');const label=s.add.text(0,43,d.name,{fontFamily:'Noto Sans KR',fontSize:'8px',fontStyle:'bold',color:'#d9d7c8',stroke:'#111817',strokeThickness:4}).setOrigin(.5);const c=s.add.container(d.points[0][0],d.points[0][1],[art,label]).setDepth(d.points[0][1]+20);c.setData('jw16Patrol',{points:d.points,index:i%d.points.length});state.patrols.push(c);s.tweens.add({targets:art,y:{from:-1,to:1},duration:430+i*80,yoyo:true,repeat:-1});walkPatrol(s,c);
  });
}
function walkPatrol(s:any,c:any){
  if(!c?.scene)return;const data=c.getData?.('jw16Patrol');if(!data)return;const points=data.points as number[][];data.index=(Number(data.index||0)+1)%points.length;const [x,y]=points[data.index];const dist=Phaser.Math.Distance.Between(c.x,c.y,x,y);s.tweens.add({targets:c,x,y,duration:Math.max(1500,dist*10),ease:'Sine.inOut',onUpdate:()=>c.setDepth(c.y+20),onComplete:()=>{if(c?.scene)s.time.delayedCall(450,()=>walkPatrol(s,c));}});
}
function updatePatrols(s:any,state:{patrols:any[]}){spawnPatrols(s,state);const show=String(s.zone||'village')==='village';state.patrols.forEach(p=>p?.setVisible?.(show));}

function inferQuestTarget(s:any){
  if(s?.autoTarget)return {zone:String(s.zone||'village'),x:Number(s.autoTarget.x),y:Number(s.autoTarget.y),label:'자동이동 목적지'};
  const title=document.querySelector<HTMLElement>('#quest-title')?.textContent||'';
  const text=document.querySelector<HTMLElement>('#quest-text')?.textContent||'';
  const q=`${title} ${text}`;
  if(/촌장|백운/.test(q))return {zone:'village',x:1070,y:645,label:'촌장 백운'};
  if(/봉인동굴|봉인수하|봉인파괴/.test(q))return {zone:'dungeon',x:0,y:0,label:'봉인동굴'};
  if(/흑철|광산/.test(q))return {zone:'mine',x:1250,y:680,label:'흑철광산'};
  if(/월영|숲|월광결정|수호자/.test(q))return {zone:'forest',x:1450,y:700,label:'월영숲'};
  if(/청운|들판|토벌/.test(q))return {zone:'field',x:1450,y:680,label:'청운들판'};
  return {zone:String(s.zone||'village'),x:WORLD_WIDTH/2,y:WORLD_HEIGHT/2,label:'현재 지역'};
}

function renderCompass(s:any){
  const button=document.querySelector<HTMLElement>('.jw16-compass'),arrow=document.querySelector<HTMLElement>('.jw16-compass-arrow'),strong=document.querySelector<HTMLElement>('.jw16-compass-copy b'),small=document.querySelector<HTMLElement>('.jw16-compass-copy small');
  if(!button||!arrow||!strong||!small||!s?.player)return;const target=inferQuestTarget(s),zone=String(s.zone||'village');
  strong.textContent=target.label;
  if(target.zone==='dungeon'){arrow.style.transform='rotate(90deg)';small.textContent='임무 패널을 눌러 봉인동굴 입장';return;}
  if(target.zone!==zone){arrow.style.transform='rotate(90deg)';small.textContent=`${zoneMeta[target.zone]?.label||target.zone}으로 지역 이동`;return;}
  const dx=target.x-Number(s.player.x),dy=target.y-Number(s.player.y),distance=Math.round(Math.hypot(dx,dy));const deg=Math.atan2(dx,-dy)*180/Math.PI;arrow.style.transform=`rotate(${deg}deg)`;small.textContent=distance<60?'목표 지점 근처':`거리 ${distance} · 클릭 시 임무 자동이동`;
}

function dot(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,stroke?:string){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.lineWidth=1.5;ctx.strokeStyle=stroke;ctx.stroke();}}
function renderMap(s:any){
  const canvas=document.querySelector<HTMLCanvasElement>('#jw16-minimap');if(!canvas||!s?.player)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const zone=String(s.zone||'village'),meta=zoneMeta[zone]||zoneMeta.village,w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=meta.bg;ctx.fillRect(0,0,w,h);
  ctx.globalAlpha=.22;ctx.strokeStyle='#c9d6c5';ctx.lineWidth=1;for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=33){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.globalAlpha=1;
  if(zone==='village'){ctx.strokeStyle='rgba(225,199,126,.32)';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(22,h*.62);ctx.quadraticCurveTo(w*.48,h*.36,w*.88,h*.55);ctx.stroke();ctx.beginPath();ctx.moveTo(w*.46,10);ctx.lineTo(w*.48,h*.86);ctx.stroke();}
  const sx=(x:number)=>Math.max(3,Math.min(w-3,x/WORLD_WIDTH*w)),sy=(y:number)=>Math.max(3,Math.min(h-3,y/WORLD_HEIGHT*h));
  for(const n of (s.nodes?.getChildren?.()||[])){if(n?.active&&n.getData?.('ready'))dot(ctx,sx(n.x),sy(n.y),1.8,'#75d49b');}
  for(const m of (s.monsters?.getChildren?.()||[])){if(!m?.active)continue;dot(ctx,sx(m.x),sy(m.y),m.getData?.('isBoss')?3.2:2,m.getData?.('isBoss')?'#ffd25d':'#e36e67');}
  const target=s.autoTarget;if(target){ctx.strokeStyle='#f6d36e';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx(s.player.x),sy(s.player.y));ctx.lineTo(sx(target.x),sy(target.y));ctx.stroke();dot(ctx,sx(target.x),sy(target.y),3,'rgba(0,0,0,0)','#f6d36e');}
  dot(ctx,sx(s.player.x),sy(s.player.y),4.2,'#fff4c4','#1d2c26');
  const zl=document.querySelector<HTMLElement>('#jw16-zone-label'),zr=document.querySelector<HTMLElement>('#jw16-zone-range'),density=document.querySelector<HTMLElement>('#jw16-density');if(zl)zl.textContent=meta.label;if(zr)zr.textContent=meta.range;if(density){const mobs=(s.monsters?.getChildren?.()||[]).filter((m:any)=>m?.active).length,nodes=(s.nodes?.getChildren?.()||[]).filter((n:any)=>n?.active&&n.getData?.('ready')).length;density.textContent=zone==='village'?'경비대 순찰 · NPC 생활권':`요괴 ${mobs} · 채집 ${nodes}`;}
}

function tick(){
  createHud();syncVersion();const s=scene();if(!s?.player)return;const zone=String(s.zone||'village');let state=sceneStates.get(s);if(!state){state={zone,plates:[],patrols:[]};sceneStates.set(s,state);}if(state.zone!==zone){destroyPlates(state);state.zone=zone;}
  updatePatrols(s,state);updatePlates(s,state);renderMap(s);renderCompass(s);
}
function boot(){createHud();syncVersion();window.setTimeout(syncVersion,700);window.setTimeout(syncVersion,1800);window.setInterval(tick,120);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
