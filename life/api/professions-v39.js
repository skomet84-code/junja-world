// JUNJA v39 authenticated career service. Exclusive to the isolated v36/37 trial wallet.
// Career and reward mutations share one database transaction with the immutable v37 checkpoints.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
import {currentProfession,kstProfessionMidnight,professionView,selectProfession,claimProfessionContract} from '../professions-v39.js';

const productionPool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const sha=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const send=(res,status,data)=>res.status(status).json(data);
const fail=(message,status=409)=>{const error=new Error(message);error.status=status;throw error};
function cookie(req){
 return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('village_session='))?.slice(16)||'';
}
function sameOrigin(req){
 try{
  const origin=new URL(req.headers.origin);
  return ['http:','https:'].includes(origin.protocol)&&origin.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&
   !['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');
 }catch{return false}
}
function canonical(body){
 const action=body?.action;
 if(!['register','claim'].includes(action))fail('없는 직업 행동입니다',400);
 const role=action==='register'?body.role:null;
 if(action==='register'&&typeof role!=='string')fail('직업을 선택해 주세요',400);
 return {action,role};
}
const activeActions=['harvest','craft','market_sold','sell'];
async function verifiedActivity(client,key,state,now){
 const profession=currentProfession(state);
 if(!profession)return {total:{},daily:{}};
 const midnight=kstProfessionMidnight(now);
 const limit=profession.activeSince;
 const result=await client.query(`
  SELECT action, count(*)::int AS total,
   count(*) FILTER (WHERE created_at >= $3::timestamptz)::int AS daily
  FROM village_economy_v36_events
  WHERE user_key=$1 AND created_at >= $2::timestamptz AND action=ANY($4::text[])
  GROUP BY action
 `,[key,limit,midnight.toISOString(),activeActions]);
 const total={},daily={};
 for(const row of result.rows){total[row.action]=Number(row.total);daily[row.action]=Number(row.daily)}
 return {total,daily};
}
async function checkedSnapshot(client,key,record){
 const all=await client.query(`
  SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints
  WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key]);
 if(!all.rows.length){
  // Pre-v37 accounts get a baseline only when they make their first successful v39 action.
  const baseline=makeCheckpoint(key,Number(record.version),record.state);
  await client.query(`INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id)
    VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,baseline.version,JSON.stringify(baseline.state),null,baseline.state_hash,null]);
  return baseline.state_hash;
 }
 const integrity=validateCheckpointChain(key,record,all.rows);
 if(!integrity.ok)fail('거래 장부와 현재 자산이 일치하지 않아 직업 정산을 멈췄어요 ('+integrity.reason+')');
 return all.rows[0].state_hash;
}
export function makeProfessionsHandler({pool=productionPool,now=()=>new Date()}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'허용하지 않는 요청입니다'});
  if(process.env.ENABLE_VILLAGE_PROFESSIONS_V39!=='true')return send(res,503,{error:'직업 연구소는 시험 승인 전까지 비활성화돼 있습니다'});
  if(!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL&&pool===productionPool)
   return send(res,503,{error:'시험용 DB가 연결되지 않았어요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'같은 게임 화면에서 제출한 JSON만 허용합니다'});
  const token=cookie(req);
  if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'로그인 후 이용할 수 있어요'});
  let client=null,tx=false;
  try{
   client=await pool.connect();
   const auth=await client.query(`SELECT u.id FROM village_sessions s
     JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[sha(token)]);
   const user=auth.rows[0];
   if(!user)return send(res,401,{error:'로그인이 만료됐어요'});
   const key=String(user.id),time=now();
   if(req.method==='GET'){
    const r=await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key]);
    const state=r.rows[0]?.state||startingEconomy();
    const earned=await verifiedActivity(client,key,state,time);
    return send(res,200,{ok:true,trial:true,coins:state.coins,
     version:Number(r.rows[0]?.version||0),profession:professionView(state,earned.total,earned.daily,time)});
   }
   const requestId=req.body?.requestId;
   if(typeof requestId!=='string'||!uuid.test(requestId))return send(res,400,{error:'중복지급 방지 요청번호가 필요합니다'});
   const action=canonical(req.body),requestHash=sha(JSON.stringify(action));
   await client.query('BEGIN');tx=true;
   await client.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
     VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const old=await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key]);
   const record=old.rows[0];if(!record)fail('계정 기록을 찾을 수 없습니다',500);
   const existing=await client.query('SELECT request_hash,receipt FROM village_economy_v36_events WHERE user_key=$1 AND request_id=$2',[key,requestId]);
   if(existing.rows.length){
    if(existing.rows[0].request_hash!==requestHash)fail('같은 요청번호로 다른 직업 거래를 할 수 없어요');
    await client.query('COMMIT');tx=false;
    const earned=await verifiedActivity(client,key,record.state,time);
    return send(res,200,{ok:true,replayed:true,receipt:existing.rows[0].receipt,
     coins:record.state.coins,profession:professionView(record.state,earned.total,earned.daily,time)});
   }
   const earlier=await checkedSnapshot(client,key,record);
   const activity=await verifiedActivity(client,key,record.state,time);
   const changed=action.action==='register'?
    selectProfession(record.state,action.role,activity.total,time):
    claimProfessionContract(record.state,activity.daily,time);
   const version=Number(record.version)+1;
   if(!Number.isSafeInteger(version))fail('저장 버전 한도를 초과했습니다',500);
   const receipt={action:action.action==='register'?'profession_register':'profession_claim',
     detail:changed.description,delta:changed.delta,balance:changed.next.coins,day:professionView(changed.next,{}, {},time).day,
     at:time.toISOString()};
   await client.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,version=version+1,updated_at=now()
     WHERE user_key=$1`,[key,JSON.stringify(changed.next)]);
   await client.query(`INSERT INTO village_economy_v36_events
     (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[key,requestId,requestHash,receipt.action,changed.delta,changed.next.coins,JSON.stringify(receipt)]);
   const checkpoint=makeCheckpoint(key,version,changed.next,earlier,requestId);
   await client.query(`INSERT INTO village_economy_v37_checkpoints
     (user_key,version,state,previous_hash,state_hash,request_id)
     VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
     [key,version,JSON.stringify(changed.next),checkpoint.previous_hash,checkpoint.state_hash,requestId]);
   await client.query('COMMIT');tx=false;
   const latest=await verifiedActivity(client,key,changed.next,time);
   return send(res,200,{ok:true,version,receipt,coins:changed.next.coins,
     profession:professionView(changed.next,latest.total,latest.daily,time)});
  }catch(e){
   if(tx&&client){try{await client.query('ROLLBACK')}catch{}}
   if(e.code==='42P01')return send(res,503,{error:'서버 경제 장부가 아직 설치되지 않았어요'});
   if(e.status&&e.status<500)return send(res,e.status,{error:e.message});
   console.error('v39 profession transaction failed',e.code||'',e.message);
   return send(res,500,{error:'직업 정산을 안전하게 처리하지 못했어요. 서버 데이터를 변경하지 않았습니다'});
  }finally{client?.release()}
 };
}
export default makeProfessionsHandler();
