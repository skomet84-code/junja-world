import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFaceExpression} from './face-expression-v65.js';
test('eyes remain open away from blink',()=>{for(const t of [0,1,3,4.3])assert.equal(sampleFaceExpression(t).eyeOpen,1)});
test('blink closes smoothly and never disappears completely',()=>{const a=sampleFaceExpression(4.45).eyeOpen,b=sampleFaceExpression(4.558).eyeOpen,c=sampleFaceExpression(4.69).eyeOpen;assert.equal(a,1);assert.ok(b>=.1-1e-12&&b<.11);assert.equal(c,1)});
test('eye openness has no large jumps at blink boundaries',()=>{for(const t of [4.45,4.558,4.69,4.7])assert.ok(Math.abs(sampleFaceExpression(t-.0001).eyeOpen-sampleFaceExpression(t+.0001).eyeOpen)<.02)});
test('expression repeats with deterministic cycle',()=>{assert.ok(Math.abs(sampleFaceExpression(4.558).eyeOpen-sampleFaceExpression(9.258).eyeOpen)<1e-12)});
test('smile responds to walking without over-stretching',()=>{const idle=sampleFaceExpression(1,0),walk=sampleFaceExpression(1,1);assert.ok(walk.mouthWidth>idle.mouthWidth);assert.ok(walk.mouthWidth<=1.15);assert.ok(walk.mouthHeight<=1.22)});
test('invalid inputs cannot poison character transforms',()=>{for(const t of [NaN,Infinity,-Infinity])for(const m of [NaN,Infinity,-Infinity])for(const value of Object.values(sampleFaceExpression(t,m)))assert.ok(Number.isFinite(value))});
