import {debit} from './economy-v28.js';
import {canStore} from './inventory-v29.js';
export const POTIONS=Object.freeze([
 {id:'hp',name:'생명 물약',icon:'❤️',price:190,heal:85,count:3,cooldown:7000},
 {id:'mp',name:'마나 물약',icon:'💧',price:230,heal:70,count:3,cooldown:7000},
 {id:'hpPlus',name:'고급 생명 물약',icon:'💖',price:980,heal:250,count:3,cooldown:9000},
 {id:'mpPlus',name:'고급 마나 물약',icon:'🔮',price:1080,heal:190,count:3,cooldown:9000}
]);
export function ensurePotions(s){
 if(!s.hunt||typeof s.hunt!=='object')s.hunt={};
 const h=s.hunt;
 h.potions=h.potions&&typeof h.potions==='object'?h.potions:{};
 if(!h.starterPotionsV29){
  h.starterPotionsV29=true;
  h.potions.hp=(h.potions.hp||0)+2;
  h.potions.mp=(h.potions.mp||0)+2;
 }
 return h.potions;
}
export function purchasePotion(s,id){
 const p=POTIONS.find(o=>o.id===id),inv=ensurePotions(s);
 if(!p)return {ok:false,error:'알 수 없는 물약'};
 if(!canStore(s,p.count))return {ok:false,error:'가방이 가득 찼어요'};
 const txn=debit(s,p.price,'potion','사냥 물약 · '+p.name);
 if(!txn.ok)return txn;
 inv[id]=(inv[id]||0)+p.count;return {ok:true,count:p.count};
}
export function consumePotion(s,id,current,max,now=0,readyAt=0){
 const p=POTIONS.find(o=>o.id===id),inv=ensurePotions(s);
 if(!p)return {ok:false,error:'물약 종류 오류'};
 if((inv[id]||0)<=0)return {ok:false,error:'물약 부족'};
 if(now<readyAt)return {ok:false,error:'물약 재사용 대기'};
 if(current>=max)return {ok:false,error:'이미 가득 찼어요'};
 inv[id]--;
 return {ok:true,amount:Math.min(p.heal,max-current),value:Math.min(max,current+p.heal),nextAt:now+p.cooldown};
}
