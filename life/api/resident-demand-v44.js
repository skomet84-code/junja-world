// JUNJA v44 — authenticated, server-authoritative orders on isolated test wallet.
// No UPDATE of village_wallets/village_saves or of other accounts. One SQL transaction per sale.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {fulfillResidentOrder,npcOrdersView,NPC_SHOPPERS} from '../resident-demand-v44.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';

const primaryPool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const sha=value=>createHash('sha256').update(value).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deny=(message,status=409)=>{const error=new Error(message);error.status=status;throw error};
const send=(res,status,value)=>res.status(status).json(value);
function authCookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('village_session='))?.slice(16)||''}
function sameOrigin(req){
 try{const url=new URL(req.headers.origin);return ['http:','https:'].includes(url.protocol)&&
 url.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&
 !['cross-site','none','same-site'].includes(req.headers['sec-fetch-site']||'');}
 catch{return false}
}
async function checkChain(client,key,account,initialize){
 const rows=(await client.query(`SELECT version,state,previous_hash,state_hash,request_id
  FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key])).rows;
 if(!rows.length){
  if(!initialize)return {ok:false,reason:'not_initialized',hash:null};
  const base=makeCheckpoint(key,Number(account.version),account.state);
  await client.query(`INSERT INTO village_economy_v37_checkpoints
   (user_key,version,state,previous_hash,state_hash,request_id) VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
   [key,base.version,JSON.stringify(base.state),null,base.state_hash,null]);
  return {ok:true,hash:base.state_hash};
 }
 const audit=validateCheckpointChain(key,account,rows);
 if(!audit.ok&&initialize)deny('주민 주문 거래가 중단됐어요. 장부 검증 오류: '+audit.reason);
 return {...audit,hash:rows[0].state_hash};
}
export function makeResidentDemandHandler({pool=primaryPool,now=()=>new Date()}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'지원하지 않는 주민 주문 요청입니다'});
  if(process.env.ENABLE_VILLAGE_NPC_DEMAND_V44!=='true')
   return send(res,503,{error:'주민 주문 시스템은 아직 시험용으로 비활성화되어 있어요'});
  if(pool===primaryPool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)
   return send(res,503,{error:'시험 데이터베이스가 연결되지 않았어요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'게임 내에서 보낸 주문만 처리할 수 있어요'});
  const token=authCookie(req);
  if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'준자마을 로그인 후 주문을 확인해 주세요'});
  let client=null,tx=false;
  try{
   client=await pool.connect();
   const found=await client.query(`SELECT u.id FROM village_sessions s
    JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [sha(token)]);
   if(!found.rows.length)return send(res,401,{error:'세션이 만료됐어요'});
   const key=String(found.rows[0].id),time=now();
   if(req.method==='GET'){
    const record=(await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key])).rows[0];
    const state=record?.state||startingEconomy();
    const audit=record?await checkChain(client,key,record,false):{ok:false,reason:'not_created'};
    return send(res,200,{ok:true,trial:true,coins:state.coins,version:Number(record?.version||0),
      demand:npcOrdersView(state,time),audit:{ok:audit.ok,reason:audit.reason||null}});
   }
   const {requestId,npcId}=req.body||{};
   if(typeof requestId!=='string'||!uuid.test(requestId))
    return send(res,400,{error:'중복 결제 방지 거래번호를 확인해 주세요'});
   if(typeof npcId!=='string'||!Object.hasOwn(NPC_SHOPPERS,npcId))
    return send(res,400,{error:'올바른 주민 손님을 선택해 주세요'});
   const requestHash=sha(JSON.stringify({action:'npc_purchase',npcId}));
   await client.query('BEGIN');tx=true;
   await client.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
    VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const record=(await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key])).rows[0];
   if(!record)deny('주민 주문 계정을 잠그지 못했어요',500);
   const old=(await client.query(`SELECT request_hash,receipt FROM village_economy_v36_events
    WHERE user_key=$1 AND request_id=$2`,[key,requestId])).rows;
   if(old.length){
    if(old[0].request_hash!==requestHash)deny('같은 요청 번호로 다른 손님에게 판매할 수 없어요');
    await client.query('COMMIT');tx=false;
    return send(res,200,{ok:true,replayed:true,receipt:old[0].receipt,
      coins:record.state.coins,demand:npcOrdersView(record.state,time)});
   }
   const latest=await checkChain(client,key,record,true);
   const sale=fulfillResidentOrder(record.state,npcId,time);
   const version=Number(record.version)+1;
   if(!Number.isSafeInteger(version))deny('경제 장부의 저장 버전이 너무 큽니다',500);
   const receipt={action:'npc_purchase',npcId,role:sale.role,product:sale.product,
    detail:sale.description,delta:sale.delta,balance:sale.next.coins,
    gross:sale.quote.gross,tax:sale.quote.tax,net:sale.quote.net,day:sale.quote.day,
    at:time.toISOString()};
   await client.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,
    version=version+1,updated_at=now() WHERE user_key=$1`,
    [key,JSON.stringify(sale.next)]);
   await client.query(`INSERT INTO village_economy_v36_events
    (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[key,requestId,requestHash,receipt.action,sale.delta,sale.next.coins,JSON.stringify(receipt)]);
   const checkpoint=makeCheckpoint(key,version,sale.next,latest.hash,requestId);
   await client.query(`INSERT INTO village_economy_v37_checkpoints
    (user_key,version,state,previous_hash,state_hash,request_id)
    VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,version,JSON.stringify(checkpoint.state),
    checkpoint.previous_hash,checkpoint.state_hash,requestId]);
   await client.query('COMMIT');tx=false;
   return send(res,200,{ok:true,version,receipt,coins:sale.next.coins,
    demand:npcOrdersView(sale.next,time)});
  }catch(error){
   if(tx&&client){try{await client.query('ROLLBACK')}catch{}}
   if(error.status&&error.status<500)return send(res,error.status,{error:error.message});
   if(error.code==='42P01')return send(res,503,{error:'시험 경제 테이블이 준비되지 않았어요'});
   console.error('v44 NPC order',error.code||'',error.message);
   return send(res,500,{error:'주민 주문 거래를 취소했어요. 골드·재고는 임의 변경하지 않았습니다'});
  }finally{client?.release()}
 };
}
export default makeResidentDemandHandler();
