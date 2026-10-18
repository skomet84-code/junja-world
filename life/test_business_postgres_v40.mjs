// v40 live PostgreSQL proof on a DISPOSABLE LOCAL DB only (never Neon/production).
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {makeBusinessHandler} from './api/business-v40.js';
import {makePlayerMarketHandler} from './api/market-v38.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
import {startingEconomy} from './secure-economy-v36.js';
import {selectProfession} from './professions-v39.js';

if(process.env.JUNJA_V40_DISPOSABLE_DB!=='true')throw Error('Refusing production or persistent DB');
const url=process.env.JUNJA_V40_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(url))
 throw Error('Disposable test must point to localhost:5432, never Neon');
const pool=new pg.Pool({connectionString:url,ssl:false,max:12});
const tokens={farmer:'a'.repeat(64),buyer:'b'.repeat(64)};
const originalFlag=process.env.ENABLE_VILLAGE_BUSINESS_V40;
const oldMarketFlag=process.env.ENABLE_VILLAGE_MARKET_V38;
process.env.ENABLE_VILLAGE_BUSINESS_V40='true';process.env.ENABLE_VILLAGE_MARKET_V38='true';
const business=makeBusinessHandler({pool}),market=makePlayerMarketHandler({pool});
function response(){return {code:0,data:null,setHeader(){},status(n){this.code=n;return this},json(d){this.data=d;return this}}}
async function request(user,method,body={},api=business,overrides={}){
 const r=response();await api({method,body,headers:{host:'localhost:38840',origin:'http://localhost:38840',
 'sec-fetch-site':'same-origin','content-type':'application/json',cookie:'village_session='+tokens[user],...overrides}},r);return r;
}
async function biz(user,action,role='farmer',requestId=randomUUID()){return request(user,'POST',{action,role,requestId})}
async function trade(user,kind,payload,requestId=randomUUID()){return request(user,'POST',{kind,payload,requestId},market)}
async function account(key){
 const q=await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key]);return q.rows[0];
}
async function audit(key){
 const a=await account(key);const rows=await pool.query('SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25',[key]);
 assert.equal(validateCheckpointChain(key,a,rows.rows).ok,true);
}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const file of ['036_secure_economy.sql','037_checkpoint_chain.sql','038_player_market.sql'])
  await pool.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 for(const key of ['farmer','buyer']){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,key==='farmer'?'온실 전문가':'구매 손님']);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(tokens[key]).digest('hex'),key]);
 }
 const state=startingEconomy();state.coins=15000;state.stock.berry=12;state.stock.apple=4;state.stock.wheat=5;state.stock.carrot=4;
 const t=new Date(Date.now()-3600_000);
 const joined=selectProfession(state,'farmer',{},t).next;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',['farmer',JSON.stringify(joined)]);
 assert.equal((await biz('farmer','build')).code,409,'Cannot build without actual career proof');
 assert.equal((await biz('buyer','build')).code,409,'Cannot build without matching job');
 assert.equal((await request('farmer','POST',{action:'produce',role:'farmer',requestId:randomUUID()},business,
  {origin:'https://attacker.example'})).code,403);
 // CI-only fixtures: insert 10 already-verified harvest receipt rows into local DB. Client can never submit this count.
 for(let i=0;i<10;i++){
  await pool.query(`INSERT INTO village_economy_v36_events
   (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
   VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
   ['farmer',randomUUID(),'a'.repeat(64),'harvest',0,joined.coins,JSON.stringify({action:'harvest',at:new Date().toISOString()})]);
 }
 const initial=await request('farmer','GET');
 assert.equal(initial.code,200);
 assert.equal(initial.data.business.rank.tier,2);
 const buildId=randomUUID();
 const built=await Promise.all(Array.from({length:5},()=>biz('farmer','build','farmer',buildId)));
 assert(built.every(r=>r.code===200),'All retried build requests should receive the committed result');
 assert.equal(built.filter(r=>!r.data.replayed).length,1);
 let stateAfter=await account('farmer');
 assert.equal(stateAfter.state.workshops.farmer.level,1);
 assert.equal(Number(stateAfter.version),1);
 assert.equal((await biz('farmer','upgrade')).code,409,'Upgrading requires a higher rank');
 assert.equal((await biz('farmer','build')).code,409,'Duplicating building via another UUID rejected');
 const productionId=randomUUID();
 const produced=await Promise.all(Array.from({length:6},()=>biz('farmer','produce','farmer',productionId)));
 assert(produced.every(r=>r.code===200),'All production retries should resolve once');
 assert.equal(produced.filter(r=>!r.data.replayed).length,1);
 stateAfter=await account('farmer');
 assert.equal(stateAfter.state.stock.berry,9);
 assert.equal(stateAfter.state.stock.berry_box,1);
 assert.equal(Number(stateAfter.version),2);
 await audit('farmer');
 const ranking=await request('buyer','GET');
 assert.equal(ranking.data.rankings.board.farmer.length,1);
 assert.equal(ranking.data.rankings.board.farmer[0].name,'온실 전문가');
 assert.equal(ranking.data.rankings.board.farmer[0].total,1);
 assert.equal((await biz('farmer','produce','chef')).code,409);
 const shop=await trade('farmer','list',{item:'berry_box',quantity:1,unitPrice:1750});
 assert.equal(shop.code,200,JSON.stringify(shop.data));
 assert.equal((await account('farmer')).state.stock.berry_box,0,'Escrow removes crafted item exactly once');
 const purchase=await trade('buyer','buy',{listingId:shop.data.listingId});
 assert.equal(purchase.code,200,JSON.stringify(purchase.data));
 assert.equal((await account('buyer')).state.stock.berry_box,1);
 assert.equal((await account('farmer')).state.stock.berry_box,0);
 assert.equal((await trade('buyer','buy',{listingId:shop.data.listingId})).code,409);
 await audit('farmer');await audit('buyer');
 const count=await pool.query(`SELECT count(*)::int AS n FROM village_economy_v36_events
 WHERE user_key='farmer' AND action='business_produce'`);
 assert.equal(count.rows[0].n,1,'Exactly one server production event');
 // Deliberate account corruption is allowed only inside disposable CI DB.
 const prev=await account('farmer');
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key='farmer'");
 const blocked=await biz('farmer','produce');assert.equal(blocked.code,409);
 assert.equal(Number((await account('farmer')).version),Number(prev.version),'Corrupt state cannot create new checkpoint');
 console.log('PASS v40 real PostgreSQL: five build retries, six production retries, actual jobs, weekly board, escrow market purchase and asset-integrity stop');
}finally{
 if(originalFlag===undefined)delete process.env.ENABLE_VILLAGE_BUSINESS_V40;else process.env.ENABLE_VILLAGE_BUSINESS_V40=originalFlag;
 if(oldMarketFlag===undefined)delete process.env.ENABLE_VILLAGE_MARKET_V38;else process.env.ENABLE_VILLAGE_MARKET_V38=oldMarketFlag;
 await pool.end();
}
