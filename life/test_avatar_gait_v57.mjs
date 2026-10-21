import assert from 'node:assert/strict';
import {computeGaitPose} from './avatar-gait-v57.js';
const idle=computeGaitPose(0,0,0);
assert.equal(idle.limbs[0].hipX,0);assert.equal(idle.limbs[1].hipX,0);
const moving=computeGaitPose(Math.PI/2,1,1);
assert.ok(moving.limbs[0].hipX>0&&moving.limbs[1].hipX<0,'legs alternate');
assert.ok(moving.limbs[0].armX<0&&moving.limbs[1].armX>0,'arms counter-swing');
assert.ok(computeGaitPose(0,1,1,4).headYaw<=.1320001,'turn lead clamped');
for(const blend of [-10,0,.5,1,9])for(const phase of [0,Math.PI/2,Math.PI,Math.PI*2]){
 const pose=computeGaitPose(phase,blend,4);
 assert.ok(pose.pelvisY>=33.7&&pose.pelvisY<=35,'bounded vertical motion');
 assert.ok(pose.limbs.every(l=>Object.values(l).every(Number.isFinite)),'finite joints');
}
console.log('v57 gait pose: idle, alternation, turn clamp, finite joints passed');
