// Cloudflare D1 account/save implementation for ISOLATED STAGING ONLY.
// NOT production ready: admin transfers, experimental economy, and authenticated
// browser validation must be ported/tested before the Vercel bridge is removed.
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {handleAccountExtras} from './account-extensions.js';
const send=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const sha=s=>createHash('sha256').update(s).digest('hex');
// Fresh start only. WebCrypto PBKDF2 avoids PostgreSQL's legacy scrypt dependency.
const KDF_ITERATIONS=310000;
async function passwordHash(password,salt){
 const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(password)),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Buffer.from(salt,'hex'),iterations:KDF_ITERATIONS,hash:'SHA-256'},raw,256);
 return ['pbkdf2-sha256',String(KDF_ITERATIONS),Buffer.from(bits).toString('hex')].join(':');
}
const cookie=(request,name)=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
const sessionCookie=(token,maxAge=1209600)=>`village_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const now=()=>new Date().toISOString();
const safeJson=(s,fallback)=>{try{return JSON.parse(s)}catch{return fallback}};
const USERNAME=/^[a-z0-9_]{4,24}$/;
const HEX64=/^[a-f0-9]{64}$/;
async function bodyJson(request){
 const raw=await request.text();
 if(raw.length>200000)throw Object.assign(Error('요청 데이터가 너무 커요'),{status:413});
 try{return JSON.parse(raw)}catch{throw Object.assign(Error('JSON 요청을 확인해 주세요'),{status:400})}
}
export async function userForSession(request,db){
 const token=cookie(request,'village_session');
 if(!HEX64.test(token))return null;
 return db.prepare('SELECT u.id,u.username,u.nickname,u.role FROM village_sessions s JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
  .bind(sha(token),now()).first();
}
async function rateLimit(request,db,username){
 // Rate limit the expensive legacy scrypt verifier BEFORE hashing a password.
 const ip=(request.headers.get('cf-connecting-ip')||'unknown').slice(0,100);
 const bucket=Math.floor(Date.now()/900000),key=sha(ip+'|'+username);
 await db.prepare('INSERT INTO village_auth_limits(key_hash,bucket,attempts) VALUES(?,?,1) ON CONFLICT(key_hash,bucket) DO UPDATE SET attempts=attempts+1')
  .bind(key,bucket).run();
 const row=await db.prepare('SELECT attempts FROM village_auth_limits WHERE key_hash=? AND bucket=?').bind(key,bucket).first();
 return Number(row?.attempts||0)<=6;
}
export async function handleAccountD1(request,env){
 if(!env?.DB)return send({error:'D1 데이터베이스 연결 없음 · 기존 저장은 변경하지 않았어요'},503);
 if(!['GET','POST'].includes(request.method))return send({error:'지원하지 않는 요청'},405);
 const url=new URL(request.url),action=url.searchParams.get('action')||'me',db=env.DB,method=request.method;
 if(method==='POST'){
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')
   return send({error:'다른 사이트의 요청은 허용하지 않아요'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return send({error:'JSON 요청만 처리할 수 있어요'},415);
 }
 const data=method==='POST'?await bodyJson(request):{};
 if(!data||typeof data!=='object'||Array.isArray(data))return send({error:'잘못된 요청'},400);
 try{
  // Explicit one-time bootstrap only, with a secret supplied in the Cloudflare
  // dashboard (never in git/chat). Fresh D1 has no inherited administrator.
  if(action==='admin_setup'&&method==='POST'){
   const secret=String(env.VILLAGE_ADMIN_SETUP_TOKEN||''),supplied=String(data.setupCode||'');
   if(secret.length<24||secret.length!==supplied.length||
      !timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))
    return send({error:'운영자 설정 인증에 실패했어요'},403);
   const password=String(data.password||'');
   if(password.length<8||password.length>128)return send({error:'운영자 비밀번호는 8~128자여야 해요'},400);
   const existing=await db.prepare("SELECT id FROM village_users WHERE role='admin' OR username='admin_junja2' LIMIT 1").first();
   if(existing)return send({error:'운영자 계정이 이미 존재해요. 복구 절차를 이용해 주세요'},409);
   const salt=randomBytes(16).toString('hex'),hash=await passwordHash(password,salt),
    id=randomUUID(),at=now();
   try{
    await db.prepare(`INSERT INTO village_users
      (id,username,nickname,password_salt,password_hash,role,created_at)
      VALUES(?,?,?,?,?,'admin',?)`).bind(id,'admin_junja2','준자',salt,hash,at).run();
   }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return send({error:'운영자 계정이 이미 존재해요'},409);throw e}
   return send({ok:true,message:'준자 최고관리자 계정 준비 완료. 이제 로그인해 주세요'},201);
  }
  if(action==='register'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   const nickname=String(data.nickname||username).trim();
   if(!USERNAME.test(username)||['admin_junja','admin_junja2'].includes(username)||password.length<4||password.length>128||!nickname||nickname.length>12)
    return send({error:'아이디 4~24자, 비밀번호 4~128자, 닉네임 1~12자로 입력해 주세요'},400);
   const salt=randomBytes(16).toString('hex'),digest=await passwordHash(password,salt),id=randomUUID(),at=now();
   try{
    await db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)')
     .bind(id,username,nickname,salt,digest,'player',at).run();
   }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return send({error:'이미 사용 중인 아이디 또는 닉네임이에요'},409);throw e}
   return send({ok:true,message:'회원가입 완료. 로그인해 주세요.'},201);
  }
  if(action==='login'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   if(!USERNAME.test(username)||password.length>128)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   if(!await rateLimit(request,db,username))return send({error:'로그인 시도가 많아요. 15분 뒤 다시 시도해 주세요'},429);
   const row=await db.prepare('SELECT id,username,nickname,role,password_salt,password_hash FROM village_users WHERE username=?').bind(username).first();
   // Always derive a hash, including unknown accounts. Old Neon scrypt hashes are
   // intentionally NOT imported into the fresh-start Cloudflare account system.
   const digest=await passwordHash(password,row?.password_salt||'00'.repeat(16));
   const valid=!!row && typeof row.password_hash==='string' &&
    /^pbkdf2-sha256:310000:[a-f0-9]{64}$/.test(row.password_hash) &&
    timingSafeEqual(Buffer.from(digest),Buffer.from(row.password_hash));
   if(!valid)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   const token=randomBytes(32).toString('hex'),at=now();
   const expires=new Date(Date.now()+1209600000).toISOString();
   await db.batch([
    db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(sha(token),row.id,expires,at),
    db.prepare('UPDATE village_users SET last_login_at=? WHERE id=?').bind(at,row.id)
   ]);
   return send({ok:true,user:{username:row.username,nickname:row.nickname,role:row.role}},200,{'set-cookie':sessionCookie(token)});
  }
  const user=await userForSession(request,db);
  if(action==='logout'&&method==='POST'){
   const token=cookie(request,'village_session');
   if(HEX64.test(token))await db.prepare('DELETE FROM village_sessions WHERE token_hash=?').bind(sha(token)).run();
   return send({ok:true},200,{'set-cookie':sessionCookie('',0)});
  }
  if(!user)return send({error:'로그인이 필요해요'},401);
  if(action==='me'&&method==='GET'){
   const wallet=await db.prepare('SELECT balance FROM village_wallets WHERE user_id=?').bind(user.id).first();
   return send({user,balance:String(wallet?.balance??0)});
  }
  if(action==='save'&&method==='GET'){
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   return send({save:row?{profile:safeJson(row.profile,{}),owned:safeJson(row.owned,[]),version:row.version}:null});
  }
  if(action==='save'&&method==='POST'){
   const profile=data.profile,owned=data.owned,version=data.version;
   if(!profile||typeof profile!=='object'||Array.isArray(profile)||!Array.isArray(owned)||owned.length>1000||JSON.stringify(profile).length>150000)
    return send({error:'저장 데이터 형식 오류'},400);
   if(!Number.isSafeInteger(version)||version<0)return send({error:'저장 버전 확인이 필요해요',reason:'update_required'},428);
   const xp=Number(profile.xp);
   if(!Number.isFinite(xp)||xp<0||xp>16000000000)return send({error:'경험치 저장값을 확인해 주세요'},400);
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   const old=safeJson(row?.profile||'{}',{}),previousVersion=Number(row?.version??0);
   const requestId=typeof data.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(data.requestId)?data.requestId:null;
   const requestHash=sha(JSON.stringify({profile,owned,version}));
   if(requestId&&old.__saveRequest?.id===requestId&&old.__saveRequest?.hash===requestHash&&previousVersion===version+1)
    return send({ok:true,version:previousVersion});
   if(previousVersion!==version)return send({error:'더 최신 저장 기록이 있어요. 재접속해 주세요',reason:'version_conflict',version:previousVersion},409);
   if(row&&xp<Number(old.xp||0))return send({error:'기존 경험치를 낮게 덮어쓰지 않았어요',reason:'xp_rollback_blocked',version:previousVersion},409);
   if(Number(old.__adminRevision||0)!==Number(profile.__adminRevision||0))
    return send({error:'관리자 변경 기록이 먼저 저장됐어요',reason:'admin_revision_conflict',version:previousVersion},409);
   const nextVersion=version+1,updated={...profile};
   const level=Math.floor(xp/160)+1,oldLevel=Math.floor(Number(old.xp||0)/160)+1;
   const history=Array.isArray(old.__levelHistory)?old.__levelHistory.slice(-19):[];
   if(!row||level!==oldLevel)history.push({version:nextVersion,level,at:now(),source:'save'});
   updated.__saveRequest=requestId?{id:requestId,hash:requestHash}:null;
   updated.__levelHistory=history.slice(-20);updated.__confirmedLevel=level;
   let written;
   if(row){
    written=await db.prepare(`UPDATE village_saves SET profile=?,owned=?,version=?,updated_at=?
     WHERE user_id=? AND version=? AND COALESCE(CAST(json_extract(profile,'$.xp') AS REAL),0)<=?`)
     .bind(JSON.stringify(updated),JSON.stringify(owned),nextVersion,now(),user.id,version,xp).run();
   }else{
    written=await db.prepare('INSERT OR IGNORE INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)')
     .bind(user.id,JSON.stringify(updated),JSON.stringify(owned),nextVersion,now()).run();
   }
   if((written?.meta?.changes??0)!==1)
    return send({error:'동시 저장 충돌을 막았어요. 재접속해 주세요',reason:'version_conflict'},409);
   return send({ok:true,version:nextVersion});
  }
  const extra=await handleAccountExtras({action,request,db,user,data,url});
  if(extra)return extra;
  // Strictly fail closed. No Vercel or Neon fallback is allowed.
  return send({error:'Cloudflare 전용 서버에서 이 기능은 아직 준비 중이에요',reason:'not_implemented'},503);
 }catch(error){
  console.error('D1 staging account action failed',action,error?.name);
  return send({error:'이관 시험 서버 오류 · 기존 데이터는 변경하지 않았어요'},503);
 }
}
+KDF_ITERATIONS+'
const cookie=(request,name)=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
const sessionCookie=(token,maxAge=1209600)=>`village_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const now=()=>new Date().toISOString();
const safeJson=(s,fallback)=>{try{return JSON.parse(s)}catch{return fallback}};
const USERNAME=/^[a-z0-9_]{4,24}$/;
const HEX64=/^[a-f0-9]{64}$/;
async function bodyJson(request){
 const raw=await request.text();
 if(raw.length>200000)throw Object.assign(Error('요청 데이터가 너무 커요'),{status:413});
 try{return JSON.parse(raw)}catch{throw Object.assign(Error('JSON 요청을 확인해 주세요'),{status:400})}
}
async function userForSession(request,db){
 const token=cookie(request,'village_session');
 if(!HEX64.test(token))return null;
 return db.prepare('SELECT u.id,u.username,u.nickname,u.role FROM village_sessions s JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
  .bind(sha(token),now()).first();
}
async function rateLimit(request,db,username){
 // Rate limit the expensive legacy scrypt verifier BEFORE hashing a password.
 const ip=(request.headers.get('cf-connecting-ip')||'unknown').slice(0,100);
 const bucket=Math.floor(Date.now()/900000),key=sha(ip+'|'+username);
 await db.prepare('INSERT INTO village_auth_limits(key_hash,bucket,attempts) VALUES(?,?,1) ON CONFLICT(key_hash,bucket) DO UPDATE SET attempts=attempts+1')
  .bind(key,bucket).run();
 const row=await db.prepare('SELECT attempts FROM village_auth_limits WHERE key_hash=? AND bucket=?').bind(key,bucket).first();
 return Number(row?.attempts||0)<=6;
}
export async function handleAccountD1(request,env){
 if(!env?.DB)return send({error:'D1 데이터베이스 연결 없음 · 기존 저장은 변경하지 않았어요'},503);
 if(!['GET','POST'].includes(request.method))return send({error:'지원하지 않는 요청'},405);
 const url=new URL(request.url),action=url.searchParams.get('action')||'me',db=env.DB,method=request.method;
 const data=method==='POST'?await bodyJson(request):{};
 if(!data||typeof data!=='object'||Array.isArray(data))return send({error:'잘못된 요청'},400);
 try{
  if(action==='register'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   const nickname=String(data.nickname||username).trim();
   if(!USERNAME.test(username)||['admin_junja','admin_junja2'].includes(username)||password.length<4||password.length>128||!nickname||nickname.length>12)
    return send({error:'아이디 4~24자, 비밀번호 4~128자, 닉네임 1~12자로 입력해 주세요'},400);
   const salt=randomBytes(16).toString('hex'),digest=passwordHash(password,salt),id=randomUUID(),at=now();
   try{
    await db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)')
     .bind(id,username,nickname,salt,digest,'player',at).run();
   }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return send({error:'이미 사용 중인 아이디 또는 닉네임이에요'},409);throw e}
   return send({ok:true,message:'회원가입 완료. 로그인해 주세요.'},201);
  }
  if(action==='login'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   if(!USERNAME.test(username)||password.length>128)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   if(!await rateLimit(request,db,username))return send({error:'로그인 시도가 많아요. 15분 뒤 다시 시도해 주세요'},429);
   const row=await db.prepare('SELECT id,username,nickname,role,password_salt,password_hash FROM village_users WHERE username=?').bind(username).first();
   // Always run scrypt, including for unknown accounts, to reduce enumeration.
   const digest=passwordHash(password,row?.password_salt||'00'.repeat(16));
   const valid=!!row && /^[a-f0-9]{128}$/.test(row.password_hash) &&
    timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(row.password_hash,'hex'));
   if(!valid)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   const token=randomBytes(32).toString('hex'),at=now();
   const expires=new Date(Date.now()+1209600000).toISOString();
   await db.batch([
    db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(sha(token),row.id,expires,at),
    db.prepare('UPDATE village_users SET last_login_at=? WHERE id=?').bind(at,row.id)
   ]);
   return send({ok:true,user:{username:row.username,nickname:row.nickname,role:row.role}},200,{'set-cookie':sessionCookie(token)});
  }
  const user=await userForSession(request,db);
  if(action==='logout'&&method==='POST'){
   const token=cookie(request,'village_session');
   if(HEX64.test(token))await db.prepare('DELETE FROM village_sessions WHERE token_hash=?').bind(sha(token)).run();
   return send({ok:true},200,{'set-cookie':sessionCookie('',0)});
  }
  if(!user)return send({error:'로그인이 필요해요'},401);
  if(action==='me'&&method==='GET'){
   const wallet=await db.prepare('SELECT balance FROM village_wallets WHERE user_id=?').bind(user.id).first();
   return send({user,balance:String(wallet?.balance??0)});
  }
  if(action==='save'&&method==='GET'){
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   return send({save:row?{profile:safeJson(row.profile,{}),owned:safeJson(row.owned,[]),version:row.version}:null});
  }
  if(action==='save'&&method==='POST'){
   const profile=data.profile,owned=data.owned,version=data.version;
   if(!profile||typeof profile!=='object'||Array.isArray(profile)||!Array.isArray(owned)||owned.length>1000||JSON.stringify(profile).length>150000)
    return send({error:'저장 데이터 형식 오류'},400);
   if(!Number.isSafeInteger(version)||version<0)return send({error:'저장 버전 확인이 필요해요',reason:'update_required'},428);
   const xp=Number(profile.xp);
   if(!Number.isFinite(xp)||xp<0||xp>16000000000)return send({error:'경험치 저장값을 확인해 주세요'},400);
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   const old=safeJson(row?.profile||'{}',{}),previousVersion=Number(row?.version??0);
   const requestId=typeof data.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(data.requestId)?data.requestId:null;
   const requestHash=sha(JSON.stringify({profile,owned,version}));
   if(requestId&&old.__saveRequest?.id===requestId&&old.__saveRequest?.hash===requestHash&&previousVersion===version+1)
    return send({ok:true,version:previousVersion});
   if(previousVersion!==version)return send({error:'더 최신 저장 기록이 있어요. 재접속해 주세요',reason:'version_conflict',version:previousVersion},409);
   if(row&&xp<Number(old.xp||0))return send({error:'기존 경험치를 낮게 덮어쓰지 않았어요',reason:'xp_rollback_blocked',version:previousVersion},409);
   if(Number(old.__adminRevision||0)!==Number(profile.__adminRevision||0))
    return send({error:'관리자 변경 기록이 먼저 저장됐어요',reason:'admin_revision_conflict',version:previousVersion},409);
   const nextVersion=version+1,updated={...profile};
   const level=Math.floor(xp/160)+1,oldLevel=Math.floor(Number(old.xp||0)/160)+1;
   const history=Array.isArray(old.__levelHistory)?old.__levelHistory.slice(-19):[];
   if(!row||level!==oldLevel)history.push({version:nextVersion,level,at:now(),source:'save'});
   updated.__saveRequest=requestId?{id:requestId,hash:requestHash}:null;
   updated.__levelHistory=history.slice(-20);updated.__confirmedLevel=level;
   let written;
   if(row){
    written=await db.prepare(`UPDATE village_saves SET profile=?,owned=?,version=?,updated_at=?
     WHERE user_id=? AND version=? AND COALESCE(CAST(json_extract(profile,'$.xp') AS REAL),0)<=?`)
     .bind(JSON.stringify(updated),JSON.stringify(owned),nextVersion,now(),user.id,version,xp).run();
   }else{
    written=await db.prepare('INSERT OR IGNORE INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)')
     .bind(user.id,JSON.stringify(updated),JSON.stringify(owned),nextVersion,now()).run();
   }
   if((written?.meta?.changes??0)!==1)
    return send({error:'동시 저장 충돌을 막았어요. 재접속해 주세요',reason:'version_conflict'},409);
   return send({ok:true,version:nextVersion});
  }
  // Strictly fail closed. Do not silently pretend economy/admin APIs work.
  return send({error:'D1 이관 시험 중: 해당 기능은 아직 활성화되지 않았어요. 기존 서버의 운영 데이터는 보존돼요',reason:'staging_only'},503);
 }catch(error){
  console.error('D1 staging account action failed',action,error?.name);
  return send({error:'이관 시험 서버 오류 · 기존 데이터는 변경하지 않았어요'},503);
 }
}
+Buffer.from(bits).toString('hex');
}
const cookie=(request,name)=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
const sessionCookie=(token,maxAge=1209600)=>`village_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
const now=()=>new Date().toISOString();
const safeJson=(s,fallback)=>{try{return JSON.parse(s)}catch{return fallback}};
const USERNAME=/^[a-z0-9_]{4,24}$/;
const HEX64=/^[a-f0-9]{64}$/;
async function bodyJson(request){
 const raw=await request.text();
 if(raw.length>200000)throw Object.assign(Error('요청 데이터가 너무 커요'),{status:413});
 try{return JSON.parse(raw)}catch{throw Object.assign(Error('JSON 요청을 확인해 주세요'),{status:400})}
}
async function userForSession(request,db){
 const token=cookie(request,'village_session');
 if(!HEX64.test(token))return null;
 return db.prepare('SELECT u.id,u.username,u.nickname,u.role FROM village_sessions s JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?')
  .bind(sha(token),now()).first();
}
async function rateLimit(request,db,username){
 // Rate limit the expensive legacy scrypt verifier BEFORE hashing a password.
 const ip=(request.headers.get('cf-connecting-ip')||'unknown').slice(0,100);
 const bucket=Math.floor(Date.now()/900000),key=sha(ip+'|'+username);
 await db.prepare('INSERT INTO village_auth_limits(key_hash,bucket,attempts) VALUES(?,?,1) ON CONFLICT(key_hash,bucket) DO UPDATE SET attempts=attempts+1')
  .bind(key,bucket).run();
 const row=await db.prepare('SELECT attempts FROM village_auth_limits WHERE key_hash=? AND bucket=?').bind(key,bucket).first();
 return Number(row?.attempts||0)<=6;
}
export async function handleAccountD1(request,env){
 if(!env?.DB)return send({error:'D1 데이터베이스 연결 없음 · 기존 저장은 변경하지 않았어요'},503);
 if(!['GET','POST'].includes(request.method))return send({error:'지원하지 않는 요청'},405);
 const url=new URL(request.url),action=url.searchParams.get('action')||'me',db=env.DB,method=request.method;
 const data=method==='POST'?await bodyJson(request):{};
 if(!data||typeof data!=='object'||Array.isArray(data))return send({error:'잘못된 요청'},400);
 try{
  if(action==='register'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   const nickname=String(data.nickname||username).trim();
   if(!USERNAME.test(username)||['admin_junja','admin_junja2'].includes(username)||password.length<4||password.length>128||!nickname||nickname.length>12)
    return send({error:'아이디 4~24자, 비밀번호 4~128자, 닉네임 1~12자로 입력해 주세요'},400);
   const salt=randomBytes(16).toString('hex'),digest=passwordHash(password,salt),id=randomUUID(),at=now();
   try{
    await db.prepare('INSERT INTO village_users(id,username,nickname,password_salt,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)')
     .bind(id,username,nickname,salt,digest,'player',at).run();
   }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return send({error:'이미 사용 중인 아이디 또는 닉네임이에요'},409);throw e}
   return send({ok:true,message:'회원가입 완료. 로그인해 주세요.'},201);
  }
  if(action==='login'&&method==='POST'){
   const username=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
   if(!USERNAME.test(username)||password.length>128)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   if(!await rateLimit(request,db,username))return send({error:'로그인 시도가 많아요. 15분 뒤 다시 시도해 주세요'},429);
   const row=await db.prepare('SELECT id,username,nickname,role,password_salt,password_hash FROM village_users WHERE username=?').bind(username).first();
   // Always run scrypt, including for unknown accounts, to reduce enumeration.
   const digest=passwordHash(password,row?.password_salt||'00'.repeat(16));
   const valid=!!row && /^[a-f0-9]{128}$/.test(row.password_hash) &&
    timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(row.password_hash,'hex'));
   if(!valid)return send({error:'아이디 또는 비밀번호를 확인해주세요'},401);
   const token=randomBytes(32).toString('hex'),at=now();
   const expires=new Date(Date.now()+1209600000).toISOString();
   await db.batch([
    db.prepare('INSERT INTO village_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(sha(token),row.id,expires,at),
    db.prepare('UPDATE village_users SET last_login_at=? WHERE id=?').bind(at,row.id)
   ]);
   return send({ok:true,user:{username:row.username,nickname:row.nickname,role:row.role}},200,{'set-cookie':sessionCookie(token)});
  }
  const user=await userForSession(request,db);
  if(action==='logout'&&method==='POST'){
   const token=cookie(request,'village_session');
   if(HEX64.test(token))await db.prepare('DELETE FROM village_sessions WHERE token_hash=?').bind(sha(token)).run();
   return send({ok:true},200,{'set-cookie':sessionCookie('',0)});
  }
  if(!user)return send({error:'로그인이 필요해요'},401);
  if(action==='me'&&method==='GET'){
   const wallet=await db.prepare('SELECT balance FROM village_wallets WHERE user_id=?').bind(user.id).first();
   return send({user,balance:String(wallet?.balance??0)});
  }
  if(action==='save'&&method==='GET'){
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   return send({save:row?{profile:safeJson(row.profile,{}),owned:safeJson(row.owned,[]),version:row.version}:null});
  }
  if(action==='save'&&method==='POST'){
   const profile=data.profile,owned=data.owned,version=data.version;
   if(!profile||typeof profile!=='object'||Array.isArray(profile)||!Array.isArray(owned)||owned.length>1000||JSON.stringify(profile).length>150000)
    return send({error:'저장 데이터 형식 오류'},400);
   if(!Number.isSafeInteger(version)||version<0)return send({error:'저장 버전 확인이 필요해요',reason:'update_required'},428);
   const xp=Number(profile.xp);
   if(!Number.isFinite(xp)||xp<0||xp>16000000000)return send({error:'경험치 저장값을 확인해 주세요'},400);
   const row=await db.prepare('SELECT profile,owned,version FROM village_saves WHERE user_id=?').bind(user.id).first();
   const old=safeJson(row?.profile||'{}',{}),previousVersion=Number(row?.version??0);
   const requestId=typeof data.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(data.requestId)?data.requestId:null;
   const requestHash=sha(JSON.stringify({profile,owned,version}));
   if(requestId&&old.__saveRequest?.id===requestId&&old.__saveRequest?.hash===requestHash&&previousVersion===version+1)
    return send({ok:true,version:previousVersion});
   if(previousVersion!==version)return send({error:'더 최신 저장 기록이 있어요. 재접속해 주세요',reason:'version_conflict',version:previousVersion},409);
   if(row&&xp<Number(old.xp||0))return send({error:'기존 경험치를 낮게 덮어쓰지 않았어요',reason:'xp_rollback_blocked',version:previousVersion},409);
   if(Number(old.__adminRevision||0)!==Number(profile.__adminRevision||0))
    return send({error:'관리자 변경 기록이 먼저 저장됐어요',reason:'admin_revision_conflict',version:previousVersion},409);
   const nextVersion=version+1,updated={...profile};
   const level=Math.floor(xp/160)+1,oldLevel=Math.floor(Number(old.xp||0)/160)+1;
   const history=Array.isArray(old.__levelHistory)?old.__levelHistory.slice(-19):[];
   if(!row||level!==oldLevel)history.push({version:nextVersion,level,at:now(),source:'save'});
   updated.__saveRequest=requestId?{id:requestId,hash:requestHash}:null;
   updated.__levelHistory=history.slice(-20);updated.__confirmedLevel=level;
   let written;
   if(row){
    written=await db.prepare(`UPDATE village_saves SET profile=?,owned=?,version=?,updated_at=?
     WHERE user_id=? AND version=? AND COALESCE(CAST(json_extract(profile,'$.xp') AS REAL),0)<=?`)
     .bind(JSON.stringify(updated),JSON.stringify(owned),nextVersion,now(),user.id,version,xp).run();
   }else{
    written=await db.prepare('INSERT OR IGNORE INTO village_saves(user_id,profile,owned,version,updated_at) VALUES(?,?,?,?,?)')
     .bind(user.id,JSON.stringify(updated),JSON.stringify(owned),nextVersion,now()).run();
   }
   if((written?.meta?.changes??0)!==1)
    return send({error:'동시 저장 충돌을 막았어요. 재접속해 주세요',reason:'version_conflict'},409);
   return send({ok:true,version:nextVersion});
  }
  // Strictly fail closed. Do not silently pretend economy/admin APIs work.
  return send({error:'D1 이관 시험 중: 해당 기능은 아직 활성화되지 않았어요. 기존 서버의 운영 데이터는 보존돼요',reason:'staging_only'},503);
 }catch(error){
  console.error('D1 staging account action failed',action,error?.name);
  return send({error:'이관 시험 서버 오류 · 기존 데이터는 변경하지 않았어요'},503);
 }
}
