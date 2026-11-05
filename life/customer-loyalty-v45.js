// v45 — long-term resident loyalty, weekly store recognition and rare repeat-customer orders.
// All monetary operations are pure until committed via the authenticated v36/v37 DB transaction.
import {NPC_SHOPPERS} from './resident-demand-v44.js';
import {WORKSHOP_PRODUCTS} from './business-v40.js';
import {currentProfession,kstProfessionDay} from './professions-v39.js';
import {businessWeekBeginning} from './business-v40.js';

export const VIP_MIN_DISTINCT_DAYS=3;
export const VIP_WEEKLY_LIMIT=1;
export const VIP_ORDER_QUANTITY=2;
export const VIP_TAX_PERCENT=15;
export const VIP_SERVICE_FEE=300;
export const VIP_MAX_GROSS=10_000;
export const MAX_TRIAL_GOLD=1_000_000_000_000;
export const LOYALTY_TIERS=Object.freeze([
 Object.freeze({days:0,title:'첫 방문'}),
 Object.freeze({days:3,title:'단골'}),
 Object.freeze({days:7,title:'VIP 단골'}),
 Object.freeze({days:15,title:'마을의 가족'})
]);
const deny=(message,status=409)=>{const err=new Error(message);err.status=status;throw err};
const number=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const validStock=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000;
export function weeklyStart(now=new Date()){return businessWeekBeginning(now).toISOString()}
export function loyaltyTier(days){
 const count=number(days);
 return [...LOYALTY_TIERS].reverse().find(x=>count>=x.days);
}
export function validateLoyaltyRows(rows=[]){
 // Rows are counts of distinct successful dates from server receipts, never browser submissions.
 if(!Array.isArray(rows))deny('단골 거래 이력을 확인할 수 없습니다',500);
 const counts=Object.fromEntries(Object.keys(NPC_SHOPPERS).map(id=>[id,0]));
 for(const entry of rows){
  if(!entry||!Object.hasOwn(NPC_SHOPPERS,entry.npc_id)||!Number.isSafeInteger(Number(entry.days))||
   Number(entry.days)<0||Number(entry.days)>100_000)
   deny('서버 단골 거래 기록이 올바르지 않아요',500);
  counts[entry.npc_id]=Number(entry.days);
 }
 return counts;
}
export function vipQuote(npcId,now=new Date()){
 if(!Object.hasOwn(NPC_SHOPPERS,npcId))deny('존재하지 않는 특별 손님입니다',400);
 const shopper=NPC_SHOPPERS[npcId];
 const product=WORKSHOP_PRODUCTS[shopper.product];
 const gross=Math.min(VIP_MAX_GROSS,Math.floor(product.sell*.65)*VIP_ORDER_QUANTITY);
 const tax=Math.ceil(gross*VIP_TAX_PERCENT/100);
 const net=gross-tax-VIP_SERVICE_FEE;
 if(net<=0)deny('주민 특별주문의 계산이 올바르지 않습니다',500);
 return {npcId,customer:shopper.name,role:shopper.role,item:shopper.product,
  itemName:product.label,quantity:VIP_ORDER_QUANTITY,gross,tax,fee:VIP_SERVICE_FEE,net,
  weekStart:weeklyStart(now)};
}
export function loyaltyView(state,counts={},now=new Date()){
 const current=currentProfession(state)?.active||null;
 const week=weeklyStart(now),old=state?.vipOrders;
 const already=old?.weekStart===week&&old?.npcId&&Object.hasOwn(NPC_SHOPPERS,old.npcId)?old.npcId:null;
 const result={weekStart:week,active:current,weeklyUsed:!!already,
  vipLimit:VIP_WEEKLY_LIMIT,customers:[]};
 for(const npcId of Object.keys(NPC_SHOPPERS)){
  const quote=vipQuote(npcId,now),days=number(counts[npcId]);
  const shop=state?.workshops?.[quote.role];
  const own=!!shop&&Number.isInteger(shop.level)&&shop.level>=1&&shop.level<=3;
  const inventory=state?.stock?.[quote.item];
  const stock=validStock(inventory)?inventory:0;
  result.customers.push({...quote,days,tier:loyaltyTier(days).title,
   unlockAt:VIP_MIN_DISTINCT_DAYS,remainingVisits:Math.max(0,VIP_MIN_DISTINCT_DAYS-days),
   owned:own,stock,canAccept:days>=VIP_MIN_DISTINCT_DAYS&&!already&&
    own&&current===quote.role&&stock>=VIP_ORDER_QUANTITY,
   fulfilled:already===npcId});
 }
 return result;
}
export function fulfillVipOrder(snapshot,npcId,counts,now=new Date()){
 const view=loyaltyView(snapshot,counts,now);
 const contract=view.customers.find(c=>c.npcId===npcId);
 if(!contract)deny('존재하지 않는 특별 주문입니다',400);
 if(contract.days<VIP_MIN_DISTINCT_DAYS)deny('서버 거래 기록상 단골 3회 방문이 필요해요');
 if(view.weeklyUsed)deny('이번 주 특별 주문은 이미 완료했어요');
 if(!contract.owned||view.active!==contract.role)deny('현재 직업과 실제 사업장이 필요해요',403);
 if(!snapshot||!Number.isSafeInteger(snapshot.coins)||snapshot.coins<0||snapshot.coins>MAX_TRIAL_GOLD)
  deny('시험 경제 지갑 기록을 검증할 수 없어요',500);
 if(!snapshot.stock||typeof snapshot.stock!=='object'||Array.isArray(snapshot.stock))
  deny('서버 창고 기록을 확인할 수 없어요',500);
 const stock=snapshot.stock[contract.item];
 if(!validStock(stock)||stock<VIP_ORDER_QUANTITY)deny('전문 생산품 2개가 창고에 필요해요');
 if(snapshot.coins+contract.net>MAX_TRIAL_GOLD)deny('시험 골드 최대 보유 한도를 초과했어요');
 const next=structuredClone(snapshot);
 next.stock[contract.item]-=VIP_ORDER_QUANTITY;
 next.coins+=contract.net;
 next.vipOrders={weekStart:contract.weekStart,npcId,quantity:VIP_ORDER_QUANTITY,
  net:contract.net}; // Persisted for replay protection independent from event query.
 return {next,delta:contract.net,contract,description:contract.customer+'님의 특별 단골 주문 납품'};
}
export function weeklyScore(rows=[]){
 if(!Array.isArray(rows))deny('랭킹 장부 검증에 실패했어요',500);
 return rows.map((r,index)=>({rank:index+1,name:String(r.name||'주민').slice(0,32),
   sales:number(Number(r.sales)),net:number(Number(r.net)),weekStart:r.week_start||null}));
}
