// Real SQLite integration tests. Only in-memory Node SQLite is used;
// never create users or transactions on the public Cloudflare game.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {handleMarketV51} from './market-v51.js';
import {startingEconomy} from '../../secure-economy-v36.js';
const db=new DatabaseSync(':memory:');
db.exec(CORE_SQL);db.exec(ECONOMY_SQL);
const sql={
 exec(query,...params){
  const prepared=db.prepare(query),read=/^\s*(SELECT|WITH|PRAGMA)\b/i.test(query);
  const results=read?prepared.all(...params):(prepared.run(...params),[]);
  return {toArray(){return results},one(){return results[0]||null}};
 }
};
const storage={sql,transactionSync(fn){
 db.exec('BEGIN IMMEDIATE');
 try{const value=fn();db.exec('COMMIT');return value}
 catch(error){db.exec('ROLLBACK');throw error}
}};
const fakeDb={
 prepare(query){return {bind(...params){return {first:async()=>{
  const statement=db.prepare(query);
  return statement.get(...params)||null;
 }}}}}
};
const clock='2026-10-20T00:00:00.000Z';
const accounts=[
 {id:randomUUID(),username:'qa_market_seller',nick:'판매자',token:'1'.repeat(64)},
 {id:randomUUID(),username:'qa_market_buyer',nick:'구매자',token:'2'.repeat(64)}
];
for(const person of accounts){
 db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?)')
  .run(person.id,person.username,person.nick,'salt','not-a-real-password',clock);
 db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
  .run(createHash('sha256').update(person.token).digest('hex'),person.id,'2099-12-31T00:00:00.000Z',clock);
 const economy=startingEconomy();economy.stock={lettuce:person===accounts[0]?5:0};
 db.prepare('INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,?,?)')
  .run(person.id,JSON.stringify(economy),0,clock);
}
const url='https://qa.local/api/market-v38';
async function action(person,body,opts={}){
 const request=new Request(url,{
  method:body?'POST':'GET',
  headers:{cookie:person?'village_session='+person.token:'',
   ...(body?{'content-type':'application/json',origin:opts.origin||'https://qa.local'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const response=await handleMarketV51(request,storage,fakeDb);
 return {status:response.status,body:await response.json()};
}
const [seller,buyer]=accounts;
const snapshot=id=>JSON.parse(db.prepare('SELECT state FROM village_economy_v36_accounts WHERE user_key=?').get(id).state);
const ledger=id=>db.prepare('SELECT count(*) AS count FROM village_economy_v36_events WHERE user_key=?').get(id).count;
const listId=randomUUID();
let r=await action(null);
assert.equal(r.status,401);
r=await action(seller,{kind:'list',requestId:listId,payload:{item:'lettuce',quantity:2,unitPrice:34}},{origin:'https://attacker.invalid'});
assert.equal(r.status,403,'cross-site stock transfer must be denied');
r=await action(seller,{kind:'list',requestId:listId,payload:{item:'lettuce',quantity:2,unitPrice:34}});
assert.equal(r.status,200,JSON.stringify(r.body));
const listing=r.body.listingId;
assert.match(listing,/^[0-9a-f-]{36}$/);
assert.equal(snapshot(seller.id).stock.lettuce,3);
assert.equal(snapshot(seller.id).coins,1500-12);
assert.equal(ledger(seller.id),1);
r=await action(seller,{kind:'list',requestId:listId,payload:{item:'lettuce',quantity:2,unitPrice:34}});
assert.equal(r.status,200);
assert.equal(r.body.replayed,true);
assert.equal(snapshot(seller.id).stock.lettuce,3,'repeated list request must not escrow twice');
assert.equal(ledger(seller.id),1);
r=await action(seller,{kind:'list',requestId:listId,payload:{item:'lettuce',quantity:1,unitPrice:34}});
assert.equal(r.status,409,'reuse of idempotency ID with a changed payload denied');
r=await action(seller);
assert.equal(r.body.listings.length,1);
assert.equal(r.body.ownListings.length,1);
r=await action(seller,{kind:'buy',requestId:randomUUID(),payload:{listingId:listing}});
assert.equal(r.status,400,'seller cannot purchase their own goods');
const buyId=randomUUID();
r=await action(buyer,{kind:'buy',requestId:buyId,payload:{listingId:listing}});
assert.equal(r.status,200,JSON.stringify(r.body));
assert.equal(r.body.total,68);
assert.equal(r.body.tax,4);
assert.equal(r.body.sellerNet,64);
assert.equal(snapshot(buyer.id).coins,1432);
assert.equal(snapshot(buyer.id).stock.lettuce,2);
assert.equal(snapshot(seller.id).coins,1552);
assert.equal(ledger(seller.id),2);
assert.equal(ledger(buyer.id),1);
r=await action(buyer,{kind:'buy',requestId:buyId,payload:{listingId:listing}});
assert.equal(r.status,200);
assert.equal(r.body.replayed,true);
assert.equal(snapshot(buyer.id).coins,1432,'replay cannot pay again');
assert.equal(snapshot(seller.id).coins,1552,'replay cannot sell twice');
r=await action(buyer,{kind:'buy',requestId:randomUUID(),payload:{listingId:listing}});
assert.equal(r.status,409);
r=await action(seller,{kind:'cancel',requestId:randomUUID(),payload:{listingId:listing}});
assert.equal(r.status,409,'sold listing cannot be cancelled and duplicated into inventory');
const secondId=randomUUID();
r=await action(seller,{kind:'list',requestId:secondId,payload:{item:'lettuce',quantity:1,unitPrice:34}});
assert.equal(r.status,200);
const secondListing=r.body.listingId;
assert.equal(snapshot(seller.id).stock.lettuce,2);
const cancelId=randomUUID();
r=await action(seller,{kind:'cancel',requestId:cancelId,payload:{listingId:secondListing}});
assert.equal(r.status,200);
assert.equal(snapshot(seller.id).stock.lettuce,3,'escrow refund on cancellation');
r=await action(seller,{kind:'cancel',requestId:cancelId,payload:{listingId:secondListing}});
assert.equal(r.status,200);
assert.equal(r.body.replayed,true);
assert.equal(snapshot(seller.id).stock.lettuce,3,'cancellation cannot refund twice');
assert.equal(db.prepare('SELECT count(*) AS count FROM village_market_v38_listings WHERE status=?').get('active').count,0);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
const actorEconomy=db.prepare('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?').get(seller.id);
const last=db.prepare('SELECT state_hash,version FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 1').get(seller.id);
assert.equal(last.version,actorEconomy.version,'hash checkpoint stays in sync');
console.log('PASS v51 Cloudflare SQLite player market: escrow, cross-origin denial, 2-party atomic buy, tax, idempotency, cancellation and ledger checks');
