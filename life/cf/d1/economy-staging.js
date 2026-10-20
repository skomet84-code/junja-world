// Cloudflare D1-only v36/v37 trial economy, kept independent from official
// profile coins/XP. All actions use server-owned catalogs, CAS, unique request IDs,
// a hash-linked checkpoint trail, and one SQLite transaction for commits.
import {createHash} from 'node:crypto';
import {startingEconomy,economyAction,economyView} from '../../secure-economy-v36.js';
import {projectEnergy,chargeEnergy,buyEnergy} from '../../action-energy-v47.js';
import {makeCheckpoint,validateCheckpointChain} from '../../economy-integrity-v37.js';
import {userForSession} from './account-staging.js';
const send=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=val=>createHash('sha256').update(val).digest('hex');
const parsed=(val,fallback)=>{try{return JSON.parse(val)}catch{return fallback}};
function canonical(body,mode){
 const action=body?.action;
 const valid=mode==='v36'?['plant','harvest','craft','sell','order','expand','energy_buy','world_spend']:
  ['plant','harvest','craft','sell','order','expand'];
 if(!valid.includes(action))throw Object.assign(Error('지원하지 않는 경제 거래입니다'),{status:400});
 const p=body?.payload&&typeof body.payload==='object'&&!Array.isArray(body.payload)?body.payload:{};
 const payload=action==='plant'?{index:p.index,crop:p.crop}:action==='harvest'?{index:p.index}:
  action==='world_spend'?{kind:p.kind}:
  action==='craft'?{recipe:p.recipe}:action==='sell'?{item:p.item}:action==='order'?{order:p.order}:{};
 return {action,payload};
}
const validContent=request=>request.headers.get('content-type')?.toLowerCase().startsWith('application/json');
export async function handleTrialEconomyD1(request,env,mode){
 if(!env?.DB)return send({error:'Cloudflare D1 연결이 없습니다'},503);
 if(!['GET','POST'].includes(request.method))return send({error:'GET/POST만 허용합니다'},405);
 const url=new URL(request.url);
 if(request.method==='POST'){
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')
   return send({error:'다른 사이트의 요청은 허용하지 않아요'},403);
  if(!validContent(request))return send({error:'JSON 요청만 허용합니다'},415);
 }
 const user=await userForSession(request,env.DB);
 if(!user)return send({error:'로그인이 필요해요'},401);
 const db=env.DB,key=String(user.id),time=new Date();
 try{
  const current=await db.prepare('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?').bind(key).first();
  const state=current?parsed(current.state,startingEconomy()):startingEconomy();
  const version=Number(current?.version??0);
  const rows=current?(await db.prepare('SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 25').bind(key).all()).results||[]:[];
  const snapshots=rows.map(x=>({...x,state:parsed(x.state,{})}));
  const audit=snapshots.length?validateCheckpointChain(key,{version,state},snapshots):
   {ok:false,reason:'trial_account_not_created'};
  if(request.method==='GET'){
   const events=current?(await db.prepare('SELECT receipt FROM village_economy_v36_events WHERE user_key=? ORDER BY id DESC LIMIT 8').bind(key).all()).results||[]:[];
   const result={ok:true,trial:true,version,economy:economyView(state,time),receipts:events.map(x=>parsed(x.receipt,{})),audit};
   if(mode==='v36'){
    result.energy=projectEnergy(state,time);
    // Read-only, authenticated reconciliation of an uncertain action charge.
    // Never retry or mint an old activity merely to learn whether it happened.
    const lookup=url.searchParams.get('requestId');
    if(lookup!==null){
     if(!uuid.test(lookup))return send({error:'행동력 요청번호 형식 오류'},400);
     const event=current?await db.prepare('SELECT receipt,action FROM village_economy_v36_events WHERE user_key=? AND request_id=?')
      .bind(key,lookup).first():null;
     const receipt=event?parsed(event.receipt,{}):null;
     result.transaction={found:Boolean(event),kind:event?.action==='world_spend'?receipt?.kind||null:null,
      isWorldSpend:event?.action==='world_spend'};
    }
   }
   return send(result);
  }
  const raw=await request.text();
  if(raw.length>20000)return send({error:'요청이 너무 길어요'},413);
  const body=parsed(raw,null);
  if(!body||typeof body!=='object'||Array.isArray(body))return send({error:'JSON 본문이 필요해요'},400);
  const requestId=body.requestId;
  if(typeof requestId!=='string'||!uuid.test(requestId))return send({error:'거래 요청번호(UUID)를 확인해 주세요'},400);
  const {action,payload}=canonical(body,mode);
  const requestHash=hash(JSON.stringify({action,payload}));
  if(current){
   const old=await db.prepare('SELECT request_hash,receipt FROM village_economy_v36_events WHERE user_key=? AND request_id=?').bind(key,requestId).first();
   if(old){
    if(old.request_hash!==requestHash)return send({error:'같은 요청번호로 다른 거래를 할 수 없어요'},409);
    const replay={ok:true,replayed:true,version,receipt:parsed(old.receipt,{}),economy:economyView(state,time),audit};
    if(mode==='v36')replay.energy=projectEnergy(state,time);
    return send(replay);
   }
   if(snapshots.length&&!audit.ok)return send({error:'시험 경제 장부의 무결성을 확인할 수 없어요',reason:audit.reason},409);
  }
  let change,energy=null;
  if(mode==='v36'&&action==='world_spend'){
   const kind=payload.kind;
   if(!['plant','harvest','gather','fish','craft','order','business_produce'].includes(kind))
    return send({error:'이 행동에는 행동력을 사용할 수 없어요'},400);
   const charged=chargeEnergy(state,kind,time);
   change={next:charged.next,receipt:{action,kind,detail:'마을 활동 · '+kind+' · 행동력 -'+charged.cost,
    delta:0,balance:charged.next.coins,day:charged.energy.day,at:time.toISOString()}};
   energy=charged.energy;
  }else if(mode==='v36'&&action==='energy_buy'){
   const purchased=buyEnergy(state,time);
   change={next:purchased.next,receipt:{action,detail:purchased.detail,
    delta:purchased.delta,balance:purchased.next.coins,day:purchased.energy.day,at:time.toISOString()}};
   energy=purchased.energy;
  }else{
   const charged=mode==='v36'?chargeEnergy(state,action,time):null;
   change=economyAction(charged?.next||state,action,payload,time);
   if(mode==='v36')energy=projectEnergy(change.next,time);
  }
  const baseline=snapshots.length?null:makeCheckpoint(key,version,state);
  const prior=snapshots[0]?.state_hash||baseline.state_hash;
  const nextVersion=version+1,checkpoint=makeCheckpoint(key,nextVersion,change.next,prior,requestId);
  // A one-time idempotent account creation does not create any gold from
  // user-controlled payloads; the fixed trial starting state comes from code.
  if(!current)await db.prepare('INSERT OR IGNORE INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)')
   .bind(key,JSON.stringify(state),time.toISOString()).run();
  const steps=[];
  if(baseline)steps.push(db.prepare(`INSERT INTO village_economy_v37_checkpoints
    (user_key,version,state,previous_hash,state_hash,request_id,created_at)
    VALUES(?,?,?,?,?,?,?)`).bind(key,baseline.version,JSON.stringify(baseline.state),baseline.previous_hash,baseline.state_hash,null,time.toISOString()));
  const updateIndex=steps.length;
  steps.push(db.prepare(`UPDATE village_economy_v36_accounts SET state=?,version=?,updated_at=?
   WHERE user_key=? AND version=?`).bind(JSON.stringify(change.next),nextVersion,time.toISOString(),key,version));
  const receipt=change.receipt;
  steps.push(db.prepare(`INSERT INTO village_economy_v36_events
   (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
   SELECT ?,?,?,?,?,?,?,? WHERE
   EXISTS(SELECT 1 FROM village_economy_v36_accounts WHERE user_key=? AND version=?)`)
   .bind(key,requestId,requestHash,action,receipt.delta,receipt.balance,JSON.stringify(receipt),time.toISOString(),key,nextVersion));
  steps.push(db.prepare(`INSERT INTO village_economy_v37_checkpoints
   (user_key,version,state,previous_hash,state_hash,request_id,created_at)
   SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM village_economy_v36_events WHERE user_key=? AND request_id=?)`)
   .bind(key,checkpoint.version,JSON.stringify(checkpoint.state),checkpoint.previous_hash,checkpoint.state_hash,requestId,time.toISOString(),key,requestId));
  const changes=await db.batch(steps);
  if(changes[updateIndex]?.meta?.changes!==1 ||
     changes[updateIndex+1]?.meta?.changes!==1 ||
     changes[updateIndex+2]?.meta?.changes!==1)
   return send({error:'다른 화면에서 거래가 먼저 저장됐어요. 다시 확인해 주세요',reason:'version_conflict'},409);
  const result={ok:true,trial:true,version:nextVersion,receipt,economy:economyView(change.next,time),
   audit:{ok:true,version:nextVersion,checked:baseline?2:Math.min(25,snapshots.length+1)}};
  if(mode==='v36')result.energy=energy;
  return send(result);
 }catch(error){
  if(error.status&&error.status<500)return send({error:error.message},error.status);
  console.error('D1 experimental economy transaction failed',error?.name);
  return send({error:'시험 경제 처리가 실패했어요. 골드와 재고를 임의로 변경하지 않았어요'},503);
 }
}
