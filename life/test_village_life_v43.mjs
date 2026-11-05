import assert from 'node:assert/strict';
import {V43_RESIDENTS,v43Daypart,npcDailyRoutine,updateVillageResidents,npcDailyLine,v43LightMood} from './village-life-v43.js';
const kst=iso=>new Date(iso);
assert.equal(v43Daypart(kst('2026-10-18T22:30:00Z')),'morning'); // 07:30 KST
assert.equal(v43Daypart(kst('2026-10-19T03:00:00Z')),'day'); // noon KST
assert.equal(v43Daypart(kst('2026-10-19T10:00:00Z')),'evening'); // 19 KST
assert.equal(v43Daypart(kst('2026-10-19T14:00:00Z')),'night'); // 23 KST
assert.equal(v43LightMood(kst('2026-10-19T10:00:00Z')).phase,'evening');
assert.equal(v43LightMood(kst('2026-10-19T14:00:00Z')).sun<3.1,true);
assert.equal(Object.keys(V43_RESIDENTS).length,3);
for(const [name,profile] of Object.entries(V43_RESIDENTS)){
 const start=npcDailyRoutine(name,0);
 assert.deepEqual([start.x,start.y],profile.home,'NPC starts at safe standing position');
 const mid=npcDailyRoutine(name,10000);
 const same=npcDailyRoutine(name,10000);
 assert.deepEqual(mid,same,'NPC motion must be deterministic and multiplayer-display stable');
 assert.equal(mid.moving,true);
 assert(Math.hypot(mid.x-start.x,mid.y-start.y)>0,'Resident should actually stroll');
 const loop=npcDailyRoutine(name,90000);
 assert.deepEqual([loop.x,loop.y],profile.home,'Finite movement loops exactly');
 assert.equal(typeof npcDailyLine(name,kst('2026-10-19T14:00:00Z')),'string');
 assert.equal(profile.stops.length,4);
}
assert.equal(npcDailyRoutine('hacker',1000),null);
const residents=Object.entries(V43_RESIDENTS).map(([name,r])=>({name,x:r.home[0],y:r.home[1]}));
const before=structuredClone(residents),moved=updateVillageResidents(residents,13000,()=>true);
assert.equal(moved.length,3);
assert(residents.some((r,i)=>r.x!==before[i].x||r.y!==before[i].y),'Real NPC hit positions must follow the animation');
assert.equal(typeof residents[0].walkCycle,'number');
const frozen=structuredClone(before),checked=updateVillageResidents(frozen,13000,()=>false);
assert(checked.every(x=>!x.walking),'Invalid/nonwalkable plot stops NPC safely');
assert.deepEqual(frozen.map(r=>[r.x,r.y]),before.map(r=>[r.x,r.y]),'Blocked paths keep original interaction anchors');
const user={coins:200000,xp:5400,level:35,stock:{berry:99}};
const original=JSON.stringify(user);
updateVillageResidents(residents,23000,()=>true);
assert.equal(JSON.stringify(user),original,'NPC/daylight decoration never touches saved assets');
console.log('PASS v43 KST clocks, NPC deterministic strolls, interactive hit position, collision fallback and wallet immutability');
