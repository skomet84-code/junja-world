import {installQualityHUD} from './quality-v32.js';
import {restoreProfile,createSaveQueue} from './save-client.js';
import {ESTATE_PRODUCTS,initEstateTrade,estateRank,recordEstateHarvest,manufactureEstateProduct,sellEstateProduct,estateOrderProgress,fulfillEstateOrder} from './estate-trade-v34.js';
import {createWorld} from './world3d.js';
import {FARM_BED_CENTERS,migrateVillageBeds,VILLAGE_WALK_SPEED} from './farm-plots-v52.js';
import {planFarmBatchV55,FARM_BATCH_LIMIT_V55} from './farm-batch-v55.js';
import {arcadeWalletV55,spinVillageArcadeV55,drawArcadeRandomV55,ARCADE_WHEEL_V55,ARCADE_MAX_PLAYS_V55} from './village-arcade-v55.js';
import {mountEstateWorld} from './estate-world-v35.js';
import {openSecureEconomyLab} from './secure-economy-ui-v37.js';
import {openPlayerMarket} from './player-market-ui-v38.js';
import {openProfessionCenter} from './professions-ui-v39.js';
import {openBusinessCenter} from './business-ui-v40.js';
import {mountQuestsV51} from './quests-ui-v51.js';
import {openWorkshopPlaza} from './workshop-ui-v41.js';
import {mountEnergyPanel,mountEnergyHud} from './action-energy-ui-v47.js';
import {createWorldEnergySpend} from './world-energy-v53.js?v=v53-world-energy-release';
import {mountHomeStudioV48} from './home-studio-ui-v48.js';
import {renderVillageMenuV49,activateVillageDockV49} from './village-navigation-v49.js?v=v55-quick-farm-20261020';
import {BUSINESS_PORTAL_V42,portalCollision,canUseBusinessPortal,portalReturnPosition} from './district-portal-v42.js';
import {updateVillageResidents,npcDailyLine,v43Daypart} from './village-life-v43.js';
import {CATALOG,CATALOG_BY_ID,CATEGORIES,GRADES,validFashion,petBonus} from './fashion-catalog.js';
import {RODS,FISH,FISH_BY_NAME,PHRASES,rodById,fishRoll,eligibleFish,reelChallenge,STARTER_FISH_NAMES,rewardForFish,validRodSave,aquariumSlots,fishArt,dailyMissions,HOME_LEVELS} from './life-systems-v20.js?v=v53-fish';
import {makeLivingChapters,MONTHLY_GOALS,monthProgress,initialMonth,realSeason,calendarMonth,villageTitle} from './living-world.js?v=v53-no-attendance';
import {ECONOMY_POLICY,BAITS,economyCeiling,initEconomy,credit,debit,moneyHistory,marketDay,quoteFish,initializeFishStock,addFishStock,sellFish,buyBait,chooseBait,useBait,adjustCatchRoll} from './economy-v28.js?v=v51-starter-5000';
import {BAG_TIERS,initBag,bagUsed,bagCapacity,bagFree,canStore,addBagItems,bagUpgrade,claimEventAutoSellTicket,useAutoSellTicket,AUTO_SELL_PRICE,purchaseAutoSellTicket,toggleFishProtection} from './inventory-v29.js';
import {AUTO_FISH_PASSES,autoFishState,buyAutoFish,autoFishCatch} from './auto-fishing-v31.js';
'use strict';
(()=>{
const cv=document.getElementById('game'),c=null,mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const els=Object.fromEntries(['name','level','xp','coins','questText','questCount','questProgress','toast','hint','modal','panelBody','fishing','fishTitle','fishDesc','fishAction','gauge','needle','welcome'].map(k=>[k,document.getElementById(k)]));
let world3D=null,estateWorld=null,workshopPlaza=null,energyModal=null,homeStudioV48=null;
const W=3600,H=2400; let CW=innerWidth,CH=innerHeight,dpr=1,scale=1,camera={x:1000,y:900},t=0,last=performance.now();
const A={};
const seedData={x:1050,y:955,dir:0,coins:ECONOMY_POLICY.starterG,xp:0,fish:0,hat:'none',coat:'mint',collection:[],harvest:0};
const accountScope=(()=>{try{return sessionStorage.getItem('village-auth-user')||''}catch{return ''}})();
const scopedSaveKey=accountScope?'junja-v50-opening-20261020-user-'+accountScope:'junja-v50-opening-20261020-guest';
let cloudSave=window.__villageCloudSave||null;
// Cloud data is loaded before module import, without top-level await.
const initialCloudVersion=Number.isSafeInteger(Number(cloudSave?.version))?Number(cloudSave.version):0;
let storage;try{storage=localStorage}catch{}
const restored=restoreProfile(cloudSave,storage,scopedSaveKey);
const saved=restored.profile,resumeUnsynced=restored.resume,resumeUnsyncedOwned=restored.owned;
const state={...seedData,...saved};
initEconomy(state);initializeFishStock(state);initBag(state);
state.baitInventory=state.baitInventory&&typeof state.baitInventory==='object'?state.baitInventory:{};
if(!BAITS.some(b=>b.id===state.baitEquipped))state.baitEquipped='none';
const earn=(amount,kind,reason)=>credit(state,Math.max(0,Math.round(Number(amount)||0)),kind,reason,Math.max(1,1+Math.floor((Number(state.xp)||0)/160))).amount;
const spend=(amount,reason,kind='shop')=>debit(state,Math.max(0,Math.round(Number(amount)||0)),kind,reason).ok;
state.x=Math.max(180,Math.min(W-85,state.x||1050));state.y=Math.max(180,Math.min(H-85,state.y||955));if(!Array.isArray(state.collection))state.collection=[];
state.fishRecords=state.fishRecords&&typeof state.fishRecords==='object'&&!Array.isArray(state.fishRecords)?state.fishRecords:{};
state.seasonBadges=Array.isArray(state.seasonBadges)?state.seasonBadges:[];
if(!['spring','summer','autumn','winter'].includes(state.season))state.season='spring';
const seasonLabels={spring:'🌸 봄',summer:'🌿 여름',autumn:'🍂 가을',winter:'❄️ 겨울'};
const nowDay=()=>new Date().toLocaleDateString('en-CA');
const crops={carrot:{name:'당근',icon:'🥕',seconds:65,price:54,cost:12,color:'#df8644'},strawberry:{name:'딸기',icon:'🍓',seconds:120,price:106,cost:25,color:'#d74c61'},pumpkin:{name:'호박',icon:'🎃',seconds:220,price:210,cost:47,color:'#ebba52'},lily:{name:'별꽃',icon:'🌼',seconds:300,price:290,cost:68,color:'#f8de9a'}};
// Keep the previous 14 farm plots, adding a third row without resetting planted crops.
const bedCenters=FARM_BED_CENTERS;
state.beds=migrateVillageBeds(state.beds);
if(!state.seeds||typeof state.seeds!=='object')state.seeds={carrot:6,strawberry:2,pumpkin:1,lily:0};
if(!Array.isArray(state.decorations))state.decorations=[];
if(!state.home)state.home={wall:'cream',floor:'oak',furniture:['sofa']};
state.home.level=Math.max(1,Math.min(4,Math.floor(Number(state.home.level)||1)));
state.fishingGear=validRodSave(state.fishingGear);
state.aquarium={display:Array.isArray(state.aquarium?.display)?state.aquarium.display.filter(n=>FISH_BY_NAME[n]):[],initialized:Boolean(state.aquarium?.initialized)};
state.dailyGather=Number(state.dailyGather)||0;state.dailyCraft=Number(state.dailyCraft)||0;
state.dailyDeliver=Number(state.dailyDeliver)||0;
state.dailyFishNames=Array.isArray(state.dailyFishNames)?state.dailyFishNames.filter(n=>FISH_BY_NAME[n]):[];
state.dailyVisits=Array.isArray(state.dailyVisits)?state.dailyVisits:[];
if(!state.friends||typeof state.friends!=='object')state.friends={};
if(!state.questDay||state.questDay!==nowDay()){state.questDay=nowDay();state.dailyFish=0;state.dailyHarvest=0;state.dailyTalk=0;state.dailyGather=0;state.dailyCraft=0;state.dailyDeliver=0;state.dailyFishNames=[];state.dailyVisits=[];state.dailyReward=false;}
const decorCatalog=[{id:'flower',label:'꽃 화분',emoji:'🌷',cost:75,sz:22},{id:'lantern',label:'로맨틱 가로등',emoji:'🏮',cost:195,sz:30},{id:'bench',label:'정원 벤치',emoji:'🪑',cost:220,sz:43},{id:'birdbath',label:'새들이 오는 분수',emoji:'🕊️',cost:260,sz:34},{id:'picnic',label:'피크닉 매트',emoji:'🧺',cost:160,sz:55},{id:'topiary',label:'하트 토피어리',emoji:'🌳',cost:130,sz:38}];
const achievements=[{id:'fish1',title:'첫 낚시',condition:()=>state.fish>=1,bonus:65},{id:'fish10',title:'바다의 친구',condition:()=>state.fish>=10,bonus:250},{id:'harvest5',title:'농장의 새싹',condition:()=>state.harvest>=5,bonus:180},{id:'decorate3',title:'마을 디자이너',condition:()=>state.decorations.length>=3,bonus:260},{id:'fashion3',title:'패션 리더',condition:()=>owned.length>=5,bonus:240}];
if(!Array.isArray(state.achieved))state.achieved=[];
let selectedSeed='carrot',placeDecor=null,chatSeen=0,lastClock=-1,wetFx=0;
const decorationCancelButton=document.createElement('button');
decorationCancelButton.type='button';
decorationCancelButton.id='decorationCancelButtonV51';
decorationCancelButton.textContent='✕ 배치 취소';
decorationCancelButton.setAttribute('aria-label','제작물 배치 또는 회수 취소');
decorationCancelButton.style.cssText='position:fixed;bottom:calc(98px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:95;display:none;min-height:48px;padding:11px 22px;border:2px solid #fff;border-radius:28px;background:#315c46;color:#fff;font-size:15px;font-weight:800;box-shadow:0 5px 22px #183e3266;touch-action:manipulation;white-space:nowrap';
document.body.append(decorationCancelButton);
function cancelDecorationPlacement(){
 placeDecor=null;
 decorationCancelButton.style.display='none';
 els.hint.classList.add('hidden');
 toast('🌷 제작물 배치 취소');
}
function showDecorationPlacement(){
 decorationCancelButton.style.display='block';
 els.hint.classList.remove('hidden');
}
decorationCancelButton.onclick=cancelDecorationPlacement;
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&placeDecor)cancelDecorationPlacement()});
function checkAchievements(){let won=[];for(const a of achievements){if(!state.achieved.includes(a.id)&&a.condition()){state.achieved.push(a.id);earn(a.bonus,'achievement','업적 달성');won.push(a.title+' +'+a.bonus+'G')}}if(won.length){toast('🏅 '+won.join(' / '));save()}hud()}
function cropStage(b){if(!b?.crop)return -1;return Math.min(3,Math.floor((Date.now()-b.at)/1000/crops[b.crop].seconds*3))}
function dailyTask(){return dailyMissions(nowDay(),{
  fish:state.dailyFish,harvest:state.dailyHarvest,talk:state.dailyTalk,
  gather:state.dailyGather,craft:state.dailyCraft,deliver:state.dailyDeliver,
  fishVariety:new Set(state.dailyFishNames).size,visit:new Set(state.dailyVisits).size
 })}
// Weekly festival: rolling quests, attendance, and a one-time aquarium collection milestone.
const festivalWeek=()=>{
 const d=new Date(),utc=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()),th=new Date(utc);
 th.setUTCDate(th.getUTCDate()+4-(th.getUTCDay()||7));
 const first=Date.UTC(th.getUTCFullYear(),0,1);
 return th.getUTCFullYear()+'-W'+String(Math.ceil((((th-first)/86400000)+1)/7)).padStart(2,'0');
};
const FESTIVAL_TASKS=[
 {id:'fish',name:'바다 탐험가',icon:'🎣',goal:9,prize:3200,description:'물고기 9마리 낚기',count:()=>state.fish||0},
 {id:'harvest',name:'풍요로운 농장',icon:'🌱',goal:12,prize:2600,description:'작물 12회 수확하기',count:()=>state.harvest||0},
 {id:'gather',name:'숲속 탐험가',icon:'🌲',goal:18,prize:3000,description:'광석·나무·꽃 18회 채집하기',count:()=>state.gathered||0},
 {id:'craft',name:'작은 공방 장인',icon:'🪵',goal:5,prize:4200,description:'물품 5번 제작하기',count:()=>state.craftCount||0},
 {id:'deliver',name:'마을 상인',icon:'📦',goal:3,prize:3900,description:'교역소에 상자 3번 납품하기',count:()=>state.deliveries||0}
];
function ensureFestival(){
 const week=festivalWeek();
 if(state.festival?.week!==week)state.festival={week,baseline:Object.fromEntries(FESTIVAL_TASKS.map(q=>[q.id,q.count()])),claimed:[]};
 if(!Array.isArray(state.festival.claimed))state.festival.claimed=[];
}
function festivalProgress(q){ensureFestival();return Math.min(q.goal,Math.max(0,q.count()-(state.festival.baseline[q.id]||0)))}
function claimAttendance(){
 if(state.attendance?.last===nowDay())return 0;
 const yesterday=new Date(Date.now()-86400000).toLocaleDateString('en-CA');
 const streak=state.attendance?.last===yesterday?Math.min(30,(state.attendance?.streak||0)+1):1;
 const coins=400+Math.min(streak,10)*100;
 state.attendance={last:nowDay(),streak,total:(state.attendance?.total||0)+1};
 const earned=earn(coins,'social','출석 도장');save();hud();toast('🎟 출석 '+streak+'일차 · +'+earned.toLocaleString('ko-KR')+'G');
 return earned;
}
// Explore the physical map to collect three daily location stamps.
function dailyRallyStops(){
 const choices=['pier','forest','workshop','quarry','boutique','home'];
 const day=Math.floor(Date.UTC(...nowDay().split('-').map((v,i)=>i===1?Number(v)-1:Number(v)))/86400000);
 return [0,1,2].map(i=>choices[(day+i*2)%choices.length]);
}
function openLivingCalendar(){
 initialMonth(state,new Date(),FISH_BY_NAME);
 const festival=realSeason(),board=state.livingMonth;
 const count=MONTHLY_GOALS.filter(g=>board.claimed.includes(g.id)).length;
 openModal('<span class="titlebadge">JUNJA LIVING WORLD · '+board.id+'</span><h2>'+festival.icon+' '+festival.name+'</h2>'+
 '<p>현실 달력과 함께 열리는 월간 목표예요. 계절마다 풍경과 추천 활동이 달라지고, 매달 첫 방문 때 이번 달 기록을 새로 시작해요.</p>'+
 '<div class="mini-card"><strong>🌿 이번 계절 추천</strong><p>'+festival.focus+' · 추천 어종: '+festival.fish.join(' · ')+'</p></div>'+
 '<h3>📅 월간 도전 · '+count+'/'+MONTHLY_GOALS.length+'</h3>'+
 '<div class="card-grid">'+MONTHLY_GOALS.map(q=>{
 const progress=monthProgress(state,q,FISH_BY_NAME),done=board.claimed.includes(q.id);
 return '<div class="mini-card"><strong>'+q.label+'</strong><p>'+progress+' / '+q.goal+'</p><div class="mini-progress"><i style="width:'+(progress/q.goal*100)+'%"></i></div><p>🎁 '+q.reward.toLocaleString('ko-KR')+'G · 100XP</p><button data-month="'+q.id+'" '+(done||progress<q.goal?'disabled':'')+'>'+(done?'✅ 이번 달 수령 완료':progress>=q.goal?'보상 받기':'도전 중')+'</button></div>'
 }).join('')+'</div>'+
 '<div class="mini-card"><strong>🏅 월간 기념 배지</strong><p>월간 목표 5개를 모두 완료하면 이번 달 기념 배지와 🎟️ 물고기 자동 판매권 1장을 받아요.</p><p>누적 획득: '+(state.seasonBadges||[]).length+'개월</p><button id="monthlyBadge" '+(count<MONTHLY_GOALS.length||(state.seasonBadges||[]).includes(board.id)?'disabled':'')+'>이번 달 배지 받기</button></div>'+
 '<div class="pill-row"><button id="calendarFestival" class="pill-btn">🎪 주간 축제로 돌아가기</button><button id="calendarAlbum" class="pill-btn ghost">🐠 어항 도감</button></div>');
 els.panelBody.querySelectorAll('[data-month]').forEach(btn=>btn.onclick=()=>{
  const q=MONTHLY_GOALS.find(g=>g.id===btn.dataset.month);
  if(!q||board.claimed.includes(q.id)||monthProgress(state,q,FISH_BY_NAME)<q.goal)return;
  board.claimed.push(q.id);const earned=earn(q.reward,'festival','월간 의뢰');state.xp+=100;save();hud();
  toast('📅 월간 의뢰 완료! +'+earned.toLocaleString('ko-KR')+'G');openLivingCalendar();
 });
 document.getElementById('monthlyBadge').onclick=()=>{
  state.seasonBadges=Array.isArray(state.seasonBadges)?state.seasonBadges:[];
  if(board.claimed.length<MONTHLY_GOALS.length||state.seasonBadges.includes(board.id))return;
  state.seasonBadges.push(board.id);
  const ticket=claimEventAutoSellTicket(state,board.id);
  save();toast('🏅 '+board.id+' 월간 배지'+(ticket?' · 🎟️ 자동 판매권 1장 지급!':''));openLivingCalendar();
 };
 document.getElementById('calendarFestival').onclick=openFestival;
 document.getElementById('calendarAlbum').onclick=openAquarium;
}
function openFestival(){
 ensureFestival();const a=state.attendance||{};
 openModal(`<span class="titlebadge">JUNJA VILLAGE FESTIVAL · ${state.festival.week}</span>
  <h2>🎪 마을 축제 & 도전</h2>
  <p>이번 주의 생활 목표를 달성하고 특별 보상을 모아보세요. 매주 월요일 새 도전이 열려요.</p>
  <div class="mini-card"><strong>🎟 출석 도장</strong>
   <p>${a.last===nowDay()?'✅ 오늘 출석 완료 · '+(a.streak||1)+'일 연속':'오늘 출석 보상 수령 가능'} · 누적 ${a.total||0}일</p>
   <button id="festivalAttendance" ${a.last===nowDay()?'disabled':''}>출석 보상 받기</button>
  </div>
  <h3>🗺️ 오늘의 탐험 스탬프</h3>
  <p>마을 속 세 곳을 직접 방문해 도장을 모아보세요. 세 곳 완료 시 1,200G + 90XP</p>
  <div class="pill-row">${dailyRallyStops().map(id=>{
   const st=stations.find(x=>x.id===id),done=state.dailyVisits.includes(id);
   return `<button class="pill-btn ${done?'':'ghost'}" data-rally="${id}">${done?'✅':'📍'} ${st?.name||id}</button>`;
  }).join('')}</div>
  <div class="mini-card"><strong>${dailyRallyStops().filter(id=>state.dailyVisits.includes(id)).length}/3곳 방문</strong>
  <button id="festivalRallyClaim" ${state.festivalRallyDay===nowDay()||!dailyRallyStops().every(id=>state.dailyVisits.includes(id))?'disabled':''}>${state.festivalRallyDay===nowDay()?'✅ 오늘 탐험 완료':'스탬프 보상 수령'}</button></div>
  <div class="mini-card"><strong>📅 ${realSeason().icon} 월간 · ${realSeason().name}</strong><p>30일 단위로 이어지는 장기 도전과 계절 기념 배지</p><button id="openMonthlyLife">월간 도전 살펴보기</button></div><h3>⭐ 주간 의뢰</h3>
  <div class="card-grid">${FESTIVAL_TASKS.map(q=>{
   const done=festivalProgress(q),claimed=state.festival.claimed.includes(q.id);
   return `<div class="mini-card"><span class="emoji">${q.icon}</span><strong>${q.name}</strong>
    <p>${q.description} · ${done}/${q.goal}</p><div class="mini-progress"><i style="width:${done/q.goal*100}%"></i></div>
    <p>🎁 ${q.prize.toLocaleString('ko-KR')}G + 50XP</p>
    <button data-festival="${q.id}" ${claimed||done<q.goal?'disabled':''}>${claimed?'✅ 수령 완료':done>=q.goal?'완료 보상 받기':'도전 중'}</button></div>`;
  }).join('')}</div>
  <div class="mini-card"><strong>🏆 수족관 컬렉터</strong><p>초급 어종 6종 발견 시 8,000G · 이 브라우저에서 최초 1회</p>
   <button id="festivalMuseum" ${state.festivalMuseumClaimed||!STARTER_FISH_NAMES.every(name=>state.collection.includes(name))?'disabled':''}>${state.festivalMuseumClaimed?'✅ 보상 받음':'컬렉션 보상 수령'}</button></div>
  <p style="font-size:12px;color:#627b68">돈을 모으면 프리미엄 아틀리에의 로열 코디 세트를 완성할 수 있어요.</p>`);
 document.getElementById('festivalAttendance').onclick=()=>{claimAttendance();openFestival()};
 document.getElementById('openMonthlyLife').onclick=openLivingCalendar;
 els.panelBody.querySelectorAll('[data-rally]').forEach(btn=>btn.onclick=()=>goStation(btn.dataset.rally));
 document.getElementById('festivalRallyClaim').onclick=()=>{
  if(state.festivalRallyDay===nowDay()||!dailyRallyStops().every(id=>state.dailyVisits.includes(id)))return;
  state.festivalRallyDay=nowDay();const earned=earn(1200,'social','일일 탐험 스탬프');state.xp+=90;
  save();hud();toast('🎉 오늘의 탐험 스탬프! +'+earned.toLocaleString('ko-KR')+'G');openFestival();
 };
 els.panelBody.querySelectorAll('[data-festival]').forEach(b=>b.onclick=()=>{
  const q=FESTIVAL_TASKS.find(x=>x.id===b.dataset.festival);
  if(!q||festivalProgress(q)<q.goal||state.festival.claimed.includes(q.id))return;
  state.festival.claimed.push(q.id);const earned=earn(q.prize,'festival','주간 축제');state.xp+=50;
  save();hud();toast('🏆 '+q.name+' 완료! +'+earned.toLocaleString('ko-KR')+'G');openFestival();
 });
 document.getElementById('festivalMuseum').onclick=()=>{
  if(state.festivalMuseumClaimed||!STARTER_FISH_NAMES.every(name=>state.collection.includes(name)))return;
  state.festivalMuseumClaimed=true;earn(8000,'collection','어종 컬렉션 완성');state.xp+=150;save();hud();
  toast('🐠 물고기 도감 완성! +8,000G');openFestival();
 };
}
function completeDaily(){if(state.dailyReward)return;const ok=dailyTask().every(q=>q.done>=q.target);if(ok){state.dailyReward=true;const earned=earn(550,'quest','일일 의뢰 완성');state.xp+=150;toast('🎉 오늘의 의뢰 완료! +'+earned.toLocaleString('ko-KR')+'G');party(player.x,player.y-55,32);save()}hud()}
function addXp(n){state.xp+=n;hud()}

let player={x:state.x,y:state.y,vx:0,vy:0,dir:state.dir||0},path=[],goal=null,fx=[],popup=null,bite=0,fishPhase='idle',fishAttempts=0,gaugePos=0,gaugeDir=1,castUntil=0,castX=1470,castY=1290,castMode=false;
let hookedFish=null,reelProfile=null,reelMisses=0,reelDeadline=0,reelZone=.5;
const fishTierText={common:'일반',fine:'고급',rare:'희귀',hero:'영웅',legend:'전설',mythic:'신화'};
function setFishingZone(){
 const width=Math.max(.075,reelProfile?.width||.36);
 const lower=Math.max(0,reelZone-width/2),upper=Math.min(1,reelZone+width/2);
 els.gauge.style.setProperty('--catch-low',(lower*100).toFixed(2)+'%');
 els.gauge.style.setProperty('--catch-high',(upper*100).toFixed(2)+'%');
 return {lower,upper};
}
function shiftFishingZone(){
 const step=fishAttempts,base=[.50,.29,.71,.44,.63,.36,.55][step%7];
 reelZone=base;setFishingZone();
}
function fishingProgress(){
 const remaining=Math.max(0,Math.ceil((reelDeadline-performance.now())/1000));
 const tier=fishTierText[hookedFish?.tier]||'일반';
 els.fishDesc.textContent=`${tier} ${hookedFish?.size>=1.7?'대형 물고기':'물고기'} · ${fishAttempts}/${reelProfile.hits} 성공 · 실수 ${reelMisses}/${reelProfile.maxMisses} · 남은 시간 ${remaining}초`;
}
const trees=[];let rngSeed=20261;function rnd(){rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296}const rand=(a,b)=>a+rnd()*(b-a);
for(let i=0;i<115;i++){let x=rand(70,1930),y=rand(120,1580);let near=(x>420&&x<1620&&y>260&&y<1100)||(!walkable(x,y));if(near)continue;trees.push({x,y,s:rand(.72,1.26),pink:rnd()<.31,kind:rnd()<.2?'pine':'tree',phase:rnd()*6.28})}
const props=[{type:'shop',x:515,y:470,w:365,h:366,label:'🐟 바다상점'},{type:'home',x:1430,y:465,w:340,h:347,label:'🏡 우리집'},{type:'fountain',x:1010,y:695,w:276,h:270,label:'⛲ 중앙광장'},{type:'market',x:1585,y:837,w:315,h:329,label:'🎪 교역소'}];

// Animals belong to world coordinates and are independently animated and depth-sorted.
const animalFriends=[
 {id:'sora',name:'소라',species:'rabbit',x:1210,y:880,homeX:1210,homeY:880,dx:1210,dy:880,coat:'#f7f0df',shirt:'#b7a4da',mood:'오늘은 꽃향기가 정말 좋네요!',offset:0},
 {id:'choco',name:'초코',species:'bear',x:870,y:1035,homeX:870,homeY:1035,dx:870,dy:1035,coat:'#bb895f',shirt:'#79af9d',mood:'같이 딸기를 키워볼까요?',offset:1.8},
 {id:'dodo',name:'도도',species:'fox',x:1260,y:1010,homeX:1260,homeY:1010,dx:1260,dy:1010,coat:'#e7a768',shirt:'#e9c28c',mood:'바닷가에서 반짝이는 조개를 찾았어요.',offset:3.2},
 {id:'wani',name:'와니',species:'cat',x:860,y:840,homeX:860,homeY:840,dx:860,dy:840,coat:'#c8cfda',shirt:'#e6a9b7',mood:'같이 산책하자! 좋은 풍경을 알아요.',offset:4.7}
];
if(!state.animalBonds || typeof state.animalBonds!=='object')state.animalBonds={};
const companion={x:player.x-35,y:player.y+35,dir:1};
const petals=Array.from({length:46},(_,i)=>({x:(i*307+91)%W,y:(i*149+97)%H,phase:i*2.399,speed:13+(i%7)*3,sz:1.5+(i%4)*.5}));
const butterflies=Array.from({length:12},(_,i)=>({x:560+(i*137)%930,y:670+(i*113)%480,phase:i*1.9,sz:2+i%3}));
function updateAmbient(dt){
 const follow={x:player.x-48*(player.dir===1?1:player.dir===3?-1:0),y:player.y+45};
 const dist=Math.hypot(follow.x-companion.x,follow.y-companion.y);
 if(dist>500){companion.x=follow.x;companion.y=follow.y}
 else if(dist>15){const a=Math.min(dist,Math.max(0,dt*178));companion.x+=(follow.x-companion.x)/dist*a;companion.y+=(follow.y-companion.y)/dist*a;companion.dir=(follow.x>companion.x)?1:3;}
 for(const a of animalFriends){a.offset+=dt; const d=Math.hypot(a.dx-a.x,a.dy-a.y);
  if(d>3){const v=Math.min(d,dt*(22+(a.id==='dodo'?11:0)));a.x+=(a.dx-a.x)/d*v;a.y+=(a.dy-a.y)/d*v;a.travel=(a.travel||0)+v;a.moving=true}
  else {a.moving=false;if(Math.sin(a.offset*.57+a.homeX)<-.992){const nx=a.homeX+Math.cos(a.offset*4.1)*80,ny=a.homeY+Math.sin(a.offset*2.8)*65;if(walkable(nx,ny)){a.dx=nx;a.dy=ny}}}
 }
}

