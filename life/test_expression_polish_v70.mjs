import assert from 'node:assert/strict';
import {sampleExpressionPolish as sample} from './expression-polish-v70.js';
for(const t of [0,.1,3.65,3.77,7.65,7.99,12,1000]){
 const a=sample(t,0),b=sample(t,1);
 assert.deepEqual(a,sample(t,0));
 assert.ok(a.eyeOpen>=.09&&a.eyeOpen<=1);
 assert.ok(a.mouthWidth>=1&&a.mouthWidth<=1.17);
 assert.ok(Math.abs(a.headIdleRoll)<=.075);
 assert.ok(Math.abs(a.headIdlePitch)<=.009);
 assert.ok(b.mouthWidth>=a.mouthWidth-.000001);
}
assert.ok(sample(3.77).eyeOpen<sample(3.4).eyeOpen,'blink closes eye');
assert.ok(sample(7.99).eyeOpen<sample(7.3).eyeOpen,'double blink');
assert.ok(Number.isFinite(sample(NaN,Infinity).headIdleRoll));
console.log('PASS v67-v70 facial animation safety and deterministic sampling');
