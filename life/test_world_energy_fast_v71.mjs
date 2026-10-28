import assert from 'node:assert/strict';
import {createWorldEnergySpend} from './world-energy-v53.js';

const pending=[],changes=[],started=[];
const request=async(path,options)=>{
 const body=JSON.parse(options.body);
 started.push(body);
 return new Promise(resolve=>pending.push(({ok=true,current=200,status=200,error=''}={})=>{
  resolve({ok,status,json:async()=>ok?{ok:true,energy:{current,max:200,regenSeconds:180,nextRegenSeconds:180}}:{error}});
 }));
};
const energy=createWorldEnergySpend({request,onChange:value=>changes.push(value.current)});
const first=energy.spend('gather'),second=energy.spend('gather'),third=energy.spend('plant');
await Promise.resolve();
assert.equal(started.length,1,'only first tap requests server immediately');
assert.equal(energy.queued,3,'other taps are queued without a blocking toast');
pending.shift()({current:197});
assert.equal((await first).current,197);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(started.length,2,'the second tap executes after the first');
assert.notEqual(started[0].requestId,started[1].requestId,'distinct actions get distinct idempotency IDs');
pending.shift()({current:194});
assert.equal((await second).current,194);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(started.length,3);
pending.shift()({current:192});
assert.equal((await third).current,192);
assert.deepEqual(changes,[197,194,192]);
assert.equal(energy.queued,0);

const denied=energy.spend('gather');
await new Promise(resolve=>setImmediate(resolve));
pending.shift()({ok:false,status:409,error:'행동력이 부족해요'});
await assert.rejects(denied,/행동력이 부족/);
const afterDenied=energy.spend('plant');
await new Promise(resolve=>setImmediate(resolve));
pending.shift()({current:190});
assert.equal((await afterDenied).current,190,'a deterministic rejection does not block later taps');
console.log('PASS v71 mobile rapid gather queue + energy rejection recovery');
