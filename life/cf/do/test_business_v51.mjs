// Tests the v51 workshop against a populated, transactional SQLite schema.
// Never connects to live Cloudflare accounts.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {handleBusinessV51} from './business-v51.js';
import {startingEconomy} from '../../secure-economy-v36.js';
import {makeCheckpoint} from '../../economy-integrity-v37.js';
const db=new DatabaseSync(':memory:');db.exec(CORE_SQL);db.exec(ECONOMY_SQL);
const sql={exec(q,...params){
 const stmt=db.prepare(q),results=/^\s*(SELECT|PRAGMA|WITH)\b/i.test(q)?stmt.all(...params):(stmt.run(...params),[]);
 return {toArray:()=>results,one:()=>results[0]||null};
}};
const storage={sql,transactionSync(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}}};
const authDb={prepare:q=>({bind:(...params)=>({first:async()=>db.prepare(q).get(...params)||null})})};
const id=randomUUID(),plainToken='4'.repeat(64),start='2026-10-19T00:00:00.000Z',at='2026-10-20T00:00:00.000Z';
db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?)')
 .run(id,'qa_factory','사업꿈나무','salt','fake_hash',start);
db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
 .run(createHash('sha256').update(plainToken).digest('hex'),id,'2099-12-31T00:00:00Z',start);
const state=startingEconomy();state.coins=6000;state.stock={berry:3};
state.profession={active:'farmer',activeSince:start,changedAt:start,career:{farmer:0,chef:0,merchant:0},lastClaimDay:''};
db.prepare('INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)')
 .run(id,JSON.stringify(state),start);
const baseline=makeCheckpoint(id,0,state);
db.prepare('INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id,created_at) VALUES(?,?,?,?,?,?,?)')
 .run(id,0,JSON.stringify(state),null,baseline.state_hash,null,start);
// Past harvest events are server-generated proof of becoming a skilled farmer,
// never accepted from business API request arguments.
for(let i=0;i<10;i++)db.prepare('INSERT INTO village_economy_v36_events(user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at) VALUES(?,?,?,?,?,?,?,?)')
 .run(id,randomUUID(),'a'.repeat(64),'harvest',0,6000,'{}','2026-10-19T12:00:00.000Z');
const url='https://qa.example/api/business-v40';
async function call(body=null,{origin='https://qa.example',cookie=plainToken}={}){
 const request=new Request(url,{method:body?'POST':'GET',headers:{
  cookie:cookie?'village_session='+cookie:'',
  ...(body?{origin,'content-type':'application/json'}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
 const response=await handleBusinessV51(request,storage,authDb);
 return {status:response.status,data:await response.json()};
}
const saved=()=>JSON.parse(db.prepare('SELECT state FROM village_economy_v36_accounts WHERE user_key=?').get(id).state);
const amount=()=>db.prepare('SELECT count(*) AS n FROM village_economy_v36_events WHERE user_key=? AND action LIKE ?').get(id,'business_%').n;
let r=await call(null,{cookie:''});assert.equal(r.status,401);
r=await call();assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal(r.data.business.active,'farmer');
assert.equal(r.data.business.rank.tier,2);
assert.ok(r.data.rankings.board.farmer);
const requestId=randomUUID();
r=await call({action:'build',role:'farmer',requestId},{origin:'https://evil.example'});
assert.equal(r.status,403);
r=await call({action:'build',role:'farmer',requestId});
assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal(saved().coins,2900);
assert.equal(saved().workshops.farmer.level,1);
assert.equal(amount(),1);
r=await call({action:'build',role:'farmer',requestId});
assert.equal(r.status,200);assert.equal(r.data.replayed,true);
assert.equal(saved().coins,2900,'duplicate construction must not charge twice');
r=await call({action:'build',role:'chef',requestId});
assert.equal(r.status,409,'cannot reuse request ID for different role');
r=await call({action:'upgrade',role:'farmer',requestId:randomUUID()});
assert.equal(r.status,409,'rank 2 may not buy upgrade requiring rank 3');
const produceId=randomUUID();
r=await call({action:'produce',role:'farmer',requestId:produceId});
assert.equal(r.status,200,JSON.stringify(r.data));
assert.equal(saved().coins,2770);
assert.equal(saved().stock.berry,0);
assert.equal(saved().stock.berry_box,1);
r=await call({action:'produce',role:'farmer',requestId:produceId});
assert.equal(r.status,200);assert.equal(r.data.replayed,true);
assert.equal(saved().stock.berry_box,1);
r=await call({action:'produce',role:'farmer',requestId:randomUUID()});
assert.equal(r.status,409,'production without berries denied');
assert.equal(saved().stock.berry_box,1,'failed production cannot mint stock');
r=await call();assert.equal(r.status,200);
assert.equal(r.data.rankings.board.farmer[0].name,'사업꿈나무');
assert.equal(r.data.rankings.board.farmer[0].total,1);
assert.equal(db.prepare('SELECT version FROM village_economy_v36_accounts WHERE user_key=?').get(id).version,2);
const top=db.prepare('SELECT version,state_hash FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 1').get(id);
assert.equal(top.version,2);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
console.log('PASS v51 workshop: register 3100G, verified skill, product stock+cost, ranked production, replay safety, rejected upgrades and zero double mint');