// v1.3: original illustrated residents are individual transparent sprites, not placeholder circles.
const VILLAGER_SPRITES={};
const VILLAGER_IMAGES={};for(const [kind,url] of Object.entries(VILLAGER_SPRITES)){const img=new Image();img.src=url;VILLAGER_IMAGES[kind]=img;}

function openSeasons(){
 const buttons=Object.entries(seasonLabels).map(([key,label])=>`<button class="pill-btn ${state.season===key?'':'ghost'}" data-season="${key}">${label}${state.season===key?' ✓':''}</button>`).join('');
 openModal(`<span class="titlebadge">LIVING SEASONS</span><h2>🌿 마을의 네 계절</h2><p>계절마다 꽃잎과 낙엽, 눈의 움직임과 햇빛이 달라져요.</p><div class="pill-row">${buttons}</div><p>마을은 그대로 유지되고 꾸미기와 농사 진행 상황도 사라지지 않아요.</p>`);
 els.panelBody.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>{state.season=b.dataset.season;save();toast(seasonLabels[state.season]+' 풍경으로 바뀌었어요');openSeasons()});
}
// v32: finite daily villager requests, randomized across animal residents.
const QUEST_TEMPLATES=[
 {kind:'fish',need:3,label:'물고기 3마리 낚기',reward:1400,xp:65},
 {kind:'fish',need:6,label:'물고기 6마리 낚기',reward:2400,xp:100},
 {kind:'gather',need:6,label:'나무·돌·꽃 6개 채집하기',reward:1250,xp:55},
 {kind:'gather',need:12,label:'나무·돌·꽃 12개 채집하기',reward:2200,xp:85}
];
const QUEST_MULTIPLIER={common:1.2,fine:1.3,rare:1.5,hero:1.8,legend:2.5,mythic:3};
function makeFishDeliveryQuest(seed){
 const pool=FISH.filter(f=>['common','fine','rare','hero','legend','mythic'].includes(f.tier)&&(!f.level||f.level<=lifeLevel()+3));
 if(!pool.length)return null;
 // Rare high-tier orders appear occasionally, not as a daily guaranteed reward.
 const roll=(seed%100),tier=roll<2?'mythic':roll<9?'legend':roll<25?'hero':roll<50?'rare':roll<70?'fine':'common';
 const candidates=pool.filter(f=>f.tier===tier),fish=(candidates.length?candidates:pool)[seed%((candidates.length?candidates:pool).length)];
 const price=quoteFish(fish,new Date(),state.fishRecords?.[fish.name]);
 const reward=Math.max(price+1,Math.ceil(price*(QUEST_MULTIPLIER[fish.tier]||1.2)));
 return {kind:'delivery',fishName:fish.name,fishTier:fish.tier,need:1,label:fish.name+' 1마리 납품',reward,xp:fish.tier==='mythic'?450:fish.tier==='legend'?280:110,quoted:price};
}
function villagerQuestState(){
 const day=nowDay(),existing=state.villagerRequests;
 if(existing&&existing.day===day)return existing;
 const ids=animalFriends.map(a=>a.id),seed=Number(day.replace(/\D/g,''))+(Math.floor(Math.random()*9999));
 const shuffled=[...ids].sort((a,b)=>((seed+a.charCodeAt(0)*37)%101)-((seed+b.charCodeAt(0)*37)%101));
 const count=2+seed%3;
 const requests=shuffled.slice(0,count).map((id,i)=>{
  const base=QUEST_TEMPLATES[(seed+i*3)%QUEST_TEMPLATES.length];
  const special=(seed+i*19)%100<65?makeFishDeliveryQuest(seed+i*137):null;
  return {...(special||base),id,status:'available',start:0};
 });
 state.villagerRequests={day,requests};save();return state.villagerRequests;
}
function questCounter(kind){return kind==='fish'?Number(state.fish)||0:Number(state.gathered)||0}
function villagerQuestFor(id){return villagerQuestState().requests.find(q=>q.id===id)}
function villagerQuestHtml(a){
 const q=villagerQuestFor(a.id);if(!q)return '';
 const done=q.status==='done',active=q.status==='active',isDelivery=q.kind==='delivery';
 const progress=isDelivery?Math.max(0,Number(state.fishStock?.[q.fishName])||0):(active?Math.max(0,questCounter(q.kind)-q.start):0);
 const ready=active&&progress>=q.need;
 const detail=isDelivery?'<p>오늘 시장가 '+Number(q.quoted||0).toLocaleString()+'G · 납품 시 물고기 1마리 소모 · 전설/신화도 직접 승인 후 납품</p>':'';
 return '<div class="mini-card"><h3>❗ 오늘의 주민 의뢰</h3><p>'+q.label+'</p>'+detail+'<p>보상 '+q.reward.toLocaleString()+'G · 경험치 '+q.xp+' · '+(done?'완료':active?Math.min(progress,q.need)+'/'+q.need:'수락 전')+'</p><button id="villagerQuestAction" '+(done?'disabled':'')+'>'+(done?'오늘 의뢰 완료':ready?'🎁 물고기 납품하고 보상 받기':active?'진행 중':'의뢰 수락')+'</button></div>';
}
function villagerQuestAction(a){
 const q=villagerQuestFor(a.id);if(!q||q.status==='done')return;
 if(q.status==='available'){q.status='active';q.start=questCounter(q.kind);toast('❗ '+a.name+'의 의뢰를 받았어요');}
 else if(q.kind==='delivery'){
  if((Number(state.fishStock?.[q.fishName])||0)<1){toast('🎣 '+q.fishName+'를 잡거나 가방에서 찾아보세요');return}
  // Explicit delivery consumes the fish, even when protected from automatic selling.
  const payment=credit(state,q.reward,'quest','주민 물고기 납품 · '+a.name,Math.max(1,lifeLevel()));
  if(!payment.ok||payment.amount<q.reward){toast('오늘의 수입 한도 때문에 납품할 수 없어요');return}
  state.fishStock[q.fishName]--;state.xp+=q.xp;q.status='done';
  toast('🎉 '+q.fishName+' 납품 완료! +'+payment.amount.toLocaleString()+'G');
 }else if(questCounter(q.kind)-q.start>=q.need){
  const credited=earn(q.reward,'quest','주민 의뢰 · '+a.name);
  state.xp+=q.xp;q.status='done';toast('🎉 주민 의뢰 완료! +'+credited.toLocaleString()+'G');
 }else{toast('아직 의뢰 목표를 달성하지 못했어요');}
 save();hud();openAnimal(a);
}
function openAnimal(a){const v=state.animalBonds[a.id]||{love:0,day:''};const repeat=v.day===nowDay();const heart='💗'.repeat(Math.min(5,Math.floor(v.love/2)+1));
 openModal(`<span class="titlebadge">VILLAGE NEIGHBORS</span><h2>🐾 ${a.name}와 이야기</h2><p style="font-size:14px;line-height:1.8">${a.mood}</p>${villagerQuestHtml(a)}<h3>친밀도 ${heart}</h3><p>${repeat?'오늘 이미 인사했어요. 내일 또 만나요!':'처음 인사하면 친밀도가 오르고 작은 선물도 받아요.'}</p><button class="pill-btn" id="greetAnimal" ${repeat?'disabled':''}>🌷 ${repeat?'오늘 인사 완료':'인사하고 선물 받기'}</button>`);
 const questBtn=document.getElementById('villagerQuestAction');if(questBtn)questBtn.onclick=()=>villagerQuestAction(a);
 const btn=document.getElementById('greetAnimal');if(btn)btn.onclick=()=>{if(repeat)return;state.dailyTalk++;completeDaily();v.love++;v.day=nowDay();state.animalBonds[a.id]=v;earn(25,'social','동물 주민 인사');addXp(8);party(a.x,a.y-60,13);toast('💗 '+a.name+'와 친해졌어요! +25G');save();hud();openAnimal(a)};
}

const npcs=[{x:1370,y:945,color:'#ffd9ba',hat:'none',coat:'rose',name:'리나',text:'어서 와요! 옷가게에서 예쁜 모자를 골라봐요.'},{x:730,y:1000,color:'#deb5a6',hat:'straw',coat:'amber',name:'토비',text:'해변으로 가면 물고기가 많이 잡혀요!'},{x:1130,y:1030,color:'#ead0af',hat:'none',coat:'blue',name:'유니',text:'준자하버의 봄날은 언제나 따뜻해요.'}];
const clickable=[{x:530,y:600,r:115,kind:'shop'},{x:1400,y:650,r:120,kind:'home'},{x:1580,y:990,r:120,kind:'market'},{x:1458,y:1165,r:150,kind:'fish'},{x:1005,y:775,r:95,kind:'fountain'}];
const outfits=[{id:'mint',name:'민트 피크닉룩',cost:0,emoji:'🌿',col:'#55b9a4',type:'coat'},{id:'blue',name:'바다 마린룩',cost:180,emoji:'🌊',col:'#54a0db',type:'coat'},{id:'rose',name:'벚꽃 산책룩',cost:260,emoji:'🌸',col:'#ed95a6',type:'coat'},{id:'amber',name:'따뜻한 가을룩',cost:320,emoji:'🍯',col:'#e3ad5f',type:'coat'},{id:'none',name:'모자 벗기',cost:0,emoji:'🧑🏻',type:'hat'},{id:'straw',name:'낚시꾼 밀짚모자',cost:150,emoji:'👒',type:'hat'},{id:'beret',name:'봄날 베레모',cost:210,emoji:'🧢',type:'hat'},{id:'crown',name:'작은 금빛 왕관',cost:450,emoji:'👑',type:'hat'}];
outfits.push(...[{id:'lavender',name:'라벤더 원피스',cost:380,emoji:'💜',col:'#a897dc',type:'coat'},{id:'coral',name:'산호빛 데이트룩',cost:450,emoji:'🧡',col:'#f0a07a',type:'coat'},{id:'navy',name:'밤바다 정장',cost:540,emoji:'🌙',col:'#375d83',type:'coat'},{id:'cream',name:'크림 니트',cost:240,emoji:'🤍',col:'#e6d5b5',type:'coat'},{id:'forest',name:'숲속 탐험룩',cost:410,emoji:'🍃',col:'#568a60',type:'coat'},{id:'pink',name:'벚꽃 드레스',cost:610,emoji:'🎀',col:'#ee9ac7',type:'coat'},{id:'flower',name:'봄꽃 밀짚모자',cost:340,emoji:'🌸',type:'hat'},{id:'navycap',name:'청량 선장 모자',cost:480,emoji:'⚓',type:'hat'},{id:'beanie',name:'카페 비니',cost:190,emoji:'🧶',type:'hat'},{id:'cat',name:'고양이 귀',cost:600,emoji:'🐈',type:'hat'},{id:'ribbon',name:'왕리본 머리띠',cost:280,emoji:'🎀',type:'hat'},{id:'captain',name:'바다의 선장 모자',cost:420,emoji:'🧢',type:'hat'}]);

outfits.push({id:'linen',name:'공방 린넨 셔츠',cost:0,emoji:'🧵',col:'#d8c7a6',type:'coat',craftOnly:true});
let owned=['mint','none'];try{const o=resumeUnsyncedOwned||cloudSave?.owned||(accountScope?JSON.parse(localStorage.getItem('junja-v50-opening-20261020-owned-'+accountScope)||'[]'):[]);if(Array.isArray(o))owned=[...new Set([...owned,...o])]}catch{}
// Migrate in place; never discard existing coins, fish, legacy costumes or quests.
const originalFashion=state.fashion&&typeof state.fashion==='object'?state.fashion:{};
const fashionOwned=new Set(Array.isArray(originalFashion.owned)?originalFashion.owned.filter(id=>!!CATALOG_BY_ID[id]):[]);
state.fashion={owned:[...fashionOwned],equipped:validFashion(originalFashion.equipped)};
for(const type of ['hair','outfit','accessory','pet'])if(state.fashion.equipped[type]&&!fashionOwned.has(state.fashion.equipped[type]))state.fashion.equipped[type]=null;
let saveBlocked=false;
let cloudVersion=initialCloudVersion,lastLocalFingerprint='';
const unsyncedKey=scopedSaveKey+'-unsynced';
const villageSaveStatus=document.createElement('div');
villageSaveStatus.id='villageSaveStatus';
villageSaveStatus.setAttribute('role','status');
villageSaveStatus.setAttribute('aria-live','polite');
villageSaveStatus.style.cssText='position:fixed;z-index:38;left:50%;bottom:calc(91px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#fff9e8ef;border:1px solid #b8ccac;border-radius:22px;box-shadow:0 2px 12px #253c2922;color:#3f7053;font-weight:800;font-size:11px;padding:6px 12px;max-width:92vw;white-space:nowrap;pointer-events:none';
villageSaveStatus.textContent=cloudSave?.profile?'● 서버 기록 불러옴':(restored.recovered?'● 이 기기의 마지막 기록 복구 · 서버 저장 대기':'● 첫 저장 준비 중');
document.body.append(villageSaveStatus);
function setSaveStatus(message,isError=false){
 villageSaveStatus.textContent=message;
 villageSaveStatus.style.color=isError?'#a34f39':'#3f7053';
 villageSaveStatus.style.borderColor=isError?'#dbad99':'#b8ccac';
}
function showSaveConflict(message){
 saveBlocked=true;
 setSaveStatus('⚠ 서버 저장 충돌 · 재접속 필요',true);
 let notice=document.getElementById('villageSaveConflict');
 if(!notice){
  notice=document.createElement('div');notice.id='villageSaveConflict';
  notice.style.cssText='position:fixed;z-index:260;bottom:calc(95px + env(safe-area-inset-bottom));left:12px;right:12px;max-width:520px;margin:auto;background:#fff4d6;color:#66471f;border:2px solid #c89949;border-radius:15px;box-shadow:0 6px 24px #0005;padding:12px;font-size:13px;font-weight:750;text-align:center;pointer-events:auto';
  const text=document.createElement('div');text.id='villageSaveConflictMessage';notice.append(text);
  const button=document.createElement('button');button.type='button';button.textContent='↻ 최신 서버 기록으로 다시 접속';button.style.cssText='margin-top:8px;padding:9px 13px;background:#7ca78a;border-radius:11px;color:white;font-weight:800';
  button.onclick=()=>location.reload();notice.append(button);document.body.append(notice);
 }
 document.getElementById('villageSaveConflictMessage').textContent=message;
}
const saveQueue=createSaveQueue({version:initialCloudVersion,
 send:payload=>fetch('/api/account?action=save',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(12000)}),
 onCommit:(version,latest)=>{cloudVersion=version;try{if(latest)localStorage.setItem(unsyncedKey,JSON.stringify({baseVersion:version,...latest}));else localStorage.removeItem(unsyncedKey)}catch{}},
 onStatus:(status,data)=>{
  if(status==='blocked')showSaveConflict((data?.status?'HTTP '+data.status+' · ':'')+(data?.error||'저장 요청이 거부됐어요. 새로고침 전 기기의 기록을 보존해주세요.'));
  else if(status==='retry')setSaveStatus('⚠ 서버 저장 실패 · 자동 재시도 · '+String(data?.message||'연결 오류').slice(0,75),true);
  else setSaveStatus((status==='saved'?'✔ 서버 저장 완료':'⏳ 서버 저장 중')+' · Lv.'+(1+Math.floor((Number(data.profile.xp)||0)/160)));
 }
});
function queueCloudSave(){if(accountScope&&!saveBlocked)return saveQueue.enqueue(state,owned)}
function save(){
 state.x=player.x;state.y=player.y;state.dir=player.dir;
 const fingerprint=JSON.stringify({profile:{...state,savedAt:0},owned});
 if(fingerprint===lastLocalFingerprint)return;
 lastLocalFingerprint=fingerprint;
 state.savedAt=Date.now();
 try{
  if(accountScope){
   localStorage.setItem(scopedSaveKey,JSON.stringify(state));
   if(!saveBlocked)localStorage.setItem(unsyncedKey,JSON.stringify({baseVersion:cloudVersion,profile:state,owned:[...owned],savedAt:state.savedAt}));
  }
  if(accountScope)localStorage.setItem('junja-v50-opening-20261020-owned-'+accountScope,JSON.stringify(owned));
  // Retain up to seven daily restore points, not every five-second save.
  const day=nowDay(),key='junja-village-snapshots-v27-'+accountScope;
  const shots=JSON.parse(localStorage.getItem(key)||'[]');
  if(Array.isArray(shots)&&shots.at(-1)?.day!==day){
   shots.push({day,save:JSON.stringify(state),owned:[...owned]});
   localStorage.setItem(key,JSON.stringify(shots.slice(-7)));
  }
  // Extra per-account restore checkpoints, kept locally even if an API
  // outage or an accidental future deployment disrupts normal server saves.
  // The cloud record stays authoritative when it exists.
  if(accountScope){
   const backupKey=scopedSaveKey+'-checkpoints-v33';
   const raw=JSON.parse(localStorage.getItem(backupKey)||'[]');
   const checkpoints=Array.isArray(raw)?raw:[];
   const previous=checkpoints.at(-1),now=Date.now();
   const level=Math.max(1,1+Math.floor((Number(state.xp)||0)/160));
   if(!previous || now-Number(previous.at||0)>300000 || level>Number(previous.level||0)){
    checkpoints.push({at:now,level,profile:state,owned:[...owned]});
    localStorage.setItem(backupKey,JSON.stringify(checkpoints.slice(-12)));
   }
  }
 }catch(e){/* Storage can be disabled in private preview browsers. */}
 // A blocked/quota-limited localStorage must never stop durable server writes.
 if(accountScope)queueCloudSave();
}window.addEventListener('beforeunload',save);
// LIFE 1.5: an explorable east district and persistent, finite progression.
const expansionProps=[{type:'workshop',asset:'shop',x:2500,y:640,w:320,h:320},{type:'boutique',asset:'market',x:3100,y:740,w:320,h:335},{type:'lodge',asset:'home',x:2910,y:1740,w:340,h:347}];
const stations=[
 {id:'village',name:'중앙광장',icon:'⛲',x:1110,y:900,desc:'주민과 인사하고 생활 수첩 확인'},
 {id:'farm',name:'햇살 텃밭',icon:'🌱',x:1030,y:1350,desc:'씨앗을 심고 수확해 첫 수입 만들기'},
 {id:'pier',name:'바다 낚시터',icon:'🎣',x:1464,y:1168,desc:'입질을 기다려 타이밍 낚시'},
 {id:'home',name:'우리집',icon:'🏠',x:1390,y:645,desc:'벽지와 가구로 내 공간 꾸미기'},
 {id:'forest',name:'도토리 숲',icon:'🌳',x:2370,y:1180,desc:'나무와 들꽃 채집 · 45초 뒤 재생'},
 {id:'workshop',name:'나무결 공방',icon:'🪵',x:2500,y:800,desc:'재료를 모아 가구·납품 상자 제작'},
 {id:'boutique',name:'달빛 의상실',icon:'👒',x:3100,y:920,desc:'벌어들인 돈으로 의상·모자 구매'},
 {id:'quarry',name:'반짝 광산',icon:'⛏️',x:3200,y:1430,desc:'돌 채집 · 제작 재료 확보'},
 {id:'lodge',name:'숲속 교역소',icon:'📦',x:2910,y:1900,desc:'제작 상자 납품으로 수입 얻기'},
 {id:'garden',name:'별빛 정원',icon:'🌼',x:2470,y:2040,desc:'꽃 채집 · 원하는 곳에 장식 배치'},
 {id:BUSINESS_PORTAL_V42.id,name:BUSINESS_PORTAL_V42.name,icon:BUSINESS_PORTAL_V42.icon,
  x:BUSINESS_PORTAL_V42.x,y:BUSINESS_PORTAL_V42.y,desc:BUSINESS_PORTAL_V42.description}
];
const resourceNodes=[
 ...Array.from({length:9},(_,i)=>({id:'wood'+i,kind:'wood',x:2200+(i%3)*150,y:1100+Math.floor(i/3)*180})),
 ...Array.from({length:7},(_,i)=>({id:'stone'+i,kind:'stone',x:3020+(i%3)*155,y:1230+Math.floor(i/3)*160})),
 ...Array.from({length:8},(_,i)=>({id:'petal'+i,kind:'petal',x:2220+(i%4)*130,y:1870+Math.floor(i/4)*180}))
];
state.materials={wood:0,stone:0,petal:0,...state.materials};state.nodeReady=state.nodeReady||{};state.crafted=state.crafted||{};
state.chapter=Math.max(0,Math.min(50,Math.floor(Number(state.chapter)||0)));state.gathered=state.gathered||0;state.craftCount=state.craftCount||0;state.deliveries=state.deliveries||0;state.visits=state.visits||{};
const recipes=[
 {id:'linen',name:'공방 린넨 셔츠',icon:'🧵',needs:{petal:12,wood:4},desc:'옷장에 추가되는 직접 만든 의상',xp:65,outfit:'linen'},
 {id:'parcel',name:'숲의 선물 상자',icon:'📦',needs:{wood:3,petal:2},desc:'교역소 납품 시 180G',xp:20},
 {id:'bench',name:'원목 벤치',icon:'🪑',needs:{wood:8,stone:2},desc:'꾸미기에서 무료 배치',xp:40},
 {id:'lantern',name:'숲길 가로등',icon:'🏮',needs:{wood:5,stone:5},desc:'꾸미기에서 무료 배치',xp:45},
 {id:'flower',name:'들꽃 화분',icon:'🌷',needs:{petal:5,stone:2},desc:'꾸미기에서 무료 배치',xp:30}
];
const materialNames={wood:'목재',stone:'돌',petal:'꽃잎'};
const chapters=[
 {title:'첫 수확의 기쁨',desc:'농사 버튼으로 텃밭에 가서 작물을 1번 수확해요.',done:()=>Math.min(1,state.harvest),total:1,station:'farm',reward:100},
 {title:'숲으로 떠나는 산책',desc:'지도로 도토리 숲에 이동하고 나무·돌·꽃을 5번 채집해요.',done:()=>Math.min(5,state.gathered),total:5,station:'forest',reward:140},
 {title:'나의 첫 제작',desc:'나무결 공방에서 목재 3개와 꽃잎 2개로 선물 상자를 만들어요.',done:()=>Math.min(1,state.craftCount),total:1,station:'workshop',reward:180},
 {title:'손으로 번 첫 수입',desc:'숲속 교역소에 만든 선물 상자 1개를 납품해요.',done:()=>Math.min(1,state.deliveries),total:1,station:'lodge',reward:200},
 {title:'나만의 스타일',desc:'달빛 의상실에서 마음에 드는 옷이나 모자를 구매해요.',done:()=>Math.min(1,owned.filter(x=>!['mint','none'].includes(x)).length+state.fashion.owned.filter(id=>CATALOG_BY_ID[id]&&['outfit','hair','accessory'].includes(CATALOG_BY_ID[id].type)).length),total:1,station:'boutique',reward:150},
 {title:'머물고 싶은 마을',desc:'제작하거나 구매한 장식을 마을에 3개 배치해요.',done:()=>Math.min(3,state.decorations.length),total:3,station:'garden',reward:300},
 {title:'바다의 수집가',desc:'부두에서 서로 다른 물고기를 3종 발견해요.',done:()=>Math.min(3,new Set(state.collection).size),total:3,station:'pier',reward:350},
 {title:'마을의 생활 장인',desc:'누적 5개 상자를 납품하고 집에 가구 3개를 모아봐요.',done:()=>Math.min(5,state.deliveries)+Math.min(3,state.home.furniture.length),total:8,station:'lodge',reward:600}
]; 
chapters.push(...makeLivingChapters(state,FISH_BY_NAME));
const CHAPTER_COUNT=chapters.length;
let lastJourneyUpdate=-1;
function lifeLevel(){return 1+Math.floor(state.xp/160)}
function lifeBonus(kind){
 const lv=lifeLevel();
 const levelBonus=kind==='gather'&&lv>=3?1:kind==='harvest'&&lv>=4?12:kind==='delivery'&&lv>=6?25:kind==='fish'&&lv>=8?15:0;
 return levelBonus+petBonus(state.fashion?.equipped.pet,kind);
}
function lifePerkGuide(){
 const lv=lifeLevel();
 return [['Lv.2','대나무 낚싯대 구매',2],['Lv.3','채집 재료 +1개',3],['Lv.4','수확 수입 +12G',4],
 ['Lv.3','마을 밖 슬라임 사냥터 오픈',3],['Lv.5','목조주택·어항 6칸',5],['Lv.7','은빛 낚싯대 구매',7],['Lv.8','낚시 수입 +15G · 어항 9칸',8],
 ['Lv.10','정원이 있는 집 업그레이드',10],['Lv.12','어항 전시 12칸',12],['Lv.18','로열 주택·별빛 낚싯대',18]].map(([label,name,need])=>'<p>'+(lv>=need?'✅':'🔒')+' '+label+' · '+name+'</p>').join('');
}
// v49: one discoverable menu tree. All actions are existing game functions.
let v49ActiveSection='home';
function openV49Component(section,elementId,lead,mount){
 openModal('<span class="titlebadge">준자마을 · '+lead+' · 별도 경제</span><div id="'+elementId+'"></div>');
 mount(document.getElementById(elementId),{back:()=>openVillageMenuV49(section)});
}
function openVillageMenuV49(section='home'){
 const allowed=['home','life','production','house','bag'];
 v49ActiveSection=allowed.includes(section)?section:'home';
 const q=chapters[state.chapter];
 const goal=q?{title:q.title,description:q.desc,done:Math.min(q.total,Math.max(0,Number(q.done())||0)),
  total:q.total,reward:q.reward,station:q.station}:null;
 activateVillageDockV49(document.getElementById('v49Dock'),v49ActiveSection);
 openModal('<div id="v49MenuHost" role="region" aria-label="마을 메뉴"></div>');
 renderVillageMenuV49(document.getElementById('v49MenuHost'),{
  section:v49ActiveSection,goal,level:lifeLevel(),
  onCategory:openVillageMenuV49,
  onAction:action=>{
   switch(action){
    case 'goal':return openJourney();
    case 'go-goal':return q?goQuestDestinationV55(q):openJourney();
    case 'farm':case 'storage':return openPersonalEstate();
    case 'quickfarm':return openFastFarmV55();
    case 'arcade':return openVillageArcadeV55();
    case 'fishing':return goStation('pier');
    case 'gather':return goStation('forest');
    case 'craft':return goStation('workshop');
    case 'energy':return document.getElementById('energyHudV47')?.click();
    case 'orders':return openEstateOrders();
    case 'daily':return openJournal();
    case 'career':return openV49Component('life','v49Profession','직업과 계약',openProfessionCenter);
    case 'hunt':return goToHunting();
    case 'festival':return openFestival();
    case 'social':return openSocial();
    case 'business':return openV49Component('production','v49Business','나의 사업장',openBusinessCenter);
    case 'district':
     openModal('<span class="titlebadge">준자마을 · 사업장 거리 · 시험 공간</span><div id="v49District"></div>');
     workshopPlaza=openWorkshopPlaza(document.getElementById('v49District'),{
      look:{coat:state.coat,hat:state.hat,fashion:state.fashion?.equipped||{}},
      backLabel:'← 생산 메뉴로 돌아가기',back:()=>openVillageMenuV49('production')
     });return;
    case 'market':return openMarket();
    case 'trade':return openV49Component('production','v49Trade','주민 거래소',openPlayerMarket);
    case 'economy':return openV49Component('production','v49Economy','서버 경제·복구',openSecureEconomyLab);
    case 'house':return openHomeStudioV48();
    case 'decorate':return openDecor();
    case 'wardrobe':return openShop();
    case 'collection':return openAquarium();
    case 'reputation':return openReputation();
    case 'inventory':return openBag();
    case 'materials':return openMaterialMarket();
    case 'map':return openWorldMap();
    case 'backup':return openSaveVault();
    default:return toast('이 기능의 이동 경로를 찾을 수 없어');
   }
  }
 });
}
function installVillageDockV49(){
 const dock=document.getElementById('v49Dock');
 if(!dock)return;
 for(const b of dock.querySelectorAll('[data-v49-section]')){
  b.onclick=()=>openVillageMenuV49(b.dataset.v49Section);
 }
 activateVillageDockV49(dock,'home');
}
// v49 never rewrites, replaces, or migrates user cloud saves.

