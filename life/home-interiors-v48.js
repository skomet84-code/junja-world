// v48 — intentional home decoration progression; no client-supplied prices.
// Operates ONLY on the existing local/cloud saved home inventory and player wallet.
export const HOME_ROOMS_V48=Object.freeze([
 {id:'living',name:'🌿 거실',requiredLevel:1,style:'honey'},
 {id:'studio',name:'🪵 공방',requiredLevel:2,style:'sage'},
 {id:'gallery',name:'🌷 갤러리',requiredLevel:3,style:'rose'},
 {id:'royal',name:'👑 로열룸',requiredLevel:4,style:'cream'}
]);
export const HOME_FURNITURE_V48=Object.freeze({
 sofa:Object.freeze({name:'포근한 소파',icon:'🛋️',cost:0,minHouse:1,rarity:'기본',score:1}),
 table:Object.freeze({name:'원목 식탁',icon:'🪑',cost:900,minHouse:1,rarity:'일반',score:2}),
 lamp:Object.freeze({name:'은은한 조명',icon:'🪔',cost:1440,minHouse:1,rarity:'일반',score:2}),
 plant:Object.freeze({name:'초록 화분',icon:'🪴',cost:720,minHouse:1,rarity:'일반',score:2}),
 cat:Object.freeze({name:'고양이 인형',icon:'🐈',cost:2280,minHouse:1,rarity:'일반',score:3}),
 piano:Object.freeze({name:'클래식 피아노',icon:'🎹',cost:5100,minHouse:2,rarity:'고급',score:6}),
 fireplace:Object.freeze({name:'대리석 벽난로',icon:'🔥',cost:18500,minHouse:2,rarity:'희귀',score:12}),
 library:Object.freeze({name:'장인의 책장',icon:'📚',cost:27000,minHouse:2,rarity:'희귀',score:14}),
 aquarium:Object.freeze({name:'심해 유리 수조',icon:'🐠',cost:68000,minHouse:3,rarity:'영웅',score:24}),
 harp:Object.freeze({name:'달빛 하프',icon:'🎼',cost:95000,minHouse:3,rarity:'영웅',score:29}),
 throne:Object.freeze({name:'왕실 황금 의자',icon:'👑',cost:360000,minHouse:4,rarity:'전설',score:64}),
 starlamp:Object.freeze({name:'별빛 샹들리에',icon:'✨',cost:540000,minHouse:4,rarity:'전설',score:75})
});
export const HOME_SLOTS_V48=9;
const err=(message)=>{throw Error(message)};
const validLevel=level=>Number.isInteger(level)&&level>=1&&level<=4?level:1;
export function normalizeHomeV48(home){
 if(!home||typeof home!=='object'||Array.isArray(home))err('주택 저장 형식 오류');
 const level=validLevel(home.level);
 const items=[...new Set((Array.isArray(home.furniture)?home.furniture:[]).filter(id=>
  typeof id==='string'&&Object.hasOwn(HOME_FURNITURE_V48,id)))];
 const arrangements=[],taken=new Set(),seen=new Set();
 const raw=Array.isArray(home.decorV48)?home.decorV48:[];
 for(const pos of raw.slice(0,48)){
  if(!pos||typeof pos!=='object'||!items.includes(pos.item)||seen.has(pos.item)||
   !Number.isInteger(pos.room)||pos.room<0||pos.room>=level||
   !Number.isInteger(pos.slot)||pos.slot<0||pos.slot>=HOME_SLOTS_V48)continue;
  const space=pos.room+':'+pos.slot;if(taken.has(space))continue;
  arrangements.push({item:pos.item,room:pos.room,slot:pos.slot});taken.add(space);seen.add(pos.item);
 }
 // Legacy purchases were unslotted; lay them out automatically without buying twice.
 for(const item of items){
  if(seen.has(item))continue;
  outer:for(let room=0;room<level;room++)for(let slot=0;slot<HOME_SLOTS_V48;slot++){
   const key=room+':'+slot;
   if(taken.has(key))continue;
   arrangements.push({item,room,slot});seen.add(item);taken.add(key);break outer;
  }
 }
 return {level,items,arrangements};
}
export function homePrestigeV48(home){
 const state=normalizeHomeV48(home);
 const score=state.items.reduce((sum,id)=>sum+HOME_FURNITURE_V48[id].score,0)+state.level*5;
 return {score,title:score>=160?'왕실 수집가':score>=80?'명품 인테리어 전문가':
  score>=35?'감각적인 집주인':score>=15?'아늑한 살림꾼':'마을의 새내기',level:state.level};
}
export function buyHomeItemV48(home,id,coins){
 if(!Object.hasOwn(HOME_FURNITURE_V48,id)||id==='sofa')err('판매하지 않는 가구예요');
 const s=normalizeHomeV48(home),item=HOME_FURNITURE_V48[id];
 if(s.items.includes(id))err('이미 가진 가구예요');
 if(s.level<item.minHouse)err('주택 '+item.minHouse+'단계부터 구매 가능해요');
 if(!Number.isSafeInteger(coins)||coins<item.cost)err('가구를 구매할 골드가 부족해요');
 // Existing code limits furniture owned by home tier. Do not bypass room capacity.
 if(s.items.length>=s.level*HOME_SLOTS_V48)err('집의 가구 보관 공간이 부족해요');
 const next=structuredClone(home);
 next.furniture=[...s.items,id];
 next.decorV48=[...s.arrangements];
 const refreshed=normalizeHomeV48(next);
 next.decorV48=refreshed.arrangements;
 return {next,cost:item.cost,item,label:item.name};
}
export function arrangeHomeItemV48(home,id,room,slot){
 const s=normalizeHomeV48(home);
 if(!s.items.includes(id))err('가지고 있지 않은 가구예요');
 if(!Number.isInteger(room)||room<0||room>=s.level||
  !Number.isInteger(slot)||slot<0||slot>=HOME_SLOTS_V48)err('열리지 않은 방 또는 배치 위치예요');
 const where=s.arrangements.find(a=>a.room===room&&a.slot===slot);
 // Move A to B; when B occupied, exchange positions, so owned items are never duplicated.
 const old=s.arrangements.find(a=>a.item===id);
 if(old?.room===room&&old?.slot===slot)return {next:structuredClone(home),changed:false};
 const next=structuredClone(home),placements=s.arrangements.filter(a=>a.item!==id&&a.item!==where?.item);
 if(where&&old)placements.push({item:where.item,room:old.room,slot:old.slot});
 placements.push({item:id,room,slot});
 next.decorV48=placements;
 return {next,changed:true,swapped:where?.item||null};
}
export function homeRoomV48(home,room=0){
 const s=normalizeHomeV48(home);
 if(!Number.isInteger(room)||room<0||room>=s.level)err('아직 열리지 않은 방입니다');
 return {level:s.level,room,info:HOME_ROOMS_V48[room],
  slots:Array.from({length:HOME_SLOTS_V48},(_,slot)=>{
   const key=s.arrangements.find(a=>a.room===room&&a.slot===slot)?.item||null;
   return {slot,item:key,data:key?HOME_FURNITURE_V48[key]:null};
  }),items:s.items,stored:s.items.filter(id=>!s.arrangements.some(p=>p.item===id)),
  prestige:homePrestigeV48(home)};
}
