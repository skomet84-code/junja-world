import Phaser from 'phaser';
import './v12.css';

const SAVE_KEY='junja-world-v01';
const trackedGames=new Set<any>();
const patchedScenes=new WeakSet<any>();
let combo=0,lastKillAt=0,comboTimer=0,lastEliteAliveAt=performance.now(),lastPromoteAt=0;

function installTracking(){const proto=(Phaser.Game as any)?.prototype;if(!proto||proto.__jwV12Tracked)return;const boot=proto.boot,destroy=proto.destroy;if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};proto.__jwV12Tracked=true;}
installTracking();
function scene():any|null{const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];for(const game of games){const s=game?.scene?.keys?.world;if(s?.sys?.isActive?.())return s;try{const x=game?.scene?.getScene?.('world');if(x?.sys?.isActive?.())return x;}catch{}}return null;}
function readSave():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function writeSave(save:any,s?:any){localStorage.setItem(SAVE_KEY,JSON.stringify(save));if(s?.save)Object.assign(s.save,save);}
function toast(msg:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2300);}
function zoneName(z:string){return({village:'백운성',field:'청운들판',mine:'흑철광산',forest:'월영숲'} as Record<string,string>)[z]||z;}
function zoneTip(z:string){return({village:'NPC·제작소·잡화상 이용. 사냥 준비와 퀘스트 보고를 하는 안전 지역.',field:'Lv.1+ 초급 사냥터. 목재·청심초를 모으고 기본 전투를 익히기 좋습니다.',mine:'Lv.5+ 중급 지역. 흑철광석을 채집하고 강화 재료를 확보하세요.',forest:'Lv.10+ 상급 지역. 정예 요괴와 월광결정, 희귀 장비 성장을 노리는 곳입니다.'} as Record<string,string>)[z]||'미지의 지역';}

const shop=[
 {id:'potion',icon:'藥',name:'회복약',desc:'HP +65 · 자동물약에도 사용',price:80,buy:(s:any)=>s.potions=Number(s.potions||0)+1},
 {id:'herb',icon:'草',name:'청심초 묶음',desc:'회복약 제작 재료 ×3',price:120,buy:(s:any)=>{s.resources.herb=Number(s.resources?.herb||0)+3}},
 {id:'wood',icon:'木',name:'참나무 목재',desc:'무기 제작 재료 ×2',price:100,buy:(s:any)=>{s.resources.wood=Number(s.resources?.wood||0)+2}},
 {id:'ore',icon:'鐵',name:'흑철광석',desc:'장비 강화 재료 ×2',price:240,buy:(s:any)=>{s.resources.ore=Number(s.resources?.ore||0)+2}},
 {id:'crystal',icon:'晶',name:'월광결정',desc:'상위 방어구 강화용 희귀 재료',price:650,buy:(s:any)=>{s.resources.crystal=Number(s.resources?.crystal||0)+1}},
 {id:'bundle',icon:'包',name:'모험가 보급상자',desc:'회복약 3 + 청심초 3 + 목재 2',price:360,buy:(s:any)=>{s.potions=Number(s.potions||0)+3;s.resources.herb=Number(s.resources?.herb||0)+3;s.resources.wood=Number(s.resources?.wood||0)+2}}
];

const achievements=[
 {id:'kill10',title:'첫 토벌대',desc:'요괴 10마리 처치',reward:'250엽전',done:(s:any)=>Number(s.kills||0)>=10,give:(s:any)=>s.gold=Number(s.gold||0)+250},
 {id:'level5',title:'초급 무사',desc:'Lv.5 달성',reward:'350엽전 · 회복약 2',done:(s:any)=>Number(s.level||1)>=5,give:(s:any)=>{s.gold=Number(s.gold||0)+350;s.potions=Number(s.potions||0)+2}},
 {id:'gear3',title:'강화의 맛',desc:'무기 +3 달성',reward:'450엽전',done:(s:any)=>Number(s.weaponLevel||0)>=3,give:(s:any)=>s.gold=Number(s.gold||0)+450},
 {id:'armor3',title:'단단한 갑주',desc:'방어구 +3 달성',reward:'450엽전',done:(s:any)=>Number(s.armorLevel||0)>=3,give:(s:any)=>s.gold=Number(s.gold||0)+450},
 {id:'rare1',title:'별빛 전리품',desc:'희귀 장비 1종 획득',reward:'700엽전 · 회복약 3',done:(s:any)=>Array.isArray(s.rareItems)&&s.rareItems.length>=1,give:(s:any)=>{s.gold=Number(s.gold||0)+700;s.potions=Number(s.potions||0)+3}},
 {id:'chapter2',title:'그림자 봉인',desc:'메인 임무 2장 완료',reward:'1,500엽전 · 월광결정 2',done:(s:any)=>Number(s.chapter2?.state||0)>=5,give:(s:any)=>{s.gold=Number(s.gold||0)+1500;s.resources.crystal=Number(s.resources?.crystal||0)+2}}
];
function claimed(save:any){if(!Array.isArray(save.jw12Achievements))save.jw12Achievements=[];return save.jw12Achievements as string[];}

