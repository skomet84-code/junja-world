// v48 server-owned private housing. Separate trial economy account; NEVER writes village_saves/wallets.
// Purchases, furnishing changes and SHA checkpoint settle atomically using the v36 event ledger.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {houseView,homeAction} from '../personal-home-v48.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
const livePool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,
 ssl:{rejectUnauthorized:false},max:3});
const hash=t=>createHash('sha256').update(t).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reject=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const send=(res,status,value)=>res.status(status).json(value);
function sameOrigin(req){
 try{const o=new URL(req.headers.origin);return ['http:','https:'].includes(o.protocol)&&o.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&!['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');}
 catch{return false;}
}
async function proof(c,key){
 const q=await c.query(`SELECT
 count(*) FILTER (WHERE action IN ('npc_purchase','npc_vip_purchase'))::int AS sales,
 count(*) FILTER (WHERE action='business_produce')::int AS craft
 FROM village_economy_v36_events WHERE user_key=$1
 AND action IN ('npc_purchase','npc_vip_purchase','business_produce')`,[key]);
 return {sales:Number(q.rows[0]?.sales||0),craft:Number(q.rows[0]?.craft||0)};
}
async function chain(c,key,account,initialize=false){
 const rows=(await c.query(`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key])).rows;
 if(!rows.length){
  if(!initialize)return {ok:false,reason:'not_initialized',hash:null};
  const base=makeCheckpoint(key,Number(account.version),account.state);
  await c.query(`INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id)
    VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,base.version,JSON.stringify(base.state),null,base.state_hash,null]);
  return {ok:true,hash:base.state_hash};
 }
 const checked=validateCheckpointChain(key,account,rows);
 if(!checked.ok&&initialize)reject('기존 시험 경제 복구 장부 불일치로 집 거래를 중단했어요');
 return {...checked,hash:rows[0].state_hash};
}
function canonical(body){
 if(!body||typeof body!=='object'||Array.isArray(body))reject('거래 요청 형식 오류',400);
 const {action}=body;
 const raw=body.data&&typeof body.data==='object'&&!Array.isArray(body.data)?body.data:{};
 if(action==='upgrade')return {action,data:{}};
 if(action==='buy')return {action,data:{item:raw.item}};
 if(action==='place')return {action,data:{item:raw.item,slot:raw.slot,turn:raw.turn??0}};
 if(action==='rotate'||action==='remove')return {action,data:{slot:raw.slot}};
 if(action==='style')return {action,data:{kind:raw.kind,id:raw.id}};
 reject('지원하지 않는 주택 거래예요',400);
}
export function makeHomeHandler({pool=livePool,now=()=>new Date()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'집 조회·인테리어 변경만 지원해요'});
  if(process.env.ENABLE_VILLAGE_HOME_V48!=='true')return send(res,503,{error:'주택 꾸미기 v48은 시험 중이에요'});
  if(pool===livePool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)
   return send(res,503,{error:'안전한 시험 데이터베이스 연결이 필요해요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'같은 게임의 JSON 요청만 가능합니다'});
  const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(x=>x.startsWith('village_session='))?.slice(16)||'';
  if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'마을 계정 로그인이 필요해요'});
  let c=null,tx=false;
  try{
   c=await pool.connect();
   const who=await c.query(`SELECT u.id FROM village_sessions s JOIN village_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(token)]);
   if(!who.rows.length)return send(res,401,{error:'로그인이 만료됐어요'});
   const key=String(who.rows[0].id),time=now();
   if(req.method==='GET'){
    const row=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
    const account=row||{state:startingEconomy(),version:0};
    const [a,p]=await Promise.all([row?chain(c,key,row,false):Promise.resolve({ok:false,reason:'not_created'}),proof(c,key)]);
    return send(res,200,{ok:true,trial:true,version:Number(account.version),home:houseView(account.state,p),
     audit:{ok:a.ok,reason:a.reason||null}});
   }
   const id=req.body?.requestId;
   if(typeof id!=='string'||!uuid.test(id))return send(res,400,{error:'중복 거래 방지 번호가 필요해요'});
   const requested=canonical(req.body),requestHash=hash(JSON.stringify(requested));
   await c.query('BEGIN');tx=true;
   await c.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
      VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const row=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key])).rows[0];
   if(!row)reject('시험 주택 계정을 잠글 수 없어요',500);
   const previous=(await c.query('SELECT request_hash,receipt FROM village_economy_v36_events
     WHERE user_key=$1 AND request_id=$2',[key,id])).rows;
   if(previous.length){
    if(previous[0].request_hash!==requestHash)reject('같은 거래번호로 다른 가구 변경을 할 수 없어요');
    await c.query('COMMIT');tx=false;
    return send(res,200,{ok:true,replayed:true,receipt:previous[0].receipt,version:Number(row.version),
      home:houseView(row.state,await proof(c,key))});
   }
   const head=await chain(c,key,row,true),p=await proof(c,key);
   const change=homeAction(row.state,requested.action,requested.data,p),version=Number(row.version)+1;
   if(!Number.isSafeInteger(version))reject('시험 저장 버전 한도 초과',500);
   const receipt={action:'home_'+requested.action,detail:change.detail,delta:change.delta,
    balance:change.next.coins,at:time.toISOString(),item:requested.data.item||null};
   await c.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,version=version+1,updated_at=now() WHERE user_key=$1`,
    [key,JSON.stringify(change.next)]);
   await c.query(`INSERT INTO village_economy_v36_events
     (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [key,id,requestHash,receipt.action,change.delta,change.next.coins,JSON.stringify(receipt)]);
   const next=makeCheckpoint(key,version,change.next,head.hash,id);
   await c.query(`INSERT INTO village_economy_v37_checkpoints
    (user_key,version,state,previous_hash,state_hash,request_id) VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
    [key,version,JSON.stringify(next.state),next.previous_hash,next.state_hash,id]);
   await c.query('COMMIT');tx=false;
   return send(res,200,{ok:true,version,receipt,home:change.house});
  }catch(e){
   if(tx&&c){try{await c.query('ROLLBACK')}catch{}}
   if(e.status&&e.status<500)return send(res,e.status,{error:e.message});
   if(e.code==='42P01')return send(res,503,{error:'집 장부를 위한 시험 DB가 준비되지 않았어요'});
   console.error('v48 home transaction',e.code||'',e.message);
   return send(res,500,{error:'주택 거래가 완료되지 않았어요. 기존 재산은 변경하지 않았습니다'});
  }finally{c?.release()}
 };
}
export default makeHomeHandler();
