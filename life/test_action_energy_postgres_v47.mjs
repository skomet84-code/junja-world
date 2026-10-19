import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {startingEconomy} from './secure-economy-v36.js';
import {selectProfession} from './professions-v39.js';
import {makeEconomyHandler} from './api/economy-v36.js';
import {makeBusinessHandler} from './api/business-v40.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
if(process.env.JUNJA_V47_DISPOSABLE_DB!=='true')throw Error('Only disposable test DB is allowed');
const connectionString=process.env.JUNJA_V47_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(connectionString))
 throw Error('Refusing Neon/production; only local postgres:5432');
const pool=new pg.Pool({connectionString,ssl:false,max:13});
const old=Object.fromEntries(['ENABLE_VILLAGE_ENERGY_V47','ENABLE_VILLAGE_ECONOMY_V36','ENABLE_VILLAGE_BUSINESS_V40']
 .map(k=>[k,process.env[k]]));
for(const k of Object.keys(old))process.env[k]='true';
const token='a'.repeat(64),time=new Date();
const farm=makeEconomyHandler({pool,now:()=>time});
const business=makeBusinessHandler({pool,now:()=>time});
function res(){return{code:0,data:null,setHeader(){},status(n){this.code=n;return this},json(b){this.data=b;return this}}}
async function query(api,method='GET',body={},headers={}){
 const result=res();
 await api({method,body,headers:{host:'localhost:38847',origin:'http://localhost:38847',
  'sec-fetch-site':'same-origin','content-type':'application/json',
  cookie:'village_session='+token,...headers}},result);return result;
}
const purchase=(requestId=randomUUID())=>query(farm,'POST',{action:'energy_buy',payload:{},requestId});
const action=(name,payload={},requestId=randomUUID())=>query(farm,'POST',{action:name,payload,requestId});
const account=async()=>(await pool.query("SELECT state,version FROM village_economy_v36_accounts WHERE user_key='owner'")).rows[0];
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const path of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+path,import.meta.url),'utf8'));
 await pool.query("INSERT INTO village_users VALUES('owner','행동력 테스트 주민')");
 await pool.query("INSERT INTO village_sessions VALUES($1,'owner',now()+interval '1 day')",
  [createHash('sha256').update(token).digest('hex')]);
 const raw=startingEconomy();raw.coins=8200;raw.stock.berry=3;
 raw.workshops={farmer:{level:1,createdAt:time.toISOString()}};
 raw.actionEnergyV47={current:3,at:time.getTime(),packsDay:'',packs:0};
 const state=selectProfession(raw,'farmer',{},time).next;
 await pool.query("INSERT INTO village_economy_v36_accounts(user_key,state) VALUES('owner',$1::jsonb)",[JSON.stringify(state)]);
 assert.equal((await query(farm)).data.energy.current,3);
 assert.equal((await action('plant',{index:0,crop:'lettuce'})).code,200);
 let row=await account();assert.equal(row.state.actionEnergyV47.current,1);
 assert.equal(row.state.plots[0].crop,'lettuce');
 assert.equal((await action('craft',{recipe:'berry_jam'})).code,409,'Not enough energy for 6 craft');
 row=await account();assert.equal(row.state.actionEnergyV47.current,1,'Failed craft must not charge anything');
 const id=randomUUID();
 const concurrent=await Promise.all(Array.from({length:7},()=>purchase(id)));
 assert(concurrent.every(x=>x.code===200),'All exact UUID duplicates replay one successful transaction');
 assert.equal(concurrent.filter(x=>!x.data.replayed).length,1);
 row=await account();assert.equal(row.state.actionEnergyV47.current,26);
 assert.equal(row.state.actionEnergyV47.packs,1);
 assert.equal(row.state.coins,8200-20-1200);
 const manufactured=await query(business,'POST',{action:'produce',role:'farmer',requestId:randomUUID()});
 assert.equal(manufactured.code,200,JSON.stringify(manufactured.data));
 row=await account();assert.equal(row.state.actionEnergyV47.current,18,'Professional craft deducts 8 energy');
 assert.equal(row.state.stock.berry_box,1);
 assert.equal(row.state.stock.berry,0);
 assert.equal((await action('plant',{index:1,crop:'lettuce'})).code,200,'Second trial planting consumes 2 more energy');
 // Verify arbitrary client-supplied fake price is ignored by server.
 const second=await query(farm,'POST',{action:'energy_buy',payload:{packSize:9999,price:0},requestId:randomUUID()});
 assert.equal(second.code,200);
 row=await account();assert.equal(row.state.coins,8200-40-1200-130-1200);
 assert.equal(row.state.actionEnergyV47.packs,2);
 assert.equal(row.state.actionEnergyV47.current,41);
 const third=await purchase();assert.equal(third.code,200);
 assert.equal((await purchase()).code,409,'Fourth refill must fail daily quota');
 const status=await query(farm);assert.equal(status.code,200);
 assert.equal(status.data.energy.packsLeft,0);
 row=await account();
 const chain=(await pool.query("SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key='owner' ORDER BY version DESC LIMIT 25")).rows;
 assert.equal(validateCheckpointChain('owner',row,chain).ok,true);
 const log=(await pool.query("SELECT action,count(*)::int AS n FROM village_economy_v36_events WHERE user_key='owner' GROUP BY action")).rows;
 assert.equal(log.find(x=>x.action==='energy_buy').n,3);
 assert.equal((await query(farm,'POST',{action:'energy_buy',requestId:randomUUID()},{origin:'https://evil.example'})).code,403);
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key='owner'");
 assert.equal((await action('plant',{index:1,crop:'lettuce'})).code,409,'Fail closed on tampered wallet');
 console.log('PASS v47 disposable PostgreSQL: atomic farming + manufacturing energy, seven concurrent one-time refills, 3/day quota, price forgery rejection and v37 chain');
}finally{
 for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value}
 await pool.end();
}
