// Test the production career handler with local, in-memory SQLite only.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {handleProfessionsV51} from './professions-v51.js';
const db=new DatabaseSync(':memory:');
db.exec(CORE_SQL);db.exec(ECONOMY_SQL);
const user=randomUUID(),token='3'.repeat(64);
db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,created_at) VALUES (?,?,?,?,?,?)')
 .run(user,'qa_career','취업새싹','salt','fake_hash','2026-10-20T00:00:00Z');
db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
 .run(createHash('sha256').update(token).digest('hex'),user,'2099-12-31T00:00:00Z','2026-10-20T00:00:00Z');
const storage={
 sql:{exec(query,...params){
  const statement=db.prepare(query),read=/^\s*(SELECT|WITH|PRAGMA)\b/i.test(query);
  const result=read?statement.all(...params):(statement.run(...params),[]);
  return {toArray:()=>result,one:()=>result[0]||null};
 }},
 transactionSync(fn){
  db.exec('BEGIN IMMEDIATE');
  try{const result=fn();db.exec('COMMIT');return result}
  catch(e){db.exec('ROLLBACK');throw e}
 }
};
const readDb={prepare:query=>({bind:(...params)=>({first:async()=>db.prepare(query).get(...params)||null})})};
const base='https://qa.local/api/professions-v39';
async function perform(action,body=null,cookie=token,origin='https://qa.local'){
 const r=await handleProfessionsV51(new Request(base,{method:body?'POST':'GET',
  headers:{cookie:cookie?'village_session='+cookie:'',
   ...(body?{origin,'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})}),storage,readDb);
 return {status:r.status,body:await r.json()};
}
let r=await perform('get',null,'');
assert.equal(r.status,401);
r=await perform('get');
assert.equal(r.status,200);
assert.equal(r.body.coins,5000);
assert.equal(r.body.profession.active,null);
const licenseId=randomUUID();
r=await perform('post',{action:'register',role:'farmer',requestId:licenseId},token,'https://evil.example');
assert.equal(r.status,403);
r=await perform('post',{action:'register',role:'farmer',requestId:licenseId});
assert.equal(r.status,200,JSON.stringify(r.body));
assert.equal(r.body.coins,4750);
assert.equal(r.body.profession.active,'farmer');
const version=r.body.version;
assert.equal(version,1);
r=await perform('post',{action:'register',role:'farmer',requestId:licenseId});
assert.equal(r.status,200);
assert.equal(r.body.replayed,true);
assert.equal(r.body.coins,4750,'duplicate first license fee cannot be deducted again');
r=await perform('post',{action:'register',role:'chef',requestId:licenseId});
assert.equal(r.status,409,'request number reuse with different role blocked');
r=await perform('post',{action:'register',role:'chef',requestId:randomUUID()});
assert.equal(r.status,409,'cannot switch before seven-day career cooldown');
r=await perform('post',{action:'claim',requestId:randomUUID()});
assert.equal(r.status,409,'cannot earn daily pay without server-proven activity');
r=await perform('get');
assert.equal(r.body.version,1,'failed career actions must not modify version');
assert.equal(r.body.coins,4750);
assert.equal(r.body.profession.active,'farmer');
assert.equal(db.prepare('SELECT count(*) AS n FROM village_economy_v36_events WHERE user_key=?').get(user).n,1);
assert.equal(db.prepare('SELECT count(*) AS n FROM village_economy_v37_checkpoints WHERE user_key=?').get(user).n,2);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
console.log('PASS v51 career SQLite: login, register fee, idempotent license, 7d switch lock, no unproven daily payout');
