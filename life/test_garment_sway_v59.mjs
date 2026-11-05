import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleGarmentSway} from './garment-sway-v59.js';
test('idle clothes rest without jitter',()=>{assert.deepEqual(sampleGarmentSway(12,0,90),{roll:0,pitch:0,hemLift:0})});
test('sway stays subtle across stride and speeds',()=>{for(const phase of [-10,0,1,2,4,100])for(const speed of [0,100,1000]){const p=sampleGarmentSway(phase,1,speed);assert.ok(Math.abs(p.roll)<=.043);assert.ok(Math.abs(p.pitch)<=.025);assert.ok(p.hemLift>=0&&p.hemLift<=.61)}});
test('invalid inputs never poison rig transforms',()=>{for(const p of Object.values(sampleGarmentSway(NaN,Infinity,-Infinity)))assert.ok(Number.isFinite(p))});
test('fade preserves proportional cloth motion',()=>{const a=sampleGarmentSway(1,.5,100),b=sampleGarmentSway(1,1,100);assert.ok(Math.abs(a.roll*2-b.roll)<1e-10)});
