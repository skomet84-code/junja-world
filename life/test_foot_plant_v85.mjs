import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleFootGait} from './gait-pose-v58.js';

test('feet alternate and return to ground at stance',()=>{
 const left=sampleFootGait(0,1,-1),right=sampleFootGait(0,1,1);
 assert.ok(left.ankleLift>2.5);
 assert.equal(right.ankleLift,0);
 assert.equal(sampleFootGait(Math.PI,1,-1).ankleLift,0);
});
test('smooth landing has no jump or nonfinite poses',()=>{
 let last=sampleFootGait(0,1,-1).ankleLift;
 for(let i=1;i<=1000;i++){
  const pose=sampleFootGait(i*Math.PI*2/1000,1,-1);
  assert.ok(Object.values(pose).every(Number.isFinite));
  assert.ok(Math.abs(pose.ankleLift-last)<.04);
  last=pose.ankleLift;
 }
});
test('idle has no foot lift and invalid input is safe',()=>{
 for(const phase of [0,.5,1,2,3])assert.equal(sampleFootGait(phase,0,-1).ankleLift,0);
 assert.ok(Object.values(sampleFootGait(NaN,NaN,1)).every(Number.isFinite));
});