function initJourney(){
 // Old saved positions may be inside newer buildings/trees. Ensure avatar-width clearance.
 if(!navigation.safe(player)){
  const fixed=navigation.nearest(player,288)||navigation.nearest({x:1050,y:955},288);
  if(fixed){player.x=fixed.x;player.y=fixed.y;player.vx=player.vy=0;save()}
 }camera.x=player.x;camera.y=player.y;
 els.welcome.textContent='모여봐요 반말방숲 · 작고 다정한 하루';
 els.hint.textContent='터치: 목적지 이동 · 꾹 누르고 드래그: 방향 변경';
 document.querySelector('.eyebrow').textContent='✦ 나의 생활 목표';
 const quest=document.querySelector('.quest');quest.style.cursor='pointer';quest.setAttribute('role','button');quest.tabIndex=0;quest.setAttribute('aria-label','현재 생활 목표와 이동 안내 열기');quest.onclick=openJourney;quest.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openJourney()}};
 document.getElementById('guideBtn').onclick=openJourney;document.getElementById('guideBtn').querySelector('small').textContent='성장 수첩';
 document.getElementById('mapButton').onclick=openWorldMap;document.getElementById('mapButton').onkeydown=e=>{if(e.key==='Enter')openWorldMap()};
 document.getElementById('craftBtn').onclick=()=>goStation('workshop');
 updateJourney(true);
}
function updateJourney(force=false){
 if(!force&&t-lastJourneyUpdate<.25)return;lastJourneyUpdate=t;
 const q=chapters[state.chapter];els.questText.textContent=q?(q.done()>=q.total?'🎁 보상 받기 · '+q.title:q.title):'마을 생활 장인 · 자유롭게 꾸며봐요';
 const next=document.getElementById('questNext');if(next)next.textContent=q?(q.done()>=q.total?'수첩에서 '+q.reward+'G 보상을 받아요':q.desc):'낚시·제작·꾸미기로 나만의 마을을 만들어요';
 els.questCount.textContent=q?`${q.done()} / ${q.total} · 눌러서 안내`:CHAPTER_COUNT+'장 완주 · 월간 목표 도전';els.questProgress.style.width=q?`${q.done()/q.total*100}%`:'100%';
 for(const s of stations)if(distance(player,s)<140){
  state.visits[s.id]=true;
  if(!state.dailyVisits.includes(s.id)){state.dailyVisits.push(s.id);completeDaily()}
 }
}
// Unified quest deep-links. A goal should open the actual activity, not only a
// generic map marker, while keeping the original quest ID/save intact.
function goQuestDestinationV55(goal){
 if(!goal)return openJourney();
 if(goal.station==='farm')return openFastFarmV55();
 if(goal.station==='garden')return openDecor();
 if(goal.station==='home')return openHome();
 if(goal.station==='village'){
  if(/사냥|몬스터|토벌/.test(goal.desc||'')||goal.metric==='huntKills')return goToHunting();
  if(goal.metric==='bond')return openSocial();
  return openWorldMap();
 }
 const known=stations.find(s=>s.id===goal.station);
 if(known)return goStation(known.id);
 return openWorldMap();
}
function openJourney(){
 const q=chapters[state.chapter];
 openModal(`<span class="titlebadge">MY LIFE · ${Math.min(CHAPTER_COUNT,state.chapter+1)} / ${CHAPTER_COUNT}</span><h2>나의 마을 생활</h2><p>생활 · 낚시 · 사냥 · 꾸미기 · 주민 교류 · 장기 성장</p>${q?`<div class="mini-card"><strong>${q.title}</strong><p>${q.desc}</p><div class="mini-progress"><i style="width:${q.done()/q.total*100}%"></i></div><p>${q.done()} / ${q.total} · 보상 ${q.reward}G + 경험치 ${q.xp||60}</p><button id="journeyGo">${(stations.find(s=>s.id===q.station)?.icon||'🌿')} 목적지까지 걷기</button><button id="journeyClaim" ${q.done()<q.total?'disabled':''}>보상 받고 다음 목표</button></div>`:'<div class="mini-card"><strong>🎉 생활 장인 달성!</strong><p>자유롭게 채집·제작·꾸미기를 즐기고 일일 의뢰도 도전해요.</p></div>'}<div class="village-loop"><button id="loopGather">🌳 채집<small>재료 모으기</small></button><button id="loopCraft">🪵 제작<small>가치 더하기</small></button><button id="loopSell">⚓ 판매<small>성장 비용 마련</small></button></div><h3>나의 성장 혜택 · Lv.${lifeLevel()}</h3>${lifePerkGuide()}<h3>🏅 나의 칭호 · ${villageTitle(state.chapter)}</h3><p>50장 이후에도 월간 기록과 마을 평판은 계속 성장해요.</p><h3>걸어온 길</h3>${chapters.map((c,i)=>`<p>${i<state.chapter?'✅':i===state.chapter?'▶':'▫️'} ${i+1}. ${c.title}</p>`).join('')}<div class="pill-row"><button class="pill-btn" id="journeyMap">마을 지도</button><button class="pill-btn ghost" id="journeyDaily">일일 의뢰 / 업적</button><button class="pill-btn ghost" id="journeyHelp">조작법</button></div>`);
 if(q){document.getElementById('journeyGo').onclick=()=>goQuestDestinationV55(q);document.getElementById('journeyClaim').onclick=()=>{if(chapters[state.chapter]!==q||q.done()<q.total)return;state.chapter++;earn(q.reward,'chapter','메인 챕터 완성');state.xp+=(q.xp||60);save();hud();updateJourney(true);toast('생활 목표 완료! +'+q.reward+'G');openJourney()}}
 document.getElementById('loopGather').onclick=()=>goStation('forest');document.getElementById('loopCraft').onclick=openCraft;document.getElementById('loopSell').onclick=openMarket;document.getElementById('journeyMap').onclick=openWorldMap;document.getElementById('journeyDaily').onclick=openJournal;document.getElementById('journeyHelp').onclick=guide;
}
async function goToHunting(){
 save();if(accountScope&&!await saveQueue.flush()){toast('저장을 확인한 뒤 사냥터로 이동할 수 있어요');return}const room=(new URLSearchParams(location.search).get('room')||'SPRING').replace(/[^A-Za-z0-9_-]/g,'').slice(0,12);
 location.assign('/hunt.html?room='+encodeURIComponent(room||'SPRING'));
}
function openWorldMap(){
 openModal(`<span class="titlebadge">JUNJA ISLAND · 3,600 × 2,400</span><h2>길 따라 만나는 마을</h2><p>장소를 누르면 길을 찾아 걸어가요. 이동 중 바닥을 누르면 목적지가 바뀝니다.</p><div class="map-overview"><span>서쪽 · 마을과 바다</span><span>동쪽 · 숲과 공방</span><div>🏠 ⛲ 🌱 🎣</div><div>🌲 🪵 👒 ⛏️ 📦</div></div><div class="mini-card"><strong>⚔️ 마을 밖 사냥터</strong><p>여섯 개의 독립된 3D 사냥터에서 정예몬스터·보스·주간 원정대에 도전해 전리품을 모아봐요. Lv.3부터 입장할 수 있어요.</p><button type="button" id="mapHuntGo">⚔️ 사냥터 지역 지도 열기</button></div><div class="card-grid">${stations.map(s=>`<div class="mini-card"><span class="emoji">${s.icon}</span><strong>${s.name}</strong><p>${s.desc}</p><button data-station="${s.id}">${state.visits[s.id]?'방문한 장소':'새로운 장소'} · 이동</button></div>`).join('')}</div>`);
 els.panelBody.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>goStation(b.dataset.station));
 document.getElementById('mapHuntGo').onclick=goToHunting;
}
function goStation(id){const s=stations.find(s=>s.id===id);if(!s)return;closeModal();if(distance(player,s)<90){openStation(id);return}if(moveTo(s.x,s.y,{type:'station',id}))toast(s.icon+' '+s.name+'까지 걸어가요')}
function openBusinessDistrictFromVillage(){
 if(!canUseBusinessPortal(player)){goStation(BUSINESS_PORTAL_V42.id);return}
 // Capture return point in RAM only. Never change persisted cloud-save shape.
 const returnSpot=portalReturnPosition(player);
 stopWalking();
 openModal('<span class="titlebadge">준자마을 · 사업장 거리</span>'+
  '<p style="margin:2px 0 10px">🚪 동쪽 사업장 거리 입장 · 돌아가기를 누르면 마을의 원래 위치로 복귀해요.</p>'+
  '<div id="districtPortalV42" role="region" aria-label="3D 주민 사업장 거리"></div>');
 workshopPlaza=openWorkshopPlaza(document.getElementById('districtPortalV42'),{
  look:{coat:state.coat,hat:state.hat,fashion:state.fashion?.equipped||{}},
  backLabel:'← 준자마을로 돌아가기',
  back:()=>{closeModal();toast('🏡 주민 사업장 거리에서 마을로 돌아왔어요')}
 });
 // Main avatar never moves while the district modal is open.
 return returnSpot;
}

function openStation(id){
 const s=stations.find(s=>s.id===id);if(!s)return;
 if(id===BUSINESS_PORTAL_V42.id){
  if(!canUseBusinessPortal(player)){goStation(id);return}
  openBusinessDistrictFromVillage();return;
 }
 if(distance(player,s)>155){goStation(id);return}
 state.visits[id]=true;if(!state.dailyVisits.includes(id))state.dailyVisits.push(id);completeDaily();save();
 if(id==='workshop')return openCraft();if(id==='garden')return openDecor();if(id==='boutique')return openShop();if(id==='lodge')return openDelivery();if(id==='home')return openHome();if(id==='farm')return farmAll();if(id==='pier')return beginFishing();if(id==='village')return openJourney();
 toast(s.icon+' 주변 '+(id==='forest'?'나무':id==='quarry'?'바위':'꽃')+'를 터치해서 채집하세요');
}

async function gather(id){const n=resourceNodes.find(n=>n.id===id);if(!n||distance(player,n)>110)return;
 const remaining=(state.nodeReady[id]||0)-Date.now();if(remaining>0){toast('다시 채집까지 '+Math.ceil(remaining/1000)+'초');return}
 const desired=2+lifeBonus('gather'),free=bagFree(state);
 if(free<1){openBag();toast('🎒 가방이 가득 찼어요. 판매하거나 가방을 확장하세요');return}
 const amount=Math.min(desired,free);
 if(!await useWorldEnergy('gather'))return;
 if(!addBagItems(state,'material',n.kind,amount)){toast('🎒 가방 보관에 실패했어요. 가방을 열어 잔여 칸을 확인해 주세요');return}
 world3D?.burst(n.x,n.y,n.kind==='wood'?0xd4b482:n.kind==='stone'?0xc6d8df:0xf3b8d2);state.nodeReady[id]=Date.now()+45000;state.gathered++;state.dailyGather++;completeDaily();state.xp+=8;save();hud();updateJourney(true);party(n.x,n.y-30,9);toast(materialNames[n.kind]+' +'+amount+(amount<desired?' · 빈칸 '+free+'칸만큼 채집했어요':' · 가방에 보관했어요'));
}

function openDelivery(){
 openModal(`<span class="titlebadge">FOREST EXCHANGE</span><h2>숲속 교역소</h2><p>공방에서 만든 선물 상자를 납품하고 꾸미기 비용을 마련해요.</p><div class="mini-card"><span class="emoji">📦</span><strong>숲의 선물 상자 · 개당 ${180+lifeBonus('delivery')}G</strong><p>보유 ${state.crafted.parcel||0}개 · 누적 납품 ${state.deliveries}개</p><button id="deliverParcel" ${!(state.crafted.parcel>0)?'disabled':''}>1개 납품 · ${180+lifeBonus('delivery')}G 받기</button></div><button class="pill-btn ghost" id="deliveryCraft">공방으로 이동</button>`);
 document.getElementById('deliverParcel').onclick=async()=>{if(!(state.crafted.parcel>0))return;
  if(!await useWorldEnergy('order'))return;
  state.crafted.parcel--;state.deliveries++;state.dailyDeliver++;completeDaily();const income=180+lifeBonus('delivery');const earned=earn(income,'deliver','교역소 납품');state.xp+=25;save();hud();updateJourney(true);toast('납품 완료! +'+earned+'G');openDelivery()};document.getElementById('deliveryCraft').onclick=()=>goStation('workshop');
}

function hud(){els.coins.textContent=Math.floor(state.coins).toLocaleString('ko-KR');const lv=lifeLevel();els.level.textContent='Lv.'+lv+' · '+(lv>=18?'로열 마을의 주인':lv>=10?'생활 장인':lv>3?'하버 주민':'새싹 주민');els.xp.style.width=((state.xp%160)/160*100)+'%';updateJourney(true)}
hud();
// Persist the very first account snapshot immediately, including recovered
// browser progress. Otherwise brand-new accounts have no cloud save until
// a state change and can reappear at Lv.1 on another device.
if(accountScope)queueCloudSave();
setInterval(save,60000); // v55: passive position autosave every 1 min; all purchases/awards retain immediate save()
if(accountScope){
 const lastAdminRevision=Number(state.__adminRevision)||0;
 async function pullAdminChanges(){
  if(saveBlocked)return;
  try{
   const response=await fetch('/api/account?action=save',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   const remote=(await response.json()).save?.profile;
   if(!remote)return;
   const revision=Math.max(0,Math.floor(Number(remote.__adminRevision)||0));
   // An admin action changes the server version. Never mix that updated
   // snapshot into this old client and overwrite other saved fields.
   if(revision!==lastAdminRevision){
    showSaveConflict('👑 관리자 변경 사항이 서버에 저장됐어요. 최신 기록으로 재접속해야 안전하게 적용돼요.');
   }
  }catch{}
 }
 setInterval(pullAdminChanges,60000); // v55: poll admin revisions every minute, never overwrite concurrent cloud save
 pullAdminChanges();
}
if(accountScope){
 const onlinePanel=document.createElement('div');
 onlinePanel.style.cssText='position:relative;top:auto;right:auto;z-index:1;background:transparent;color:#284c34;border:0;border-radius:16px;padding:0;max-width:min(300px,85vw);width:auto;font:600 13px sans-serif;box-shadow:none';
 onlinePanel.innerHTML='<button type="button" aria-label="접속자 목록 열기" id="onlineToggle" style="background:#d5e9d5;border:1px solid #b9d4bc;border-radius:30px;padding:6px 10px;font-size:12px;line-height:1.25;white-space:nowrap;font-weight:800;color:#264b36;box-shadow:0 2px 8px #0002">🟢 접속자</button><div id="onlineBody" hidden style="max-height:340px;overflow:auto;margin-top:8px;background:#fffaf0f7;border:1px solid #d9cfae;border-radius:14px;padding:8px;width:min(290px,80vw);box-shadow:0 5px 20px #0002">접속자 확인 중…</div>';
 (document.getElementById('accountDock')||document.body).appendChild(onlinePanel);
 const onlineToggle=onlinePanel.querySelector('#onlineToggle'),onlineBody=onlinePanel.querySelector('#onlineBody');
 onlineToggle.onclick=()=>{onlineBody.hidden=!onlineBody.hidden;onlineToggle.setAttribute('aria-expanded',String(!onlineBody.hidden));if(!onlineBody.hidden)refreshOnline()};onlineToggle.setAttribute('aria-expanded','false');
 async function refreshOnline(){
  try{
   const response=await fetch('/api/account?action=online',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('접속 정보 조회 실패');
   const data=await response.json(),people=data.players||[];
   onlineToggle.textContent='🟢 '+people.length+'명';
   onlineBody.replaceChildren();
   if(!people.length){onlineBody.textContent='현재 접속 중인 주민이 없어요';return}
   for(const p of people){
    const line=document.createElement('div');line.style.cssText='padding:8px 0;border-bottom:1px solid #e5e1d4;display:flex;align-items:center;gap:7px';
    const info=document.createElement('span');info.style.cssText='flex:1;min-width:0;overflow-wrap:anywhere';info.textContent=(p.rank===1?'🥇 ':p.rank===2?'🥈 ':p.rank===3?'🥉 ':'#'+p.rank+' ')+p.nickname+' · Lv.'+p.level;
    line.append(info);
    if(p.username!==accountScope){
     const follow=document.createElement('button');follow.textContent='따라가기';follow.style.cssText='border:0;border-radius:9px;background:#c8e4cf;padding:8px 7px;font-weight:700;color:#245038;white-space:nowrap';
     follow.onclick=()=>{const x=Number(p.x),y=Number(p.y);if(Number.isFinite(x)&&Number.isFinite(y)){if(moveTo(x,y,{type:'follow',username:p.username}))toast('👣 '+p.nickname+' 위치로 이동해요');else toast('해당 위치로 이동할 수 없어요')}else toast('위치를 확인할 수 없어요')};
     line.append(follow);
    }
    onlineBody.append(line);
   }
  }catch{onlineToggle.textContent='🌳 접속 확인 대기 중';if(!onlineBody.hidden)onlineBody.textContent='접속자 정보를 가져올 수 없어요'}
 }
 async function syncVillagePresence(){
  try{
   await fetch('/api/account?action=presence',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:player.x,y:player.y,xp:Math.max(0,Number(state.xp)||0)})});
  }catch{}
  await refreshOnline();
 }
 setInterval(syncVillagePresence,30000);syncVillagePresence();
}
ensureFestival();
const festivalBtn=document.getElementById('festivalBtn');if(festivalBtn)festivalBtn.onclick=openFestival;
const huntPortal=document.getElementById('huntPortal');if(huntPortal)huntPortal.onclick=goToHunting;
let toastTimer;function toast(s){els.toast.textContent=s;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200)}
function resize(){CW=innerWidth;CH=innerHeight;scale=Math.max(.62,Math.min(1,CW/620));}window.addEventListener('resize',resize);resize();

const lamps=[[650,780],[1340,780],[990,1035],[760,1100],[1450,1020],[1215,605],[740,610]];

// v1.2 integrated four-facing illustrated character sprites. Every frame uses real authored character artwork,
// not background-overlay cutouts or flat canvas circles. Source includes coat variants and transparent alpha.
const AVATAR_SPRITES={};
const AVATAR_IMAGES={};
for(const coat of Object.keys(AVATAR_SPRITES)) AVATAR_IMAGES[coat]=AVATAR_SPRITES[coat].map(b64=>{
  const img=new Image();img.src='data:image/webp;base64,'+b64;return img;
});
const AVATAR_PREVIEWS={};
for(const [coat,urls] of Object.entries(AVATAR_SPRITES)) AVATAR_PREVIEWS[coat]='data:image/webp;base64,'+urls[0];

