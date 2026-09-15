import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorldStore } from './world-store.mjs';

const app=express();
const port=process.env.PORT||3000;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const worldStore=await createWorldStore(root);
const JUNJA_LAND_BASE=String(process.env.JUNJA_LAND_BASE_URL||'https://junja-game-club.onrender.com').replace(/\/$/,'');
const LINK_WINDOW_MS=60_000,LINK_MAX_ATTEMPTS=8,SHOP_MAX_ATTEMPTS=10,ACCOUNT_MAX_ATTEMPTS=12;
const linkAttempts=new Map(),shopAttempts=new Map(),accountAttempts=new Map();
const WORLD_SHOP_IDS=new Set(['costume_royal','costume_angel','costume_dragon','pet_cat','pet_fox','pet_dragon']);

app.disable('x-powered-by');
app.use(express.json({limit:'128kb'}));
app.use((req,res,next)=>{if(req.method==='GET'||req.method==='HEAD')return next();const origin=req.headers.origin;if(!origin)return next();try{if(new URL(origin).host===req.headers.host)return next();}catch{}return res.status(403).json({error:'잘못된 요청 출처입니다.'});});

function readCookies(req){const out={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i<1)continue;const key=part.slice(0,i).trim(),value=part.slice(i+1).trim();try{out[key]=decodeURIComponent(value)}catch{out[key]=value}}return out;}
function secureRequest(req){return String(req.headers['x-forwarded-proto']||'').includes('https')||req.secure;}
function scopedCookie(req,name,value,maxAge=60*60*24*14){return `${name}=${encodeURIComponent(value||'')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureRequest(req)?'; Secure':''}`;}
function jcoinCookie(req,sid,maxAge){return scopedCookie(req,'jw_jcoin',sid,maxAge);}
function worldCookie(req,sid,maxAge){return scopedCookie(req,'jw_sid',sid,maxAge);}
function clientIp(req){return String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();}
function allowWindow(map,key,max,windowMs=LINK_WINDOW_MS){const t=Date.now(),prev=map.get(key);if(!prev||t-prev.startedAt>windowMs){map.set(key,{startedAt:t,count:1});return true}prev.count+=1;return prev.count<=max;}
function allowLinkAttempt(req){return allowWindow(linkAttempts,clientIp(req),LINK_MAX_ATTEMPTS);}
function allowShopAttempt(req,sid){return allowWindow(shopAttempts,sid||clientIp(req),SHOP_MAX_ATTEMPTS);}
function allowAccountAttempt(req){return allowWindow(accountAttempts,clientIp(req),ACCOUNT_MAX_ATTEMPTS);}
async function landFetch(pathname,options={}){return fetch(`${JUNJA_LAND_BASE}${pathname}`,{redirect:'manual',signal:AbortSignal.timeout(12_000),...options});}
async function readJson(response){try{return await response.json()}catch{return {}}}
function extractSid(setCookie){const match=String(setCookie||'').match(/(?:^|[,;]\s*)sid=([^;]+)/i);return match?match[1].trim():'';}
function filteredItems(items){return (Array.isArray(items)?items:[]).filter(item=>WORLD_SHOP_IDS.has(String(item?.id||''))).map(item=>({id:String(item.id),category:String(item.category||''),name:String(item.name||''),icon:String(item.icon||''),rarity:String(item.rarity||''),price:Number(item.price||0),desc:String(item.desc||''),owned:!!item.owned,equipped:!!item.equipped}));}
function sessionExpired(res,req){res.setHeader('Set-Cookie',jcoinCookie(req,'',0));return res.status(401).json({error:'준자랜드 연결 세션이 만료되었습니다. 다시 연결해주세요.',linked:false});}
async function worldUser(req){return worldStore.session(readCookies(req).jw_sid);}
async function requireWorld(req,res){const user=await worldUser(req);if(!user){res.status(401).json({error:'준자월드 로그인이 필요합니다.'});return null}return user;}
async function requireWorldAdmin(req,res){const user=await requireWorld(req,res);if(!user)return null;if(user.role!=='admin'){res.status(403).json({error:'준자월드 운영자 권한이 필요합니다.'});return null}return user;}
function accountFields(body){return {username:String(body?.username||'').trim().toLowerCase().slice(0,20),password:String(body?.password||'').slice(0,72)};}
function validAccount(username,password){if(!/^[a-z0-9_]{3,20}$/.test(username))return '아이디는 영문 소문자·숫자·_ 조합 3~20자로 입력해주세요.';if(password.length<6||password.length>72)return '비밀번호는 6~72자로 입력해주세요.';return '';}

