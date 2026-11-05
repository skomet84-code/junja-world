import test from 'node:test';
import assert from 'node:assert/strict';
import {findGatherApproach,GATHER_APPROACH_REACH} from './gather-approach-v76.js';
const tree={x:200,y:200},player={x:40,y:200};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clearNav={
 safe:p=>Number.isFinite(p.x)&&Number.isFinite(p.y),
 nearest:p=>p,
 clear:()=>true,
 route:(from,to)=>[to]
};
test('one tap chooses safe standing point on player side, within harvesting reach',()=>{
 const result=findGatherApproach(tree,player,clearNav);
 assert.ok(result);
 assert.ok(result.x<tree.x);
 assert.ok(distance(result,tree)<GATHER_APPROACH_REACH);
 assert.equal(result.immediate,false);
 assert.deepEqual(tree,{x:200,y:200});
 assert.deepEqual(player,{x:40,y:200});
});
test('already close to a resource never triggers unnecessary walking',()=>{
 assert.deepEqual(findGatherApproach(tree,{x:150,y:200},clearNav),
  {x:150,y:200,immediate:true});
});
test('if nearest tree-side point is blocked, pick an alternate safe approach',()=>{
 const nav={...clearNav,safe:p=>(p.x<100||p.y>200)&&Number.isFinite(p.x)&&Number.isFinite(p.y)};
 const result=findGatherApproach(tree,player,nav);
 assert.ok(result);
 assert.ok(result.y>200);
 assert.ok(distance(result,tree)<100);
});
test('partial paths cannot trigger a false arrival and reward',()=>{
 const nav={...clearNav,clear:()=>false,route:()=>[{x:70,y:70}]};
 assert.equal(findGatherApproach(tree,player,nav),null);
});
test('navigable detour picks a valid endpoint and never moves into a blocked cell',()=>{
 const nav={...clearNav,clear:()=>false,
  route:(from,to)=>to.y>200?[{x:70,y:280},{x:to.x,y:to.y}]:[]};
 const result=findGatherApproach(tree,player,nav);
 assert.ok(result);
 assert.ok(result.y>200);
 assert.ok(distance(result,tree)<100);
});
test('unreachable or malformed targets fail closed, without energy or save mutation',()=>{
 assert.equal(findGatherApproach({x:NaN,y:0},player,clearNav),null);
 assert.equal(findGatherApproach(tree,{x:Infinity,y:0},clearNav),null);
 assert.equal(findGatherApproach(tree,player,{safe:()=>false,nearest:()=>null,route:()=>[]}),null);
 assert.equal(findGatherApproach(tree,player,{safe:()=>true,route:()=>[],clear:()=>false}),null);
});
test('game routes both canvas taps and mobile quick-action through reachable gather',async()=>{
 const {readFile}=await import('node:fs/promises');
 const game=await readFile(new URL('./game.js',import.meta.url),'utf8');
 assert.match(game,/import \{findGatherApproach\} from '\.\/gather-approach-v76\.js'/);
 assert.match(game,/function approachGatherResource\(n\)/);
 assert.match(game,/findGatherApproach\(n,player,navigation\)/);
 assert.match(game,/if\(hit\.type==='gather'\)[^\n]*approachGatherResource\(n\)/);
 assert.match(game,/onContext:context=>\{[\s\S]*?approachGatherResource\(n\)/);
 assert.doesNotMatch(game,/moveTo\(n\.x,n\.y\+48,\{type:'gather'/);
});
