import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VILLAGE_ACTIONS_V49} from './village-navigation-v49.js';
import {ECONOMY_POLICY} from './economy-v28.js';
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
for(const section of ['home','production','house']){
 const actions=VILLAGE_ACTIONS_V49[section];
 const placement=actions.find(e=>e.id==='decorate');
 assert(placement,'crafted item placement must be immediately discoverable in '+section);
 assert(/제작물|마을 꾸미기/.test(placement.label));
}
assert(game.includes("case 'decorate':return openDecor()"),'menu must open decoration placement modal');
assert(game.includes("if(id==='garden')return openDecor()"),'garden destination must open placement UI');
assert(game.includes("id=\"craftPlaceDecor\""),'crafting modal must link directly to placement');
assert(game.includes("document.getElementById('craftPlaceDecor').onclick=openDecor"),'crafting shortcut must be wired');
assert(game.includes("id=\"removeDecoration\""),'existing decor removal button must remain');
assert(game.includes("function placeAt(x,y)"),'world-tap placement must remain');
assert(game.includes("if(placeDecor){placeAt(x,y);return}"),'active decoration mode must override walking');
assert(game.includes("decorationCancelButton.onclick=cancelDecorationPlacement"),'mobile decor selection must be cancelable');
assert(game.includes("showDecorationPlacement()"),'tap-to-place mode shows progress and cancel button');
for(const id of ['bench','lantern','flower']){
 assert(game.includes("id:'"+id+"'"),'crafted item '+id+' must still be placeable');
}
assert.equal(ECONOMY_POLICY.starterG,5000,'the previous 5000G onboarding patch must survive');
assert(game.includes("coins:ECONOMY_POLICY.starterG"),'game player seed must continue using 5000G');
console.log('PASS v51: crafted item placement discoverable in 3 menus, linked from crafting/garden, mobile cancel and 5000G preserved');
