import assert from 'node:assert/strict';
import {createAvatar} from './avatar3d.js';
import './navigation.js';

const coats=['mint','blue','rose','amber','lavender','coral','navy','cream','forest','pink','linen'];
const hats=['none','straw','beret','crown','flower','navycap','beanie','cat','ribbon','captain'];
const avatar=createAvatar();
assert.equal(avatar.rig.limbs.length,2);
let checked=0;
for(const coat of coats)for(const hat of hats){
  avatar.equip(coat,hat);
  avatar.animate({x:15,y:45,vx:110,vy:80,dir:0,stride:checked*.31},1/60,checked/60);
  assert.equal(avatar.equipped.coat,coat);
  assert.equal(avatar.equipped.hat,hat);
  const torso=avatar.rig.garment.getObjectByName('coat-shell');
  assert(torso?.geometry?.type==='LatheGeometry','Torso must be a real joined garment shell');
  assert(avatar.rig.limbs.every(l=>l.armCloth.children.length>=3 && l.foreCloth.children.length>=2),'Both sleeves need connected geometry');
  assert(Number.isFinite(avatar.root.rotation.y));
  checked++;
}
for(const species of ['rabbit','fox','cat','bear']){
  const animal=createAvatar({animal:species,coat:'mint'});
  animal.animate({x:10,y:20,vx:80,vy:0,stride:1.4},.016,1);
  assert.equal(animal.rig.limbs.length,2);
}
const nav=globalThis.JunjaNavigation({width:550,height:550,cell:32,walkable:(x,y)=>x>=0&&x<=550&&y>=0&&y<=550});
const actor={x:60,y:60,vx:0,vy:0,dir:0,stride:0},path=nav.route(actor,{x:460,y:380});
assert(path.length>0,'Touch target must be reachable');
let distance=0;
for(let frame=0;frame<500&&path.length;frame++)distance+=nav.advance(actor,path,1/60,190);
assert.equal(path.length,0,'Route should finish');
assert(Math.hypot(actor.x-460,actor.y-380)<.001,'Touch target should be exact');
assert.equal(actor.vx,0,'Stop without sliding');
assert.equal(actor.vy,0,'Stop without sliding');
assert(distance>450);
console.log('PASS: '+checked+' outfits, 4 villagers, exact-touch arrival and zero-inertia stop');
