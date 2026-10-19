// v45 — authenticated loyalty dashboard and checkpointed VIP deliveries.
// ONLY the separate v36 trial wallet is ever mutated; original village saves remain untouched.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
import {validateLoyaltyRows,loyaltyView,fulfillVipOrder,weeklyScore,weeklyStart} from '../customer-loyalty-v45.js';
import {NPC_SHOPPERS} from '../resident-demand-v44.js';

const livePool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,
 ssl:{rejectUnauthorized:false},max:3});
const sha=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const send=(res,status,body)=>res.status(status).json(body);
function cookie(req){
 return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('village_session='))?.slice(16)||'';
}
function originCheck(req){
 try{const origin=new URL(req.headers.origin);return ['http:','https:'].includes(origin.protocol)&&
 origin.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&
 !['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');}
 catch{return false}
}
async function loyaltyCounts(c,key){
 const q=await c.query(`SELECT receipt->>'npcId' AS npc_id,
  COUNT(DISTINCT receipt->>'day')::int AS days
  FROM village_economy_v36_events WHERE user_key=$1 AND action='npc_purchase'
  AND receipt ? 'npcId' AND receipt ? 'day'
  GROUP BY receipt->>'npcId'`,[key]);
 return validateLoyaltyRows(q.rows);
}
async function board(c,time){
 const week=weeklyStart(time);
 const q=await c.query(`SELECT COALESCE(u.nickname,'마을 주민') AS name,
  count(*)::int AS sales,sum(e.amount_delta)::bigint AS net
  FROM village_economy_v36_events e
  LEFT JOIN village_users u ON u.id::text=e.user_key
  WHERE e.action IN ('npc_purchase','npc_vip_purchase')
   AND e.amount_delta>=0
   AND e.created_at >= $1::timestamptz
   AND e.created_at < $1::timestamptz + interval '7 days'
  GROUP BY e.user_key,u.nickname ORDER BY net DESC,sales DESC,e.user_key LIMIT 5`,[week]);
 return {weekStart:week,top:weeklyScore(q.rows)};
}
async function myWeek(c,key,time){
 const week=weeklyStart(time);
 const q=await c.query(`SELECT count(*)::int AS sales,COALESCE(sum(amount_delta),0)::bigint AS net
  FROM village_economy_v36_events
  WHERE user_key=$1 AND action IN ('npc_purchase','npc_vip_purchase') AND amount_delta>=0
  AND created_at >= $2::timestamptz
  AND created_at < $2::timestamptz + interval '7 days'`,[key,week]);
 return {sales:Number(q.rows[0]?.sales||0),net:Number(q.rows[0]?.net||0)};
}
async function chain(c,key,record,initialize=false){
 const q=await c.query(`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key]);
 if(!q.rows.length){
  if(!initialize)return {ok:false,reason:'not_initialized',hash:null};
  const start=makeCheckpoint(key,Number(record.version),record.state);
  await c.query(`INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id)
   VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,start.version,JSON.stringify(start.state),null,start.state_hash,null]);
  return {ok:true,hash:start.state_hash};
 }
 const valid=validateCheckpointChain(key,record,q.rows);
 if(!valid.ok&&initialize)fail('주문 장부가 불일치해 거래를 차단했습니다: '+valid.reason);
 return {...valid,hash:q.rows[0].state_hash};
}
export function makeLoyaltyHandler({pool=livePool,now=()=>new Date()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'지원하지 않는 상점 평판 요청'});
  if(process.env.ENABLE_VILLAGE_LOYALTY_V45!=='true')return send(res,503,{error:'단골손님 시스템은 시험 중이에요'});
  if(pool===livePool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)
   return send(res,503,{error:'안전한 시험 데이터베이스 연결이 필요해요'});
  if(req.method==='POST'&&(!originCheck(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'같은 게임에서 보낸 JSON 요청만 접수해요'});
  const token=cookie(req);
  if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'로그인이 필요해요'});
  let c=null,tx=false;
  try{
   c=await pool.connect();
   const who=await c.query(`SELECT u.id FROM village_sessions s
    JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[sha(token)]);
   if(!who.rows.length)return send(res,401,{error:'로그인 시간이 만료됐어요'});
   const key=String(who.rows[0].id),time=now();
   if(req.method==='GET'){
    const record=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
    const state=record?.state||startingEconomy();
    const [counts,ranking,week,audit]=await Promise.all([
      loyaltyCounts(c,key),board(c,time),myWeek(c,key,time),
      record?chain(c,key,record,false):Promise.resolve({ok:false,reason:'not_created'})]);
    return send(res,200,{ok:true,trial:true,loyalty:loyaltyView(state,counts,time),
     rankings:ranking,mine:week,coins:state.coins,audit:{ok:audit.ok,reason:audit.reason||null},
     version:Number(record?.version||0)});
   }
   const {npcId,requestId}=req.body||{};
   if(typeof requestId!=='string'||!uuid.test(requestId))return send(res,400,{error:'중복 주문 방지 번호를 확인해 주세요'});
   if(typeof npcId!=='string'||!Object.hasOwn(NPC_SHOPPERS,npcId))return send(res,400,{error:'존재하지 않는 단골손님입니다'});
   const requestHash=sha(JSON.stringify({action:'npc_vip_purchase',npcId}));
   await c.query('BEGIN');tx=true;
   await c.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
     VALUES($1,$2::jsonb) ON CONFLICT (user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const record=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key])).rows[0];
   if(!record)fail('시험 경제 계정이 잠기지 않았습니다',500);
   const old=(await c.query(`SELECT request_hash,receipt FROM village_economy_v36_events
    WHERE user_key=$1 AND request_id=$2`,[key,requestId])).rows;
   if(old.length){
    if(old[0].request_hash!==requestHash)fail('동일한 거래번호로 다른 특별 주문은 불가능해요');
    await c.query('COMMIT');tx=false;
    return send(res,200,{ok:true,replayed:true,receipt:old[0].receipt,
     coins:record.state.coins,loyalty:loyaltyView(record.state,await loyaltyCounts(c,key),time)});
   }
   const previous=await chain(c,key,record,true);
   const counts=await loyaltyCounts(c,key);
   const sale=fulfillVipOrder(record.state,npcId,counts,time);
   const version=Number(record.version)+1;
   if(!Number.isSafeInteger(version))fail('시험 서버 장부 저장 한도 오류',500);
   const q=sale.contract;
   const receipt={action:'npc_vip_purchase',npcId,role:q.role,product:q.item,quantity:q.quantity,
     gross:q.gross,tax:q.tax,fee:q.fee,net:q.net,delta:sale.delta,balance:sale.next.coins,
     weekStart:q.weekStart,detail:sale.description,at:time.toISOString()};
   await c.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,
     version=version+1,updated_at=now() WHERE user_key=$1`,[key,JSON.stringify(sale.next)]);
   await c.query(`INSERT INTO village_economy_v36_events
     (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [key,requestId,requestHash,receipt.action,sale.delta,sale.next.coins,JSON.stringify(receipt)]);
   const checkpoint=makeCheckpoint(key,version,sale.next,previous.hash,requestId);
   await c.query(`INSERT INTO village_economy_v37_checkpoints
     (user_key,version,state,previous_hash,state_hash,request_id)
     VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,version,JSON.stringify(checkpoint.state),
     checkpoint.previous_hash,checkpoint.state_hash,requestId]);
   await c.query('COMMIT');tx=false;
   return send(res,200,{ok:true,version,receipt,coins:sale.next.coins,
    loyalty:loyaltyView(sale.next,counts,time)});
  }catch(error){
   if(tx&&c){try{await c.query('ROLLBACK')}catch{}}
   if(error.status&&error.status<500)return send(res,error.status,{error:error.message});
   if(error.code==='42P01')return send(res,503,{error:'시험 경제 테이블을 확인해 주세요'});
   console.error('v45 loyalty error',error.code||'',error.message);
   return send(res,500,{error:'단골 특별 주문을 안전하게 처리하지 못했습니다'});
  }finally{c?.release()}
 };
}
export default makeLoyaltyHandler();
