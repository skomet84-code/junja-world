import assert from 'node:assert/strict';
import {startingEconomy} from './secure-economy-v36.js';
import {HONORS_V46,HONOR_METRICS,validateHonorCounters,honorsView,equipHonor,
 monthDayLabels,economicsView} from './business-honors-v46.js';
const date=new Date('2026-10-19T12:30:00+09:00');
assert.equal(HONORS_V46.length,10);
assert.equal(new Set(HONORS_V46.map(x=>x.id)).size,10);
assert.deepEqual(HONORS_V46.map(x=>x.role).filter(x=>x!=='all').sort(),
 ['chef','chef','farmer','farmer','farmer','merchant','merchant'].sort());
const zero=validateHonorCounters([]);
assert.deepEqual(Object.keys(zero),HONOR_METRICS);
assert(HONOR_METRICS.every(k=>zero[k]===0));
assert.throws(()=>validateHonorCounters([{metric:'spoof',total:1000}]),/검증/);
assert.throws(()=>validateHonorCounters([{metric:'npc_sale',total:-1}]),/검증/);
assert.throws(()=>validateHonorCounters([{metric:'npc_sale',total:1},{metric:'npc_sale',total:1}]),/검증/);
const state=startingEconomy();
const empty=honorsView(state,zero);
assert.equal(empty.unlockedCount,0);
assert.equal(empty.equipped,null);
assert.throws(()=>equipHonor(state,'first_sale',zero),/해금하지/);
assert.throws(()=>equipHonor(state,'admin',zero),/없는 업적/);
const earned=validateHonorCounters([{metric:'npc_sale',total:6},{metric:'farmer_sales',total:3},
 {metric:'manufacture',total:11},{metric:'farmer_manufacture',total:6}]);
const all=honorsView(state,earned);
assert.equal(all.honors.find(x=>x.id==='first_sale').unlocked,true);
assert.equal(all.honors.find(x=>x.id==='berry_supplier').unlocked,true);
assert.equal(all.honors.find(x=>x.id==='pastry_artist').unlocked,false);
assert.equal(all.unlockedCount,5);
const equipped=equipHonor(state,'berry_supplier',earned);
assert.equal(equipped.delta,0);
assert.equal(equipped.next.coins,state.coins);
assert.equal(state.businessHonorV46,undefined,'original persistent snapshot remains immutable');
assert.equal(honorsView(equipped.next,earned).equipped.name,'베리 납품 장인');
assert.throws(()=>equipHonor(equipped.next,'berry_supplier',earned),/이미 적용/);
const rest=equipHonor(equipped.next,'none',earned);
assert.equal(rest.next.businessHonorV46.equipped,null);
assert.equal(honorsView(rest.next,earned).equipped,null);
assert.equal(honorsView(equipped.next,zero).equipped,null,'tampered title loses privilege if no actual receipts remain');
const labels=monthDayLabels(date,30);
assert.equal(labels.length,30);
assert.equal(labels[0],'2026-09-20');
assert.equal(labels.at(-1),'2026-10-19');
assert.equal(monthDayLabels(new Date('2027-01-01T10:00:00+09:00'),3)[0],'2026-12-30');
assert.throws(()=>monthDayLabels(date,365),/Invalid/);
const trend=economicsView([
 {date:'2026-10-18',sales:1,net:'1200',tax:'120',fee:'0'},
 {date:'2026-10-19',sales:2,net:'4200',tax:'380',fee:'300'}
],date);
assert.equal(trend.days,30);
assert.equal(trend.daily.length,30);
assert.deepEqual(trend.totals,{sales:3,net:5400,tax:500,fee:300});
assert.equal(trend.daily[0].sales,0);
assert.equal(trend.daily.at(-1).net,4200);
assert.throws(()=>economicsView([{date:'2024-01-01',sales:1,net:100,tax:0,fee:0}],date),/날짜/);
assert.throws(()=>economicsView([{date:'2026-10-19',sales:1,net:-5,tax:0,fee:0}],date),/금액/);
console.log('PASS v46 ten role achievements, verified nonmonetary equip, old-state immutability, no-claim forging and KST 30-day accounting');
