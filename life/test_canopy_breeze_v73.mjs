import assert from 'node:assert/strict';
import {sampleCanopyBreeze as wind} from './canopy-breeze-v73.js';
for(const x of [0,200,900,3400])for(const z of [0,350,2200])for(const t of [0,.016,1,12,99,10000]){
 const a=wind(t,x,z),b=wind(t,x,z,1);
 assert.equal(a,wind(t,x,z),'deterministic');
 assert.ok(Number.isFinite(a)&&Math.abs(a)<=.018,'bounded z sway');
 assert.ok(Number.isFinite(b)&&Math.abs(b)<=.018,'bounded x sway');
 assert.equal(wind(t,x,z,0,true),0,'reduced-motion stops sway');
 assert.ok(Math.abs(a-wind(t+.016,x,z))<.001,'frame-to-frame continuity');
}
assert.ok(Number.isFinite(wind(NaN,Infinity,-Infinity)));
assert.notEqual(wind(2,200,300),wind(3,200,300),'animation changes over time');
assert.notEqual(wind(2,200,300),wind(2,200,300,1),'two-axis sway');
console.log('PASS v73 canopy breeze bounds, continuity, reduced-motion, determinism');
