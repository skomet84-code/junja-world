import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeEconomyHandler} from './api/economy-v36.js';
const prior=process.env.ENABLE_VILLAGE_ECONOMY_V36;
process.env.ENABLE_VILLAGE_ECONOMY_V36='true';
let current=new Date('2026-10-18T00:00:00Z');
const store={account:null,events:[]},seen=[];
const pool={
 async connect(){
  let working=null;
  const live=()=>working||store;
  return {release(){},async query(query,params=[]){
   const q=query.trim().replace(/\s+/g,' ').toLowerCase();seen.push(q);
   if(q==='begin'){working=structuredClone(store);return {rows:[]}}
   if(q==='commit'){assert(working);store.account=working.account;store.events=working.events;working=null;return {rows:[]}}
   if(q==='rollback'){working=null;return {rows:[]}}
   if(q.includes('from village_sessions s join village_users'))return {rows:[{id:'user-a',nickname:'준자'}]};
   if(q.startsWith('insert into village_economy_v36_accounts')){
    if(!working.account)working.account={state:JSON.parse(params[1]),version:0};
    return {rows:[]};
   }
   if(q.startsWith('select state,version from village_economy_v36_accounts'))return {rows:live().account?[structuredClone(live().account)]:[]};
   if(q.startsWith('select request_hash,receipt from village_economy_v36_events'))return {rows:live().events.filter(e=>e.request_id===params[1]).map(e=>({request_hash:e.request_hash,receipt:e.receipt}))};
   if(q.startsWith('select receipt from village_economy_v36_events'))return {rows:live().events.slice(-8).reverse().map(e=>({receipt:e.receipt}))};
   if(q.startsWith('update village_economy_v36_accounts')){
    assert(working?.account,'State must only update inside a transaction');
    working.account.state=JSON.parse(params[1]);working.account.version++;
    return {rows:[]};
   }
   if(q.startsWith('insert into village_economy_v36_events')){
    assert(working?.account,'Receipt must be written in same transaction as account');
    working.events.push({request_id:params[1],request_hash:params[2],receipt:JSON.parse(params[6])});
    return {rows:[]};
   }
   throw Error('Unexpected SQL: '+q);
  }};
 }
};
const handler=makeEconomyHandler({pool,now:()=>current});
const cookie='village_session='+'a'.repeat(64);
function req(method,body={},headers={}){
 const res={code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}};
 return handler({method,headers:{host:'test.local',origin:'https://test.local','sec-fetch-site':'same-origin','content-type':'application/json',cookie,...headers},body},res).then(()=>res);
}
try{
 const unauthorized=await req('GET',{}, {cookie:''});
 assert.equal(unauthorized.code,401);
 const forbidden=await req('POST',{action:'plant',requestId:randomUUID(),payload:{index:0,crop:'lettuce'}},{origin:'https://evil.example'});
 assert.equal(forbidden.code,403);
 const initial=await req('GET');
 assert.equal(initial.code,200);
 assert.equal(initial.body.economy.coins,5000);
 assert.equal(store.account,null,'Unauthenticated read cannot initialize an account');
 const requestId=randomUUID(),body={action:'plant',requestId,payload:{index:0,crop:'lettuce',cost:0}};
 let first=await req('POST',body);
 assert.equal(first.code,200);
 assert.equal(first.body.economy.coins,4980);
 assert.equal(store.account.version,1);
 assert.equal(store.events.length,1);
 let replay=await req('POST',body);
 assert.equal(replay.code,200);assert.equal(replay.body.replayed,true);
 assert.equal(store.account.version,1,'Retry cannot spend twice');
 assert.equal(store.events.length,1);
 const colliding=await req('POST',{...body,payload:{index:1,crop:'lettuce'}});
 assert.equal(colliding.code,409);
 assert.equal(store.account.version,1);
 const early=await req('POST',{action:'harvest',requestId:randomUUID(),payload:{index:0}});
 assert.equal(early.code,409);
 assert.equal(store.account.version,1,'Failed harvest should rollback');
 current=new Date(current.getTime()+61000);
 const harvest=await req('POST',{action:'harvest',requestId:randomUUID(),payload:{index:0}});
 assert.equal(harvest.code,200);
 assert.equal(harvest.body.economy.stock.lettuce,1);
 assert.equal(store.account.version,2);
 const sell=await req('POST',{action:'sell',requestId:randomUUID(),payload:{item:'lettuce',sell:99999999}});
 assert.equal(sell.code,200);assert.equal(sell.body.economy.coins,5014);
 assert.equal(store.account.version,3);assert.equal(store.events.length,3);
 const snapshot=await req('GET');
 assert.equal(snapshot.body.receipts.length,3);
 assert.equal(snapshot.body.economy.coins,5014);
 assert(seen.every(s=>!/(update|delete|insert into) (village_saves|village_wallets|village_users)/.test(s)),'Cannot mutate legacy game tables');
 console.log('v36 API: login, CSRF, atomic receipts, duplicate request replay, same-ID conflict and server-only amount tests passed');
}finally{
 if(prior===undefined)delete process.env.ENABLE_VILLAGE_ECONOMY_V36;
 else process.env.ENABLE_VILLAGE_ECONOMY_V36=prior;
}
