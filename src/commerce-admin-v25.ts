import Phaser from 'phaser';
import './v25.css';

const SAVE_KEY='junja-world-v01';
const STYLE_KEY='junja-world-v25-style';
type ShopItem={id:string;category:string;name:string;icon:string;rarity:string;price:number;desc:string;owned:boolean;equipped?:boolean};
type StoreState={linked:boolean;jcoin:number;nickname?:string;admin?:boolean;items:ShopItem[]};
type StyleState={costume?:string;pet?:string};

let store:StoreState={linked:false,jcoin:0,items:[]};
let adminAccess=false;
let activeTab='all';
let busy=false;
let visualScene:any=null;
let petVisual:any=null;
let costumeVisual:any=null;
let costumeRing:any=null;
let visualKey='';

const ITEM_VISUALS:Record<string,{icon:string;color:number,label:string}>={
 costume_royal:{icon:'👑',color:0xf2c95b,label:'로열 크라운'},
 costume_angel:{icon:'✦',color:0xcfe9ff,label:'헤븐 윙'},
 costume_dragon:{icon:'🐲',color:0xffbd45,label:'골든 드래곤'},
 pet_cat:{icon:'🐈',color:0xe8d0a6,label:'카지노 캣'},
 pet_fox:{icon:'🦊',color:0xff8b55,label:'루비 폭스'},
 pet_dragon:{icon:'🐉',color:0x7fd5ff,label:'베이비 드래곤'}
};