app.get('/api/health',(_req,res)=>res.json({ok:true,game:'JUNJA WORLD',version:'2.9.9',jcoinBridge:'shop-limited',worldAccounts:true,persistence:process.env.DATABASE_URL?'postgres':'sqlite-fallback'}));

// JUNJA WORLD account + server save
app.post('/api/world/register',async(req,res)=>{if(!allowAccountAttempt(req))return res.status(429).json({error:'가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'});const {username,password}=accountFields(req.body),bad=validAccount(username,password);if(bad)return res.status(400).json({error:bad});try{const out=await worldStore.register(username,password);res.setHeader('Set-Cookie',worldCookie(req,out.token));return res.status(201).json({user:out.user});}catch(e){return res.status(String(e?.message||'').includes('이미')?409:400).json({error:e?.message||'가입에 실패했습니다.'});}});
app.post('/api/world/login',async(req,res)=>{if(!allowAccountAttempt(req))return res.status(429).json({error:'로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'});const {username,password}=accountFields(req.body);try{const out=await worldStore.login(username,password);res.setHeader('Set-Cookie',worldCookie(req,out.token));return res.json({user:out.user});}catch(e){return res.status(String(e?.message||'').includes('정지')?403:401).json({error:e?.message||'로그인에 실패했습니다.'});}});
app.post('/api/world/logout',async(req,res)=>{const sid=readCookies(req).jw_sid;await worldStore.logout(sid);res.setHeader('Set-Cookie',worldCookie(req,'',0));return res.json({ok:true});});
app.get('/api/world/me',async(req,res)=>{const user=await requireWorld(req,res);if(!user)return;return res.json({user});});
app.get('/api/world/save',async(req,res)=>{const user=await requireWorld(req,res);if(!user)return;return res.json(await worldStore.getSave(user.id));});
app.put('/api/world/save',async(req,res)=>{const user=await requireWorld(req,res);if(!user)return;try{const out=await worldStore.save(user.id,req.body?.save,req.body?.revision??null,'player_autosave');if(out.conflict)return res.status(409).json({error:'다른 기기에서 더 최신 저장이 확인되었습니다.',...out});return res.json(out);}catch(e){return res.status(400).json({error:e?.message||'저장에 실패했습니다.'});}});

// Promote a logged-in JUNJA WORLD account only after proving linked JUNJA Land admin identity.
app.post('/api/world/admin/claim',async(req,res)=>{const user=await requireWorld(req,res);if(!user)return;const landSid=readCookies(req).jw_jcoin;if(!landSid)return res.status(403).json({error:'준자랜드 관리자 계정을 J-Coin 연결로 먼저 인증해주세요.'});try{const response=await landFetch('/api/me',{headers:{Cookie:`sid=${landSid}`}}),data=await readJson(response);if(!response.ok||!data?.user?.is_admin)return res.status(403).json({error:'연결된 준자랜드 계정에 관리자 권한이 없습니다.'});return res.json({user:await worldStore.claimAdmin(user.id)});}catch{return res.status(503).json({error:'관리자 인증 서버 연결이 지연되고 있습니다.'});}});
app.get('/api/world/admin/users',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;return res.json({users:await worldStore.listUsers(String(req.query.q||''))});});
app.get('/api/world/admin/users/:id',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;const data=await worldStore.adminUser(Number(req.params.id));if(!data)return res.status(404).json({error:'사용자를 찾을 수 없습니다.'});return res.json(data);});
app.patch('/api/world/admin/users/:id',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;try{return res.json(await worldStore.adminPatch(admin.id,Number(req.params.id),req.body||{}));}catch(e){return res.status(400).json({error:e?.message||'운영자 수정에 실패했습니다.'});}});
app.get('/api/world/admin/users/:id/backups',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;return res.json({backups:await worldStore.backups(Number(req.params.id))});});
app.post('/api/world/admin/users/:id/restore',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;try{return res.json(await worldStore.restore(admin.id,Number(req.params.id),Number(req.body?.backupId)));}catch(e){return res.status(400).json({error:e?.message||'복구에 실패했습니다.'});}});
app.get('/api/world/admin/users/:id/audit',async(req,res)=>{const admin=await requireWorldAdmin(req,res);if(!admin)return;return res.json({rows:await worldStore.auditRows(Number(req.params.id))});});

