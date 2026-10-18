// v36: independent SERVER-OWNED trial economy; never read or write legacy profile coins, XP or possessions.
// Every value comes from this fixed server catalog. There is no client-provided price, payout or timestamp.
export const LAB_CROPS=Object.freeze({
 lettuce:Object.freeze({label:'🥬 상추',cost:20,sell:34,growSeconds:60}),
 carrot:Object.freeze({label:'🥕 당근',cost:70,sell:126,growSeconds:300}),
 berry:Object.freeze({label:'🍓 딸기',cost:250,sell:470,growSeconds:900}),
 wheat:Object.freeze({label:'🌾 밀',cost:500,sell:920,growSeconds:3600}),
 apple:Object.freeze({label:'🍎 사과',cost:1800,sell:3350,growSeconds:10800})
});
export const LAB_RECIPES=Object.freeze({
 berry_jam:Object.freeze({label:'🍓 딸기잼',cost:110,needs:{berry:3},sell:2200}),
 apple_pie:Object.freeze({label:'🥧 사과파이',cost:600,needs:{apple:2,wheat:2},sell:11500})
});
export const LAB_ORDERS=Object.freeze([
 {id:'food_delivery',label:'🥬 마을 식료품',needs:{lettuce:2,carrot:1},reward:250,reputation:4},
 {id:'cafe_delivery',label:'🍓 카페 잼 납품',needs:{berry_jam:1},reward:2480,reputation:10},
 {id:'festival_delivery',label:'🥧 축제 파이 납품',needs:{apple_pie:1},reward:12600,reputation:18}
].map(Object.freeze));
const tiers=Object.freeze([{size:6,cost:0},{size:12,cost:4800},{size:24,cost:35000}]);
const LIMIT=1_000_000_000_000;
const validCount=x=>Number.isSafeInteger(x)&&x>=0&&x<=1_000_000?x:0;
const copy=o=>structuredClone(o);
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e};
const take=(inventory,needs)=>Object.entries(needs).every(([id,count])=>validCount(inventory[id])>=count);
const remove=(inventory,needs)=>{for(const [id,count] of Object.entries(needs))inventory[id]-=count};
const kstDay=now=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
function ensureState(state){
 if(!state||typeof state!=='object'||Array.isArray(state))fail('저장된 경제 기록의 형식이 올바르지 않습니다',500);
 if(!Number.isSafeInteger(state.coins)||state.coins<0||state.coins>LIMIT)fail('서버 재산 기록을 검증해야 합니다',500);
 if(!Array.isArray(state.plots)||!tiers.some(t=>t.size===state.plots.length))fail('서버 농장 기록을 검증해야 합니다',500);
 if(!state.stock||typeof state.stock!=='object'||Array.isArray(state.stock))fail('서버 창고 기록을 검증해야 합니다',500);
 if(!Number.isSafeInteger(state.reputation)||state.reputation<0)fail('명성 기록을 검증해야 합니다',500);
}
export function startingEconomy(){return {coins:1500,plots:Array(6).fill(null),stock:{},reputation:0,orderDay:'',completed:[],stats:{planted:0,harvested:0,crafted:0,sold:0,delivered:0}}}
export function economyDay(now=new Date()){return kstDay(now)}
export function economyView(snapshot,now=new Date()){
 ensureState(snapshot);
 const s=copy(snapshot),day=kstDay(now);
 const orders=LAB_ORDERS.map(o=>({id:o.id,label:o.label,needs:o.needs,reward:o.reward,reputation:o.reputation,
   completed:s.orderDay===day&&s.completed.includes(o.id),ready:take(s.stock,o.needs)}));
 return {...s,day,orders,catalog:LAB_CROPS,recipes:LAB_RECIPES,upgrade:tiers.find(t=>t.size>s.plots.length)||null};
}
function money(s,change){
 if(!Number.isSafeInteger(change)||s.coins+change<0||s.coins+change>LIMIT)fail('잔액 한도 또는 골드 부족');
 s.coins+=change;
}
function requireIndex(index,len){
 if(!Number.isInteger(index)||index<0||index>=len)fail('존재하지 않는 농장 칸입니다');
}
export function economyAction(snapshot,action,payload={},now=new Date()){
 ensureState(snapshot);
 if(!now||!(now instanceof Date)||!Number.isFinite(now.getTime()))fail('올바르지 않은 서버 시각입니다',500);
 const s=copy(snapshot),data=payload&&typeof payload==='object'&&!Array.isArray(payload)?payload:{};
 const before=s.coins,day=kstDay(now),timestamp=now.getTime();
 let detail='';
 switch(action){
  case 'plant':{
   const {index,crop}=data;requireIndex(index,s.plots.length);
   const item=LAB_CROPS[crop];if(!item)fail('선택한 씨앗이 없습니다');
   if(s.plots[index])fail('이 칸에는 이미 작물이 자라고 있어요',409);
   money(s,-item.cost);
   s.plots[index]={crop,at:timestamp};s.stats.planted++;
   detail=item.label+' 심기';
   break;
  }
  case 'harvest':{
   const {index}=data;requireIndex(index,s.plots.length);
   const plot=s.plots[index],crop=LAB_CROPS[plot?.crop];
   if(!plot||!crop)fail('수확할 작물이 없어요',409);
   if(!Number.isFinite(plot.at)||plot.at<0||timestamp-plot.at<crop.growSeconds*1000)fail('아직 수확할 시간이 아니에요',409);
   if(validCount(s.stock[plot.crop])>=1_000_000)fail('농장 창고가 가득 찼어요',409);
   s.stock[plot.crop]=validCount(s.stock[plot.crop])+1;
   s.plots[index]=null;s.stats.harvested++;
   detail=crop.label+' 수확';
   break;
  }
  case 'craft':{
   const item=LAB_RECIPES[data.recipe];if(!item)fail('없는 가공품이에요');
   if(!take(s.stock,item.needs))fail('필요한 농작물이 부족해요',409);
   if(validCount(s.stock[data.recipe])>=1_000_000)fail('가공품 보관 한도에 도달했어요',409);
   money(s,-item.cost);remove(s.stock,item.needs);
   s.stock[data.recipe]=validCount(s.stock[data.recipe])+1;
   s.stats.crafted++;detail=item.label+' 제작';
   break;
  }
  case 'sell':{
   const id=data.item,item=LAB_CROPS[id]||LAB_RECIPES[id];
   if(!item||validCount(s.stock[id])<1)fail('판매할 재고가 없어요',409);
   money(s,item.sell);s.stock[id]--;s.stats.sold++;
   detail=item.label+' 판매';
   break;
  }
  case 'order':{
   const order=LAB_ORDERS.find(o=>o.id===data.order);
   if(!order)fail('없는 주민 주문이에요');
   if(s.orderDay!==day){s.orderDay=day;s.completed=[]}
   if(s.completed.includes(order.id))fail('오늘 이미 납품했어요',409);
   if(s.completed.length>=2)fail('오늘은 두 건까지만 납품할 수 있어요',409);
   if(!take(s.stock,order.needs))fail('납품할 재료가 부족해요',409);
   money(s,order.reward);remove(s.stock,order.needs);
   s.completed.push(order.id);
   s.reputation+=order.reputation;s.stats.delivered++;
   detail=order.label+' 납품';
   break;
  }
  case 'expand':{
   const next=tiers.find(t=>t.size>s.plots.length);if(!next)fail('농장이 이미 최대 크기예요',409);
   money(s,-next.cost);
   s.plots.push(...Array(next.size-s.plots.length).fill(null));
   detail='농장 '+next.size+'칸 확장';
   break;
  }
  default:fail('지원하지 않는 경제 행동이에요');
 }
 ensureState(s);
 return {next:s,receipt:{action,detail,delta:s.coins-before,balance:s.coins,day,at:now.toISOString()}};
}
