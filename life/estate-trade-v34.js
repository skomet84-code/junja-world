// JUNJA Village living-economy v34 (client-side pilot).
// Deliberately keeps existing levels/coins and legacy estate crops intact.
// All shared-market settlement must move to the authoritative server before launch.
import {credit,debit} from './economy-v28.js';

export const ESTATE_PRODUCTS=Object.freeze([
 {id:'berry_jam',name:'🍓 딸기잼',needs:{berry:3},fee:120,price:2600},
 {id:'apple_pie',name:'🥧 사과파이',needs:{apple:2,wheat:2},fee:700,price:24000},
 {id:'peach_juice',name:'🍑 복숭아 주스',needs:{peach:2},fee:1250,price:38000}
].map(Object.freeze));

export const ESTATE_ORDERS=Object.freeze([
 {id:'market_vegetables',name:'🥬 마을 식료품 납품',needs:{lettuce:2,carrot:1},goods:{},reward:350,rep:4,xp:12},
 {id:'orchard_basket',name:'🍎 과일가게 주문',needs:{berry:2,apple:1},goods:{},reward:9900,rep:10,xp:36},
 {id:'jam_delivery',name:'🍓 주민 카페 잼 주문',needs:{},goods:{berry_jam:1},reward:2950,rep:8,xp:24},
 {id:'pie_festival',name:'🥧 축제용 파이 주문',needs:{},goods:{apple_pie:1},reward:27000,rep:16,xp:58},
 {id:'drink_delivery',name:'🍑 항구 주스 납품',needs:{},goods:{peach_juice:1},reward:43000,rep:20,xp:75}
].map(Object.freeze));

const normalCount=n=>Number.isSafeInteger(Number(n))&&Number(n)>0?Math.min(1000000,Number(n)):0;
const goodById=Object.fromEntries(ESTATE_PRODUCTS.map(p=>[p.id,p]));
const orderById=Object.fromEntries(ESTATE_ORDERS.map(p=>[p.id,p]));
const take=(inventory,needs)=>Object.entries(needs).every(([id,n])=>normalCount(inventory?.[id])>=n);
const deduct=(inventory,needs)=>{for(const [id,n] of Object.entries(needs))inventory[id]=normalCount(inventory[id])-n};
const localDay=date=>{
 const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
 return year+'-'+month+'-'+day;
};
export function initEstateTrade(state){
 if(!state.estate||typeof state.estate!=='object'||Array.isArray(state.estate))state.estate={tier:-1,plots:[],stock:{},buildings:[]};
 const e=state.estate;
 if(!e.stock||typeof e.stock!=='object'||Array.isArray(e.stock))e.stock={};
 if(!e.trade||typeof e.trade!=='object'||Array.isArray(e.trade))e.trade={};
 const t=e.trade;
 if(!t.goods||typeof t.goods!=='object'||Array.isArray(t.goods))t.goods={};
 if(!t.stats||typeof t.stats!=='object'||Array.isArray(t.stats))t.stats={};
 for(const field of ['harvested','made','sold','fulfilled'])t.stats[field]=normalCount(t.stats[field]);
 t.reputation=normalCount(t.reputation);
 if(!Array.isArray(t.completed))t.completed=[];
 t.completed=t.completed.filter(s=>typeof s==='string').slice(-3);
 if(typeof t.orderDay!=='string')t.orderDay='';
 return t;
}
export function estateRank(state){
 const rep=initEstateTrade(state).reputation;
 const tiers=[{min:0,name:'새싹 정착민',next:10},{min:10,name:'견습 상인',next:45},{min:45,name:'마을 납품업자',next:140},{min:140,name:'유명한 생산자',next:350},{min:350,name:'준자마을 명예 상인',next:null}];
 return [...tiers].reverse().find(t=>rep>=t.min);
}
export function recordEstateHarvest(state){
 const t=initEstateTrade(state);t.stats.harvested++;
}
export function manufactureEstateProduct(state,id){
 const product=goodById[id];
 if(!product)return {ok:false,error:'없는 가공품입니다'};
 const t=initEstateTrade(state),stock=state.estate.stock;
 if(!take(stock,product.needs))return {ok:false,error:'가공에 필요한 농작물이 부족해요'};
 const paid=debit(state,product.fee,'estate_process',product.name+' 가공비');
 if(!paid.ok)return {ok:false,error:paid.error||'가공비가 부족해요'};
 deduct(stock,product.needs);
 t.goods[id]=normalCount(t.goods[id])+1;
 t.stats.made++;
 return {ok:true,product};
}
export function sellEstateProduct(state,id,level=1){
 const product=goodById[id],t=initEstateTrade(state);
 if(!product||normalCount(t.goods[id])<1)return {ok:false,error:'판매할 가공품이 없어요'};
 const paid=credit(state,product.price,'craft',product.name+' 판매',level);
 if(!paid.ok||paid.amount<1)return {ok:false,error:paid.error||'판매 실패'};
 t.goods[id]--;t.stats.sold++;
 return {...paid,product};
}
export function estateDailyOrders(date=new Date()){
 const day=localDay(date);
 const seed=Number(day.replace(/\D/g,''))%4;
 // Beginner-friendly vegetable order every day, plus two rotating specialties.
 const specialty=ESTATE_ORDERS.slice(1);
 return [ESTATE_ORDERS[0],specialty[seed],specialty[(seed+2)%specialty.length]];
}
export function estateOrderProgress(state,date=new Date()){
 const t=initEstateTrade(state),day=localDay(date);
 if(t.orderDay!==day){t.orderDay=day;t.completed=[]}
 const orders=estateDailyOrders(date).map(order=>({
  ...order,
  complete:t.completed.includes(order.id),
  ready:take(state.estate.stock,order.needs)&&take(t.goods,order.goods)
 }));
 return {day,orders,completed:t.completed.length,limit:3,reputation:t.reputation};
}
export function fulfillEstateOrder(state,id,level=1,date=new Date()){
 const view=estateOrderProgress(state,date),order=orderById[id];
 if(!order||!view.orders.some(o=>o.id===id))return {ok:false,error:'오늘의 납품 주문이 아니에요'};
 const t=initEstateTrade(state);
 if(t.completed.includes(id))return {ok:false,error:'오늘 이미 납품한 주문이에요'};
 if(t.completed.length>=view.limit)return {ok:false,error:'오늘의 납품 횟수를 모두 사용했어요'};
 if(!take(state.estate.stock,order.needs)||!take(t.goods,order.goods))
  return {ok:false,error:'주문에 필요한 농작물이나 가공품이 부족해요'};
 const result=credit(state,order.reward,'deliver','농장 주문 · '+order.name,level,date);
 if(!result.ok||result.amount<1)return {ok:false,error:result.error||'납품 보상 지급 실패'};
 deduct(state.estate.stock,order.needs);
 deduct(t.goods,order.goods);
 t.completed.push(id);
 t.reputation+=order.rep;
 t.stats.fulfilled++;
 state.xp=Math.max(0,Number(state.xp)||0)+order.xp;
 return {...result,order,reputation:t.reputation};
}
