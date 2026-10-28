import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeEconomyHandler} from './api/economy-v36.js';

const beforeEconomy=process.env.ENABLE_VILLAGE_ECONOMY_V36;
const beforeEnergy=process.env.ENABLE_VILLAGE_ENERGY_V47;
process.env.ENABLE_VILLAGE_ECONOMY_V36='true';
process.env.ENABLE_VILLAGE_ENERGY_V47='true';
const store={account:null,events:[],checkpoints:[]},seen=[];
const pool={async connect(){
 let working=null;
 const live=()=>working||store;
 return {release(){},async query(sql,params=[]){
  const q=sql.trim().toLowerCase().replace(/\s+/g,' ');
  seen.push(q);
  if(q==='begin'){working=structuredClone(store);return {rows:[]}}
  if(q==='commit'){Object.assign(store,working);working=null;return {rows:[]}}
  if(q==='rollback'){working=null;return {rows:[]}}
  if(q.includes('from village_sessions s join village_users'))return {rows:[{id:'rapid-gather-user',nickname:'테스트'}]};
  if(q.startsWith('insert into village_economy_v36_accounts')){
   if(!working.account)working.account={state:JSON.parse(params[1]),version:0};
   return {rows:[]};
  }
  if(q.startsWith('select state,version from village_economy_v36_accounts'))return {rows:live().account?[structuredClone(live().account)]:[]};
  if(q.startsWith('select request_hash,receipt from village_economy_v36_events')){
   return {rows:live().events.filter(e=>e.request_id===params[1]).map(e=>({request_hash:e.request_hash,receipt:e.receipt}))};
  }
  if(q.startsWith('select receipt from village_economy_v36_events'))return {rows:live().events.slice(-8).reverse().map(e=>({receipt:e.receipt}))};
  if(q.startsWith('select version,state,previous_hash,state_hash,request_id from village_economy_v37_checkpoints')){
   return {rows:structuredClone(live().checkpoints.slice(-25).reverse())};
  }
  if(q.startsWith('insert into village_economy_v37_checkpoints')){
   working.checkpoints.push({version:params[1],state:JSON.parse(params[2]),previous_hash:params[3],state_hash:params[4],request_id:params[5]});
   return {rows:[]};
  }
  if(q.startsWith('update village_economy_v36_accounts')){
   assert(working,'updates must be transactional');
   working.account.state=JSON.parse(params[1]);working.account.version++;
   return {rows:[]};
  }
  if(q.startsWith('insert into village_economy_v36_events')){
   working.events.push({request_id:params[1],request_hash:params[2],receipt:JSON.parse(params[6])});
   return {rows:[]};
  }
  throw Error('unexpected SQL: '+q);
 }};
}};
const handler=makeEconomyHandler({pool,now:()=>new Date('2026-10-29T02:00:00+09:00')});
const cookie='village_session='+'a'.repeat(64);
async function req(body,headers={}){
 const res={code:0,body:null,setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
 await handler({method:'POST',body,headers:{
  host:'village.test',origin:'https://village.test','sec-fetch-site':'same-origin',cookie,'content-type':'application/json',...headers
 }},res);
 return res;
}
try{
 const gather={action:'world_spend',requestId:randomUUID(),payload:{kind:'gather'}};
 const first=await req(gather);
 assert.equal(first.code,200,JSON.stringify(first.body));
 assert.equal(first.body.energy.current,197);
 assert.equal(first.body.receipt.energyCost,3);
 assert.equal(first.body.receipt.delta,0);
 assert.equal(first.body.economy.coins,5000);
 assert.equal(store.account.version,1);
 assert.equal(store.checkpoints.length,2);
 const replay=await req(gather);
 assert.equal(replay.code,200);
 assert.equal(replay.body.replayed,true);
 assert.equal(replay.body.energy.current,197);
 assert.equal(store.events.length,1);
 const colliding=await req({...gather,payload:{kind:'fish'}});
 assert.equal(colliding.code,409);
 const fish=await req({action:'world_spend',requestId:randomUUID(),payload:{kind:'fish'}});
 assert.equal(fish.code,200,JSON.stringify(fish.body));
 assert.equal(fish.body.energy.current,192);
 assert.equal(store.checkpoints.length,3);
 assert.equal((await req({action:'world_spend',requestId:randomUUID(),payload:{kind:'free_energy'}})).code,400);
 assert.equal((await req({action:'world_spend',requestId:randomUUID(),payload:{kind:'gather',current:900}})).code,400);
 assert.equal((await req({action:'world_spend',requestId:randomUUID(),payload:{kind:'gather'}},{origin:'https://evil.invalid'})).code,403);
 assert.equal((await req({action:'world_spend',requestId:randomUUID(),payload:{kind:'gather'}},{cookie:''})).code,401);
 assert.equal(store.account.version,2);
 assert(seen.every(q=>!/(update|delete|insert into) (village_saves|village_wallets|village_users)/.test(q)));
 console.log('PASS v71 world_spend: authenticated, atomic 3/5-cost, replay-proof, checkpointed, no legacy balance mutation');
}finally{
 if(beforeEconomy===undefined)delete process.env.ENABLE_VILLAGE_ECONOMY_V36;
 else process.env.ENABLE_VILLAGE_ECONOMY_V36=beforeEconomy;
 if(beforeEnergy===undefined)delete process.env.ENABLE_VILLAGE_ENERGY_V47;
 else process.env.ENABLE_VILLAGE_ENERGY_V47=beforeEnergy;
}
