import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:20})},{get:(o,k)=>o[k]??(()=>{})});
function element(){const classes=new Set();return {style:{},dataset:{},tagName:'DIV',width:176,height:140,textContent:'',innerHTML:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},getContext:()=>ctx,addEventListener(n,f){(this.handlers??={})[n]=f},querySelector:()=>element(),querySelectorAll(selector){const attr=selector.match(/\[data-([\w-]+)/)?.[1];if(!attr)return [];this.queryCache??={};const key=this.innerHTML+selector;if(this.queryCache[key])return this.queryCache[key];const tags=[...this.innerHTML.matchAll(/<(?:button|canvas)[^>]*>/g)].map(m=>m[0]).filter(t=>t.includes('data-'+attr+'='));return this.queryCache[key]=tags.map(t=>{const e=element();for(const m of t.matchAll(/data-([\w-]+)="([^"]*)"/g))e.dataset[m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];return e})},setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}}}
const elements=new Map();const el=k=>{if(!elements.has(k))elements.set(k,element());return elements.get(k)};
const storage=new Map();let time=1000;
const sandbox={createWorld:()=>null,console,URLSearchParams,Math,Date,JSON,Set,Map,Number,String,Object,Array,Infinity,Image:class{complete=true;naturalWidth=132;naturalHeight=272;},innerWidth:390,innerHeight:844,devicePixelRatio:2,performance:{now:()=>time},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:el,querySelector:s=>s.startsWith('meta')?null:el(s),querySelectorAll:()=>[],addEventListener(){}},location:{search:'',origin:'https://example.test',protocol:'https:',host:'example.test'},setInterval(){},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},addEventListener(){},navigator:{}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('life/navigation.js','utf8'),sandbox);
let script=fs.readFileSync('life/game.js','utf8').replace(/^import .*;\n/, '');
script=script.replace('})();',`window.test={player,state,owned,stations,resourceNodes,chapters,recipes,navigation,update,drawWorld,drawMini,moveTo,stopWalking,screenWorld,openWorldMap,openJourney,openCraft,openStation,gather,openDelivery,openShop,closeModal,beginFishing,farmAll,save,els,getPath:()=>path,getGoal:()=>goal,getPopup:()=>popup,getPointer:()=>pointer};})();`);
vm.runInContext(script,sandbox,{timeout:5000});const g=sandbox.test;
function tick(n=1){for(let i=0;i<n;i++){time+=1000/60;g.update(1/60)}}
function walkTo(x,y){g.closeModal();assert.equal(g.moveTo(x,y),true);let n=0;while(g.getPath().length&&n++<6000)tick();assert.ok(n<6000);assert.ok(Math.hypot(g.player.x-x,g.player.y-y)<.01,`arrival ${x},${y}: ${g.player.x},${g.player.y}`);assert.equal(g.player.vx,0);assert.equal(g.player.vy,0)}
walkTo(1107.3,1011.7);tick(120);assert.equal(g.player.x,1107.3);
walkTo(1108,1012); // same grid cell
for(const station of g.stations){const way=g.navigation.route(g.player,station);assert.ok(way.length,station.id);let prev=g.player;for(const p of way){assert.ok(g.navigation.clear(prev,p),`collision ${station.id}`);prev=p}walkTo(station.x,station.y)}
console.log('PASS exact arrival, no inertia, same-cell tap, all 10 stations reachable, collision-free segments');
g.player.x=1050;g.player.y=955;g.update(1/60);
const cv=el('game');cv.handlers.pointerdown({button:0,pointerId:1,clientX:195,clientY:422,preventDefault(){}});cv.handlers.pointermove({pointerId:1,clientX:310,clientY:480,preventDefault(){}});tick(1);assert.ok(g.getGoal());const first={...g.getGoal()};cv.handlers.pointermove({pointerId:1,clientX:80,clientY:450,preventDefault(){}});tick(6);assert.notEqual(g.getGoal().x,first.x);const released=g.screenWorld(85,455);cv.handlers.pointerup({pointerId:1,clientX:85,clientY:455});tick(500);assert.ok(Math.hypot(g.player.x-released.x,g.player.y-released.y)<.01);assert.equal(g.getPointer(),null);
console.log('PASS continuous drag retarget and exact release endpoint');
g.closeModal();g.player.x=1030;g.player.y=1350;g.farmAll();tick(300);assert.equal(g.state.harvest,1);assert.ok(g.state.coins>800);
console.log('PASS farm button walks then harvests (previous missing arrival handler)');
const node=g.resourceNodes[0];g.player.x=node.x;g.player.y=node.y+48;g.gather(node.id);const count=g.state.materials.wood;g.gather(node.id);assert.equal(g.state.materials.wood,count);assert.equal(count,2);
console.log('PASS gathering cooldown prevents double collection');
g.openJourney();el('journeyClaim').onclick();const coins=g.state.coins;el('journeyClaim').onclick();assert.equal(g.state.coins,coins);assert.equal(g.state.chapter,1);
console.log('PASS chapter reward cannot be claimed twice');
g.openWorldMap();g.closeModal();g.drawWorld(1/60);g.drawMini();g.save();assert.ok(storage.get('junja-harbor-v1'));
console.log('PASS map, frame rendering calls and persistence smoke test (mock Canvas, not visual QA)');

g.closeModal();g.player.x=2500;g.player.y=800;g.state.materials={wood:3,petal:2,stone:0};g.openCraft();
const makeParcel=el('panelBody').querySelectorAll('[data-recipe]').find(b=>b.dataset.recipe==='parcel');makeParcel.onclick();assert.equal(g.state.materials.wood,0);assert.equal(g.state.materials.petal,0);assert.equal(g.state.crafted.parcel,1);makeParcel.onclick();assert.equal(g.state.crafted.parcel,1);
g.player.x=2910;g.player.y=1900;g.openDelivery();const beforeDelivery=g.state.coins;el('deliverParcel').onclick();assert.equal(g.state.coins,beforeDelivery+180);assert.equal(g.state.crafted.parcel,0);el('deliverParcel').onclick();assert.equal(g.state.coins,beforeDelivery+180);
console.log('PASS material consumption, insufficient-material rejection, parcel delivery and duplicate prevention');
g.openShop();const shopButtons=el('panelBody').querySelectorAll('[data-outfit]');const hatButton=shopButtons.find(b=>b.dataset.outfit==='straw');const beforeHat=g.state.coins;hatButton.onclick();assert.equal(g.state.hat,'straw');assert.equal(g.state.coins,beforeHat-150);el('panelBody').querySelectorAll('[data-outfit]').find(b=>b.dataset.outfit==='none').onclick();assert.equal(g.state.hat,'none');hatButton.onclick();assert.equal(g.state.coins,beforeHat-150);
console.log('PASS outfit purchase, hat equip/unequip and owned-item re-equip without charging');
