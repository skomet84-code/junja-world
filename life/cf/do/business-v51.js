// v51 Cloudflare-only business center: authenticated, one SQLite Durable Object.
// Uses the SAME isolated trial-economy state, ledger and checkpoints as v36-v39.
// Does not credit real character money, XP, gold wallet or owned equipment.
import {createHash} from 'node:crypto';
import {startingEconomy} from '../../secure-economy-v36.js';
import {currentProfession} from '../../professions-v39.js';
import {buildWorkshop,upgradeWorkshop,manufactureWorkshopItem,workshopView,businessWeekBeginning,WORKSHOP_TYPES} from '../../business-v40.js';
import {makeCheckpoint,validateCheckpointChain} from '../../economy-integrity-v37.js';
import {userForSession} from '../d1/account-staging.js';
const send=(obj,status=200)=>Response.json(obj,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=x=>createHash('sha256').update(x).digest('hex');
const one=(sql,q,...args)=>sql.exec(q,...args).toArray()[0]||null;
const rows=(sql,q,...args)=>sql.exec(q,...args).toArray();
function fail(msg,status=409){const e=new Error(msg);e.status=status;throw e}
function parse(v){try{return JSON.parse(v)}catch{fail('사업장 장부가 손상되어 거래를 중단했어')}}
function activity(sql,key,state){
 const job=currentProfession(state);
 if(!job)return {};
 const relevant=['harvest','craft','sell','market_sold','business_produce'];
 const report={};
 for(const r of rows(sql,'SELECT action FROM village_economy_v36_events WHERE user_key=? AND created_at>=?',key,job.activeSince)){
  if(relevant.includes(r.action))report[r.action]=(report[r.action]||0)+1;
 }
 return report;
}
function ranking(sql,time){
 const start=businessWeekBeginning(time).toISOString(),board={};
 for(const role of Object.keys(WORKSHOP_TYPES)){
  // Receipts are created exclusively by the server. No user-controlled score.
  const query=`SELECT e.user_key,COALESCE(u.nickname,'마을 주민') AS name,count(*) AS total
    FROM village_economy_v36_events e
    LEFT JOIN village_users u ON u.id=e.user_key
    WHERE e.action='business_produce'
      AND json_extract(e.receipt,'$.role')=? AND e.created_at>=?
    GROUP BY e.user_key,u.nickname ORDER BY total DESC,e.user_key ASC LIMIT 5`;
  board[role]=rows(sql,query,role,start).map((r,i)=>({rank:i+1,name:r.name,total:Number(r.total)}));
 }
 return {weekStart:start,board};
}
function checkpoints(sql,key,record,create,at){
 const found=rows(sql,'SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 25',key)
 .map(r=>({...r,state:parse(r.state)}));
 if(found.length){
  const check=validateCheckpointChain(key,record,found);
  if(create&&!check.ok)fail('서버 사업장 장부가 일치하지 않아 거래를 중단했어 ('+check.reason+')');
  return {audit:check,hash:found[0].state_hash};
 }
 if(!create)return {audit:{ok:false,reason:'not_initialized'},hash:null};
 const baseline=makeCheckpoint(key,record.version,record.state);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
   (user_key,version,state,previous_hash,state_hash,request_id,created_at)
   VALUES(?,?,?,?,?,?,?)`,key,record.version,JSON.stringify(record.state),null,baseline.state_hash,null,at);
 return {audit:{ok:true,checked:1},hash:baseline.state_hash};
}
function operate(sql,key,payload,at){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))fail('사업장 요청 형식 오류',400);
 const {action,role,requestId}=payload;
 if(typeof requestId!=='string'||!uuid.test(requestId))fail('중복 거래 방지 번호가 필요해',400);
 if(!['build','upgrade','produce'].includes(action)||typeof role!=='string'||!Object.hasOwn(WORKSHOP_TYPES,role))
  fail('지원하지 않는 사업장 거래야',400);
 const requestHash=hash(JSON.stringify({action,role}));
 const time=new Date(at);
 let old=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 if(!old){
  sql.exec('INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)',
   key,JSON.stringify(startingEconomy()),at);
  old=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 }
 if(!old)fail('사업장 경제 계정 생성 오류',503);
 const record={state:parse(old.state),version:Number(old.version)};
 const existing=one(sql,'SELECT request_hash,receipt FROM village_economy_v36_events WHERE user_key=? AND request_id=?',key,requestId);
 if(existing){
  if(existing.request_hash!==requestHash)fail('같은 요청번호로 다른 거래를 할 수 없어');
  return {ok:true,trial:true,replayed:true,version:record.version,receipt:parse(existing.receipt),
   coins:record.state.coins,business:workshopView(record.state,activity(sql,key,record.state),time),energy:null};
 }
 const previous=checkpoints(sql,key,record,true,at);
 const proof=activity(sql,key,record.state);
 const changed=action==='build'?buildWorkshop(record.state,role,proof,time):
   action==='upgrade'?upgradeWorkshop(record.state,role,proof):
   manufactureWorkshopItem(record.state,role,proof);
 const nextVersion=record.version+1;
 if(!Number.isSafeInteger(nextVersion))fail('사업장 저장 버전 초과',503);
 const receipt={action:action==='produce'?'business_produce':action==='build'?'business_build':'business_upgrade',
  detail:changed.detail,delta:changed.delta,balance:changed.next.coins,role,
  product:changed.product||null,level:changed.level,at};
 sql.exec('UPDATE village_economy_v36_accounts SET state=?,version=?,updated_at=? WHERE user_key=? AND version=?',
  JSON.stringify(changed.next),nextVersion,at,key,record.version);
 if(Number(one(sql,'SELECT changes() AS n')?.n||0)!==1)fail('동시 저장 충돌을 막았어');
 sql.exec(`INSERT INTO village_economy_v36_events
  (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
  VALUES(?,?,?,?,?,?,?,?)`,
  key,requestId,requestHash,receipt.action,changed.delta,changed.next.coins,JSON.stringify(receipt),at);
 const checkpoint=makeCheckpoint(key,nextVersion,changed.next,previous.hash,requestId);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
  (user_key,version,state,previous_hash,state_hash,request_id,created_at)
  VALUES(?,?,?,?,?,?,?)`,
  key,nextVersion,JSON.stringify(changed.next),checkpoint.previous_hash,checkpoint.state_hash,requestId,at);
 return {ok:true,trial:true,version:nextVersion,receipt,coins:changed.next.coins,
  business:workshopView(changed.next,activity(sql,key,changed.next),time),energy:null};
}
export async function handleBusinessV51(request,storage,db){
 if(!['GET','POST'].includes(request.method))return send({error:'GET/POST만 허용해'},405);
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
   return send({error:'같은 게임 화면에서만 사업장을 관리할 수 있어'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return send({error:'JSON 사업장 요청만 지원해'},415);
 }
 const user=await userForSession(request,db);
 if(!user)return send({error:'로그인해야 개인 사업장을 사용할 수 있어'},401);
 const sql=storage.sql,actor=user.id,time=new Date();
 try{
  if(request.method==='GET'){
   const row=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',actor);
   const state=row?parse(row.state):startingEconomy();
   const record={state,version:Number(row?.version||0)};
   const proof=activity(sql,actor,state);
   return send({ok:true,trial:true,coins:state.coins,version:record.version,
    business:workshopView(state,proof,time),rankings:ranking(sql,time),
    audit:row?checkpoints(sql,actor,record,false,time.toISOString()).audit:{ok:false,reason:'not_created'},energy:null});
  }
  const raw=await request.text();
  if(raw.length>20000)return send({error:'사업장 요청이 너무 길어'},413);
  let payload;try{payload=JSON.parse(raw)}catch{return send({error:'JSON 형식 오류'},400)}
  return send(storage.transactionSync(()=>operate(storage.sql,actor,payload,new Date().toISOString())));
 }catch(e){
  if(e.status&&e.status<500)return send({error:e.message},e.status);
  console.error('Cloudflare v51 workshop failed',e?.name);
  return send({error:'사업장 거래 처리에 실패했어. 골드·재료는 변경하지 않았어.'},503);
 }
}
