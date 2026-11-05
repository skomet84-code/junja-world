import assert from 'node:assert/strict';
import './navigation.js';

const buildings=[[515,470,178,118],[1430,465,168,123],[1585,837,148,93],[1010,695,95,88]];
const trees=[{x:760,y:1100,r:26},{x:1360,y:1090,r:26}];
const walkable=(x,y)=>x>=80&&x<=3520&&y>=120&&y<=2320
 &&!(x<455&&y>1220)
 &&!trees.some(o=>Math.hypot(x-o.x,y-o.y)<o.r)
 &&!buildings.some(b=>Math.abs(x-b[0])<b[2]&&Math.abs(y-b[1])<b[3]);
const nav=globalThis.JunjaNavigation({width:3600,height:2400,walkable});
const from={x:1050,y:955,vx:0,vy:0,stride:0};
assert(nav.safe(from));
let cases=0;
for(const [x,y] of [[1130,950],[930,1120],[800,1080],[515,470],[1585,837],[1010,695],[2500,800],[80,2000]]){
 const path=nav.route(from,{x,y});
 assert(path.length>0,'A touch in front of the avatar must not strand it: '+x+','+y);
 const endpoint=path.at(-1);
 assert(nav.safe(endpoint),'Every route must end at a player-safe location');
 const actor={...from};let frames=0;
 while(path.length&&frames++<1500)nav.advance(actor,path,1/60,190);
 assert(!path.length,'Route must complete');
 assert.equal(actor.vx,0,'No sliding after arrival');
 assert.equal(actor.vy,0,'No sliding after arrival');
 if(nav.safe({x,y}))assert(Math.hypot(actor.x-x,actor.y-y)<1,'Exact arrival when the tapped ground is clear');
 cases++;
}
const trapped={x:1010,y:695};
assert(!nav.safe(trapped));
const recovered=nav.nearest(trapped,288);
assert(recovered&&nav.safe(recovered),'Recovery must place old saved avatar outside a new collision');
assert(nav.route(recovered,{x:1120,y:980}).length>0,'Recovered avatar can navigate');
assert.equal(nav.route(from,{x:from.x,y:from.y}).length,0,'Touching your own feet is a stationary request');
console.log('PASS '+cases+' mobile tap navigation destinations, blocked building snapping, saved-position recovery');
