// v44 PostgreSQL concurrency E2E. Refuses Neon / real DB and never touches operating accounts.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {startingEconomy} from './secure-economy-v36.js';
import {selectProfession} from './professions-v39.js';
import {makeResidentDemandHandler} from './api/resident-demand-v44.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
import {residentBuyerQuote} from './resident-demand-v44.js';
if(process.env.JUNJA_V44_DISPOSABLE_DB!=='true')throw Error('v44 PostgreSQL test requires disposable DB flag');
const connectionString=process.env.JUNJA_V44_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(connectionString))
 throw Error('v44 QA only permits local postgres:5432. Production and Neon are forbidden.');
const pool=new pg.Pool({connectionString,ssl:false,max:12});
const tokens={owner:'a'.repeat(64),visitor:'b'.repeat(64)};
const previous=process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;
process.env.ENABLE_VILLAGE_NPC_DEMAND_V44='true';
const handler=makeResidentDemandHandler({pool});
const response=()=>({code:null,data:null,setHeader(){},status(s){this.code=s;return this},json(d){this.data=d;return this}});
async function request(user,method='GET',body={},headers={}){
 const res=response();
 await handler({method,body,headers:{cookie:'village_session='+tokens[user],
  origin:'http://localhost:38844',host:'localhost:38844','content-type':'application/json',
  'sec-fetch-site':'same-origin',...headers}},res);
 return res;
}
async function sell(user,npcId='tobi',requestId=randomUUID()){return request(user,'POST',{npcId,requestId})}
const account=async key=>(await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const file of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 for(const [key,name] of [['owner','농부 실험자'],['visitor','방문자']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,name]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [createHash('sha256').update(tokens[key]).digest('hex'),key]);
 }
 const now=new Date();
 const baseline=startingEconomy();baseline.coins=5_000;baseline.stock.berry_box=2;
 baseline.workshops={farmer:{level:1,createdAt:now.toISOString()}};
 const farmed=selectProfession(baseline,'farmer',{},now).next;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',
  ['owner',JSON.stringify(farmed)]);
 assert.equal((await request('visitor')).code,200,'Visitor sees only own order board');
 assert.equal((await sell('visitor')).code,403,'Visitor has no owned profession and receives a forbidden response');
 assert.equal((await sell('owner','rina')).code,403,'Wrong profession purchase denied');
 assert.equal((await request('owner','POST',{npcId:'tobi',requestId:randomUUID()},
  {origin:'https://evil.example'})).code,403,'Origin/CSRF denied');
 assert.equal((await request('owner','POST',{npcId:'tobi',requestId:randomUUID()},
  {cookie:''})).code,401,'Session required');
 const quote=residentBuyerQuote('tobi',now);
 const id=randomUUID();
 const results=await Promise.all(Array.from({length:7},()=>sell('owner','tobi',id)));
 assert(results.every(r=>r.code===200),'Duplicate UUID requests must replay successful receipt');
 assert.equal(results.filter(x=>!x.data.replayed).length,1,'Seven concurrent purchase requests process exactly once');
 const paid=await account('owner');
 assert.equal(paid.state.stock.berry_box,1,'NPC bought exactly one physical item');
 assert.equal(paid.state.coins,farmed.coins+quote.net);
 assert.equal(Number(paid.version),1);
 assert.equal(paid.state.residentOrders.spent,quote.gross,'Gross daily budget recorded');
 assert.equal(paid.state.residentOrders.used.length,1);
 const receipt=results[0].data.receipt;
 assert.equal(receipt.net,quote.net);
 assert.equal(receipt.tax,quote.tax);
 assert.equal((await sell('owner','tobi',randomUUID())).code,409,'New UUID cannot double-claim same daily NPC order');
 assert.equal((await sell('owner','rina',id)).code,409,'Same UUID cannot be reused for another NPC');
 const status=await request('owner');
 assert.equal(status.code,200);
 assert.equal(status.data.demand.used,1);
 assert.equal(status.data.demand.orders.find(x=>x.npcId==='tobi').sold,true);
 assert.equal(status.data.audit.ok,true);
 const checkpoint=(await pool.query(`SELECT version,state,previous_hash,state_hash,request_id
  FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,['owner'])).rows;
 assert.equal(validateCheckpointChain('owner',paid,checkpoint).ok,true);
 const count=(await pool.query("SELECT count(*)::int AS n FROM village_economy_v36_events WHERE user_key='owner' AND action='npc_purchase'")).rows[0].n;
 assert.equal(count,1,'One official trial receipt despite seven concurrent HTTP submissions');
 // Corruption tested only in disposable local CI. v44 must stop all future purchases.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','99999'::jsonb) WHERE user_key='owner'");
 assert.equal((await sell('owner','tobi',randomUUID())).code,409);
 assert.equal(Number((await account('owner')).version),1,'Checkpoint failure cannot increment account revision');
 console.log('PASS v44 disposable PostgreSQL: 7 parallel NPC purchases exactly one payout + stock consumption, tax, CSRF, wrong role, audit corruption lock');
}finally{
 if(previous===undefined)delete process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;
 else process.env.ENABLE_VILLAGE_NPC_DEMAND_V44=previous;
 await pool.end();
}
