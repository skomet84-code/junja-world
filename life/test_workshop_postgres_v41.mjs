// v41 authenticated visitor and placement E2E: strictly isolated local disposable PostgreSQL.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {makeBusinessHandler} from './api/business-v40.js';
import {makeWorkshopVisitsHandler} from './api/workshop-visits-v41.js';
import {startingEconomy} from './secure-economy-v36.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
if(process.env.JUNJA_V41_DISPOSABLE_DB!=='true')throw Error('Production/Neon writes refused: disposable DB is required');
const url=process.env.JUNJA_V41_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(url))
 throw Error('v41 E2E only accepts localhost:5432 database');
const pool=new pg.Pool({connectionString:url,ssl:false,max:9});
const tokens={owner:'a'.repeat(64),guest:'b'.repeat(64)};
const flags=['ENABLE_VILLAGE_BUSINESS_V40','ENABLE_VILLAGE_WORKSHOPS_V41'];
const originals=flags.map(k=>process.env[k]);
for(const k of flags)process.env[k]='true';
const business=makeBusinessHandler({pool}),visits=makeWorkshopVisitsHandler({pool});
const makeRes=()=>({code:0,body:null,setHeader(){},status(n){this.code=n;return this},json(value){this.body=value;return this}});
async function req(user,method,body={},api=business,params={}){
 const r=makeRes();
 await api({method,body,query:params.query||{},url:params.url||'/api/workshop-visits-v41',
  headers:{host:'localhost:38841',origin:'http://localhost:38841',
   cookie:'village_session='+tokens[user],'sec-fetch-site':'same-origin','content-type':'application/json',...params.headers}},r);
 return r;
}
async function place(user,role,site,requestId=randomUUID()){
 return req(user,'POST',{action:'place',role,site,requestId});
}
const getState=async(key)=>(
 await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])
).rows[0];
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const file of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 for(const [key,label] of [['owner','온실 주인'],['guest','방문 주민']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,label]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(tokens[key]).digest('hex'),key]);
 }
 const s=startingEconomy();s.coins=43210;s.stock={berry_box:9,carrot:44};
 s.workshops={farmer:{level:2,createdAt:'2026-10-01T00:00:00.000Z'},
  chef:{level:1,createdAt:'2026-10-02T00:00:00.000Z'}};
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',['owner',JSON.stringify(s)]);
 const guestList=await req('guest','GET',{},visits);
 assert.equal(guestList.code,200);
 assert.equal(guestList.body.readOnly,true);
 assert.equal(guestList.body.visitable.length,1);
 assert.equal(guestList.body.visitable[0].owner,'owner');
 const detail=await req('guest','GET',{},visits,{query:{owner:'owner'}});
 assert.equal(detail.code,200);
 assert.equal(detail.body.ownerName,'온실 주인');
 assert.deepEqual(detail.body.buildings.map(x=>x.site),[0,4]);
 for(const privateField of ['coins','state','stock','plots','reputation','profession','session']){
  assert.equal(JSON.stringify(detail.body).includes('"'+privateField+'":'),false,'Visitor must not learn '+privateField);
 }
 assert.equal((await req('guest','POST',{},visits)).code,405,'Visitor API has no write methods');
 assert.equal((await req('guest','GET',{},visits,{headers:{cookie:''}})).code,401);
 assert.equal((await req('guest','GET',{},visits,{query:{owner:'missing'}})).code,404);
 assert.equal((await place('guest','farmer',1)).code,403,'Guest cannot move someone else building');
 assert.equal((await place('owner','farmer',4)).code,409,'Cannot overlap owned building');
 assert.equal((await place('owner','hacker',5)).code,400,'No illegal role');
 assert.equal((await place('owner','farmer',-1)).code,400,'No out-of-bounds locations');
 assert.equal((await req('owner','POST',{action:'place',role:'farmer',site:1,requestId:randomUUID()},business,{headers:{origin:'https://evil.invalid'}})).code,403);
 const id=randomUUID();
 const parallel=await Promise.all(Array.from({length:5},()=>place('owner','farmer',1,id)));
 assert(parallel.every(r=>r.code===200),'Same UUID retries return one successful placement');
 assert.equal(parallel.filter(r=>!r.body.replayed).length,1,'Only first request mutates state');
 assert.equal((await getState('owner')).state.workshops.farmer.site,1);
 assert.equal(Number((await getState('owner')).version),1);
 assert.equal((await getState('owner')).state.coins,43210,'Free placement never mints or destroys gold');
 const replayDifferent=await place('owner','farmer',2,id);
 assert.equal(replayDifferent.code,409,'Same UUID cannot relocate to a second slot');
 // Four further moves exhaust the daily relocation quota.
 for(const slot of [2,3,0,1])assert.equal((await place('owner','farmer',slot)).code,200);
 assert.equal((await place('owner','farmer',2)).code,409,'Sixth relocation in same KST day must fail');
 const changed=await req('guest','GET',{},visits,{query:{owner:'owner'}});
 assert.equal(changed.body.buildings.find(b=>b.role==='farmer').site,1,'Visitor sees server-authoritative site');
 const row=await getState('owner');
 assert.equal(Number(row.version),5);
 assert.equal(row.state.stock.berry_box,9,'Placement never changes owner inventory');
 const checkpoints=await pool.query(`SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints
   WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,['owner']);
 assert.equal(validateCheckpointChain('owner',row,checkpoints.rows).ok,true,'v37 recovery snapshots chain across every move');
 const events=await pool.query("SELECT count(*)::int AS total FROM village_economy_v36_events WHERE user_key='owner' AND action='business_place'");
 assert.equal(events.rows[0].total,5,'Exactly one receipt per real move');
 // Corrupt wallet is detected and locked; no automatic repair or placement.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','98765'::jsonb) WHERE user_key='owner'");
 assert.equal((await place('owner','farmer',2)).code,409);
 assert.equal(Number((await getState('owner')).version),5);
 console.log('PASS v41 real PostgreSQL: public privacy, guest read-only, 5 UUID replay requests, site collision, KST relocation quota and checkpoint fail-closed');
}finally{
 flags.forEach((k,i)=>{if(originals[i]===undefined)delete process.env[k];else process.env[k]=originals[i]});
 await pool.end();
}