// JUNJA LAND J-Coin bridge — existing casino logic remains untouched.
app.post('/api/jcoin/link',async(req,res)=>{if(!allowLinkAttempt(req))return res.status(429).json({error:'연결 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'});const username=String(req.body?.username||'').trim().toLowerCase().slice(0,20),password=String(req.body?.password||'').slice(0,72);if(!username||!password)return res.status(400).json({error:'준자랜드 아이디와 비밀번호를 입력해주세요.'});try{const response=await landFetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})}),data=await readJson(response);if(!response.ok){const status=response.status===429?429:response.status===403?403:401;return res.status(status).json({error:data?.error||'준자랜드 계정을 확인할 수 없습니다.'});}const sid=extractSid(response.headers.get('set-cookie'));if(!sid)return res.status(502).json({error:'준자랜드 연결 세션을 만들지 못했습니다.'});res.setHeader('Set-Cookie',jcoinCookie(req,sid));return res.json({linked:true,jcoin:Number(data?.user?.balance||0),nickname:String(data?.user?.nickname||''),admin:!!data?.user?.is_admin});}catch(error){console.error('[JCOIN LINK]',error?.message||error);return res.status(503).json({error:'준자랜드 연결 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.'});}});
app.get('/api/jcoin/wallet',async(req,res)=>{const sid=readCookies(req).jw_jcoin;if(!sid)return res.json({linked:false,jcoin:0,admin:false});try{const response=await landFetch('/api/me',{headers:{Cookie:`sid=${sid}`}}),data=await readJson(response);if(response.status===401||response.status===403){res.setHeader('Set-Cookie',jcoinCookie(req,'',0));return res.json({linked:false,jcoin:0,admin:false,status:'expired'});}if(!response.ok)return res.status(502).json({error:'준자랜드 J-Coin 조회에 실패했습니다.'});return res.json({linked:true,jcoin:Number(data?.user?.balance||0),nickname:String(data?.user?.nickname||''),admin:!!data?.user?.is_admin});}catch{return res.status(503).json({error:'준자랜드 J-Coin 조회가 일시적으로 지연되고 있습니다.'});}});
app.get('/api/jcoin/shop',async(req,res)=>{const sid=readCookies(req).jw_jcoin;if(!sid)return res.status(401).json({error:'먼저 준자랜드 J-Coin 계정을 연결해주세요.',linked:false});try{const response=await landFetch('/api/shop',{headers:{Cookie:`sid=${sid}`}}),data=await readJson(response);if(response.status===401||response.status===403)return sessionExpired(res,req);if(!response.ok)return res.status(502).json({error:'준자랜드 상점 정보를 불러오지 못했습니다.'});return res.json({linked:true,jcoin:Number(data?.user?.balance||0),nickname:String(data?.user?.nickname||''),admin:!!data?.user?.is_admin,items:filteredItems(data?.items)});}catch{return res.status(503).json({error:'J-Coin 상점 연결이 일시적으로 지연되고 있습니다.'});}});
app.post('/api/jcoin/shop/buy',async(req,res)=>{const sid=readCookies(req).jw_jcoin;if(!sid)return res.status(401).json({error:'먼저 준자랜드 J-Coin 계정을 연결해주세요.'});if(!allowShopAttempt(req,sid))return res.status(429).json({error:'구매 요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.'});const itemId=String(req.body?.itemId||'');if(!WORLD_SHOP_IDS.has(itemId))return res.status(400).json({error:'준자월드 J-Coin 상점에서 허용되지 않은 상품입니다.'});try{const response=await landFetch('/api/shop/buy',{method:'POST',headers:{Cookie:`sid=${sid}`,'Content-Type':'application/json'},body:JSON.stringify({itemId})}),data=await readJson(response);if(response.status===401||response.status===403)return sessionExpired(res,req);if(!response.ok)return res.status(response.status>=500?502:400).json({error:data?.error||'J-Coin 구매에 실패했습니다.'});return res.json({ok:true,jcoin:Number(data?.user?.balance||0),admin:!!data?.user?.is_admin,item:data?.item||null,items:filteredItems(data?.state?.items)});}catch{return res.status(503).json({error:'J-Coin 결제 서버가 응답하지 않습니다. 잔액이 변경되었는지 준자랜드에서 확인 후 다시 시도해주세요.'});}});
app.post('/api/jcoin/unlink',async(req,res)=>{const sid=readCookies(req).jw_jcoin;res.setHeader('Set-Cookie',jcoinCookie(req,'',0));if(sid){try{await landFetch('/api/logout',{method:'POST',headers:{Cookie:`sid=${sid}`}})}catch{}}return res.json({ok:true,linked:false});});

app.use(express.static(path.join(root,'dist'),{maxAge:'1h'}));
app.get('/{*splat}',(_req,res)=>res.sendFile(path.join(root,'dist','index.html')));
app.listen(port,()=>console.log(`JUNJA WORLD is running on port ${port}`));
