// v51 quest audit: all progress comes from server receipt events, and
// every claim is one SQLite transaction. Never touches live Cloudflare.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {startingEconomy} from '../../secure-economy-v36.js';
import {installV51QuestSchema,handleQuestsV51,QUESTS_V51} from './quests-v51.js';

const sqlite=new DatabaseSync(':memory:');sqlite.exec(CORE_SQL);sqlite.exec(ECONOMY_SQL);
const exec=(query,...params)=>{
 const statement=sqlite.prepare(query);
 const rows=/^\s*(SELECT|WITH|PRAGMA)\b/i.test(query)?statement.all(...params):(statement.run(...params),[]);
 return {toArray(){return rows},one(){return rows[0]||null}};
};
const storage={sql:{exec},transactionSync(fn){
 sqlite.exec('BEGIN IMMEDIATE');
 try{const result=fn();sqlite.exec('COMMIT');return result}
 catch(e){sqlite.exec('ROLLBACK');throw e}
}};
installV51QuestSchema(storage.sql);
const db={prepare:q=>({bind:(...values)=>({first:async()=>sqlite.prepare(q).get(...values)||null})})};
const actor=randomUUID(),token='5'.repeat(64),created=new Date().toISOString();
sqlite.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?)')
 .run(actor,'qa_quest','새의뢰주민','salt','fake_hash',created);
sqlite.prepare('INSERT INTO village_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)')
 .run(createHash('sha256').update(token).digest('hex'),actor,created,'2099-12-31T00:00:00Z');
const initial=startingEconomy();
sqlite.prepare('INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)')
 .run(actor,JSON.stringify(initial),created);
const insertEvent=action=>sqlite.prepare(`INSERT INTO village_economy_v36_events
 (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
 VALUES(?,?,?,?,?,?,?,?)`).run(actor,randomUUID(),'a'.repeat(64),action,0,initial.coins,'{}',new Date().toISOString());
const url='https://qa.invalid/api/quests-v51';
async function req(payload=null,{auth=true,origin='https://qa.invalid'}={}){
 const r=await handleQuestsV51(new Request(url,{method:payload?'POST':'GET',
  headers:{cookie:auth?'village_session='+token:'',
   ...(payload?{origin,'content-type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})
 }),storage,db);
 return {status:r.status,body:await r.json()};
}
const account=()=>JSON.parse(sqlite.prepare('SELECT state FROM village_economy_v36_accounts WHERE user_key=?').get(actor).state);
let r=await req(null,{auth:false});
assert.equal(r.status,401);
r=await req();
assert.equal(r.status,200);
assert.equal(r.body.quests.length,QUESTS_V51.length);
assert.equal(r.body.quests.find(x=>x.id==='welcome_career').claimable,false);
r=await req({questId:'welcome_career',requestId:randomUUID()});
assert.equal(r.status,409,'client cannot claim without server-stored job');
insertEvent('profession_register');
r=await req();
assert.equal(r.body.quests.find(x=>x.id==='welcome_career').claimable,true);
const rewardId=randomUUID(),startGold=account().coins;
r=await req({questId:'welcome_career',requestId:rewardId},{origin:'https://hijack.invalid'});
assert.equal(r.status,403);
r=await req({questId:'welcome_career',requestId:rewardId});
assert.equal(r.status,200,JSON.stringify(r.body));
assert.equal(r.body.gold,320);
assert.equal(account().coins,startGold+320);
r=await req({questId:'welcome_career',requestId:rewardId});
assert.equal(r.status,200);
assert.equal(r.body.replayed,true);
assert.equal(account().coins,startGold+320,'same claim cannot mint more gold');
r=await req({questId:'welcome_career',requestId:randomUUID()});
assert.equal(r.status,409);
r=await req({questId:'market_debut',requestId:rewardId});
assert.equal(r.status,409,'requestId cannot be reused for another quest');
insertEvent('plant');insertEvent('plant');
r=await req();
const daily=r.body.quests.find(x=>x.id==='daily_sowing');
assert.equal(daily.done,2);
const dailyId=randomUUID();
r=await req({questId:'daily_sowing',requestId:dailyId});
assert.equal(r.status,200);
assert.equal(account().coins,startGold+320+90);
r=await req({questId:'daily_sowing',requestId:dailyId});
assert.equal(r.status,200);assert.equal(r.body.replayed,true);
r=await req();
assert.equal(r.body.quests.find(x=>x.id==='daily_sowing').claimed,true);
assert.equal(r.body.quests.find(x=>x.id==='welcome_career').claimed,true);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM village_quest_claims_v51').get().n,2);
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM village_economy_v36_events WHERE action=?').get('quest_claim_v51').n,2);
assert.equal(sqlite.prepare('SELECT version FROM village_economy_v36_accounts WHERE user_key=?').get(actor).version,2);
assert.equal(sqlite.prepare('SELECT max(version) AS v FROM village_economy_v37_checkpoints WHERE user_key=?').get(actor).v,2);
assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
console.log('PASS v51 Cloudflare quests: server-only progress, KST daily counts, separate trial gold, exact-once and replay-safe reward receipts');
