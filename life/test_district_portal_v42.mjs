import assert from 'node:assert/strict';
import './navigation.js';
import {BUSINESS_PORTAL_V42 as gate,portalCollision,canUseBusinessPortal,portalReturnPosition} from './district-portal-v42.js';
assert.equal(gate.id,'business_district');
assert.equal(gate.x,2765);
assert.equal(portalCollision(gate.modelX,gate.modelY),true);
assert.equal(portalCollision(gate.x,gate.y),false,'Walkable entrance must never be inside a building');
assert.equal(canUseBusinessPortal({x:gate.x,y:gate.y}),true);
assert.equal(canUseBusinessPortal({x:gate.x+200,y:gate.y}),false);
assert.equal(canUseBusinessPortal({x:NaN,y:gate.y}),false);
assert.equal(portalReturnPosition({x:gate.x,y:gate.y}).x,gate.x);
assert(Object.isFrozen(portalReturnPosition({x:100,y:300})),'Return snapshot is immutable');
assert.throws(()=>portalReturnPosition({x:NaN,y:100}),/유효하지/);
const walkable=(x,y)=>{
 if(portalCollision(x,y))return false;
 if(x<80||x>3520||y<120||y>2320)return false;
 if(x<2000){
  if(y>1220&&x<455)return false;
  if(y>1140&&x>1575)return false;
  if(y>1390&&x>1365)return false;
  if(y>1460&&x<580)return false;
  if(y>1570)return false;
 }
 if(x>=1920&&x<=2080&&(y<720||y>1060))return false;
 for(const b of [[515,470,178,118],[1430,465,168,123],[1585,837,148,93],
  [1010,695,95,88],[2500,640,165,108],[3100,740,170,110],[2910,1740,185,105]]){
  if(Math.abs(x-b[0])<b[2]&&Math.abs(y-b[1])<b[3])return false;
 }
 return true;
};
const nav=globalThis.JunjaNavigation({width:3600,height:2400,walkable});
assert(nav.safe({x:gate.x,y:gate.y}),'v42 entrance must be freely traversable');
assert(!nav.safe({x:gate.modelX,y:gate.modelY}),'portal building must be collidable');
for(const start of [{x:1050,y:955},{x:2500,y:800},{x:3100,y:920},{x:2910,y:1900}]){
 assert(nav.safe(start),'v42 test start must be valid');
 const path=nav.route(start,{x:gate.x,y:gate.y});
 assert(path.length>0,'Main-village route must exist from '+JSON.stringify(start));
 const end=path.at(-1);
 assert(Math.hypot(end.x-gate.x,end.y-gate.y)<65,'Door approach must be accurate enough to launch station callback');
 let actor={...start,vx:0,vy:0,dir:0,stride:0};
 for(let k=0;k<2500&&path.length;k++)nav.advance(actor,path,1/60);
 assert.equal(path.length,0,'Village navigator must actually finish the path');
 assert(canUseBusinessPortal(actor),'Walking route should end within actual door access radius');
}
console.log('PASS v42 native village doorway: pathfinding from four real village routes, collision, no save migration, arrival distance');
