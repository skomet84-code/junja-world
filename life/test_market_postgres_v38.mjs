// Disposable CI PostgreSQL proof for v38, never connects to Neon or production.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {makePlayerMarketHandler} from './api/market-v38.js';
import {validateCheckpointChain} from './economy-integrity-v37.js';
import {startingEconomy} from './secure-economy-v36.js';

if(process.env.JUNJA_V38_DISPOSABLE_DB!=='true')throw Error('Only disposable CI test databases are permitted');
const url=process.env.JUNJA_V38_TEST_DATABASE_URL||'';
if(!/^postgres(ql)?:\/\/[^\s]+@(?:127\.0\.0\.1|localhost):5432\//.test(url))
 throw Error('Only local disposable PostgreSQL DSN is permitted');
const pool=new pg.Pool({connectionString:url,ssl:false,max:12});
const tokens={seller:'c'.repeat(64),buyer1:'d'.repeat(64),buyer2:'e'.repeat(64)};
const old=process.env.ENABLE_VILLAGE_MARKET_V38;
process.env.ENABLE_VILLAGE_MARKET_V38='true';
const handler=makePlayerMarketHandler({pool});
function res(){return {code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(o){this.body=o;return this}}}
async function call(who,method,body={},headers={}){
 const r=res();
 await handler({method,headers:{cookie:'village_session='+tokens[who],host:'localhost:38838',origin:'http://localhost:38838',
  'content-type':'application/json','sec-fetch-site':'same-origin',...headers},body},r);
 return r;
}
const doAction=(who,kind,payload,requestId=randomUUID())=>call(who,'POST',{kind,payload,requestId});
async function fetchAccount(who){
 const q=await pool.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[who]);
 return q.rows[0];
}
async function verifyAudit(who){
 const acc=await fetchAccount(who);
 const q=await pool.query('SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25',[who]);
 assert.equal(validateCheckpointChain(who,acc,q.rows).ok,true,'Account must match immutable v37 checkpoint history');
}
try{
 await pool.query('CREATE TABLE village_users(id TEXT PRIMARY KEY,nickname TEXT NOT NULL)');
 await pool.query('CREATE TABLE village_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES village_users(id),expires_at TIMESTAMPTZ NOT NULL)');
 for(const file of ['036_secure_economy.sql','037_checkpoint_chain.sql','038_player_market.sql'])
  await pool.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 for(const [key,nick] of [['seller','판매왕'],['buyer1','바이어1'],['buyer2','바이어2']]){
  await pool.query('INSERT INTO village_users(id,nickname) VALUES($1,$2)',[key,nick]);
  await pool.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
   [createHash('sha256').update(tokens[key]).digest('hex'),key]);
 }
 const trial=startingEconomy();trial.stock.lettuce=10;trial.stock.berry_jam=2;
 await pool.query('INSERT INTO village_economy_v36_accounts(user_key,state) VALUES($1,$2::jsonb)',['seller',JSON.stringify(trial)]);
 // Unauthorized calls cannot change any stock.
 assert.equal((await call('seller','POST',{kind:'list',requestId:randomUUID(),payload:{item:'lettuce',unitPrice:34,quantity:2}},{origin:'https://attacker.example'})).code,403);
 const invalid=await doAction('seller','list',{item:'lettuce',unitPrice:99999,quantity:2});
 assert.equal(invalid.code,400);
 let initial=await call('buyer1','GET');assert.equal(initial.code,200);assert.equal(initial.body.listings.length,0);
 const sellerId=randomUUID(),listPayload={item:'lettuce',unitPrice:34,quantity:2};
 const created=await doAction('seller','list',listPayload,sellerId);
 assert.equal(created.code,200,JSON.stringify(created.body));
 const listingId=created.body.listingId;
 assert.equal((await fetchAccount('seller')).state.stock.lettuce,8,'Stock reserved exactly once');
 assert.equal((await fetchAccount('seller')).state.coins,1488,'Listing fee removed');
 const repeated=await doAction('seller','list',listPayload,sellerId);
 assert.equal(repeated.code,200);assert.equal(repeated.body.replayed,true);
 assert.equal((await fetchAccount('seller')).state.stock.lettuce,8);
 assert.equal((await doAction('seller','list',{...listPayload,quantity:1},sellerId)).code,409,'Same request ID cannot change goods');
 assert.equal((await doAction('seller','buy',{listingId})).code,400,'Self-buy forbidden');
 const buyerId=randomUUID();
 const concurrent=await Promise.all(Array.from({length:5},()=>doAction('buyer1','buy',{listingId},buyerId)));
 assert(concurrent.every(x=>x.code===200),'Repeated concurrent buyer request must always resolve to same result');
 assert.equal(concurrent.filter(x=>!x.body.replayed).length,1,'Only one purchase modifies DB');
 assert.equal((await doAction('buyer2','buy',{listingId})).code,409,'Already purchased item unavailable');
 let seller=await fetchAccount('seller'),buyer=await fetchAccount('buyer1');
 assert.equal(seller.state.coins,1552,'Seller receives gross 68 minus 4 tax, after 12 listing fee');
 assert.equal(buyer.state.coins,1432);assert.equal(buyer.state.stock.lettuce,2);
 assert.equal(seller.state.stock.lettuce,8);
 assert.equal((await pool.query("SELECT count(*)::int AS count FROM village_market_v38_requests WHERE actor_key='buyer1'")).rows[0].count,1);
 await verifyAudit('seller');await verifyAudit('buyer1');
 // Cancellation returns escrow but does not refund the listing fee.
 const cancellation=await doAction('seller','list',{item:'berry_jam',quantity:1,unitPrice:2200});
 assert.equal(cancellation.code,200);
 const cancelled=await doAction('seller','cancel',{listingId:cancellation.body.listingId});
 assert.equal(cancelled.code,200);
 assert.equal((await fetchAccount('seller')).state.stock.berry_jam,2);
 assert.equal((await doAction('buyer1','buy',{listingId:cancellation.body.listingId})).code,409);
 assert.equal((await doAction('buyer2','cancel',{listingId:cancellation.body.listingId})).code,403);
 const active=await doAction('seller','list',{item:'lettuce',quantity:1,unitPrice:34});
 assert.equal(active.code,200);
 const races=await Promise.all([
  doAction('buyer1','buy',{listingId:active.body.listingId}),
  doAction('buyer2','buy',{listingId:active.body.listingId})
 ]);
 assert.deepEqual(races.map(x=>x.code).sort(),[200,409],'Distinct buyers cannot both acquire one listing');
 const row=await pool.query('SELECT status,buyer_key FROM village_market_v38_listings WHERE id=$1',[active.body.listingId]);
 assert.equal(row.rows[0].status,'sold');
 assert(['buyer1','buyer2'].includes(row.rows[0].buyer_key));
 await verifyAudit('seller');await verifyAudit('buyer1');if((await fetchAccount('buyer2'))?.version>0)await verifyAudit('buyer2');
 // Tampering with current seller balance must freeze listing creation and keep escrow untouched.
 const priorState=await fetchAccount('seller');
 await pool.query("UPDATE village_economy_v36_accounts SET state=jsonb_set(state,'{coins}','999999'::jsonb) WHERE user_key=$1",['seller']);
 const blocked=await doAction('seller','list',{item:'lettuce',quantity:1,unitPrice:34});
 assert.equal(blocked.code,409);
 assert.equal((await fetchAccount('seller')).version,priorState.version);
 assert.equal((await fetchAccount('seller')).state.stock.lettuce,priorState.state.stock.lettuce);
 const post=await pool.query("SELECT count(*)::int AS n FROM village_market_v38_listings WHERE seller_key='seller'");
 assert.equal(post.rows[0].n,3,'Corrupted account must not list additional items');
 console.log('PASS v38 real PostgreSQL: escrow, refund, fee, tax, 5 retries, 2-buyer race, own-sale block, immutable audit, corrupt account freeze');
}finally{
 if(old===undefined)delete process.env.ENABLE_VILLAGE_MARKET_V38;else process.env.ENABLE_VILLAGE_MARKET_V38=old;
 await pool.end();
}