function drawWorld(dt){if(estateWorld||workshopPlaza)return;if(world3D){updateVillageResidents(npcs,Date.now(),walkable);const q=villagerQuestState();world3D.render({state,actor:player,npcs,animals:animalFriends.map(a=>({...a,questMark:q.requests.some(r=>r.id===a.id&&r.status!=='done')})),peers,time:t,dt,goal,path});}}
function party(x,y,n=12){for(let i=0;i<n;i++){fx.push({x,y,v:rand(22,64),vx:rand(-56,56),life:rand(.7,1.3),total:1.3,r:rand(2,5),col:['#fff7b5','#ffe1f1','#f3f7fb','#8de3dc'][Math.floor(rand(0,4))]})}}
function walkable(x,y){
 if(portalCollision(x,y))return false;
 if(world3D?.blocked(x,y))return false;
 if(x<80||x>W-80||y<120||y>H-80)return false;
 // Original harbor coast stays at its authored size; the east trail exits at y=720..1060.
 if(x<2000){
  if(y>1220&&x<455)return false;
  if(y>1140&&x>1575)return false;
  if(y>1390&&x>1365)return false;
  if(y>1460&&x<580)return false;
  if(y>1570)return false;
 }
 if(x>=1920&&x<=2080&&(y<720||y>1060))return false;
 for(const b of [[515,470,178,118],[1430,465,168,123],[1585,837,148,93],[1010,695,95,88],[2500,640,165,108],[3100,740,170,110],[2910,1740,185,105]]){
  if(Math.abs(x-b[0])<b[2]&&Math.abs(y-b[1])<b[3])return false;
 }
 return true;
}
const navigation=JunjaNavigation({width:W,height:H,walkable});
function pathfind(from,to){return navigation.route(from,to)}
function stopWalking(){path=[];goal=null;popup=null;player.vx=player.vy=0;}
function moveTo(x,y,arrival,quiet=false){
 if(fishPhase!=='idle')fishFailure('이동하여 낚시를 마쳤어요');
 if(!Number.isFinite(x)||!Number.isFinite(y)){if(!quiet)toast('이동 위치를 찾지 못했어요');return false}
 if(!navigation.safe(player)){
  const safe=navigation.nearest(player,288)||navigation.nearest({x:1050,y:955},288);
  if(safe){player.x=safe.x;player.y=safe.y;player.vx=player.vy=0;save()}
 }
 if(Math.hypot(x-player.x,y-player.y)<9){stopWalking();return true}
 const way=pathfind(player,{x,y});
 if(!way.length){
  stopWalking();
  if(!quiet)toast('여기서는 길이 이어지지 않아요. 길 쪽을 터치해주세요');
  return false;
 }
 path=way;goal={...way[way.length-1]};
 const snapped=Math.hypot(goal.x-x,goal.y-y);
 // Never repeatedly reopen an unreachable shop when the user is only able to
 // approach a wall. Station callbacks require arriving near the actual entrance.
 popup=arrival&&snapped<70?arrival:null;
 if(!quiet&&snapped>70)toast('가까이 갈 수 있는 길까지 이동할게요');
 els.hint.classList.add('hidden');return true;
}
function arrive(){const p=popup;popup=null;goal=null;player.vx=player.vy=0;if(!p)return;
 if(p.type==='action')interaction(p.kind);
 if(p.type==='farm')farmAt(p.idx);
 if(p.type==='npc')openNpc(p.npc);
 if(p.type==='animal'){const a=animalFriends.find(v=>v.id===p.animalId);if(a)openAnimal(a)}
 if(p.type==='station')openStation(p.id);
 if(p.type==='gather')gather(p.id);
}
// Optional LAN / server-hosted friends. The static downloadable preview remains a real offline game.
const peers={};
// Remember player-entered nicknames, but migrate the previous "마을주민####" placeholders.
// This browser-only owner entitlement is NOT authenticated identity; secure roles need a server.
const PLAYER_NICK_KEY='junja-village-nickname',OPERATOR_NICK='갓준자';
const isLegacyPlaceholder=nick=>/^마을\s*주민(?:\d{4})?$/.test(nick);
const newVisitorNick=()=>('새싹'+Math.floor(1000+Math.random()*9000));
let socialNickname='';
try{
 const oldName=String(localStorage.getItem(PLAYER_NICK_KEY)||'').replace(/[<>\x00-\x1f\x7f]/g,'').trim().slice(0,12);
 socialNickname=accountScope?(sessionStorage.getItem('village-auth-nickname')||accountScope):state.operatorGiftV21?OPERATOR_NICK:(oldName&&!isLegacyPlaceholder(oldName)?oldName:newVisitorNick());
 localStorage.setItem(PLAYER_NICK_KEY,socialNickname);
}catch{socialNickname=accountScope?(sessionStorage.getItem('village-auth-nickname')||accountScope):state.operatorGiftV21?OPERATOR_NICK:newVisitorNick()}
function showOperatorNickname(){
 socialNickname=OPERATOR_NICK;
 effectiveDisplayNick=OPERATOR_NICK;
 try{localStorage.setItem(PLAYER_NICK_KEY,socialNickname)}catch{}
 els.name.textContent=socialNickname;
 world3D?.setNickname(socialNickname);
 // The relay stores the nickname at join, so reconnect with the updated name.
 if(typeof connectSocial==='function')connectSocial();
}
const VILLAGE_CLIENT_KEY='junja-village-client-id';
let villageClientId='';
try{
 villageClientId=localStorage.getItem(VILLAGE_CLIENT_KEY)||'';
 if(!/^[a-zA-Z0-9-]{18,64}$/.test(villageClientId)){
  villageClientId=crypto.randomUUID?crypto.randomUUID():'device-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  localStorage.setItem(VILLAGE_CLIENT_KEY,villageClientId);
 }
}catch{villageClientId='ephemeral-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
let effectiveDisplayNick=socialNickname,oldSocketReplaced=false;
let socialSocket=null,socialRoom='SPRING',socialId=null,lastPositionSent=0,retryCount=0;
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function socialSend(o){if(o?.type!=='say')return;
if(socialSocket?.readyState===WebSocket.OPEN)socialSocket.send(JSON.stringify({type:'say',phrase:o.phrase}));
else livePendingPhrase=o.phrase}
function updateSocialBadge(){const b=document.getElementById('socialStatus');if(!b)return;b.textContent=socialId?'🟢 친구 '+(Object.keys(peers).length+1)+'/8명 · '+socialRoom:'👫 친구 · 오프라인';}
function openSocial(){
 const connected=Boolean(socialId);
 const url=(location.origin==='null'?null:location.origin)+'/?room='+encodeURIComponent(socialRoom);
 openModal(`<span class="titlebadge">VILLAGE FRIENDS · 8명/방</span><h2>👫 친구와 말풍선</h2>
  <p>${connected?'🟢 같은 마을 '+(Object.keys(peers).length+1)+'명':'⚪ 혼자 미리보기'} · 자유 채팅은 지원하지 않아요.</p>
  <div class="mini-card"><strong>내 이름</strong><div style="display:flex;gap:6px;margin-top:7px">
  <input id="villageNickname" maxlength="12" value="${esc(socialNickname)}" ${state.operatorGiftV21?'readonly':''} aria-label="캐릭터 이름" style="min-width:0;flex:1;border-radius:12px;padding:10px;border:1px solid #d8c7a7">
  <button id="saveVillageNickname" ${state.operatorGiftV21?'disabled':''}>${state.operatorGiftV21?'👑 운영자':'저장'}</button></div></div>
  ${connected?`<div class="mini-card"><strong>초대 링크</strong><p style="overflow-wrap:anywhere">${esc(url)}</p><button id="copyInvite">복사</button></div>`:
  '<p>친구들과 함께하려면 실시간 멀티플레이 서버 주소로 접속해야 해요. 이 GitHACK 미리보기는 혼자 체험하는 버전이에요.</p>'}
  <h3>💬 말풍선 선택</h3><div class="speech-grid">${PHRASES.map((p,i)=>`<button type="button" data-phrase="${i}">${p}</button>`).join('')}</div>
  <p class="item-note">문구를 선택하면 캐릭터 위에 약 3초 동안 표시됩니다.</p>
  <div class="pill-row"><button class="pill-btn ghost" id="roomPlayers">접속 인원 ${Object.keys(peers).length+Number(Boolean(connected))}/8명</button></div>`);
 const saveNick=document.getElementById('saveVillageNickname');
 if(saveNick)saveNick.onclick=()=>{
  const field=document.getElementById('villageNickname');
  if(state.operatorGiftV21){toast('👑 운영자 이름은 갓준자로 고정됩니다');return}
  const nick=String(field?.value||'').replace(/[<>\x00-\x1f\x7f]/g,'').trim().slice(0,12);
  if(!nick){toast('이름을 입력해주세요');return}
  socialNickname=nick;try{localStorage.setItem(PLAYER_NICK_KEY,nick)}catch{}
  els.name.textContent=nick;world3D?.setNickname(nick);
  pollLive();
  toast('🌸 캐릭터 이름을 저장했어요');
 };
 const copy=document.getElementById('copyInvite');
 if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('초대 링크 복사 완료')}catch{toast('주소를 복사해주세요')}};
 els.panelBody.querySelectorAll('[data-phrase]').forEach(b=>b.onclick=()=>{
  const phrase=PHRASES[Number(b.dataset.phrase)];if(!phrase)return;
  closeModal();world3D?.sayLocal(phrase);socialSend({type:'say',phrase});
 });
 document.getElementById('roomPlayers').onclick=()=>toast(connected?'같은 방에 '+(Object.keys(peers).length+1)+'명 접속':'현재 혼자 플레이 중');
}
let livePendingPhrase=null,liveTimer=null,reconnectTimer=null;
function pollLive(){
 if(socialSocket?.readyState!==WebSocket.OPEN||!socialId)return;
 socialSocket.send(JSON.stringify({type:'pos',x:player.x,y:player.y,dir:player.dir,
  coat:state.coat,hat:state.hat,fashion:state.fashion.equipped}));
 if(livePendingPhrase){socialSocket.send(JSON.stringify({type:'say',phrase:livePendingPhrase}));livePendingPhrase=null}
}
function connectSocial(){
 socialRoom=(new URLSearchParams(location.search).get('room')||'SPRING').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,12)||'SPRING';
 if(liveTimer)clearInterval(liveTimer);
 if(reconnectTimer)clearTimeout(reconnectTimer);
 if(socialSocket){const prev=socialSocket;socialSocket=null;try{prev.onclose=null;prev.close()}catch{}}
 oldSocketReplaced=false;socialId=null;retryCount=0;
 function openSocket(){
  if(oldSocketReplaced)return;
  try{
   const url=new URL('/api/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   const socket=new WebSocket(url.href);socialSocket=socket;
   socket.onopen=()=>{
    if(socket!==socialSocket)return;
    socket.send(JSON.stringify({type:'join',room:socialRoom,clientId:villageClientId,nick:socialNickname,
     x:player.x,y:player.y,dir:player.dir,coat:state.coat,hat:state.hat,fashion:state.fashion.equipped}));
   };
   socket.onmessage=event=>{
    if(socket!==socialSocket)return;
    let data;try{data=JSON.parse(event.data)}catch{return}
    if(!data||typeof data!=='object')return;
    if(data.type==='welcome'){
     socialId=data.id;retryCount=0;
     for(const key of Object.keys(peers))delete peers[key];
     for(const p of data.players||[])if(p?.id&&p.id!==socialId)peers[p.id]={...p,targetX:p.x,targetY:p.y};
     updateSocialBadge();
    }else if(data.type==='join'&&data.player?.id&&data.player.id!==socialId){
     const p=data.player;peers[p.id]={...p,targetX:p.x,targetY:p.y};updateSocialBadge();
    }else if(data.type==='pos'&&data.id&&data.id!==socialId){
     const old=peers[data.id]||{id:data.id,nick:'마을 친구'};
     peers[data.id]={...old,...data,targetX:data.x,targetY:data.y};
    }else if(data.type==='leave'&&data.id){delete peers[data.id];updateSocialBadge();
    }else if(data.type==='speech'&&data.id&&peers[data.id]){
     peers[data.id].phrase=data.phrase;peers[data.id].phraseUntil=Date.now()+3200;
    }else if(data.type==='replaced'){
     oldSocketReplaced=true;socialId=null;updateSocialBadge();
     toast('다른 탭에서 접속하여 이 화면의 멀티플레이가 종료됐어요');
    }else if(data.type==='error'){toast(String(data.message||'마을 접속 오류').slice(0,80))}
   };
   socket.onclose=()=>{
    if(socket!==socialSocket)return;
    socialId=null;for(const id of Object.keys(peers))delete peers[id];
    updateSocialBadge();
    if(oldSocketReplaced)return;
    reconnectTimer=setTimeout(openSocket,Math.min(15000,1000*2**Math.min(retryCount++,4)));
   };
   socket.onerror=()=>{try{socket.close()}catch{}};
  }catch(e){
   socialId=null;updateSocialBadge();
   reconnectTimer=setTimeout(openSocket,Math.min(15000,1000*2**Math.min(retryCount++,4)));
  }
 }
 openSocket();
 liveTimer=setInterval(()=>{if(!document.hidden)pollLive()},250);
}

