// JUNJA V48 personal interiors. Entirely in the v36 trial wallet (never legacy state.home).
// Fixed supply, account-scoped ownership, no loot boxes and no currency payouts.
export const HOUSE_LEVELS=Object.freeze([
 null,
 Object.freeze({name:'숲속 작은 집',grid:4,nextPrice:8000,capacity:5}),
 Object.freeze({name:'햇살 정원 하우스',grid:5,nextPrice:30000,capacity:9}),
 Object.freeze({name:'아틀리에 빌라',grid:6,nextPrice:120000,capacity:14}),
 Object.freeze({name:'로열 저택',grid:7,nextPrice:null,capacity:20})
]);
export const FURNITURE_V48=Object.freeze({
 oak_chair:Object.freeze({name:'원목 의자',emoji:'🪑',price:350,rarity:'일반',tier:1,sales:0,craft:0,limit:3,shape:'chair'}),
 tea_table:Object.freeze({name:'티타임 원목 탁자',emoji:'🍵',price:620,rarity:'일반',tier:1,sales:0,craft:0,limit:2,shape:'table'}),
 leaf_plant:Object.freeze({name:'작은 몬스테라',emoji:'🪴',price:450,rarity:'일반',tier:1,sales:0,craft:0,limit:3,shape:'plant'}),
 warm_lamp:Object.freeze({name:'호박빛 플로어등',emoji:'💡',price:680,rarity:'일반',tier:1,sales:0,craft:0,limit:2,shape:'lamp'}),
 velvet_sofa:Object.freeze({name:'벨벳 소파',emoji:'🛋️',price:1700,rarity:'고급',tier:2,sales:0,craft:0,limit:2,shape:'sofa'}),
 bookcase:Object.freeze({name:'장인의 책장',emoji:'📚',price:2500,rarity:'고급',tier:2,sales:0,craft:0,limit:2,shape:'books'}),
 crystal_lamp:Object.freeze({name:'별빛 크리스털 조명',emoji:'💎',price:9800,rarity:'희귀',tier:2,sales:3,craft:0,limit:1,shape:'crystal'}),
 royal_piano:Object.freeze({name:'황금 그랜드피아노',emoji:'🎹',price:25000,rarity:'희귀',tier:3,sales:0,craft:8,limit:1,shape:'piano'}),
 royal_chandelier:Object.freeze({name:'갓준자 로열 샹들리에',emoji:'👑',price:62000,rarity:'전설',tier:4,sales:8,craft:15,limit:1,shape:'chandelier'})
});
export const WALLS_V48=Object.freeze({cream:{name:'바닐라 아이보리',tier:1},sage:{name:'세이지 가든',tier:1},blush:{name:'로즈 블룸',tier:2},amethyst:{name:'아메시스트 로열',tier:3}});
export const FLOORS_V48=Object.freeze({oak:{name:'내추럴 오크',tier:1},walnut:{name:'월넛 플랭크',tier:2},marble:{name:'화이트 마블',tier:3},royal:{name:'로열 체커',tier:4}});
const MAX_GOLD=1_000_000_000_000;
const fail=(message,status=409)=>{const e=new Error(message);e.status=status;throw e;};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function stateHouse(snapshot){
 const raw=snapshot?.houseV48??{level:1,wall:'cream',floor:'oak',owned:{oak_chair:1},placed:[{slot:5,item:'oak_chair',turn:0}]};
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Number.isInteger(raw.level)||raw.level<1||raw.level>4||
 !own(WALLS_V48,raw.wall)||!own(FLOORS_V48,raw.floor)||WALLS_V48[raw.wall].tier>raw.level||
 FLOORS_V48[raw.floor].tier>raw.level||!raw.owned||typeof raw.owned!=='object'||Array.isArray(raw.owned)||
 !Array.isArray(raw.placed)||raw.placed.length>HOUSE_LEVELS[raw.level].capacity)
 fail('주택 장부의 상태가 올바르지 않습니다. 재설정을 중단했어요');
 const cap=HOUSE_LEVELS[raw.level],slots=new Set(),used={};
 for(const [id,n] of Object.entries(raw.owned)){
  if(!own(FURNITURE_V48,id)||!Number.isInteger(n)||n<1||n>FURNITURE_V48[id].limit||
   FURNITURE_V48[id].tier>raw.level)fail('주택 보유 가구 기록이 손상되었습니다');
 }
 for(const a of raw.placed){
  if(!a||!Number.isInteger(a.slot)||a.slot<0||a.slot>=cap.grid**2||
   !own(FURNITURE_V48,a.item)||!Number.isInteger(a.turn)||a.turn<0||a.turn>3||
   slots.has(a.slot))fail('주택 가구 배치 기록이 올바르지 않습니다');
  slots.add(a.slot);used[a.item]=(used[a.item]||0)+1;
  if(used[a.item]>(raw.owned[a.item]||0))fail('소유하지 않은 가구 배치가 발견됐어요');
 }
 return structuredClone(raw);
}
function verifyWallet(state){
 if(!state||typeof state!=='object'||!Number.isSafeInteger(state.coins)||state.coins<0||state.coins>MAX_GOLD)
 fail('시험 골드 지갑 검증 실패',500);
}
function activity(rows){
 const s=Number(rows?.sales||0),craft=Number(rows?.craft||0);
 if(!Number.isSafeInteger(s)||s<0||!Number.isSafeInteger(craft)||craft<0||s>10_000_000||craft>10_000_000)
 fail('실제 서버 판매·제작 증빙을 확인해 주세요',500);
 return {sales:s,craft};
}
export function houseView(state,proof={}){
 verifyWallet(state);const house=stateHouse(state),verified=activity(proof);
 const catalog=Object.fromEntries(Object.entries(FURNITURE_V48).map(([id,f])=>[id,{
  ...f,id,owned:house.owned[id]||0,placed:house.placed.filter(p=>p.item===id).length,
  unlocked:house.level>=f.tier&&verified.sales>=f.sales&&verified.craft>=f.craft
 }]));
 return {house,catalog,levels:HOUSE_LEVELS.slice(1),walls:WALLS_V48,floors:FLOORS_V48,
  verified,coins:state.coins};
}
export function homeAction(state,action,data={},proof={}){
 verifyWallet(state);const house=stateHouse(state),verified=activity(proof),next=structuredClone(state);
 let delta=0,detail='';
 if(action==='upgrade'){
  if(house.level>=4)fail('집이 이미 최고 단계예요');
  const cost=HOUSE_LEVELS[house.level].nextPrice;
  if(state.coins<cost)fail('집 증축에 필요한 시험 골드가 부족해요');
  delta=-cost;house.level++;detail='🏠 '+HOUSE_LEVELS[house.level].name+' 증축';
 }else if(action==='buy'){
  const f=FURNITURE_V48[data.item];
  if(!own(FURNITURE_V48,data.item)||!f)fail('없는 가구입니다',400);
  if(house.level<f.tier||verified.sales<f.sales||verified.craft<f.craft)fail('건축 단계나 실제 영업 업적이 부족해요');
  if((house.owned[data.item]||0)>=f.limit)fail('이 가구의 보유 한도에 도달했어요');
  if(Object.values(house.owned).reduce((a,b)=>a+b,0)>=HOUSE_LEVELS[house.level].capacity)
   fail('가구 보관 한도가 찼어요. 집을 증축해 주세요');
  if(state.coins<f.price)fail('시험 골드가 부족해요');
  house.owned[data.item]=(house.owned[data.item]||0)+1;
  delta=-f.price;detail=f.emoji+' '+f.name+' 구매';
 }else if(action==='place'){
  const {item,slot,turn=0}=data;
  if(typeof item!=='string'||!own(FURNITURE_V48,item)||!Number.isInteger(slot)||
   slot<0||slot>=HOUSE_LEVELS[house.level].grid**2||!Number.isInteger(turn)||turn<0||turn>3)
   fail('올바른 가구 위치와 방향을 선택해 주세요',400);
  if(house.placed.some(p=>p.slot===slot))fail('이미 다른 가구가 배치된 칸이에요');
  if(house.placed.length>=HOUSE_LEVELS[house.level].capacity)fail('현재 단계의 가구 배치 한도를 초과했어요');
  if((house.owned[item]||0)<=house.placed.filter(p=>p.item===item).length)fail('배치 가능한 보유 가구가 부족해요');
  house.placed.push({slot,item,turn});house.placed.sort((a,b)=>a.slot-b.slot);
  detail=FURNITURE_V48[item].name+' 배치';
 }else if(action==='remove'){
  const slot=data.slot;
  if(!Number.isInteger(slot))fail('올바른 위치를 선택해 주세요',400);
  const i=house.placed.findIndex(p=>p.slot===slot);if(i===-1)fail('그 위치에는 가구가 없어요');
  const item=house.placed[i].item;house.placed.splice(i,1);
  detail=FURNITURE_V48[item].name+' 보관함으로 이동';
 }else if(action==='rotate'){
  const slot=data.slot;if(!Number.isInteger(slot))fail('올바른 위치를 선택해 주세요',400);
  const p=house.placed.find(p=>p.slot===slot);if(!p)fail('회전할 가구가 없어요');
  p.turn=(p.turn+1)%4;detail=FURNITURE_V48[p.item].name+' 방향 전환';
 }else if(action==='style'){
  const {kind,id}=data;
  if(kind!=='wall'&&kind!=='floor')fail('올바른 주택 장식을 선택해 주세요',400);
  const styles=kind==='wall'?WALLS_V48:FLOORS_V48;
  if(typeof id!=='string'||!own(styles,id))fail('없는 인테리어 색상이에요',400);
  if(styles[id].tier>house.level)fail('집을 증축하면 선택 가능한 색상입니다');
  if(house[kind]===id)fail('이미 적용 중인 인테리어예요');
  house[kind]=id;detail=styles[id].name+' 적용';
 }else fail('지원하지 않는 집 꾸미기 행동이에요',400);
 next.coins+=delta;
 next.houseV48=house;
 return {next,delta,detail,house:houseView(next,verified)};
}
