// Run against Wrangler's local Durable Object emulator. Never a production URL.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base=process.env.LOCAL_UNIFIED_URL||'http://127.0.0.1:8788';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))
 throw Error('Refusing to run account writes outside loopback Wrangler emulator');
const name='qa'+randomBytes(6).toString('hex'),password='test-local-only-'+randomBytes(6).toString('hex');
const call=async(action,body=null,cookie='')=>{
 const response=await fetch(base+'/api/account?action='+action,{
  method:body?'POST':'GET',
  headers:{...(body?{'content-type':'application/json',origin:base}:{}),...(cookie?{cookie}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 return {status:response.status,json:await response.json().catch(()=>({})),headers:response.headers};
};
let response=await fetch(base+'/health');
assert.equal(response.status,200,'Worker and SQLite Durable Object must be ready');
const healthy=await response.json();
assert.equal(healthy.database,'cloudflare-do-sqlite');
response=await fetch(base+'/api/account?action=me');
assert.equal(response.status,401);
let r=await call('register',{username:name,nickname:name.slice(0,12),password});
assert.equal(r.status,201,JSON.stringify(r.json));
r=await call('login',{username:name,password:'definitely-wrong'});
assert.equal(r.status,401);
r=await call('login',{username:name,password});
assert.equal(r.status,200,JSON.stringify(r.json));
const cookie=(r.headers.get('set-cookie')||'').split(';')[0];
assert.match(cookie,/^village_session=[a-f0-9]{64}$/);
r=await call('me',null,cookie);
assert.equal(r.status,200);
assert.equal(r.json.user.username,name);
r=await call('save',null,cookie);
assert.equal(r.status,200);
assert.equal(r.json.save,null,'fresh account must not inherit old client saves');
const save={
 profile:{xp:320,coins:1000,__adminRevision:0},
 owned:['fashion_hair_09'],version:0
};
r=await call('save',save,cookie);
assert.equal(r.status,200,JSON.stringify(r.json));
assert.equal(r.json.version,1);
r=await call('save',null,cookie);
assert.equal(r.status,200);
assert.equal(r.json.save.version,1);
assert.equal(r.json.save.profile.xp,320);
assert.deepEqual(r.json.save.owned,['fashion_hair_09']);
r=await call('save',save,cookie);
assert.equal(r.status,409,'stale version must not overwrite progress');
r=await call('save',{...save,version:1,profile:{xp:160,coins:1000,__adminRevision:0}},cookie);
assert.equal(r.status,409,'XP rollback blocked');
r=await call('save',{...save,version:1,profile:{xp:480,coins:1300,__adminRevision:0}},cookie);
assert.equal(r.status,200,JSON.stringify(r.json));
r=await call('save',null,cookie);
assert.equal(r.json.save.version,2);
assert.equal(r.json.save.profile.xp,480);
const trial=await fetch(base+'/api/economy-v36',{headers:{cookie}});
assert.equal(trial.status,200);
assert.equal((await trial.json()).trial,true);
const noOrigin=await fetch(base+'/api/account?action=save',{method:'POST',
 headers:{'content-type':'application/json','origin':'https://attacker.example',cookie},
 body:JSON.stringify(save)});
assert.equal(noOrigin.status,403,'cross-origin writes must be rejected');
const unauthWs=await fetch(base+'/api/ws');
assert.equal(unauthWs.status,426,'non-WebSocket request rejected');
r=await call('logout',{},cookie);
assert.equal(r.status,200);
r=await call('me',null,cookie);
assert.equal(r.status,401);
console.log('PASS Cloudflare-only: fresh registration, PBKDF2 login, persisted save XP, 409 conflicts, isolated economy, origin security, logout');