async function farmAt(i){if(i<0||i>=state.beds.length)return;const b=state.beds[i],stage=cropStage(b);if(b.crop&&stage>=3){
  let o=crops[b.crop];state.beds[i]={crop:null,at:0};const income=o.price+lifeBonus('harvest');const earned=earn(income,'harvest','작물 수확');state.harvest++;state.dailyHarvest++;addXp(16);party(bedCenters[i].x,bedCenters[i].y,18);toast(o.icon+' '+o.name+' 수확! +'+earned+'G');save();completeDaily();checkAchievements();return}
 const cards=Object.entries(crops).map(([k,v])=>`<div class="mini-card"><span class="emoji">${v.icon}</span><strong>${v.name}</strong><p>성장 ${v.seconds}초 · 수확 ${v.price+lifeBonus('harvest')}G</p><p>보유 씨앗 ${state.seeds[k]||0}개</p><button data-seed="${k}">${state.seeds[k]>0?'씨앗 선택 · 심기':'씨앗 부족'}</button></div>`).join('');
 if(b.crop){const q=crops[b.crop];let progress=Math.min(100,Math.round((Date.now()-b.at)/(q.seconds*1000)*100));openModal(`<span class="titlebadge">FARMING</span><h2>🌿 작물이 자라고 있어요</h2><p>${q.icon} ${q.name} · 자라는 중 (${progress}%)</p><div class="mini-progress"><i style="width:${progress}%"></i></div><p>남은 시간 ${Math.max(0,Math.ceil(q.seconds-(Date.now()-b.at)/1000))}초. 게임을 종료해도 자라요.</p><button class="pill-btn" id="farmClose">확인</button>`);document.getElementById('farmClose').onclick=closeModal;return}
 openModal(`<span class="titlebadge">FARMING</span><h2>🌱 씨앗을 심을까요?</h2><p>씨앗을 선택하면 즉시 심어요.</p><div class="card-grid">${cards}</div><button class="pill-btn ghost" id="buySeedLink">씨앗 상점 열기</button>`);els.panelBody.querySelectorAll('[data-seed]').forEach(btn=>btn.onclick=async()=>{const type=btn.dataset.seed;if(!(state.seeds[type]>0)){toast('씨앗이 부족해요. 상점에서 구매해요');return}
  if(!await useWorldEnergy('plant'))return;
  state.seeds[type]--;state.beds[i]={crop:type,at:Date.now()};addXp(4);closeModal();toast('🌱 '+crops[type].name+' 심기 완료!');party(bedCenters[i].x,bedCenters[i].y,8);save()});document.getElementById('buySeedLink').onclick=openFarmShop;
}
let farmBatchBusyV55=false;
async function runFarmBatchV55(mode,seed){
 if(farmBatchBusyV55)return;
 const at=Date.now();
 const planned=planFarmBatchV55(state.beds,crops,{
  mode,seed,stock:state.seeds[seed]||0,now:at,limit:FARM_BATCH_LIMIT_V55
 });
 if(!planned.length){toast(mode==='plant'?'🌱 씨앗이 부족하거나 빈 밭이 없어':'🌿 수확할 작물이 아직 없어');return}
 farmBatchBusyV55=true;
 const buttons=els.panelBody.querySelectorAll('[data-v55-batch]');
 buttons.forEach(b=>b.disabled=true);
 let successful=0;
 try{
  for(const index of planned){
   const bed=state.beds[index];
   if(mode==='plant'){
    if(!bed||bed.crop||(state.seeds[seed]||0)<1)break;
    if(!await useWorldEnergy('plant'))break;
    // The server committed an energy debit; finish exactly one crop operation
    // and immediately queue a normal cloud save before the next debit.
    state.seeds[seed]--;
    state.beds[index]={crop:seed,at:Date.now()};
    addXp(4);party(bedCenters[index].x,bedCenters[index].y,8);
   }else{
    if(!bed?.crop||cropStage(bed)<3)continue;
    const crop=crops[bed.crop];
    state.beds[index]={crop:null,at:0};
    earn(crop.price+lifeBonus('harvest'),'harvest','텃밭 빠른 수확');
    state.harvest++;state.dailyHarvest++;addXp(16);
    party(bedCenters[index].x,bedCenters[index].y,10);
    completeDaily();checkAchievements();
   }
   successful++;
   save();
  }
 }finally{
  farmBatchBusyV55=false;
  toast((mode==='plant'?'🌱 심기':'🧺 수확')+' '+successful+'개 완료'+(successful<planned.length?' · 행동력·재고 확인 필요':''));
  openFastFarmV55();
 }
}
function openFastFarmV55(){
 const ready=planFarmBatchV55(state.beds,crops,{mode:'harvest',now:Date.now()});
 const empty=state.beds.filter(b=>!b.crop).length;
 const planted=state.beds.filter(b=>b.crop).length;
 const options=Object.entries(crops).map(([id,c])=>
  '<option value="'+id+'">'+c.icon+' '+c.name+' · 씨앗 '+(state.seeds[id]||0)+'개</option>').join('');
 openModal('<span class="titlebadge">FARM V55 · 21 PLOTS</span><h2>🌱 텃밭 빠른 작업</h2>'+
  '<p>21칸을 한 번에 관리해요. 한 번 누르면 최대 5칸만 작업해요. 심기는 칸마다 서버 행동력을 확인하고, 수확은 무료야. 각 칸의 저장은 유지해.</p>'+
  '<div class="mini-card"><strong>🌱 심은 밭 '+planted+'/21 · 빈 밭 '+empty+' · 바로 수확 가능 '+ready.length+'개 이상</strong>'+
  '<p>심기 -2⚡/칸 · 수확 무료 · 심을 때 행동력이 부족하면 자동 중단해요.</p></div>'+
  '<label for="v55SeedSelection">심을 작물</label><select id="v55SeedSelection" style="display:block;width:100%;padding:13px;margin:8px 0 14px;border-radius:12px;background:#fff">'+options+'</select>'+
  '<div class="pill-row"><button class="pill-btn" data-v55-batch="plant">🌱 최대 5칸 심기</button>'+
  '<button class="pill-btn" data-v55-batch="harvest">🧺 익은 작물 최대 5칸 수확</button>'+
  '<button class="pill-btn ghost" id="v55SeedShop">🛒 씨앗 상점</button></div>'+
  '<p class="item-note">이미 심은 작물은 보존하고 빈 자리만 이용해요. 실제 마을 골드·XP와 서버 행동력은 기존대로 적용돼요.</p>');
 els.panelBody.querySelectorAll('[data-v55-batch]').forEach(b=>b.onclick=()=>{
  void runFarmBatchV55(b.dataset.v55Batch,document.getElementById('v55SeedSelection')?.value||'carrot');
 });
 document.getElementById('v55SeedShop').onclick=openFarmShop;
}
function farmAll(){let p=bedCenters.findIndex((_,i)=>state.beds[i].crop&&cropStage(state.beds[i])===3);if(p>=0){moveTo(bedCenters[p].x,bedCenters[p].y+56,{type:'farm',idx:p});toast('🌿 수확할 밭으로 이동해요');return}const v=bedCenters.findIndex((_,i)=>!state.beds[i].crop);if(v>=0){moveTo(bedCenters[v].x,bedCenters[v].y+56,{type:'farm',idx:v});toast('🌱 빈 밭으로 이동해요');return}openFarmShop()}
function openFarmShop(){let cards=Object.entries(crops).map(([k,o])=>`<div class="mini-card"><span class="emoji">${o.icon}</span><strong>${o.name} 씨앗 3개</strong><p>${(o.cost*6).toLocaleString()}G · 재고 ${state.seeds[k]||0}개</p><button data-buyseed="${k}">🪙 ${(o.cost*6).toLocaleString()}G에 구매</button></div>`).join('');openModal(`<span class="titlebadge">SEED MARKET</span><h2>🌱 봄날 씨앗 상점</h2><p>구매한 씨앗을 밭에 직접 심을 수 있어요.</p><div class="card-grid">${cards}</div>`);els.panelBody.querySelectorAll('[data-buyseed]').forEach(btn=>btn.onclick=()=>{const o=crops[btn.dataset.buyseed],cost=o.cost*6;if(state.coins<cost){toast('코인이 부족해요');return}spend(cost,'씨앗 3개');state.seeds[btn.dataset.buyseed]=(state.seeds[btn.dataset.buyseed]||0)+3;hud();save();openFarmShop();toast('🌱 '+o.name+' 씨앗 3개 구매')})}
let arcadeSpinBusyV55=false;
function openVillageArcadeV55(){
 const wallet=arcadeWalletV55(state,nowDay());
 const chances=ARCADE_WHEEL_V55.map(x=>
  '<div class="mini-card" style="flex:1;min-width:110px"><strong>'+x.label+'</strong><p>확률 '+x.odds+' · 배당 '+x.multiplier+'배</p></div>').join('');
 openModal('<span class="titlebadge">🎡 JUNJA VILLAGE ARCADE</span><h2>🎡 마을 행운의 룰렛</h2>'+
 '<p>하루 최대 5번, 직접 버튼을 눌러 게임 골드 100G로 행운을 시험해 봐. 실제 돈을 걸거나 환전하는 게임은 아니야.</p>'+
 '<div class="mini-card"><strong>🪙 게임 골드 '+Math.floor(state.coins).toLocaleString('ko-KR')+'G</strong>'+
 '<p>오늘 남은 도전 '+(ARCADE_MAX_PLAYS_V55-wallet.plays)+'회 · 현재까지 사용 '+wallet.totalSpent.toLocaleString()+'G · 획득 '+wallet.totalPaid.toLocaleString()+'G</p></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap">'+chances+'</div>'+
 '<p class="item-note">결과 확률 공개 · 보상은 게임 경제의 일일 발행 제한에 따라 줄어들 수 있어. 자동 반복·현금 결제·현금화는 지원하지 않아.</p>'+
 '<button class="pill-btn" id="v55ArcadeSpin" '+(wallet.plays>=ARCADE_MAX_PLAYS_V55||state.coins<100?'disabled':'')+'>🎲 100G로 한 번 돌리기</button>'+
 '<button class="pill-btn ghost" id="v55ArcadeReturn">🏡 마을 메뉴로 돌아가기</button>');
 document.getElementById('v55ArcadeReturn').onclick=()=>openVillageMenuV49('home');
 document.getElementById('v55ArcadeSpin').onclick=()=>{
  if(arcadeSpinBusyV55)return;
  arcadeSpinBusyV55=true;
  try{
   // Cryptographically strong RNG, fixed and user-visible odds.
   const result=spinVillageArcadeV55(state,{day:nowDay(),level:lifeLevel(),roll:drawArcadeRandomV55()});
   if(!result.ok){toast(result.error);return}
   save();hud();
   toast('🎡 '+result.label+' · '+(result.net>=0?'+':'')+result.net.toLocaleString('ko-KR')+'G');
  }catch(error){toast('게임장 이용 불가: '+(error?.message||'다시 시도해 줘'))}
  finally{arcadeSpinBusyV55=false;openVillageArcadeV55()}
 };
}
function openEconomyDashboard(){
 const stats=initEconomy(state),ledger=moneyHistory(state),cash=Math.floor(state.coins);
 const major=[['harvest','농사'],['fish','어시장'],['hunt','사냥'],['deliver','납품'],['quest','의뢰'],['festival','축제'],['social','생활 보상']];
 openModal('<span class="titlebadge">JUNJA ECONOMY · '+stats.day+'</span><h2>🏦 모여봐요 반말방숲 경제 수첩</h2>'+
 '<div class="mini-card"><strong>💰 내 자산 · '+cash.toLocaleString('ko-KR')+'G</strong><p>오늘 새로 얻은 돈 '+stats.earned.toLocaleString('ko-KR')+'G · 상점 등에 쓴 돈 '+stats.spent.toLocaleString('ko-KR')+'G</p>'+
 '<p>경제 개편 이후 내 계정 통계: 게임 보상 발행 '+stats.totalMinted.toLocaleString('ko-KR')+'G · 소비·제작 회수 '+stats.totalBurned.toLocaleString('ko-KR')+'G</p></div>'+
 '<p>경제 가치가 유지되도록 하루 동안 활동별 보상이 점차 줄어들 수 있어요. 메인 스토리·영구 업적 보상은 별도예요.</p>'+
 '<h3>📊 오늘의 활동별 수입 기준</h3><div class="card-grid">'+major.map(([id,name])=>{
  const gross=Math.floor(stats.categories[id]||0),cap=economyCeiling(id,lifeLevel());
  return '<div class="mini-card"><strong>'+name+'</strong><p>기준 '+cap.toLocaleString()+'G · 오늘 보상 발생 '+gross.toLocaleString()+'G</p>'+
   '<div class="mini-progress"><i style="width:'+Math.min(100,gross/cap*100)+'%"></i></div>'+
   '<p>'+(gross>=cap?'🔹 추가 보상은 감소해요':'✅ 기본 보상 구간')+'</p></div>';
 }).join('')+'</div>'+
 '<h3>🧾 최근 수입·지출 내역</h3>'+
 (ledger.length?ledger.slice(0,24).map(tx=>'<div class="economy-ledger"><span>'+(tx.type==='earn'?'🟢':'🔴')+' '+tx.reason+'</span><strong>'+(tx.type==='earn'?'+':'−')+tx.value.toLocaleString('ko-KR')+'G</strong></div>').join(''):'<p>경제 개편 후의 거래 내역이 여기 쌓여요.</p>')+
 '<div class="mini-card"><strong>🔐 함께 쓰는 경제의 조건</strong><p>지금은 이 기기의 거래 기록만 볼 수 있어요. 다른 사람과 실제로 거래하는 기능은 서버 인증·위변조 방지·중복 결제 방지가 준비된 뒤 열어야 해요.</p></div>'+
 '<div class="pill-row"><button class="pill-btn" id="economyGoMarket">⚓ 어시장으로</button><button class="pill-btn ghost" id="economyGoBait">🎣 미끼 상점</button></div>');
 document.getElementById('economyGoMarket').onclick=openMarket;
 document.getElementById('economyGoBait').onclick=openBaitShop;
}
function openBaitShop(){
 const baitCount=Object.values(state.baitInventory||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
 openModal('<span class="titlebadge">COASTAL FISHING SUPPLY</span><h2>🪱 부두 미끼 상점</h2>'+
 '<p>미끼는 구매 후 사용할 때마다 한 개씩 소모돼요. 장비를 얻고 돈을 모으는 것뿐 아니라, 어떤 낚시에 투자할지도 선택해 보세요.</p>'+
 '<div class="mini-card"><strong>🎣 보유 미끼 '+baitCount+'개</strong><p>현재 자동 사용: '+(BAITS.find(b=>b.id===state.baitEquipped)?.name||'사용 안 함')+'</p>'+
 '<button data-bait-equip="none">미끼 사용하지 않기</button></div><div class="card-grid">'+BAITS.map(b=>'<div class="mini-card"><strong>'+b.icon+' '+b.name+'</strong>'+
 '<p>'+b.desc+'</p><p>보유: '+Math.floor(state.baitInventory?.[b.id]||0)+'개 · '+b.price.toLocaleString('ko-KR')+'G</p>'+
 '<button data-bait-purchase="'+b.id+'" '+(state.coins<b.price?'disabled':'')+'>10개 구매</button>'+
 '<button data-bait-equip="'+b.id+'" '+(!state.baitInventory?.[b.id]?'disabled':'')+'>'+(state.baitEquipped===b.id?'✅ 장착 중':'다음 낚시부터 사용')+'</button></div>').join('')+'</div>'+
 '<button class="pill-btn ghost" id="baitToMarket">⚓ 어시장 가기</button>');
 els.panelBody.querySelectorAll('[data-bait-purchase]').forEach(btn=>btn.onclick=()=>{
  const b=BAITS.find(b=>b.id===btn.dataset.baitPurchase);if(!b)return;
  const result=buyBait(state,b.id);if(!result.ok){toast(result.error);return}
  save();hud();toast('🪱 '+b.name+' 구매 · 소비 '+b.price+'G');openBaitShop();
 });
 els.panelBody.querySelectorAll('[data-bait-equip]').forEach(btn=>btn.onclick=()=>{
  chooseBait(state,btn.dataset.baitEquip);save();openBaitShop();
 });
 document.getElementById('baitToMarket').onclick=openMarket;
}

const MATERIAL_MARKET=Object.freeze({
 wood:{name:'목재',icon:'🪵',price:12},
 stone:{name:'돌',icon:'🪨',price:14},
 petal:{name:'꽃잎',icon:'🌼',price:10}
});
function openMaterialMarket(){
 const inventory=Object.entries(MATERIAL_MARKET).map(([id,item])=>{
  const held=Math.max(0,Math.floor(Number(state.materials?.[id])||0));
  return '<div class="mini-card"><span class="emoji">'+item.icon+'</span><strong>'+item.name+' · '+held+'개 보유</strong>'+
   '<p>매입가 1개 '+item.price.toLocaleString('ko-KR')+'G · 하루 판매 수입 감소 규칙 적용</p>'+
   '<div class="pill-row"><button type="button" data-material-one="'+id+'" '+(held?'':'disabled')+'>1개 판매</button>'+
   '<button type="button" data-material-all="'+id+'" '+(held?'':'disabled')+'>전체 '+held+'개 판매</button></div></div>';
 }).join('');
 openModal('<span class="titlebadge">FOREST MATERIAL EXCHANGE</span><h2>🌲 채집 재료 판매소</h2>'+
 '<p>가방에 모은 목재·돌·꽃잎을 골드로 바꿀 수 있어요. 제작에 쓸 재료는 남겨두세요.</p>'+
 '<div class="mini-card"><strong>🎒 가방 '+bagUsed(state)+'/'+bagCapacity(state)+'칸 · 빈칸 '+bagFree(state)+'칸</strong></div>'+
 '<div class="card-grid">'+inventory+'</div>'+
 '<div class="pill-row"><button class="pill-btn" id="materialMarketBag">🎒 가방으로 돌아가기</button>'+
 '<button class="pill-btn ghost" id="materialMarketFish">🐟 물고기 판매소</button></div>');
 els.panelBody.querySelectorAll('[data-material-one],[data-material-all]').forEach(btn=>btn.onclick=()=>{
  const id=btn.dataset.materialOne||btn.dataset.materialAll,item=MATERIAL_MARKET[id];
  const held=Math.max(0,Math.floor(Number(state.materials?.[id])||0));
  if(!item||held<1){toast('판매할 채집 재료가 없어요');return}
  const amount=btn.dataset.materialAll?held:1;
  const receipt=credit(state,item.price*amount,'harvest','채집 재료 판매 · '+item.name,lifeLevel());
  if(!receipt.ok){toast(receipt.error||'재료 판매에 실패했어요');return}
  state.materials[id]=held-amount;
  state.economy.trades++;
  save();hud();
  openMaterialMarket();
  toast('💰 '+item.name+' '+amount+'개 판매 · +'+receipt.amount.toLocaleString('ko-KR')+'G'+(receipt.softCapped?' (오늘 수입 감소 적용)':''));
 });
 document.getElementById('materialMarketBag').onclick=openBag;
 document.getElementById('materialMarketFish').onclick=openMarket;
}

function openMarket(){
 const day=marketDay(),species=FISH.filter(f=>state.fishStock?.[f.name]>0);
 const stock=species.reduce((n,f)=>n+state.fishStock[f.name],0);
 const quotes=species.slice().sort((a,b)=>quoteFish(b)-quoteFish(a)).slice(0,24);
 openModal('<span class="titlebadge">HARBOR EXCHANGE · '+day.day+'</span><h2>⚓ '+day.name+'</h2>'+
 '<p>물고기를 잡으면 바로 돈이 생기지 않고 <b>판매용 가방</b>에 보관돼요. 매일 어종별 매입 시세가 변해서 언제 어떤 물고기를 팔지 선택할 수 있어요.</p>'+
 '<div class="mini-card"><strong>🎒 판매 가능한 물고기 '+stock+'마리 · 가방 '+bagUsed(state)+'/'+bagCapacity(state)+'칸</strong><p>누적 포획 '+state.fish+'마리 · 발견 도감 '+new Set(state.collection).size+'/'+FISH.length+'종</p>'+
 '<p>🎣 수산시장 오늘의 특별 시세 · 물고기별로 조금씩 변동 · 마을 돈은 판매할 때 지급</p></div>'+
 '<h3>💰 물고기 개별 판매</h3>'+
 (quotes.length?'<div class="card-grid">'+quotes.map(f=>'<div class="mini-card"><div style="text-align:center">'+fishArt(f.name,125)+'</div>'+
 '<strong>'+f.rarity+' · '+f.name+'</strong><p>보유 '+state.fishStock[f.name]+'마리 · 오늘 매입가 '+quoteFish(f).toLocaleString('ko-KR')+'G</p>'+
 '<button data-sell-fish="'+f.name+'">1마리 판매</button></div>').join('')+'</div>':
 '<div class="mini-card"><strong>🎣 아직 판매할 물고기가 없어요</strong><p>이번 경제 업데이트 이후 낚은 물고기부터 판매 가방에 쌓여요. 예전에 잡은 물고기는 이미 보상을 받았으므로 중복 지급되지 않아요.</p></div>')+
 '<div class="pill-row"><button class="pill-btn" id="marketMaterials">🌲 목재·돌·꽃잎 판매</button><button class="pill-btn" id="marketEconomy">🏦 경제 수첩</button>'+
 '<button class="pill-btn ghost" id="marketBait">🪱 미끼 상점</button><button class="pill-btn ghost" id="marketBag">🐠 어항 도감</button><button class="pill-btn ghost" id="marketStorage">🎒 가방 확장</button></div>');
 els.panelBody.querySelectorAll('[data-sell-fish]').forEach(btn=>btn.onclick=()=>{
  const fish=FISH_BY_NAME[btn.dataset.sellFish];if(!fish)return;
  const result=sellFish(state,fish,new Date(),lifeLevel());
  if(!result.ok){toast(result.error||'거래 실패');return}
  save();hud();
  toast('💰 '+fish.name+' 매입 완료 · +'+result.amount.toLocaleString('ko-KR')+'G'+(result.softCapped?' · 오늘 보상 감소 적용':''));
  openMarket();
 });
 document.getElementById('marketMaterials').onclick=openMaterialMarket;
 document.getElementById('marketEconomy').onclick=openEconomyDashboard;
 document.getElementById('marketBait').onclick=openBaitShop;
 document.getElementById('marketBag').onclick=openAquarium;
 document.getElementById('marketStorage').onclick=openBag;
}
function openNpc(npc){
 state.friends[npc.name]=Number(state.friends[npc.name])||0;
 state.talkDays=state.talkDays||{};
 state.friendBondDay=state.friendBondDay||{};
 state.friendGiftDay=state.friendGiftDay||{};
 state.npcRequests=state.npcRequests||{};
 state.npcMementos=Array.isArray(state.npcMementos)?state.npcMementos:[];
 if(state.talkDays[npc.name]!==nowDay()){
  state.talkDays[npc.name]=nowDay();state.dailyTalk++;addXp(3);
 }
 const today=nowDay(),heart=state.friends[npc.name],talked=state.friendBondDay[npc.name]===today,gifted=state.friendGiftDay[npc.name]===today;
 const request={리나:{label:'작은 제작품 1개',metric:'dailyCraft',goal:1,icon:'🧵'},토비:{label:'물고기 2마리',metric:'dailyFish',goal:2,icon:'🎣'},유니:{label:'작물 2회 수확',metric:'dailyHarvest',goal:2,icon:'🌷'}}[npc.name]||{label:'작물 2회 수확',metric:'dailyHarvest',goal:2,icon:'🌱'};
 const progress=Math.min(request.goal,state[request.metric]||0),claimed=state.npcRequests[npc.name]===today;
 const tiers=[{id:'1',love:6,reward:900,name:'인연의 리본',item:'fashion_accessory_02'},
  {id:'2',love:16,reward:2200,name:'소중한 단짝',item:'fashion_accessory_08'},
  {id:'3',love:36,reward:6500,name:'영원한 친구',item:'fashion_accessory_13'}];
 const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
 completeDaily();
 openModal('<span class="titlebadge">VILLAGER FRIENDSHIP · '+esc(npc.name)+'</span><h2>💗 '+esc(npc.name)+'와의 우정</h2>'+
  '<p>'+esc(npc.text)+'</p><p>🌤️ '+esc(npcDailyLine(npc.name))+'</p><div class="mini-card"><strong>친밀도 '+heart+' · '+ '💗'.repeat(Math.min(5,Math.floor(heart/7)+1))+
  '</strong><p>하루 한 번 대화하고 선물을 건네면서 진짜 친구가 돼보세요. 매일 부탁도 달라져요.</p>'+
  '<div class="pill-row"><button class="pill-btn" id="friendTalk" '+(talked?'disabled':'')+'>💬 '+(talked?'오늘 인사 완료':'오늘의 이야기')+'</button>'+
  '<button class="pill-btn alt" id="friendGift" '+(gifted?'disabled':'')+'>🎁 '+(gifted?'오늘 선물 완료':'꽃 선물 180G')+'</button></div></div>'+
  '<div class="mini-card"><strong>'+request.icon+' '+esc(npc.name)+'의 오늘 부탁</strong><p>'+request.label+' · '+progress+'/'+request.goal+'</p>'+
  '<button id="npcCommission" '+(claimed||progress<request.goal?'disabled':'')+'>'+(claimed?'✅ 수령 완료':progress>=request.goal?'보상 받기 · 650G + 친밀도 2':'부탁 진행 중')+'</button></div>'+
  '<h3>💝 우정의 기념 선물</h3><div class="card-grid">'+tiers.map(t=>{
   const key=npc.name+'-'+t.id,done=state.npcMementos.includes(key);
   return '<div class="mini-card"><strong>'+t.name+'</strong><p>친밀도 '+t.love+' 이상 · '+t.reward.toLocaleString('ko-KR')+'G · 특별 장신구</p>'+
    '<button data-npctier="'+t.id+'" '+(done||heart<t.love?'disabled':'')+'>'+(done?'✅ 이미 받은 선물':'기념 선물 받기')+'</button></div>';
  }).join('')+'</div>');
 document.getElementById('friendTalk').onclick=()=>{
  if(state.friendBondDay[npc.name]===nowDay())return;
  state.friendBondDay[npc.name]=nowDay();state.friends[npc.name]++;
  toast('💞 '+npc.name+'와 새로운 추억을 만들었어요');save();openNpc(npc);
 };
 document.getElementById('friendGift').onclick=()=>{
  if(state.friendGiftDay[npc.name]===nowDay()||state.coins<180){toast('선물에 180G가 필요하거나 오늘 이미 건넸어요');return}
  state.friendGiftDay[npc.name]=nowDay();spend(180,'주민 꽃 선물');state.friends[npc.name]+=2;
  hud();party(npc.x,npc.y-80,12);toast('💝 '+npc.name+'가 정말 기뻐해요!');save();openNpc(npc);
 };
 document.getElementById('npcCommission').onclick=()=>{
  if(state.npcRequests[npc.name]===nowDay()||(state[request.metric]||0)<request.goal)return;
  state.npcRequests[npc.name]=nowDay();state.friends[npc.name]+=2;const earned=earn(650,'social','주민의 오늘 부탁');addXp(40);
  save();hud();toast('💌 주민 부탁 완료! +'+earned+'G · 친밀도 +2');openNpc(npc);
 };
 els.panelBody.querySelectorAll('[data-npctier]').forEach(btn=>btn.onclick=()=>{
  const t=tiers.find(x=>x.id===btn.dataset.npctier);
  if(!t||state.friends[npc.name]<t.love)return;
  const key=npc.name+'-'+t.id;if(state.npcMementos.includes(key))return;
  state.npcMementos.push(key);earn(t.reward,'friendship','주민 친밀도 단계');
  if(CATALOG_BY_ID[t.item]&&!state.fashion.owned.includes(t.item))state.fashion.owned.push(t.item);
  save();hud();toast('💗 '+npc.name+'의 우정 선물 '+t.name+' 획득!');openNpc(npc);
 });
}
function openDecor(){const cards=decorCatalog.slice().sort((a,b)=>(state.crafted[b.id]||0)-(state.crafted[a.id]||0)).map(o=>`<div class="mini-card"><span class="emoji">${o.emoji}</span><strong>${o.label}</strong><p>${state.crafted[o.id]>0?'제작품 '+state.crafted[o.id]+'개 · 무료 배치':'🪙 '+(o.cost*5).toLocaleString()+'G · 구매 배치'}</p><button data-decor="${o.id}">배치하기</button></div>`).join('');openModal(`<span class="titlebadge">GARDEN ATELIER</span><h2>🌷 제작물 배치 · 마을 꾸미기</h2><p>① 보유한 제작물 선택 → ② 이 창을 닫고 마을의 빈 바닥 터치 → ③ 설치 완료! 구매한 장식도 같은 방법으로 배치해.</p><p style="font-weight:800;color:#38674d">📦 보유 제작물: ${decorCatalog.filter(v=>(state.crafted[v.id]||0)>0).map(v=>v.emoji+' '+v.label+' '+state.crafted[v.id]+'개').join(' · ')||'없음 · 나무결 공방에서 먼저 만들 수 있어'}</p><div class="card-grid">${cards}</div><div class="pill-row"><button class="pill-btn ghost" id="removeDecoration">📦 설치된 장식 회수</button><button class="pill-btn ghost" id="craftFromDecor">🪵 제작소로 이동</button><button class="pill-btn ghost" id="openHomeLink">🏠 내 집 꾸미기</button></div>`);els.panelBody.querySelectorAll('[data-decor]').forEach(btn=>btn.onclick=()=>{placeDecor=btn.dataset.decor;closeModal();toast('👆 비어 있는 바닥을 터치해 배치해요!');els.hint.textContent='🌷 배치 모드: 마을 빈 바닥 터치 · 취소: 아래 배치 취소 버튼';showDecorationPlacement()});document.getElementById('removeDecoration').onclick=()=>{placeDecor='remove';closeModal();showDecorationPlacement();els.hint.textContent='📦 회수 모드: 설치한 장식 터치 · 취소: 아래 배치 취소 버튼';toast('원래 설치한 장식을 터치하면 회수해요!')};document.getElementById('craftFromDecor').onclick=()=>goStation('workshop');document.getElementById('openHomeLink').onclick=openHome}
function placeAt(x,y){if(placeDecor==='remove'){const i=state.decorations.findIndex(o=>Math.hypot(o.x-x,o.y-y)<70);if(i<0){toast('회수할 장식을 터치해주세요');return}let old=state.decorations.splice(i,1)[0],v=decorCatalog.find(a=>a.id===old.id);earn(Math.floor((v?.cost||0)*.4),'other','장식 회수 환불');placeDecor=null;decorationCancelButton.style.display='none';els.hint.classList.add('hidden');toast('📦 장식 회수 완료 · 일부 코인 환급');hud();save();return}
 const o=decorCatalog.find(v=>v.id===placeDecor);if(!o)return; if(!walkable(x,y)||Math.hypot(player.x-x,player.y-y)<40||[...props,...expansionProps].some(p=>Math.hypot(p.x-x,p.y-y)<185)||state.decorations.some(p=>Math.hypot(p.x-x,p.y-y)<48)){toast('여기에는 배치할 수 없어요');return}if(!(state.crafted[o.id]>0)&&state.coins<o.cost*5){toast('코인이 부족해요');cancelDecorationPlacement();return}if(state.crafted[o.id]>0)state.crafted[o.id]--;else spend(o.cost*5,'마을 장식 배치');state.decorations.push({id:o.id,x:Math.round(x),y:Math.round(y)});placeDecor=null;decorationCancelButton.style.display='none';els.hint.classList.add('hidden');hud();save();party(x,y-10,22);checkAchievements();toast('🏡 '+o.label+' 설치 완료!')}
function openHomeStudioV48(){
 openModal('<span class="titlebadge">나만의 주택 인테리어</span><div id="homeStudioHostV48"></div>');
 homeStudioV48=mountHomeStudioV48(document.getElementById('homeStudioHostV48'),{
  getHome:()=>state.home,getCoins:()=>state.coins,
  onBuy:change=>{
   if(!spend(change.cost,'v48 '+change.label+' 집 가구 구매'))return false;
   state.home=change.next;save();hud();return true;
  },
  onArrange:next=>{state.home=next;save();return true},
  back:openHome
 });
}
function openHome(){
 const opts=[['cream','크림 벽지','🤍'],['blue','바다빛 벽지','🌊'],['pink','봄꽃 벽지','🌷'],['gold','로열 벽지','👑']];
 const wallColor={cream:'#f8edd5',blue:'#c5e5ee',pink:'#f6d7e1',gold:'#e2c486'}[state.home.wall]||'#f8edd5';
 const tier=HOME_LEVELS.find(h=>h.level===state.home.level)||HOME_LEVELS[0];
 const next=HOME_LEVELS.find(h=>h.level===state.home.level+1);
 const dailyReward=80+state.home.level*70;
 const eligible=!next||lifeLevel()>=next.minLevel;
 const available=state.home.lastCare!==nowDay();
 openModal(`<span class="titlebadge">MY HOME · LEVEL ${state.home.level}</span>
  <h2>🏠 ${tier.name}</h2>
  <p>Lv.${lifeLevel()} · 현재 ${tier.rooms}개 공간 사용 · 집을 성장시켜 더 넓은 공간을 꾸며요.</p>
  <div class="home-interior" style="background:${wallColor}">
   ${(state.home.furniture||[]).map(id=>({sofa:'🛋️',table:'🪑',lamp:'🪔',plant:'🪴',cat:'🐈',piano:'🎹'}[id]||'🌷')).join('')}
  </div>
  <div class="mini-card"><strong>🌼 오늘의 집 돌보기</strong>
   <p>집을 꾸준히 관리하면 하루 한 번 ${dailyReward}G를 받아요.</p>
   <button id="homeCare" ${available?'':'disabled'}>${available?'집 돌보고 '+dailyReward+'G 받기':'오늘 보상 수령 완료'}</button>
  </div>
  ${next?`<div class="mini-card"><strong>🔨 다음 단계 · ${next.name}</strong>
  <p>Lv.${next.minLevel} 필요 · 건축 비용 ${(next.price*5).toLocaleString()}G · ${next.rooms}개 공간</p>
  <button id="upgradeHome" ${!eligible?'disabled':''}>${!eligible?'레벨을 더 올려야 해요':'집 업그레이드'}</button></div>`:
  '<div class="mini-card"><strong>👑 최고 단계 주택 완성</strong><p>앞으로 가구와 어항을 더 꾸며봐요.</p></div>'}
  <button class="pill-btn" id="openStudioV48">🏡 3D 인테리어 꾸미기</button><h3>🎨 벽지 선택</h3><div class="pill-row">
   ${opts.map(([k,label,emoji])=>`<button class="pill-btn ${state.home.wall===k?'':'ghost'}" data-wall="${k}">${emoji} ${label}</button>`).join('')}
  </div>
  <h3>🪑 가구 구매</h3><div class="pill-row">
   ${[['table','식탁','🪑',150],['lamp','조명','🪔',240],['plant','화분','🪴',120],
   ['cat','고양이 인형','🐈',380],['piano','피아노','🎹',850]]
   .map(([id,label,emoji,price])=>`<button class="pill-btn alt" data-furn="${id}">${emoji} ${label} ${price*6}G</button>`).join('')}
  </div>
  <button class="pill-btn ghost" id="homeAquarium">🐠 나만의 어항 구경하기</button>`);
 document.getElementById('homeCare').onclick=()=>{
  if(state.home.lastCare===nowDay())return;
  state.home.lastCare=nowDay();const earned=earn(dailyReward,'social','집 돌보기');state.xp+=12;save();hud();
  toast('🌼 집 돌보기 완료! +'+earned+'G');openHome();
 };
 if(next)document.getElementById('upgradeHome').onclick=()=>{
  if(lifeLevel()<next.minLevel||state.home.level+1!==next.level)return;
  if(state.coins<next.price*5){toast('집 업그레이드 코인이 부족해요');return}
  spend(next.price*5,'집 증축');state.home.level=next.level;state.xp+=80;
  save();hud();toast('🏠 새 집 완성 · '+next.name);openHome();
 };
 els.panelBody.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{state.home.wall=b.dataset.wall;save();openHome()});
 els.panelBody.querySelectorAll('[data-furn]').forEach(b=>b.onclick=()=>{
  const item=b.dataset.furn,price=Number(b.textContent.match(/(\d+)G/)?.[1]||0);
  if(state.home.furniture.includes(item)){toast('이미 가지고 있는 가구예요');return}
  if(state.coins<price){toast('코인이 부족해요');return}
  if(state.home.furniture.length>=tier.rooms*3+2){toast('집을 넓히면 더 많은 가구를 놓을 수 있어요');return}
  spend(price,'집 가구 구매');state.home.furniture.push(item);hud();save();openHome();
 });
 document.getElementById('openStudioV48').onclick=openHomeStudioV48;
 document.getElementById('homeAquarium').onclick=openAquarium;
}
function openCraft(){
 if(distance(player,stations.find(s=>s.id==='workshop'))>155){goStation('workshop');return}
 openModal(`<span class="titlebadge">WOODLAND WORKSHOP</span><h2>나무결 공방</h2><p>숲과 광산에서 모은 재료로 만들어보세요.</p><div class="pill-row">${Object.entries(state.materials).map(([k,v])=>`<span class="titlebadge">${materialNames[k]} ${v}</span>`).join('')}</div><div class="card-grid">${recipes.map(r=>`<div class="mini-card"><span class="emoji">${r.icon}</span><strong>${r.name}</strong><p>${r.desc}</p><p>${Object.entries(r.needs).map(([k,v])=>materialNames[k]+' '+state.materials[k]+'/'+v).join(' · ')}</p><button data-recipe="${r.id}" ${(!r.outfit||!owned.includes(r.outfit))&&Object.entries(r.needs).every(([k,v])=>state.materials[k]>=v)?'':'disabled'}>${r.outfit&&owned.includes(r.outfit)?'제작 완료 · 옷장 보유':'제작 · 경험치 '+r.xp}</button></div>`).join('')}</div><div class="pill-row"><button class="pill-btn" id="craftPlaceDecor">🌷 제작물 배치하기 · 보유 ${decorCatalog.reduce((n,d)=>n+(state.crafted[d.id]||0),0)}개</button><button class="pill-btn ghost" id="craftMap">재료 채집하러 가기</button></div>`);
 els.panelBody.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=async()=>{const r=recipes.find(r=>r.id===b.dataset.recipe);if(!r||(r.outfit&&owned.includes(r.outfit))||!Object.entries(r.needs).every(([k,v])=>state.materials[k]>=v))return;
  if(!await useWorldEnergy('craft'))return;
  for(const [k,v] of Object.entries(r.needs))state.materials[k]-=v;if(r.outfit){owned.push(r.outfit)}else state.crafted[r.id]=(state.crafted[r.id]||0)+1;state.craftCount++;state.dailyCraft++;state.xp+=r.xp;completeDaily();save();hud();updateJourney(true);toast(r.name+' 제작 완료!');openCraft()});document.getElementById('craftPlaceDecor').onclick=openDecor;document.getElementById('craftMap').onclick=openWorldMap;
}
function openSaveVault(){
 const backupKey='junja-village-snapshots-v27-'+accountScope;
 let snaps=[];
 try{const raw=JSON.parse(localStorage.getItem(backupKey)||'[]');snaps=Array.isArray(raw)?raw:[]}catch{}
 const nickname=(()=>{try{return localStorage.getItem('junja-village-nickname')||''}catch{return ''}})();
 openModal('<span class="titlebadge">VILLAGE DATA VAULT</span><h2>🗂️ 나의 마을 저장 보관함</h2>'+
  '<p>계정 진행 기록은 서버 저장 완료 표시를 확인하세요. 추가 보관용으로 현재 기록을 파일로 내보낼 수 있어요.</p>'+
  '<div class="mini-card"><strong>📥 직접 백업</strong><p>돈, 의상, 집, 레벨, 사냥 전리품, 도감, 월간 기록을 한 개의 파일로 저장해요.</p>'+
  '<button id="vaultExport">내 게임 데이터 백업 파일 받기</button></div>'+
  '<div class="mini-card"><strong>📤 백업 복원</strong><p>내가 직접 저장한 모여봐요 반말방숲 JSON 파일을 불러옵니다. 현재 기록을 덮어쓰니 먼저 백업하세요.</p>'+
  '<input '+(accountScope?'disabled ':'')+'id="vaultImport" type="file" accept=".json,application/json" aria-label="모여봐요 반말방숲 백업 불러오기" /></div>'+
  '<div class="mini-card"><strong>🕰 최근 자동 저장 기록</strong><p>이 기기 내에서만 보관 · 최대 7일</p>'+
  (snaps.length?snaps.slice().reverse().map(shot=>'<p>🗓 '+shot.day+'</p>').join(''):'<p>아직 이전 날짜의 기록이 없어요.</p>')+
  '<button id="vaultRestore" '+(accountScope||snaps.length<2?'disabled':'')+'>이전 날짜 복원하기</button></div>'+
  '<p class="item-note">백업 파일은 보관용 사본입니다. 계정 기록을 복구할 때는 운영자에게 문의하세요.</p>');
 document.getElementById('vaultExport').onclick=()=>{
  save();
  const data={format:'junja-village-backup',version:1,createdAt:new Date().toISOString(),nickname,owned:[...owned],state:{...state}};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='junja-village-'+nowDay()+'-backup.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast('✅ 백업 파일을 저장했어요');
 };
 function restore(data){
  if(accountScope){toast('계정 기록 복구는 운영자에게 문의해 주세요. 서버 기록을 보호하기 위해 파일 덮어쓰기를 중지했어요.');return}
  if(data?.format!=='junja-village-backup'||data.version!==1||!data.state||typeof data.state!=='object')throw Error('모여봐요 반말방숲 백업 파일이 아니에요');
  if(!Number.isFinite(data.state.coins)||data.state.coins<0||!Number.isFinite(data.state.xp)||data.state.xp<0)throw Error('저장된 레벨 또는 금액이 올바르지 않아요');
  if(!Array.isArray(data.state.collection)||data.state.collection.length>200000)throw Error('물고기 도감 데이터가 손상됐어요');
  if(!confirm('현재 이 브라우저의 게임 진행 기록을 백업 파일로 교체할까요?'))return;
  localStorage.setItem('junja-harbor-v1',JSON.stringify(data.state));
  if(Array.isArray(data.owned))localStorage.setItem('junja-harbor-owned',JSON.stringify(data.owned.filter(x=>typeof x==='string').slice(0,200)));
  if(typeof data.nickname==='string'&&data.nickname.trim())localStorage.setItem('junja-village-nickname',data.nickname.slice(0,12));
  location.reload();
 }
 document.getElementById('vaultImport').onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>4*1024*1024){toast('파일은 4MB 이하여야 해요');return}
  try{restore(JSON.parse(await f.text()))}catch(err){toast('⚠️ '+String(err.message||err).slice(0,100))}
 };
 document.getElementById('vaultRestore').onclick=()=>{
  const previous=snaps.at(-2);if(!previous?.save)return;
  let backup;try{backup=JSON.parse(previous.save)}catch{return}
  try{restore({format:'junja-village-backup',version:1,nickname,owned:previous.owned||[],state:backup})}catch(err){toast('⚠️ '+err.message)}
 };
}
const REPUTATION_REWARDS=[
 {stars:2,score:120,coins:1000},
 {stars:3,score:300,coins:3000},
 {stars:4,score:540,coins:8000},
 {stars:5,score:840,coins:20000}
];
function villageReputation(){
 const fishUnique=new Set(state.collection).size;
 const neighbors=Object.values(state.friends||{}).reduce((a,n)=>a+(Number(n)||0),0)+Object.values(state.animalBonds||{}).reduce((a,o)=>a+(Number(o?.love)||0),0);
 const score=Math.round(
  Math.min(170,fishUnique*6)+Math.min(180,state.chapter*5)+
  Math.min(170,state.decorations.length*12)+Math.min(120,neighbors*3)+
  Math.min(160,(state.hunt?.kills||0)*2)+Math.min(90,state.home.level*23)+
  Math.min(100,(state.attendance?.total||0)*3));
 const stars=1+REPUTATION_REWARDS.filter(r=>score>=r.score).length;
 return {score,stars,fishUnique,neighbors};
}
function openReputation(){
 const rank=villageReputation();
 state.reputationRewards=Array.isArray(state.reputationRewards)?state.reputationRewards:[];
 openModal('<span class="titlebadge">JUNJA VILLAGE REPUTATION</span><h2>⭐ 마을 평판</h2>'+
 '<div class="mini-card"><strong>'+ '⭐'.repeat(rank.stars)+ ' · '+rank.score+'점</strong>'+
 '<p>도감 '+rank.fishUnique+'종 · 메인 '+Math.min(state.chapter,50)+'/50장 · 장식 '+state.decorations.length+'개 · 주민 우정 '+rank.neighbors+' · 사냥 '+(state.hunt?.kills||0)+'회</p>'+
 '<p>작은 마을을 꾸미고 주민들과 친해지면 평판이 올라가요. 장기간 축적되는 영구 기록이에요.</p></div>'+
 '<div class="card-grid">'+REPUTATION_REWARDS.map(r=>{
  const completed=state.reputationRewards.includes(r.stars),locked=rank.stars<r.stars;
  return '<div class="mini-card"><strong>'+ '⭐'.repeat(r.stars) +' 등급 · '+r.score+'점</strong>'+
   '<p>완성 보상 '+r.coins.toLocaleString('ko-KR')+'G'+(r.stars===5?' + 특별 왕실 장신구':'')+'</p>'+
   '<button data-rank="'+r.stars+'" '+(locked||completed?'disabled':'')+'>'+(completed?'✅ 수령 완료':locked?'평판 성장 중':'보상 수령')+'</button></div>';
 }).join('')+'</div><div class="pill-row"><button id="rankJourney" class="pill-btn">📖 메인 생활 목표</button><button id="rankMonthly" class="pill-btn ghost">📅 이번 달 도전</button></div>');
 els.panelBody.querySelectorAll('[data-rank]').forEach(btn=>btn.onclick=()=>{
  const r=REPUTATION_REWARDS.find(r=>r.stars===Number(btn.dataset.rank));
  if(!r||villageReputation().stars<r.stars||state.reputationRewards.includes(r.stars))return;
  state.reputationRewards.push(r.stars);earn(r.coins,'reputation','마을 평판 달성');
  if(r.stars===5&&CATALOG_BY_ID['fashion_accessory_20']&&!state.fashion.owned.includes('fashion_accessory_20'))state.fashion.owned.push('fashion_accessory_20');
  save();hud();toast('⭐ 마을 평판 '+r.stars+'성 보상!');openReputation();
 });
 document.getElementById('rankJourney').onclick=openJourney;
 document.getElementById('rankMonthly').onclick=openLivingCalendar;
}
function openJournal(){const tasks=dailyTask();const a=achievements.map(b=>`<p>${state.achieved.includes(b.id)?'✅':'▫️'} ${b.title} · ${b.bonus}G</p>`).join('');openModal(`<span class="titlebadge">JUNJA LIFE</span><h2>📖 마을 생활 수첩</h2><h3>오늘의 의뢰</h3>${tasks.map(o=>`<p>${o.done>=o.target?'✅':'▫️'} ${o.title} (${o.done}/${o.target})</p><div class="mini-progress"><i style="width:${o.done/o.target*100}%"></i></div>`).join('')}<p>${state.dailyReward?'✨ 오늘의 보상 수령 완료':'🎁 모두 완료하면 550G + 경험치 150'}</p><div id="v51QuestHost" role="region" aria-label="v51 서버 신규 콘텐츠 의뢰"></div><h3>🏅 업적</h3>${a}<div class="pill-row"><button class="pill-btn" id="journalGear">🎣 장비 성장</button><button class="pill-btn" id="journalAquarium">🐠 어항 도감</button><button class="pill-btn" id="journalHome">🏠 집 성장</button><button class="pill-btn" id="journalVault">🗂️ 저장 백업</button><button class="pill-btn" id="journalCalendar">📅 월간 목표</button><button class="pill-btn" id="journalReputation">⭐ 마을 평판</button><button class="pill-btn" id="journalEconomy">🏦 내 경제 수첩</button></div><p class="item-note">캐릭터 저장은 Cloudflare 계정 서버에서 확인하며, 신규 콘텐츠 의뢰 보상은 분리된 시험 경제 골드예요.</p>`);
 document.getElementById('journalGear').onclick=openFishingGear;
 document.getElementById('journalAquarium').onclick=openAquarium;
 document.getElementById('journalHome').onclick=openHome;
 document.getElementById('journalVault').onclick=openSaveVault;
 document.getElementById('journalCalendar').onclick=openLivingCalendar;
 document.getElementById('journalReputation').onclick=openReputation;
 document.getElementById('journalEconomy').onclick=openEconomyDashboard;
 mountQuestsV51(document.getElementById('v51QuestHost'),{
  career:()=>openV49Component('life','v49Profession','직업과 계약',openProfessionCenter),
  market:()=>openV49Component('production','v49Trade','주민 거래소',openPlayerMarket),
  business:()=>openV49Component('production','v49Business','나의 사업장',openBusinessCenter)
 });
}
function interaction(kind){if(kind==='seeds'){openFarmShop();return}if(kind.startsWith('farm:')){farmAt(Number(kind.split(':')[1]));return}if(kind==='shop'){openShop();return}if(kind==='fish'){beginFishing();return}if(kind==='market'){openMarket();return}if(kind==='fountain'){party(player.x,player.y-50,20);if(!state.fountainDate||state.fountainDate!==nowDay()){earn(35,'social','분수 소원');state.fountainDate=nowDay();toast('⛲ 오늘의 소원! +35G')}else toast('⛲ 반짝이는 행운의 분수');hud();save();return}if(kind==='home'){openHome();return}if(kind==='harvest'){farmAll();return}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function handleTap(sx,sy){
 const {x,y}=screenWorld(sx,sy);if(placeDecor){placeAt(x,y);return}
 const hit=world3D?.pick(sx,sy);
 if(hit){
  if(hit.type==='gather'){const n=resourceNodes.find(n=>n.id===hit.id);if(distance(player,n)<100)gather(n.id);else moveTo(n.x,n.y+48,{type:'gather',id:n.id});return}
  if(hit.type==='farm'){const b=bedCenters[hit.idx];if(distance(player,b)<130)farmAt(hit.idx);else moveTo(b.x,b.y+45,{type:'farm',idx:hit.idx});return}
  if(hit.type==='npc'){const n=npcs[hit.index];if(distance(player,n)<115)openNpc(n);else moveTo(n.x-55,n.y+35,{type:'npc',npc:n});return}
  if(hit.type==='animal'){const a=animalFriends.find(n=>n.id===hit.id);if(distance(player,a)<132)openAnimal(a);else moveTo(a.x,a.y+45,{type:'animal',animalId:a.id});return}
  if(hit.type==='station'){if(hit.id==='shop'){if(distance(player,{x:610,y:608})<140)openShop();else moveTo(610,608,{type:'action',kind:'shop'});return}if(hit.id==='seeds'){if(distance(player,{x:1490,y:1020})<150)openFarmShop();else moveTo(1490,1020,{type:'action',kind:'seeds'});return}goStation(hit.id);return}
  if(hit.type==='action'){if(distance(player,{x:1100,y:815})<100)interaction(hit.kind);else moveTo(1100,815,{type:'action',kind:hit.kind});return}
 }
 moveTo(x,y);
}
let pointer=null;
function screenWorld(x,y){return world3D?world3D.screenToWorld(x,y):{x:(x-CW/2)/scale+camera.x,y:(y-CH/2)/scale+camera.y}}
cv.addEventListener('pointerdown',e=>{if(pointer||e.button!==0||els.modal.classList.contains('open'))return;e.preventDefault();cv.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false,stamp:0};},{passive:false});
cv.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;
 e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;
 if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>9)pointer.drag=true;
 if(!pointer.drag)return;
 // Replan only on a real finger movement. Reprojecting a stationary finger
 // each frame against the following camera makes the destination slide away.
 const now=performance.now();
 if(now-pointer.stamp<125)return;
 const target=screenWorld(pointer.x,pointer.y);
 if(pointer.lastTarget&&Math.hypot(pointer.lastTarget.x-target.x,pointer.lastTarget.y-target.y)<22)return;
 pointer.stamp=now;pointer.lastTarget=target;pointer.projectedScreen={x:pointer.x,y:pointer.y};
 moveTo(target.x,target.y,null,true);
},{passive:false});
cv.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);
 if(p.drag){const sameFingerPosition=p.projectedScreen&&Math.hypot(p.projectedScreen.x-e.clientX,p.projectedScreen.y-e.clientY)<4;const w=sameFingerPosition?p.lastTarget:screenWorld(e.clientX,e.clientY);if(!p.lastTarget||Math.hypot(p.lastTarget.x-w.x,p.lastTarget.y-w.y)>2)moveTo(w.x,w.y,null,true)}else handleTap(e.clientX,e.clientY);
});
cv.addEventListener('pointercancel',()=>{pointer=null;stopWalking()});
let keys={};const movementKeys=['w','a','s','d','W','A','S','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||els.modal.classList.contains('open')){if(e.key==='Escape')closeModal();return}if(movementKeys.includes(e.key)){e.preventDefault();keys[e.key]=true}if(e.key==='Escape'){stopWalking();placeDecor=null;if(fishPhase!=='idle')fishFailure('낚시 취소')}});
window.addEventListener('keyup',e=>{delete keys[e.key]});
window.addEventListener('blur',()=>{keys={};pointer=null;stopWalking()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys={};pointer=null;stopWalking();save()}last=performance.now()});
function update(dt){t+=dt;updateAmbient(dt);for(const o of Object.values(peers)){let k=1-Math.exp(-dt*9);o.x+=(o.targetX-o.x)*k;o.y+=(o.targetY-o.y)*k}if(Math.floor(t)%4===0&&Math.floor(t)!==lastClock){lastClock=Math.floor(t);const clock=document.getElementById('worldClock');const hour=new Date().getHours();clock.textContent=seasonLabels[state.season]+' · '+(hour<11?'산뜻한 아침':hour<17?'따스한 낮':'노을빛 저녁')+' · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});} if(fishPhase==='wait'&&performance.now()>castUntil){
  const baitUsed=useBait(state);
  hookedFish=FISH[fishRoll(adjustCatchRoll(Math.random(),baitUsed),state.fishingGear.equipped,lifeLevel())];
  reelProfile=reelChallenge(hookedFish,state.fishingGear.equipped);
  fishPhase='bite';
  castUntil=performance.now()+Math.max(1300,2100-hookedFish.size*175)+rodById(state.fishingGear.equipped).window*3200;
  els.fishTitle.textContent=hookedFish.size>=1.8?'❗ 엄청난 대어가 걸렸어요!':'❗ 물고기가 입질했어요!';
  els.fishDesc.textContent=(fishTierText[hookedFish.tier]||'일반')+' 등급 · 챔질을 서두르세요!';
  els.fishAction.textContent='🐟 지금 챔질하기!';els.gauge.style.display='none';party(1558,1353,10);
 }
 if(fishPhase==='bite'&&performance.now()>castUntil){fishFailure('챔질이 늦어서 놓쳤어요!')}
 if(fishPhase==='reel'){
  if(performance.now()>reelDeadline){fishFailure('제한시간 초과! 큰 물고기가 달아났어요')}
  else {
   gaugePos+=dt*gaugeDir*(reelProfile?.speed||1.36);
   if(gaugePos>1){gaugePos=2-gaugePos;gaugeDir=-1}
   if(gaugePos<0){gaugePos=-gaugePos;gaugeDir=1}
   els.needle.style.left=`calc(${gaugePos*100}% - 2px)`;
   if(Math.floor(performance.now()/500)!==Math.floor((performance.now()-dt*1000)/500))fishingProgress();
  }
 }
  if(els.modal.classList.contains('open')){player.vx=player.vy=0;return}
  // Pointer paths are updated from pointermove events, not a drifting frame loop.
  const kvx=Number(!!(keys.ArrowRight||keys.d||keys.D))-Number(!!(keys.ArrowLeft||keys.a||keys.A)),kvy=Number(!!(keys.ArrowDown||keys.s||keys.S))-Number(!!(keys.ArrowUp||keys.w||keys.W));
  if(kvx||kvy){if(fishPhase!=='idle')fishFailure('이동하여 낚시를 마쳤어요');stopWalking();const len=Math.hypot(kvx,kvy),target={x:player.x+kvx/len*VILLAGE_WALK_SPEED*dt,y:player.y+kvy/len*VILLAGE_WALK_SPEED*dt};if(navigation.clear(player,target)){const moved=navigation.advance(player,[target],dt,VILLAGE_WALK_SPEED);if(moved>0){player.vx=kvx/len*VILLAGE_WALK_SPEED;player.vy=kvy/len*VILLAGE_WALK_SPEED}}}
  else if(path.length){navigation.advance(player,path,dt,VILLAGE_WALK_SPEED);if(player.blocked){stopWalking();toast('길이 막혀 멈췄어요')}else if(!path.length)arrive();}
  else player.vx=player.vy=0;
  // A fixed follow camera avoids input drift caused by a lagging view transform.
  const halfX=CW/(scale*2),halfY=CH/(scale*2);
  camera.x=Math.max(halfX,Math.min(W-halfX,player.x));camera.y=Math.max(halfY,Math.min(H-halfY,player.y));
  updateJourney();

}
let lastFrameError='';
function frame(now){
 const dt=Math.min(.038,(now-last)/1000);last=now;
 try{update(dt);drawWorld(dt);drawMini()}catch(error){
  const message=String(error?.stack||error?.message||error).slice(0,400);
  if(message!==lastFrameError){lastFrameError=message;console.error('Village frame error',error);showRenderError(error)}
 }
 requestAnimationFrame(frame)
}requestAnimationFrame(frame);
function drawMini(){const w=mini.width,h=mini.height,sx=w/W,sy=h/H;
 mctx.fillStyle='#65aeb3';mctx.fillRect(0,0,w,h);mctx.fillStyle='#a1ca8d';mctx.fillRect(2000*sx,0,1600*sx,h);
 mctx.fillStyle='#b5cc91';mctx.fillRect(80*sx,120*sy,1840*sx,1050*sy);mctx.fillRect(455*sx,1170*sy,910*sx,400*sy);mctx.fillRect(1800*sx,720*sy,400*sx,340*sy);
 mctx.strokeStyle='#fff3c7';mctx.lineWidth=1.5;if(path.length){mctx.beginPath();mctx.moveTo(player.x*sx,player.y*sy);for(const p of path)mctx.lineTo(p.x*sx,p.y*sy);mctx.stroke()}
 for(const o of stations){mctx.fillStyle=o.x>2000?'#94623f':'#5c775a';mctx.fillRect(o.x*sx-2,o.y*sy-2,4,4)}
 mctx.strokeStyle='#fff9';mctx.lineWidth=1;mctx.strokeRect((camera.x-CW/scale/2)*sx,(camera.y-CH/scale/2)*sy,CW/scale*sx,CH/scale*sy);
 for(const peer of Object.values(peers)){const px=Number(peer.targetX??peer.x),py=Number(peer.targetY??peer.y);if(!Number.isFinite(px)||!Number.isFinite(py))continue;mctx.beginPath();mctx.fillStyle='#ec668b';mctx.strokeStyle='#fff';mctx.lineWidth=1.6;mctx.arc(px*sx,py*sy,3.5,0,Math.PI*2);mctx.fill();mctx.stroke()}
 mctx.fillStyle='#ffe48f';mctx.strokeStyle='#263e3a';mctx.lineWidth=1.5;mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,3.5,0,7);mctx.fill();mctx.stroke();
}
function disposeEstateWorld(){if(estateWorld){estateWorld.dispose();estateWorld=null}if(workshopPlaza){workshopPlaza.dispose();workshopPlaza=null}}
function closeModal(){homeStudioV48?.dispose();homeStudioV48=null;energyModal?.dispose();energyModal=null;disposeEstateWorld();els.modal.classList.remove('open');}
function openModal(html){homeStudioV48?.dispose();homeStudioV48=null;energyModal?.dispose();energyModal=null;disposeEstateWorld();stopWalking();keys={};pointer=null;els.panelBody.innerHTML=html;els.modal.classList.add('open')}
const worldEnergy=createWorldEnergySpend({onChange:()=>energyHudController.refresh()});
async function useWorldEnergy(kind){
 try{await worldEnergy.spend(kind);return true}
 catch(error){toast('⚡ '+(error?.message||'행동력을 확인하지 못했어'));return false}
}
const energyHudController=mountEnergyHud(document.getElementById('energyHudV47'),{open:()=>{
 openModal('<span class="titlebadge">행동력 · 마을 활동</span><div id="energyModalV47"></div>');
 energyModal=mountEnergyPanel(document.getElementById('energyModalV47'),{onChange:()=>energyHudController.refresh()});
}});
document.getElementById('close').onclick=closeModal;els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});

