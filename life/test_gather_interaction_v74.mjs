import test from 'node:test';
import assert from 'node:assert/strict';
import {createGatherGate,sampleGatherPulse} from './gather-interaction-v74.js';

test('rapid repeated taps do not execute or charge twice',async()=>{
 let release,charges=0;
 const blocker=new Promise(resolve=>release=resolve);
 const events=[];
 const gate=createGatherGate({onChange:id=>events.push(id)});
 const first=gate.run('wood1',async()=>{charges++;await blocker;return 'wood'});
 assert.equal(gate.activeId,'wood1');
 const second=await gate.run('wood1',async()=>{charges++;return 'duplicate'});
 const third=await gate.run('stone1',async()=>{charges++;return 'other'});
 assert.equal(second.started,false);
 assert.equal(third.started,false);
 assert.equal(charges,1);
 release();
 assert.deepEqual(await first,{started:true,result:'wood'});
 assert.equal(gate.activeId,null);
 assert.deepEqual(events,['wood1',null]);
});
test('failure or server refusal releases touch interaction for retry',async()=>{
 const gate=createGatherGate();
 await assert.rejects(()=>gate.run('wood1',async()=>{throw Error('API offline')}),/API offline/);
 assert.equal(gate.activeId,null);
 assert.deepEqual(await gate.run('wood1',async()=>false),{started:true,result:false});
 assert.equal(gate.activeId,null);
});
test('resource pulse is bounded, deterministic, and respects reduced motion',()=>{
 for(let i=0;i<100;i++){
  const time=i*.07;
  const pulse=sampleGatherPulse(time);
  assert.ok(pulse>=1&&pulse<=1.0280001);
  assert.equal(pulse,sampleGatherPulse(time));
  assert.equal(sampleGatherPulse(time,true),1);
 }
 assert.ok(Number.isFinite(sampleGatherPulse(NaN)));
});
