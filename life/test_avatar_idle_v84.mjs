import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sampleBodyGait} from './gait-pose-v58.js';

test('idle breathing is subtle, periodic and finite',()=>{
 const poses=Array.from({length:120},(_,i)=>sampleBodyGait(0,0,i/20));
 assert.ok(poses.every(p=>Object.values(p).every(Number.isFinite)));
 assert.ok(Math.max(...poses.map(p=>p.pelvisY))-Math.min(...poses.map(p=>p.pelvisY))<=.361);
 assert.ok(Math.max(...poses.map(p=>p.pelvisY))-Math.min(...poses.map(p=>p.pelvisY))>.3);
});
test('walking fully suppresses idle breathing',()=>{
 assert.deepEqual(sampleBodyGait(1.2,1,0),sampleBodyGait(1.2,1,9));
});
test('blend stays bounded and non-finite inputs stay safe',()=>{
 assert.deepEqual(sampleBodyGait(0,2,0),sampleBodyGait(0,1,0));
 assert.ok(Object.values(sampleBodyGait(NaN,NaN,NaN)).every(Number.isFinite));
});