/* Personal homestead: persisted in the existing account-scoped save. */
const ESTATE_CROPS=[
 ['lettuce','🥬','상추',60,30,45,'vegetable'],
 ['carrot','🥕','당근',300,100,170,'vegetable'],
 ['berry','🍓','딸기',900,350,650,'fruit'],
 ['tomato','🍅','토마토',1800,700,1300,'vegetable'],
 ['wheat','🌾','밀',3600,1200,2400,'grain'],
 ['apple','🍎','사과',10800,4000,7500,'fruit'],
 ['peach','🍑','복숭아',21600,8000,16000,'fruit'],
 ['cherry','🍒','체리',43200,15000,32000,'fruit'],
 ['mango','🥭','황금망고',86400,35000,75000,'fruit']
];
const ESTATE_BY_ID=Object.fromEntries(ESTATE_CROPS.map(c=>[c[0],c]));
const ESTATE_CROP_TIMES=Object.fromEntries(ESTATE_CROPS.map(c=>[c[0],{seconds:c[3]}]));
const ESTATE_UPGRADES=[{slots:6,cost:50000,name:'아담한 텃밭'},{slots:24,cost:500000,name:'확장 농장'},{slots:48,cost:3000000,name:'고급 과수원'},{slots:96,cost:20000000,name:'로얄 농장'}];
const ESTATE_RECIPES=[
 {name:'🍓 딸기잼',needs:{berry:3},gold:2600},
 {name:'🥧 사과파이',needs:{apple:2,wheat:2},gold:24000},
 {name:'🍑 복숭아 주스',needs:{peach:2},gold:38000},
 {name:'🏡 목조 온실',needs:{wheat:6,apple:3},gold:85000,build:true},
 {name:'☕ 과일 카페',needs:{berry:8,peach:3,cherry:2},gold:240000,build:true}
];
function estateState(){
 if(!state.estate||typeof state.estate!=='object'||Array.isArray(state.estate))state.estate={tier:-1,plots:[],stock:{},buildings:[]};
 const e=state.estate;
 if(!Number.isInteger(e.tier)||e.tier< -1||e.tier>=ESTATE_UPGRADES.length)e.tier=-1;
 if(!Array.isArray(e.plots))e.plots=[];
 if(!e.stock||typeof e.stock!=='object')e.stock={};
 if(!Array.isArray(e.buildings))e.buildings=[];
 return e;
}
const estateFmt=n=>Math.round(n).toLocaleString('ko-KR')+'G';
function estateClock(seconds){
 if(seconds<=0)return '수확 가능';
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),sec=Math.floor(seconds%60);
 return (h?h+'시간 ':'')+(m?m+'분 ':'')+(!h?sec+'초':'');
}
let estateCropChoice='lettuce';
function openPersonalEstate(){
 const e=estateState(),tier=ESTATE_UPGRADES[e.tier],next=ESTATE_UPGRADES[e.tier+1];
 const slots=tier?.slots||0;
 const cropOptions=ESTATE_CROPS.map(c=>'<option value="'+c[0]+'">'+c[1]+' '+c[2]+' · '+estateClock(c[3])+' · 씨앗 '+estateFmt(c[4])+'</option>').join('');
 const plots=Array.from({length:slots},(_,i)=>{
  const p=e.plots[i],c=p&&ESTATE_BY_ID[p.id],remain=c?Math.max(0,Math.ceil((p.at+c[3]*1000-Date.now())/1000)):0;
  return '<button class="estate-plot" data-plot="'+i+'" style="min-height:82px;border:1px solid #c7d6b9;border-radius:16px;background:'+(c?'#e3edce':'#f5eee0')+';color:#34513d;padding:8px;font:600 13px sans-serif">'+(c?'<span style="font-size:27px">'+c[1]+'</span><br>'+c[2]+'<br><small>'+(remain?'⏳ '+estateClock(remain):'✨ 수확하기')+'</small>':'🌱<br>빈 밭<br><small>심기</small>')+'</button>';
 }).join('');
 const inventory=ESTATE_CROPS.filter(c=>(e.stock[c[0]]||0)>0).map(c=>'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #e5e9da"><span>'+c[1]+' '+c[2]+' ×'+e.stock[c[0]]+'</span><button data-sell="'+c[0]+'" style="padding:9px;border-radius:10px;background:#d3e5ca;color:#26432d">판매 '+estateFmt(c[5])+'</button></div>').join('')||'<p>수확한 농작물이 아직 없어요.</p>';
 const recipes=ESTATE_RECIPES.map((r,i)=>'<div style="background:#f3f4e8;border-radius:14px;padding:12px"><strong>'+r.name+'</strong><p style="font-size:12px">'+Object.entries(r.needs).map(([id,n])=>ESTATE_BY_ID[id][2]+' '+n+'개').join(' · ')+'</p><button data-recipe="'+i+'" style="padding:9px 13px;border-radius:12px;background:#cde5c7;color:#23442e">'+(r.build?'건설 · '+estateFmt(r.gold):'제작·보관 · 가공비 '+estateFmt(ESTATE_PRODUCTS[i].fee))+'</button></div>').join('');
 openModal('<span class="titlebadge">MY PRIVATE FARM · JUNJA LIFE</span><h2>🌳 나만의 농장과 과수원</h2><p>내 계정 전용 공간 · 게임을 꺼도 작물은 계속 자라요.</p><div style="padding:14px;border-radius:18px;background:linear-gradient(135deg,#dceecb,#fff0d3);margin:12px 0"><strong>🏡 '+(tier?.name||'아직 내 농장이 없어요')+'</strong><p>'+(tier?'재배 공간 '+slots+'칸 · 수확해서 요리와 건물을 만들어요.':'농장을 구매하면 나만의 텃밭을 열 수 있어요.')+'</p>'+(next?'<button id="estateUpgrade" style="padding:12px 16px;background:#8ebc91;color:#183f27;border-radius:13px;font-weight:700">🌱 '+(tier?'농장 확장':'농장 구매')+' · '+estateFmt(next.cost)+'</button>':'<strong>👑 최대 확장 완료</strong>')+'</div>'+
 (slots?'<div id="estateWorldV35" style="height:320px;min-height:260px;width:100%;margin:12px 0 7px;overflow:hidden;border-radius:18px;border:2px solid #ecdfb7;background:#b4cf8d" role="group" aria-label="내 농장 3D 체험 공간"></div><p style="font-size:12px;color:#476c57;margin-bottom:12px">👆 3D 농장에서 땅을 누르면 걸어가고, 작물을 누르면 심거나 수확해요. 아래 목록으로도 관리할 수 있어요.</p><div style="display:flex;gap:8px;align-items:center;margin:12px 0"><label for="estateCrop" style="font-weight:700">심을 작물</label><select id="estateCrop" style="flex:1;min-width:0;padding:12px;border-radius:12px;background:#fff;border:1px solid #c3d3c0">'+cropOptions+'</select></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-height:300px;overflow:auto;padding:4px">'+plots+'</div>':'')+
 '<div class="v49-farm-shortcuts"><strong>🏅 '+estateRank(state).name+' · 주민 납품 명성 '+initEstateTrade(state).reputation+'점</strong><h4>🏡 나의 공간</h4><div class="v49-farm-group"><button id="estateHomeV48" style="padding:12px;background:#ddbe82;color:#3e352a;border-radius:11px;font-weight:800">🏠 나의 집</button><button id="estateOrdersOpen" style="padding:12px;background:#5b926e;color:white;border-radius:11px;font-weight:800">📦 주민 주문</button></div><h4>🏭 생산·직업·거래</h4><div class="v49-farm-group"><button id="estatePlayerMarket" style="padding:12px;background:#9c774e;color:white;border-radius:11px;font-weight:800">🏪 주민 거래소 · 시험</button><button id="estateProfessions" style="padding:12px;background:#6e738e;color:white;border-radius:11px;font-weight:800">🏅 직업과 계약 · 시험</button><button id="estateBusinesses" style="padding:12px;background:#8a746a;color:white;border-radius:11px;font-weight:800">🏭 나의 사업장 · 시험</button><button id="estateWorkshops3D" style="padding:12px;background:#79907c;color:white;border-radius:11px;font-weight:800">🏘️ 사업장 거리 · 시험</button></div><details class="v49-experimental"><summary>⚙️ 시험 경제·복구 기능</summary><p>정식 캐릭터 골드와 분리된 시험용 서버 경제야. 필요할 때만 열어줘.</p><button id="estateSecureLab" style="padding:12px;background:#4d797c;color:white;border-radius:11px;font-weight:800">📒 경제 관리</button></details></div><h3 style="margin-top:20px">🧺 내 수확 창고</h3>'+inventory+'<h3 style="margin-top:20px">🍳 요리·건축 공방</h3><div style="display:grid;gap:9px">'+recipes+'</div><p style="font-size:12px;margin-top:16px">※ 농작물 판매와 제작 보상은 게임 골드로 지급됩니다. 시세는 고정이며 작물마다 성장 시간이 달라요. 농장은 계정별로 따로 저장돼요.</p>');
 if(slots){
  const host=document.getElementById('estateWorldV35');
  try{
   estateWorld=mountEstateWorld({
    host,estate:e,cropMap:ESTATE_CROP_TIMES,
    look:{coat:state.coat,hat:state.hat,fashion:state.fashion?.equipped||{}},
    onPlot:index=>{
     const tile=els.panelBody.querySelector('[data-plot="'+index+'"]');
     if(tile)tile.click();
    }
   });
  }catch(error){
   console.warn('3D 개인 농장 준비 실패, 일반 농장 메뉴로 돌아갑니다',error);
   if(host){host.textContent='🌱 이 기기에서는 3D 농장 표시가 제한됐어요. 아래 밭 관리 버튼으로 계속 이용할 수 있어요.';host.style.height='auto';host.style.padding='28px 14px'}
  }
 }
 document.getElementById('estateHomeV48').onclick=openHomeStudioV48;
 document.getElementById('estateOrdersOpen').onclick=openEstateOrders;
 document.getElementById('estateWorkshops3D').onclick=()=>{
  openModal('<span class="titlebadge">사업장 거리 · 시험 경제</span><div id="estateWorkshopPlaza"></div>');
  workshopPlaza=openWorkshopPlaza(document.getElementById('estateWorkshopPlaza'),{back:openPersonalEstate});
 };
 document.getElementById('estateBusinesses').onclick=()=>{
  openModal('<span class="titlebadge">나의 사업장 · 시험 경제</span><div id="estateBusinessCenter"></div>');
  openBusinessCenter(document.getElementById('estateBusinessCenter'),{back:openPersonalEstate});
 };
 document.getElementById('estateProfessions').onclick=()=>{
  openModal('<span class="titlebadge">직업과 계약 · 시험 경제</span><div id="estateProfessionCenter"></div>');
  openProfessionCenter(document.getElementById('estateProfessionCenter'),{back:openPersonalEstate});
 };
 document.getElementById('estatePlayerMarket').onclick=()=>{
  openModal('<span class="titlebadge">주민 거래소 · 시험 경제</span><div id="estatePlayerMarketContent"></div>');
  openPlayerMarket(document.getElementById('estatePlayerMarketContent'),{back:openPersonalEstate});
 };
 document.getElementById('estateSecureLab').onclick=()=>{
  openModal('<span class="titlebadge">경제 관리 · 시험 복구</span><div id="estateEconomyLab"></div>');
  openSecureEconomyLab(document.getElementById('estateEconomyLab'),{back:openPersonalEstate});
 };
 const estateCropSelect=document.getElementById('estateCrop');
 if(estateCropSelect){
  estateCropSelect.value=ESTATE_BY_ID[estateCropChoice]?estateCropChoice:'lettuce';
  estateCropSelect.onchange=()=>{estateCropChoice=estateCropSelect.value};
 }
 const upgrade=document.getElementById('estateUpgrade');
 if(upgrade)upgrade.onclick=()=>{const cost=next.cost;if(state.coins<cost){toast('농장 구매에 필요한 골드가 부족해요');return}if(!spend(cost,'개인 농장 구매·확장'))return;e.tier++;save();toast('🌿 내 농장이 확장됐어요!');openPersonalEstate()};
 els.panelBody.querySelectorAll('[data-plot]').forEach(btn=>btn.onclick=async()=>{
  const i=Number(btn.dataset.plot),p=e.plots[i],c=p&&ESTATE_BY_ID[p.id];
  if(c){if(Date.now()<p.at+c[3]*1000){toast('⏳ '+estateClock(Math.ceil((p.at+c[3]*1000-Date.now())/1000))+' 남았어요');return}
    e.stock[c[0]]=(Number(e.stock[c[0]])||0)+1;e.plots[i]=null;recordEstateHarvest(state);state.xp+=Math.max(1,Math.floor(c[3]/90));save();toast(c[1]+' '+c[2]+' 수확!');openPersonalEstate();return}
  const selected=document.getElementById('estateCrop')?.value,crop=ESTATE_BY_ID[selected];
  if(!crop)return;if(state.coins<crop[4]){toast('씨앗 구매 골드가 부족해요');return}
  if(!await useWorldEnergy('plant'))return;
  if(!spend(crop[4],crop[2]+' 씨앗'))return;
  e.plots[i]={id:selected,at:Date.now()};save();toast(crop[1]+' 심기 완료');openPersonalEstate();
 });
 els.panelBody.querySelectorAll('[data-sell]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.sell,c=ESTATE_BY_ID[id];if(!c||!(e.stock[id]>0))return;e.stock[id]--;earn(c[5],'farm',c[2]+' 판매');save();openPersonalEstate()});
 els.panelBody.querySelectorAll('[data-recipe]').forEach(btn=>btn.onclick=async()=>{const i=Number(btn.dataset.recipe),r=ESTATE_RECIPES[i];if(!r)return;if(!r.build){
   if(Object.entries(r.needs).some(([id,n])=>(e.stock[id]||0)<n)){toast('제작 재료가 부족해요');return}
   if(!await useWorldEnergy('craft'))return;
   const result=manufactureEstateProduct(state,ESTATE_PRODUCTS[i]?.id);if(!result.ok){toast(result.error);return}save();hud();toast(result.product.name+' 제작 완료! 주문 납품이나 판매에 이용해요');openPersonalEstate();return}if(e.buildings.includes(r.name)){toast('이미 건설한 건물이에요');return}if(Object.entries(r.needs).some(([id,n])=>(e.stock[id]||0)<n)){toast('필요한 농작물이 부족해요');return}
  if(!await useWorldEnergy('craft'))return;
  for(const [id,n] of Object.entries(r.needs))e.stock[id]-=n;e.buildings.push(r.name);save();toast(r.name+' 건설 완료!');openPersonalEstate()});
}

function openEstateOrders(){
 const e=estateState(),t=initEstateTrade(state),board=estateOrderProgress(state);
 const rank=estateRank(state);
 const requirement=(id,n,goods=false)=>{
  const title=goods?(ESTATE_PRODUCTS.find(p=>p.id===id)?.name||id):(ESTATE_BY_ID[id]?.[1]+' '+ESTATE_BY_ID[id]?.[2]||id);
  const have=goods?(t.goods[id]||0):(e.stock[id]||0);
  return '<span style="color:'+(have>=n?'#37764d':'#ad6644')+'">'+title+' '+have+'/'+n+'</span>';
 };
 const goodsHtml=ESTATE_PRODUCTS.map(p=>{
  const count=t.goods[p.id]||0;
  return '<div class="mini-card" style="margin:5px 0"><strong>'+p.name+' · '+count+'개 보관</strong><p>만들기: '+Object.entries(p.needs).map(([id,n])=>requirement(id,n)).join(' · ')+' · 가공비 '+estateFmt(p.fee)+'</p><p>NPC 판매 기준가 '+estateFmt(p.price)+' (실수령액은 하루 수입 한도에 따라 달라져요)</p><button data-estate-make="'+p.id+'">가공품 제작</button> <button data-estate-sell="'+p.id+'" '+(count?'':'disabled')+'>1개 판매</button></div>';
 }).join('');
 const ordersHtml=board.orders.map(o=>{
  const has=Object.entries(o.needs).map(([id,n])=>requirement(id,n)).concat(Object.entries(o.goods).map(([id,n])=>requirement(id,n,true)));
  return '<div class="mini-card" style="margin:6px 0"><strong>'+o.name+'</strong><p>필요 재료: '+has.join(' · ')+'</p><p>기준 보상 '+estateFmt(o.reward)+' · 명성 +'+o.rep+' · 경험치 +'+o.xp+'</p><button data-estate-order="'+o.id+'" '+(o.complete||!o.ready?'disabled':'')+'>'+(o.complete?'✅ 오늘 납품 완료':o.ready?'📦 주문 납품하기':'재료 준비 중')+'</button></div>';
 }).join('');
 openModal('<span class="titlebadge">준자마을 · 주민 주문</span><h2>📦 주민 주문과 가공품 상점</h2><p>개인 농장에서 재배한 작물 → 가공품 제작 → 주문 납품 → 명성 상승</p>'+
 '<div class="mini-card"><strong>🏅 '+rank.name+' · 명성 '+t.reputation+'점</strong><p>다음 직업 단계 '+(rank.next===null?'최고 단계 달성':rank.next+'점 · '+Math.max(0,rank.next-t.reputation)+'점 남음')+'</p><p>총 수확 '+t.stats.harvested+'회 · 가공 '+t.stats.made+'회 · 판매 '+t.stats.sold+'회 · 납품 '+t.stats.fulfilled+'회</p></div>'+
 '<h3>📅 오늘의 주민 주문 · '+board.day+'</h3><p>오늘 '+board.completed+'/'+board.limit+'건 완료 · 주문은 매일 변경돼요. 시즌 경쟁을 위한 명성은 누적됩니다.</p>'+ordersHtml+
 '<h3>🍳 가공품 창고</h3>'+goodsHtml+
 '<p style="font-size:11px">현재는 개인 계정 저장을 사용하는 경제 시험판입니다. 금액은 활동별 하루 보상 조정 규칙이 적용됩니다. 사용자 간 거래는 서버 정산 구축 후 개방할 예정입니다.</p>'+
 '<button id="estateBackToFarm" class="pill-btn ghost">🌳 개인 농장으로 돌아가기</button>');
 document.getElementById('estateBackToFarm').onclick=openPersonalEstate;
 els.panelBody.querySelectorAll('[data-estate-make]').forEach(btn=>btn.onclick=async()=>{
  const chosen=ESTATE_PRODUCTS.find(p=>p.id===btn.dataset.estateMake);
  if(!chosen||Object.entries(chosen.needs).some(([id,n])=>(estateState().stock[id]||0)<n)||state.coins<chosen.fee){toast('제작 재료 또는 골드가 부족해요');return}
  if(!await useWorldEnergy('craft'))return;
  const r=manufactureEstateProduct(state,btn.dataset.estateMake);
  if(!r.ok){toast(r.error);return}
  save();hud();toast(r.product.name+' 제작 완료');openEstateOrders();
 });
 els.panelBody.querySelectorAll('[data-estate-sell]').forEach(btn=>btn.onclick=()=>{
  const r=sellEstateProduct(state,btn.dataset.estateSell,lifeLevel());
  if(!r.ok){toast(r.error);return}
  save();hud();toast(r.product.name+' 판매 · +'+estateFmt(r.amount)+(r.softCapped?' (하루 수입 조정)':''));openEstateOrders();
 });
 els.panelBody.querySelectorAll('[data-estate-order]').forEach(btn=>btn.onclick=async()=>{
  const selected=estateOrderProgress(state).orders.find(x=>x.id===btn.dataset.estateOrder);
  if(!selected||selected.complete||!selected.ready){toast('납품할 주문이나 재료를 다시 확인해 줘');return}
  if(!await useWorldEnergy('order'))return;
  const r=fulfillEstateOrder(state,btn.dataset.estateOrder,lifeLevel());
  if(!r.ok){toast(r.error);return}
  save();hud();toast('📦 납품 완료! '+estateFmt(r.amount)+' · 명성 +'+r.order.rep+(r.softCapped?' · 수익 한도 적용':''));
  openEstateOrders();
 });
}

(function installEstateButton(){
 const farm=document.getElementById('farmBtn');if(!farm)return;
 const button=document.createElement('button');button.type='button';button.className='act';button.id='estateBtn';button.innerHTML='<span class="em">🌳</span><small>내 농장</small>';button.setAttribute('aria-label','나만의 개인 농장과 과수원 열기');
 farm.insertAdjacentElement('afterend',button);button.onclick=openPersonalEstate;
})();

const STYLE_SETS=[
 {id:'spring',name:'봄날 피크닉',icon:'🌷',tier:'DAILY',detail:'화사한 봄 산책 스타일',items:{hair:'fashion_hair_03',outfit:'fashion_outfit_03',accessory:'fashion_accessory_02'}},
 {id:'rose',name:'벚꽃 데이트',icon:'🎀',tier:'PREMIUM',detail:'라벤더 룩과 동행하는 고양이',items:{hair:'fashion_hair_07',outfit:'fashion_outfit_09',accessory:'fashion_accessory_08',pet:'fashion_pet_06'}},
 {id:'forest',name:'숲속 탐험가',icon:'🌲',tier:'RARE',detail:'울프컷·트렌치·숲속 여우',items:{hair:'fashion_hair_09',outfit:'fashion_outfit_19',accessory:'fashion_accessory_06',pet:'fashion_pet_08'}},
 {id:'ocean',name:'화이트 오션',icon:'🤍',tier:'ROYAL',detail:'화이트 로열 의상과 액세서리',items:{hair:'fashion_hair_15',outfit:'fashion_outfit_22',accessory:'fashion_accessory_13',pet:'fashion_pet_12'}},
 {id:'royal',name:'갓준자 황실',icon:'👑',tier:'MYTHIC',detail:'백금 신화 예복과 최상급 코디',items:{hair:'fashion_hair_20',outfit:'fashion_outfit_39',accessory:'fashion_accessory_20',pet:'fashion_pet_20'}}
];
const neededStyleItems=set=>Object.values(set.items).map(id=>CATALOG_BY_ID[id]).filter(item=>item&&!state.fashion.owned.includes(item.id));
const setPrice=set=>Math.round(neededStyleItems(set).reduce((n,item)=>n+item.price,0)*.88);
let fittingLook=null,wardrobeTab='outfit',wardrobeGender='전체';
function fashionSnapshot(){return {coat:state.coat,hat:state.hat,fashion:{...state.fashion.equipped}}}
function openShop(section=wardrobeTab){
 if(typeof section!=='string')section=wardrobeTab;
 if(!['sets','classic',...CATEGORIES.map(x=>x.id)].includes(section))section='outfit';
 wardrobeTab=section;
 if(!fittingLook)fittingLook=fashionSnapshot();
 const selected=section==='classic'?outfits:section==='sets'?[]:CATALOG.filter(o=>o.type===section&&(wardrobeGender==='전체'||!o.gender||o.gender===wardrobeGender||o.gender==='공용'));
 const cards=section==='sets'?STYLE_SETS.map(set=>{
  const needed=neededStyleItems(set),price=setPrice(set);
  return `<div class="premium-set">
   <span class="titlebadge">${set.icon} ${set.tier}</span><h3>${set.name}</h3>
   <p>${set.detail}</p>
   <p>✦ ${Object.values(set.items).map(id=>CATALOG_BY_ID[id]?.name||'').join(' · ')}</p>
   <p>${needed.length?'미보유 '+needed.length+'개 · 정가 대비 12% 할인':'이미 모든 아이템 보유'}<strong> · ${price.toLocaleString('ko-KR')}G</strong></p>
   <div class="pill-row"><button type="button" data-preview-set="${set.id}">전신 미리보기</button>
   <button type="button" data-buy-set="${set.id}">${needed.length?'세트 구매·착용':'세트 전체 착용'}</button></div>
  </div>`;
 }).join(''):selected.map(o=>{
  const legacy=section==='classic',id=o.id,category=legacy?o.type:o.type,have=legacy?owned.includes(id):state.fashion.owned.includes(id);
  const current=legacy?(fittingLook[category]===id):(fittingLook.fashion[category]===id);
  const equipped=legacy?(state[category]===id&&!state.fashion.equipped.outfit):state.fashion.equipped[category]===id;
  const price=legacy?o.cost*12:o.price;
  const color=legacy?(o.col||'#e8dac2'):'#'+o.color.toString(16).padStart(6,'0');
  const grade=legacy?null:GRADES[o.grade];
  const garmentPreview=section==='outfit'&&!legacy?`<svg class="garment-preview" viewBox="0 0 100 108" role="img" aria-label="${o.name} 의상 모양"><defs><linearGradient id="cloth-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#ffffff" stop-opacity=".38"/></linearGradient></defs><path d="M30 14 L41 8 Q50 18 59 8 L70 14 L91 32 L78 48 L70 40 L${['dress','robe','royal'].includes(o.shape)?'82 91 Q50 104 18 91':'69 89 L31 89'} L${['dress','robe','royal'].includes(o.shape)?'30 40':'30 40'} L22 48 L9 32 Z" fill="url(#cloth-${id})" stroke="#766c62" stroke-width="1.8"/><path d="M41 8 L50 28 L59 8 M50 28 L50 70" stroke="${'#'+(o.accent??0xffffff).toString(16).padStart(6,'0')}" stroke-width="4" fill="none"/><circle cx="50" cy="42" r="2.4" fill="#f9e5ac"/><circle cx="50" cy="54" r="2.4" fill="#f9e5ac"/></svg>`:null;
  return `<div class="item fashion-item" data-catalog="${id}">
    ${garmentPreview||`<div class="fashion-color" style="background:${color}">${legacy?o.emoji:(section==='hair'?'✂️':section==='outfit'?'✦':section==='pet'?'🐾':'◆')}</div>`}
    <strong>${o.name}</strong>
    <span class="fashion-grade" style="color:${grade?.color||'#7b8b79'}">${grade?.label||'클래식'}</span>
    <span>${have?'보유 중':o.craftOnly?'제작 전용':price.toLocaleString('ko-KR')+' G'}</span>
    <button type="button" data-try="${id}" class="${current?'equipped':''}">${current?'✓ 미리보기':'입어보기'}</button>
    <button type="button" data-outfit="${id}">${equipped?'착용 중':have?'장착하기':o.craftOnly?'공방으로 가기':'구매 · 착용'}</button>
  </div>`;
 }).join('');
 const buttons=[{id:'sets',label:'코디 세트',icon:'👑'},{id:'classic',label:'기존 옷·모자',icon:'👒'},...CATEGORIES].map(x=>`<button type="button" id="tab-${x.id}" data-tab="${x.id}" aria-pressed="${section===x.id}" class="fashion-tab ${section===x.id?'selected':''}">${x.icon} ${x.label}</button>`).join('');
 openModal(`<span class="titlebadge">JUNJA ATELIER · PREMIUM 3D</span>
  <h2>👗 의상 구매 · 코디 상점</h2>
  <p>마음에 드는 옷을 고르고 입어보기 → 구매·착용하세요.</p>
  <div class="wardrobe-list-hint">👇 아래에서 의상 선택 · 가격 확인 · 구매하기</div><div id="fittingHost"></div>
  <p class="fitting-tip">👟 머리부터 신발까지 전신 확인 · 캐릭터를 좌우로 드래그해 돌려보세요</p>
  <div class="pill-row fitting-controls"><button class="pill-btn ghost" id="turnFitting">↻ 돌려보기</button>
   <button class="pill-btn ghost" id="walkFitting">걷는 모습</button><button class="pill-btn ghost" id="resetFitting">현재 착용</button></div>
  <nav class="fashion-tabs" aria-label="꾸미기 상점 분류">${buttons}</nav>
  ${!['sets','classic'].includes(section)?`<div class="pill-row" aria-label="상품 스타일 필터">${['전체','남','여'].map(g=>`<button type="button" data-gender="${g}" class="pill-btn ${wardrobeGender===g?'':'ghost'}">${g==='남'?'👦 남자 스타일':g==='여'?'👧 여자 스타일':'🌈 전체 보기'}</button>`).join('')}</div>`:''}
  ${section!=='classic'&&fittingLook.fashion[section]?`<button type="button" class="pill-btn ghost" id="unequipFashion">↩ ${CATEGORIES.find(c=>c.id===section).label} 해제</button>`:''}
  <p class="fashion-total">${section==='sets'?STYLE_SETS.length:selected.length}종 · 보유 코인 ${Math.floor(state.coins).toLocaleString('ko-KR')}G</p>
  <div class="goods">${cards}</div>`);
 world3D?.fitting(document.getElementById('fittingHost'),fittingLook.coat,fittingLook.hat,fittingLook.fashion);
 els.panelBody.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>openShop(btn.dataset.tab));
 els.panelBody.querySelectorAll('[data-gender]').forEach(btn=>btn.onclick=()=>{wardrobeGender=btn.dataset.gender;openShop(section)});
 els.panelBody.querySelectorAll('[data-preview-set]').forEach(btn=>btn.onclick=()=>{
  const set=STYLE_SETS.find(s=>s.id===btn.dataset.previewSet);if(!set)return;
  fittingLook.fashion={...fittingLook.fashion,...set.items};openShop('sets');
 });
 els.panelBody.querySelectorAll('[data-buy-set]').forEach(btn=>btn.onclick=()=>{
  const set=STYLE_SETS.find(s=>s.id===btn.dataset.buySet);if(!set)return;
  const needed=neededStyleItems(set),price=setPrice(set);
  if(state.coins<price){toast('코인 부족 · '+price.toLocaleString('ko-KR')+'G 필요');return}
  spend(price,'의상 세트 구매');for(const item of needed)state.fashion.owned.push(item.id);
  Object.assign(state.fashion.equipped,set.items);fittingLook.fashion={...state.fashion.equipped};
  save();hud();toast('👑 '+set.name+' 코디 완성!');openShop('sets');
 });
 els.panelBody.querySelectorAll('[data-try]').forEach(btn=>btn.onclick=()=>{
  const id=btn.dataset.try,item=CATALOG_BY_ID[id],old=outfits.find(o=>o.id===id);
  if(item)fittingLook.fashion[item.type]=id;
  else if(old){fittingLook[old.type]=id;if(old.type==='coat')fittingLook.fashion.outfit=null}
  openShop(section);
 });
 els.panelBody.querySelectorAll('[data-outfit]').forEach(btn=>btn.onclick=()=>{
  const id=btn.dataset.outfit,item=CATALOG_BY_ID[id],old=outfits.find(o=>o.id===id);
  if(item){
   const type=item.type;
   if(!state.fashion.owned.includes(id)){
    if(state.coins<item.price){toast('코인이 부족해요 · '+item.price.toLocaleString('ko-KR')+'G 필요');return}
    spend(item.price,'개별 의상 구매');state.fashion.owned.push(id);
   }
   state.fashion.equipped[type]=id;fittingLook.fashion[type]=id;
  }else if(old){
   if(old.craftOnly&&!owned.includes(id)){goStation('workshop');return}
   if(!owned.includes(id)){
    if(state.coins<old.cost*12){toast('코인이 부족해요');return}
    spend(old.cost*12,'클래식 코디 구매');owned.push(id);
   }
   state[old.type]=id;fittingLook[old.type]=id;
   if(old.type==='coat'){state.fashion.equipped.outfit=null;fittingLook.fashion.outfit=null}
  }else return;
  save();hud();updateJourney(true);toast((item||old).name+' 장착 완료');openShop(section);
 });
 const unequip=document.getElementById('unequipFashion');if(unequip)unequip.onclick=()=>{
  state.fashion.equipped[section]=null;fittingLook.fashion[section]=null;save();openShop(section);
 };
 document.getElementById('turnFitting').onclick=()=>world3D?.turnFitting();
 document.getElementById('walkFitting').onclick=()=>world3D?.walkFitting();
 document.getElementById('resetFitting').onclick=()=>{fittingLook=fashionSnapshot();openShop(section)};
}
function openFishingGear(){
 const equipped=rodById(state.fishingGear.equipped);
 openModal(`<span class="titlebadge">FISHING MASTER</span><h2>🎣 낚시 장비 상점</h2>
  <p>좋은 낚싯대는 입질을 단축하고 포획 구간을 넓혀줘요. 희귀 Lv.6 · 영웅 Lv.10 · 전설 Lv.16 · 신화 Lv.22부터 도전하며 낚싯대 등급 조건도 있어요.</p>
  <div class="mini-card"><strong>현재 장비 · ${equipped.name}</strong>
  <p>입질 대기 약 ${Math.round((1-equipped.wait)*100)}% 단축 · 성공 구간 ${Math.round(equipped.window*200)}%p 확대</p>
  <p>상위 낚싯대일수록 필요한 릴 터치 횟수가 줄고, 허용 실수·제한시간·판정 구간이 개선돼요.</p></div>
  <div class="card-grid">${RODS.map(rod=>{
   const owned=state.fishingGear.owned.includes(rod.id);
   const unlocked=lifeLevel()>=rod.level;
   return `<div class="mini-card"><span class="emoji">${rod.icon}</span><strong>${rod.name}</strong>
    <p>Lv.${rod.level} 필요 · ${(rod.price*4).toLocaleString()}G</p>
    <p>대기 -${Math.round((1-rod.wait)*100)}% · 판정 +${Math.round(rod.window*200)}%p · 보상 +${Math.round(rod.coins*100)}%</p>
    <button data-rod="${rod.id}" ${!unlocked?'disabled':''}>${state.fishingGear.equipped===rod.id?'사용 중':owned?'장착하기':unlocked?'구매하기':'레벨 부족'}</button>
   </div>`;
  }).join('')}</div>
  <button class="pill-btn" id="autoFishShop">🎣 자동낚시 이용권 상점</button><button class="pill-btn ghost" id="openAquariumFromGear">🐠 내 어항 보기</button>`);
 document.getElementById('autoFishShop').onclick=autoFishPanel;
 els.panelBody.querySelectorAll('[data-rod]').forEach(btn=>btn.onclick=()=>{
  const rod=RODS.find(r=>r.id===btn.dataset.rod);
  if(!rod||lifeLevel()<rod.level)return;
  if(!state.fishingGear.owned.includes(rod.id)){
   if(state.coins<rod.price*4){toast('장비 구매 코인이 부족해요');return}
   spend(rod.price*4,'낚싯대 구매');state.fishingGear.owned.push(rod.id);
  }
  state.fishingGear.equipped=rod.id;save();hud();toast(rod.name+' 장착했어요');openFishingGear();
 });
 document.getElementById('openAquariumFromGear').onclick=openAquarium;
}
function openFishProfile(name){
 const fish=FISH_BY_NAME[name];if(!fish)return;
 const caught=state.collection.includes(name),record=state.fishRecords[name];
 if(!caught){toast('아직 발견하지 못한 물고기예요');return}
 const knownSeasons=[...new Set([realSeason(),...[]])].filter(Boolean);
 const rank=FISH.findIndex(f=>f.name===name)+1;
 const gradeColor={common:'#79a58c',fine:'#6d9cc5',rare:'#986dcb',hero:'#c68c3d',legend:'#d5ac4c',mythic:'#976bca'}[fish.tier]||'#79a58c';
 openModal('<span class="titlebadge">SEA MUSEUM · SPECIMEN NO. '+String(rank).padStart(3,'0')+'</span>'+
  '<h2>🐠 '+fish.name+'</h2><div class="specimen-portrait" style="--rarity:'+gradeColor+'">'+fishArt(name,260)+
  '<div class="specimen-shine">✦ '+fish.rarity+' ✦</div></div>'+
  '<div class="mini-card"><strong>📖 도감 표본 기록</strong><p>분류 '+fish.rarity+' · 등장 권장 레벨 '+fish.minLevel+' · 기본 가치 '+fish.base.toLocaleString('ko-KR')+'G</p>'+
  '<p>포획 누적 '+state.collection.filter(n=>n===name).length+'마리 · 최고 길이 '+(record?.bestCm?record.bestCm+'cm':'이전 버전 포획 기록')+
  '</p><p>최근 크기 '+(record?.lastCm?record.lastCm+'cm':'기록 없음')+' · 첫 등록 '+(record?.firstAt||'업데이트 이전')+'</p>'+
  '<p>서식 환경: '+(fish.tier==='mythic'?'심해 특별 해역':fish.tier==='legend'?'먼바다 전설 수역':fish.size>1.7?'깊은 바다':'연안·내해')+'</p></div>'+
  '<button class="pill-btn" id="fishProfileBack">🐠 전시관으로 돌아가기</button>');
 document.getElementById('fishProfileBack').onclick=openAquarium;
}
let aquariumFilter='all',aquariumPage=0;
function openAquarium(){
 const available=new Set(state.collection.filter(n=>FISH_BY_NAME[n]));
 const cap=aquariumSlots(lifeLevel());
 state.aquarium.display=state.aquarium.display.filter(n=>available.has(n)).slice(0,cap);
 if(!state.aquarium.initialized){
  if(!state.aquarium.display.length&&available.size)state.aquarium.display=[...available].slice(0,Math.min(3,cap));
  state.aquarium.initialized=true;
 }
 const display=state.aquarium.display;
 const tank=`<div class="aquarium-stage">
  <div class="aquarium-water-rays"></div><div class="aquarium-bubbles">◌　◦　◌　◦　○</div>
  <div class="aquarium-backdrop">⌇　　🌿　　⌇　　🪸　⌇</div>
  ${display.map((name,i)=>{const f=FISH_BY_NAME[name],size=Math.min(115,65+(f.size||1)*24);
   return `<div class="aquarium-fish" style="top:${10+(i%3)*25}%;left:${2+(i%4)*24}%;--float-delay:-${i*.74}s;--float-seconds:${4+(i%5)*1.1}s;--fish-size:${size}px" title="${name}">${fishArt(name,Math.round(size*1.5))}</div>`;
  }).join('')}
  <div class="aquarium-stones">🪸　　　🌱　　　🪨　　　🐚　　🌿</div>
  <div class="aquarium-ground"><span>JUNJA OCEAN MUSEUM</span><span>${display.length} SPECIMENS · ${state.season.toUpperCase()}</span></div>
 </div>`;
 openModal(`<span class="titlebadge">MY AQUARIUM</span><h2>🐠 나만의 어항 컬렉션</h2>
  <p>발견한 물고기를 수족관에 배치해요. 전시해도 보유 기록은 없어지지 않아요.</p>
  <p><b>발견 어종 ${available.size}/${FISH.length} · 전시 ${display.length}/${cap}칸</b> · Lv.5/8/12 전시 공간 확장</p>
  ${tank}
  <div class="pill-row fish-filters">
  ${[['all','전체'],['owned','발견'],['common','일반'],['fine','고급'],['rare','희귀'],['hero','영웅'],['legend','전설'],['mythic','신화']].map(([id,name])=>`<button type="button" data-fishfilter="${id}" class="pill-btn ${aquariumFilter===id?'':'ghost'}">${name}</button>`).join('')}</div>
  <p class="item-note">🔒 레벨·낚싯대가 높아질수록 희귀 어종 해금 · 신화 Lv.22 이상 · 대어는 더 어렵게 포획</p>
  <div class="aquarium-list">${FISH.filter(f=>aquariumFilter==='all'||(aquariumFilter==='owned'?available.has(f.name):f.tier===aquariumFilter)).slice(aquariumPage*12,aquariumPage*12+12).map(f=>{
   const caught=available.has(f.name),placed=display.includes(f.name);
   return `<div class="aquarium-item ${caught?'':'locked'}" data-tier="${f.tier}">${fishArt(f.name,152)}
    <strong>${caught?f.name:'미발견 물고기'}</strong><small>${f.rarity} · Lv.${f.minLevel} 해금 · ${f.size>=1.7?'🐋 대형 · ':''}${state.collection.filter(x=>x===f.name).length}마리 기록</small>
    ${caught?`<small>🏆 최고 ${state.fishRecords[f.name]?.bestCm||'—'}cm</small><button data-fishprofile="${f.name}" class="specimen-info">🔍 도감 상세</button>`:''}
    <button data-fish="${f.name}" ${!caught?'disabled':''}>${placed?'전시 해제':'어항에 전시'}</button></div>`;
  }).join('')}</div>
  <div class="pill-row"><button id="aquariumPrev" class="pill-btn ghost" ${aquariumPage<=0?'disabled':''}>← 이전</button>
  <span class="item-note">${aquariumPage+1}/${Math.max(1,Math.ceil(FISH.filter(f=>aquariumFilter==='all'||(aquariumFilter==='owned'?available.has(f.name):f.tier===aquariumFilter)).length/12))} 페이지</span>
  <button id="aquariumNext" class="pill-btn ghost" ${(aquariumPage+1)*12>=FISH.filter(f=>aquariumFilter==='all'||(aquariumFilter==='owned'?available.has(f.name):f.tier===aquariumFilter)).length?'disabled':''}>다음 →</button></div>
  <button class="pill-btn ghost" id="aquariumRodShop">낚싯대 업그레이드</button>`);
 els.panelBody.querySelectorAll('[data-fishfilter]').forEach(btn=>btn.onclick=()=>{aquariumFilter=btn.dataset.fishfilter;aquariumPage=0;openAquarium()});
 document.getElementById('aquariumPrev').onclick=()=>{aquariumPage=Math.max(0,aquariumPage-1);openAquarium()};
 document.getElementById('aquariumNext').onclick=()=>{aquariumPage++;openAquarium()};
 els.panelBody.querySelectorAll('[data-fishprofile]').forEach(btn=>btn.onclick=()=>openFishProfile(btn.dataset.fishprofile));
 els.panelBody.querySelectorAll('[data-fish]').forEach(btn=>btn.onclick=()=>{
  const name=btn.dataset.fish;if(!available.has(name))return;
  const index=state.aquarium.display.indexOf(name);
  if(index>=0)state.aquarium.display.splice(index,1);
  else if(state.aquarium.display.length>=cap){toast('어항 전시 공간이 가득 찼어요. 레벨을 올려 확장하세요');return}
  else state.aquarium.display.push(name);
  save();openAquarium();
 });
 document.getElementById('aquariumRodShop').onclick=openFishingGear;
}
function openBag(){
 const bag=initBag(state),used=bagUsed(state),capacity=bagCapacity(state),next=BAG_TIERS[bag.level];
 const stocks=Object.entries(state.fishStock||{}).filter(([name,n])=>n>0&&FISH_BY_NAME[name]).sort((a,b)=>b[1]-a[1]);
 const fishTotal=stocks.filter(([name])=>!bag.protectedFish.includes(name)).reduce((sum,[,n])=>sum+n,0);
 const storageBar=Math.min(100,Math.round(used/capacity*100));
 const inventory=stocks.map(([name,n])=>'<div class="slot"><b>🐟</b>'+name+' × '+n+'<button data-fish-lock="'+name+'">'+(bag.protectedFish.includes(name)?'🔒 판매 잠금':'🔓 판매 가능')+'</button></div>').join('');
 const resources=Object.entries(state.materials||{}).filter(([,n])=>n>0).map(([id,n])=>(materialNames[id]||id)+' × '+n).join(' · ')||'보유 없음';
 const huntLoot=Object.entries(state.hunt?.materials||{}).filter(([,n])=>n>0).map(([id,n])=>id+' × '+n).join(' · ')||'보유 없음';
 const crafted=Object.entries(state.crafted||{}).filter(([,n])=>n>0).map(([id,n])=>id+' × '+n).join(' · ')||'보유 없음';
 openModal('<span class="titlebadge">STORAGE · LV.'+bag.level+'</span><h2>🎒 나의 가방</h2>'+
 '<div class="mini-card"><strong>'+BAG_TIERS[bag.level-1].name+' · '+used+'/'+capacity+'칸</strong>'+
 '<div class="mini-progress"><i style="width:'+storageBar+'%"></i></div>'+
 '<p>물고기·채집 재료·사냥 전리품·제작품·물약을 합산해요. <b>빈칸 '+bagFree(state)+'칸</b> · 기존 소지품은 삭제되지 않아요.</p>'+
 (next?'<button id="upgradeBag">🧰 '+next.name+' · '+Math.max(next.slots,capacity+next.slots-BAG_TIERS[bag.level-1].slots)+'칸 · '+next.price.toLocaleString('ko-KR')+'G</button>':'<p>👑 최고 단계 가방!</p>')+'</div>'+
 '<div class="mini-card"><strong>🏪 바로 판매하기</strong><p>목재·돌·꽃잎 또는 물고기를 팔아 가방을 비워보세요.</p><div class="pill-row"><button type="button" class="pill-btn" id="bagSellMaterials">🌲 채집 재료 판매하기</button><button type="button" class="pill-btn" id="bagSellFish">🐟 물고기 판매하기</button></div></div>'+
 '<div class="mini-card"><strong>🎟️ 물고기 자동 판매권 '+bag.autoSellTickets+'장</strong>'+
 '<p>보유한 판매용 물고기만 오늘 시세로 한 번에 판매합니다. 도감·사냥 재료·의상은 그대로 유지돼요.</p>'+
 '<button id="autoSellBag" '+(bag.autoSellTickets&&fishTotal?'':'disabled')+'>🎟️ 자동 비우기권 사용</button>'+
 '<button id="buyAutoSellTicket">판매권 1장 구매 · '+AUTO_SELL_PRICE+'G</button><p>잠금한 물고기는 제외해요. 판매권은 1회 일괄 판매용이며 판매 수입 감소 규칙도 적용됩니다. 월간 목표 완수 시 1장 무료!</p></div>'+
 '<div class="pill-row"><button class="pill-btn" id="bagGoMarket">⚓ 판매하러 가기</button>'+
 '<button class="pill-btn ghost" id="bagGoAquarium">🐠 물고기 도감</button>'+
 '<button class="pill-btn ghost" id="bagGoRods">🎣 낚싯대 성장</button></div>'+
 '<h3>🐟 물고기 · 판매 가능 '+fishTotal+'마리</h3><div class="inventory">'+(inventory||'<div class="slot">아직 판매할 물고기가 없어요</div>')+'</div>'+
 '<h3>🌲 채집 재료</h3><p>'+resources+'</p><h3>⚔️ 사냥 전리품</h3><p>'+huntLoot+'</p>'+
 '<h3>🪵 제작품</h3><p>'+crafted+'</p><h3>🧪 물약</h3><p>'+Object.entries(state.hunt?.potions||{}).filter(([,n])=>n>0).map(([id,n])=>({hp:'생명 물약',mp:'마나 물약',hpPlus:'고급 생명 물약',mpPlus:'고급 마나 물약'}[id]||id)+' × '+n).join(' · ')+'</p><p>의상·도감은 가방 칸을 차지하지 않아요. 개인 농작물은 내 농장의 수확 창고에서 확인하세요.</p>');
 document.getElementById('buyAutoSellTicket').onclick=()=>{const r=purchaseAutoSellTicket(state);if(!r.ok){toast(r.error);return}save();hud();openBag();toast('🎟️ 자동 판매권 1장 구매');};
 els.panelBody.querySelectorAll('[data-fish-lock]').forEach(b=>b.onclick=()=>{toggleFishProtection(state,b.dataset.fishLock);save();openBag();});
 document.getElementById('bagSellMaterials').onclick=openMaterialMarket;
 document.getElementById('bagSellFish').onclick=openMarket;
 document.getElementById('bagGoMarket').onclick=openMarket;
 document.getElementById('bagGoAquarium').onclick=openAquarium;
 document.getElementById('bagGoRods').onclick=openFishingGear;
 const upgrade=document.getElementById('upgradeBag');
 if(upgrade)upgrade.onclick=()=>{
  const result=bagUpgrade(state);if(!result.ok){toast(result.error);return}
  save();hud();toast('🎒 가방 '+result.capacity+'칸으로 확장!');openBag();
 };
 document.getElementById('autoSellBag').onclick=()=>{
  if(!fishTotal||!confirm('판매용 물고기 '+fishTotal+'마리를 오늘 시세로 모두 판매하고 자동 판매권 1장을 사용할까요?'))return;
  const result=useAutoSellTicket(state,FISH_BY_NAME,new Date(),lifeLevel());
  if(!result.ok){toast(result.error);return}
  save();hud();toast('🎟️ '+result.sold+'마리 판매 · +'+result.earnings.toLocaleString('ko-KR')+'G');openBag();
 };
}
function guide(){openModal(`<span class="titlebadge">HOW TO PLAY</span><h2>🌿 모여봐요 반말방숲 LIFE 1.5 · 조작법</h2><p style="font-size:14px;line-height:1.9">👆 <b>바닥 터치</b> → 정확한 목적지 이동<br>👉 <b>드래그 유지</b> → 손가락 방향으로 경로 갱신<br>🛑 <b>손 떼기</b> → 마지막 지정 위치에 정지<br>🗺️ <b>지도</b> → 장소 선택 후 자동 길찾기<br>📜 <b>성장 수첩</b> → 목표·보상·다음 목적지 확인<br>🐟 <b>낚시하기</b> → 부두에 가서 낚싯대 던지기<br>🎣 <b>입질</b> → 챔질 → 초록 영역에서 타이밍 맞추기<br>👒 <b>옷가게</b> → 코인으로 새 옷과 모자 구매<br>🌱 <b>텃밭 터치</b> → 작물 수확하고 코인 얻기<br>🎒 <b>가방</b> → 내가 낚은 물고기 확인<br>💾 로그인한 계정의 진행 상황은 Cloudflare 서버에 저장됩니다. 마을 경제와 별도 경제는 서로 다른 장부입니다.</p>`) }
function beginFishing(){
 if(!canStore(state,1)){closeModal();toast('🎒 가방이 가득 찼어요! 수산시장에서 판매하거나 확장해요');return}
 closeModal();stopWalking();
 if(distance(player,{x:1465,y:1177})>190){moveTo(1464,1168,{type:'action',kind:'fish'});toast('🎣 부두로 이동하고 있어요');return}
 fishPhase='wait';hookedFish=null;reelProfile=null;reelMisses=0;fishAttempts=0;castMode=true;
 castUntil=performance.now()+(1300+Math.random()*1700)*rodById(state.fishingGear.equipped).wait;
 els.fishTitle.textContent='🎣 바다에 낚싯대를 던졌어요';
 els.fishDesc.textContent='작은 물고기는 쉽지만 희귀 대어는 여러 번 정확히 릴을 감아야 해요';
 els.fishAction.textContent='찌를 바라보는 중…';els.gauge.style.display='none';els.fishing.classList.add('open');
}
function fishFailure(msg){
 els.fishing.classList.remove('open');fishPhase='idle';castMode=false;hookedFish=null;reelProfile=null;
 toast('💨 '+msg);
}
async function fishingAction(){
 if(fishPhase==='bite'){
  fishPhase='reel';fishAttempts=0;reelMisses=0;gaugePos=0;gaugeDir=1;
  reelDeadline=performance.now()+(reelProfile?.seconds||18)*1000;
  shiftFishingZone();
  els.fishTitle.textContent=hookedFish?.size>=1.8?'💪 대어와 힘겨루기!':'🐟 릴을 감아 올려요!';
  els.fishAction.textContent='✨ 초록 구간에서 릴 감기';
  els.gauge.style.display='block';fishingProgress();return;
 }
 if(fishPhase!=='reel'||!hookedFish||!reelProfile)return;
 const {lower,upper}=setFishingZone();
 if(gaugePos>=lower&&gaugePos<=upper){
  fishAttempts++;party(player.x,player.y-30,8);
  if(fishAttempts>=reelProfile.hits){
   const f=hookedFish;
   fishPhase='settling';els.fishAction.disabled=true;
   const paid=await useWorldEnergy('fish');els.fishAction.disabled=false;
   if(!paid){fishFailure('행동력 확인 후 다시 낚시해 줘');return}
   const isFirst=!state.collection.includes(f.name);
   state.fish++;state.dailyFish++;state.collection.push(f.name);
   const fishLength=Math.round((18+(f.size||1)*37)*(0.78+Math.random()*.72)*10)/10;
   const previous=state.fishRecords[f.name]||{};
   state.fishRecords[f.name]={
    count:(previous.count||0)+1,
    bestCm:Math.max(Number(previous.bestCm)||0,fishLength),
    lastCm:fishLength,
    firstAt:previous.firstAt||nowDay(),
    recordWeightKg:Math.round(Math.pow(fishLength/51,2.65)*10)/10
   };
   if(!state.dailyFishNames.includes(f.name))state.dailyFishNames.push(f.name);
   state.xp+=48+reelProfile.tier*22+(isFirst?30:0);
   if(!addBagItems(state,'fish',f.name,1))toast('🎒 가방이 가득 찼어요. 어시장에 들러보세요');
   hud();save();completeDaily();checkAchievements();
   fishPhase='idle';castMode=false;hookedFish=null;reelProfile=null;
   els.fishing.classList.remove('open');
   toast('🏆 '+f.rarity+' '+f.name+' 포획! '+(isFirst?'✨ 도감 신규 등록 · ':'')+'🎒 물고기 1마리 보관 · 시장에서 판매 가능');
   party(player.x,player.y-75,30);return;
  }
  shiftFishingZone();fishingProgress();
 }else{
  reelMisses++;
  if(reelMisses>=reelProfile.maxMisses){fishFailure('낚싯줄이 끊어졌어요! 다음엔 더 좋은 장비로 도전하세요');return}
  fishAttempts=Math.max(0,fishAttempts-1);fishingProgress();
 }
}

