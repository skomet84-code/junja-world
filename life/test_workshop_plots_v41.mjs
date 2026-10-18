import assert from 'node:assert/strict';
import {startingEconomy} from './secure-economy-v36.js';
import {WORKSHOP_SITES,DEFAULT_WORKSHOP_SLOTS,villagePlots,siteFor,relocateWorkshop,visitorWorkshops,walkStep} from './workshop-plots-v41.js';
const time=new Date('2026-10-19T03:00:00Z');
const s=startingEconomy();
s.coins=987654;s.stock={berry_box:3};s.workshops={
 farmer:{level:2,createdAt:time.toISOString()},
 chef:{level:1,createdAt:time.toISOString()},
 merchant:{level:3,createdAt:time.toISOString()}
};
assert.equal(WORKSHOP_SITES.length,9);
assert.equal(new Set(WORKSHOP_SITES.map(p=>p.x+':'+p.z)).size,9);
assert.equal(villagePlots(s).ok,true);
const basic=villagePlots(s);
assert.deepEqual(basic.buildings.map(b=>b.slot),[0,4,8]);
assert.equal(siteFor('farmer',s).slot,DEFAULT_WORKSHOP_SLOTS.farmer);
assert.equal(visitorWorkshops(s).buildings.length,3);
assert.equal(JSON.stringify(visitorWorkshops(s)).includes('987654'),false,'Public guest projection never returns private gold');
assert.equal(JSON.stringify(visitorWorkshops(s)).includes('berry_box'),false,'Public guest projection never returns private inventory');
assert.throws(()=>relocateWorkshop(s,'chef',0,time),/다른 사업장/);
assert.throws(()=>relocateWorkshop(s,'hacker',7,time),/선택/);
assert.throws(()=>relocateWorkshop(s,'farmer',1.3,time),/존재하지/);
assert.throws(()=>relocateWorkshop(s,'farmer',4,time),/다른 사업장/);
assert.throws(()=>relocateWorkshop(s,'farmer',0,time),/이미/);
let changed=relocateWorkshop(s,'farmer',1,time);
assert.equal(changed.delta,0);
assert.equal(changed.next.workshops.farmer.site,1);
assert.equal(changed.next.coins,s.coins);
assert.equal(changed.next.stock.berry_box,3);
assert.equal(s.workshops.farmer.site,undefined,'Original DB snapshot remains immutable');
assert.equal(villagePlots(changed.next).ok,true);
changed=relocateWorkshop(changed.next,'chef',3,time);
changed=relocateWorkshop(changed.next,'farmer',0,time);
changed=relocateWorkshop(changed.next,'chef',4,time);
changed=relocateWorkshop(changed.next,'farmer',1,time);
assert.equal(changed.next.workshopRelocation.count,5);
assert.equal(changed.remaining,0);
assert.throws(()=>relocateWorkshop(changed.next,'farmer',0,time),/이동 5회/);
const tomorrow=new Date(time.getTime()+86400000);
assert.equal(relocateWorkshop(changed.next,'farmer',0,tomorrow).next.workshopRelocation.count,1,'KST day resets placement rate');
const corrupt=structuredClone(s);
corrupt.workshops.farmer.site=4;
assert.equal(villagePlots(corrupt).ok,false,'Overlapping plots are blocked instead of auto-repairing server data');
assert.equal(visitorWorkshops(corrupt).ok,false);
let walker={x:0,z:0},target={x:250,z:270};
for(let i=0;i<100;i++){
 const next=walkStep(walker,target,.05);walker={x:next.x,z:next.z};
 if(next.arrived)break;
}
assert.deepEqual(walker,target);
assert.equal(walkStep(walker,target,.05).arrived,true);
console.log('PASS v41 workshop plots: stable 3D sites, owner-only placement, occupied-site block, KST quota, privacy projection and walking');
