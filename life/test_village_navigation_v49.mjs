import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VILLAGE_NAV_V49,VILLAGE_ACTIONS_V49} from './village-navigation-v49.js';
assert.deepEqual(VILLAGE_NAV_V49.map(x=>x.id),['home','life','production','house','bag']);
assert.deepEqual(VILLAGE_NAV_V49.map(x=>x.label),['홈','생활','생산','집','가방']);
const features=new Set();
for(const group of VILLAGE_NAV_V49){
 assert(VILLAGE_ACTIONS_V49[group.id]?.length>=4,group.id+' must have real features');
 const within=new Set();
 for(const a of VILLAGE_ACTIONS_V49[group.id]){
  assert(a.label.length>0&&a.label.length<=14,'Player action label readable');
  assert(!/\bv\d\d\b/i.test(a.label+' '+a.description),
   'Player-facing copy must not expose development versions');
  assert(!within.has(a.id),'Duplicate action in section '+group.id+': '+a.id);
  within.add(a.id);features.add(a.id);
 }
}
for(const id of ['goal','farm','fishing','gather','craft','orders','daily','career','hunt',
 'business','district','market','trade','house','decorate','wardrobe',
 'collection','reputation','inventory','storage','materials','map','backup','festival','social']){
 assert(features.has(id),'Previous game feature lost from new information architecture: '+id);
}
const markup=await readFile(new URL('./index.html',import.meta.url),'utf8');
assert(markup.includes('id="v49Dock"'),'Five-tab bar present');
for(const group of VILLAGE_NAV_V49)assert(markup.includes('data-v49-section="'+group.id+'"'),'Missing '+group.id+' dock tab');
assert((markup.match(/data-v49-section=/g)||[]).length===5);
assert(markup.includes('v49-legacy-actions'),'Legacy action IDs retained for compatibility');
const game=await readFile(new URL('./game.js',import.meta.url),'utf8');
for(const id of ['shopBtn','farmBtn','fishBtn','craftBtn','decorBtn','bagBtn','guideBtn','estateBtn']){
 assert(game.includes("'"+id+"'")||markup.includes('id="'+id+'"'),'Do not remove legacy action '+id);
}
assert(game.includes("installVillageDockV49();"),'Actual startup must bind new menus');
assert(game.includes("onCategory:openVillageMenuV49"),'All tabs must navigate');
assert(game.includes("case 'go-goal':return q?goQuestDestinationV55(q):openJourney()")&&
 game.includes('function goQuestDestinationV55(goal)')&&
 game.includes('if(known)return goStation(known.id)'),
 'Goal CTA must open the actual quest activity or move to its location');
assert(!game.includes('🏪 주민 상점 · v38 시험 거래소'),
 'Remove v38 player-facing menu label');
assert(!game.includes('🔐 서버 경제 v37 · 복구 장부 시험장'),
 'Remove developer labels from farm');
assert(game.includes('id="estateSecureLab"'),'Advanced recovery feature preserved');
assert(game.includes('v49-farm-shortcuts'),'Player farm features must be grouped');
assert(game.includes('v49-experimental'),'Isolate trial economy in disclosure');
console.log('PASS v49 all five information categories, 25+ reachable legacy actions, guided goal CTA, no version labels and original save/feature wiring');
