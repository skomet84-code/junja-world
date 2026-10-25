// v62: server-authoritative action energy (200 max, +1 / 3 min) and progressive top-up cost in separate v36 economy.
// No daily purchase-count limit. Each KST day costs 1000, 2000, 4000... trial G.
import {economyDay} from './secure-economy-v36.js';
export const ENERGY_MAX=200,ENERGY_REGEN_SECONDS=180;
export const ENERGY_PACK=25,ENERGY_PRICE_G=1000;
export const ENERGY_COSTS=Object.freeze({plant:2,harvest:0,gather:3,fish:5,craft:6,order:3,business_produce:8});
const MILLISECONDS=ENERGY_REGEN_SECONDS*1000,MAX_COIN=1_000_000_000_000;
// The next price may exceed every permitted account balance. Null then means
// "not affordable within the verified currency ceiling", NOT a count cap.
// Calculate with exact integer powers; never trust user-supplied prices.
export function nextEnergyPrice(purchases){
 if(!Number.isSafeInteger(purchases)||purchases<0)throw Error('충전 구매 횟수가 올바르지 않아');
 if(purchases>=30)return null; // 1000 * 2^30 exceeds 1 trillion G
 return ENERGY_PRICE_G*(2**purchases);
}
const deny=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const asTime=now=>{const m=now instanceof Date?now.getTime():NaN;if(!Number.isFinite(m))deny('서버 행동력 시각을 확인할 수 없어요',500);return m};
const valid=(o,now)=>{
 if(o===undefined||o===null)return {current:ENERGY_MAX,at:now,packsDay:'',packs:0};
 if(!o||typeof o!=='object'||Array.isArray(o)||!Number.isSafeInteger(o.current)||o.current<0||
  o.current>ENERGY_MAX||!Number.isSafeInteger(o.at)||o.at<0||o.at>now||
  typeof o.packsDay!=='string'||!Number.isSafeInteger(o.packs)||o.packs<0)
  deny('행동력 저장 기록이 올바르지 않습니다. 자동 초기화하지 않았어요',409);
 return {...o};
};
export function projectEnergy(state,now=new Date()){
 const stamp=asTime(now),stored=valid(state?.actionEnergyV47,stamp),day=economyDay(now);
 const elapsed=Math.floor((stamp-stored.at)/MILLISECONDS);
 const amount=Math.min(ENERGY_MAX,stored.current+elapsed);
 const at=amount===ENERGY_MAX?stamp:stored.at+elapsed*MILLISECONDS;
 const packs=stored.packsDay===day?stored.packs:0;
 const next={current:amount,at,packsDay:day,packs};
 return {next,current:amount,max:ENERGY_MAX,regenSeconds:ENERGY_REGEN_SECONDS,
  nextRegenSeconds:amount===ENERGY_MAX?0:Math.ceil((MILLISECONDS-(stamp-at))/1000),
  packSize:ENERGY_PACK,packPrice:nextEnergyPrice(packs),packsUsed:packs,
  firstPackPrice:ENERGY_PRICE_G,progressivePrice:true,day,
  costs:ENERGY_COSTS};
}
export function chargeEnergy(state,action,now=new Date()){
 const cost=ENERGY_COSTS[action];
 if(!cost)return {next:structuredClone(state),cost:0,energy:projectEnergy(state,now)};
 const status=projectEnergy(state,now);
 if(status.current<cost)deny('행동력이 부족해요. 휴식하거나 골드로 충전해 주세요 ('+status.current+'/'+cost+')');
 const next=structuredClone(state);
 next.actionEnergyV47={...status.next,current:status.current-cost};
 return {next,cost,energy:projectEnergy(next,now)};
}
export function buyEnergy(state,now=new Date()){
 const projection=projectEnergy(state,now);
 if(!Number.isSafeInteger(state?.coins)||state.coins<0||state.coins>MAX_COIN)
  deny('시험 골드 기록을 확인할 수 없어요',500);
 if(projection.current>=ENERGY_MAX)deny('행동력이 이미 최대치예요');
 const price=projection.packPrice;
 if(price===null)deny('다음 충전 금액이 골드 보유 가능 한도를 초과했어. 한국시간 자정에 1,000G로 초기화돼');
 if(state.coins<price)deny('별도 경제 골드가 부족해요. 이번 충전은 '+price.toLocaleString('ko-KR')+'G가 필요해요');
 const next=structuredClone(state);
 next.coins-=price;
 next.actionEnergyV47={...projection.next,current:Math.min(ENERGY_MAX,projection.current+ENERGY_PACK),
  packs:projection.packsUsed+1};
 return {next,delta:-price,energy:projectEnergy(next,now),
  detail:'행동력 '+ENERGY_PACK+' 충전 · '+price.toLocaleString('ko-KR')+'G (오늘 '+(projection.packsUsed+1)+'번째 · 다음 충전 가격 2배)'};
}
