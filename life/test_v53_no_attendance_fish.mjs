import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FISH,fishArt,FISH_BY_NAME} from './life-systems-v20.js';
import {LONG_CHAPTER_BLUEPRINTS,makeLivingChapters} from './living-world.js';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const portraits=readFileSync(new URL('./fish-portraits.js',import.meta.url),'utf8');
const menu=readFileSync(new URL('./village-navigation-v49.js',import.meta.url),'utf8');
// Do not delete or re-number chapters: existing players persist state.chapter
// as an array index and must not be set back to the start.
assert.equal(LONG_CHAPTER_BLUEPRINTS.length,42);
assert.deepEqual(LONG_CHAPTER_BLUEPRINTS.map(x=>x.id),Array.from({length:42},(_,i)=>i+9));
for(const id of [18,43,49]){
 const quest=LONG_CHAPTER_BLUEPRINTS.find(x=>x.id===id);
 assert(quest,'main chapter '+id+' is not deleted');
 assert.notEqual(quest.metric,'attendance','main chapters may not block progress for days');
 assert(!/출석/.test(quest.title+' '+quest.desc),'no attendance-specific task title');
 assert(quest.total>0&&quest.reward>0&&quest.xp>0);
}
assert(LONG_CHAPTER_BLUEPRINTS.every(q=>q.metric!=='attendance'),'no attendance gate in any main chapter');
assert.equal(LONG_CHAPTER_BLUEPRINTS.find(q=>q.id===18).reward,1830);
assert.equal(LONG_CHAPTER_BLUEPRINTS.find(q=>q.id===43).reward,4760);
assert.equal(LONG_CHAPTER_BLUEPRINTS.find(q=>q.id===49).reward,5460);
const veteran={
 attendance:{total:0},craftCount:13,harvest:120,fish:0,collection:[],
 friends:{},animalBonds:{},decorations:[],home:{furniture:[]},
 fashion:{owned:[]},visits:{},hunt:{kills:0}
};
const progress=makeLivingChapters(veteran,FISH_BY_NAME);
assert.equal(progress[18-9].done(),10,'existing zero-attendance player can finish chapter 18 with existing craft progress');
assert.equal(progress[43-9].done(),90,'existing zero-attendance player can finish chapter 43 via harvest');
assert.equal(progress[49-9].done(),13,'chapters use existing craft counts and never require login streak');
assert(game.includes('state.chapter=Math.max(0,Math.min(50,'),'saved chapter index remains unchanged');
assert(game.includes('chapters.push(...makeLivingChapters(state,FISH_BY_NAME))'),'new quests use retained index mapping');
// Broken legacy mobile SVG paint URLs could leave only triangular fins/tails.
// Every one of the 70 SVG fish now has completely opaque, inline-color bodies.
assert.equal(FISH.length,70);
assert(!portraits.includes("fill='url(#"),'never use paint-server URL as the fish body fill');
assert(portraits.includes('const fill=base,fin=dark'),'fish body and fins must have safe opaque paints');
const art=new Set();
for(const fish of FISH){
 const svg=fishArt(fish.name,152);
 assert(svg.startsWith('<svg')&&svg.endsWith('</svg>'),fish.name+' must have full SVG structure');
 assert(!/url\(#/.test(svg),fish.name+' must not rely on in-modal SVG gradient URLs');
 assert(/<(ellipse|path)[^>]*fill="#[0-9a-f]{6}"/i.test(svg),fish.name+' must have visible solid geometry');
 assert(svg.includes('data-fish-shape='),fish.name+' must have species silhouette');
 assert(svg.includes('aria-label="'+fish.name+' 그림"'));
 art.add(svg);
}
assert.equal(art.size,70,'all 70 fish still have distinct artwork');
assert(html.includes('.aquarium-item.locked svg{filter:grayscale(1) contrast(1.2);opacity:.78}'),'not-yet-caught fish silhouettes visible');
assert(html.includes('v53-quest-fish-20261020'),'new art loads on iOS even with v52 cached');
assert(game.includes('fishArt(f.name,152)'),'fish bodies occupy a readable part of each specimen card');
assert(!menu.includes("add(b,'span','시험'"),'unclear 시험 badge should be replaced');
assert(menu.includes("체험 골드는 캐릭터 골드와 합쳐지지 않아요"),'separate economy is explained honestly');
console.log('PASS v53: all attendance gates removed without save resets, all 70 species render opaque full silhouettes, no trial jargon ambiguity');
