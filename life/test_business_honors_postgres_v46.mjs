// v46 PostgreSQL E2E: official v44 server sale -> verified achievement -> 7 concurrent
// honor equips. Disposable localhost DB only, NEVER Neon or live player profiles.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {startingEconomy} from './secure-economy-v36.js';
import {selectProfession} from './professions-v39.js';
import {makeResidentDemandHandler} from './api/resident-demand-v44.js';
import {makeBusinessHonorsHandler} from './api/business-honors-v46.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';

if(process.env.JUNJA_V46_DISPOSABLE_DB!=='true')throw Error('v46 QA refuses any persistent database');
const connectionString=process.env.JUNJA_V46_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(connectionString))
 throw Error('Only disposable localhost Postgres:5432 is supported');
const pool=new pg.Pool({connectionString,ssl:false,max:15});
const token={owner:'a'.repeat(64),guest:'b'.repeat(64)};
const prior44=process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;
const prior46=process.env.ENABLE_VILLAGE_HONORS_V46;
process.env.ENABLE_VILLAGE_NPC_DEMAND_V44='true';
process.env.ENABLE_VILLAGE_HONORS_V46='true';
const now=()=>new Date();
const saleApi=makeResidentDemandHandler({pool,now});
const awardApi=makeBusinessHonorsHandler({pool,now});
const response=()=>({code:0,data:null,setHeader(){},status(value){this.code=value;return this},json(value){this.data=value;return this}});
async function request(user='owner',method='GET',body={},api=awardApi,headers={}){
 const r=response();
 await api({method,body,headers:{host:'localhost:38846',origin:'http://localhost:38846',
  'content-type':'application/json','sec-fetch-site':'same-origin',
  cookie:'village_session='+token[user],...headers}},r);
 return r;
}
async function equip(user='owner',id='first_sale',requestId=randomUUID()){
 return request(user,'POST',{id,requestId});
}
async function account(key){return (await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0]}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const f of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+f,import.meta.url),'utf8'));
 for(const [key,nick] of [['owner','온실 장인'],['guest','이웃 주민']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,nick]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(token[key]).digest('hex'),key]);
 }
 const starting=startingEconomy();starting.coins=12000;
 starting.stock.berry_box=2;starting.workshops={farmer:{level:2}};
 const farmer=selectProfession(starting,'farmer',{},new Date()).next;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',
  ['owner',JSON.stringify(farmer)]);
 let mine=await request();
 assert.equal(mine.code,200);
 assert.equal(mine.data.honors.unlockedCount,0);
 assert.equal(mine.data.economy.daily.length,30);
 assert.equal(mine.data.economy.totals.net,0);
 assert.equal((await equip('owner','first_sale')).code,403,'Cannot claim honor before verified sale');
 assert.equal((await equip('guest','first_sale')).code,403,'Guest cannot claim owner sale');
 assert.equal((await request('owner','POST',{id:'first_sale',requestId:randomUUID()},
  awardApi,{origin:'https://other.example'})).code,403,'Prevent CSRF');
 assert.equal((await request('owner','POST',{id:'first_sale',requestId:randomUUID()},
  awardApi,{cookie:''})).code,401);
 // Real v44 authenticated sale produces legitimate receipt/stock loss/checkpoint.
 const sale=await request('owner','POST',{npcId:'tobi',requestId:randomUUID()},saleApi);
 assert.equal(sale.code,200,JSON.stringify(sale.data));
 const initialGold=sale.data.coins;
 mine=await request();
 assert.equal(mine.code,200);
 assert.equal(mine.data.audit.ok,true);
 assert.equal(mine.data.honors.unlockedCount,1);
 assert.equal(mine.data.honors.honors.find(x=>x.id==='first_sale').unlocked,true);
 assert.equal(mine.data.honors.honors.find(x=>x.id==='berry_supplier').unlocked,false);
 assert.equal(mine.data.economy.totals.sales,1);
 assert.equal(mine.data.economy.totals.net,sale.data.receipt.net);
 assert.equal(mine.data.economy.totals.tax,sale.data.receipt.tax);
 assert.equal(mine.data.economy.daily.at(-1).sales,1,'KST current day revenue');
 const id=randomUUID();
 const parallel=await Promise.all(Array.from({length:7},()=>equip('owner','first_sale',id)));
 assert(parallel.every(x=>x.code===200),'Seven concurrent title requests should return a successful replay');
 assert.equal(parallel.filter(x=>!x.data.replayed).length,1);
 let current=await account('owner');
 assert.equal(Number(current.version),2,'One sale + one title transaction only');
 assert.equal(current.state.coins,initialGold,'No gold minted or removed by cosmetic titles');
 assert.equal(current.state.stock.berry_box,1,'Titles never consume crops or inventory');
 assert.equal(current.state.businessHonorV46.equipped,'first_sale');
 assert.equal((await equip('owner','trusted_neighbor')).code,403,'Locked honor cannot be equipped via forged ID');
 assert.equal((await equip('owner','none',id)).code,409,'Same UUID used with different title denied');
 assert.equal((await equip('owner','first_sale')).code,409,'Already equipped cannot double-log');
 const guestRead=await request('guest');
 assert.equal(guestRead.code,200);
 assert.equal(guestRead.data.honors.unlockedCount,0,'Achievement progress is isolated per account');
 assert.equal(guestRead.data.economy.totals.net,0,'Private sales are never shared');
 const unequip=await equip('owner','none');
 assert.equal(unequip.code,200);
 current=await account('owner');
 assert.equal(current.state.businessHonorV46.equipped,null);
 assert.equal(current.state.coins,initialGold);
 assert.equal(Number(current.version),3);
 const events=await pool.query(`SELECT action,count(*)::int AS n FROM village_economy_v36_events
   WHERE user_key='owner' GROUP BY action`);
 const totals=Object.fromEntries(events.rows.map(row=>[row.action,row.n]));
 assert.deepEqual(totals,{npc_purchase:1,honor_equip:2});
 const cp=await pool.query(`SELECT version,state,previous_hash,state_hash,request_id
   FROM village_economy_v37_checkpoints WHERE user_key='owner' ORDER BY version DESC LIMIT 25`);
 assert.equal(validateCheckpointChain('owner',current,cp.rows).ok,true);
 // Corrupt account after legitimate transactions (CI DB ONLY). Must fail closed.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key='owner'");
 assert.equal((await equip('owner','first_sale')).code,409);
 assert.equal(Number((await account('owner')).version),3);
 console.log('PASS v46 real Postgres: v44 sale unlocks cosmetic honor; 7 parallel equip calls only once, no gold/stock writes, private 30d stats, SHA tamper stop');
}finally{
 if(prior44===undefined)delete process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;else process.env.ENABLE_VILLAGE_NPC_DEMAND_V44=prior44;
 if(prior46===undefined)delete process.env.ENABLE_VILLAGE_HONORS_V46;else process.env.ENABLE_VILLAGE_HONORS_V46=prior46;
 await pool.end();
}
