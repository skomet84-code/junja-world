import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleTurnAnticipation} from './turn-anticipation-v60.js';
test('straight movement leaves face and shoulders neutral',()=>{
  assert.deepEqual(sampleTurnAnticipation(0,1),{headYaw:0,shoulderYaw:0});
});
test('head leads in the requested turn direction',()=>{
  const right=sampleTurnAnticipation(.9,1),left=sampleTurnAnticipation(-.9,1);
  assert.ok(right.headYaw>0&&left.headYaw<0);
  assert.ok(Math.abs(right.headYaw+left.headYaw)<1e-12);
  assert.ok(Math.abs(right.shoulderYaw)<Math.abs(right.headYaw));
});
test('turning in place still has a subtle response',()=>{
  const idle=sampleTurnAnticipation(.8,0),moving=sampleTurnAnticipation(.8,1);
  assert.ok(idle.headYaw>0&&idle.headYaw<moving.headYaw);
});
test('turn response is bounded at all angles and blends',()=>{
  for(const a of [-1e6,-10,-Math.PI,0,Math.PI,10,1e6])for(const blend of [-2,0,.5,1,10]){
    const pose=sampleTurnAnticipation(a,blend);
    assert.ok(Math.abs(pose.headYaw)<=.3200001);
    assert.ok(Math.abs(pose.shoulderYaw)<=.1120001);
  }
});
test('angles wrapping by full turns are equivalent',()=>{
  const a=sampleTurnAnticipation(.4,1),b=sampleTurnAnticipation(.4+Math.PI*2,1);
  assert.ok(Math.abs(a.headYaw-b.headYaw)<1e-12);
});
test('invalid inputs cannot poison animation transforms',()=>{
  for(const value of Object.values(sampleTurnAnticipation(NaN,Infinity)))assert.ok(Number.isFinite(value));
});
