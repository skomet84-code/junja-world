import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleContactShadow} from './contact-shadow-v61.js';
test('planted foot casts a clear but subtle contact shadow',()=>{
 const s=sampleContactShadow(0);
 assert.equal(s.opacity,0.13);
 assert.equal(s.scale,1);
});
test('raised foot shadow fades and contracts',()=>{
 const planted=sampleContactShadow(0),mid=sampleContactShadow(3),raised=sampleContactShadow(8);
 assert.ok(planted.opacity>mid.opacity&&mid.opacity>raised.opacity);
 assert.ok(planted.scale>mid.scale&&mid.scale>raised.scale);
 assert.ok(raised.opacity>=0.02);
});
test('invalid or negative lift cannot produce broken transforms',()=>{
 for(const value of [NaN,Infinity,-Infinity,-12,1e9]){
  const result=sampleContactShadow(value);
  assert.ok(Number.isFinite(result.opacity)&&Number.isFinite(result.scale));
  assert.ok(result.opacity>=0.025&&result.opacity<=0.13);
  assert.ok(result.scale>=0.8&&result.scale<=1);
 }
});
test('both feet have identical grounded response',()=>{
 assert.deepEqual(sampleContactShadow(0),sampleContactShadow(-0));
});
