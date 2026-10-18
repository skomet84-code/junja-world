// End-to-end v39 career contract test. PostgreSQL may ONLY be local disposable CI data.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {makeProfessionsHandler} from './api/professions-v39.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
if(process.env.JUNJA_V39_DISPOSABLE_DB!=='true')throw Error('Test writes restricted to disposable Postgres');
const url=process.env.JUNJA_V39_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(url))
 throw Error('Refusing any DB except localhost:5432');
const pool=new pg.Pool({connectionString:url,ssl:false,max:9});
const token='f'.repeat(64),prior=process.env.ENABLE_VILLAGE_PROFESSIONS_V39;
process.env.ENABLE_VILLAGE_PROFESSIONS_V39='true';
const handler=makeProfessionsHandler({pool});
function makeRes(){return {statusCode:0,result:null,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.result=v;return this}}}
async function call(method,body={},headers={}){
 const r=makeRes();
 await handler({method,body,headers:{host:'localhost:38839',origin:'http://localhost:38839','sec-fetch-site':'same-origin',
  cookie:'village_session='+token,'content-type':'application/json',...headers}},r);
 return r;
}
async function post(action,role=null,requestId=randomUUID()){return call('POST',{action,role,requestId})}
async function account(){
 const q=await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',['ci-worker']);
 return q.rows[0];
}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const file of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',['ci-worker','테스트 농부']);
 await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
  [createHash('sha256').update(token).digest('hex'),'ci-worker']);
 const disabled=await call('GET',{}, {cookie:''});assert.equal(disabled.statusCode,401);
 const csrf=await post('register','farmer',randomUUID());
 assert.equal(csrf.statusCode,200);
 assert.equal(csrf.result.coins,1250);
 assert.equal(csrf.result.profession.active,'farmer');
 assert.equal((await post('claim')).statusCode,409,'Claims without verified farming are forbidden');
 const forbidden=await call('POST',{action:'claim',requestId:randomUUID()},{origin:'https://untrusted.example'});
 assert.equal(forbidden.statusCode,403);
 // Test fixtures insert server-side authoritative receipts DIRECTLY into a disposable CI DB only.
 // A browser request cannot insert these or choose a payout count.
 const dummyHash='c'.repeat(64);
 for(let i=0;i<4;i++){
  const receipt={action:'harvest',detail:'검증된 시험 수확',delta:0,balance:1250};
  await pool.query(`INSERT INTO village_economy_v36_events
   (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
   VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
   ['ci-worker',randomUUID(),dummyHash,'harvest',0,1250,JSON.stringify(receipt)]);
 }
 const fetched=await call('GET');
 assert.equal(fetched.result.profession.progress.harvest,4);
 assert.equal(fetched.result.profession.ready,true);
 assert.equal(fetched.result.profession.earned,48);
 const claimId=randomUUID();
 const batch=await Promise.all(Array.from({length:6},()=>post('claim',null,claimId)));
 assert(batch.every(x=>x.statusCode===200),'Retrying committed daily reward should not fail');
 assert.equal(batch.filter(x=>!x.result.replayed).length,1,'Only one successful contract payout');
 assert.equal(batch.filter(x=>x.result.replayed).length,5,'Duplicates resolve through idempotency receipt');
 let record=await account();
 assert.equal(record.state.coins,1410,'Farmer daily contract pays 160G exactly once');
 assert.equal(Number(record.version),2,'License + contract = exactly two wallet versions');
 assert.equal(record.state.profession.lastClaimDay,await Promise.resolve(fetched.result.profession.day));
 assert.equal((await post('claim')).statusCode,409,'A second claim with a different UUID must not pay');
 assert.equal((await post('register','chef')).statusCode,409,'Role switch is locked for seven days');
 assert.equal((await post('register','farmer')).statusCode,409,'Selecting same active profession is blocked');
 const hashes=await pool.query(`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC`,['ci-worker']);
 assert.deepEqual(hashes.rows.map(x=>Number(x.version)),[2,1,0]);
 assert.equal(validateCheckpointChain('ci-worker',record,hashes.rows).ok,true);
 // Simulate unexpected DB corruption ONLY in disposable CI database, assert that all further claims stop.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','9999'::jsonb) WHERE user_key=$1",['ci-worker']);
 const interrupted=await post('claim');
 assert.equal(interrupted.statusCode,409,'Corrupt account must block every role transaction');
 assert.equal(Number((await account()).version),2,'Corrupt attempt does not mint a new checkpoint or receipt');
 const snapshots=await pool.query('SELECT count(*)::int AS n FROM village_economy_v37_checkpoints');
 assert.equal(snapshots.rows[0].n,3);
 console.log('PASS v39 disposable PostgreSQL: signed server-activity proofs, license debit, six concurrent reward retries, one daily payment, cooldown, audit fail-closed');
}finally{
 if(prior===undefined)delete process.env.ENABLE_VILLAGE_PROFESSIONS_V39;else process.env.ENABLE_VILLAGE_PROFESSIONS_V39=prior;
 await pool.end();
}
