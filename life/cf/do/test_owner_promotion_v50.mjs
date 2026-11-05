// Audit-only deterministic safety tests for the explicitly approved
// one-time skomet account promotion, never writes to a live game or host.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {CORE_SQL,ECONOMY_SQL} from './schema.js';
import {ensureOwnerPromotion} from './owner-promotion.js';
const beforeId='12121212-3434-5656-7878-909090909090';
const now='2026-10-20T05:00:00.000Z';
function makeDb(rows=[]){
 const db=new DatabaseSync(':memory:');
 db.exec(CORE_SQL);
 db.exec(ECONOMY_SQL);
 for(const [id,username,nickname,role] of rows)
  db.prepare('INSERT INTO village_users(id,username,nickname,role,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?,?)')
   .run(id,username,nickname,role,'00112233445566778899aabbccddeeff','fake_hash_for_test',now);
 const sql={exec(query,...params){
  const stmt=db.prepare(query);
  const trimmed=query.trim().toUpperCase();
  const data=trimmed.startsWith('SELECT')?stmt.all(...params):stmt.run(...params);
  return {toArray:()=>Array.isArray(data)?data:[],one:()=>Array.isArray(data)?data[0]:null};
 }};
 const storage={sql,transactionSync(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}
  catch(e){db.exec('ROLLBACK');throw e}}};
 return {db,storage};
}
const getAccount=(db,u)=>db.prepare('SELECT id,username,nickname,role FROM village_users WHERE username=?').get(u);
{
 const {db,storage}=makeDb([
  [beforeId,'skomet','준자준비','player'],
  ['friend-user','qa_friend','친구','player']
 ]);
 db.prepare('INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)')
 .run(beforeId,JSON.stringify({xp:12345,coins:1000}),JSON.stringify(['fashion_hair_09']),9,now);
 db.prepare('INSERT INTO village_sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)')
 .run('already_logged_in',beforeId,now,'2026-11-20T00:00:00Z');
 assert.equal(ensureOwnerPromotion(storage),'granted');
 const account=getAccount(db,'skomet');
 assert.equal(account.id,beforeId,'must promote the same physical user record');
 assert.equal(account.role,'admin');
 assert.equal(account.nickname,'준자');
 assert.equal(getAccount(db,'qa_friend').role,'player');
 assert.equal(db.prepare('SELECT version FROM village_saves WHERE user_id=?').get(beforeId).version,9,'user save must stay intact');
 assert.equal(db.prepare('SELECT token_hash FROM village_sessions WHERE user_id=?').get(beforeId).token_hash,'already_logged_in','existing login stays valid');
 assert.equal(ensureOwnerPromotion(storage),'granted','redeploy must not re-grant or reset');
 assert.equal(db.prepare('SELECT count(*) AS n FROM village_owner_grants').get().n,1);
 db.close();
}
{
 const {db,storage}=makeDb();
 assert.equal(ensureOwnerPromotion(storage),'target_missing');
 db.prepare('INSERT INTO village_users(id,username,nickname,role,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?,?)')
 .run(beforeId,'skomet','준자준비','player','00','hash',now);
 assert.equal(ensureOwnerPromotion(storage),'target_missing','future squatter must never gain privilege');
 assert.equal(getAccount(db,'skomet').role,'player');
 db.close();
}
{
 const {db,storage}=makeDb([[beforeId,'skomet','randomNickname','player']]);
 assert.equal(ensureOwnerPromotion(storage),'identity_mismatch');
 assert.equal(getAccount(db,'skomet').role,'player');
 db.close();
}
{
 const {db,storage}=makeDb([
  [beforeId,'skomet','준자준비','player'],
  ['other-admin','trusted_owner','담당자','admin']
 ]);
 assert.equal(ensureOwnerPromotion(storage),'another_admin_exists');
 assert.equal(getAccount(db,'skomet').role,'player');
 db.close();
}
console.log('PASS owner promotion: exact existing skomet account only, preserve save/session, locked absent/mismatch/admin cases');
