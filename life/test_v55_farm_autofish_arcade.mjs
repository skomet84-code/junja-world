import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENERGY_COSTS,chargeEnergy} from './action-energy-v47.js';
import {autoFishCatch,buyAutoFish,autoFishState} from './auto-fishing-v31.js';
import {bagFree,initBag} from './inventory-v29.js';
import {arcadeStatus,playArcade,ARCADE_RULES_V55} from './arcade-v55.js';
import {VILLAGE_ACTIONS_V49} from './village-navigation-v49.js';

const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const build=readFileSync(new URL('./build-vercel.mjs',import.meta.url),'utf8');
assert.equal(ENERGY_COSTS.plant,2,'seeds cost exactly 2 energy');
assert.equal(ENERGY_COSTS.harvest,0,'harvesting NEVER spends energy');
assert(!game.includes("useWorldEnergy('harvest')"),'neither personal estate nor main farm may charge harvest');
assert(game.includes("await useWorldEnergy('plant')"),'planting stays charged in both farms');
assert.equal((game.match(/useWorldEnergy\('plant'\)/g)||[]).length,2);
const state={coins:5000,actionEnergyV47:{current:1,at:new Date('2026-10-20T12:00:00Z').getTime(),packsDay:'',packs:0}};
assert.equal(chargeEnergy(state,'harvest',new Date('2026-10-20T12:00:00Z')).energy.current,1,'even when nearly empty, harvesting works');
assert.throws(()=>chargeEnergy(state,'plant',new Date('2026-10-20T12:00:00Z')),/부족/);
assert(game.includes('setInterval(save,60000)'), 'background cloud snapshot runs once a minute');
assert(game.includes('if(accountScope)queueCloudSave()'),'initial server checkpoint remains');
assert(game.includes('if(accountScope)queueCloudSave();'),'game events continue cloud saving instantly');

// Simulate a completely full bag. Ordinary auto catches must skip the bag,
// credit the actual fish sale once, and never leave a fish in stock.
const full={coins:5000,fishStock:{},materials:{},crafted:{stone_bench:24},fishRecords:{}};
initBag(full);assert.equal(bagFree(full),0);
const ordinary={name:'붕어',base:55,tier:'common',size:1};
const before=full.coins;
let catchResult=autoFishCatch(full,ordinary,10);
assert.equal(catchResult.ok,true,'ordinary auto catch must sell even with full bag');
assert.equal(catchResult.protected,undefined);
assert.equal(full.fishStock['붕어'],0);
assert.equal(bagFree(full),0,'immediate sale does not consume bag slots');
assert.equal(full.autoFishing.sold,1);assert.equal(full.autoFishing.catches,1);
assert.equal(full.coins,before+catchResult.earned);
const legend={name:'황금 용어',base:65000,tier:'legend',size:2};
catchResult=autoFishCatch(full,legend,20);
assert.equal(catchResult.ok,false,'legendary fish must not be discarded when bag full');
assert.equal(full.autoFishing.protected,0);
full.crafted.stone_bench=23;
catchResult=autoFishCatch(full,legend,20);
assert.equal(catchResult.ok,true);
assert.equal(catchResult.protected,true);
assert.equal(full.fishStock['황금 용어'],1,'legendary fish stays in inventory');
assert.equal(full.autoFishing.sold,1,'legend was not sold');

// Arcade is low stakes, transparent and daily limited; no real money path.
assert.deepEqual([ARCADE_RULES_V55.entry,ARCADE_RULES_V55.payout,ARCADE_RULES_V55.winChance,ARCADE_RULES_V55.playsPerDay],[100,200,45,10]);
const wallet={coins:5000};
assert.equal(arcadeStatus(wallet,'2026-10-20').plays,0);
let win=playArcade(wallet,{choice:'sun',date:new Date('2026-10-20T08:00:00+09:00'),rng:()=>0.12});
assert.equal(win.ok,true);assert.equal(win.success,true);assert.equal(win.drawn,'sun');assert.equal(wallet.coins,5100);
let loss=playArcade(wallet,{choice:'moon',date:new Date('2026-10-20T08:00:00+09:00'),rng:()=>0.73});
assert.equal(loss.ok,true);assert.equal(loss.success,false);assert.equal(loss.drawn,'sun');assert.equal(wallet.coins,5000);
for(let i=2;i<10;i++)assert.equal(playArcade(wallet,{choice:'sun',date:new Date('2026-10-20T08:00:00+09:00'),rng:()=>.85}).ok,true);
assert.equal(arcadeStatus(wallet,'2026-10-20').plays,10);
const lastCoins=wallet.coins;const overflow=playArcade(wallet,{date:new Date('2026-10-20T08:00:00+09:00'),rng:()=>0});
assert.equal(overflow.ok,false);assert.equal(wallet.coins,lastCoins,'over daily cap cannot charge');
assert.equal(arcadeStatus(wallet,'2026-10-21').plays,0,'next day allows limited plays');
assert(VILLAGE_ACTIONS_V49.home.some(x=>x.id==='arcade'));
assert(VILLAGE_ACTIONS_V49.life.some(x=>x.id==='arcade'));
assert(game.includes("case 'arcade':return openMoonArcade()"));
assert(game.includes("if(!autoFishRunning){autoFishRunning=true;autoFishLast=performance.now()"),'pass purchase starts automatic fishing');
assert(html.includes('v55-farm-autofish-arcade-20261020'),'mobile cache refresh required');
assert(build.includes('arcade-v55.js'),'new arcade module must be served by Cloudflare');
console.log('PASS v55: harvest free, planting -2, autosave 60s, auto-fish instantly sells when bag full, protected legends, virtual arcade odds, daily cap, preserved saved wallet');