// Compact active fishing timer, fixed above the bottom action bar.
const fishingTimerBadge=document.createElement('button');
fishingTimerBadge.type='button';
fishingTimerBadge.id='villageFishingTimer';
fishingTimerBadge.setAttribute('aria-label','자동낚시 남은 시간 확인');
fishingTimerBadge.style.cssText='display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(165px + env(safe-area-inset-bottom));z-index:42;max-width:calc(100vw - 160px);min-width:138px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1.5px solid #a4c9b4;border-radius:999px;background:#f3fff2ed;color:#255742;font-size:12px;font-weight:850;padding:9px 13px;box-shadow:0 4px 13px #243c2c35;backdrop-filter:blur(8px);pointer-events:auto';
document.body.appendChild(fishingTimerBadge);
fishingTimerBadge.onclick=()=>autoFishPanel();
function updateFishingTimerBadge(){
 const a=autoFishState(state),ms=a.remainingMs;
 if(!autoFishRunning||ms<=0){fishingTimerBadge.style.display='none';return}
 const total=Math.ceil(ms/1000),hh=Math.floor(total/3600),mm=Math.floor(total%3600/60),ss=total%60;
 fishingTimerBadge.textContent='🎣 자동낚시 중 · '+(hh?hh+'시간 ':'')+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
 fishingTimerBadge.style.display='block';
}
setInterval(updateFishingTimerBadge,1000);
// v31: paid automatic fishing at the pier, no offline income, legendary/mythic fish retained.
let autoFishRunning=false,autoFishLast=performance.now(),autoFishNext=0;
function autoFishPanel(){
 const a=autoFishState(state),minutes=Math.ceil(a.remainingMs/60000);
 const cardStyle='border:1px solid #d8c8a6;border-radius:17px;background:linear-gradient(145deg,#fffaf0,#e7f4e9);color:#31584a;box-shadow:0 4px 10px #354f3620;padding:13px 9px;display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;min-height:82px;white-space:normal;line-height:1.3;font-weight:800;font-size:15px';
 openModal('<span class="titlebadge">🎣 FISHING PASS · JUNJA LIFE</span><h2>🐟 반짝반짝 자동낚시</h2><p>🌿 낚시터에서 편하게 물고기를 잡고 골드와 경험치를 모아봐요! 게임 화면이 켜져 있을 때만 작동해요.</p>'+
 '<div style="background:linear-gradient(120deg,#e1f2e9,#fff3d8);border:1px solid #d7dfc6;border-radius:18px;padding:13px;margin:12px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;color:#315548;font-weight:750;font-size:13px">'+
 '<div>⏳ 남은 시간<br><strong style="font-size:18px">'+minutes+'분</strong></div><div>🐟 잡은 물고기<br><strong style="font-size:18px">'+a.catches+'마리</strong></div><div>💰 누적 수익<br><strong>'+a.earned.toLocaleString()+'G</strong></div><div>⭐ 누적 경험치<br><strong>'+(a.xpEarned||0).toLocaleString()+'XP</strong></div>'+
 '</div><p style="font-size:13px">💎 전설·신화 물고기는 자동 판매하지 않고 가방에 보관해요. · 보관 '+a.protected+'마리</p>'+
 '<h3 style="margin:15px 0 8px">🎟️ 이용권 고르기</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'+AUTO_FISH_PASSES.map(p=>'<button style="'+cardStyle+'" data-autofish-buy="'+p.hours+'"><span style="font-size:21px">'+(p.hours>=12?'👑':p.hours>=6?'💎':'🎣')+'</span><span>'+p.hours+'시간권</span><span style="color:#aa7a3d;font-size:13px">'+p.price.toLocaleString()+' G</span></button>').join('')+'</div>'+
 '<p style="margin:12px 0;font-size:13px">현재 '+(autoFishRunning?'🟢 자동낚시 중':'⏸ 대기 중')+' · 보유 '+Math.floor(state.coins).toLocaleString()+'G</p>'+
 '<button class="pill-btn" style="width:100%;background:linear-gradient(120deg,#91c6aa,#c5e5cf);color:#254d3d;border-radius:16px;padding:15px" id="autoFishToggle">'+(autoFishRunning?'⏹ 자동낚시 일시정지':'▶ 자동낚시 시작하기')+'</button>');
 els.panelBody.querySelectorAll('[data-autofish-buy]').forEach(b=>b.onclick=()=>{const r=buyAutoFish(state,b.dataset.autofishBuy);toast(r.ok?'🎣 이용권 구매 완료':r.error||'골드 부족');save();hud();autoFishPanel()});
 const toggle=document.getElementById('autoFishToggle');if(toggle)toggle.onclick=()=>{if(autoFishRunning){autoFishRunning=false;toast('자동낚시 일시정지')}else if(!autoFishState(state).remainingMs){toast('먼저 이용권을 구매하세요')}else{autoFishRunning=true;autoFishLast=performance.now();autoFishNext=performance.now()+11000;fishPhase='idle';els.fishing.classList.remove('open');toast('🎣 자동낚시 시작!')}closeModal();save()};
}
async function autoFishTick(){
 const now=performance.now(),elapsed=Math.max(0,Math.min(1000,now-autoFishLast));autoFishLast=now;
 if(!autoFishRunning){updateFishingTimerBadge();return}
 const a=autoFishState(state);
 if(!a.remainingMs){autoFishRunning=false;toast('🎣 자동낚시 이용권 종료');save();return}
 if(document.hidden)return;
 a.remainingMs=Math.max(0,a.remainingMs-elapsed);
 updateFishingTimerBadge();
 if(now<autoFishNext)return;
 autoFishNext=now+12000+Math.random()*9000;
 // Lower efficiency than manual play; gear improves the chance of a catch.
 const rod=rodById(state.fishingGear.equipped);
 if(Math.random()>.58+Math.min(.22,(1-rod.wait)*.3))return;
 const fish=FISH[fishRoll(Math.random(),state.fishingGear.equipped,lifeLevel())];
 // The manual difficulty still matters: larger fish are harder to land automatically.
 if(Math.random()<Math.min(.8,Math.max(.08,(fish.size||1)*.13)))return;
 if(!await useWorldEnergy('fish')){autoFishRunning=false;toast('⚡ 행동력 부족으로 자동낚시 정지');save();return}
 const result=autoFishCatch(state,fish,lifeLevel());
 if(!result.ok){autoFishRunning=false;toast('🎒 자동낚시 정지: '+(result.error||'보관 또는 판매 실패'));save();return}
 state.fish++;state.dailyFish++;state.collection.push(fish.name);const gainedXp=36+Math.min(18,Math.max(0,Number(fish.size)||0)*5);state.xp+=gainedXp;autoFishState(state).xpEarned=(autoFishState(state).xpEarned||0)+gainedXp;
 state.fishRecords[fish.name]??={count:0,bestCm:0};
 state.fishRecords[fish.name].count++;
 if(!state.dailyFishNames.includes(fish.name))state.dailyFishNames.push(fish.name);
 hud();save();
 if(result.protected)toast('🏆 '+fish.name+' 전설급 자동 보관!');
}
setInterval(autoFishTick,500);