function readSave():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function writeSave(s:any){localStorage.setItem(SAVE_KEY,JSON.stringify(s));}
function readStyle():StyleState{try{return JSON.parse(localStorage.getItem(STYLE_KEY)||'{}')||{};}catch{return {};}}
function writeStyle(s:StyleState){localStorage.setItem(STYLE_KEY,JSON.stringify(s));visualKey='';}
function fmt(n:number){return new Intl.NumberFormat('ko-KR').format(Math.max(0,Math.trunc(Number(n)||0)));}
function gameActive(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function currentScene():any{
 const games=((Phaser as any).GAMES||[]) as any[];
 for(let i=games.length-1;i>=0;i--){const s=games[i]?.scene?.getScene?.('world');if(s?.scene?.isActive?.())return s;}
 return null;
}
function status(text:string){const e=document.querySelector<HTMLElement>('#jw25-status');if(e)e.textContent=text;}

function createButtons(){
 const top=document.querySelector<HTMLElement>('.top-bar');if(!top)return;
 if(!top.querySelector('.jw25-shop-button')){const b=document.createElement('button');b.className='jw25-shop-button';b.type='button';b.textContent='J 상점';b.onclick=openShop;const wallet=top.querySelector('.jw24-wallet-chip');wallet?.after(b)??top.appendChild(b);}
 if(!top.querySelector('.jw25-admin-button')){const b=document.createElement('button');b.className='jw25-admin-button';b.type='button';b.textContent='GM';b.onclick=openAdmin;const shop=top.querySelector('.jw25-shop-button');shop?.after(b)??top.appendChild(b);}
 const shop=top.querySelector<HTMLElement>('.jw25-shop-button'),admin=top.querySelector<HTMLElement>('.jw25-admin-button');
 if(shop)shop.style.display=gameActive()&&store.linked?'inline-flex':'none';
 if(admin)admin.style.display=gameActive()&&adminAccess?'inline-flex':'none';
}

function createLayers(){
 if(!document.querySelector('#jw25-shop-layer')){const layer=document.createElement('div');layer.id='jw25-shop-layer';layer.className='jw25-layer hidden';layer.innerHTML=`<section class="jw25-panel"><header class="jw25-head"><div><small>JUNJA WORLD · J-COIN BOUTIQUE</small><h2>J-Coin 외형 상점</h2></div><button type="button" data-jw25-close>×</button></header><div class="jw25-body"><div class="jw25-wallet-line"><span>준자랜드 연동 잔액</span><b id="jw25-shop-balance">0 J</b></div><div class="jw25-tabs"><button class="active" data-jw25-tab="all">전체</button><button data-jw25-tab="costume">외형</button><button data-jw25-tab="pet">펫</button></div><div id="jw25-items" class="jw25-items"></div><p id="jw25-status" class="jw25-status"></p><div class="jw25-note">결제는 준자랜드의 기존 상점 결제 시스템을 그대로 사용합니다. 잔액 부족·중복 구매 검사는 준자랜드 서버가 처리하고 거래 내역도 기존 원장에 기록됩니다. 준자월드는 임의 금액 차감·지급·환전 기능을 갖지 않습니다.</div></div></section>`;document.body.appendChild(layer);layer.addEventListener('click',e=>{if(e.target===layer)closeLayer(layer);});layer.querySelector('[data-jw25-close]')?.addEventListener('click',()=>closeLayer(layer));layer.querySelectorAll<HTMLButtonElement>('[data-jw25-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.jw25Tab||'all';layer.querySelectorAll('[data-jw25-tab]').forEach(x=>x.classList.toggle('active',x===b));renderShop();});}
 if(!document.querySelector('#jw25-admin-layer')){const layer=document.createElement('div');layer.id='jw25-admin-layer';layer.className='jw25-layer hidden';layer.innerHTML=`<section class="jw25-panel"><header class="jw25-head"><div><small>JUNJA WORLD · GM CONSOLE</small><h2>관리자 모드</h2></div><button type="button" data-jw25-close>×</button></header><div id="jw25-admin-body" class="jw25-body"></div></section>`;document.body.appendChild(layer);layer.addEventListener('click',e=>{if(e.target===layer)closeLayer(layer);});layer.querySelector('[data-jw25-close]')?.addEventListener('click',()=>closeLayer(layer));}
 if(!document.querySelector('.jw25-cosmetic-badge')){const b=document.createElement('div');b.className='jw25-cosmetic-badge hidden';document.body.appendChild(b);}
}
function closeLayer(layer:Element|null){layer?.classList.add('hidden');}

async function refreshWallet(){
 try{const r=await fetch('/api/jcoin/wallet',{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(r.ok){store.linked=!!d.linked;store.jcoin=Number(d.jcoin||0);store.nickname=d.nickname?String(d.nickname):undefined;adminAccess=!!d.admin;}}
 catch{}
 createButtons();
}
async function refreshShop(silent=true){
 if(busy)return;busy=true;
 try{const r=await fetch('/api/jcoin/shop',{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'상점 정보를 불러오지 못했습니다.');store={linked:true,jcoin:Number(d.jcoin||0),nickname:d.nickname?String(d.nickname):undefined,admin:!!d.admin,items:Array.isArray(d.items)?d.items:[]};adminAccess=!!d.admin;renderShop();createButtons();}
 catch(e:any){if(!silent)status(String(e?.message||'상점 연결에 실패했습니다.'));}
 finally{busy=false;}
}
function renderShop(){
 const balance=document.querySelector<HTMLElement>('#jw25-shop-balance'),box=document.querySelector<HTMLElement>('#jw25-items');if(balance)balance.textContent=`${fmt(store.jcoin)} J`;if(!box)return;
 const style=readStyle();const items=store.items.filter(x=>activeTab==='all'||x.category===activeTab);
 if(!items.length){box.innerHTML='<div class="jw25-note">현재 표시할 상품이 없습니다. J-Coin 계정 연결 상태를 확인해주세요.</div>';return;}
 box.innerHTML=items.map(item=>{const active=style[item.category as keyof StyleState]===item.id;const canBuy=store.jcoin>=item.price;return `<article class="jw25-item ${item.owned?'owned':''}"><div class="jw25-item-icon">${item.icon||'✦'}</div><small>${item.rarity||item.category}</small><h3>${item.name}</h3><p>${item.desc||'준자월드에서 사용할 수 있는 연동 외형 아이템입니다.'}</p><div class="jw25-item-price"><span>${item.owned?'보유 중':'가격'}</span><b>${fmt(item.price)} J</b></div>${item.owned?`<button class="use" data-jw25-use="${item.id}" data-cat="${item.category}">${active?'적용 해제':'준자월드에 적용'}</button>`:`<button data-jw25-buy="${item.id}" ${canBuy?'':'disabled'}>${canBuy?'구매':'J-Coin 부족'}</button>`}</article>`;}).join('');
 box.querySelectorAll<HTMLButtonElement>('[data-jw25-buy]').forEach(b=>b.onclick=()=>buyItem(b.dataset.jw25Buy||''));
 box.querySelectorAll<HTMLButtonElement>('[data-jw25-use]').forEach(b=>b.onclick=()=>toggleItem(b.dataset.jw25Use||'',b.dataset.cat||''));
}
async function buyItem(itemId:string){
 const item=store.items.find(x=>x.id===itemId);if(!item||busy)return;if(!confirm(`${item.name}을(를) ${fmt(item.price)} J-Coin으로 구매할까?\n구매 금액은 준자랜드 기존 게임머니에서 차감돼.`))return;
 busy=true;status('준자랜드 상점에서 결제를 확인하고 있습니다…');
 try{const r=await fetch('/api/jcoin/shop/buy',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'구매에 실패했습니다.');status(`${item.name} 구매 완료 · 준자월드에서 바로 적용할 수 있습니다.`);store.jcoin=Number(d.jcoin??store.jcoin);store.items=Array.isArray(d.items)?d.items:store.items;renderShop();}
 catch(e:any){status(String(e?.message||'구매에 실패했습니다.'));}
 finally{busy=false;}
}
function toggleItem(itemId:string,category:string){
 const item=store.items.find(x=>x.id===itemId&&x.owned);if(!item)return;const style=readStyle();if(category==='costume')style.costume=style.costume===itemId?undefined:itemId;if(category==='pet')style.pet=style.pet===itemId?undefined:itemId;writeStyle(style);renderShop();syncVisuals(true);status(`${item.name} ${((category==='costume'?style.costume:style.pet)===itemId)?'적용 완료':'적용 해제'}`);
}
async function openShop(){
 createLayers();const layer=document.querySelector('#jw25-shop-layer');layer?.classList.remove('hidden');status('상점 정보를 확인하고 있습니다…');await refreshShop(false);if(store.linked)status('준자랜드 보유 상품과 J-Coin 잔액을 확인했습니다.');
}

function maxHp(s:any){const base=s?.heroClass==='mage'?92:s?.heroClass==='ranger'?104:120;const rare=Array.isArray(s?.rareItems)?s.rareItems.reduce((n:number,k:string)=>n+(k==='cloudCharm'?20:k==='moonRing'?55:0),0):0;return base+(Math.max(1,Number(s?.level||1))-1)*14+Number(s?.armorLevel||0)*16+rare;}
function mutateSave(mutator:(s:any)=>void,message:string,reload=true){
 if(!adminAccess)return;const s=readSave();if(!s)return;mutator(s);writeSave(s);if(reload){alert(message);location.reload();}else renderAdmin();
}
function renderAdmin(){
 const box=document.querySelector<HTMLElement>('#jw25-admin-body');if(!box)return;if(!adminAccess){box.innerHTML='<div class="jw25-note">준자랜드 관리자 계정 연결이 필요합니다.</div>';return;}const s=readSave();if(!s){box.innerHTML='<div class="jw25-note">현재 브라우저에 준자월드 캐릭터가 없습니다.</div>';return;}
 const r=s.resources||{};box.innerHTML=`<div class="jw25-gm-summary"><div><small>캐릭터</small><b>${String(s.name||'준자')}</b></div><div><small>레벨</small><b>Lv.${Number(s.level||1)}</b></div><div><small>엽전</small><b>${fmt(Number(s.gold||0))}</b></div><div><small>장비</small><b>무기 +${Number(s.weaponLevel||0)} / 방어 +${Number(s.armorLevel||0)}</b></div></div><section class="jw25-gm-section"><h3>성장 / 재화</h3><div class="jw25-gm-grid"><button data-gm="lv1">레벨 +1</button><button data-gm="lv5">레벨 +5</button><button data-gm="gold">엽전 +100,000</button><button data-gm="mat">재료 전체 +99</button><button data-gm="pot">회복약 +50</button><button data-gm="heal">HP 완전 회복</button><button data-gm="gear1">장비 각각 +1</button><button data-gm="gearmax">장비 +5 MAX</button><button data-gm="unlock">Lv.15 · 지역 전체 해금</button></div></section><section class="jw25-gm-section"><h3>운영 / 테스트</h3><div class="jw25-gm-grid"><button data-gm="boss">월드보스 즉시 테스트</button><button data-gm="backup">현재 저장 백업 복사</button><button data-gm="refresh">화면 새로고침</button></div></section><div class="jw25-note">보유 재료 · 목재 ${Number(r.wood||0)} / 약초 ${Number(r.herb||0)} / 광석 ${Number(r.ore||0)} / 결정 ${Number(r.crystal||0)}</div><div class="jw25-gm-warning"><b>안전 제한:</b> 관리자 모드에서도 준자랜드 J-Coin을 임의 지급·차감·환전하는 기능은 제공하지 않습니다. J-Coin 변경은 검증된 상점 구매에서만 발생합니다. 현재 GM 조작은 이 브라우저의 준자월드 캐릭터 저장값에만 적용됩니다.</div>`;
 box.querySelectorAll<HTMLButtonElement>('[data-gm]').forEach(b=>b.onclick=()=>gmAction(b.dataset.gm||''));
}
async function gmAction(action:string){
 if(action==='lv1')return mutateSave(s=>{s.level=Math.min(99,Number(s.level||1)+1);s.xp=0;},'GM: 레벨 +1 적용');
 if(action==='lv5')return mutateSave(s=>{s.level=Math.min(99,Number(s.level||1)+5);s.xp=0;},'GM: 레벨 +5 적용');
 if(action==='gold')return mutateSave(s=>{s.gold=Math.max(0,Number(s.gold||0)+100000);},'GM: 엽전 +100,000 적용');
 if(action==='mat')return mutateSave(s=>{s.resources=s.resources||{};for(const k of ['wood','herb','ore','crystal'])s.resources[k]=Number(s.resources[k]||0)+99;},'GM: 모든 재료 +99 적용');
 if(action==='pot')return mutateSave(s=>{s.potions=Number(s.potions||0)+50;},'GM: 회복약 +50 적용');
 if(action==='heal')return mutateSave(s=>{s.hp=maxHp(s);},'GM: HP 완전 회복');
 if(action==='gear1')return mutateSave(s=>{s.weaponLevel=Math.min(5,Number(s.weaponLevel||0)+1);s.armorLevel=Math.min(5,Number(s.armorLevel||0)+1);},'GM: 무기/방어구 +1 적용');
 if(action==='gearmax')return mutateSave(s=>{s.weaponLevel=5;s.armorLevel=5;},'GM: 장비 +5 MAX 적용');
 if(action==='unlock')return mutateSave(s=>{s.level=Math.max(15,Number(s.level||1));s.unlocked=['village','field','mine','forest'];},'GM: Lv.15 및 기본 지역 전체 해금');
 if(action==='boss'){const u=new URL(location.href);u.searchParams.set('bossnow','1');location.href=u.toString();return;}
 if(action==='backup'){const s=readSave();try{await navigator.clipboard.writeText(JSON.stringify(s,null,2));alert('현재 준자월드 저장 데이터를 클립보드에 복사했어.');}catch{alert(JSON.stringify(s));}return;}
 if(action==='refresh'){location.reload();return;}
}
function openAdmin(){if(!adminAccess)return;createLayers();renderAdmin();document.querySelector('#jw25-admin-layer')?.classList.remove('hidden');}

function destroyVisuals(){for(const x of [petVisual,costumeVisual,costumeRing]){try{x?.destroy?.();}catch{}}petVisual=costumeVisual=costumeRing=null;visualScene=null;}
function syncVisuals(force=false){
 const scene=currentScene();const player=scene?.player;if(!scene||!player){if(visualScene)destroyVisuals();return;}const style=readStyle();const key=`${style.costume||''}|${style.pet||''}`;
 if(force||scene!==visualScene||key!==visualKey){destroyVisuals();visualScene=scene;visualKey=key;
  if(style.costume&&ITEM_VISUALS[style.costume]){const v=ITEM_VISUALS[style.costume];costumeRing=scene.add.ellipse(player.x,player.y+15,48,20,v.color,.13).setStrokeStyle(2,v.color,.52).setDepth(18);costumeVisual=scene.add.text(player.x,player.y-48,v.icon,{fontSize:'18px'}).setOrigin(.5).setDepth(40);}
  if(style.pet&&ITEM_VISUALS[style.pet]){const v=ITEM_VISUALS[style.pet];petVisual=scene.add.text(player.x-34,player.y+8,v.icon,{fontSize:'22px'}).setOrigin(.5).setDepth(38).setClassName?.('jw25-world-pet')||petVisual;}
 }
 const t=performance.now()/420;if(costumeRing){costumeRing.x=player.x;costumeRing.y=player.y+15;costumeRing.scaleX=1+Math.sin(t)*.05;costumeRing.scaleY=1+Math.sin(t)*.05;costumeRing.setDepth((player.depth||20)-1);}if(costumeVisual){costumeVisual.x=player.x;costumeVisual.y=player.y-46+Math.sin(t)*2;costumeVisual.setDepth((player.depth||20)+8);}if(petVisual){petVisual.x=player.x-34+Math.cos(t)*4;petVisual.y=player.y+10+Math.sin(t)*3;petVisual.setDepth((player.depth||20)+5);}
 const badge=document.querySelector<HTMLElement>('.jw25-cosmetic-badge');if(badge){const names=[style.costume&&ITEM_VISUALS[style.costume]?.label,style.pet&&ITEM_VISUALS[style.pet]?.label].filter(Boolean);badge.textContent=names.length?`J-Coin Style · ${names.join(' + ')}`:'';badge.classList.toggle('hidden',!gameActive()||!names.length);}
}

function boot(){createLayers();createButtons();refreshWallet();window.setInterval(()=>{createButtons();syncVisuals();},250);window.setInterval(refreshWallet,8000);window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLayer(document.querySelector('#jw25-shop-layer'));closeLayer(document.querySelector('#jw25-admin-layer'));}});window.addEventListener('jw-wallet-update',()=>refreshWallet());}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
