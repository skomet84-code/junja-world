import Phaser from 'phaser';
import './quest-mobile-isolation-v276.css';

const SAVE_KEY='junja-world-v01';
const MOBILE='(max-width: 760px), (pointer: coarse)';
let lastActionAt=0;

function isMobile(){return window.matchMedia(MOBILE).matches;}
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
  save.chapter2.baseKills=Number(save.chapter2.baseKills??save.kills??0);
  save.chapter2.baseOre=Number(save.chapter2.baseOre??save.resources?.ore??0);
  return save.chapter2;
}
function questCopy(save:any):[string,string,string,string]{
  const q=Number(save?.quest||0);
  if(q<5){
    if(q===0)return['낯선 마을의 부름','촌장 백운을 찾아가자.','12%','촌장에게 이동 · 임무 시작'];
    if(q===1)return['청운들판 토벌',`청운들판 요괴 5마리 처치 (${Math.min(Number(save.kills||0),5)}/5)`,'48%','자동 토벌 시작'];
    if(q===2)return['백운에게 보고','촌장 백운에게 돌아가 보상을 받자.','82%','촌장에게 이동 · 보상 받기'];
    if(q===3)return['흑철광산 조사',`흑철광석 5개 채집 (${Math.min(Number(save.resources?.ore||0),5)}/5)`,'92%','흑철광석 자동 채집'];
    return['월영숲의 문','Lv.10 달성 후 월영숲에 입장하자.','100%','임무 계속'];
  }
  const c2=ensureChapter2(save),state=Number(c2.state||0);
  if(state<5){
    const kills=Math.max(0,Number(save.kills||0)-Number(c2.baseKills||0));
    const ore=Math.max(0,Number(save.resources?.ore||0)-Number(c2.baseOre||0));
    if(state===0)return['2장 · 그림자의 흔적','경비 무진에게 성 밖의 이상징후를 확인하자.','8%','2장 시작'];
    if(state===1)return['2장 · 청운의 이상징후',`청운들판 요괴 10마리 토벌 (${Math.min(kills,10)}/10)`,`${15+Math.min(kills,10)*4}%`,'자동 토벌 계속'];
    if(state===2)return['2장 · 흑철의 파편',`흑철광석 8개 새로 채집 (${Math.min(ore,8)}/8)`,`${58+Math.min(ore,8)*3}%`,'자동 채집 계속'];
    if(state===3)return['2장 · 월영숲의 정예','월영숲 정예 요괴를 처치하자.','88%','정예 자동 사냥'];
    return['2장 · 그림자 봉인','촌장 백운에게 돌아가 조사 결과를 보고하자.','96%','촌장에게 이동 · 보상'];
  }
  const c3=save?.chapter3||{},s3=Number(c3.state||0);
  if(s3===0)return['3장 · 월영의 균열','촌장 백운에게 월영숲의 불길한 기운을 보고하자.','7%','3장 시작'];
  if(s3===1)return['3장 · 달빛 아래 추적',`월영숲 요괴 15마리 토벌 (${Math.min(Number(c3.forestKills||0),15)}/15)`,`${12+Math.min(Number(c3.forestKills||0),15)*3}%`,'자동 토벌 계속'];
  if(s3===2)return['3장 · 균열의 결정',`월광결정 6개 직접 채집 (${Math.min(Number(c3.crystalsGathered||0),6)}/6)`,`${58+Math.min(Number(c3.crystalsGathered||0),6)*4}%`,'자동 채집 계속'];
  if(s3===3)return['3장 · 봉인수호자','월영숲에 나타난 봉인수호자를 격파하자.','88%','봉인수호자 자동 전투'];
  if(s3===4)return['3장 · 백운의 결단','촌장 백운에게 봉인수호자 격파를 보고하자.','96%','촌장에게 이동 · 보상'];
  return['메인 임무 완료','현재 공개된 메인 임무를 모두 완료했습니다.','100%','모험 계속'];
}
function ensureSheet(){
  if(document.querySelector('#jw276-mission'))return;
  const sheet=document.createElement('section');
  sheet.id='jw276-mission';sheet.className='jw276-mission';
  sheet.innerHTML='<div class="jw276-head"><span>임무</span><small>MAIN</small></div><strong id="jw276-title">임무 불러오는 중</strong><p id="jw276-text"></p><div class="jw276-progress"><i id="jw276-bar"></i></div><button id="jw276-action" type="button">임무 진행</button>';
  document.body.appendChild(sheet);
  const btn=sheet.querySelector<HTMLButtonElement>('#jw276-action')!;
  const fire=(e:Event)=>{e.preventDefault();e.stopPropagation();const now=performance.now();if(now-lastActionAt<450)return;lastActionAt=now;runAction();};
  btn.addEventListener('pointerup',fire);
  btn.addEventListener('click',e=>{if(performance.now()-lastActionAt<450){e.preventDefault();return;}fire(e);});
}
function directStartChapter2(save:any,s:any){
  if(Number(save?.quest||0)<5)return false;
  const c2=ensureChapter2(save);if(Number(c2.state||0)!==0)return false;
  c2.state=1;c2.baseKills=Number(save.kills||0);c2.baseOre=Number(save.resources?.ore||0);
  save.gold=Number(save.gold||0)+180;save.potions=Number(save.potions||0)+1;
  try{if(typeof s?.gainXp==='function')s.gainXp(120);else save.xp=Number(save.xp||0)+120;}catch{save.xp=Number(save.xp||0)+120;}
  persist(save,s);toast('2장 시작 · 청운들판 요괴 10마리를 토벌하세요.');return true;
}
function runAction(){
  const s=scene(),save=s?.save||readSave();if(!save||!s){toast('게임 준비 중이야. 잠시 후 다시 눌러줘.');return;}
  const started=directStartChapter2(save,s);
  const legacy=document.querySelector<HTMLButtonElement>('#jw-quest-action');
  if(started){render();window.setTimeout(()=>{try{legacy?.click();}catch{}},90);return;}
  try{legacy?.click();}catch{}
  if(!legacy)toast('임무 엔진을 다시 준비 중이야.');
}
function render(){
  ensureSheet();if(!isMobile())return;
  const save=readSave();if(!save)return;
  const [title,text,width,action]=questCopy(save);
  const t=document.querySelector<HTMLElement>('#jw276-title'),p=document.querySelector<HTMLElement>('#jw276-text'),bar=document.querySelector<HTMLElement>('#jw276-bar'),btn=document.querySelector<HTMLButtonElement>('#jw276-action');
  if(t&&t.textContent!==title)t.textContent=title;if(p&&p.textContent!==text)p.textContent=text;if(bar&&bar.style.width!==width)bar.style.width=width;
  const legacy=document.querySelector<HTMLButtonElement>('#jw-quest-action');
  const label=legacy?.textContent?.includes('진행 중')?'자동 임무 진행 중 · 누르면 중지':action;
  if(btn&&btn.textContent!==label)btn.textContent=label;
}
function suppressLegacyMobile(){
  if(!isMobile())return;
  document.querySelectorAll<HTMLElement>('#quest-panel,#jw-quest-action,.jw-chapter-toast').forEach(el=>el.classList.add('jw276-legacy-quest'));
}
function boot(){ensureSheet();suppressLegacyMobile();render();window.setInterval(()=>{suppressLegacyMobile();render();},260);window.addEventListener('resize',()=>{suppressLegacyMobile();render()},{passive:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