function createUi(){
 if(!document.querySelector('.jw-adventure-button')){const b=document.createElement('button');b.className='jw-adventure-button';b.textContent='☷ 모험록';b.onclick=()=>{document.querySelector('.jw-adventure-layer')?.classList.remove('hidden');renderAdventure();};document.body.appendChild(b);}
 if(!document.querySelector('.jw-shop-button')){const b=document.createElement('button');b.className='jw-shop-button hidden';b.textContent='錢 잡화상';b.onclick=()=>{document.querySelector('.jw-shop-layer')?.classList.remove('hidden');renderShop();};document.body.appendChild(b);}
 if(!document.querySelector('.jw-adventure-layer')){const el=document.createElement('section');el.className='jw-adventure-layer hidden';el.innerHTML='<div class="jw-adventure-shell"><div class="jw-panel-head"><div><b>준자월드 모험록</b><small>지역 정보 · 성장 업적 · 보상</small></div><button type="button">×</button></div><div class="jw-adventure-body"></div></div>';el.querySelector('button')!.onclick=()=>el.classList.add('hidden');el.addEventListener('click',e=>{if(e.target===el)el.classList.add('hidden')});document.body.appendChild(el);}
 if(!document.querySelector('.jw-shop-layer')){const el=document.createElement('section');el.className='jw-shop-layer hidden';el.innerHTML='<div class="jw-shop-shell"><div class="jw-panel-head"><div><b>상인 연화 · 잡화상</b><small>모험에 필요한 기본 물자를 판매합니다.</small></div><button type="button">×</button></div><div class="jw-shop-body"></div></div>';el.querySelector('button')!.onclick=()=>el.classList.add('hidden');el.addEventListener('click',e=>{if(e.target===el)el.classList.add('hidden')});document.body.appendChild(el);}
 if(!document.querySelector('.jw-combo')){const el=document.createElement('div');el.className='jw-combo';document.body.appendChild(el);}
 if(!document.querySelector('.jw-elite-timer')){const el=document.createElement('div');el.className='jw-elite-timer';document.body.appendChild(el);}
}
function renderAdventure(){const body=document.querySelector<HTMLElement>('.jw-adventure-body'),s=readSave(),w=scene();if(!body||!s)return;const z=String(w?.zone||'village'),done=claimed(s);body.innerHTML=`<div class="jw-zone-card"><b>${zoneName(z)}</b><p>${zoneTip(z)}</p></div><div class="jw-adventure-section-title">성장 업적</div><div class="jw-achievements">${achievements.map(a=>{const ok=a.done(s),got=done.includes(a.id);return `<div class="jw-achievement ${ok?'done':''} ${got?'claimed':''}" data-achievement="${a.id}"><div><b>${a.title}</b><small>${a.desc} · 보상 ${a.reward}</small></div><button ${!ok||got?'disabled':''}>${got?'수령완료':ok?'보상받기':'진행중'}</button></div>`}).join('')}</div>`;body.querySelectorAll<HTMLElement>('[data-achievement]').forEach(row=>row.querySelector('button')?.addEventListener('click',()=>claimAchievement(row.dataset.achievement||'')));}
function claimAchievement(id:string){const s=scene(),save=s?.save||readSave();const a=achievements.find(x=>x.id===id);if(!save||!a||!a.done(save))return;const done=claimed(save);if(done.includes(id))return;a.give(save);done.push(id);writeSave(save,s);toast(`업적 보상 획득 · ${a.reward}`);renderAdventure();}
function renderShop(){const body=document.querySelector<HTMLElement>('.jw-shop-body'),s=readSave();if(!body||!s)return;body.innerHTML=`<div class="jw-shop-wallet">보유 엽전 <b>${Number(s.gold||0).toLocaleString()}</b></div><div class="jw-shop-grid">${shop.map(i=>`<div class="jw-shop-item" data-shop="${i.id}"><span class="icon">${i.icon}</span><b>${i.name}</b><small>${i.desc}</small><button>${i.price.toLocaleString()} 엽전</button></div>`).join('')}</div>`;body.querySelectorAll<HTMLElement>('[data-shop]').forEach(row=>row.querySelector('button')?.addEventListener('click',()=>buy(row.dataset.shop||'')));}
function buy(id:string){const s=scene(),save=s?.save||readSave(),item=shop.find(x=>x.id===id);if(!save||!item)return;if(String(s?.zone||'village')!=='village'){toast('잡화상은 백운성에서만 이용할 수 있습니다.');return;}if(Number(save.gold||0)<item.price){toast('엽전이 부족합니다.');return;}if(!save.resources)save.resources={wood:0,herb:0,ore:0,crystal:0};save.gold-=item.price;item.buy(save);writeSave(save,s);toast(`${item.name} 구입 완료`);renderShop();}

