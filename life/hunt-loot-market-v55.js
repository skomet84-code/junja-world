// V55 NPC hunt salvage merchant. Uses only known monster drops, never
// user-provided sale prices, and credits the existing main-character wallet.
// The currency/loot save is still character-profile backed; it is NOT an
// audited cross-account marketplace.
import {HUNT_ZONES,HUNT_BOSSES,HUNT_CRAFTS} from './hunt-data.js';
import {credit} from './economy-v28.js';

const LIMIT=20;
const normalPrices=Object.freeze([22,48,94,175,340,590]);
const bossPrices=Object.freeze([300,720,1700,3300,6200,12500]);
const catalog={};
for(let i=0;i<HUNT_ZONES.length;i++){
 const zone=HUNT_ZONES[i];
 for(const monster of zone.mobs){
  const name=monster.material;
  if(typeof name==='string'&&name&&!catalog[name])
   catalog[name]=Object.freeze({name,unitPrice:normalPrices[i],rarity:'normal',zone:zone.name,icon:zone.icon});
 }
 const boss=HUNT_BOSSES[i];
 if(boss&&boss.zone===zone.id&&typeof boss.material==='string')
  catalog[boss.material]=Object.freeze({name:boss.material,unitPrice:bossPrices[i],rarity:'boss',zone:zone.name,icon:'👑'});
}
export const HUNT_LOOT_PRICES_V55=Object.freeze(catalog);
const validCount=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000?value:0;

export function craftMaterialReserveV55(material,owned=[]){
 const ownedSet=new Set(Array.isArray(owned)?owned:[]);
 let reserved=0;
 for(const craft of HUNT_CRAFTS){
  if(ownedSet.has(craft.gives))continue;
  for(const [need,qty] of craft.requires){
   if(need===material)reserved=Math.max(reserved,qty);
  }
 }
 return reserved;
}

export function huntLootQuoteV55(state,material,{includeProtected=false}={}){
 const info=HUNT_LOOT_PRICES_V55[material];
 if(!info)return null;
 const have=validCount(state?.hunt?.materials?.[material]);
 const reserve=craftMaterialReserveV55(material,state?.fashion?.owned);
 const surplus=Math.max(0,have-reserve);
 return {...info,have,reserve,surplus,available:includeProtected?have:surplus};
}

export function sellHuntLootV55(state,material,amount=1,{includeProtected=false,level=1,date=new Date()}={}){
 if(!state||typeof state!=='object')return {ok:false,error:'캐릭터 정보를 불러올 수 없어'};
 if(!Number.isSafeInteger(amount)||amount<1||amount>LIMIT)
  return {ok:false,error:'한 번에 1~20개까지만 판매할 수 있어'};
 const quote=huntLootQuoteV55(state,material,{includeProtected});
 if(!quote)return {ok:false,error:'등록되지 않은 전리품은 판매할 수 없어'};
 if(quote.available<amount)
  return {ok:false,error:'판매 가능한 수량이 부족해. 제작에 필요한 재료는 보호 중이야'};
 const gross=amount*quote.unitPrice;
 if(!Number.isSafeInteger(state.coins)||state.coins<0||state.coins>=1_000_000_000_000)
  return {ok:false,error:'골드가 가득 차거나 저장값을 확인해야 해'};
 // Main wallet credits use the game's soft-cap journal so bulk salvage
 // doesn't circumvent the daily currency sink/balance mechanism.
 const credited=credit(state,gross,'hunt','사냥 전리품 판매 · '+material,level,date);
 if(!credited.ok||credited.amount<1)
  return {ok:false,error:credited.error||'골드를 지급하지 못해 판매를 취소했어'};
 state.hunt.materials[material]=quote.have-amount;
 return {ok:true,material,sold:amount,gross,earned:credited.amount,remaining:quote.have-amount,
  reduced:credited.amount<gross,rare:quote.rarity==='boss'};
}
