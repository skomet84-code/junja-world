// v51 Cloudflare-only trial career API; one SQLite DO for all game economy.
// License changes and daily rewards atomically update state, event and hash chain.
import {createHash} from 'node:crypto';
import {startingEconomy} from '../../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../../economy-integrity-v37.js';
import {currentProfession,kstProfessionMidnight,professionView,selectProfession,claimProfessionContract} from '../../professions-v39.js';
import {userForSession} from '../d1/account-staging.js';

const send=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=value=>createHash('sha256').update(value).digest('hex');
const one=(sql,q,...p)=>sql.exec(q,...p).toArray()[0]||null;
const rows=(sql,q,...p)=>sql.exec(q,...p).toArray();
function fail(message,status=409){const err=new Error(message);err.status=status;throw err}
function parse(s){try{return JSON.parse(s)}catch{fail('직업 장부의 데이터가 손상되어 중단했어')}}
function activity(sql,key,state,time){
 const career=currentProfession(state);
 if(!career)return {total:{},daily:{}};
 const start=career.activeSince,dailyFrom=kstProfessionMidnight(time).toISOString();
 const actions=['harvest','craft','market_sold','sell','business_produce'];
 const records=rows(sql,`SELECT action,created_at FROM village_economy_v36_events
  WHERE user_key=? AND created_at>=? ORDER BY id ASC`,key,start);
 const total={},daily={};
 for(const rec of records){
  if(!actions.includes(rec.action))continue;
  total[rec.action]=(total[rec.action]||0)+1;
  if(rec.created_at>=dailyFrom)daily[rec.action]=(daily[rec.action]||0)+1;
 }
 return {total,daily};
}
function checkLedger(sql,key,record,at){
 const snaps=rows(sql,`SELECT version,state,previous_hash,state_hash,request_id
   FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 25`,key)
  .map(x=>({...x,state:parse(x.state)}));
 if(snaps.length){
  const audit=validateCheckpointChain(key,record,snaps);
  if(!audit.ok)fail('직업 장부 체크포인트 오류: '+audit.reason);
  return snaps[0].state_hash;
 }
 const base=makeCheckpoint(key,record.version,record.state);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
  (user_key,version,state,previous_hash,state_hash,request_id,created_at)
  VALUES(?,?,?,?,?,?,?)`,key,base.version,JSON.stringify(base.state),null,base.state_hash,null,at);
 return base.state_hash;
}
function professionAction(sql,key,body,time){
 if(!body||typeof body!=='object'||Array.isArray(body))fail('직업 요청이 올바르지 않아',400);
 const action=body.action;
 if(!['register','claim'].includes(action))fail('지원하지 않는 직업 요청이야',400);
 const role=action==='register'?body.role:null;
 if(action==='register'&&typeof role!=='string')fail('직업을 선택해 줘',400);
 const requestId=body.requestId;
 if(typeof requestId!=='string'||!uuid.test(requestId))fail('거래 요청번호(UUID)가 필요해',400);
 const requestHash=sha(JSON.stringify({action,role}));
 const at=time.toISOString();
 let old=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 if(!old){
  sql.exec(`INSERT INTO village_economy_v36_accounts(user_key,state,version,updated_at)
   VALUES(?,?,0,?)`,key,JSON.stringify(startingEconomy()),at);
  old=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 }
 if(!old)fail('경제 계정이 준비되지 않았어',500);
 const record={state:parse(old.state),version:Number(old.version)};
 const duplicate=one(sql,`SELECT request_hash,receipt FROM village_economy_v36_events
  WHERE user_key=? AND request_id=?`,key,requestId);
 if(duplicate){
  if(duplicate.request_hash!==requestHash)fail('같은 요청번호로 다른 행동을 시도할 수 없어');
  const evidence=activity(sql,key,record.state,time);
  return {ok:true,trial:true,replayed:true,version:record.version,
   receipt:parse(duplicate.receipt),coins:record.state.coins,
   profession:professionView(record.state,evidence.total,evidence.daily,time)};
 }
 const previous=checkLedger(sql,key,record,at);
 const earned=activity(sql,key,record.state,time);
 const mutation=action==='register'?
  selectProfession(record.state,role,earned.total,time):
  claimProfessionContract(record.state,earned.daily,time);
 const nextVersion=record.version+1;
 if(!Number.isSafeInteger(nextVersion))fail('직업 저장 버전이 너무 커',500);
 const actionName=action==='register'?'profession_register':'profession_claim';
 const receipt={action:actionName,detail:mutation.description,delta:mutation.delta,
  balance:mutation.next.coins,day:professionView(mutation.next,{}, {},time).day,at};
 sql.exec(`UPDATE village_economy_v36_accounts SET state=?,version=?,updated_at=?
  WHERE user_key=? AND version=?`,JSON.stringify(mutation.next),nextVersion,at,key,record.version);
 if(Number(one(sql,'SELECT changes() AS n')?.n)!==1)fail('동시 저장 충돌을 감지했어');
 sql.exec(`INSERT INTO village_economy_v36_events
  (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
  VALUES(?,?,?,?,?,?,?,?)`,key,requestId,requestHash,actionName,mutation.delta,
   mutation.next.coins,JSON.stringify(receipt),at);
 const snap=makeCheckpoint(key,nextVersion,mutation.next,previous,requestId);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
  (user_key,version,state,previous_hash,state_hash,request_id,created_at)
  VALUES(?,?,?,?,?,?,?)`,key,nextVersion,JSON.stringify(mutation.next),snap.previous_hash,snap.state_hash,requestId,at);
 const nextActivity=activity(sql,key,mutation.next,time);
 return {ok:true,trial:true,version:nextVersion,receipt,coins:mutation.next.coins,
  profession:professionView(mutation.next,nextActivity.total,nextActivity.daily,time)};
}
export async function handleProfessionsV51(request,storage,db){
 if(!['GET','POST'].includes(request.method))return send({error:'GET/POST만 허용해'},405);
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
   return send({error:'같은 게임에서만 직업을 신청할 수 있어'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return send({error:'JSON 직업 신청만 허용해'},415);
 }
 const user=await userForSession(request,db);
 if(!user)return send({error:'직업 센터는 로그인 후 이용할 수 있어'},401);
 try{
  const sql=storage.sql,key=user.id,time=new Date();
  if(request.method==='GET'){
   const record=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
   const state=record?parse(record.state):startingEconomy();
   const proof=activity(sql,key,state,time);
   return send({ok:true,trial:true,coins:state.coins,version:Number(record?.version||0),
    profession:professionView(state,proof.total,proof.daily,time)});
  }
  const raw=await request.text();
  if(raw.length>20000)return send({error:'직업 요청이 너무 길어'},413);
  let payload;try{payload=JSON.parse(raw)}catch{return send({error:'JSON 형식을 확인해 줘'},400)}
  return send(storage.transactionSync(()=>professionAction(storage.sql,user.id,payload,time)));
 }catch(error){
  if(error.status&&error.status<500)return send({error:error.message},error.status);
  console.error('v51 profession SQLite error',error?.name);
  return send({error:'직업 정산이 실패했어. 신청비·보상 지급은 취소됐어.'},503);
 }
}
