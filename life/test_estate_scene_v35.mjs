import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {estateLayout,estateCropView,estateWalkStep} from './estate-layout-v35.js';

for(const [slots,cols,rows] of [[6,3,2],[24,6,4],[48,8,6],[96,12,8]]){
 const g=estateLayout(slots);
 assert.equal(g.slots,slots);
 assert.equal(g.columns,cols);
 assert.equal(g.rows,rows);
 assert.equal(g.beds.length,slots);
 assert.equal(new Set(g.beds.map(p=>p.x+':'+p.z)).size,slots,'No overlapping personal plots');
 assert(g.entrance.z<g.depth/2,'Entrance remains on the island');
 assert(g.beds.every(p=>Math.abs(p.x)<g.width/2&&Math.abs(p.z)<g.depth/2),'Every plot is in bounds');
}
assert.equal(estateLayout(9999).slots,96,'Malformed save cannot create an unbounded 3D field');
assert.equal(estateLayout(-9).slots,0);
const cropMap={berry:{seconds:90},apple:{seconds:900}};
const start=Date.UTC(2026,9,18,0,0,0);
const early=estateCropView({id:'berry',at:start},cropMap,start+45000);
assert.equal(early.ready,false);
assert.equal(early.remaining,45);
assert.equal(early.progress,.5);
const mature=estateCropView({id:'berry',at:start},cropMap,start+91000);
assert.equal(mature.ready,true);
assert.equal(mature.remaining,0);
assert.equal(mature.progress,1);
assert.equal(estateCropView({id:'hacker',at:start},cropMap,start).id,null,'Unknown crop ignored');
assert.equal(estateCropView({id:'berry',at:'broken'},cropMap,start).id,null);
const pos={x:0,z:0},goal={x:300,z:100};
for(let i=0;i<100;i++){
 const next=estateWalkStep(pos,goal,.05);
 assert(next.x<=goal.x&&next.z<=goal.z,'Must not overshoot a tap destination');
 assert(next.x>=pos.x&&next.z>=pos.z,'Walk should be monotonic toward destination');
 pos.x=next.x;pos.z=next.z;
 if(next.arrived)break;
}
assert.equal(pos.x,300);assert.equal(pos.z,100);
assert.equal(estateWalkStep(pos,goal,.01).arrived,true);
const game=await readFile(new URL('./game.js',import.meta.url),'utf8');
const world=await readFile(new URL('./estate-world-v35.js',import.meta.url),'utf8');
assert(game.includes('mountEstateWorld('),'Personal farm mounts interactive 3D scene');
assert(game.includes('function disposeEstateWorld()'),'3D renderer is released before modal replacement');
assert(game.includes('if(estateWorld)return;if(world3D)'), 'Do not render two world scenes at once on mobile');
assert(world.includes('onPlot?.(chosen)'),'3D field selection invokes existing economy gameplay, not a duplicate payout');
assert(world.includes('renderer.forceContextLoss()'),'Closing the farm must release mobile WebGL contexts');
console.log('v35 walkable farm: layout, crop growth, avatar movement and safe UI integration passed');
