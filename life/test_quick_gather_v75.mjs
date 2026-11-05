import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestGatherResource,quickGatherLabel,QUICK_GATHER_DISCOVERY} from './quick-gather-v75.js';
const nodes=[
 {id:'wood0',kind:'wood',x:160,y:0},
 {id:'stone0',kind:'stone',x:50,y:0},
 {id:'petal0',kind:'petal',x:240,y:0}
];
test('mobile quick action discovers distant trees and labels auto-approach',()=>{
 const target=nearestGatherResource(nodes,{x:0,y:0},{stone0:2000},1000);
 assert.equal(target.id,'wood0');
 assert.equal(target.needsApproach,true);
 assert.match(quickGatherLabel(target),/이동 · 채집/);
 assert.equal(target.distance,160);
});
test('nearby resource is immediate, no unnecessary walk',()=>{
 const target=nearestGatherResource(nodes,{x:0,y:0},{},1000);
 assert.equal(target.id,'stone0');
 assert.equal(target.needsApproach,false);
 assert.equal(quickGatherLabel(target),'⛏️ 돌 채집');
});
test('cooldown and radius suppress unreachable targets, including boundary',()=>{
 assert.equal(nearestGatherResource(nodes,{x:0,y:0},{stone0:2000,wood0:2000,petal0:2000},1000),null);
 assert.equal(nearestGatherResource(nodes,{x:0,y:0},{},1000,49),null);
 assert.equal(nearestGatherResource(nodes,{x:0,y:0},{stone0:1000},1000,50).id,'stone0');
 assert.equal(nearestGatherResource(nodes,{x:0,y:0},{},1000,QUICK_GATHER_DISCOVERY).id,'stone0');
});
test('invalid nodes and ties are safe and deterministic, no mutation',()=>{
 const arr=[{id:'bad',kind:'wood',x:NaN,y:0},nodes[0],{...nodes[0],id:'wood1'}];
 const frozen=Object.freeze(arr);
 const result=nearestGatherResource(frozen,{x:0,y:0},{},0);
 assert.equal(result.id,'wood0');
 assert.equal(nearestGatherResource(null,{x:0,y:0}),null);
 assert.equal(nearestGatherResource(arr,{x:Infinity,y:0}),null);
 assert.equal(quickGatherLabel(null),'');
 assert.equal(arr.length,3);
});
test('game integrates discover, path-to-gather and full-bag guard',async()=>{
 const {readFile}=await import('node:fs/promises');
 const game=await readFile(new URL('./game.js',import.meta.url),'utf8');
 assert.match(game,/nearestGatherResource\(resourceNodes,player,state\.nodeReady/);
 assert.match(game,/if\(bagFree\(state\)<1\)\{openFullBagSales\('material'\);return false\}/);
 assert.match(game,/approachGatherResource\(n\)/);
});
