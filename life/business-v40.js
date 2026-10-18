// JUNJA v40: server-authoritative facilities and artisan production on the isolated TEST economy.
// New products can ONLY be minted after verified workshop ownership, profession and materials.
import {currentProfession,professionView,kstProfessionDay} from './professions-v39.js';

export const WORKSHOP_PRODUCTS=Object.freeze({
  berry_box:Object.freeze({label:'🍓 프리미엄 딸기 상자',sell:1750,role:'farmer',needs:Object.freeze({berry:3}),cost:130}),
  artisan_tart:Object.freeze({label:'🥧 수제 과일 타르트',sell:8500,role:'chef',needs:Object.freeze({apple:1,wheat:2,berry:1}),cost:450}),
  festival_basket:Object.freeze({label:'🎁 마을 축제 선물세트',sell:6900,role:'merchant',needs:Object.freeze({carrot:2,apple:1,berry:1}),cost:380})
});
export const WORKSHOP_TYPES=Object.freeze({
 farmer:Object.freeze({name:'🌿 프리미엄 온실',build:3100,upgrades:Object.freeze([7800,21500]),product:'berry_box'}),
 chef:Object.freeze({name:'🥧 수제 베이커리',build:4800,upgrades:Object.freeze([10800,27500]),product:'artisan_tart'}),
 merchant:Object.freeze({name:'🏪 유통 공방',build:4000,upgrades:Object.freeze([9300,25000]),product:'festival_basket'})
});
const maxCoin=1_000_000_000_000;
const reject=(message,status=409)=>{const err=new Error(message);err.status=status;throw err};
const own=(s,role)=>s?.workshops?.[role];
const count=(value)=>Number.isSafeInteger(value)&&value>=0&&value<=1_000_000?value:0;
const requiredRank=[0,2,3,4]; // First facility needs 숙련, upgrade requires 전문가/명장.
export function workshopPrice(role,level){
 const workshop=WORKSHOP_TYPES[role];if(!workshop)reject('알 수 없는 사업장 종류입니다',400);
 if(!Number.isInteger(level)||level<1||level>3)reject('알 수 없는 사업장 등급입니다',400);
 return level===1?workshop.build:workshop.upgrades[level-2];
}
export function workshopCraftCost(product,level){
 if(!Object.hasOwn(WORKSHOP_PRODUCTS,product)||!Number.isInteger(level)||level<1||level>3)
  reject('생산할 수 없는 제품 또는 설비 등급입니다',400);
 return Math.ceil(WORKSHOP_PRODUCTS[product].cost*(level===3?.90:level===2?.95:1));
}
function requireRole(state,role,proof){
 const job=currentProfession(state);
 if(!job||job.active!==role)reject('현재 직업에 맞는 사업장만 건설하거나 사용할 수 있어요');
 const report=professionView(state,proof,{},new Date());
 if(!report.rank)return reject('직업 숙련 기록을 확인해 주세요');
 return report.rank.tier;
}
function ensureCoins(state,amount){
 if(!state||!Number.isSafeInteger(state.coins)||state.coins<amount)reject('사업 운영에 필요한 골드가 부족해요');
}
function facility(state,role){
 const raw=own(state,role);
 if(!raw||!Number.isInteger(raw.level)||raw.level<1||raw.level>3)reject('먼저 해당 직업의 사업장을 지어 주세요');
 return raw;
}
export function buildWorkshop(state,role,proof={},now=new Date()){
 if(!Object.hasOwn(WORKSHOP_TYPES,role))reject('존재하지 않는 사업장입니다',400);
 const rank=requireRole(state,role,proof);
 if(own(state,role))reject('이미 건설한 직업 사업장입니다');
 if(rank<requiredRank[1])reject('숙련 등급부터 개인 사업장을 지을 수 있어요');
 const price=workshopPrice(role,1);ensureCoins(state,price);
 const next=structuredClone(state);next.coins-=price;
 next.workshops={...(next.workshops||{}),[role]:{level:1,createdAt:now.toISOString()}};
 return {next,delta:-price,role,level:1,detail:WORKSHOP_TYPES[role].name+' 개업'};
}
export function upgradeWorkshop(state,role,proof={}){
 const rank=requireRole(state,role,proof),current=facility(state,role);
 if(current.level>=3)reject('사업장이 이미 최고 등급이에요');
 const target=current.level+1;
 if(rank<requiredRank[target])reject(target+'단계 사업장에 필요한 직업 숙련도가 부족해요');
 const price=workshopPrice(role,target);ensureCoins(state,price);
 const next=structuredClone(state);next.coins-=price;
 next.workshops[role]={...next.workshops[role],level:target};
 return {next,delta:-price,role,level:target,detail:WORKSHOP_TYPES[role].name+' '+target+'단계 확장'};
}
export function manufactureWorkshopItem(state,role,proof={}){
 requireRole(state,role,proof);
 const workplace=facility(state,role),recipe=WORKSHOP_TYPES[role].product,product=WORKSHOP_PRODUCTS[recipe];
 const cost=workshopCraftCost(recipe,workplace.level);
 ensureCoins(state,cost);
 if(!state.stock||typeof state.stock!=='object'||Array.isArray(state.stock))reject('서버 창고 기록이 손상되었습니다',500);
 for(const [item,n] of Object.entries(product.needs)){
  if(count(state.stock[item])<n)reject('전문 생산에 필요한 농산물이 부족해요');
 }
 if(count(state.stock[recipe])>=1_000_000)reject('가공품 보관 한도에 도달했어요');
 const next=structuredClone(state);next.coins-=cost;
 for(const [item,n] of Object.entries(product.needs))next.stock[item]-=n;
 next.stock[recipe]=count(next.stock[recipe])+1;
 return {next,delta:-cost,role,product:recipe,level:workplace.level,detail:product.label+' 전문 생산'};
}
export function workshopView(state,proof={},now=new Date()){
 const active=currentProfession(state),report=active?professionView(state,proof,{},now):null;
 return {active:active?.active||null,rank:report?.rank||null,day:kstProfessionDay(now),
  workshops:structuredClone(state?.workshops||{}),types:WORKSHOP_TYPES,products:WORKSHOP_PRODUCTS,
  costs:Object.fromEntries(Object.entries(WORKSHOP_TYPES).map(([role,cfg])=>
   [role,{build:cfg.build,next:own(state,role)?.level>=3?null:
     own(state,role)?workshopPrice(role,own(state,role).level+1):cfg.build,
    production:workshopCraftCost(cfg.product,own(state,role)?.level||1)}]))};
}
export function businessWeekBeginning(now=new Date()){
 const midnight=new Date(kstProfessionDay(now)+'T00:00:00+09:00');
 const weekday=new Date(kstProfessionDay(now)+'T12:00:00+09:00').getUTCDay();
 midnight.setUTCDate(midnight.getUTCDate()-((weekday+6)%7));
 return midnight;
}
