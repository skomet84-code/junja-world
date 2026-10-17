import assert from 'node:assert/strict';
import {RODS,FISH,PHRASES,rodById,fishRoll,rewardForFish,validRodSave,aquariumSlots,fishArt,dailyMissions,HOME_LEVELS} from './life-systems-v20.js';
assert.equal(RODS.length,6);
assert.equal(FISH.length,6);
assert.equal(PHRASES.length,6);
assert.equal(HOME_LEVELS.length,4);
assert.deepEqual(validRodSave({owned:['gold','bad','gold'],equipped:'not-real'}),{owned:['branch','gold'],equipped:'branch'});
assert.equal(aquariumSlots(1),3);assert.equal(aquariumSlots(5),6);assert.equal(aquariumSlots(8),9);assert.equal(aquariumSlots(12),12);
for(const f of FISH){
 const picture=fishArt(f.name);
 assert(picture.includes('<svg')&&picture.includes('aria-label="'+f.name+' 그림"'));
 assert(picture.includes('<ellipse')&&picture.includes('<path'));
}
for(let i=1;i<RODS.length;i++){
 assert(RODS[i].price>RODS[i-1].price);
 assert(RODS[i].wait<RODS[i-1].wait);
 assert(RODS[i].rare>RODS[i-1].rare);
 assert(RODS[i].window>RODS[i-1].window);
 assert(rewardForFish(FISH[0],RODS[i].id)>=rewardForFish(FISH[0],RODS[i-1].id));
}
assert(fishRoll(.995,'branch')===5,'Legendary fish remains possible on basic gear');
let basicRare=0,advancedRare=0;
for(let i=0;i<1000;i++){
 const p=(i+.5)/1000;
 basicRare+=Number(fishRoll(p,'branch')>=3);
 advancedRare+=Number(fishRoll(p,'mythic')>=3);
}
assert(advancedRare>basicRare,'Upgraded fishing gear improves rare fish odds');
const stats={fish:3,harvest:4,talk:2,gather:5,craft:2,deliver:2,fishVariety:2,visit:3};
const q=dailyMissions('2026-10-17',stats);
const next=dailyMissions('2026-10-18',stats);
assert.equal(q.length,5);assert.equal(next.length,5);
assert.notDeepEqual(q.map(x=>x.id),next.map(x=>x.id));
assert(q.every(x=>x.done<=x.target&&x.done>=0));
assert(!('speed' in RODS[5]),'Fishing tools never change v18 movement');
console.log('PASS: 6 balanced fishing rods, fish silhouettes, 4 home levels, 12 aquarium slots, 5 rotating daily missions, no movement changes');
