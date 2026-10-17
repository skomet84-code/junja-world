import assert from 'node:assert/strict';
import {createAvatar} from '../life/avatar3d.js';
const a=createAvatar();const {head,hatSocket,garment,torso,limbs}=a.rig;
assert.equal(hatSocket.parent,head);assert.equal(garment.parent,torso);
for(const l of limbs){assert.equal(l.armCloth.parent,l.arm);assert.equal(l.foreCloth.parent,l.elbow);assert.equal(l.knee.parent,l.hip);assert.equal(l.ankle.parent,l.knee)}
for(const coat of ['mint','blue','rose','amber','lavender','coral','navy','cream','forest','pink','linen'])for(const hat of ['none','straw','flower','crown','beret','beanie','navycap','captain','cat','ribbon']){
 a.equip(coat,hat);for(let frame=0;frame<12;frame++){a.animate({x:50,y:75,vx:190,vy:0,stride:frame*Math.PI/6},1/60,frame/60);a.root.updateMatrixWorld(true);a.root.traverse(o=>{for(const n of o.matrixWorld.elements)assert.ok(Number.isFinite(n))})}
 assert.equal(hatSocket.parent,head);assert.equal(a.equipped.coat,coat);assert.equal(a.equipped.hat,hat);
}
a.equip('mint','none');assert.equal(hatSocket.children.length,0);a.equip('mint','straw');assert.ok(hatSocket.children.length>0);assert.ok(limbs[0].hip.rotation.x!==limbs[1].hip.rotation.x);
console.log('PASS 110 wearable combinations × 12 walking poses, shared parent joints, finite transforms, equip/remove');
