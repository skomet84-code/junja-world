// JUNJA v40 standalone API. All monetary changes are to the TEST server economy only.
import pg from 'pg';
import {createHash} from 'node:crypto';
import {startingEconomy} from '../secure-economy-v36.js';
import {currentProfession} from '../professions-v39.js';
import {buildWorkshop,upgradeWorkshop,manufactureWorkshopItem,workshopView,businessWeekBeginning,WORKSHOP_TYPES} from '../business-v40.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
import {relocateWorkshop} from '../workshop-plots-v41.js';
import {chargeEnergy,projectEnergy} from '../action-energy-v47.js';

const livePool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const send=(res,status,value)=>res.status(status).json(value);
function session(req){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('village_session='))?.slice(16)||''}
function sameOrigin(req){
 try{const u=new URL(req.headers.origin);return ['http:','https:'].includes(u.protocol)&&u.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&!['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');}
 catch{return false}
}
const actions=['harvest','craft','sell','market_sold','business_produce'];
async function activity(client,key,state){
 const profession=currentProfession(state);
 if(!profession)return {};
 const result=await client.query(`SELECT action,count(*)::int AS total FROM village_economy_v36_events
  WHERE user_key=$1 AND created_at >= $2::timestamptz AND action=ANY($3::text[])
  GROUP BY action`,[key,profession.activeSince,actions]);
 return Object.fromEntries(result.rows.map(r=>[r.action,Number(r.total)]));
}
async function audit(client,key,record,initialize=false){
 const result=await client.query(`SELECT version,state,previous_hash,state_hash,request_id
  FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25`,[key]);
 if(result.rows.length){
  const checked=validateCheckpointChain(key,record,result.rows);
  if(!checked.ok&&initialize)fail('복구 장부와 재산이 달라 사업 거래를 멈췄어요: '+checked.reason);
  return {audit:checked,hash:result.rows[0].state_hash};
 }
 if(!initialize)return {audit:{ok:false,reason:'not_initialized'},hash:null};
 const base=makeCheckpoint(key,Number(record.version),record.state);
 await client.query(`INSERT INTO village_economy_v37_checkpoints
  (user_key,version,state,previous_hash,state_hash,request_id) VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
 [key,base.version,JSON.stringify(base.state),null,base.state_hash,null]);
 return {audit:{ok:true},hash:base.state_hash};
}
async function weekly(client,now){
 const start=businessWeekBeginning(now).toISOString(),board={};
 for(const role of Object.keys(WORKSHOP_TYPES)){
  const rows=await client.query(`SELECT e.user_key,COALESCE(u.nickname,'마을 주민') AS name,
    count(*)::int AS total FROM village_economy_v36_events e
    LEFT JOIN village_users u ON u.id::text=e.user_key
    WHERE e.action='business_produce' AND e.receipt->>'role'=$1
      AND e.created_at >= $2::timestamptz
    GROUP BY e.user_key,u.nickname ORDER BY total DESC,e.user_key ASC LIMIT 5`,[role,start]);
  board[role]=rows.rows.map((r,i)=>({rank:i+1,name:r.name,total:Number(r.total)}));
 }
 return {weekStart:start,board};
}
export function makeBusinessHandler({pool=livePool,now=()=>new Date()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'허용하지 않는 요청'});
  if(process.env.ENABLE_VILLAGE_BUSINESS_V40!=='true')return send(res,503,{error:'개인 사업장 기능은 아직 시험 중이에요'});
  if(pool===livePool&&!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL)return send(res,503,{error:'서버 DB 연결이 필요해요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return send(res,403,{error:'같은 게임에서 보낸 JSON 요청만 허용해요'});
  const token=session(req);if(!/^[a-f0-9]{64}$/.test(token))return send(res,401,{error:'로그인이 필요해요'});
  let c=null,tx=false;
  try{
   c=await pool.connect();
   const found=await c.query(`SELECT u.id FROM village_sessions s JOIN village_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(token)]);
   if(!found.rows.length)return send(res,401,{error:'로그인 시간이 만료됐어요'});
   const key=String(found.rows[0].id),time=now();
   if(req.method==='GET'){
    const read=await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[key]);
    const account=read.rows[0]||{state:startingEconomy(),version:0};
    const [proof,ranking,checked]=await Promise.all([activity(c,key,account.state),weekly(c,time),
     read.rows.length?audit(c,key,account,false):Promise.resolve({audit:{ok:false,reason:'not_created'}})]);
    return send(res,200,{ok:true,trial:true,coins:account.state.coins,version:Number(account.version),
     business:workshopView(account.state,proof,time),rankings:ranking,audit:checked.audit,
     energy:process.env.ENABLE_VILLAGE_ENERGY_V47==='true'?projectEnergy(account.state,time):null});
   }
   const {requestId,action,role,site}=req.body||{};
   if(typeof requestId!=='string'||!uuid.test(requestId))return send(res,400,{error:'중복 거래 방지 요청번호가 필요해요'});
   if(!['build','upgrade','produce','place'].includes(action)||typeof role!=='string'||!Object.hasOwn(WORKSHOP_TYPES,role))
    return send(res,400,{error:'올바른 사업장과 행동을 선택해 주세요'});
   if(action==='place'&&process.env.ENABLE_VILLAGE_WORKSHOPS_V41!=='true')
    return send(res,503,{error:'3D 사업장 배치는 아직 비활성화 상태예요'});
   const requestHash=hash(JSON.stringify(action==='place'?{action,role,site}:{action,role}));
   await c.query('BEGIN');tx=true;
   await c.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
    VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   const record=(await c.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key])).rows[0];
   if(!record)fail('경제 계정 잠금 실패',500);
   const previous=await c.query('SELECT request_hash,receipt FROM village_economy_v36_events WHERE user_key=$1 AND request_id=$2',[key,requestId]);
   if(previous.rows.length){
    if(previous.rows[0].request_hash!==requestHash)fail('같은 요청번호로 다른 거래는 불가능해요');
    await c.query('COMMIT');tx=false;
    return send(res,200,{ok:true,replayed:true,receipt:previous.rows[0].receipt,coins:record.state.coins,
      business:workshopView(record.state,await activity(c,key,record.state),time),
      energy:process.env.ENABLE_VILLAGE_ENERGY_V47==='true'?projectEnergy(record.state,time):null});
   }
   const snapshot=await audit(c,key,record,true);
   const proof=await activity(c,key,record.state);
   const change=action==='build'?buildWorkshop(record.state,role,proof,time):
    action==='upgrade'?upgradeWorkshop(record.state,role,proof):
    action==='place'?relocateWorkshop(record.state,role,site,time):manufactureWorkshopItem(record.state,role,proof);
   // Charge energy only after the real server manufacture succeeds. A shortage
   // throws and rolls back the entire craft/fee/inventory transaction.
   if(action==='produce'&&process.env.ENABLE_VILLAGE_ENERGY_V47==='true'){
    const used=chargeEnergy(change.next,'business_produce',time);
    change.next=used.next;
   }
   const version=Number(record.version)+1;if(!Number.isSafeInteger(version))fail('저장 버전 한도 초과',500);
   const receipt={action:action==='produce'?'business_produce':action==='build'?'business_build':action==='place'?'business_place':'business_upgrade',
    detail:change.detail,delta:change.delta,balance:change.next.coins,role,site:action==='place'?site:null,product:change.product||null,level:change.level,
    at:time.toISOString()};
   await c.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,version=version+1,updated_at=now() WHERE user_key=$1`,
    [key,JSON.stringify(change.next)]);
   await c.query(`INSERT INTO village_economy_v36_events
    (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[key,requestId,requestHash,receipt.action,change.delta,change.next.coins,JSON.stringify(receipt)]);
   const next=makeCheckpoint(key,version,change.next,snapshot.hash,requestId);
   await c.query(`INSERT INTO village_economy_v37_checkpoints
    (user_key,version,state,previous_hash,state_hash,request_id)
    VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,version,JSON.stringify(next.state),next.previous_hash,next.state_hash,requestId]);
   await c.query('COMMIT');tx=false;
   return send(res,200,{ok:true,version,receipt,coins:change.next.coins,
    business:workshopView(change.next,await activity(c,key,change.next),time),
    energy:process.env.ENABLE_VILLAGE_ENERGY_V47==='true'?projectEnergy(change.next,time):null});
  }catch(e){
   if(tx&&c){try{await c.query('ROLLBACK')}catch{}}
   if(e.status&&e.status<500)return send(res,e.status,{error:e.message});
   if(e.code==='42P01')return send(res,503,{error:'시험 서버 경제 테이블이 아직 준비되지 않았어요'});
   console.error('v40 business transaction',e.code||'',e.message);
   return send(res,500,{error:'사업 거래를 안전하게 처리하지 못했어요. 자산을 임의로 변경하지 않았습니다'});
  }finally{c?.release()}
 };
}
export default makeBusinessHandler();
