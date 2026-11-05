// Server-authoritative v51 QUESTS for the existing Cloudflare SQLite economy.
// Progress is derived ONLY from persisted server receipts; never from client
// progress or device localStorage. Rewards use trial-economy gold, not character XP.
import {createHash,randomUUID} from 'node:crypto';
import {startingEconomy} from '../../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../../economy-integrity-v37.js';
import {userForSession} from '../d1/account-staging.js';

export const QUESTS_V51=Object.freeze([
 {id:'welcome_career',scope:'once',action:'profession_register',need:1,gold:320,icon:'🧑‍🌾',title:'나만의 직업 갖기',hint:'직업 센터에서 농부·요리사·상인 중 하나의 면허를 취득해요'},
 {id:'market_debut',scope:'once',action:'market_list',need:1,gold:180,icon:'🛍️',title:'첫 판매 등록',hint:'주민 거래소에 내 물건을 등록해요'},
 {id:'market_buyer',scope:'once',action:'market_buy',need:1,gold:200,icon:'🎁',title:'이웃에게 첫 구매',hint:'다른 친구가 올린 물건을 처음 구매해요'},
 {id:'market_seller',scope:'once',action:'market_sold',need:1,gold:280,icon:'🤝',title:'첫 판매 성사',hint:'내 물건을 다른 친구에게 판매해요'},
 {id:'workshop_founder',scope:'once',action:'business_build',need:1,gold:460,icon:'🏭',title:'나만의 사업장 개업',hint:'숙련 직업인이 되어 개인 사업장을 세워요'},
 {id:'workshop_maker',scope:'once',action:'business_produce',need:1,gold:360,icon:'📦',title:'첫 전문 생산품',hint:'사업장에서 재료를 가공해 상품을 만들어요'},
 {id:'daily_sowing',scope:'daily',action:'plant',need:2,gold:90,icon:'🌱',title:'오늘의 씨앗 심기',hint:'시험 농장에 작물 2회 심기'},
 {id:'daily_harvesting',scope:'daily',action:'harvest',need:2,gold:140,icon:'🍎',title:'오늘의 수확',hint:'시험 농장에서 작물 2회 수확하기'},
 {id:'daily_market',scope:'daily',action:'market_list',need:1,gold:110,icon:'🛒',title:'오늘의 거래소 활동',hint:'오늘 주민 거래소에 상품 1회 등록하기'},
 {id:'daily_craft',scope:'daily',action:'business_produce',need:1,gold:230,icon:'🥧',title:'오늘의 전문 생산',hint:'오늘 개인 사업장에서 상품 1회 생산하기'}
]);
const send=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sha=s=>createHash('sha256').update(s).digest('hex');
const one=(sql,q,...a)=>sql.exec(q,...a).toArray()[0]||null;
const rows=(sql,q,...a)=>sql.exec(q,...a).toArray();
const parse=s=>{try{return JSON.parse(s)}catch{const e=new Error('경제 장부가 유효하지 않아 보상 지급을 중단했어');e.status=409;throw e}};
const reject=(message,status=409)=>{let e=new Error(message);e.status=status;throw e};
const localDay=date=>{
 const fields=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(date).map(part=>[part.type,part.value]));
 return fields.year+'-'+fields.month+'-'+fields.day;
};
function dayStart(day){return new Date(day+'T00:00:00+09:00').toISOString()}
const claimKey=(quest,day)=>quest.scope==='once'?'once:'+quest.id:day+':'+quest.id;
function currentProgress(sql,user,quest,start){
 const r=quest.scope==='once'?
  one(sql,'SELECT count(*) AS n FROM village_economy_v36_events WHERE user_key=? AND action=?',user,quest.action):
  one(sql,'SELECT count(*) AS n FROM village_economy_v36_events WHERE user_key=? AND action=? AND created_at>=?',user,quest.action,start);
 return Math.min(quest.need,Math.max(0,Number(r?.n||0)));
}
function resultRows(sql,user,now){
 const day=localDay(now),start=dayStart(day);
 const claimed=new Set(rows(sql,'SELECT quest_key FROM village_quest_claims_v51 WHERE user_id=?',user).map(r=>r.quest_key));
 return {day,quests:QUESTS_V51.map(q=>({
  ...q,done:currentProgress(sql,user,q,start),claimed:claimed.has(claimKey(q,day)),
  claimable:!claimed.has(claimKey(q,day))&&currentProgress(sql,user,q,start)>=q.need
 }))};
}
function checkpointPrevious(sql,user,old){
 const found=rows(sql,`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 25`,user)
 .map(v=>({...v,state:parse(v.state)}));
 if(found.length){
  const audit=validateCheckpointChain(user,old,found);
  if(!audit.ok)reject('경제 보상 장부가 일치하지 않아 지급을 중단했어');
  return found[0].state_hash;
 }
 const base=makeCheckpoint(user,old.version,old.state);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
 (user_key,version,state,previous_hash,state_hash,request_id,created_at)
 VALUES(?,?,?,?,?,?,?)`,user,old.version,JSON.stringify(old.state),null,base.state_hash,null,new Date().toISOString());
 return base.state_hash;
}
function claim(sql,user,input,date){
 if(!input||typeof input!=='object'||Array.isArray(input))reject('퀘스트 요청 형식이 올바르지 않아',400);
 const {questId,requestId}=input;
 const quest=QUESTS_V51.find(q=>q.id===questId);
 if(!quest)reject('없는 의뢰야',404);
 if(typeof requestId!=='string'||!uuid.test(requestId))reject('보상 수령번호가 유효하지 않아',400);
 const day=localDay(date),key=claimKey(quest,day),now=date.toISOString();
 const existing=one(sql,'SELECT quest_key,request_id,gold FROM village_quest_claims_v51 WHERE user_id=? AND quest_key=?',user,key);
 if(existing){
  if(existing.request_id===requestId)return {ok:true,replayed:true,claimed:true,questId,gold:existing.gold};
  reject('이미 수령한 퀘스트 보상이야');
 }
 const other=one(sql,'SELECT quest_key FROM village_quest_claims_v51 WHERE user_id=? AND request_id=?',user,requestId);
 if(other)reject('같은 보상 요청번호를 다른 퀘스트에 사용할 수 없어');
 const completed=currentProgress(sql,user,quest,dayStart(day));
 if(completed<quest.need)reject('서버에서 확인된 활동이 부족해. '+completed+'/'+quest.need);
 let current=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',user);
 if(!current){
  sql.exec('INSERT OR IGNORE INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)',
   user,JSON.stringify(startingEconomy()),now);
  current=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',user);
 }
 if(!current)reject('보상 계정을 준비하지 못했어',503);
 const original={state:parse(current.state),version:Number(current.version)};
 if(!Number.isSafeInteger(original.state.coins)||original.state.coins<0||original.state.coins>1000000000000-quest.gold)
  reject('시험 골드 한도를 초과해 보상을 받을 수 없어');
 const previousHash=checkpointPrevious(sql,user,original);
 const next={...original.state,coins:original.state.coins+quest.gold},version=original.version+1;
 sql.exec('UPDATE village_economy_v36_accounts SET state=?,version=?,updated_at=? WHERE user_key=? AND version=?',
  JSON.stringify(next),version,now,user,original.version);
 if(Number(one(sql,'SELECT changes() AS n')?.n)!==1)reject('동시 저장 충돌로 보상 지급을 중단했어');
 const receipt={action:'quest_claim_v51',questId,detail:quest.title,delta:quest.gold,balance:next.coins,at:now,day};
 const requestHash=sha(JSON.stringify({action:'quest_claim_v51',questId,claimKey:key}));
 sql.exec(`INSERT INTO village_economy_v36_events
 (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
 VALUES(?,?,?,?,?,?,?,?)`,user,requestId,requestHash,'quest_claim_v51',quest.gold,next.coins,JSON.stringify(receipt),now);
 const nextCheckpoint=makeCheckpoint(user,version,next,previousHash,requestId);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
 (user_key,version,state,previous_hash,state_hash,request_id,created_at)
 VALUES(?,?,?,?,?,?,?)`,user,version,JSON.stringify(next),nextCheckpoint.previous_hash,nextCheckpoint.state_hash,requestId,now);
 sql.exec('INSERT INTO village_quest_claims_v51(user_id,quest_key,request_id,gold,claimed_at) VALUES(?,?,?,?,?)',
  user,key,requestId,quest.gold,now);
 return {ok:true,claimed:true,questId,gold:quest.gold,balance:next.coins,version};
}
export function installV51QuestSchema(sql){
 sql.exec(`CREATE TABLE IF NOT EXISTS village_quest_claims_v51(
  user_id TEXT NOT NULL REFERENCES village_users(id) ON DELETE CASCADE,
  quest_key TEXT NOT NULL,
  request_id TEXT NOT NULL,
  gold INTEGER NOT NULL CHECK(gold>0),
  claimed_at TEXT NOT NULL,
  PRIMARY KEY(user_id,quest_key),UNIQUE(user_id,request_id)
 )`);
}
export async function handleQuestsV51(request,storage,db){
 if(!['GET','POST'].includes(request.method))return send({error:'GET/POST만 지원해'},405);
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
   return send({error:'같은 마을에서만 보상을 수령할 수 있어'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return send({error:'JSON 보상 요청만 지원해'},415);
 }
 const user=await userForSession(request,db);
 if(!user)return send({error:'의뢰는 로그인 후 이용할 수 있어'},401);
 try{
  if(request.method==='GET')return send({ok:true,trial:true,...resultRows(storage.sql,user.id,new Date())});
  const raw=await request.text();
  if(raw.length>10000)return send({error:'보상 요청이 너무 길어'},413);
  let input;try{input=JSON.parse(raw)}catch{return send({error:'JSON 형식 오류'},400)}
  const result=storage.transactionSync(()=>claim(storage.sql,user.id,input,new Date()));
  return send(result);
 }catch(e){
  if(e.status&&e.status<500)return send({error:e.message},e.status);
  console.error('v51 quest claim refused',e?.name);
  return send({error:'보상 저장에 문제가 생겼어. 시험 골드는 지급되지 않았어.'},503);
 }
}
