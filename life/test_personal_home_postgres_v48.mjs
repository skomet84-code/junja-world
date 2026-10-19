// v48: disposable local PostgreSQL E2E only. No Neon, Vercel or live profiles.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {startingEconomy} from './secure-economy-v36.js';
import {makeHomeHandler} from './api/personal-home-v48.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
if(process.env.JUNJA_V48_DISPOSABLE_DB!=='true')throw Error('Refusing non-disposable DB');
const connectionString=process.env.JUNJA_V48_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(connectionString))
 throw Error('Refusing production/remote DB');
const pool=new pg.Pool({connectionString,ssl:false,max:13});
const prior=process.env.ENABLE_VILLAGE_HOME_V48;process.env.ENABLE_VILLAGE_HOME_V48='true';
const tokens={owner:'a'.repeat(64),guest:'b'.repeat(64)};
const api=makeHomeHandler({pool});
const res=()=>({code:0,data:null,setHeader(){},status(n){this.code=n;return this},json(data){this.data=data;return this}});
async function request(user='owner',method='GET',body={},headers={}){
 const r=res();await api({method,body,headers:{
  host:'localhost:38848',origin:'http://localhost:38848','content-type':'application/json',
  'sec-fetch-site':'same-origin',cookie:'village_session='+tokens[user],...headers}},r);
 return r;
}
const post=(action,data={},requestId=randomUUID(),user='owner')=>request(user,'POST',{action,data,requestId});
const wallet=async key=>(await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const migration of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+migration,import.meta.url),'utf8'));
 for(const [key,nick] of [['owner','집주인'],['guest','방문자']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,nick]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(tokens[key]).digest('hex'),key]);
 }
 const original=startingEconomy();original.coins=250000;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',['owner',JSON.stringify(original)]);
 assert.equal((await request()).data.home.house.level,1);
 assert.equal((await request()).data.home.house.placed.length,1,'Initial gift chair exists only in isolated trial state projection');
 assert.equal((await post('buy',{item:'crystal_lamp',price:0,sales:999,craft:999})).code,409,
  'Fake client-owned rare sale proof cannot bypass real DB receipts');
 assert.equal((await post('place',{slot:4,item:'royal_piano'})).code,409,
  'Cannot position an item without server ownership');
 assert.equal((await post('upgrade',{},randomUUID(),'guest')).code,409,
  'Guest cannot spend another wallet');
 assert.equal((await request('owner','POST',{action:'buy',data:{item:'leaf_plant'},requestId:randomUUID()},
  {origin:'https://other-origin.example'})).code,403);
 assert.equal((await request('owner','POST',{action:'buy',data:{item:'leaf_plant'},requestId:randomUUID()},
  {cookie:''})).code,401);
 const id=randomUUID();
 const batch=await Promise.all(Array.from({length:7},()=>post('buy',{item:'leaf_plant'},id)));
 assert(batch.every(x=>x.code===200),JSON.stringify(batch.map(x=>({code:x.code,error:x.data?.error}))));
 assert.equal(batch.filter(x=>!x.data.replayed).length,1,'One physical plant bought despite seven concurrent requests');
 let current=await wallet('owner');assert.equal(current.state.coins,249550);
 assert.equal(current.state.houseV48.owned.leaf_plant,1);
 assert.equal(Number(current.version),1);
 assert.equal((await post('place',{slot:4,item:'leaf_plant',turn:1})).code,200);
 assert.equal((await post('rotate',{slot:4})).code,200);
 current=await wallet('owner');assert.equal(current.state.houseV48.placed.find(x=>x.slot===4).turn,2);
 assert.equal((await post('remove',{slot:4})).code,200);
 assert.equal((await wallet('owner')).state.houseV48.owned.leaf_plant,1);
 const improved=await post('upgrade');
 assert.equal(improved.code,200);
 current=await wallet('owner');assert.equal(current.state.houseV48.level,2);
 assert.equal(current.state.coins,241550);
 assert.equal((await post('buy',{item:'crystal_lamp',sales:999,price:1})).code,409);
 // ONLY in disposable DB: populate 3 verified NPC receipt fixtures to prove server
 // SELECT counts owner-specific activities, never request-body spoofed statistics.
 for(let i=0;i<3;i++)
  await pool.query(`INSERT INTO village_economy_v36_events
    (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
    VALUES('owner',$1,$2,'npc_purchase',0,$3,$4::jsonb)`,
   [randomUUID(),createHash('sha256').update('fixture-'+i).digest('hex'),current.state.coins,
    JSON.stringify({npcId:'tobi',role:'farmer',day:'2026-10-'+String(16+i)})]);
 const verified=(await request()).data.home;
 assert.equal(verified.verified.sales,3);
 assert.equal(verified.catalog.crystal_lamp.unlocked,true);
 const rare=await post('buy',{item:'crystal_lamp',price:0,sales:999999});
 assert.equal(rare.code,200,JSON.stringify(rare.data));
 assert.equal(rare.data.receipt.delta,-9800);
 assert.equal(rare.data.home.house.owned.crystal_lamp,1);
 assert.equal((await post('buy',{item:'crystal_lamp'})).code,409,'Rare one-per-account limit');
 const second=await post('buy',{item:'oak_chair'},id);
 assert.equal(second.code,409,'Cannot reuse an already-successful UUID for another purchase');
 const guest=await request('guest');
 assert.equal(guest.code,200);
 assert.equal(guest.data.home.house.level,1);
 assert.equal(guest.data.home.coins,1500);
 assert.equal(guest.data.home.verified.sales,0,'No cross-account achievements');
 current=await wallet('owner');
 const history=(await pool.query("SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key='owner' ORDER BY version DESC LIMIT 25")).rows;
 assert.equal(validateCheckpointChain('owner',current,history).ok,true,'No missing SHA recovery checkpoint');
 const before=Number(current.version);
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key='owner'");
 assert.equal((await post('buy',{item:'tea_table'})).code,409,'Corrupted wallet MUST not settle furniture sale');
 assert.equal(Number((await wallet('owner')).version),before);
 const total=await pool.query("SELECT count(*)::int AS c FROM village_economy_v36_events WHERE user_key='owner' AND action='home_buy'");
 assert.equal(total.rows[0].c,2);
 console.log('PASS v48 real Postgres: isolated home, true gold sinks, 7 parallel idempotent purchases, 3 verified receipts unlock rare, 3D placement/turn/removal, guests and SHA tamper stop');
}finally{
 if(prior===undefined)delete process.env.ENABLE_VILLAGE_HOME_V48;else process.env.ENABLE_VILLAGE_HOME_V48=prior;
 await pool.end();
}
