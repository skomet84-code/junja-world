import './quest-ui-authority-v274.css';

const SAVE_KEY='junja-world-v01';
let applying=false;

function read(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function copy(save:any):[string,string,string]{
  const q=Number(save?.quest||0);
  if(q<5){
    if(q===0)return['낯선 마을의 부름','촌장 백운을 찾아가자.','12%'];
    if(q===1)return['청운들판 토벌',`청운들판 요괴 5마리 처치 (${Math.min(Number(save.kills||0),5)}/5)`,'48%'];
    if(q===2)return['백운에게 보고','촌장 백운에게 돌아가 보상을 받자.','82%'];
    if(q===3)return['흑철광산 조사',`흑철광석 5개 채집 (${Math.min(Number(save.resources?.ore||0),5)}/5)`,'92%'];
    return['월영숲의 문','Lv.10 달성 후 월영숲에 입장하자.','100%'];
  }
  const c2=Number(save?.chapter2?.state||0);
  if(c2<5){
    const kills=Math.max(0,Number(save.kills||0)-Number(save.chapter2?.baseKills||0));
    const ore=Math.max(0,Number(save.resources?.ore||0)-Number(save.chapter2?.baseOre||0));
    if(c2===0)return['2장 · 그림자의 흔적','경비 무진에게 성 밖의 이상징후를 확인하자.','8%'];
    if(c2===1)return['2장 · 청운의 이상징후',`청운들판 요괴 10마리 토벌 (${Math.min(kills,10)}/10)`,`${15+Math.min(kills,10)*4}%`];
    if(c2===2)return['2장 · 흑철의 파편',`흑철광석 8개 새로 채집 (${Math.min(ore,8)}/8)`,`${58+Math.min(ore,8)*3}%`];
    if(c2===3)return['2장 · 월영숲의 정예','월영숲 정예 요괴를 처치하자.','88%'];
    return['2장 · 그림자 봉인','촌장 백운에게 돌아가 조사 결과를 보고하자.','96%'];
  }
  const c3=Number(save?.chapter3?.state||0);
  const ch3=save?.chapter3||{};
  if(c3===0)return['3장 · 월영의 균열','촌장 백운에게 월영숲의 불길한 기운을 보고하자.','7%'];
  if(c3===1)return['3장 · 달빛 아래 추적',`월영숲 요괴 15마리 토벌 (${Math.min(Number(ch3.forestKills||0),15)}/15)`,`${12+Math.min(Number(ch3.forestKills||0),15)*3}%`];
  if(c3===2)return['3장 · 균열의 결정',`월광결정 6개 직접 채집 (${Math.min(Number(ch3.crystalsGathered||0),6)}/6)`,`${58+Math.min(Number(ch3.crystalsGathered||0),6)*4}%`];
  if(c3===3)return['3장 · 봉인수호자','월영숲에 나타난 봉인수호자를 격파하자.','88%'];
  if(c3===4)return['3장 · 백운의 결단','촌장 백운에게 봉인수호자 격파를 보고하자.','96%'];
  return['3장 · 달빛의 수호자','3장 완료 · 상위 성장과 봉인동굴을 준비하세요.','100%'];
}
function apply(){
  if(applying)return;
  const save=read(),panel=document.querySelector<HTMLElement>('#quest-panel'),title=document.querySelector<HTMLElement>('#quest-title'),text=document.querySelector<HTMLElement>('#quest-text'),bar=document.querySelector<HTMLElement>('#quest-bar');
  if(!save||!panel||!title||!text||!bar)return;
  applying=true;
  const [a,b,c]=copy(save);
  if(title.textContent!==a)title.textContent=a;
  if(text.textContent!==b)text.textContent=b;
  if(bar.style.width!==c)bar.style.width=c;
  const q=Number(save.quest||0),c2=Number(save.chapter2?.state||0),c3=Number(save.chapter3?.state||0);
  panel.classList.toggle('jw-chapter2',q>=5&&c2<5);
  panel.classList.toggle('jw-chapter3',q>=5&&c2>=5);
  panel.classList.toggle('jw-chapter3-complete',q>=5&&c2>=5&&c3>=5);
  panel.classList.remove('jw-main-complete');
  applying=false;
}
function boot(){
  const panel=document.querySelector('#quest-panel');
  if(panel)new MutationObserver(()=>queueMicrotask(apply)).observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  apply();window.setInterval(apply,220);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
