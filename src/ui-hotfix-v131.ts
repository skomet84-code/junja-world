import Phaser from 'phaser';
import './ui-hotfix-v131.css';

const AUTO_KEY='junja-world-auto-hunt-v081';
let fallbackEnabled=localStorage.getItem(AUTO_KEY)==='1';
let fallbackTarget:any=null;
let fallbackMarker:any=null;
let markerScene:any=null;
let lastAttackAt=0;
let lastTravelAt=0;

function worldScene():any|null{
  const games=((((Phaser as any).GAMES||[]) as any[]));
  for(const game of games){
    const direct=game?.scene?.keys?.world;
    if(direct?.sys?.isActive?.())return direct;
    try{const found=game?.scene?.getScene?.('world');if(found?.sys?.isActive?.())return found;}catch{}
  }
  return null;
}
function readSave():any{try{return JSON.parse(localStorage.getItem('junja-world-v01')||'null');}catch{return null;}}
function alive(entity:any){return !!entity&&entity.active!==false&&entity.visible!==false&&!entity.destroyed;}
function gameActive(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function preferredZone(level:number){if(level>=10)return'forest';if(level>=5)return'mine';return'field';}

function setVersion(){
  // Version display is owned by version-v15.ts.
}
function layoutPanels(){
  const quest=document.querySelector<HTMLElement>('#quest-panel');
  const boss=document.querySelector<HTMLElement>('.boss-panel');
  if(!quest||!boss||!gameActive())return;
  const rect=quest.getBoundingClientRect();
  const gap=window.innerWidth<=760?7:10;
  boss.style.setProperty('top',`${Math.ceil(rect.bottom+gap)}px`,'important');
  boss.style.setProperty('pointer-events','none','important');
}

function dock(){
  let el=document.querySelector<HTMLElement>('.jw-combat-dock');
  if(el)return el;
  el=document.createElement('div');
  el.className='jw-combat-dock';
  el.setAttribute('aria-label','전투 조작');
  document.body.appendChild(el);
  return el;
}
function hideMarker(){try{fallbackMarker?.setVisible?.(false);}catch{}}
function showMarker(scene:any,target:any){
  if(!fallbackMarker||markerScene!==scene||!fallbackMarker.scene){
    try{fallbackMarker?.destroy?.();}catch{}
    markerScene=scene;
    fallbackMarker=scene.add.ellipse(target.x,target.y+27,68,24,0x000000,0).setStrokeStyle(2,0xf1c968,.92).setDepth(900);
    scene.tweens.add({targets:fallbackMarker,scaleX:1.16,scaleY:1.16,alpha:{from:.95,to:.35},duration:650,yoyo:true,repeat:-1});
  }
  fallbackMarker.setVisible(true).setPosition(target.x,target.y+27).setDepth(target.y+8);
}
function fallbackLabel(target:any){const name=target?.getData?.('name')||target?.name;return name?`${name} 추적 중`:'몬스터 추적 중';}
function renderFallback(reason=''){
  const button=document.querySelector<HTMLButtonElement>('#jw-auto-hunt');
  if(!button||button.dataset.jwFailsafe!=='1')return;
  button.classList.toggle('on',fallbackEnabled);
  button.classList.toggle('busy',fallbackEnabled&&!!fallbackTarget);
  const strong=button.querySelector('strong'),small=button.querySelector('small');
  if(strong)strong.textContent=fallbackEnabled?'⚔ 자동사냥 ON':'⚔ 자동사냥 OFF';
  if(small)small.textContent=reason||(fallbackEnabled?(fallbackTarget?fallbackLabel(fallbackTarget):'사냥 대상 탐색 중'):'가까운 몬스터 자동 탐색 · R');
}
function setFallback(next:boolean){
  fallbackEnabled=next;
  localStorage.setItem(AUTO_KEY,next?'1':'0');
  if(!next){fallbackTarget=null;hideMarker();const scene=worldScene();try{scene.autoTarget=undefined;scene.player?.body?.setVelocity?.(0,0);}catch{}}
  renderFallback();
}
function createFallbackAuto(){
  const existing=document.querySelector<HTMLButtonElement>('#jw-auto-hunt');
  if(existing)return existing;
  const button=document.createElement('button');
  button.id='jw-auto-hunt';
  button.className='jw-auto-hunt';
  button.type='button';
  button.dataset.jwFailsafe='1';
  button.innerHTML='<strong>⚔ 자동사냥 OFF</strong><small>가까운 몬스터 자동 탐색 · R</small>';
  button.addEventListener('click',()=>setFallback(!fallbackEnabled));
  document.body.appendChild(button);
  renderFallback('자동사냥 준비 완료');
  return button;
}
function ensureDock(){
  const box=dock();
  const auto=document.querySelector<HTMLButtonElement>('#jw-auto-hunt')||createFallbackAuto();
  const primary=document.querySelector<HTMLButtonElement>('#jw-skill-button');
  const secondary=document.querySelector<HTMLButtonElement>('#jw-secondary-skill');
  for(const button of [auto,primary,secondary])if(button&&button.parentElement!==box)box.appendChild(button);
}
function nearestTarget(scene:any){
  if(!scene?.player)return null;
  const targets:any[]=[];
  if(alive(scene.bossEntity))targets.push(scene.bossEntity);
  for(const monster of scene.monsters?.getChildren?.()||[])if(alive(monster)&&!targets.includes(monster))targets.push(monster);
  targets.sort((a,b)=>Phaser.Math.Distance.Between(scene.player.x,scene.player.y,a.x,a.y)-Phaser.Math.Distance.Between(scene.player.x,scene.player.y,b.x,b.y));
  return targets[0]||null;
}
function fallbackStep(){
  const button=document.querySelector<HTMLButtonElement>('#jw-auto-hunt');
  if(!button||button.dataset.jwFailsafe!=='1')return;
  fallbackEnabled=localStorage.getItem(AUTO_KEY)==='1';
  if(!fallbackEnabled||!gameActive())return;
  const scene=worldScene();
  if(!scene?.player){renderFallback('게임 준비 중');return;}
  if(String(scene.zone)==='village'){
    hideMarker();
    const now=performance.now();
    if(now-lastTravelAt>1800){lastTravelAt=now;const save=scene.save||readSave();const zone=preferredZone(Number(save?.level||1));try{scene.travel?.(zone);renderFallback(`${zone==='forest'?'월영숲':zone==='mine'?'흑철광산':'청운들판'} 이동 중`);}catch{renderFallback('사냥터 이동 대기');}}
    return;
  }
  if(!alive(fallbackTarget))fallbackTarget=nearestTarget(scene);
  if(!fallbackTarget){hideMarker();try{scene.autoTarget=undefined;scene.player?.body?.setVelocity?.(0,0);}catch{}renderFallback('몬스터 재생성 대기');return;}
  showMarker(scene,fallbackTarget);
  const dx=fallbackTarget.x-scene.player.x,dy=fallbackTarget.y-scene.player.y;
  const distance=Math.hypot(dx,dy),len=distance||1;
  try{scene.facing?.set?.(dx/len,dy/len);}catch{}
  if(distance>106){try{scene.autoTarget=new Phaser.Math.Vector2(fallbackTarget.x,fallbackTarget.y);}catch{}renderFallback();return;}
  try{scene.autoTarget=undefined;scene.player?.body?.setVelocity?.(0,0);}catch{}
  const now=performance.now();if(now-lastAttackAt>=560){lastAttackAt=now;try{scene.attack?.();}catch{}}
  renderFallback();
}
function bindFallbackKey(){
  window.addEventListener('keydown',(event:KeyboardEvent)=>{
    const button=document.querySelector<HTMLButtonElement>('#jw-auto-hunt');
    if(event.code!=='KeyR'||button?.dataset.jwFailsafe!=='1')return;
    const target=event.target as HTMLElement|null;if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;
    event.preventDefault();setFallback(!fallbackEnabled);
  });
}
function tick(){
  document.body.classList.toggle('jw-game-active',gameActive());
  ensureDock();
  layoutPanels();
}
function boot(){
  setVersion();
  ensureDock();
  bindFallbackKey();
  tick();
  window.addEventListener('resize',layoutPanels,{passive:true});
  window.addEventListener('orientationchange',layoutPanels);
  window.setInterval(tick,220);
  window.setInterval(fallbackStep,150);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
