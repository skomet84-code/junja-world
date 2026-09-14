import Phaser from 'phaser';
import './mobile-hud-v27.css';

const SAVE_KEY='junja-world-v01';
const MOBILE_QUERY='(max-width: 760px), (pointer: coarse)';
let activePanel='';
let questAssistRunning=false;
let questAssistTimer=0;

function mobile(){return window.matchMedia(MOBILE_QUERY).matches;}
function gameActive(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function scene():any|null{
  for(const game of (((Phaser as any).GAMES||[]) as any[])){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}
function save(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function toast(text:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=text;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2200);}

const panelDefs=[
  {id:'mission',icon:'◎',label:'임무'},
  {id:'map',icon:'⌖',label:'지도'},
  {id:'boss',icon:'♛',label:'보스'},
  {id:'bag',icon:'▣',label:'가방'},
  {id:'more',icon:'⋯',label:'메뉴'}
];

function ensureDock(){
  if(document.querySelector('.jw27-mobile-dock'))return;
  const dock=document.createElement('nav');dock.className='jw27-mobile-dock';dock.setAttribute('aria-label','모바일 메뉴');
  for(const def of panelDefs){
    const b=document.createElement('button');b.type='button';b.dataset.jw27=def.id;b.innerHTML=`<i>${def.icon}</i><span>${def.label}</span>`;b.onclick=()=>togglePanel(def.id);dock.appendChild(b);
  }
  document.body.appendChild(dock);
}
function clearPanels(){
  document.body.classList.remove('jw27-open-mission','jw27-open-map','jw27-open-boss','jw27-open-bag','jw27-open-more');
  document.querySelectorAll<HTMLElement>('.jw27-mobile-dock button').forEach(b=>b.classList.remove('active'));
}
function togglePanel(id:string){
  if(!mobile())return;
  const same=activePanel===id;
  if(same&&id==='bag')document.querySelector<HTMLButtonElement>('#inventory-button')?.click();
  clearPanels();activePanel=same?'':id;
  if(!activePanel)return;
  document.body.classList.add(`jw27-open-${activePanel}`);
  document.querySelector<HTMLElement>(`.jw27-mobile-dock button[data-jw27="${activePanel}"]`)?.classList.add('active');
  if(activePanel==='bag'&&document.querySelector<HTMLElement>('#inventory-panel')?.classList.contains('hidden'))document.querySelector<HTMLButtonElement>('#inventory-button')?.click();
  if(activePanel==='more')openMoreMenu();
}
function openMoreMenu(){
  let menu=document.querySelector<HTMLElement>('.jw27-more-sheet');
  if(!menu){
    menu=document.createElement('section');menu.className='jw27-more-sheet';
    menu.innerHTML=`<header><b>메뉴</b><button type="button" data-jw27-close>×</button></header><div class="jw27-more-grid"><button data-target="guide">📖<span>가이드</span></button><button data-target="jcoin">J<span>J-Coin</span></button><button data-target="shop">🛍<span>상점</span></button><button data-target="account">☁<span>계정</span></button></div>`;
    document.body.appendChild(menu);
    menu.querySelector<HTMLButtonElement>('[data-jw27-close]')!.onclick=()=>togglePanel('more');
    menu.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(b=>b.onclick=()=>{
      const t=b.dataset.target;
      if(t==='guide')document.querySelector<HTMLButtonElement>('.jw15-guide-button')?.click();
      if(t==='jcoin')document.querySelector<HTMLButtonElement>('.jw24-wallet-chip')?.click();
      if(t==='shop')document.querySelector<HTMLButtonElement>('.jw25-shop-button')?.click();
      if(t==='account')document.querySelector<HTMLButtonElement>('.jw26-account-chip')?.click();
    });
  }
}

function questIndex(){return Number(save()?.quest||0);}
function stopAssist(reason=''){questAssistRunning=false;window.clearTimeout(questAssistTimer);document.body.classList.remove('jw27-quest-running');if(reason)toast(reason);}
function nearestMonster(s:any){
  if(!s?.player)return null;
  const list=(s.monsters?.getChildren?.()||[]).filter((m:any)=>m?.active!==false&&m?.visible!==false&&!m?.destroyed&&!m?.getData?.('isBoss'));
  return list.sort((a:any,b:any)=>Phaser.Math.Distance.Between(s.player.x,s.player.y,a.x,a.y)-Phaser.Math.Distance.Between(s.player.x,s.player.y,b.x,b.y))[0]||null;
}
function nearestReadyNode(s:any,kind?:string){
  if(!s?.player)return null;
  const list=(s.nodes?.getChildren?.()||[]).filter((n:any)=>n?.active!==false&&n?.getData?.('ready')!==false&&(!kind||String(n.getData?.('kind'))===kind));
  return list.sort((a:any,b:any)=>Phaser.Math.Distance.Between(s.player.x,s.player.y,a.x,a.y)-Phaser.Math.Distance.Between(s.player.x,s.player.y,b.x,b.y))[0]||null;
}
function moveNear(s:any,target:any,range=90){
  if(!target||!s?.player)return false;
  const d=Phaser.Math.Distance.Between(s.player.x,s.player.y,target.x,target.y);
  if(d<=range)return true;
  try{s.autoTarget=new Phaser.Math.Vector2(target.x,target.y);}catch{}
  return false;
}
function scheduleAssist(ms=350){questAssistTimer=window.setTimeout(questAssistStep,ms);}
function startQuestAssist(){
  const s=scene();if(!s){toast('게임 준비 중이야. 잠시 후 다시 눌러줘.');return;}
  if(questAssistRunning){stopAssist('임무 자동 진행을 중지했어.');return;}
  questAssistRunning=true;document.body.classList.add('jw27-quest-running');clearPanels();activePanel='';toast('임무 자동 진행 시작');questAssistStep();
}
function questAssistStep(){
  if(!questAssistRunning||!gameActive())return;
  const s=scene(),q=questIndex();if(!s?.player){scheduleAssist(500);return;}
  try{
    if(q===0||q===2){
      if(String(s.zone)!=='village'){s.travel?.('village');scheduleAssist(700);return;}
      const elder=s.elder||{x:1070,y:645};
      if(moveNear(s,elder,115)){s.autoTarget=undefined;s.contextAction?.();scheduleAssist(850);return;}
      scheduleAssist();return;
    }
    if(q===1){
      if(String(s.zone)!=='field'){s.travel?.('field');scheduleAssist(800);return;}
      const m=nearestMonster(s);if(!m){scheduleAssist(700);return;}
      if(moveNear(s,m,100)){s.autoTarget=undefined;s.attack?.();scheduleAssist(430);return;}
      scheduleAssist();return;
    }
    if(q===3){
      if(String(s.zone)!=='mine'){s.travel?.('mine');scheduleAssist(800);return;}
      const n=nearestReadyNode(s,'ore');if(!n){scheduleAssist(800);return;}
      if(moveNear(s,n,95)){s.autoTarget=undefined;s.contextAction?.();scheduleAssist(700);return;}
      scheduleAssist();return;
    }
    if(q>=4){
      const level=Number(save()?.level||1);
      if(level<10){
        if(String(s.zone)==='village')s.travel?.(level>=5?'mine':'field');
        const m=nearestMonster(s);if(m&&moveNear(s,m,100)){s.autoTarget=undefined;s.attack?.();}
        scheduleAssist(450);return;
      }
      if(String(s.zone)!=='forest'){s.travel?.('forest');scheduleAssist(900);return;}
      stopAssist('현재 메인 임무 목표까지 자동 진행했어.');return;
    }
  }catch{scheduleAssist(650);}
}

function bindMission(){
  const quest=document.querySelector<HTMLElement>('#quest-panel');if(!quest||quest.dataset.jw27Bound==='1')return;
  quest.dataset.jw27Bound='1';
  quest.addEventListener('click',(e)=>{if(!mobile())return;e.preventDefault();e.stopImmediatePropagation();startQuestAssist();},{capture:true});
}
function compactTopBar(){
  if(!mobile())return;
  for(const selector of ['.jw15-guide-button','.jw24-wallet-chip','.jw25-shop-button','.jw25-admin-button','.jw26-account-chip','.jw26-ops-btn'])document.querySelector<HTMLElement>(selector)?.classList.add('jw27-top-hidden');
}
function sync(){
  document.body.classList.toggle('jw27-mobile',mobile()&&gameActive());
  ensureDock();bindMission();compactTopBar();
  if(!mobile()){clearPanels();activePanel='';stopAssist();}
}
function boot(){sync();window.setInterval(sync,350);window.addEventListener('resize',sync,{passive:true});window.addEventListener('orientationchange',sync);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
