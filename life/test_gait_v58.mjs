import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFootGait,sampleBodyGait} from './gait-pose-v58.js';

test('idle feet stay grounded with neutral joints',()=>{
 for(const side of [-1,1]){
  const foot=sampleFootGait(1.2,0,side);
  assert.equal(foot.ankleLift,0);
  assert.ok(Math.abs(foot.hip)<1e-12);
  assert.ok(Math.abs(foot.knee)<1e-12);
  assert.ok(Math.abs(foot.ankle)<1e-12);
 }
 const body=sampleBodyGait(1.2,0,2);
 assert.equal(body.pelvisY,34);
 assert.equal(body.pelvisX,0);
});

test('one foot lifts while opposite foot stays planted',()=>{
 const left=sampleFootGait(0,1,-1),right=sampleFootGait(0,1,1);
 assert.ok(left.ankleLift>2);
 assert.equal(right.ankleLift,0);
 assert.ok(right.ankle>0);
});

test('opposite gait phase swaps swing and stance',()=>{
 assert.ok(sampleFootGait(Math.PI,1,1).ankleLift>2);
 assert.equal(sampleFootGait(Math.PI,1,-1).ankleLift,0);
});

test('fade in/out scales lift without foot popping',()=>{
 const low=sampleFootGait(0,.25,-1),high=sampleFootGait(0,1,-1);
 assert.ok(low.ankleLift>0 && low.ankleLift<high.ankleLift);
 assert.equal(sampleFootGait(0,-1,-1).ankleLift,0);
 assert.equal(sampleFootGait(0,999,-1).ankleLift,high.ankleLift);
});

test('body weight shift and bounce are bounded',()=>{
 for(const phase of [0,Math.PI/4,Math.PI/2,Math.PI,3*Math.PI/2]){
  const body=sampleBodyGait(phase,1,3);
  assert.ok(body.pelvisY>=34 && body.pelvisY<=34.55+1e-8);
  assert.ok(Math.abs(body.pelvisX)<=1.1+1e-8);
 }
});

test('invalid numeric inputs cannot produce NaN pose',()=>{
 const a=sampleFootGait(NaN,NaN,-1),b=sampleBodyGait(Infinity,NaN,NaN);
 for(const n of [...Object.values(a),...Object.values(b)])assert.ok(Number.isFinite(n));
});
