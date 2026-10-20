// Live HTTP routes against local Wrangler emulator; never send to production.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
const base=process.env.LOCAL_UNIFIED_URL||'http://127.0.0.1:8788';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local dev only');
let response=await fetch(base+'/api/market-v38');
assert.equal(response.status,401,'market must reject anonymous users');
const name='qa'+randomBytes(6).toString('hex'),password='qa-'+randomBytes(12).toString('hex');
const post=async(action,body)=>{
 const r=await fetch(base+'/api/account?action='+action,{method:'POST',
  headers:{origin:base,'content-type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
};
let r=await post('register',{username:name,nickname:name.slice(0,12),password});
assert.equal(r.status,201,JSON.stringify(r));
r=await post('login',{username:name,password});
assert.equal(r.status,200);
const cookie=r.cookie;
response=await fetch(base+'/api/market-v38',{headers:{cookie}});
assert.equal(response.status,200,'authenticated market browse must work');
let market=await response.json();
assert.equal(market.trial,true);
assert.ok(Array.isArray(market.listings));
assert.ok(market.products.lettuce);
const request=async data=>{
 const response=await fetch(base+'/api/market-v38',{
  method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},
  body:JSON.stringify(data)
 });return {status:response.status,data:await response.json()};
};
r=await request({kind:'list',requestId:randomUUID(),payload:{item:'lettuce',quantity:1,unitPrice:1}});
assert.equal(r.status,400,'off-market prices blocked');
r=await request({kind:'list',requestId:randomUUID(),payload:{item:'lettuce',quantity:1,unitPrice:34}});
assert.equal(r.status,409,'cannot list food not owned by player');
response=await fetch(base+'/api/market-v38',{headers:{cookie}});
market=await response.json();
assert.equal(market.listings.filter(x=>x.seller_key===market.me).length,0);
assert.equal(market.version,0,'refused listing does not create market account versions');
console.log('PASS v51 local Cloudflare Worker market: auth, browse, server-catalog pricing, no phantom listings');
