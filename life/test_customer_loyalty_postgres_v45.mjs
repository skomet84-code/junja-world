// v45 full system E2E on disposable local PostgreSQL ONLY.
// Three ACTUAL v44 day-separated purchases create loyalty; v45 VIP order must use them.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {startingEconomy} from './secure-economy-v36.js';
import {selectProfession} from './professions-v39.js';
import {makeResidentDemandHandler} from './api/resident-demand-v44.js';
import {makeLoyaltyHandler} from './api/customer-loyalty-v45.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
import {vipQuote} from './customer-loyalty-v45.js';

if(process.env.JUNJA_V45_DISPOSABLE_DB!=='true')throw Error('v45 DB test refuses persistent or production databases');
const url=process.env.JUNJA_V45_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:localhost|127\.0\.0\.1):5432\//.test(url))
 throw Error('v45 transaction tests MUST use disposable localhost:5432 Postgres');
const pool=new pg.Pool({connectionString:url,ssl:false,max:13});
const tokens={owner:'a'.repeat(64),guest:'b'.repeat(64)};
const original44=process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;
const original45=process.env.ENABLE_VILLAGE_LOYALTY_V45;
process.env.ENABLE_VILLAGE_NPC_DEMAND_V44='true';
process.env.ENABLE_VILLAGE_LOYALTY_V45='true';
let clock=new Date('2026-10-16T06:00:00Z'); // 15:00 KST (Thursday)
const daily=makeResidentDemandHandler({pool,now:()=>clock});
const loyalty=makeLoyaltyHandler({pool,now:()=>clock});
const response=()=>({code:0,data:null,setHeader(){},status(n){this.code=n;return this},json(body){this.data=body;return this}});
async function request(user='owner',method='GET',body={},api=loyalty,headers={}){
 const res=response();
 await api({method,body,headers:{host:'localhost:38845',origin:'http://localhost:38845',
  'sec-fetch-site':'same-origin','content-type':'application/json',
  cookie:'village_session='+tokens[user],...headers}},res);
 return res;
}
async function vip(user='owner',npcId='tobi',requestId=randomUUID()){
 return request(user,'POST',{npcId,requestId},loyalty);
}
async function regular(user='owner',npcId='tobi',requestId=randomUUID()){
 return request(user,'POST',{npcId,requestId},daily);
}
async function account(key){return (await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0]}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const f of ['036_secure_economy.sql','037_checkpoint_chain.sql'])
  await pool.query(await readFile(new URL('./migrations/'+f,import.meta.url),'utf8'));
 for(const [user,nick] of [['owner','온실 장인'],['guest','이웃 주민']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[user,nick]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(tokens[user]).digest('hex'),user]);
 }
 const ownerState=startingEconomy();
 ownerState.coins=5000;ownerState.stock.berry_box=5;
 ownerState.workshops={farmer:{level:2,createdAt:clock.toISOString()}};
 const farmer=selectProfession(ownerState,'farmer',{},clock).next;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',
  ['owner',JSON.stringify(farmer)]);
 assert.equal((await vip()).code,409,'VIP must not unlock without three confirmed historic purchase days');
 const targetDays=['2026-10-16T06:00:00Z','2026-10-17T06:00:00Z','2026-10-18T06:00:00Z'];
 for(const [i,date] of targetDays.entries()){
  clock=new Date(date);
  const sale=await regular('owner','tobi');
  assert.equal(sale.code,200,JSON.stringify({date,error:sale.data?.error}));
  const current=await request();
  assert.equal(current.code,200);
  assert.equal(current.data.loyalty.customers.find(c=>c.npcId==='tobi').days,i+1);
 }
 let state=await account('owner');
 assert.equal(Number(state.version),3);
 assert.equal(state.state.stock.berry_box,2,'Three real customer visits consume exactly 3 items');
 assert.equal((await request()).data.loyalty.customers.find(c=>c.npcId==='tobi').canAccept,true);
 assert.equal((await vip('guest')).code,409,'Different resident cannot borrow another resident loyalty count');
 assert.equal((await vip('owner','rina')).code,409,'Only matching NPC with three history dates can unlock');
 assert.equal((await request('owner','POST',{npcId:'tobi',requestId:randomUUID()},loyalty,
  {origin:'https://attacker.example'})).code,403);
 assert.equal((await request('owner','POST',{npcId:'tobi',requestId:randomUUID()},loyalty,{cookie:''})).code,401);
 // New week (Mon 15:00 KST). 7 concurrent requests MUST settle exactly one VIP order.
 clock=new Date('2026-10-19T06:00:00Z');
 const quote=vipQuote('tobi',clock);
 const id=randomUUID();
 const concurrent=await Promise.all(Array.from({length:7},()=>vip('owner','tobi',id)));
 assert(concurrent.every(x=>x.code===200),
  'Concurrent retries should return same successful VIP receipt: '+JSON.stringify(concurrent.map(x=>({code:x.code,reason:x.data?.error}))));
 assert.equal(concurrent.filter(x=>!x.data.replayed).length,1);
 state=await account('owner');
 assert.equal(state.state.stock.berry_box,0,'Only two VIP stock units consumed, once');
 assert.equal(Number(state.version),4);
 assert.equal(state.state.vipOrders.npcId,'tobi');
 assert.equal(state.state.vipOrders.weekStart,quote.weekStart);
 assert.equal(concurrent[0].data.receipt.net,quote.net);
 assert.equal(concurrent[0].data.receipt.gross-quote.tax-quote.fee,quote.net);
 assert.equal((await vip('owner','tobi',randomUUID())).code,409,'Additional weekly VIP order prohibited');
 assert.equal((await vip('owner','rina',id)).code,409,'Reused UUID cannot represent new action');
 const events=await pool.query(`SELECT action,count(*)::int AS total FROM village_economy_v36_events
   WHERE user_key='owner' GROUP BY action`);
 const counts=Object.fromEntries(events.rows.map(x=>[x.action,x.total]));
 assert.equal(counts.npc_purchase,3);
 assert.equal(counts.npc_vip_purchase,1);
 let board=await request();
 assert.equal(board.code,200);
 assert.equal(board.data.loyalty.customers.find(c=>c.npcId==='tobi').tier,'단골');
 assert.equal(board.data.loyalty.weeklyUsed,true);
 assert.equal(board.data.mine.sales,1,'Only new-week VIP counted for owner');
 assert.equal(board.data.mine.net,quote.net);
 assert.equal(board.data.rankings.top[0].name,'온실 장인');
 assert.equal(board.data.rankings.top[0].net,quote.net);
 assert.equal(board.data.audit.ok,true);
 const checkpoints=(await pool.query(`SELECT version,state,previous_hash,state_hash,request_id
  FROM village_economy_v37_checkpoints WHERE user_key='owner' ORDER BY version DESC LIMIT 25`)).rows;
 assert.equal(validateCheckpointChain('owner',state,checkpoints).ok,true);
 // A second resident can participate in same-week leaderboard without access to first account.
 const visitor=startingEconomy();visitor.stock.berry_box=1;visitor.workshops={farmer:{level:1}};
 const other=selectProfession(visitor,'farmer',{},clock).next;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',['guest',JSON.stringify(other)]);
 assert.equal((await regular('guest','tobi')).code,200);
 board=await request();
 assert.equal(board.data.rankings.top.length,2);
 assert.equal(board.data.rankings.top[0].rank,1);
 assert(board.data.rankings.top.every(c=>!Object.hasOwn(c,'user_key')),'Do not publish user identity or private wallet');
 assert.equal(board.data.mine.sales,1,'Other player does not modify owner week stats');
 // Deliberate corruption inside disposable test only; should lock further monetization.
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key='owner'");
 assert.equal((await vip('owner','tobi',randomUUID())).code,409);
 assert.equal(Number((await account('owner')).version),4);
 console.log('PASS v45 real Postgres: actual v44 3-day relationship, VIP 7 parallel 1 payout, 2 stocks, tax/fee, weekly scoreboard two users, account tamper gate');
}finally{
 if(original44===undefined)delete process.env.ENABLE_VILLAGE_NPC_DEMAND_V44;else process.env.ENABLE_VILLAGE_NPC_DEMAND_V44=original44;
 if(original45===undefined)delete process.env.ENABLE_VILLAGE_LOYALTY_V45;else process.env.ENABLE_VILLAGE_LOYALTY_V45=original45;
 await pool.end();
}
