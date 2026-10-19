// Authenticated D1 account extensions: world presence, nickname resolution,
// administrative grants, save edits, and server-wallet transfers.
// Fresh accounts only; all state lives in Cloudflare D1.
import {randomUUID} from 'node:crypto';
import {CATALOG_BY_ID} from '../../fashion-catalog.js';
const send=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const json=s=>{try{return JSON.parse(s)}catch{return {}}};
const validKey=s=>typeof s==='string'&&/^[-a-zA-Z0-9]{16,80}$/.test(s);
const validAmount=n=>Number.isSafeInteger(n)&&n>0&&n<=1000000000000;
const now=()=>new Date().toISOString();
export async function handleAccountExtras({action,request,db,user,data,url}){
 const owner=user.role==='admin'&&user.username==='admin_junja2';
 if(action==='online'&&request.method==='GET'){
  const rows=await db.prepare(`SELECT u.username,u.nickname,u.role,p.x,p.y,
   COALESCE(CAST(json_extract(s.profile,'$.xp') AS REAL),p.xp,0) AS xp
   FROM village_presence p JOIN village_users u ON u.id=p.user_id
   LEFT JOIN village_saves s ON s.user_id=u.id
   WHERE p.updated_at>? ORDER BY xp DESC,u.username ASC LIMIT 100`)
   .bind(new Date(Date.now()-90000).toISOString()).all();
  return send({players:(rows.results||[]).map((p,i)=>({
   username:p.username,nickname:p.nickname,role:p.role,x:p.x,y:p.y,
   level:Math.max(1,Math.floor(Number(p.xp)/160)+1),rank:i+1
  }))});
 }
 if(action==='presence'&&request.method==='POST'){
  const x=Number(data.x),y=Number(data.y),xp=Number(data.xp);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>10000||y<0||y>10000||
     !Number.isFinite(xp)||xp<0||xp>1000000000)return send({error:'위치 오류'},400);
  await db.prepare(`INSERT INTO village_presence(user_id,x,y,xp,updated_at) VALUES(?,?,?,?,?)
   ON CONFLICT(user_id) DO UPDATE SET x=excluded.x,y=excluded.y,xp=excluded.xp,updated_at=excluded.updated_at
   WHERE village_presence.updated_at<=?`)
   .bind(user.id,x,y,xp,now(),new Date(Date.now()-25000).toISOString()).run();
  const q=await db.prepare(`SELECT u.username,u.nickname,p.x,p.y FROM village_presence p
   JOIN village_users u ON u.id=p.user_id
   WHERE p.updated_at>? AND p.user_id<>? LIMIT 30`)
   .bind(new Date(Date.now()-90000).toISOString(),user.id).all();
  return send({players:q.results||[]});
 }
 if(action==='resolve_recipient'&&request.method==='GET'){
  const nickname=String(url.searchParams.get('nickname')||'').trim();
  if(!nickname||nickname.length>12)return send({error:'닉네임을 입력해주세요'},400);
  const target=await db.prepare('SELECT id,nickname FROM village_users WHERE nickname=?').bind(nickname).first();
  if(!target)return send({error:'해당 닉네임의 친구가 없어요'},404);
  if(target.id===user.id)return send({error:'자기 자신에게 송금할 수 없어요'},400);
  return send({nickname:target.nickname});
 }
 if(action==='admin_users'&&request.method==='GET'){
  if(!owner)return send({error:'최고관리자 전용'},403);
  const q=await db.prepare(`SELECT u.username,u.nickname,u.role,u.created_at,u.last_login_at,
    CAST(COALESCE(w.balance,0) AS TEXT) AS balance,s.version
    FROM village_users u LEFT JOIN village_wallets w ON w.user_id=u.id
    LEFT JOIN village_saves s ON s.user_id=u.id ORDER BY u.created_at DESC LIMIT 200`).all();
  return send({users:q.results||[]});
 }
 if(action==='admin_character'&&request.method==='POST'){
  if(!owner)return send({error:'최고관리자 전용'},403);
  const recipient=String(data.recipient||'').trim().toLowerCase(),mode=String(data.mode||''),
   value=Number(data.value),item=String(data.item||'');
  if(!/^[a-z0-9_]{4,24}$/.test(recipient))return send({error:'대상 아이디 오류'},400);
  if(mode==='level'&&(!Number.isSafeInteger(value)||value<1||value>100000000))return send({error:'레벨 값 오류'},400);
  if(['coins','coins_add','coins_take'].includes(mode)&&(!Number.isSafeInteger(value)||value<0||value>1000000000000))
   return send({error:'골드 값 오류'},400);
  if(mode==='item'&&!CATALOG_BY_ID[item]&&!/^auto_fish_pass_(1|3|6|12|24)$/.test(item))
   return send({error:'아이템 ID 오류'},400);
  if(!['level','coins','coins_add','coins_take','item'].includes(mode))return send({error:'기능 오류'},400);
  const target=await db.prepare('SELECT id FROM village_users WHERE username=?').bind(recipient).first();
  if(!target)return send({error:'대상 계정 없음'},404);
  const save=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(target.id).first();
  const profile=save?json(save.profile):{xp:0,coins:1000},owned=save?save.owned:'[]',version=save?.version||0;
  if(mode==='level'){
   profile.xp=(value-1)*160;
   const history=Array.isArray(profile.__levelHistory)?profile.__levelHistory.slice(-19):[];
   history.push({version:version+1,level:value,at:now(),source:'admin'});
   profile.__levelHistory=history.slice(-20);profile.__confirmedLevel=value;
  }
  if(mode==='coins')profile.coins=value;
  if(mode==='coins_add')profile.coins=Math.min(1000000000000,Math.max(0,Number(profile.coins)||0)+value);
  if(mode==='coins_take')profile.coins=Math.max(0,(Number(profile.coins)||0)-value);
  if(mode==='item'){
   if(/^auto_fish_pass_(1|3|6|12|24)$/.test(item)){
    const hours=Number(item.split('_').pop());
    profile.autoFishing=profile.autoFishing&&typeof profile.autoFishing==='object'?profile.autoFishing:{};
    profile.autoFishing.remainingMs=Math.min(604800000,Math.max(0,Number(profile.autoFishing.remainingMs)||0)+hours*3600000);
   }else{
    profile.fashion=profile.fashion||{};
    profile.fashion.owned=Array.isArray(profile.fashion.owned)?profile.fashion.owned:[];
    if(!profile.fashion.owned.includes(item))profile.fashion.owned.push(item);
   }
  }
  profile.__adminRevision=(Number(profile.__adminRevision)||0)+1;
  const stored=JSON.stringify(profile),at=now();
  const update=save?
   await db.prepare('UPDATE village_saves SET profile=?,version=version+1,updated_at=? WHERE user_id=? AND version=?')
    .bind(stored,at,target.id,version).run():
   await db.prepare('INSERT OR IGNORE INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)')
    .bind(target.id,stored,owned,1,at).run();
  if(update.meta?.changes!==1)return send({error:'해당 계정의 저장 내용이 변경됐어요. 다시 시도해 주세요'},409);
  return send({ok:true,message:'캐릭터 변경 완료',version:version+1});
 }
 if(['transfer','admin_grant','admin_reclaim'].includes(action)&&request.method==='POST'){
  if(action!=='transfer'&&!owner)return send({error:'최고관리자 전용'},403);
  const amount=Number(data.amount),key=String(data.key||'');
  if(!validAmount(amount)||!validKey(key))return send({error:'금액 또는 중복방지 요청번호 오류'},400);
  const nickname=action==='transfer'?String(data.recipient||'').trim():null;
  const recipient=action==='transfer'?nickname:String(data.recipient||'').trim().toLowerCase();
  if(!recipient)return send({error:'대상 계정을 확인해 주세요'},400);
  const target=action==='transfer'?
   await db.prepare('SELECT id,nickname FROM village_users WHERE nickname=?').bind(recipient).first():
   await db.prepare('SELECT id,nickname FROM village_users WHERE username=?').bind(recipient).first();
  if(!target)return send({error:'대상 회원을 찾지 못했어요'},404);
  if(action==='transfer'&&(target.id===user.id||String(data.confirmedNickname||'')!==target.nickname))
   return send({error:'수신인 닉네임을 다시 확인해 주세요'},409);
  const duplicate=await db.prepare('SELECT id FROM village_wallet_transfers WHERE idempotency_key=?').bind(key).first();
  if(duplicate)return send({error:'이미 처리된 거래번호예요'},409);
  // All statements in D1.batch are one SQLite transaction. The transfer insert
  // first enforces balance and cap; subsequent changes are conditional on its ID.
  const txId=randomUUID(),at=now(),kind=action==='transfer'?'peer':action;
  const payer=action==='transfer'?user.id:action==='admin_reclaim'?target.id:null;
  const payee=action==='transfer'?target.id:action==='admin_grant'?target.id:null;
  const recipientId=target.id;
  const statements=[];
  for(const uid of new Set([user.id,target.id])){
   statements.push(db.prepare('INSERT OR IGNORE INTO village_wallets(user_id,balance,updated_at) VALUES(?,0,?)').bind(uid,at));
  }
  statements.push(db.prepare(`INSERT OR IGNORE INTO village_wallet_transfers
   (id,sender_id,recipient_id,amount,kind,idempotency_key,created_at)
   SELECT ?,?,?,?,?,?,?
   WHERE NOT EXISTS (SELECT 1 FROM village_wallet_transfers WHERE idempotency_key=?)
   AND (? IS NULL OR (SELECT COALESCE(balance,0) FROM village_wallets WHERE user_id=?) >= ?)
   AND (? IS NULL OR (SELECT COALESCE(balance,0) FROM village_wallets WHERE user_id=?) <= ?)`)
   .bind(txId,user.id,recipientId,amount,kind,key,at,key,payer,payer,amount,payee,payee,1000000000000-amount));
  if(payer)statements.push(db.prepare(`UPDATE village_wallets SET balance=balance-?,updated_at=?
   WHERE user_id=? AND EXISTS(SELECT 1 FROM village_wallet_transfers WHERE id=? AND idempotency_key=?)`)
   .bind(amount,at,payer,txId,key));
  if(payee)statements.push(db.prepare(`UPDATE village_wallets SET balance=balance+?,updated_at=?
   WHERE user_id=? AND EXISTS(SELECT 1 FROM village_wallet_transfers WHERE id=? AND idempotency_key=?)`)
   .bind(amount,at,payee,txId,key));
  const outcome=await db.batch(statements);
  const index= new Set([user.id,target.id]).size;
  if(outcome[index]?.meta?.changes!==1)return send({error:'잔액·한도 또는 중복 거래번호를 확인해 주세요'},409);
  const source=await db.prepare('SELECT balance FROM village_wallets WHERE user_id=?').bind(user.id).first();
  return send({ok:true,balance:String(source?.balance||0),message:'서버 지갑 처리 완료'});
 }
 // Do not silently pretend the other (experimental) economy endpoints are available.
 return null;
}
