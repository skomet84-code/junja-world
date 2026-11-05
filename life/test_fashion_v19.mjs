import assert from 'node:assert/strict';
import {CATALOG,CATALOG_BY_ID,CATEGORIES,GRADES,validFashion,petBonus} from './fashion-catalog.js';
import {createAvatar} from './avatar3d.js';
import {createPet} from './fashion-3d.js';

assert(CATALOG.length>=100,'Preserve the original 100 playable items');
assert.equal(new Set(CATALOG.map(x=>x.id)).size,CATALOG.length,'IDs unique');
for(const [type,count] of [['hair',20],['outfit',40],['accessory',20],['pet',20]])
 assert(CATALOG.filter(x=>x.type===type).length>=count,type+' original catalog retained');
for(const item of CATALOG){
 assert(item.name&&item.price>0&&GRADES[item.grade]&&CATALOG_BY_ID[item.id]===item);
 assert(Number.isInteger(item.color)&&Number.isInteger(item.price));
}
assert.deepEqual(validFashion({hair:'invalid',outfit:CATALOG.find(x=>x.type==='outfit').id}),{
 hair:null,outfit:CATALOG.find(x=>x.type==='outfit').id,accessory:null,pet:null});
const hair=CATALOG.filter(x=>x.type==='hair');
const clothes=CATALOG.filter(x=>x.type==='outfit');
const extras=CATALOG.filter(x=>x.type==='accessory');
const pets=CATALOG.filter(x=>x.type==='pet');
const avatar=createAvatar();
for(let i=0;i<clothes.length;i++){
 const item=clothes[i];
 avatar.equip(item.id,'none');
 avatar.setFashion({hair:hair[i%20].id,accessory:extras[i%20].id});
 avatar.animate({x:100,y:200,vx:160,vy:0,dir:1,stride:i*1.3},1/60,i);
 assert.equal(avatar.equipped.coat,item.id);
 assert(avatar.rig.garment.getObjectByName('coat-shell'),'real wearable shell');
 assert(avatar.rig.limbs.every(l=>l.armCloth.children.length>=3),'rigged sleeves still attached');
}
avatar.setFashion({hair:null,accessory:null});
avatar.equip('mint','none');
assert.equal(avatar.equipped.coat,'mint','legacy wardrobe remains');
let tested=0;
for(const item of pets){
 const pet=createPet(item);
 for(let i=0;i<3;i++)pet.update(200+i*12,300+i*3,1/60,i*.2);
 assert(pet.root.children.length>0,'pet rig is in the scene');
 pet.dispose();
 tested++;
}
avatar.dispose();
assert(petBonus(pets[0].id,'gather')>0);
assert.equal(petBonus(null,'gather'),0);
assert.equal(petBonus(pets[0].id,'move'),0,'movement permanently unchanged');
assert(CATALOG.at(-1).price>CATALOG[0].price,'luxury more expensive');
console.log('PASS: '+CATALOG.length+' catalog entries, '+clothes.length+' articulated outfits, '+pets.length+' animated pets and no movement modifiers');
