import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {restoreProfile,createSaveQueue} from './save-client.js';
const cloud={version:7,profile:{xp:6720,coins:450},owned:['mint','linen']};
const broken={getItem(){throw Error('storage denied')}};
assert.equal(restoreProfile(cloud,broken,'user').profile.xp,6720,'Storage failure cannot erase server level');
assert.equal(restoreProfile(cloud,{getItem:()=>'{bad json'},'user').profile.xp,6720);
assert.equal(restoreProfile(cloud,{getItem:()=>JSON.stringify({baseVersion:6,profile:{xp:100}})},'user').profile.xp,6720,'Stale draft must not win');
assert.equal(restoreProfile(cloud,{getItem:()=>JSON.stringify({baseVersion:7,profile:{xp:6760}})},'user').profile.xp,6760);
const localOnly={getItem(key){return key==='junja-local'?JSON.stringify({xp:3200,coins:333}):null}};
assert.equal(restoreProfile(null,localOnly,'junja-local').profile.xp,3200,'Missing cloud row must recover per-account browser progress');
assert.equal(restoreProfile(cloud,localOnly,'junja-local').profile.xp,6720,'A local disk save must never replace a newer cloud record');
const pendingOnly={getItem(key){return key==='junja-local-unsynced'?JSON.stringify({baseVersion:6,profile:{xp:3360},owned:['mint']}):null}};
assert.equal(restoreProfile(null,pendingOnly,'junja-local').profile.xp,3360,'Server row loss must not erase unsynced local draft');

const sent=[];let release;
const q=createSaveQueue({version:7,send:async payload=>{sent.push(payload);if(sent.length===1)await new Promise(r=>release=r);return {ok:true,status:200,json:async()=>({version:payload.version+1})}}});
const first=q.enqueue({xp:6800},['mint']);q.enqueue({xp:6840},['mint','linen']);release();assert(await first);
assert.deepEqual(sent.map(p=>p.version),[7,8]);assert.deepEqual(sent.map(p=>p.profile.xp),[6800,6840]);assert.equal(q.version,9);
let attempts=0;const retried=[];
const retry=createSaveQueue({version:9,send:async p=>{retried.push(p);if(!attempts++)throw Error('response lost');return {ok:true,status:200,json:async()=>({version:10})}}});
assert.equal(await retry.enqueue({xp:6900},[]),false);assert.equal(await retry.flush(),true);assert.strictEqual(retried[0],retried[1],'Retry the exact payload and id');
const blocked=createSaveQueue({send:async()=>({status:409,ok:false,json:async()=>({error:'conflict'})})});assert.equal(await blocked.enqueue({xp:1},[]),false);assert(blocked.blocked);
const clientError=createSaveQueue({send:async()=>({status:400,ok:false,json:async()=>({error:'저장 형식 오류'})})});
assert.equal(await clientError.enqueue({xp:1},[]),false);
assert(clientError.blocked,'Permanent save validation failures must be visible rather than silently retried forever');

// Exercise the actual API handler with an in-memory SQL adapter, never live accounts.
process.env.VILLAGE_DATABASE_URL='test-only';let row={profile:{xp:6720},owned:['mint'],version:7},writes=0;
const db={release(){},async query(sql,args){
 if(sql.includes('FROM village_sessions'))return {rows:[{id:1,username:'qa',role:'player'}]};
 if(sql.startsWith('SELECT profile,owned,version'))return {rows:row?[structuredClone(row)]:[]};
 if(sql.startsWith('UPDATE village_saves SET profile')){row={profile:args[1],owned:JSON.parse(args[2]),version:args[3]};writes++;return {rows:[]}}
 if(sql.startsWith('INSERT INTO village_saves')){row={profile:args[1],owned:JSON.parse(args[2]),version:args[3]};writes++;return {rows:[{version:args[3]}]}}
 if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]};
 throw Error('Unexpected SQL: '+sql);
}};
globalThis.__saveTestPool={connect:async()=>db};
let source=await readFile(new URL('./api/account.js',import.meta.url),'utf8');
source=source.replace("import {CATALOG_BY_ID} from '../fashion-catalog.js';",'const CATALOG_BY_ID={};').replace("import pg from 'pg';",'const pg={Pool:class {constructor(){return globalThis.__saveTestPool}}};');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
async function post(body){let result;const res={setHeader(){},status(status){this.code=status;return this},json(data){result={status:this.code,...data}}};await handler({method:'POST',headers:{cookie:'village_session='+'a'.repeat(64)},query:{action:'save'},body},res);return result}
const payload={version:7,requestId:crypto.randomUUID(),profile:{xp:6760},owned:['mint']};
assert.equal((await post(payload)).status,200);assert.equal(writes,1);
assert.equal((await post(payload)).status,200);assert.equal(writes,1,'Lost-response retry must not write twice');
assert.equal((await post({...payload,profile:{xp:0}})).status,409,'Same id with altered body is rejected');
assert.equal((await post({...payload,requestId:crypto.randomUUID()})).status,409,'Stale tab cannot overwrite');
assert.equal((await post({version:8,requestId:crypto.randomUUID(),profile:{xp:6500},owned:['mint']})).status,409,'Matching-version save must never regress server XP');
assert.equal(row.profile.xp,6760,'Rejected lower XP must preserve the authoritative level');
assert.equal((await post({profile:{xp:0},owned:[]})).status,428,'Unversioned legacy hunt saves rejected');
assert.equal(row.profile.xp,6760);
assert.deepEqual(row.owned,['mint']);
row=null;
const initialSave=await post({version:0,requestId:crypto.randomUUID(),profile:{xp:0},owned:['mint','none']});
assert.equal(initialSave.status,200);assert.deepEqual(row.owned,['mint','none']);
console.log('PASS: denied/corrupt storage, draft versions, queued writes, lost response replay, stale tab protection and legacy save rejection');
