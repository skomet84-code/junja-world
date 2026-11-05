// v54 combat progression and quest contracts. Client-side combat is NOT
// server-authoritative yet; do not misrepresent hunter medals as audited currency.
// This module preserves the old character XP and all preexisting hunt saves.
export const HUNT_MASTERY_GATES=Object.freeze([0,26,72,150,270,430]);
export const HUNT_BOSS_TRIALS=Object.freeze([
 Object.freeze({kills:10,elites:2}),
 Object.freeze({kills:16,elites:3}),
 Object.freeze({kills:22,elites:4}),
 Object.freeze({kills:30,elites:5}),
 Object.freeze({kills:38,elites:6}),
 Object.freeze({kills:46,elites:8})
]);
export const HUNT_DAILY_TASKS=Object.freeze([
 Object.freeze({id:'patrol',label:'정찰 토벌',property:'kills',required:8,reward:140}),
 Object.freeze({id:'elite',label:'정예 추적',property:'elites',required:2,reward:280}),
 Object.freeze({id:'boss',label:'수호자 도전',property:'bosses',required:1,reward:450})
]);
const empty=()=>({kills:0,elites:0,bosses:0,cleared:false,day:'',daily:{kills:0,elites:0,bosses:0},claims:{}});
const count=x=>Number.isSafeInteger(x)&&x>=0&&x<100000000?x:0;
function normalized(x){
 const o=x&&typeof x==='object'&&!Array.isArray(x)?x:{};
 return {
  ...empty(),...o,kills:count(o.kills),elites:count(o.elites),
  bosses:count(o.bosses),cleared:Boolean(o.cleared),
  daily:{kills:count(o.daily?.kills),elites:count(o.daily?.elites),bosses:count(o.daily?.bosses)},
  claims:o.claims&&typeof o.claims==='object'&&!Array.isArray(o.claims)?o.claims:{}
 };
}
export function initHuntMastery(hunt,zones){
 if(!hunt||typeof hunt!=='object'||Array.isArray(hunt))throw Error('사냥 기록 형식 확인 필요');
 if(!hunt.masteryV54||typeof hunt.masteryV54!=='object'||Array.isArray(hunt.masteryV54))
  hunt.masteryV54={score:0,areas:{}};
 const save=hunt.masteryV54;
 save.score=count(save.score);
 if(!save.areas||typeof save.areas!=='object'||Array.isArray(save.areas))save.areas={};
 for(const zone of zones){
  const p=normalized(save.areas[zone.id]);
  // Imported old daily-boss records are historical victories, not blank resets.
  // Preserve every legacy completed zone without granting bonus XP/gold.
  const legacy=Object.keys(hunt.bossDates||{}).some(key=>key.startsWith(zone.id+':')&&hunt.bossDates[key]);
  if(legacy)p.cleared=true;
  save.areas[zone.id]=p;
 }
 return save;
}
export function zoneAccess(hunt,zones,index,level){
 const zone=zones[index],save=initHuntMastery(hunt,zones);
 if(!zone)return {ok:false,reason:'없는 지역'};
 if(level<zone.level)return {ok:false,reason:'생활 Lv.'+zone.level+' 이상 필요'};
 const p=save.areas[zone.id];
 if(index===0||p.cleared)return {ok:true,reason:'입장 가능'};
 const prev=save.areas[zones[index-1].id];
 if(!prev.cleared)return {ok:false,reason:'이전 지역 보스 먼저 토벌'};
 if(save.score<HUNT_MASTERY_GATES[index])
  return {ok:false,reason:'사냥 숙련 '+HUNT_MASTERY_GATES[index]+' 필요 · 현재 '+save.score};
 return {ok:true,reason:'입장 가능'};
}
export function bossAccess(hunt,zones,index){
 const zone=zones[index],save=initHuntMastery(hunt,zones),p=save.areas[zone.id];
 const goals=HUNT_BOSS_TRIALS[index];
 if(!goals)return {ok:false,kills:p.kills,elites:p.elites,neededKills:999999,neededElites:999999,cleared:p.cleared};
 return {ok:p.kills>=goals.kills&&p.elites>=goals.elites,
  kills:p.kills,elites:p.elites,neededKills:goals.kills,neededElites:goals.elites,
  cleared:p.cleared};
}
export function masteryEnemy(base,playerLevel,zoneLevel,{elite=false,boss=false}={}){
 const over=Math.max(0,Math.min(40,Math.floor(playerLevel)-zoneLevel));
 const hpRate=1+over*(boss?.07:.11);
 const multiplier=boss?1:elite?2.4:1;
 const xpMultiplier=boss?.065:elite?.13:.11;
 const overlevelPenalty=over>23?.65:over>12?.82:1;
 const xp=Math.max(2,Math.min(boss?150:elite?35:25,Math.round(base.xp*xpMultiplier*(elite?1.55:1)*overlevelPenalty)));
 const hp=Math.max(1,Math.round(base.hp*hpRate*multiplier));
 return {...base,hp,xp,coins:Math.round(base.coins*(elite?1.65:1)),
  name:elite?'✦ 정예 '+base.name:base.name,boss,elite,
  pattern:boss?'phase':elite?'rush':['fairy','ghost','bat'].includes(base.kind)?'ranged':'pursue'};
}
export function hunterDamage(baseDamage,playerLevel,zoneLevel,{boss=false,elite=false}={}){
 const over=Math.max(0,Math.min(40,playerLevel-zoneLevel));
 return Math.max(3,Math.round(baseDamage+over*(boss?1.3:elite?.92:.62)));
}
export function registerHuntKill(hunt,zones,index,{elite=false,boss=false,day}={}){
 const save=initHuntMastery(hunt,zones),p=save.areas[zones[index].id],date=String(day||'');
 if(p.day!==date){p.day=date;p.daily={kills:0,elites:0,bosses:0}}
 p.kills++;p.daily.kills++;
 const points=boss?22:elite?5:2;
 if(elite){p.elites++;p.daily.elites++}
 if(boss){p.bosses++;p.daily.bosses++;p.cleared=true}
 save.score+=points;
 return {score:save.score,points,zone:p};
}
export function dailyHuntContracts(hunt,zones,index,day){
 const save=initHuntMastery(hunt,zones),p=save.areas[zones[index].id];
 const current=p.day===day?p.daily:{kills:0,elites:0,bosses:0};
 return HUNT_DAILY_TASKS.map(task=>({
  ...task,progress:Math.min(task.required,count(current[task.property])),
  claimed:Boolean(p.claims[day+':'+task.id]),
  ready:count(current[task.property])>=task.required&&!p.claims[day+':'+task.id]
 }));
}
export function claimHuntContract(hunt,zones,index,day,id){
 const task=dailyHuntContracts(hunt,zones,index,day).find(x=>x.id===id);
 if(!task||!task.ready)return {ok:false,error:'아직 달성하지 못했거나 이미 보상을 받았어'};
 const p=initHuntMastery(hunt,zones).areas[zones[index].id];
 p.claims[day+':'+id]=true;
 // Date keys grow slowly, but old claims are truncated without altering medals.
 if(Object.keys(p.claims).length>150)for(const key of Object.keys(p.claims).sort().slice(0,-100))delete p.claims[key];
 return {ok:true,reward:task.reward,task};
}
