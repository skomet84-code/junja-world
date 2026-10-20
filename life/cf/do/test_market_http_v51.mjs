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
// The adjacent v39 career service must also run on the SAME account/SQLite DB.
let career=await fetch(base+'/api/professions-v39',{headers:{cookie}});
assert.equal(career.status,200);
let careerData=await career.json();
assert.equal(careerData.profession.active,null);
const licenseRequest=randomUUID();
const job=async action=>{
 const res=await fetch(base+'/api/professions-v39',{
  method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},
  body:JSON.stringify(action)
 });return {status:res.status,data:await res.json()};
};
let joined=await job({action:'register',role:'farmer',requestId:licenseRequest});
assert.equal(joined.status,200,JSON.stringify(joined));
assert.equal(joined.data.coins,1250);
joined=await job({action:'register',role:'farmer',requestId:licenseRequest});
assert.equal(joined.status,200);
assert.equal(joined.data.replayed,true);
joined=await job({action:'claim',requestId:randomUUID()});
assert.equal(joined.status,409,'no work proof means no daily reward');
career=await fetch(base+'/api/professions-v39',{headers:{cookie}});
careerData=await career.json();
assert.equal(careerData.profession.active,'farmer');
assert.equal(careerData.coins,1250);

// The same user can browse personal workshops. A rank-1 farmer cannot
// build a rank-2 facility, and a denied attempt must not deduct money.
let businessResponse=await fetch(base+'/api/business-v40',{headers:{cookie}});
assert.equal(businessResponse.status,200);
let businessData=await businessResponse.json();
assert.equal(businessData.business.active,'farmer');
assert.equal(businessData.business.workshops.farmer,undefined);
const buildAttempt=await fetch(base+'/api/business-v40',{
 method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},
 body:JSON.stringify({action:'build',role:'farmer',requestId:randomUUID()})
});
assert.equal(buildAttempt.status,409,'unskilled farmer cannot construct workshop');
businessResponse=await fetch(base+'/api/business-v40',{headers:{cookie}});
businessData=await businessResponse.json();
assert.equal(businessData.coins,1250);
assert.equal(businessData.business.workshops.farmer,undefined);

// Server-authored career quest progress and exact-once trial reward.
let questsResponse=await fetch(base+'/api/quests-v51');
assert.equal(questsResponse.status,401,'anonymous players cannot inspect other quests');
questsResponse=await fetch(base+'/api/quests-v51',{headers:{cookie}});
assert.equal(questsResponse.status,200);
let questData=await questsResponse.json();
const careerQuest=questData.quests.find(q=>q.id==='welcome_career');
assert.equal(careerQuest.done,1,'registered career must produce server quest receipt');
assert.equal(careerQuest.claimable,true);
const questRequestId=randomUUID();
async function claimCareer(){
 const res=await fetch(base+'/api/quests-v51',{
  method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},
  body:JSON.stringify({questId:'welcome_career',requestId:questRequestId})
 });return {status:res.status,data:await res.json()};
}
let questReward=await claimCareer();
assert.equal(questReward.status,200,JSON.stringify(questReward.data));
assert.equal(questReward.data.gold,320);
questReward=await claimCareer();
assert.equal(questReward.status,200);
assert.equal(questReward.data.replayed,true);
questsResponse=await fetch(base+'/api/quests-v51',{headers:{cookie}});
questData=await questsResponse.json();
assert.equal(questData.quests.find(q=>q.id==='welcome_career').claimed,true);

console.log('PASS v51 local Cloudflare Worker market + career + business + quests: authenticated routes, catalog pricing, no phantom listings, idempotent license and no unearned rewards');
