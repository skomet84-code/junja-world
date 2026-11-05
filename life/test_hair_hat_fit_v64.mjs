import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHairHatFit,sampleLooseHairMotion} from './hair-hat-fit-v64.js';
test('wide hats hide scalp but retain long side hair',()=>{
 for(const hat of ['straw','flower','beret','beanie','navycap','captain'])
  assert.deepEqual(resolveHairHatFit(hat,'long'),{crownVisible:false,looseVisible:true});
});
test('short cuts stay tucked beneath hats',()=>{
 assert.deepEqual(resolveHairHatFit('straw','short'),{crownVisible:false,looseVisible:false});
});
test('crowns and ribbons retain the whole hairstyle',()=>{
 for(const hat of ['none','crown','cat','ribbon'])
  assert.deepEqual(resolveHairHatFit(hat,'wolf'),{crownVisible:true,looseVisible:true});
});
test('all supported long hair styles retain their loose strands',()=>{
 for(const shape of ['bob','long','layer','wolf','wave','twin','braid'])
  assert.equal(resolveHairHatFit('beanie',shape).looseVisible,true);
});
test('idle hair rests and short hair is never animated',()=>{
 assert.deepEqual(sampleLooseHairMotion(2,0,0,'long'),{roll:0,bob:0});
 assert.deepEqual(sampleLooseHairMotion(2,1,.2,'short'),{roll:0,bob:0});
});
test('hair movement is subtle and always finite',()=>{
 for(const shape of ['long','wolf','twin','bob'])
  for(const phase of [-30,0,1,3,100,NaN])
   for(const blend of [-1,0,.5,1,Infinity]){
    const p=sampleLooseHairMotion(phase,blend,Infinity,shape);
    assert.ok(Number.isFinite(p.roll)&&Number.isFinite(p.bob));
    assert.ok(Math.abs(p.roll)<=.0601&&p.bob>=0&&p.bob<=.321);
   }
});
