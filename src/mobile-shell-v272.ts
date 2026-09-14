import './mobile-shell-v272.css';

const MOBILE='(max-width: 760px), (pointer: coarse)';
type Panel='mission'|'map'|'boss'|'bag'|'more'|'';
let active:Panel='';

const alwaysHidden=[
  '.help-note','.jw16-compass','.jw16-patrol-badge','.jw-growth','.jw-minimap','.jw-stage-chip',
  '.jw19-mood','.jw20-target-hud','.jw20-target-button','.jw21-class-meter','.jw22-gear-status',
  '.jw23-nearby','.jw-adventure-button','.jw-shop-button','.jw15-guide-button','.jw24-wallet-chip',
  '.jw24-wallet-card','.jw25-shop-button','.jw25-admin-button','.jw26-account-chip','.jw26-ops-btn',
  '.jw-elite-timer','.jw-combo','.jw27-mobile-dock','.jw27-more-sheet'
];
const panelSelectors=['.quest-panel','.boss-panel','.jw16-world-panel','.zone-dock','#inventory-panel'];

function mobile(){return window.matchMedia(MOBILE).matches;}
function playing(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function hide(el:HTMLElement){el.style.setProperty('display','none','important');}
function release(el:HTMLElement){el.style.removeProperty('display');}
function qAll(selector:string){return Array.from(document.querySelectorAll<HTMLElement>(selector));}

function forceClosedState(){
  if(!mobile()){
    for(const s of alwaysHidden)qAll(s).forEach(release);
    for(const s of panelSelectors)qAll(s).forEach(release);
    document.body.classList.remove('jw272-mobile','jw272-game','jw272-open-mission','jw272-open-map','jw272-open-boss','jw272-open-bag','jw272-open-more');
    return;
  }
  document.body.classList.add('jw272-mobile');
  document.body.classList.toggle('jw272-game',playing());
  for(const s of alwaysHidden)qAll(s).forEach(hide);
  for(const s of panelSelectors)qAll(s).forEach(hide);
  if(active==='mission')qAll('.quest-panel').forEach(release);
  if(active==='boss')qAll('.boss-panel').forEach(release);
  if(active==='map'){
    qAll('.jw16-world-panel').forEach(release);
    qAll('.zone-dock').forEach(release);
  }
  if(active==='bag')qAll('#inventory-panel').forEach(release);
}

function ensureBagOpen(){
  const panel=document.querySelector<HTMLElement>('#inventory-panel');
  if(panel?.classList.contains('hidden'))document.querySelector<HTMLButtonElement>('#inventory-button')?.click();
}
function ensureBagClosed(){
  const panel=document.querySelector<HTMLElement>('#inventory-panel');
  if(panel&&!panel.classList.contains('hidden'))document.querySelector<HTMLButtonElement>('#inventory-close')?.click();
}

function toggle(panel:Panel){
  if(!mobile()||!playing())return;
  const previous=active;
  const next=active===panel?'':panel;
  if(previous==='bag'&&next!=='bag')ensureBagClosed();
  active=next;
  document.body.classList.remove('jw272-open-mission','jw272-open-map','jw272-open-boss','jw272-open-bag','jw272-open-more');
  if(active)document.body.classList.add(`jw272-open-${active}`);
  if(active==='bag')ensureBagOpen();
  updateDock();
  forceClosedState();
}

function updateDock(){
  document.querySelectorAll<HTMLButtonElement>('.jw272-dock button[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===active));
}

function trigger(selector:string){
  const b=document.querySelector<HTMLButtonElement>(selector);
  if(!b)return;
  b.click();
}

function ensureMore(){
  if(document.querySelector('.jw272-more'))return;
  const sheet=document.createElement('section');
  sheet.className='jw272-more';
  sheet.innerHTML=`<header><b>메뉴</b><button type="button" data-close>×</button></header><div class="jw272-more-grid">
    <button type="button" data-act="guide"><i>📖</i><span>가이드</span></button>
    <button type="button" data-act="jcoin"><i>J</i><span>J-Coin</span></button>
    <button type="button" data-act="shop"><i>🛍</i><span>상점</span></button>
    <button type="button" data-act="account"><i>☁</i><span>계정</span></button>
    <button type="button" data-act="adventure"><i>☷</i><span>모험록</span></button>
    <button type="button" data-act="merchant"><i>錢</i><span>잡화상</span></button>
    <button type="button" data-act="bounty"><i>⚑</i><span>현상금</span></button>
  </div>`;
  document.body.appendChild(sheet);
  sheet.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>toggle('more');
  sheet.querySelectorAll<HTMLButtonElement>('[data-act]').forEach(b=>b.onclick=()=>{
    const act=b.dataset.act;
    if(act==='guide')trigger('.jw15-guide-button');
    if(act==='jcoin')trigger('.jw24-wallet-chip');
    if(act==='shop')trigger('.jw25-shop-button');
    if(act==='account')trigger('.jw26-account-chip');
    if(act==='adventure')trigger('.jw-adventure-button');
    if(act==='merchant')trigger('.jw-shop-button');
    if(act==='bounty')trigger('.jw28-bounty-button');
  });
}

function ensureDock(){
  if(document.querySelector('.jw272-dock'))return;
  const dock=document.createElement('nav');
  dock.className='jw272-dock';
  dock.innerHTML=`
    <button type="button" data-panel="mission"><i>◎</i><span>임무</span></button>
    <button type="button" data-panel="map"><i>⌖</i><span>지도</span></button>
    <button type="button" data-panel="boss"><i>♛</i><span>보스</span></button>
    <button type="button" data-panel="bag"><i>▣</i><span>가방</span></button>
    <button type="button" data-panel="more"><i>⋯</i><span>메뉴</span></button>`;
  document.body.appendChild(dock);
  dock.querySelectorAll<HTMLButtonElement>('button[data-panel]').forEach(b=>b.onclick=()=>toggle((b.dataset.panel||'') as Panel));
}

function sync(){
  ensureDock();ensureMore();
  if(!mobile()||!playing()){
    if(!playing())active='';
    forceClosedState();updateDock();return;
  }
  forceClosedState();updateDock();
}

function boot(){
  sync();
  const ui=document.querySelector('#game-ui');
  if(ui)new MutationObserver(sync).observe(ui,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>sync()).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',sync);
  window.setInterval(sync,220);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