els.fishAction.addEventListener('click',fishingAction);document.getElementById('worldClock').addEventListener('click',openSeasons);document.getElementById('socialStatus').onclick=openSocial;document.getElementById('shopBtn').onclick=()=>openShop();document.getElementById('bagBtn').onclick=openBag;document.getElementById('guideBtn').onclick=openJournal;document.getElementById('farmBtn').onclick=farmAll;document.getElementById('decorBtn').onclick=()=>{if(placeDecor)cancelDecorationPlacement();openDecor()};document.getElementById('craftBtn').onclick=openCraft;document.getElementById('fishBtn').onclick=beginFishing; // 이용권은 낚시 장비 상점에서만 판매합니다.
 const gearShortcut=document.getElementById('fishGear');
 if(gearShortcut)gearShortcut.onclick=()=>{els.fishing.classList.remove('open');fishPhase='idle';openFishingGear()};document.getElementById('mapButton').onclick=()=>openModal('<span class="titlebadge">WORLD MAP</span><h2>🗺️ 모여봐요 반말방숲 안내</h2><p>🐟 바다상점은 서쪽 · 🏠 집은 북동쪽 · 🌱 농장은 남쪽 · 🎣 낚시는 동남쪽 부두</p><button class="pill-btn" id="mapGuide">조작법 확인</button>');
function showRenderError(error){
 const panel=document.getElementById('renderError');panel.hidden=false;
 const reason=document.getElementById('renderErrorReason');
 if(reason)reason.textContent=String(error?.message||error||'그래픽 컨텍스트를 사용할 수 없습니다').slice(0,220);
}
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();save();showRenderError('그래픽 컨텍스트가 중단됐습니다. 다시 열기를 눌러 복구하세요.');});
cv.addEventListener('webglcontextrestored',()=>location.reload());
try{world3D=createWorld({canvas:cv,width:W,height:H,stations,resources:resourceNodes,beds:bedCenters,npcs,animals:animalFriends,walkable,nickname:socialNickname})}catch(error){console.error(error);showRenderError(error);}
els.name.textContent=socialNickname;initJourney();installVillageDockV49();connectSocial();
installQualityHUD({
 snapshot:()=>{
  const resource=resourceNodes.filter(n=>distance(player,n)<105&&!(state.nodeReady[n.id]>Date.now())).sort((a,b)=>distance(player,a)-distance(player,b))[0];
  const npc=npcs.find(n=>distance(player,n)<100);
  const station=stations.filter(s=>distance(player,s)<125).sort((a,b)=>distance(player,a)-distance(player,b))[0];
  const context=resource?{type:'resource',id:resource.id,label:(resource.kind==='wood'?'🪓 목재 채집':resource.kind==='stone'?'⛏️ 돌 채집':'🌼 꽃잎 채집')}:npc?{type:'npc',npc,label:'💬 '+npc.name+'와 대화'}:station?{type:'station',id:station.id,label:station.icon+' '+station.name}:null;
  return {used:bagUsed(state),capacity:bagCapacity(state),context,busy:els.modal.classList.contains('open')||fishPhase!=='idle'||!!placeDecor};
 },onBag:openBag,onMarket:openMarket,onJourney:openJourney,onMap:openWorldMap,
 onContext:context=>{if(context.type==='resource')gather(context.id);else if(context.type==='npc')openNpc(context.npc);else openStation(context.id)}
});

// Preview-only owner funding: bearer link, NOT server-side authentication.
// No grants to ordinary players; this prototype has only local browser saves.
function redeemOperatorPreviewGift(){
 const url=new URL(location.href),code=url.searchParams.get('ownerGift');
 if(!code)return;
 url.searchParams.delete('ownerGift');
 history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 if(!globalThis.crypto?.subtle)return;
 crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)).then(buffer=>{
  const actual=Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
  if(actual!=='4a08435d3ba8b56ec030b07c4ae6978ebfbe398174625e632cb792b656df09e2')return;
  const firstClaim=!state.operatorGiftV21;
  if(firstClaim){
   state.operatorGiftV21=true;
   state.coins=Math.max(100000000,Number.isFinite(Number(state.coins))?Number(state.coins):800);
   save();hud();toast('👑 운영자 미리보기 지원금 1억 G 지급 완료!');
  }
  showOperatorNickname();
 }).catch(()=>{});
}
redeemOperatorPreviewGift();
setTimeout(()=>{els.welcome.style.opacity=0},5500);window.__JUNJA_TEST__={getRenderer:()=>world3D?.stats(),goToBusinessDistrict:()=>goStation(BUSINESS_PORTAL_V42.id),getDistrictPortal:()=>({open:!!workshopPlaza,entry:{x:BUSINESS_PORTAL_V42.x,y:BUSINESS_PORTAL_V42.y},avatar:{x:player.x,y:player.y},modal:els.modal.classList.contains('open')}),getNavSafe:()=>navigation.safe(player),probeTap:(sx,sy)=>{const p=screenWorld(sx,sy),hit=world3D?.pick(sx,sy),route=navigation.route(player,p);return {screen:{x:sx,y:sy},world:p,hit,safe:navigation.safe(p),reachable:route.length>0,endpoint:route.at(-1)||null,actor:{x:player.x,y:player.y}}},getPeers:()=>Object.values(peers).map(p=>({id:p.id,x:p.x,y:p.y,targetX:p.targetX,targetY:p.targetY,coat:p.coat,nick:p.nick})),getNavigation:()=>({path:path.map(p=>({...p})),goal,camera:{...camera},scale}),getJourney:()=>({chapter:state.chapter,materials:state.materials,crafted:state.crafted,stations:stations.map(s=>s.id)}),getSeason:()=>state.season,setSeason:(s)=>{if(seasonLabels[s]){state.season=s;save()}},getAnimalFriends:()=>animalFriends.map(a=>({id:a.id,x:a.x,y:a.y,friendship:state.animalBonds[a.id]?.love||0})),getLifeSystems:()=>({rod:{...state.fishingGear},aquarium:{...state.aquarium},home:{...state.home},fish:FISH.length,eligible:eligibleFish(state.fishingGear.equipped,lifeLevel()).length,missions:dailyTask()}),getCatalog:()=>CATALOG.map(({id,type,price,grade})=>({id,type,price,grade})),getState:()=>({nickname:socialNickname,festival:{week:state.festival?.week,claimed:state.festival?.claimed,attendance:state.attendance},player:{...player},fashion:{owned:[...state.fashion.owned],equipped:{...state.fashion.equipped}},coins:state.coins,fish:state.fish,phase:fishPhase,fishing:hookedFish?{name:hookedFish.name,tier:hookedFish.tier,profile:reelProfile,progress:fishAttempts,misses:reelMisses}:null,owned:[...owned],outfit:state.coat,hat:state.hat,gauge:gaugePos,pathlen:path.length,beds:state.beds,decorations:state.decorations,daily:dailyTask(),friends:state.friends}),openBag,openMarket,openEconomyDashboard,openBaitShop,moveTo,beginFishing,openShop,openFarmShop,farmAt,openDecor,placeAt,openHome,openNpc,openMarket,openCraft,openJournal,openSocial};
})();