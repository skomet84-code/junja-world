// JUNJA Village simulated local economy v28.
// All figures are in GAME coins (G), not fiat. Multiplayer financial settlement
// requires authenticated identities + server-side durable transaction ledger.
// This module provides game balance, deterministic quotes and local audit UX only.
const zero=n=>Math.max(0,Math.floor(Number(n)||0));
const MAX_BALANCE=1e12,MAX_RECEIPT=1000000,MAX_JOURNAL=90;
const CAT_CAPS=Object.freeze({
 harvest:[950,55],hunt:[1300,95],deliver:[850,55],fish:[1350,85],
 quest:[3200,120],social:[520,30],festival:[2600,90],other:[1000,40]
});
export const ECONOMY_POLICY=Object.freeze({
 name:'준자마을 물가 안정 v28',starterG:1000,
 philosophy:'모든 NPC 돈 발행량을 추적하고, 활동별 보상이 점차 줄어듭니다. 아이템 구입·제작·서비스는 게임 머니를 회수합니다.',
 softCap:'활동별 하루 기준을 넘으면 기본 보상의 25%, 2배 초과 시 10%까지 줄어듭니다.',
 minReward:1,stableCoin:'G'
});
const dayKey=date=>date.toLocaleDateString('en-CA');
export function economyCeiling(kind,level=1){const [base,step]=CAT_CAPS[kind]||CAT_CAPS.other;return base+step*Math.min(80,Math.max(1,zero(level)))}
export function initEconomy(s,date=new Date()){
 if(!s.economy||typeof s.economy!=='object'||Array.isArray(s.economy))s.economy={};
 const e=s.economy,day=dayKey(date);
 e.totalMinted=zero(e.totalMinted);e.totalBurned=zero(e.totalBurned);
 if(!Array.isArray(e.journal))e.journal=[];
 e.journal=e.journal.slice(-MAX_JOURNAL);
 if(e.day!==day){e.day=day;e.earned=0;e.spent=0;e.categories={};e.trades=0}
 e.earned=zero(e.earned);e.spent=zero(e.spent);
 if(!e.categories||typeof e.categories!=='object')e.categories={};
 e.trades=zero(e.trades);
 if(!Number.isFinite(s.coins)||s.coins<0)s.coins=0;
 return e;
}
const checkPrice=amount=>Number.isFinite(amount)&&Number.isSafeInteger(amount)&&amount>=0&&amount<=MAX_RECEIPT;
function receipt(s,type,amount,kind,reason,date=new Date()){
 const e=initEconomy(s,date),value=zero(amount);
 e.journal.push({at:date.toISOString(),type,value,kind,reason:String(reason||'거래').slice(0,60),balance:zero(s.coins)});
 if(e.journal.length>MAX_JOURNAL)e.journal.splice(0,e.journal.length-MAX_JOURNAL);
}
export function credit(s,amount,kind='other',reason='게임 보상',level=1,date=new Date()){
 initEconomy(s,date);
 if(!checkPrice(amount))return {ok:false,amount:0,error:'보상 금액 오류'};
 const gross=zero(amount),e=s.economy,prior=zero(e.categories[kind]),limit=economyCeiling(kind,level);
 // Daily allowance is not a hard stop: players can always earn a little,
 // but grinding alone cannot endlessly mint near-full-price G.
 const milestone=['chapter','achievement','reputation','collection','friendship'].includes(kind);
 const full=milestone?gross:Math.min(gross,Math.max(0,limit-prior));
 const quarter=Math.min(gross-full,Math.max(0,limit*2-Math.max(limit,prior+full)))*.25;
 const remaining=Math.max(0,gross-full-Math.max(0,quarter)*4);
 const reduced=Math.max(0,Math.floor(full+quarter+remaining*.1));
 const actual=Math.min(MAX_BALANCE-zero(s.coins),gross?Math.max(1,reduced):0);
 s.coins=zero(s.coins)+actual;
 e.categories[kind]=prior+gross;
 e.totalMinted+=actual;e.earned+=actual;
 receipt(s,'earn',actual,kind,reason,date);
 return {ok:true,amount:actual,requested:gross,softCapped:actual<gross,dayCap:limit};
}
export function debit(s,amount,kind='shop',reason='아이템 구매',date=new Date()){
 initEconomy(s,date);
 if(!checkPrice(amount))return {ok:false,amount:0,error:'거래 금액 오류'};
 const cost=zero(amount);
 if(s.coins<cost)return {ok:false,amount:0,error:'게임 머니가 부족해요'};
 s.coins-=cost;s.economy.totalBurned+=cost;s.economy.spent+=cost;
 receipt(s,'spend',cost,kind,reason,date);
 return {ok:true,amount:cost};
}
export function moneyHistory(s,date=new Date()){const e=initEconomy(s,date);return e.journal.slice().reverse()}
const MARKET_NAMES=Object.freeze(['등대 수산시장','봄날 교역소','달빛 어시장','별빛 해산물 축제','마을 주민 장터','정원 연안시장','준자 항구 특별 경매']);
const hash=x=>[...x].reduce((h,c)=>((h*31+c.charCodeAt(0))>>>0),7);
export function marketDay(date=new Date()){
 const day=dayKey(date),id=(hash(day)%MARKET_NAMES.length);
 const featured=(hash(day+'fish')%3);
 return {day,name:MARKET_NAMES[id],featured,multiplier:featured===0?1.18:featured===1?1.12:1.08};
}
export function quoteFish(f,date=new Date(),record=null){
 if(!f)return 0;
 const demand=marketDay(date),base=zero(f.base),variety=hash(f.name+'-'+demand.day)%26;
 const factor=.58+variety/100+(hash(f.name)%3===demand.featured?demand.multiplier-1:0);
 const size=record?.lastCm&&record?.bestCm?Math.max(.92,Math.min(1.16,record.lastCm/record.bestCm)) :1;
 return Math.max(1,Math.round(base*factor*size));
}
export function initializeFishStock(s){
 if(!s.fishStock||typeof s.fishStock!=='object'||Array.isArray(s.fishStock))s.fishStock={};
 for(const [k,v] of Object.entries(s.fishStock))s.fishStock[k]=Math.min(100000,zero(v));
 return s.fishStock;
}
export function addFishStock(s,fishName,count=1){
 const stock=initializeFishStock(s);if(!fishName||typeof fishName!=='string')return false;
 const n=zero(count);stock[fishName]=Math.min(100000,zero(stock[fishName])+n);return true;
}
export function sellFish(s,fish,date=new Date(),level=1){
 const stock=initializeFishStock(s);if(!fish||zero(stock[fish.name])<1)return {ok:false,error:'판매할 물고기가 없어요'};
 const quoted=quoteFish(fish,date,s.fishRecords?.[fish.name]);
 // Inventory selling consumes one actual fish. Historical collection and museum remain.
 const r=credit(s,quoted,'fish','수산시장 판매 · '+fish.name,level,date);
 if(!r.ok)return r;
 stock[fish.name]-=1;s.economy.trades++;return {...r,quoted,fishName:fish.name};
}
export const BAITS=Object.freeze([
 {id:'basic',name:'기본 미끼 10개',count:10,price:180,boost:0,icon:'🪱',desc:'낚시 입질이 조금 빨라져요'},
 {id:'premium',name:'반짝 미끼 10개',count:10,price:900,boost:.11,icon:'✨',desc:'희귀 어종을 만날 확률을 조금 높여요'},
 {id:'royal',name:'로열 미끼 10개',count:10,price:3500,boost:.23,icon:'👑',desc:'고급 낚싯대와 함께 사용하면 효과적'}
]);
export function buyBait(s,id,date=new Date()){
 const bait=BAITS.find(x=>x.id===id);if(!bait)return {ok:false,error:'존재하지 않는 미끼'};
 const r=debit(s,bait.price,'fishing','낚시 미끼 · '+bait.name,date);if(!r.ok)return r;
 s.baitInventory=s.baitInventory||{};s.baitInventory[id]=zero(s.baitInventory[id])+bait.count;return {...r,bait};
}
export function chooseBait(s,id){
 if(id!=='none'&&!BAITS.some(x=>x.id===id))return false;
 s.baitEquipped=id;return true;
}
export function useBait(s){
 const inv=s.baitInventory||{},id=s.baitEquipped||'none';
 if(id==='none'||zero(inv[id])===0)return null;
 inv[id]--;return BAITS.find(b=>b.id===id)||null;
}
export function adjustCatchRoll(roll,bait){
 const r=Math.max(0,Math.min(.999999,Number(roll)||0));
 if(!bait||!bait.boost)return r;
 // Fish selection is a weighted CDF, higher rolls favour later unlocked rarities.
 return Math.min(.999999,1-Math.pow(1-r,1+bait.boost*2));
}
