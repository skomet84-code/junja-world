import assert from 'node:assert/strict';
import {RODS,FISH,PHRASES,rodById,fishRoll,eligibleFish,reelChallenge,STARTER_FISH_NAMES,rewardForFish,validRodSave,aquariumSlots,fishArt,dailyMissions,HOME_LEVELS} from './life-systems-v20.js';
assert.equal(RODS.length,6);
assert.equal(FISH.length,70);
assert.equal(new Set(FISH.map(f=>f.name)).size,70);
assert.equal(STARTER_FISH_NAMES.length,6);
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
assert(eligibleFish('branch',1).every(f=>f.tier==='common'&&f.minLevel<=1),'Lv1 should only see small common fish');
assert(eligibleFish('mythic',1).every(f=>f.tier==='common'),'best rod cannot bypass player level gate');
assert(!eligibleFish('silver',9).some(f=>f.tier==='hero'),'hero unavailable under lv10');
assert(!eligibleFish('silver',16).some(f=>f.tier==='legend'),'legend requires upgraded fishing rod');
assert(eligibleFish('mythic',28).some(f=>f.tier==='mythic'),'mythic species unlock at high levels');
for(let i=0;i<100;i++){
 const f=FISH[fishRoll((i+.5)/100,'branch',1)];
 assert.equal(f.tier,'common','early game roll must never grant high-rarity fish');
}
const novice=reelChallenge(FISH.find(f=>f.tier==='common'),'branch');
const mythic=reelChallenge(FISH.find(f=>f.tier==='mythic'),'mythic');
assert(mythic.hits>novice.hits&&mythic.width<novice.width&&mythic.speed>novice.speed,'mythic fish must have harder actual reel mechanics');
assert(reelChallenge(FISH.find(f=>f.tier==='rare'),'silver').width>reelChallenge(FISH.find(f=>f.tier==='rare'),'branch').width,'high-quality rod must widen target');

let basicRare=0,advancedRare=0;
for(let i=0;i<1000;i++){
 const p=(i+.5)/1000;
 basicRare+=Number(FISH[fishRoll(p,'branch',18)].tier==='rare');
 advancedRare+=Number(FISH[fishRoll(p,'mythic',18)].tier==='rare');
}
assert(advancedRare>basicRare,'Upgraded fishing gear improves rare fish odds');
const stats={fish:3,harvest:4,talk:2,gather:5,craft:2,deliver:2,fishVariety:2,visit:3};
const q=dailyMissions('2026-10-17',stats);
const next=dailyMissions('2026-10-18',stats);
assert.equal(q.length,5);assert.equal(next.length,5);
assert.notDeepEqual(q.map(x=>x.id),next.map(x=>x.id));
assert(q.every(x=>x.done<=x.target&&x.done>=0));
assert(!('speed' in RODS[5]),'Fishing tools never change v18 movement');
console.log('PASS: 70 level-gated fish, actual reel difficulty, rare catch odds, 6 rods, aquarium preservation and no movement changes');
