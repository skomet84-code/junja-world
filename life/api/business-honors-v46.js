// v46 achievement/analytics API; authenticated, private to the account.
// Honors are zero-gold cosmetic titles only, committed to v36 trial state with v37 checkpoints.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
import {validateHonorCounters,honorsView,equipHonor,monthDayLabels,economicsView} from '../business-honors-v46.js';
const livePool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,
 ssl:{rejectUnauthorized:false},max:3});
const sha=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const err=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const send=(res,status,data)=>res.status(status).json(data);
function authCookie(req){
 return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('village_session='))?.slice(16)||'';
}
function sameOrigin(req){
 try{const v=new URL(req.headers.origin);return ['http:','https:'].includes(v.protocol)&&
 v.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&
 !['none','same-site','cross-site'].includes(req.headers['sec-fetch-site']||'');}
 catch{return false}
}
async function counts(c,key){
 const q=await c.query(`SELECT
 count(*) FILTER(WHERE action IN ('npc_purchase','npc_vip_purchase'))::int AS npc_sale,
 count(*) FILTER(WHERE action='business_produce')::int AS manufacture,
 count(*) FILTER(WHERE action='business_produce' AND receipt->>'role'='farmer')::int AS farmer_manufacture,
 count(*) FILTER(WHERE action IN ('npc_purchase','npc_vip_purchase') AND receipt->>'role'='farmer')::int AS farmer_sales,
 count(*) FILTER(WHERE action='business_produce' AND receipt->>'role'='chef')::int AS chef_manufacture,
 count(*) FILTER(WHERE action IN ('npc_purchase','npc_vip_purchase') AND receipt->>'role'='chef')::int AS chef_sales,
 count(*) FILTER(WHERE action='business_produce' AND receipt->>'role'='merchant')::int AS merchant_manufacture,
 count(*) FILTER(WHERE action IN ('npc_purchase','npc_vip_purchase') AND receipt->>'role'='merchant')::int AS merchant_sales
 FROM village_economy_v36_events WHERE user_key=$1
 AND action IN ('npc_purchase','npc_vip_purchase','business_produce')`,[key]);
 return validateHonorCounters(Object.entries(q.rows[0]||{}).map(([metric,total])=>({metric,total})));
}
async function stats(c,key,time){
 const labels=monthDayLabels(time),start=labels[0],end=new Date(Date.parse(labels.at(-1)+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const q=await c.query(`SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS date,
 count(*)::int AS sales,coalesce(sum(amount_delta),0)::bigint AS net,
 coalesce(sum((receipt->>'tax')::bigint),0)::bigint AS tax,
 coalesce(sum((receipt->>'fee')::bigint),0)::bigint AS fee
 FROM village_economy_v36_events
 WHERE user_key=$1 AND action IN ('npc_purchase','npc_vip_purchase') AND amount_delta>=0
 AND created_at>=($2::date::timestamp AT TIME ZONE 'Asia/Seoul')
 AND created_at<($3::date::timestamp AT TIME ZONE 'Asia/Seoul')
 GROUP BY 1 ORDER BY 1`,[key,start,end]);
 return economicsView(q.rows,time);
}
async function chain(c,key,record,initialize=false){
 const rs=await c.query(`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key]);
 if(!rs.rows.length){
  if(!initialize)return {ok:false,reason:'not_initialized',hash:null};
  const genesis=makeCheckpoint(key,Number(record.version),record.state);
  await c.query(`INSERT INTO village_economy_v37_checkpoints
   (user_key,version,state,previous_hash,state_hash,request_id) VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
   [key,genesis.version,JSON.stringify(genesis.state),null,genesis.state_hash,null]);
  return {ok:true,hash:genesis.state_hash};
 }
 const audit=validateCheckpointChain(key,record,rs.rows);
 if(!audit.ok&&initialize)err('업적 장부 검증에 실패하여 변경을 중단했어요: '+audit.reason);
 return {...audit,hash:rs.rows[0].state_hash};
}
export function makeBusinessHonorsHandler({pool=livePool,now=()=>new Date()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'업적 게시판은 조회와 칭호 착용만 지원해요'});
  if(process.env.ENABLE_VILLAGE_HONORS_V46!=='true')
   return send(res,503,{error:'사업 업적 시스템은 아직 시험 중이에요'});
  if(pool===livePool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)
   return send(res,503,{error:'업적 시험 경제 DB가 필요해요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'같은 게임에서 보낸 업적 요청만 가능해요'});
  const token=authCookie(req);
  if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'마을 계정 로그인이 필요해요'});
  let c=null,tx=false;
  try{
   c=await pool.connect();
   const auth=await c.query(`SELECT u.id FROM village_sessions s JOIN village_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now()`,[sha(token)]);
   if(!auth.rows.length)return send(res,401,{error:'로그인 시간이 만료됐어요'});
   const key=String(auth.rows[0].id),time=now();
   if(req.method==='GET'){
    const row=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
    const state=row?.state||startingEconomy();
    const [counters,economy,audit]=await Promise.all([
      counts(c,key),stats(c,key,time),
      row?chain(c,key,row,false):Promise.resolve({ok:false,reason:'not_created'})]);
    return send(res,200,{ok:true,trial:true,version:Number(row?.version||0),
      honors:honorsView(state,counters),economy,
      audit:{ok:audit.ok,reason:audit.reason||null}});
   }
   const {requestId,id}=req.body||{};
   if(typeof requestId!=='string'||!uuid.test(requestId))
    return send(res,400,{error:'중복 방지 거래번호가 필요해요'});
   if(typeof id!=='string'||id.length>48)
    return send(res,400,{error:'올바른 업적을 선택해 주세요'});
   const requestHash=sha(JSON.stringify({action:'honor_equip',id}));
   await c.query('BEGIN');tx=true;
   await c.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
    VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const record=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key])).rows[0];
   if(!record)err('시험 계정을 잠그지 못했어요',500);
   const previous=(await c.query(`SELECT request_hash,receipt FROM village_economy_v36_events
     WHERE user_key=$1 AND request_id=$2`,[key,requestId])).rows;
   if(previous.length){
    if(previous[0].request_hash!==requestHash)err('같은 요청번호로 다른 업적을 지정할 수 없어요');
    await c.query('COMMIT');tx=false;
    return send(res,200,{ok:true,replayed:true,receipt:previous[0].receipt,
      honors:honorsView(record.state,await counts(c,key))});
   }
   const head=await chain(c,key,record,true);
   const verified=await counts(c,key),change=equipHonor(record.state,id,verified),version=Number(record.version)+1;
   if(!Number.isSafeInteger(version))err('장부 버전 초과',500);
   const receipt={action:'honor_equip',id,title:change.title,delta:0,
    balance:change.next.coins,detail:'사업 칭호 변경: '+change.title,at:time.toISOString()};
   await c.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,
    version=version+1,updated_at=now() WHERE user_key=$1`,[key,JSON.stringify(change.next)]);
   await c.query(`INSERT INTO village_economy_v36_events
    (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[key,requestId,requestHash,receipt.action,0,change.next.coins,JSON.stringify(receipt)]);
   const checkpoint=makeCheckpoint(key,version,change.next,head.hash,requestId);
   await c.query(`INSERT INTO village_economy_v37_checkpoints
    (user_key,version,state,previous_hash,state_hash,request_id)
    VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,version,JSON.stringify(checkpoint.state),
    checkpoint.previous_hash,checkpoint.state_hash,requestId]);
   await c.query('COMMIT');tx=false;
   return send(res,200,{ok:true,version,receipt,honors:honorsView(change.next,verified)});
  }catch(e){
   if(tx&&c){try{await c.query('ROLLBACK')}catch{}}
   if(e.status&&e.status<500)return send(res,e.status,{error:e.message});
   if(e.code==='42P01')return send(res,503,{error:'시험 경제 장부가 준비되지 않았어요'});
   console.error('v46 honor',e.code||'',e.message);
   return send(res,500,{error:'업적 확인이 실패해 변경을 취소했어요'});
  }finally{c?.release()}
 };
}
export default makeBusinessHonorsHandler();
