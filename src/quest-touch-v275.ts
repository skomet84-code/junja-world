import Phaser from 'phaser';
import './quest-touch-v275.css';

const SAVE_KEY='junja-world-v01';
let lastInvoke=0;

function scene():any|null{
  for(const game of (((Phaser as any).GAMES||[]) as any[])){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}
function readSave(){const s=scene();if(s?.save)return s.save;try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function persist(save:any,s=scene()){
  if(!save)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}
  if(s?.save&&s.save!==save)Object.assign(s.save,save);
}
function toast(text:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=text;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2200);}
function ensureChapter2(save:any){
  if(!save.chapter2||typeof save.chapter2!=='object')save.chapter2={state:0,baseKills:Number(save.kills||0),baseOre:Number(save.resources?.ore||0),eliteDone:false,rewarded:false};
  save.chapter2.state=Number(save.chapter2.state||0);
  return save.chapter2;
}
function directStartChapter2(){
  const s=scene(),save=s?.save||readSave();
  if(!save||Number(save.quest||0)<5)return false;
  const ch=ensureChapter2(save);
  if(Number(ch.state||0)!==0)return false;
  ch.state=1;
  ch.baseKills=Number(save.kills||0);
  ch.baseOre=Number(save.resources?.ore||0);
  save.gold=Number(save.gold||0)+180;
  save.potions=Number(save.potions||0)+1;
  try{if(typeof s?.gainXp==='function')s.gainXp(120);else save.xp=Number(save.xp||0)+120;}catch{save.xp=Number(save.xp||0)+120;}
  persist(save,s);
  toast('2장 시작 · 청운들판 요괴 10마리를 토벌하세요.');
  return true;
}
function visibleButton(){
  const btn=document.querySelector<HTMLButtonElement>('#jw-quest-action');
  if(!btn)return null;
  const style=getComputedStyle(btn);
  if(style.display==='none'||style.visibility==='hidden'||style.pointerEvents==='none')return null;
  return btn;
}
function pointInside(btn:HTMLElement,x:number,y:number){const r=btn.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function invoke(btn:HTMLButtonElement){
  const now=performance.now();if(now-lastInvoke<550)return;lastInvoke=now;
  const started=directStartChapter2();
  window.setTimeout(()=>{
    btn.classList.remove('jw275-pressed');
    try{btn.click();}catch{}
    if(started)window.setTimeout(()=>{try{const s=scene();if(s&&String(s.zone)!=='field')s.travel?.('field');}catch{}},120);
  },40);
}
function pointerDown(e:PointerEvent){
  const btn=visibleButton();if(!btn)return;
  if(pointInside(btn,e.clientX,e.clientY))btn.classList.add('jw275-pressed');
}
function pointerUp(e:PointerEvent){
  const btn=visibleButton();if(!btn)return;
  const hit=pointInside(btn,e.clientX,e.clientY);
  btn.classList.remove('jw275-pressed');
  if(!hit)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  invoke(btn);
}
function touchEnd(e:TouchEvent){
  const btn=visibleButton();if(!btn)return;
  const t=e.changedTouches?.[0];if(!t||!pointInside(btn,t.clientX,t.clientY))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  invoke(btn);
}
function clickFallback(e:MouseEvent){
  if(e.isTrusted===false)return;
  const btn=visibleButton();if(!btn)return;
  if(!pointInside(btn,e.clientX,e.clientY))return;
  const now=performance.now();if(now-lastInvoke<550){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return;}
}
function boot(){
  window.addEventListener('pointerdown',pointerDown,true);
  window.addEventListener('pointerup',pointerUp,true);
  window.addEventListener('touchend',touchEnd,{capture:true,passive:false});
  window.addEventListener('click',clickFallback,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
