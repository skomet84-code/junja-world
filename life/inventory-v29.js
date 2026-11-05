// Village inventory v29. Historical museum catches are NOT physical inventory.
// Existing possessions are never deleted if their total exceeds a new bag tier.
import {debit,sellFish,quoteFish} from './economy-v28.js';
const count=n=>Math.max(0,Math.floor(Number(n)||0));
export const BAG_TIERS=Object.freeze([
 {level:1,slots:24,price:0,name:'새싹 가방'},
 {level:2,slots:40,price:2600,name:'튼튼한 가방'},
 {level:3,slots:64,price:9200,name:'여행자 가방'},
 {level:4,slots:100,price:29000,name:'모험가 가방'},
 {level:5,slots:150,price:85000,name:'장인의 수납 가방'},
 {level:6,slots:220,price:210000,name:'로열 수집 가방'},
 {level:7,slots:320,price:520000,name:'갓준자 전설 가방'}
].map(o=>Object.freeze(o)));
export function bagUsed(s){
 const fields=[s.fishStock,s.materials,s.hunt?.materials,s.crafted,s.hunt?.potions];
 return fields.reduce((a,b)=>a+Object.values(b||{}).reduce((t,n)=>t+count(n),0),0);
}
export function initBag(s){
 if(!s.bag||typeof s.bag!=='object'||Array.isArray(s.bag))s.bag={};
 const b=s.bag,before=bagUsed(s);
 b.level=Math.min(BAG_TIERS.length,Math.max(1,count(b.level)||1));
 // A grandfathered legacy volume protects pre-v29 items without confiscation.
 if(b.legacyAllowance===undefined)b.legacyAllowance=before;
 b.legacyAllowance=Math.max(0,count(b.legacyAllowance));
 b.legacyExpansion=count(b.legacyExpansion);
 b.autoSellTickets=count(b.autoSellTickets);
 if(!Array.isArray(b.protectedFish))b.protectedFish=[];
 return b;
}
export function bagCapacity(s){
 const b=initBag(s);
 return Math.max(BAG_TIERS[b.level-1].slots,b.legacyAllowance+(b.legacyExpansion||0));
}
export function bagFree(s){return Math.max(0,bagCapacity(s)-bagUsed(s))}
export function canStore(s,amount=1){return bagFree(s)>=count(amount)}
export function addBagItems(s,kind,name,amount=1){
 const n=count(amount);if(!n||!name||!canStore(s,n))return false;
 const table=kind==='fish'?(s.fishStock??={}):kind==='hunt'?(s.hunt??={},s.hunt.materials??={}):kind==='crafted'?(s.crafted??={}):(s.materials??={});
 table[name]=count(table[name])+n;return true;
}
export function bagUpgrade(s){
 const b=initBag(s),next=BAG_TIERS[b.level];
 if(!next)return {ok:false,error:'이미 최고 단계 가방'};
 const purchase=debit(s,next.price,'storage','가방 확장 · '+next.name);
 if(!purchase.ok)return purchase;
 if(bagCapacity(s)>BAG_TIERS[b.level-1].slots)b.legacyExpansion=(b.legacyExpansion||0)+next.slots-BAG_TIERS[b.level-1].slots;
 b.level=next.level;
 return {ok:true,price:next.price,capacity:bagCapacity(s)};
}
export function claimEventAutoSellTicket(s,month){
 const b=initBag(s),period=String(month||'').slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(period))return false;
 if(!Array.isArray(b.claimedMonths))b.claimedMonths=[];
 if(b.claimedMonths.includes(period))return false;
 b.claimedMonths.push(period);b.autoSellTickets++;
 return true;
}
export function useAutoSellTicket(s,fishByName,date=new Date(),level=1){
 const b=initBag(s);
 if(!b.autoSellTickets)return {ok:false,error:'자동 판매권이 없어요'};
 const targets=Object.entries(s.fishStock||{}).filter(([name,n])=>count(n)>0&&fishByName[name]&&!b.protectedFish.includes(name));
 const available=targets.reduce((v,[,n])=>v+count(n),0);
 if(!available)return {ok:false,error:'판매 가능한 물고기가 없어요'};
 // Batch price is exactly the manual quote at this moment, and the daily
 // NPC earning limit applies to every individual sale as normal.
 let sold=0,earnings=0;
 for(const [name,n] of targets)for(let i=0;i<count(n);i++){
  const r=sellFish(s,fishByName[name],date,level);
  if(!r.ok)break;
  sold++;earnings+=r.amount;
 }
 if(!sold)return {ok:false,error:'판매 실패'};
 b.autoSellTickets--;return {ok:true,sold,earnings,quoted:targets.reduce((v,[name,n])=>v+quoteFish(fishByName[name],date)*count(n),0)};
}

export const AUTO_SELL_PRICE=350;
export function purchaseAutoSellTicket(s){
 const b=initBag(s),r=debit(s,AUTO_SELL_PRICE,'service','물고기 자동 판매권');
 if(r.ok)b.autoSellTickets++;return r;
}
export function toggleFishProtection(s,name){
 const b=initBag(s),i=b.protectedFish.indexOf(name);
 if(i<0)b.protectedFish.push(name);else b.protectedFish.splice(i,1);
 return i<0;
}
