import './adventure-design-v1.css';

const SAVE_KEY='junja-world-v01';
const VERSION='3.1.1';
const classMeta={
  warrior:{icon:'⚔',label:'검객'},
  mage:{icon:'✦',label:'도사'},
  ranger:{icon:'➳',label:'궁사'}
} as const;
type ClassKey=keyof typeof classMeta;

function readHeroClass():ClassKey{
  try{
    const save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    const key=String(save?.heroClass||'warrior') as ClassKey;
    return classMeta[key]?key:'warrior';
  }catch{return 'warrior';}
}

function applyClassIdentity(key:ClassKey){
  document.body.classList.remove('ja-class-warrior','ja-class-mage','ja-class-ranger');
  document.body.classList.add(`ja-class-${key}`);
  const emblem=document.querySelector<HTMLElement>('.ja-avatar-emblem');
  if(emblem){emblem.textContent=classMeta[key].icon;emblem.title=classMeta[key].label;}
}

function rebrand(){
  document.title='JUNJA ADVENTURE';
  document.documentElement.dataset.jaDesign='1';
  document.body.classList.add('ja-design-v1');

  const heading=document.querySelector<HTMLElement>('#auth-layer h1');
  if(heading&&heading.textContent!=='JUNJA ADVENTURE')heading.textContent='JUNJA ADVENTURE';
  const eyebrow=document.querySelector<HTMLElement>('#auth-layer .eyebrow');
  if(eyebrow&&eyebrow.textContent!=='COZY FANTASY MMORPG')eyebrow.textContent='COZY FANTASY MMORPG';
  const subtitle=document.querySelector<HTMLElement>('#auth-layer .subtitle');
  if(subtitle&&subtitle.textContent!=='함께 떠나는 작은 모험')subtitle.textContent='함께 떠나는 작은 모험';
  const brand=document.querySelector<HTMLElement>('#game-ui .brand span:last-child');
  if(brand&&brand.textContent!=='JUNJA ADVENTURE')brand.textContent='JUNJA ADVENTURE';
  const footer=[...document.querySelectorAll<HTMLElement>('.login-footer span')].find(el=>/JUNJA (WORLD|ADVENTURE)/.test(el.textContent||''));
  if(footer&&footer.textContent!==`JUNJA ADVENTURE v${VERSION}`)footer.textContent=`JUNJA ADVENTURE v${VERSION}`;
}

function ensureAvatar(){
  const panel=document.querySelector<HTMLElement>('#game-ui .status-panel');
  if(!panel||panel.querySelector('.ja-avatar-emblem'))return;
  const emblem=document.createElement('div');
  emblem.className='ja-avatar-emblem';
  emblem.setAttribute('aria-hidden','true');
  panel.prepend(emblem);
  applyClassIdentity(readHeroClass());
}

function pulse(el:HTMLElement|null){
  if(!el)return;
  el.animate([
    {transform:'scale(1)',filter:'brightness(1)'},
    {transform:'scale(1.025)',filter:'brightness(1.12)'},
    {transform:'scale(1)',filter:'brightness(1)'}
  ],{duration:420,easing:'ease-out'});
}

function ensureQuickMenu(){
  const gameUi=document.querySelector<HTMLElement>('#game-ui');
  if(!gameUi||gameUi.querySelector('.ja-quick-menu'))return;
  const menu=document.createElement('nav');
  menu.className='ja-quick-menu';
  menu.setAttribute('aria-label','준자 어드벤처 빠른 메뉴');
  menu.innerHTML=`
    <button type="button" data-ja-action="bag"><b>🎒</b>가방</button>
    <button type="button" data-ja-action="quest"><b>📜</b>임무</button>
    <button type="button" data-ja-action="travel"><b>🗺️</b>지역</button>`;
  gameUi.append(menu);
  menu.querySelector<HTMLButtonElement>('[data-ja-action="bag"]')?.addEventListener('click',()=>document.querySelector<HTMLButtonElement>('#inventory-button')?.click());
  menu.querySelector<HTMLButtonElement>('[data-ja-action="quest"]')?.addEventListener('click',()=>pulse(document.querySelector<HTMLElement>('#quest-panel')));
  menu.querySelector<HTMLButtonElement>('[data-ja-action="travel"]')?.addEventListener('click',()=>pulse(document.querySelector<HTMLElement>('.zone-dock')));
}

let introTimer=0;
function showZoneIntro(zone?:string){
  const gameUi=document.querySelector<HTMLElement>('#game-ui');
  if(!gameUi||gameUi.classList.contains('hidden'))return;
  let intro=document.querySelector<HTMLElement>('.ja-zone-intro');
  if(!intro){
    intro=document.createElement('div');
    intro.className='ja-zone-intro';
    document.body.append(intro);
  }
  const label=zone||document.querySelector<HTMLElement>('#game-ui .zone strong')?.textContent?.trim()||'모험의 시작';
  intro.innerHTML=`<small>JUNJA ADVENTURE</small><b>${label}</b><span>새로운 모험이 이어집니다</span>`;
  window.clearTimeout(introTimer);
  requestAnimationFrame(()=>intro?.classList.add('show'));
  introTimer=window.setTimeout(()=>intro?.classList.remove('show'),1650);
}

function bindClassCards(){
  document.querySelectorAll<HTMLButtonElement>('.class-card[data-class]').forEach(card=>{
    if(card.dataset.jaBound)return;
    card.dataset.jaBound='1';
    card.addEventListener('click',()=>{
      const key=String(card.dataset.class||'warrior') as ClassKey;
      if(classMeta[key])applyClassIdentity(key);
    });
  });
}

function boot(){
  rebrand();
  ensureAvatar();
  ensureQuickMenu();
  bindClassCards();
  applyClassIdentity(readHeroClass());

  const gameUi=document.querySelector<HTMLElement>('#game-ui');
  if(gameUi){
    let wasOpen=!gameUi.classList.contains('hidden');
    new MutationObserver(()=>{
      const open=!gameUi.classList.contains('hidden');
      rebrand();ensureAvatar();ensureQuickMenu();
      if(open&&!wasOpen){applyClassIdentity(readHeroClass());window.setTimeout(()=>showZoneIntro(),250);}
      wasOpen=open;
    }).observe(gameUi,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
    if(wasOpen)window.setTimeout(()=>showZoneIntro(),350);
  }

  const zone=document.querySelector<HTMLElement>('#game-ui .zone strong');
  if(zone){
    let previous=zone.textContent||'';
    new MutationObserver(()=>{
      const next=zone.textContent||'';
      if(next&&next!==previous){previous=next;showZoneIntro(next.trim());}
    }).observe(zone,{childList:true,characterData:true,subtree:true});
  }

  const footer=document.querySelector('.login-footer');
  if(footer)new MutationObserver(rebrand).observe(footer,{childList:true,characterData:true,subtree:true});
  window.setTimeout(rebrand,500);
  window.setTimeout(rebrand,1600);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
