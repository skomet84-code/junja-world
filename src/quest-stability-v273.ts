import Phaser from 'phaser';
import './quest-stability-v273.css';

const SAVE_KEY='junja-world-v01';
let assistTimer=0;
let assistRunning=false;
let lastQuest=-1;
let lastChapter=-1;

function scene():any|null{
  for(const game of (((Phaser as any).GAMES||[]) as any[])){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}
function readLocal(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function saveNow(){const s=scene();return s?.save||readLocal();}
function persist(save:any,s=scene()){
  if(!save)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}
  if(s?.save&&s.save!==save)Object.assign(s.save,save);
}
function toast(text:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=text;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2300);}
function chapterState(save:any){return Number(save?.chapter2?.state||0);}
function playerLevel(save:any){return Number(save?.level||1);}
function questNo(save:any){return Number(save?.quest||0);}
function distance(s:any,t:any){return s?.player&&t?Phaser.Math.Distance.Between(s.player.x,s.player.y,t.x,t.y):99999;}
function alive(m:any){return !!m&&m.active!==false&&m.visible!==false&&!m.destroyed&&Number(m.getData?.('hp')||1)>0;}

function stopAssist(msg=''){
  assistRunning=false;window.clearTimeout(assistTimer);document.body.classList.remove('jw273-quest-running');
  updateActionButton();if(msg)toast(msg);
}
function schedule(ms=420){window.clearTimeout(assistTimer);assistTimer=window.setTimeout(assistStep,ms);}
function moveTarget(s:any,x:number,y:number,range=100){
  if(!s?.player)return false;
  if(Phaser.Math.Distance.Between(s.player.x,s.player.y,x,y)<=range)return true;
  s.autoTarget=new Phaser.Math.Vector2(x,y);return false;
}
function travel(s:any,zone:string){try{s?.travel?.(zone);}catch{}}
function nearestMonster(s:any,preferElite=false){
  if(!s?.player)return null;
  const list=(s.monsters?.getChildren?.()||[]).filter((m:any)=>alive(m));
  list.sort((a:any,b:any)=>{
    if(preferElite){const ae=!!a.getData?.('jwElite'),be=!!b.getData?.('jwElite');if(ae!==be)return ae?-1:1;}
    return distance(s,a)-distance(s,b);
  });
  return list[0]||null;
}
function nearestOre(s:any){
  if(!s?.player)return null;
  const list=(s.nodes?.getChildren?.()||[]).filter((n:any)=>n?.active!==false&&n?.getData?.('ready')!==false&&String(n.getData?.('kind'))==='ore');
  list.sort((a:any,b:any)=>distance(s,a)-distance(s,b));return list[0]||null;
}
function rewardRepair(s:any,title:string,xp:number,gold:number,potions:number){
  const save=s?.save||readLocal();if(!save)return;
  try{if(typeof s?.questReward==='function')s.questReward(title,xp,gold,potions);else{save.xp=Number(save.xp||0)+xp;save.gold=Number(save.gold||0)+gold;save.potions=Number(save.potions||0)+potions;}}catch{}
  persist(save,s);
}
function repairBaseQuest(){
  const s=scene(),save=s?.save||readLocal();if(!save)return;
  let changed=false;
  if(Number(save.quest)===1&&Number(save.kills||0)>=5){save.quest=2;rewardRepair(s,'청운들판 토벌',100,120,1);changed=true;}
  if(Number(save.quest)===3&&Number(save.resources?.ore||0)>=5){save.quest=4;rewardRepair(s,'흑철광산 조사',300,180,1);changed=true;}
  if(changed){persist(save,s);toast('완료된 임무 상태를 복구했어. 다음 임무를 진행할 수 있어.');}
}

function actionLabel(save:any){
  if(!save)return '임무 진행';
  const q=questNo(save);
  if(q===0)return '촌장에게 이동 · 임무 시작';
  if(q===1)return Number(save.kills||0)>=5?'완료 처리 · 다음 임무':'자동 토벌 시작';
  if(q===2)return '촌장에게 이동 · 보상 받기';
  if(q===3)return Number(save.resources?.ore||0)>=5?'완료 처리 · 다음 임무':'흑철광석 자동 채집';
  if(q===4)return playerLevel(save)>=10?'월영숲 입장 · 임무 완료':'Lv.10까지 자동 성장';
  const ch=chapterState(save);
  if(ch===0)return '경비 무진에게 이동 · 2장 시작';
  if(ch===1)return '청운들판 자동 토벌';
  if(ch===2)return '흑철광석 자동 채집';
  if(ch===3)return '월영숲 정예 자동 사냥';
  if(ch===4)return '촌장에게 이동 · 2장 보상';
  return '2장 완료 · 모험 계속';
}
function ensureActionButton(){
  const panel=document.querySelector<HTMLElement>('#quest-panel');if(!panel)return;
  let btn=panel.querySelector<HTMLButtonElement>('.jw273-quest-action');
  if(!btn){btn=document.createElement('button');btn.type='button';btn.className='jw273-quest-action';panel.appendChild(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();runQuestAction();});}
}
function updateActionButton(){
  ensureActionButton();const btn=document.querySelector<HTMLButtonElement>('.jw273-quest-action');const save=saveNow();if(!btn||!save)return;
  btn.textContent=assistRunning?'자동 진행 중 · 누르면 중지':actionLabel(save);
  btn.classList.toggle('running',assistRunning);btn.classList.toggle('complete',questNo(save)>=5&&chapterState(save)>=5&&!assistRunning);
}

