// v43 — client-only, deterministic neighborhood life. No wallet, XP, level or cloud-save writes.
// NPC world coordinates are updated in place so pick and walk-to interactions remain aligned.
export const V43_RESIDENTS=Object.freeze({
 '리나':Object.freeze({home:[1370,945],stops:Object.freeze([[1370,945],[1310,915],[1210,910],[1370,945]]),
  greetings:Object.freeze({morning:'오늘은 의상실에 새 옷이 들어왔어. 산책하고 들러!',day:'가게 앞 꽃길이 정말 예쁘지?',evening:'노을이 지면 광장이 참 멋져.',night:'밤 산책은 천천히 해야 해.'})}),
 '토비':Object.freeze({home:[730,1000],stops:Object.freeze([[730,1000],[765,1050],[825,975],[730,1000]]),
  greetings:Object.freeze({morning:'낚싯대를 챙기고 바다로 가볼까?',day:'오늘도 좋은 물고기가 올라올 것 같아!',evening:'해 질 무렵 낚시는 특별하거든.',night:'밤낚시는 안전부터 챙겨.'})}),
 '유니':Object.freeze({home:[1130,1030],stops:Object.freeze([[1130,1030],[1150,970],[1225,1010],[1130,1030]]),
  greetings:Object.freeze({morning:'좋은 아침! 꽃들이 고개를 들었어.',day:'텃밭이 자라나는 소리 들리지?',evening:'조용한 정원에서 쉬고 싶어.',night:'내일도 우리 마을에서 만나자.'})})
});
export function v43Daypart(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const hour=Number(parts.find(p=>p.type==='hour')?.value);
 if(!Number.isInteger(hour))return 'day';
 return hour>=21||hour<6?'night':hour<11?'morning':hour<18?'day':'evening';
}
export function npcDailyRoutine(name,epochMs){
 const profile=V43_RESIDENTS[name];
 if(!profile||!Number.isFinite(epochMs))return null;
 // 90-second repeating loop, with a short pause at every stop. Stable across frames,
 // without random values or global timers that could leak between scene mounts.
 const hopMs=22500,total=profile.stops.length*hopMs;
 const offset=((epochMs%total)+total)%total;
 const section=Math.floor(offset/hopMs),t=(offset%hopMs)/hopMs;
 const from=profile.stops[section],to=profile.stops[(section+1)%profile.stops.length];
 const fraction=t<.25?0:Math.min(1,(t-.25)/.75);
 const ease=fraction*fraction*(3-2*fraction);
 const x=from[0]+(to[0]-from[0])*ease,y=from[1]+(to[1]-from[1])*ease;
 const speed=t>=.25&&t<1?Math.hypot(to[0]-from[0],to[1]-from[1])*.075/(hopMs/1000):0;
 return {x,y,moving:speed>.01,speed,phase:section,progress:fraction};
}
export function updateVillageResidents(residents,epochMs,walkable=()=>true){
 if(!Array.isArray(residents)||!Number.isFinite(epochMs))return [];
 const output=[];
 for(const npc of residents){
  const progress=npcDailyRoutine(npc.name,epochMs);
  if(!progress)continue;
  const safe=walkable(progress.x,progress.y);
  if(safe){npc.x=progress.x;npc.y=progress.y;}
  else {const anchor=V43_RESIDENTS[npc.name].home;npc.x=anchor[0];npc.y=anchor[1];}
  npc.vx=safe&&progress.moving?progress.speed:0;
  npc.vy=0;
  npc.walkCycle=safe&&progress.moving?epochMs/145:0;
  output.push({name:npc.name,x:npc.x,y:npc.y,walking:!!npc.vx});
 }
 return output;
}
export function npcDailyLine(name,date=new Date()){
 const p=V43_RESIDENTS[name];return p?.greetings[v43Daypart(date)]||'우리 마을에 어서 와!';
}
export function v43LightMood(date=new Date()){
 const phase=v43Daypart(date);
 return {
  phase,
  background:phase==='night'?0x889cb2:phase==='evening'?0xe6c4a5:phase==='morning'?0xd9e6ca:0xb3decd,
  // Deliberately subtle: readable paths / shop UI at night, no full-screen darkness.
  sun:phase==='night'?1.9:phase==='evening'?2.35:phase==='morning'?2.6:3.1,
  hemisphere:phase==='night'?2.1:phase==='evening'?2.4:2.65
 };
}
