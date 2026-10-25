// Regression coverage for v50 gate and save-safe startup. No network or production data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const account=readFileSync(new URL('./account-ui.js',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const loader=scripts.find(s=>s.includes('window.startVillageGame='));
const entrance=scripts.find(s=>s.includes('window.villageGateEnter='));
assert(loader&&entrance,'v50 startup and gate scripts must exist');
assert(account.includes("if(name==='login'){$('accountPassword').value='';layer.classList.remove('show')}"),
 'successful login must dismiss the account overlay and clear the password field');
function makeContext(fetcher,loadGame){
 const gate={hidden:false},status={textContent:''};
 const nodes={
  villageGate:gate,villageGateStatus:status,
  accountLayer:{classList:{add(){}}},
  accountUser:{focus(){}},accountNick:{focus(){}},
  villageGateLogin:{},villageGateRegister:{}
 };
 const ctx={
  document:{getElementById:id=>nodes[id]},
  fetch:fetcher,__loadGame:loadGame,
  console:{error(){}}
 };
 ctx.window=ctx;
 vm.runInNewContext(loader.replaceAll('import("./game.js','__loadGame("./game.js'),ctx);
 vm.runInNewContext(entrance,ctx);
 return {ctx,gate,status};
}
let calls=0,loads=0,release;
{
 const {ctx,gate}=makeContext(
  ()=>{calls++;return new Promise(resolve=>{release=resolve})},
  async()=>{loads++}
 );
 const a=ctx.window.villageGateEnter({nickname:'테스트'});
 const b=ctx.window.villageGateEnter({nickname:'테스트'});
 assert.equal(calls,1,'concurrent gate opens must share one save request');
 assert.equal(gate.hidden,false,'the gate must remain visible while loading');
 release({ok:true,json:async()=>({save:{profile:{xp:480},version:4}})});
 await Promise.all([a,b]);
 assert.equal(loads,1);
 assert.equal(gate.hidden,true,'the gate should hide only after game module loaded');
 assert.equal(ctx.window.__villageCloudSave.profile.xp,480,'loaded cloud XP is unchanged');
}
{
 const {ctx,gate,status}=makeContext(
  async()=>({ok:false,status:503}),
  async()=>{throw Error('Game must not load without save')}
 );
 await ctx.window.villageGateEnter({nickname:'테스트'});
 assert.equal(gate.hidden,false,'a save server outage must keep the gate');
 assert.match(status.textContent,/저장 기록/);
 assert.equal(ctx.window.__villageGameStarted,false);
}
{
 const {ctx,gate,status}=makeContext(
  async()=>({ok:true,json:async()=>({save:{profile:{xp:9000},version:8}})}),
  async()=>{throw Error('missing module')}
 );
 await ctx.window.villageGateEnter({nickname:'테스트'});
 assert.equal(gate.hidden,false,'a failed game module must not reveal a broken game');
 assert.match(status.textContent,/게임 화면/);
 assert.equal(ctx.window.__villageCloudSave.profile.xp,9000);
}
console.log('PASS: v50 login overlay dismissal, startup single-flight, saved XP and failure gates');
