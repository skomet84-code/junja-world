import assert from 'node:assert/strict';
import {handleAccountD1} from './account-staging.js';
const url='https://junja-world-d1-staging.example/api/account';
const fake={
 prepare(sql){
  // Unauthenticated request never executes any write.
  if(!sql.startsWith('SELECT u.id,u.username,u.nickname,u.role FROM village_sessions'))
   throw Error('Unexpected D1 query in unauthenticated test: '+sql);
  return {bind(){return {first:async()=>null}}};
 }
};
let response=await handleAccountD1(new Request(url+'?action=me'),{DB:fake});
assert.equal(response.status,401);
assert.equal((await response.json()).error,'로그인이 필요해요');
response=await handleAccountD1(new Request(url+'?action=save'),{DB:fake});
assert.equal(response.status,401);
response=await handleAccountD1(new Request(url+'?action=me'),{});
assert.equal(response.status,503);
response=await handleAccountD1(new Request(url+'?action=unknown'),{DB:fake});
assert.equal(response.status,401);
console.log('PASS: D1 staging fails closed without DB or authentication');
