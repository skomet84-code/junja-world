import assert from 'node:assert/strict';
import test from 'node:test';
import {approachGlow,porchGlowTarget} from '../life/porch-glow-v93.mjs';

test('porch glow is daytime dim, evening warm, reduced motion steady',()=>{
 assert.equal(porchGlowTarget('morning',10,0),.16);
 assert.equal(porchGlowTarget('night',10,0,true),.52);
 assert.equal(porchGlowTarget('night',20,0,true),.52);
 const value=porchGlowTarget('evening',10,1);
 assert.ok(value>=.405&&value<=.555);
});
test('transition is frame-rate independent',()=>{
 const one=approachGlow(.16,.52,1);
 let many=.16;
 for(let i=0;i<60;i++)many=approachGlow(many,.52,1/60);
 assert.ok(Math.abs(one-many)<1e-12);
 assert.ok(one>.16&&one<.52);
});
test('invalid and zero dt never overshoot',()=>{
 assert.equal(approachGlow(.2,.6,0),.2);
 assert.equal(approachGlow(.2,.6,NaN),.2);
 assert.ok(approachGlow(.2,.6,10)<=.6);
});