function showCombo(){const el=document.querySelector<HTMLElement>('.jw-combo');if(!el)return;window.clearTimeout(comboTimer);if(combo<2){el.classList.remove('show');return;}el.textContent=`${combo} COMBO`;el.classList.add('show');comboTimer=window.setTimeout(()=>el.classList.remove('show'),1600);}
function patchCombat(s:any){if(patchedScenes.has(s)||typeof s.defeat!=='function')return;const original=s.defeat.bind(s);s.defeat=function(m:any){const now=performance.now();combo=now-lastKillAt<8000?combo+1:1;lastKillAt=now;const elite=!!m?.getData?.('jwElite');original(m);const save=s.save||readSave();if(save&&combo>0&&combo%5===0){const bonus=20*combo;save.gold=Number(save.gold||0)+bonus;writeSave(save,s);toast(`${combo}연속 처치 · 보너스 ${bonus}엽전`);}if(elite){lastEliteAliveAt=now;toast(`정예 토벌 성공 · 다음 정예가 잠시 후 출현합니다.`);}showCombo();};patchedScenes.add(s);}
function alive(m:any){return !!m&&m.active!==false&&m.visible!==false&&!m.destroyed;}
function promoteElite(s:any){const zone=String(s.zone||'village');if(zone==='village')return;const mobs=(s.monsters?.getChildren?.()||[]).filter((m:any)=>alive(m)&&!m.getData?.('isBoss')&&!m.getData?.('jwElite'));if(!mobs.length)return;const m=mobs[Math.floor(Math.random()*mobs.length)];const baseMax=Number(m.getData?.('jwBaseMaxHp')||m.getData?.('maxHp')||m.getData?.('hp')||50),baseDmg=Number(m.getData?.('jwBaseDamage')||m.getData?.('damage')||5),baseXp=Number(m.getData?.('jwBaseXp')||m.getData?.('xp')||10),baseGold=Number(m.getData?.('jwBaseGold')||m.getData?.('gold')||5),baseScale=Number(m.getData?.('jwBaseScale')||m.scaleX||1);if(!m.getData?.('jwBaseMaxHp')){m.setData?.('jwBaseMaxHp',baseMax);m.setData?.('jwBaseDamage',baseDmg);m.setData?.('jwBaseXp',baseXp);m.setData?.('jwBaseGold',baseGold);m.setData?.('jwBaseScale',baseScale);}const max=Math.round(baseMax*2.35);m.setData?.('maxHp',max);m.setData?.('hp',max);m.setData?.('damage',Math.max(1,Math.round(baseDmg*1.4)));m.setData?.('xp',Math.round(baseXp*2.4));m.setData?.('gold',Math.round(baseGold*2.7));const raw=String(m.getData?.('jwBaseName')||m.getData?.('name')||'요괴').replace(/^정예\s+/,'');m.setData?.('name',`정예 ${raw}`);m.setData?.('jwElite',true);m.setScale?.(baseScale*1.22);m.setTint?.(zone==='mine'?0xd1a5ff:zone==='forest'?0xd5e48a:0xf0bd73);lastEliteAliveAt=performance.now();lastPromoteAt=performance.now();toast(`⚠ 정예 ${raw} 출현`);}
function eliteTick(s:any){const zone=String(s?.zone||'village'),timer=document.querySelector<HTMLElement>('.jw-elite-timer');if(!timer)return;if(zone==='village'){timer.innerHTML='<b>정예</b> · 사냥터에서 출현';return;}const active=(s.monsters?.getChildren?.()||[]).find((m:any)=>alive(m)&&m.getData?.('jwElite'));if(active){lastEliteAliveAt=performance.now();timer.innerHTML=`<b>정예 출현 중</b> · ${String(active.getData?.('name')||'정예 요괴')}`;return;}const elapsed=performance.now()-lastEliteAliveAt,wait=Math.max(0,20000-elapsed);timer.innerHTML=`<b>다음 정예</b> · ${Math.ceil(wait/1000)}초`;if(wait<=0&&performance.now()-lastPromoteAt>15000)promoteElite(s);}
function uiTick(s:any){const shopBtn=document.querySelector<HTMLElement>('.jw-shop-button');if(shopBtn)shopBtn.classList.toggle('hidden',String(s?.zone||'village')!=='village');if(document.querySelector('.jw-adventure-layer:not(.hidden)'))renderAdventure();}
function setVersion(){/* Version display is owned by version-v15.ts. */}
function tick(){const s=scene();if(!s?.player)return;patchCombat(s);eliteTick(s);uiTick(s);}
function boot(){createUi();setVersion();window.setInterval(tick,300);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
