import {HUNT_SKILLS,combatStats,huntLevel} from './hunt-data.js';
import {debit} from './economy-v28.js';
export const SKILL_PRICES=Object.freeze({strike:650,whirl:2800,star:12000});
export const EQUIPMENT=Object.freeze([
 {id:'twig',slot:'weapon',name:'연습용 목검',level:1,price:0,attack:0,color:0xb79061},
 {id:'bronze',slot:'weapon',name:'청동 모험검',level:3,price:900,attack:4,color:0xc69a66},
 {id:'steel',slot:'weapon',name:'수정 강철검',level:8,price:4800,attack:10,color:0x96cdd5},
 {id:'moon',slot:'weapon',name:'달빛 장검',level:15,price:18000,attack:20,color:0xc3a6e4},
 {id:'sun',slot:'weapon',name:'태양 수호검',level:25,price:58000,attack:34,color:0xf0cc75},
 {id:'cloth',slot:'armor',name:'기본 보호구',level:1,price:0,defense:0,hp:0,color:0xacbda0},
 {id:'leather',slot:'armor',name:'가죽 수호 방패',level:3,price:800,defense:3,hp:15,color:0xb78a63},
 {id:'crystal',slot:'armor',name:'수정 수호 방패',level:8,price:4200,defense:7,hp:35,color:0x91d0db},
 {id:'lunar',slot:'armor',name:'달빛 수호 방패',level:15,price:16000,defense:12,hp:65,color:0xbfa6dc},
 {id:'royal',slot:'armor',name:'황금 수호 방패',level:25,price:52000,defense:20,hp:105,color:0xe0c16f}
].map(Object.freeze));
export function initCombat(s){
 const h=s.hunt??={};
 if(!Array.isArray(h.skills))h.skills=[];
 h.skills=[...new Set(h.skills.filter(id=>HUNT_SKILLS.some(x=>x.id===id)))];
 if(!Array.isArray(h.gearOwned))h.gearOwned=[];
 h.gearOwned=[...new Set(['twig','cloth',...h.gearOwned.filter(id=>EQUIPMENT.some(x=>x.id===id))])];
 h.gear=h.gear&&typeof h.gear==='object'?h.gear:{};
 for(const [slot,fallback] of [['weapon','twig'],['armor','cloth']]){
  if(!EQUIPMENT.some(x=>x.id===h.gear[slot]&&x.slot===slot&&h.gearOwned.includes(x.id)))h.gear[slot]=fallback;
 }
 h.skillCooldowns=h.skillCooldowns&&typeof h.skillCooldowns==='object'?h.skillCooldowns:{};
 return h;
}
export function purchaseSkill(s,id){
 const h=initCombat(s),skill=HUNT_SKILLS.find(x=>x.id===id);
 if(!skill)return {ok:false,error:'없는 스킬이에요'};
 if(h.skills.includes(id))return {ok:false,error:'이미 배운 스킬이에요'};
 if(huntLevel(s.xp)<skill.level)return {ok:false,error:'레벨이 부족해요'};
 const r=debit(s,SKILL_PRICES[id],'skill','스킬 교본 · '+skill.name);
 if(r.ok)h.skills.push(id);return r;
}
export function purchaseEquipment(s,id){
 const h=initCombat(s),item=EQUIPMENT.find(x=>x.id===id);
 if(!item||h.gearOwned.includes(id))return {ok:false,error:'이미 보유했거나 없는 장비예요'};
 if(huntLevel(s.xp)<item.level)return {ok:false,error:'레벨이 부족해요'};
 const r=debit(s,item.price,'equipment','모험 장비 · '+item.name);
 if(r.ok)h.gearOwned.push(id);return r;
}
export function equipItem(s,id){
 const h=initCombat(s),item=EQUIPMENT.find(x=>x.id===id);
 if(!item||!h.gearOwned.includes(id)||huntLevel(s.xp)<item.level)return false;
 h.gear[item.slot]=id;return true;
}
export function equippedStats(s){
 const h=initCombat(s),base=combatStats(huntLevel(s.xp));
 for(const slot of ['weapon','armor']){
  const item=EQUIPMENT.find(x=>x.id===h.gear[slot]);
  base.attack+=item.attack||0;base.defense+=item.defense||0;base.maxHp+=item.hp||0;
 }
 return base;
}
export function skillStatus(s,id,mp,now=Date.now()){
 const h=initCombat(s),skill=HUNT_SKILLS.find(x=>x.id===id);
 if(!skill||!h.skills.includes(id))return {ok:false,error:'교본 구매'};
 if(huntLevel(s.xp)<skill.level)return {ok:false,error:'Lv.'+skill.level};
 const seconds=Math.max(0,Math.ceil(((h.skillCooldowns[id]||0)-now)/1000));
 if(seconds)return {ok:false,error:seconds+'초',seconds};
 if(mp<skill.mp)return {ok:false,error:'마나 부족'};
 return {ok:true,skill};
}
export function spendSkill(s,id,mp,now=Date.now()){
 const r=skillStatus(s,id,mp,now);if(!r.ok)return r;
 s.hunt.skillCooldowns[id]=now+r.skill.cooldown*1000;
 return {ok:true,mp:mp-r.skill.mp};
}
// Defense remains helpful without making high-level characters invulnerable.
export function incomingDamage(zone,boss,defense){
 const raw=[9,15,24,36][zone]*(boss?1.8:1);
 return Math.max(3,Math.round(raw*(100/(100+Math.max(0,defense)*3))));
}
