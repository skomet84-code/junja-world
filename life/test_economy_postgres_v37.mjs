// Real PostgreSQL end-to-end transaction test; CI DATABASE_URL points ONLY to disposable local Postgres.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {makeEconomyRecoveryHandler} from './api/economy-v37.js';

if(process.env.JUNJA_V37_DISPOSABLE_DB!=='true')throw Error('Refusing to write outside explicitly disposable CI test database');
const url=process.env.JUNJA_V37_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(url))
 throw Error('Test DSN must be localhost:5432, never production or Neon');
const pool=new pg.Pool({connectionString:url,ssl:false,max:8});
const token='b'.repeat(64),tokenHash=createHash('sha256').update(token).digest('hex');
let time=new Date('2026-10-19T01:00:00+09:00');
const beforeFlag=process.env.ENABLE_VILLAGE_ECONOMY_V37;
process.env.ENABLE_VILLAGE_ECONOMY_V37='true';
const makeRes=()=>({code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(o){this.body=o;return this}});
const handle=makeEconomyRecoveryHandler({pool,now:()=>time});
async function request(method,body={},extras={}){
 const res=makeRes();
 await handle({method,headers:{cookie:'village_session='+token,host:'localhost:38837',origin:'http://localhost:38837','content-type':'application/json','sec-fetch-site':'same-origin',...extras},body},res);
 return res;
}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 await pool.query(await readFile(new URL('./migrations/036_secure_economy.sql',import.meta.url),'utf8'));
 await pool.query(await readFile(new URL('./migrations/037_checkpoint_chain.sql',import.meta.url),'utf8'));
 await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',['ci-v37-user','QA 정착민']);
 await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[tokenHash,'ci-v37-user']);
 const firstRead=await request('GET');assert.equal(firstRead.code,200);
 assert.equal(firstRead.body.audit.reason,'trial_account_not_created');
 assert.equal(firstRead.body.economy.coins,1500);
 const id=randomUUID();
 const body={requestId:id,action:'plant',payload:{index:0,crop:'lettuce',cost:-999999}};
 const results=await Promise.all(Array.from({length:5},()=>request('POST',body)));
 assert(results.every(r=>r.code===200),'Identical concurrent requests must all succeed as one charge');
 assert.equal(results.filter(r=>!r.body.replayed).length,1,'Exactly one successful original transaction');
 const account1=await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',['ci-v37-user']);
 assert.equal(Number(account1.rows[0].version),1);
 assert.equal(Number(account1.rows[0].state.coins),1480);
 const events1=await pool.query('SELECT count(*)::int AS n FROM village_economy_v36_events WHERE user_key=$1',['ci-v37-user']);
 assert.equal(events1.rows[0].n,1);
 const snaps1=await pool.query('SELECT version,state_hash FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version',['ci-v37-user']);
 assert.deepEqual(snaps1.rows.map(r=>Number(r.version)),[0,1]);
 const mismatch=await request('POST',{requestId:id,action:'plant',payload:{index:1,crop:'lettuce'}});
 assert.equal(mismatch.code,409,'Reusing UUID for a different action is rejected');
 const early=await request('POST',{requestId:randomUUID(),action:'harvest',payload:{index:0}});
 assert.equal(early.code,409,'Server blocks early harvest');
 time=new Date(time.getTime()+61000);
 const harvest=await request('POST',{requestId:randomUUID(),action:'harvest',payload:{index:0}});
 assert.equal(harvest.code,200);
 assert.equal(harvest.body.economy.stock.lettuce,1);
 const sale=await request('POST',{requestId:randomUUID(),action:'sell',payload:{item:'lettuce',sell:1000000}});
 assert.equal(sale.code,200);
 assert.equal(sale.body.economy.coins,1514);
 let audit=await request('GET');
 assert.equal(audit.body.audit.ok,true,'Every database checkpoint matches latest account and hash chain');
 assert.equal(audit.body.audit.checked,4,'Baseline plus three successful operations');
 const savedSnapshot=structuredClone(audit.body.economy);
 // CI ONLY: model an out-of-band account corruption. DB integrity gate must stop further writes.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key=$1",['ci-v37-user']);
 const blocked=await request('POST',{requestId:randomUUID(),action:'plant',payload:{index:2,crop:'lettuce'}});
 assert.equal(blocked.code,409);
 assert.equal(blocked.body.reason,'account_snapshot_mismatch');
 const snap4=await pool.query('SELECT count(*)::int AS n FROM village_economy_v37_checkpoints WHERE user_key=$1',['ci-v37-user']);
 assert.equal(snap4.rows[0].n,4,'Corruption must not create a new snapshot');
 // Manual repair simulation permitted ONLY in disposable CI database.
 const restored=await pool.query("SELECT state FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 1",['ci-v37-user']);
 assert.equal(restored.rows[0].state.coins,savedSnapshot.coins);
 await pool.query('UPDATE village_economy_v36_accounts SET state=$2::jsonb WHERE user_key=$1',['ci-v37-user',JSON.stringify(restored.rows[0].state)]);
 audit=await request('GET');assert.equal(audit.body.audit.ok,true,'Restored checkpoint matches account again');
 const resumed=await request('POST',{requestId:randomUUID(),action:'plant',payload:{index:2,crop:'lettuce'}});
 assert.equal(resumed.code,200,'Safe operations resume after verified repair');
 assert.equal(resumed.body.economy.coins,1494);
 const finalEvents=await pool.query('SELECT count(*)::int AS n FROM village_economy_v36_events WHERE user_key=$1',['ci-v37-user']);
 assert.equal(finalEvents.rows[0].n,4);
 console.log('PASS v37 real PostgreSQL: parallel duplicate requests, ACID ledger, KST crop timers, tamper-stop and verified recovery');
}finally{
 if(beforeFlag===undefined)delete process.env.ENABLE_VILLAGE_ECONOMY_V37;else process.env.ENABLE_VILLAGE_ECONOMY_V37=beforeFlag;
 await pool.end();
}