function runQuestAction(){
  if(assistRunning){stopAssist('임무 자동 진행을 중지했어.');return;}
  repairBaseQuest();const save=saveNow(),s=scene();if(!save||!s){toast('게임이 아직 준비 중이야. 잠시 후 다시 눌러줘.');return;}
  if(questNo(save)>=5&&chapterState(save)>=5){document.body.classList.remove('jw272-open-mission');toast('메인 임무 2장 완료. 사냥·제작·보스 콘텐츠를 진행하면 돼.');return;}
  assistRunning=true;document.body.classList.add('jw273-quest-running');updateActionButton();assistStep();
}

function assistStep(){
  if(!assistRunning)return;
  const s=scene(),save=s?.save||readLocal();if(!s?.player||!save){schedule(600);return;}
  repairBaseQuest();
  const q=questNo(save);
  try{
    if(q===0){
      if(String(s.zone)!=='village'){travel(s,'village');schedule(800);return;}
      if(moveTarget(s,1070,645,120)){s.autoTarget=undefined;s.contextAction?.();schedule(700);}else schedule();return;
    }
    if(q===1){
      if(Number(save.kills||0)>=5){repairBaseQuest();schedule(250);return;}
      if(String(s.zone)!=='field'){travel(s,'field');schedule(800);return;}
      const m=nearestMonster(s);if(!m){schedule(700);return;}
      if(moveTarget(s,m.x,m.y,100)){s.autoTarget=undefined;s.attack?.();schedule(430);}else schedule();return;
    }
    if(q===2){
      if(String(s.zone)!=='village'){travel(s,'village');schedule(800);return;}
      if(moveTarget(s,1070,645,120)){s.autoTarget=undefined;s.contextAction?.();schedule(700);}else schedule();return;
    }
    if(q===3){
      if(Number(save.resources?.ore||0)>=5){repairBaseQuest();schedule(250);return;}
      if(String(s.zone)!=='mine'){travel(s,'mine');schedule(800);return;}
      const n=nearestOre(s);if(!n){schedule(800);return;}
      if(moveTarget(s,n.x,n.y,95)){s.autoTarget=undefined;s.contextAction?.();schedule(700);}else schedule();return;
    }
    if(q===4){
      if(playerLevel(save)>=10){if(String(s.zone)!=='forest')travel(s,'forest');schedule(800);return;}
      const targetZone=playerLevel(save)>=5?'mine':'field';if(String(s.zone)!==targetZone){travel(s,targetZone);schedule(800);return;}
      const m=nearestMonster(s);if(!m){schedule(700);return;}if(moveTarget(s,m.x,m.y,100)){s.autoTarget=undefined;s.attack?.();schedule(430);}else schedule();return;
    }
    const ch=chapterState(save);
    if(ch===0){
      if(String(s.zone)!=='village'){travel(s,'village');schedule(800);return;}
      if(moveTarget(s,1310,725,125)){s.autoTarget=undefined;s.contextAction?.();schedule(800);}else schedule();return;
    }
    if(ch===1){
      if(String(s.zone)!=='field'){travel(s,'field');schedule(800);return;}
      const m=nearestMonster(s);if(!m){schedule(700);return;}if(moveTarget(s,m.x,m.y,100)){s.autoTarget=undefined;s.attack?.();schedule(430);}else schedule();return;
    }
    if(ch===2){
      if(String(s.zone)!=='mine'){travel(s,'mine');schedule(800);return;}
      const n=nearestOre(s);if(!n){schedule(800);return;}if(moveTarget(s,n.x,n.y,95)){s.autoTarget=undefined;s.contextAction?.();schedule(700);}else schedule();return;
    }
    if(ch===3){
      if(String(s.zone)!=='forest'){travel(s,'forest');schedule(850);return;}
      const m=nearestMonster(s,true);if(!m){schedule(750);return;}if(moveTarget(s,m.x,m.y,100)){s.autoTarget=undefined;s.attack?.();schedule(430);}else schedule();return;
    }
    if(ch===4){
      if(String(s.zone)!=='village'){travel(s,'village');schedule(800);return;}
      if(moveTarget(s,1070,645,120)){s.autoTarget=undefined;s.contextAction?.();schedule(850);}else schedule();return;
    }
    stopAssist('현재 메인 임무를 모두 완료했어.');
  }catch{schedule(650);}
}

function watchProgress(){
  repairBaseQuest();const save=saveNow();if(!save){updateActionButton();return;}
  const q=questNo(save),ch=chapterState(save);
  if(assistRunning&&(lastQuest!==-1)&&(q!==lastQuest||ch!==lastChapter)){
    stopAssist('임무 단계가 완료됐어. 다음 목표 버튼을 눌러 이어가면 돼.');
  }
  lastQuest=q;lastChapter=ch;updateActionButton();
}
function boot(){ensureActionButton();watchProgress();window.setInterval(watchProgress,300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
