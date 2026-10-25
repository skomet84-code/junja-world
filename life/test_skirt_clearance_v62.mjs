import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSkirtClearance} from './skirt-clearance-v62.js';

test('idle hem remains still and unexpanded',()=>{
 const p=sampleSkirtClearance(5,0,100);
 assert.deepEqual(p,{roll:0,pitch:0,hemLift:0,spread:1});
});
test('swinging legs create bounded clearance',()=>{
 const p=sampleSkirtClearance(Math.PI/2,1,120);
 assert.ok(p.spread>1.04 && p.spread<=1.095);
});
test('skirt motion and spread are always finite',()=>{
 for(const args of [[NaN,NaN,Infinity],[Infinity,-10,-Infinity],[-Infinity,100,NaN]]){
  for(const v of Object.values(sampleSkirtClearance(...args)))assert.ok(Number.isFinite(v));
 }
});
test('spread eases away when stopping',()=>{
 const moving=sampleSkirtClearance(Math.PI/2,1,120);
 const stopping=sampleSkirtClearance(Math.PI/2,.3,120);
 assert.ok(stopping.spread>1 && stopping.spread<moving.spread);
});
