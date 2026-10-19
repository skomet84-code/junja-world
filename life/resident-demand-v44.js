// v44: resident-funded DAILY specialist purchase orders on the isolated v36 trial economy.
// Server selects buyer, price, tax and daily caps. Client submits only a public NPC id.
// No timers, global uncontrolled cash minting, shared official gold, or hidden NPC spending.
import {WORKSHOP_PRODUCTS,WORKSHOP_TYPES} from './business-v40.js';
import {kstProfessionDay,currentProfession} from './professions-v39.js';
export const NPC_SHOPPERS=Object.freeze({
 tobi:Object.freeze({name:'🎣 토비',role:'farmer',product:'berry_box',message:'낚시 친구들과 딸기 상자를 나눠 먹고 싶어!'}),
 rina:Object.freeze({name:'👒 리나',role:'chef',product:'artisan_tart',message:'오늘은 예쁜 과일 타르트를 준비하고 싶어.'}),
 yuni:Object.freeze({name:'🌷 유니',role:'merchant',product:'festival_basket',message:'꽃 축제에 보낼 선물세트를 구하고 있어.'})
});
export const NPC_ORDER_DAILY_LIMIT=2;
export const NPC_ORDER_DAILY_GROSS_CAP=10_000;
export const NPC_ORDER_TAX_PERCENT=12;
export const NPC_ORDER_MAX_UNIT_GROSS=6000;
const LIMIT=1_000_000_000_000;
const reject=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const validMoney=x=>Number.isSafeInteger(x)&&x>=0&&x<=LIMIT;
const validStock=x=>Number.isSafeInteger(x)&&x>=0&&x<=1_000_000;
export function npcDemandDay(now=new Date()){return kstProfessionDay(now)}
export function residentBuyerQuote(npcId,now=new Date()){
 const buyer=NPC_SHOPPERS[npcId];
 if(!buyer)reject('존재하지 않는 주민 주문입니다',400);
 const day=npcDemandDay(now),yyyymmdd=day.replace(/-/g,'');
 // Stable fluctuating resident budget within ±8%; server recomputes, never accepts a price from client.
 const shift=(Number(yyyymmdd.slice(-4))+npcId.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%17-8;
 const product=WORKSHOP_PRODUCTS[buyer.product];
 const rate=64+shift; // 56-72% of existing specialist MSRP.
 const gross=Math.min(NPC_ORDER_MAX_UNIT_GROSS,Math.floor(product.sell*rate/100));
 const tax=Math.ceil(gross*NPC_ORDER_TAX_PERCENT/100);
 return {npcId,day,role:buyer.role,buyer:buyer.name,message:buyer.message,
  item:buyer.product,itemName:product.label,gross,tax,net:gross-tax,
  demand:shift>=4?'수요 높음':shift<=-4?'수요 낮음':'수요 보통'};
}
export function npcOrdersView(state,now=new Date()){
 const day=npcDemandDay(now),log=state?.residentOrders;
 const count=log?.day===day&&Array.isArray(log.used)?log.used.filter(id=>Object.hasOwn(NPC_SHOPPERS,id)).length:0;
 const spent=log?.day===day&&Number.isSafeInteger(log.spent)?log.spent:0;
 const active=currentProfession(state)?.active||null;
 return {day,active,dailyLimit:NPC_ORDER_DAILY_LIMIT,used:Math.min(NPC_ORDER_DAILY_LIMIT,count),
  remaining:Math.max(0,NPC_ORDER_DAILY_LIMIT-count),dailyGrossCap:NPC_ORDER_DAILY_GROSS_CAP,grossUsed:spent,
  orders:Object.keys(NPC_SHOPPERS).map(id=>{
   const q=residentBuyerQuote(id,now);
   const sold=log?.day===day&&Array.isArray(log.used)&&log.used.includes(id);
   const owns=!!state?.workshops?.[q.role]&&Number.isInteger(state.workshops[q.role].level)&&
     state.workshops[q.role].level>=1&&state.workshops[q.role].level<=3;
   const stock=validStock(state?.stock?.[q.item])?state.stock[q.item]:0;
   return {...q,owned:owns,stock,sold:!!sold,canSell:!sold&&count<NPC_ORDER_DAILY_LIMIT&&
    spent+q.gross<=NPC_ORDER_DAILY_GROSS_CAP&&stock>0&&owns&&active===q.role};
  })};
}
export function fulfillResidentOrder(snapshot,npcId,now=new Date()){
 const quote=residentBuyerQuote(npcId,now);
 if(!snapshot||!validMoney(snapshot.coins)||!snapshot.stock||typeof snapshot.stock!=='object'||
   Array.isArray(snapshot.stock))reject('시험 지갑 또는 창고 기록에 오류가 있어요',500);
 const current=currentProfession(snapshot);
 if(!current||current.active!==quote.role)reject('현재 직업의 손님 주문만 납품할 수 있어요',403);
 const workplace=snapshot.workshops?.[quote.role];
 if(!workplace||!Number.isInteger(workplace.level)||workplace.level<1||workplace.level>3)
  reject('전문 사업장 면허와 건설 기록이 필요해요',403);
 const stock=snapshot.stock[quote.item];
 if(!validStock(stock)||stock<1)reject('주민이 원하는 실제 생산품 재고가 부족해요');
 const old=snapshot.residentOrders||{};
 if(old.day===quote.day&&(!Array.isArray(old.used)||!Number.isSafeInteger(old.spent)||old.spent<0))
  reject('오늘 주민 주문 장부가 올바르지 않아요',500);
 const used=old.day===quote.day?old.used:[],spent=old.day===quote.day?old.spent:0;
 if(used.some(id=>!Object.hasOwn(NPC_SHOPPERS,id))||new Set(used).size!==used.length||
   used.length>NPC_ORDER_DAILY_LIMIT||spent>NPC_ORDER_DAILY_GROSS_CAP)
  reject('주민 주문 장부 검증에 실패했어요',500);
 if(used.includes(npcId))reject('이 주민에게는 오늘 이미 납품했어요');
 if(used.length>=NPC_ORDER_DAILY_LIMIT)reject('오늘 주민 주문 2건을 모두 완료했어요');
 if(spent+quote.gross>NPC_ORDER_DAILY_GROSS_CAP)reject('오늘 주민 구매 예산이 모두 소진됐어요');
 if(snapshot.coins+quote.net>LIMIT)reject('시험 골드 최대 잔액을 초과합니다');
 const next=structuredClone(snapshot);
 next.stock[quote.item]-=1; // Product is consumed by NPC: no escrow or duplicate listing.
 next.coins+=quote.net; // Tax is NEVER credited to another wallet: it is an economic sink.
 next.residentOrders={day:quote.day,used:[...used,npcId],spent:spent+quote.gross};
 return {next,delta:quote.net,role:quote.role,product:quote.item,
  quote,description:quote.buyer+'의 '+quote.itemName+' 구매 완료'};
}
