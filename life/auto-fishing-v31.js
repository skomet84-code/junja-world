// Auto-fishing v31. Runs only while the game page is open; no offline rewards.
import {debit,sellFish,addFishStock} from './economy-v28.js';
import {canStore,addBagItems,initBag} from './inventory-v29.js';
export const AUTO_FISH_PASSES=Object.freeze([{hours:1,price:50000},{hours:3,price:180000},{hours:6,price:450000},{hours:12,price:1100000},{hours:24,price:2500000}]);
export function autoFishState(s){if(!s.autoFishing||typeof s.autoFishing!=='object')s.autoFishing={remainingMs:0,catches:0,sold:0,earned:0,protected:0,attempts:0};const a=s.autoFishing;a.remainingMs=Math.max(0,Math.min(86400000*7,Number(a.remainingMs)||0));return a}
export function buyAutoFish(s,hours){const pass=AUTO_FISH_PASSES.find(x=>x.hours===Number(hours));if(!pass)return {ok:false,error:'없는 이용권'};const r=debit(s,pass.price,'fishing','자동낚시 '+hours+'시간권');if(!r.ok)return r;autoFishState(s).remainingMs+=hours*3600000;return {ok:true}}
// v55 auto-fishing: always auto-sell common/fine/rare/hero fish without
// using one bag slot. Legend/mythic catches remain a genuine inventory item.
// Existing manual-protection locks are still respected and never sold silently.
export function autoFishCatch(s,fish,level){
 const a=autoFishState(s);
 a.attempts++;
 if(!fish)return {ok:false,error:'물고기 정보가 없어'};
 const legendary=['legend','mythic'].includes(fish.tier);
 const locked=initBag(s).protectedFish.includes(fish.name);
 if(legendary||locked){
  if(!canStore(s,1))return {ok:false,error:'보관할 물고기 가방 공간 부족'};
  if(!addBagItems(s,'fish',fish.name,1))return {ok:false,error:'가방에 보관하지 못했어'};
  a.protected++;a.catches++;
  return {ok:true,protected:true,kind:legendary?'legendary':'manual-lock'};
 }
 // Direct sale: entering/exiting the bag is not necessary. The quoted NPC
 // payout still uses the existing daily soft cap and never bypasses it.
 const old=Number(s.fishStock?.[fish.name]||0);
 if(!addFishStock(s,fish.name,1))return {ok:false,error:'자동낚시 어시장 입고 실패'};
 const sale=sellFish(s,fish,new Date(),level);
 if(!sale.ok){
  s.fishStock[fish.name]=old;
  return {ok:false,error:sale.error||'자동낚시 즉시 판매 실패'};
 }
 a.catches++;a.sold++;a.earned+=sale.amount||0;
 return {ok:true,sold:true,earned:sale.amount||0,quoted:sale.quoted||0};
}
