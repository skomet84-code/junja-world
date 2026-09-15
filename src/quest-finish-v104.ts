import Phaser from 'phaser';
import './v104.css';
import './v11.css';

const trackedGames=new Set<any>();
const patchedScenes=new WeakSet<any>();
const SAVE_KEY='junja-world-v01';

type Chapter2={state:number;baseKills:number;baseOre:number;eliteDone:boolean;rewarded:boolean};

function installTracking(){
  const proto=(Phaser.Game as any)?.prototype;
  if(!proto||proto.__jwChapter2Tracked)return;
  const boot=proto.boot,destroy=proto.destroy;
  if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};
  if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};
  proto.__jwChapter2Tracked=true;
}
installTracking();

function worldScene():any|null{
  const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];
  for(const game of games){const s=game?.scene?.keys?.world;if(s?.sys?.isActive?.())return s;try{const x=game?.scene?.getScene?.('world');if(x?.sys?.isActive?.())return x;}catch{}}
  return null;
}
function readSave():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function writeSave(save:any,scene?:any){localStorage.setItem(SAVE_KEY,JSON.stringify(save));if(scene?.save)Object.assign(scene.save,save);}
function toast(msg:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2300);}
function chapterToast(msg:string){let el=document.querySelector<HTMLElement>('.jw-chapter-toast');if(!el){el=document.createElement('div');el.className='jw-chapter-toast';document.body.appendChild(el);}el.textContent=msg;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');window.setTimeout(()=>el?.classList.remove('show'),2600);}
function ensureChapter(save:any):Chapter2{
  if(!save.chapter2||typeof save.chapter2!=='object')save.chapter2={state:0,baseKills:Number(save.kills||0),baseOre:Number(save.resources?.ore||0),eliteDone:false,rewarded:false};
  save.chapter2.state=Number(save.chapter2.state||0);save.chapter2.baseKills=Number(save.chapter2.baseKills??save.kills??0);save.chapter2.baseOre=Number(save.chapter2.baseOre??save.resources?.ore??0);save.chapter2.eliteDone=!!save.chapter2.eliteDone;save.chapter2.rewarded=!!save.chapter2.rewarded;
  return save.chapter2 as Chapter2;
}
function reward(scene:any,xp:number,gold:number,potions=0){
  const save=scene?.save||readSave();if(!save)return;save.gold=Number(save.gold||0)+gold;save.potions=Number(save.potions||0)+potions;
  if(typeof scene?.gainXp==='function')scene.gainXp(xp);else save.xp=Number(save.xp||0)+xp;
  writeSave(save,scene);
}
function setState(scene:any,state:number,msg:string){
  const save=scene?.save||readSave();if(!save)return;const ch=ensureChapter(save);ch.state=state;
  if(state===1)ch.baseKills=Number(save.kills||0);
  if(state===2)ch.baseOre=Number(save.resources?.ore||0);
  writeSave(save,scene);chapterToast(msg);
}
function near(scene:any,x:number,y:number,r=135){return !!scene?.player&&Phaser.Math.Distance.Between(scene.player.x,scene.player.y,x,y)<=r;}
function go(scene:any,zone:string,x?:number,y?:number){
  if(!scene)return;try{if(String(scene.zone)!==zone)scene.travel?.(zone);window.setTimeout(()=>{if(x!==undefined&&y!==undefined)scene.autoTarget=new Phaser.Math.Vector2(x,y);},120);}catch{}
}
function patchScene(scene:any){
  if(patchedScenes.has(scene))return;
  if(typeof scene.contextAction==='function'){
    const original=scene.contextAction.bind(scene);
    scene.contextAction=function(){
      const save=scene.save||readSave();if(Number(save?.quest||0)>=5){const ch=ensureChapter(save);
        if(ch.state===0&&String(scene.zone)==='village'&&near(scene,1310,725)){reward(scene,120,180,1);setState(scene,1,'2장 시작 · 청운들판 요괴 10마리를 토벌하세요.');return;}
        if(ch.state===4&&String(scene.zone)==='village'&&near(scene,1070,645)){reward(scene,900,1200,3);ch.state=5;ch.rewarded=true;writeSave(save,scene);chapterToast('2장 완료 · EXP +900 · 1,200엽전 · 회복약 3');return;}
      }
      original();
    };
  }
  if(typeof scene.defeat==='function'){
    const original=scene.defeat.bind(scene);
    scene.defeat=function(m:any){const elite=!!m?.getData?.('jwElite');const zone=String(scene.zone);original(m);const save=scene.save||readSave();if(Number(save?.quest||0)>=5){const ch=ensureChapter(save);if(ch.state===3&&zone==='forest'&&elite){ch.eliteDone=true;writeSave(save,scene);reward(scene,420,480,1);setState(scene,4,'정예 토벌 완료 · 촌장 백운에게 돌아가세요.');}}};
  }
  patchedScenes.add(scene);
}

function updateProgress(scene:any){
  const save=scene?.save||readSave();if(!save||Number(save.quest||0)<5)return;
  const ch=ensureChapter(save);
  if(ch.state===1&&Number(save.kills||0)-ch.baseKills>=10){reward(scene,300,300,1);setState(scene,2,'들판 토벌 완료 · 흑철광석 8개를 새로 채집하세요.');}
  if(ch.state===2&&Number(save.resources?.ore||0)-ch.baseOre>=8){reward(scene,360,360,1);setState(scene,3,'광산 조사 완료 · 월영숲 정예 요괴를 처치하세요.');}
}

function questCopy(save:any){
  const ch=ensureChapter(save);const kills=Math.max(0,Number(save.kills||0)-ch.baseKills);const ore=Math.max(0,Number(save.resources?.ore||0)-ch.baseOre);
  if(ch.state===0)return['2장 · 그림자의 흔적','경비 무진에게 성 밖의 이상징후를 확인하자. · 클릭 이동','8%'];
  if(ch.state===1)return['2장 · 청운의 이상징후',`청운들판 요괴 10마리 토벌 (${Math.min(kills,10)}/10) · 클릭 이동`,`${15+Math.min(kills,10)*4}%`];
  if(ch.state===2)return['2장 · 흑철의 파편',`흑철광석 8개 새로 채집 (${Math.min(ore,8)}/8) · 클릭 이동`,`${58+Math.min(ore,8)*3}%`];
  if(ch.state===3)return['2장 · 월영숲의 정예','월영숲 정예 요괴를 처치하자. · 클릭 이동','88%'];
  if(ch.state===4)return['2장 · 그림자 봉인','촌장 백운에게 돌아가 조사 결과를 보고하자. · 클릭 이동','96%'];
  return['2장 · 그림자 너머','2장 완료 · 정예 사냥, 전설 장비와 월드보스 성장을 진행하세요.','100%'];
}
function syncQuest(){
  const save=readSave();const panel=document.querySelector<HTMLElement>('#quest-panel');const title=document.querySelector<HTMLElement>('#quest-title');const text=document.querySelector<HTMLElement>('#quest-text');const bar=document.querySelector<HTMLElement>('#quest-bar');
  if(!panel||!title||!text||!bar||!save)return;const active=Number(save.quest||0)>=5;panel.classList.toggle('jw-main-complete',false);panel.classList.toggle('jw-chapter2',active);panel.classList.toggle('jw-chapter-complete',active&&ensureChapter(save).state>=5);
  if(active){const [a,b,c]=questCopy(save);title.textContent=a;text.textContent=b;bar.style.width=c;}
}
function bindQuestClick(){
  const panel=document.querySelector<HTMLElement>('#quest-panel');if(!panel||panel.dataset.jwChapterBound==='1')return;panel.dataset.jwChapterBound='1';
  panel.addEventListener('click',e=>{const save=readSave();if(Number(save?.quest||0)<5)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const ch=ensureChapter(save);const s=worldScene();if(ch.state===0)go(s,'village',1310,780);else if(ch.state===1)go(s,'field');else if(ch.state===2)go(s,'mine');else if(ch.state===3)go(s,'forest');else if(ch.state===4)go(s,'village',1070,720);else toast('메인 임무 2장 완료 · 성장 목표와 보스 콘텐츠를 진행하세요.');},true);
}
function version(){/* Version display is owned by version-v15.ts. */}
function tick(){bindQuestClick();syncQuest();const s=worldScene();if(s?.player){patchScene(s);updateProgress(s);}}
function boot(){version();bindQuestClick();syncQuest();window.setInterval(tick,300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
