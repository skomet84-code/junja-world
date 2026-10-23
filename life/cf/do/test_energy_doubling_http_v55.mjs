import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
// This is a throwaway account in a LOCAL wrangler SQLite DO. Never production.
const base=process.env.LOCAL_UNIFIED_URL||'http://127.0.0.1:8788';
if(!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))throw Error('local Worker only');
const username='ec'+randomBytes(8).toString('hex');
const password='qa-'+randomBytes(10).toString('hex');
const auth=async(action,body)=>{
 const r=await fetch(base+'/api/account?action='+action,{
  method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)
 });
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
};
let out=await auth('register',{username,nickname:'🔋'+username.slice(0,9),password});
assert.equal(out.status,201,JSON.stringify(out.data));
out=await auth('login',{username,password});
assert.equal(out.status,200,JSON.stringify(out.data));
const cookie=out.cookie;assert(cookie);
async function get(){
 const r=await fetch(base+'/api/economy-v36',{headers:{cookie},cache:'no-store'});
 assert.equal(r.status,200);
 return r.json();
}
async function send(action,payload={},requestId=randomUUID()){
 const r=await fetch(base+'/api/economy-v36',{method:'POST',headers:{
  cookie,origin:base,'content-type':'application/json'
 },body:JSON.stringify({action,payload,requestId})});
 return {status:r.status,data:await r.json()};
}
const first=await get();
assert.equal(first.energy.current,100);
assert.equal(first.energy.packPrice,1000);
assert.equal(first.energy.packsUsed,0);
assert.equal(first.economy.coins,5000);
// Spend 70 of the actual server-owned 100 energy so two consecutive top-ups
// are possible without mock state or manipulating the database.
for(let i=0;i<14;i++){
 const r=await send('world_spend',{kind:'fish'});
 assert.equal(r.status,200,JSON.stringify(r.data));
}
const afterSpend=await get();
assert.equal(afterSpend.energy.current,30);
const firstPurchaseId=randomUUID();
const pay1=await send('energy_buy',{},firstPurchaseId);
assert.equal(pay1.status,200,JSON.stringify(pay1.data));
assert.equal(pay1.data.receipt.delta,-1000);
assert.equal(pay1.data.economy.coins,4000);
assert.equal(pay1.data.energy.current,55);
assert.equal(pay1.data.energy.packPrice,2000);
assert.equal(pay1.data.energy.packsUsed,1);
const replay=await send('energy_buy',{},firstPurchaseId);
assert.equal(replay.status,200);
assert.equal(replay.data.replayed,true);
assert.equal(replay.data.economy.coins,4000);
assert.equal(replay.data.energy.packsUsed,1);
const pay2=await send('energy_buy');
assert.equal(pay2.status,200,JSON.stringify(pay2.data));
assert.equal(pay2.data.receipt.delta,-2000);
assert.equal(pay2.data.economy.coins,2000);
assert.equal(pay2.data.energy.current,80);
assert.equal(pay2.data.energy.packPrice,4000);
assert.equal(pay2.data.energy.packsUsed,2);
const pay3=await send('energy_buy');
assert.equal(pay3.status,409,'third not denied by count, only cannot afford 4000G');
assert.match(pay3.data.error,/4,000G/);
const end=await get();
assert.equal(end.economy.coins,2000,'failed buy cannot deduct coins');
assert.equal(end.energy.current,80,'failed buy cannot grant energy');
assert.equal(end.energy.packPrice,4000);
assert.equal(end.energy.packsUsed,2);
const sameIdOtherAction=await send('world_spend',{kind:'plant'},firstPurchaseId);
assert.equal(sameIdOtherAction.status,409,'idempotency cannot be bypassed across operations');
console.log('PASS v55 local Cloudflare SQL: unlimited-price design, consecutive 1000G→2000G buys, third 4000G affordability rejection, replay safe');
