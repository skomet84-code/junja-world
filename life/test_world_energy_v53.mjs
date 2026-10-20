import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorldEnergySpend,WORLD_ENERGY_KINDS} from './world-energy-v53.js';
import {ENERGY_COSTS} from './action-energy-v47.js';
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const v36=readFileSync(new URL('./cf/d1/economy-staging.js',import.meta.url),'utf8');
const website=readFileSync(new URL('./index.html',import.meta.url),'utf8');
for(const kind of WORLD_ENERGY_KINDS){
 assert.equal(Number.isInteger(ENERGY_COSTS[kind]),true,kind+' must have a real fixed server cost');
 assert(ENERGY_COSTS[kind]>0);
}
for(const [needle,kind] of [
 ["async function gather(id)","gather"],
 ["async function farmAt(i)","plant"],
 ["if(!await useWorldEnergy('craft'))return","craft"],
 ["if(!await useWorldEnergy('order'))return","order"],
 ["await useWorldEnergy('fish')","fish"]]){
 assert(game.includes(needle),'main world action missing energy integration: '+kind);
}
assert(game.includes("const worldEnergy=createWorldEnergySpend"),'main world needs server spend client');
assert(game.includes("await useWorldEnergy('plant')"),'plant must be charged before granting crops');
assert(!game.includes("useWorldEnergy('harvest')"),'harvesting never requires energy');
assert(!WORLD_ENERGY_KINDS.includes('harvest'),'harvest must not be chargeable by client');
assert(game.includes("await useWorldEnergy('gather')"),'gather must be charged before materials');
assert(game.includes("async function fishingAction()"),'manual fishing must await spend before granting fish');
assert(game.includes("async function autoFishTick()"),'auto-fishing cannot bypass energy budget');
assert(game.includes("fishPhase='settling'"),'stop fishing timer during server settlement');
assert(website.includes("game.js?v=v53-energy-spend-20261020")||website.includes("game.js?v=v55-grand-economy-20261020"),'force fresh browser bundle');
assert(v36.includes("action==='world_spend'"),'Cloudflare economy must acknowledge world costs');
assert(v36.includes("kind:p.kind"),'server cost uses canonical kind, no client-supplied cost');
let calls=[],confirm=[],next={current:98,max:100};
const request=async (url,options)=>{
 assert.equal(url,'/api/economy-v36');
 assert.equal(options.method,'POST');
 assert.equal(options.credentials,'same-origin');
 const data=JSON.parse(options.body);
 calls.push(data);
 return Response.json({ok:true,energy:next});
};
const helper=createWorldEnergySpend({request,onChange:x=>confirm.push(x)});
await helper.spend('plant');
assert.equal(calls.length,1);
assert.equal(calls[0].payload.kind,'plant');
assert.match(calls[0].requestId,/^[a-f\d-]{36}$/);
assert.equal(confirm[0].current,98);
let phase=0,ids=[];
const unstable=createWorldEnergySpend({request:async(url,opt)=>{
 const id=JSON.parse(opt.body).requestId;ids.push(id);phase++;
 if(phase===1)throw Error('timeout');
 return Response.json({ok:true,replayed:true,energy:{current:95,max:100}});
}});
await assert.rejects(()=>unstable.spend('fish'),/timeout/);
assert.equal(unstable.unresolved,true);
await assert.rejects(()=>unstable.spend('craft'),/이전 행동력/);
await unstable.spend('fish');
assert.equal(ids[0],ids[1],'ambiguous request retries must reuse one idempotency ID');
assert.equal(unstable.unresolved,false);
const rejected=createWorldEnergySpend({request:async()=>Response.json({error:'행동력이 부족해요'},{status:409})});
await assert.rejects(()=>rejected.spend('fish'),/부족/);
assert.equal(rejected.unresolved,false,'confirmed 409 allows new request');
const fail=createWorldEnergySpend({request:async()=>{throw Error('offline')}});
await assert.rejects(()=>fail.spend('plant'),/offline/);
assert.equal(fail.unresolved,true,'uncertain charge stays pending until resolved');
console.log('PASS v53: real world handlers use server energy, fail closed, replay-safe after timeouts and 409 shortages');
