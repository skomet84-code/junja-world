import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
// Runs against a LOCAL Wrangler Worker and a throwaway SQLite account.
// Never contacts or mutates the live production game.
const base=process.env.LOCAL_UNIFIED_URL||'http://127.0.0.1:8788';
if(!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))throw Error('local Worker only');
const username='en'+randomBytes(8).toString('hex'),password='qa-'+randomBytes(10).toString('hex');
const auth=async(action,body)=>{
 const response=await fetch(base+'/api/account?action='+action,{method:'POST',
  headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
};
const reg=await auth('register',{username,nickname:'⚡'+username.slice(0,8),password});
assert.equal(reg.status,201,JSON.stringify(reg.data));
const login=await auth('login',{username,password});
assert.equal(login.status,200,JSON.stringify(login.data));
const cookie=login.cookie;
assert.ok(cookie);
const read=async()=>{
 const res=await fetch(base+'/api/economy-v36',{headers:{cookie}});
 assert.equal(res.status,200);return res.json();
};
const before=await read();
assert.equal(before.energy.current,200,'new game starts at 200 energy');
async function charge(kind,id=randomUUID(),origin=base){
 const res=await fetch(base+'/api/economy-v36',{
  method:'POST',headers:{cookie,origin,'content-type':'application/json'},
  body:JSON.stringify({action:'world_spend',payload:{kind},requestId:id})});
 return {status:res.status,data:await res.json()};
}
const lookup=async(requestId,session=cookie)=>{
 const res=await fetch(base+'/api/economy-v36?requestId='+encodeURIComponent(requestId),{headers:{cookie:session}});
 return {status:res.status,data:await res.json()};
};
const absent=await lookup(randomUUID());
assert.equal(absent.status,200);
assert.deepEqual(absent.data.transaction,{found:false,kind:null,isWorldSpend:false});
const invalid=await lookup('bad-request-id');
assert.equal(invalid.status,400);
const anonymous=await lookup(randomUUID(),'');
assert.equal(anonymous.status,401);
let id=randomUUID();
let result=await charge('plant',id);
assert.equal(result.status,200,JSON.stringify(result.data));
assert.equal(result.data.energy.current,198,'real-world planting consumes 2');
const audited=await lookup(id);
assert.equal(audited.status,200);
assert.deepEqual(audited.data.transaction,{found:true,kind:'plant',isWorldSpend:true},'server must locate exact authenticated world energy request');
assert.equal(audited.data.energy.current,198,'GET reconciliation must not charge again');
assert.equal(result.data.receipt.delta,0,'spending must never mint main or trial gold');
result=await charge('plant',id);
assert.equal(result.status,200);
assert.equal(result.data.replayed,true);
assert.equal(result.data.energy.current,198,'same network request cannot double-charge');
result=await charge('fish',id);
assert.equal(result.status,409,'same id cannot be reused for another action');
result=await charge('harvest',randomUUID(),'https://attacker.invalid');
assert.equal(result.status,403,'off-site charge requests rejected');
result=await charge('free_energy');
assert.equal(result.status,400,'unknown energy kinds rejected');
result=await charge('gather');
assert.equal(result.status,200);
assert.equal(result.data.energy.current,195,'gather consumes three');
result=await charge('fish');
assert.equal(result.status,200);
assert.equal(result.data.energy.current,190,'catching a fish consumes five');
result=await charge('craft');
assert.equal(result.status,200);
assert.equal(result.data.energy.current,184,'crafting consumes six');
result=await charge('order');
assert.equal(result.status,200);
assert.equal(result.data.energy.current,181,'delivery consumes three');
result=await charge('business_produce');
assert.equal(result.status,200);
assert.equal(result.data.energy.current,173,'workshop production consumes eight');
for(let i=0;i<34;i++){
 result=await charge('fish');
 assert.equal(result.status,200,JSON.stringify(result.data));
}
assert.equal(result.data.energy.current,3);
result=await charge('harvest');
assert.equal(result.status,200,'harvest is a free action; only planting costs energy');
assert.equal(result.data.energy.current,3,'harvest cannot consume energy');
assert.equal((await read()).energy.current,3,'free harvest leaves energy unchanged');
const blocked=await charge('fish');assert.equal(blocked.status,409);
assert.equal((await read()).energy.current,3);
console.log('PASS v55 world energy: real Cloudflare account, 2/3/4/5/6/8 costs, idempotency, CSRF, insufficient balance, zero coin mint');
