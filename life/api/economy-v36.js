// Vercel-only isolated economy endpoint. No client-supplied balance/XP/item counts are accepted.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy,economyAction,economyView} from '../secure-economy-v36.js';

const dbUrl=()=>process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL;
const pool=new pg.Pool({connectionString:dbUrl(),ssl:{rejectUnauthorized:false},max:3});
const digest=x=>createHash('sha256').update(x).digest('hex');
const respond=(res,status,data)=>res.status(status).json(data);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern=/^[a-f0-9]{64}$/;

function cookie(req,key){
 return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';
}
function sameOrigin(req){
 const origin=req.headers.origin,host=req.headers.host;
 if(typeof origin!=='string'||typeof host!=='string')return false;
 try{
  const url=new URL(origin);
  return (url.protocol==='https:'||url.protocol==='http:')&&url.host.toLowerCase()===host.toLowerCase()&&
   !['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');
 }catch{return false}
}
function canonical(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('요청 형식을 확인해 주세요'),{status:400});
 const action=body.action;
 if(typeof action!=='string'||!['plant','harvest','craft','sell','order','expand'].includes(action))
  throw Object.assign(new Error('지원하지 않는 거래입니다'),{status:400});
 const raw=body.payload&&typeof body.payload==='object'&&!Array.isArray(body.payload)?body.payload:{};
 // Fixed whitelists guarantee same request hashes even with unrelated client fields.
 const payload=action==='plant'?{index:raw.index,crop:raw.crop}:
  action==='harvest'?{index:raw.index}:
  action==='craft'?{recipe:raw.recipe}:
  action==='sell'?{item:raw.item}:
  action==='order'?{order:raw.order}:{};
 return {action,payload};
}
export function makeEconomyHandler({pool:database=pool,now=()=>new Date()}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'GET/POST만 허용합니다'});
  if(process.env.ENABLE_VILLAGE_ECONOMY_V36!=='true')return respond(res,503,{error:'서버 경제 연구소는 테스트 승인 전까지 비활성화돼 있어요'});
  if(!dbUrl()&&database===pool)return respond(res,503,{error:'서버 데이터베이스가 연결되지 않았어요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return respond(res,403,{error:'같은 게임에서 보낸 JSON 요청만 허용합니다'});
  const token=cookie(req,'village_session');
  if(!tokenPattern.test(token))return respond(res,401,{error:'먼저 준자마을 계정으로 로그인해 주세요'});
  let c=null,inTransaction=false;
  try{
   c=await database.connect();
   const auth=await c.query(`SELECT u.id,u.nickname
     FROM village_sessions s JOIN village_users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)]);
   const user=auth.rows[0];
   if(!user)return respond(res,401,{error:'로그인 세션이 만료됐어요'});
   const userKey=String(user.id);
   if(req.method==='GET'){
    const row=await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[userKey]);
    const s=row.rows[0]?.state||startingEconomy();
    const events=row.rows[0]?await c.query('SELECT receipt FROM village_economy_v36_events WHERE user_key=$1 ORDER BY id DESC LIMIT 8',[userKey]):{rows:[]};
    return respond(res,200,{ok:true,trial:true,version:Number(row.rows[0]?.version||0),economy:economyView(s,now()),receipts:events.rows.map(r=>r.receipt)});
   }
   const id=req.body?.requestId;
   if(typeof id!=='string'||!uuid.test(id))return respond(res,400,{error:'중복 거래 방지를 위한 요청 ID가 필요해요'});
   const {action,payload}=canonical(req.body);
   const requestHash=digest(JSON.stringify({action,payload}));
   await c.query('BEGIN');inTransaction=true;
   await c.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
     VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[userKey,JSON.stringify(startingEconomy())]);
   const saved=await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[userKey]);
   if(!saved.rows.length)throw Error('거래 계정을 읽지 못했습니다');
   const duplicated=await c.query('SELECT request_hash,receipt FROM village_economy_v36_events WHERE user_key=$1 AND request_id=$2',[userKey,id]);
   if(duplicated.rows.length){
    if(duplicated.rows[0].request_hash!==requestHash){
     await c.query('ROLLBACK');inTransaction=false;
     return respond(res,409,{error:'같은 요청 ID에 서로 다른 거래 정보가 들어왔어요'});
    }
    await c.query('COMMIT');inTransaction=false;
    return respond(res,200,{ok:true,replayed:true,receipt:duplicated.rows[0].receipt,economy:economyView(saved.rows[0].state,now()),version:Number(saved.rows[0].version)});
   }
   const result=economyAction(saved.rows[0].state,action,payload,now());
   const version=Number(saved.rows[0].version)+1;
   await c.query(`UPDATE village_economy_v36_accounts
     SET state=$2::jsonb,version=version+1,updated_at=now() WHERE user_key=$1`,[userKey,JSON.stringify(result.next)]);
   await c.query(`INSERT INTO village_economy_v36_events
     (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
     [userKey,id,requestHash,action,result.receipt.delta,result.receipt.balance,JSON.stringify(result.receipt)]);
   await c.query('COMMIT');inTransaction=false;
   return respond(res,200,{ok:true,version,receipt:result.receipt,economy:economyView(result.next,now())});
  }catch(error){
   if(inTransaction&&c){try{await c.query('ROLLBACK')}catch{}}
   if(error.code==='42P01')return respond(res,503,{error:'서버 경제 데이터베이스 설치가 아직 완료되지 않았어요'});
   if(error.status&&error.status<500)return respond(res,error.status,{error:error.message});
   console.error('v36 economy transaction',error.message,error.code||'');
   return respond(res,500,{error:'경제 거래를 안전하게 처리하지 못했어요. 돈과 물건을 임의로 변경하지 않았습니다'});
  }finally{c?.release()}
 };
}
export default makeEconomyHandler();
