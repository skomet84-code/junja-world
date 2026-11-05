import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleHeadwearMotion} from './headwear-motion-v63.js';
test('no headwear never changes head socket',()=>{
 assert.deepEqual(sampleHeadwearMotion(2,1,.2,'none'),{bob:0,roll:0,pitch:0});
 assert.deepEqual(sampleHeadwearMotion(2,1,.2,null),{bob:0,roll:0,pitch:0});
});
test('idle hats settle at the original socket position',()=>{
 assert.deepEqual(sampleHeadwearMotion(2,0,0,'straw'),{bob:0,roll:0,pitch:0});
});
test('moving brim hat subtly follows each step',()=>{
 const p=sampleHeadwearMotion(Math.PI/2,1,0,'straw');
 assert.ok(p.bob>.35&&p.bob<=.38);
 assert.ok(p.roll>0&&p.roll<.03);
});
test('head turn adds opposite directional inertia',()=>{
 const left=sampleHeadwearMotion(0,1,-.25,'straw');
 const right=sampleHeadwearMotion(0,1,.25,'straw');
 assert.ok(left.roll>0&&right.roll<0);
 assert.ok(Math.abs(left.roll+right.roll)<1e-12);
});
test('all hat types remain within tight clipping-safe limits',()=>{
 for(const hat of ['straw','flower','crown','beanie','beret','captain','cat','ribbon'])
 for(const phase of [-100,-3,0,1,3,100])
 for(const blend of [-10,0,.3,1,10]){
  const p=sampleHeadwearMotion(phase,blend,Math.PI,hat);
  assert.ok(p.bob>=0&&p.bob<=.381);
  assert.ok(Math.abs(p.roll)<=.0601);
  assert.ok(Math.abs(p.pitch)<=.0141);
 }
});
test('invalid numeric values never poison rig transforms',()=>{
 for(const p of Object.values(sampleHeadwearMotion(NaN,Infinity,-Infinity,'flower')))assert.ok(Number.isFinite(p));
});
