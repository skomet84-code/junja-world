import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import pg from 'pg';
const pool=new pg.Pool({connectionString:(process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL),ssl:{rejectUnauthorized:false},max:3});
const hash=s=>createHash('sha256').update(s).digest('hex');
const digest=(pw,salt)=>scryptSync(pw,Buffer.from(salt,'hex'),64).toString('hex');
const cookie=(req,name)=>(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const secure='Path=/; HttpOnly; Secure; SameSite=Lax';
const send=(res,status,body)=>res.status(status).json(body);
async function session(client,req){
 const token=cookie(req,'village_session');if(!/^[a-f0-9]{64}$/.test(token))return null;
 const q=await client.query("SELECT u.id,u.username,u.nickname,u.role FROM village_sessions s JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",[hash(token)]);
 return q.rows[0]||null;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!(process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL))return send(res,503,{error:'인증 서버 연결 설정을 확인해야 합니다'});
 if(!['POST','GET'].includes(req.method))return send(res,405,{error:'지원하지 않는 요청'});
 const action=String(req.query.action||req.body?.action||'me');
 const body=req.body||{};
 const client=await pool.connect();
 try{
  if(action==='admin_setup'&&req.method==='POST'){
   const setup=process.env.VILLAGE_ADMIN_SETUP_TOKEN||process.env.VILLAGE_ADMIN_SETUP_CODE;
   const supplied=String(body.setupCode||'');
   if(!setup||setup.length<16||supplied.length!==setup.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(setup)))return send(res,403,{error:'운영자 설정 코드가 일치하지 않습니다'});
   const password=String(body.password||'');
   if(password.length<8||password.length>128)return send(res,400,{error:'운영자 비밀번호는 8자 이상으로 설정해주세요'});
   const existing=await client.query("SELECT id FROM village_users WHERE username='admin_junja'");
   if(existing.rows.length)return send(res,409,{error:'운영자 계정이 이미 존재합니다. 로그인 또는 복구 절차를 이용하세요'});
   const salt=randomBytes(16).toString('hex');
   await client.query("INSERT INTO village_users(username,nickname,password_salt,password_hash,role) VALUES('admin_junja','갓준자',$1,$2,'admin')",[salt,digest(password,salt)]);
   return send(res,201,{ok:true,message:'운영자 계정 생성 완료. 로그인해주세요'});
  }
  if(action==='register'&&req.method==='POST'){
   const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||''),nickname=String(body.nickname||username).trim();
   if(!/^[a-z0-9_]{4,24}$/.test(username)||username==='admin_junja'||password.length<4||password.length>128||nickname.length<1||nickname.length>12)return send(res,400,{error:'아이디는 영문·숫자 4~24자, 비밀번호는 4자 이상, 닉네임은 12자 이하'});
   const salt=randomBytes(16).toString('hex');
   await client.query('INSERT INTO village_users(username,nickname,password_salt,password_hash,role) VALUES($1,$2,$3,$4,$5)',[username,nickname,salt,digest(password,salt),'player']);
   return send(res,201,{ok:true,message:'회원가입 완료. 로그인해주세요.'});
  }
  if(action==='login'&&req.method==='POST'){
   const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||'');
   const r=await client.query('SELECT * FROM village_users WHERE username=$1',[username]);
   const u=r.rows[0];const fallback='00'.repeat(16);const check=digest(password.slice(0,128),u?.password_salt||fallback);
   if(!u||!timingSafeEqual(Buffer.from(check,'hex'),Buffer.from(u.password_hash,'hex')))return send(res,401,{error:'아이디 또는 비밀번호를 확인해주세요'});
   const token=randomBytes(32).toString('hex');
   await client.query("INSERT INTO village_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '14 days')",[hash(token),u.id]);
   await client.query('UPDATE village_users SET last_login_at=now() WHERE id=$1',[u.id]);
   res.setHeader('Set-Cookie','village_session='+token+'; Max-Age=1209600; '+secure);
   return send(res,200,{ok:true,user:{username:u.username,nickname:u.nickname,role:u.role}});
  }
  const user=await session(client,req);
  if(action==='logout'&&req.method==='POST'){
   const token=cookie(req,'village_session');
   if(token)await client.query('DELETE FROM village_sessions WHERE token_hash=$1',[hash(token)]);
   res.setHeader('Set-Cookie','village_session=; Max-Age=0; '+secure);
   return send(res,200,{ok:true});
  }
  if(!user)return send(res,401,{error:'로그인이 필요해요'});
  if(action==='me'){
   const w=await client.query('SELECT balance FROM village_wallets WHERE user_id=$1',[user.id]);
   return send(res,200,{user,balance:String(w.rows[0]?.balance||0)});
  }
  if(action==='save'&&req.method==='GET'){
   const q=await client.query('SELECT profile,owned,version FROM village_saves WHERE user_id=$1',[user.id]);
   return send(res,200,{save:q.rows[0]||null});
  }
  if(action==='save'&&req.method==='POST'){
   const profile=body.profile,owned=body.owned;
   if(!profile||typeof profile!=='object'||Array.isArray(profile)||JSON.stringify(profile).length>150000||!Array.isArray(owned)||owned.length>1000)return send(res,400,{error:'저장 데이터 형식 오류'});
   await client.query('BEGIN');
   const current=await client.query('SELECT profile FROM village_saves WHERE user_id=$1 FOR UPDATE',[user.id]);
   const incoming={...profile};
   const saved=current.rows[0]?.profile||{};
   if((Number(saved.__adminRevision)||0)>(Number(incoming.__adminRevision)||0)){
    for(const field of ['coins','xp','fashion'])if(Object.prototype.hasOwnProperty.call(saved,field))incoming[field]=saved[field];
    incoming.__adminRevision=saved.__adminRevision;
   }
   await client.query("INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES($1,$2,$3,1,now()) ON CONFLICT(user_id) DO UPDATE SET profile=$2,owned=$3,version=village_saves.version+1,updated_at=now()",[user.id,incoming,owned]);
   await client.query('COMMIT');
   return send(res,200,{ok:true});
  }
  if(action==='presence'&&req.method==='POST'){
   const x=Number(body.x),y=Number(body.y);
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>10000||y<0||y>10000)return send(res,400,{error:'위치 오류'});
   await client.query("INSERT INTO village_presence(user_id,x,y,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(user_id) DO UPDATE SET x=$2,y=$3,updated_at=now()",[user.id,x,y]);
   const q=await client.query("SELECT u.username,u.nickname,p.x,p.y FROM village_presence p JOIN village_users u ON u.id=p.user_id WHERE p.updated_at>now()-interval '20 seconds' AND p.user_id<>$1 LIMIT 30",[user.id]);
   return send(res,200,{players:q.rows});
  }
  // Owner-only administration: all permissions are enforced on the server.
  const owner=user.username==='admin_junja2'&&user.role==='admin';
  if(action==='admin_users'&&req.method==='GET'){
   if(!owner)return send(res,403,{error:'최고관리자 전용'});
   const q=await client.query("SELECT u.username,u.nickname,u.role,u.created_at,u.last_login_at,COALESCE(w.balance,0)::text AS balance,s.version FROM village_users u LEFT JOIN village_wallets w ON w.user_id=u.id LEFT JOIN village_saves s ON s.user_id=u.id ORDER BY u.created_at DESC LIMIT 200");
   return send(res,200,{users:q.rows});
  }
  if(action==='admin_character'&&req.method==='POST'){
   if(!owner)return send(res,403,{error:'최고관리자 전용'});
   const recipient=String(body.recipient||'').trim().toLowerCase();
   const mode=String(body.mode||''),value=Number(body.value),item=String(body.item||'');
   if(!/^[a-z0-9_]{4,24}$/.test(recipient))return send(res,400,{error:'대상 아이디 오류'});
   if(mode==='level'&&(!Number.isSafeInteger(value)||value<1||value>100000000))return send(res,400,{error:'레벨 값 오류'});
   if(['coins','coins_add','coins_take'].includes(mode)&&(!Number.isSafeInteger(value)||value<0||value>1000000000000))return send(res,400,{error:'골드는 0~1조'});
   if(mode==='item'&&!/^fashion_(hair|outfit|accessory|pet)_[0-9]{2,3}$/.test(item))return send(res,400,{error:'아이템 ID 오류'});
   if(!['level','coins','coins_add','coins_take','item'].includes(mode))return send(res,400,{error:'기능 오류'});
   await client.query('BEGIN');
   const target=await client.query('SELECT id FROM village_users WHERE username=$1',[recipient]);
   if(!target.rows.length){await client.query('ROLLBACK');return send(res,404,{error:'대상 계정 없음'})}
   const id=target.rows[0].id;
   await client.query("INSERT INTO village_saves(user_id,profile,owned,version,updated_at) VALUES($1,'{}'::jsonb,'[]'::jsonb,1,now()) ON CONFLICT DO NOTHING",[id]);
   const q=await client.query('SELECT profile FROM village_saves WHERE user_id=$1 FOR UPDATE',[id]);
   const profile=q.rows[0].profile||{};
   if(mode==='level')profile.xp=(value-1)*160;
   if(mode==='coins')profile.coins=value;
   if(mode==='coins_add')profile.coins=Math.min(1000000000000,Math.max(0,Number(profile.coins)||0)+value);
   if(mode==='coins_take')profile.coins=Math.max(0,(Number(profile.coins)||0)-value);
   if(mode==='item'){profile.fashion=profile.fashion||{};profile.fashion.owned=Array.isArray(profile.fashion.owned)?profile.fashion.owned:[];if(!profile.fashion.owned.includes(item))profile.fashion.owned.push(item)}
   profile.__adminRevision=(Number(profile.__adminRevision)||0)+1;
   await client.query('UPDATE village_saves SET profile=$2,version=version+1,updated_at=now() WHERE user_id=$1',[id,profile]);
   await client.query('COMMIT');
   return send(res,200,{ok:true,message:'캐릭터 서버 저장 완료. 대상 유저가 다시 로그인하면 반영됩니다.'});
  }
  if(action==='admin_reclaim'&&req.method==='POST'){
   if(!owner)return send(res,403,{error:'최고관리자 전용'});
   const recipient=String(body.recipient||'').trim().toLowerCase(),amount=Number(body.amount),key=String(body.key||'');
   if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000000||!/^[-a-zA-Z0-9]{16,80}$/.test(key))return send(res,400,{error:'회수 입력값 오류'});
   await client.query('BEGIN');
   const target=await client.query('SELECT id FROM village_users WHERE username=$1',[recipient]);
   if(!target.rows.length){await client.query('ROLLBACK');return send(res,404,{error:'유저 없음'})}
   const dup=await client.query('SELECT id FROM village_wallet_transfers WHERE idempotency_key=$1',[key]);
   if(dup.rows.length){await client.query('ROLLBACK');return send(res,409,{error:'이미 처리된 요청'})}
   const debit=await client.query('UPDATE village_wallets SET balance=balance-$1,updated_at=now() WHERE user_id=$2 AND balance >= $1 RETURNING balance',[amount,target.rows[0].id]);
   if(!debit.rows.length){await client.query('ROLLBACK');return send(res,400,{error:'회수할 서버 지갑 잔액 부족'})}
   await client.query("INSERT INTO village_wallet_transfers(sender_id,recipient_id,amount,kind,idempotency_key) VALUES($1,$2,$3,'admin_reclaim',$4)",[user.id,target.rows[0].id,amount,key]);
   await client.query('COMMIT');return send(res,200,{ok:true,message:'서버 지갑 회수 완료'});
  }
  if(action==='transfer'&&req.method==='POST'){
   const recipient=String(body.recipient||'').trim().toLowerCase(),amount=Number(body.amount),key=String(body.key||'');
   if(!/^[a-z0-9_]{4,24}$/.test(recipient)||!Number.isSafeInteger(amount)||amount<1||amount>1000000000000||!/^[-a-zA-Z0-9]{16,80}$/.test(key))return send(res,400,{error:'송금 입력값을 확인해주세요'});
   await client.query('BEGIN');
   const target=await client.query('SELECT id FROM village_users WHERE username=$1',[recipient]);
   if(!target.rows[0]||target.rows[0].id===user.id){await client.query('ROLLBACK');return send(res,400,{error:'받는 사람을 확인해주세요'})}
   const existing=await client.query('SELECT id FROM village_wallet_transfers WHERE idempotency_key=$1',[key]);
   if(existing.rows.length){await client.query('ROLLBACK');return send(res,409,{error:'이미 처리된 송금 요청'})}
   await client.query('INSERT INTO village_wallets(user_id) VALUES($1),($2) ON CONFLICT DO NOTHING',[user.id,target.rows[0].id]);
   const debit=await client.query('UPDATE village_wallets SET balance=balance-$1,updated_at=now() WHERE user_id=$2 AND balance >= $1 RETURNING balance',[amount,user.id]);
   if(!debit.rows.length){await client.query('ROLLBACK');return send(res,400,{error:'서버 지갑의 잔액이 부족해요'})}
   await client.query('UPDATE village_wallets SET balance=balance+$1,updated_at=now() WHERE user_id=$2',[amount,target.rows[0].id]);
   await client.query("INSERT INTO village_wallet_transfers(sender_id,recipient_id,amount,kind,idempotency_key) VALUES($1,$2,$3,'peer',$4)",[user.id,target.rows[0].id,amount,key]);
   await client.query('COMMIT');return send(res,200,{ok:true,balance:String(debit.rows[0].balance)});
  }
  if(action==='admin_grant'&&req.method==='POST'){
   if(!owner)return send(res,403,{error:'최고관리자 전용'});
   const recipient=String(body.recipient||'').trim().toLowerCase(),amount=Number(body.amount),key=String(body.key||'');
   if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000000||!/^[-a-zA-Z0-9]{16,80}$/.test(key))return send(res,400,{error:'지급 입력값 오류'});
   await client.query('BEGIN');
   const target=await client.query('SELECT id FROM village_users WHERE username=$1',[recipient]);
   if(!target.rows.length){await client.query('ROLLBACK');return send(res,404,{error:'유저 없음'})}
   const dup=await client.query('SELECT id FROM village_wallet_transfers WHERE idempotency_key=$1',[key]);
   if(dup.rows.length){await client.query('ROLLBACK');return send(res,409,{error:'이미 처리된 지급'})}
   await client.query('INSERT INTO village_wallets(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=village_wallets.balance+$2,updated_at=now()',[target.rows[0].id,amount]);
   await client.query("INSERT INTO village_wallet_transfers(sender_id,recipient_id,amount,kind,idempotency_key) VALUES($1,$2,$3,'admin_grant',$4)",[user.id,target.rows[0].id,amount,key]);
   await client.query('COMMIT');return send(res,200,{ok:true});
  }
  return send(res,404,{error:'지원하지 않는 기능'});
 }catch(e){
  try{await client.query('ROLLBACK')}catch{}
  if(e.code==='23505')return send(res,409,{error:'이미 사용 중인 아이디 또는 거래'});
  return send(res,500,{error:'처리 중 오류가 발생했어요'});
 }finally{client.release()}
}
