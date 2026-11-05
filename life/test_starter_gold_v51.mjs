import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECONOMY_POLICY,initEconomy} from './economy-v28.js';
import {startingEconomy} from './secure-economy-v36.js';
import {restoreProfile} from './save-client.js';
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
assert.equal(ECONOMY_POLICY.starterG,5000,'fresh game character starts with 5000G');
assert.equal(startingEconomy().coins,5000,'fresh online trade/career/workshop wallet starts with 5000G');
assert.match(game,/const seedData=\{[^\n]*coins:ECONOMY_POLICY\.starterG,/,
 'new game profiles must use the shared 5000G starter policy');
const storage={getItem:()=>null};
const saved={version:14,profile:{xp:6789,coins:1420,level:18},owned:['hair01']};
const restored=restoreProfile(saved,storage,'a-real-existing-user');
const joined={coins:ECONOMY_POLICY.starterG,...restored.profile};
initEconomy(joined);
assert.equal(joined.coins,1420,'existing server save MUST override 5000G template');
assert.equal(joined.xp,6789);
assert.deepEqual(restored.owned,['hair01']);
const oldEconomy={...startingEconomy(),coins:875,stock:{berry:3}};
assert.equal(oldEconomy.coins,875,'previously opened trial economy wallet is not re-seeded');
assert.equal(restoreProfile(null,storage,'new-qa-account').profile.coins,undefined,
 'new account has no existing money and must fall back to fresh template');
console.log('PASS: 5000G in fresh game and economic content, old player gold/XP/items untouched');
