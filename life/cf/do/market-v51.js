// v51 trial-only player market for Cloudflare's SQLite Durable Object.
// Never touches actual character coins, XP, wallets, inventory or Neon/Vercel.
// All listings, escrowed stock, account balances, receipts, checkpoints and
// replay keys settle under ONE storage.transactionSync, including 2-player buys.
import {createHash,randomUUID} from 'node:crypto';
import {startingEconomy,economyView} from '../../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../../economy-integrity-v37.js';
import {reserveListing,cancelListing,settleListing,marketQuote,MARKET_CATALOG,MARKET_MAX_LISTINGS} from '../../player-market-v38.js';
import {userForSession} from '../d1/account-staging.js';

const respond=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=value=>createHash('sha256').update(value).digest('hex');
function fail(message,status=409){const e=new Error(message);e.status=status;throw e}
function parse(value){try{return JSON.parse(value)}catch{fail('경제 장부의 저장값이 손상되어 거래를 중단했어')}}
const one=(sql,query,...params)=>sql.exec(query,...params).toArray()[0]||null;
const rows=(sql,query,...params)=>sql.exec(query,...params).toArray();
const changeCount=sql=>Number(one(sql,'SELECT changes() AS n')?.n||0);
function parseAction(data){
 if(!data||typeof data!=='object'||Array.isArray(data))fail('거래 요청이 올바르지 않아',400);
 const kind=data.kind,p=data.payload&&typeof data.payload==='object'&&!Array.isArray(data.payload)?data.payload:{};
 if(!['list','buy','cancel'].includes(kind))fail('지원하지 않는 거래야',400);
 const payload=kind==='list'?{item:p.item,quantity:p.quantity,unitPrice:p.unitPrice}:{listingId:p.listingId};
 if(kind==='list')marketQuote(payload.item,payload.unitPrice,payload.quantity);
 else if(typeof payload.listingId!=='string'||!uuid.test(payload.listingId))fail('거래 상품 번호가 올바르지 않아',400);
 return {kind,payload};
}
function account(sql,key,now){
 let row=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 if(!row){
  const start=startingEconomy();
  sql.exec('INSERT OR IGNORE INTO village_economy_v36_accounts(user_key,state,version,updated_at) VALUES(?,?,0,?)',
   key,JSON.stringify(start),now);
  row=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',key);
 }
 if(!row)fail('거래 계정 생성에 실패했어',500);
 return {state:parse(row.state),version:Number(row.version)};
}
function lastHash(sql,key,record,at){
 const checkpoints=rows(sql,`SELECT version,state,previous_hash,state_hash,request_id
 FROM village_economy_v37_checkpoints WHERE user_key=? ORDER BY version DESC LIMIT 25`,key)
  .map(r=>({...r,state:parse(r.state)}));
 if(checkpoints.length){
  const audit=validateCheckpointChain(key,record,checkpoints);
  if(!audit.ok)fail('경제 기록이 서로 맞지 않아 거래를 중단했어 ('+audit.reason+')');
  return checkpoints[0].state_hash;
 }
 const baseline=makeCheckpoint(key,record.version,record.state);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
 (user_key,version,state,previous_hash,state_hash,request_id,created_at)
 VALUES(?,?,?,?,?,?,?)`,key,baseline.version,JSON.stringify(baseline.state),null,baseline.state_hash,null,at);
 return baseline.state_hash;
}
function write(sql,{key,original,next,delta,action,requestId,requestHash,detail,prior,at}){
 const version=original.version+1;
 if(!Number.isSafeInteger(version))fail('저장 버전 한도를 초과했어',500);
 sql.exec('UPDATE village_economy_v36_accounts SET state=?,version=?,updated_at=? WHERE user_key=? AND version=?',
  JSON.stringify(next),version,at,key,original.version);
 if(changeCount(sql)!==1)fail('거래 중 저장 충돌이 발생했어. 다시 시도해 줘');
 const receipt={action,detail,delta,balance:next.coins,day:at.slice(0,10),at};
 sql.exec(`INSERT INTO village_economy_v36_events
 (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt,created_at)
 VALUES(?,?,?,?,?,?,?,?)`,
 key,requestId,requestHash,action,delta,next.coins,JSON.stringify(receipt),at);
 const snap=makeCheckpoint(key,version,next,prior,requestId);
 sql.exec(`INSERT INTO village_economy_v37_checkpoints
 (user_key,version,state,previous_hash,state_hash,request_id,created_at)
 VALUES(?,?,?,?,?,?,?)`,
 key,snap.version,JSON.stringify(snap.state),snap.previous_hash,snap.state_hash,requestId,at);
 return version;
}
function transaction(sql,actor,data,at){
 const {kind,payload}=parseAction(data);
 const requestId=data.requestId;
 if(typeof requestId!=='string'||!uuid.test(requestId))fail('중복 거래 방지 번호(UUID)가 필요해',400);
 const requestHash=sha(JSON.stringify({kind,payload}));
 // Resolve REPLAYS before verifying listing status, so a retry after
 // successful sale returns the original receipt instead of "already sold".
 const replay=one(sql,`SELECT request_hash,result FROM village_market_v38_requests
  WHERE actor_key=? AND request_id=?`,actor,requestId);
 if(replay){
  if(replay.request_hash!==requestHash)fail('같은 요청번호를 다른 거래에 사용할 수 없어');
  const record=one(sql,'SELECT state FROM village_economy_v36_accounts WHERE user_key=?',actor);
  return {ok:true,replayed:true,trial:true,...parse(replay.result),
   economy:economyView(record?parse(record.state):startingEconomy(),new Date(at))};
 }
 let listing=null,seller=actor;
 if(kind!=='list'){
  listing=one(sql,'SELECT * FROM village_market_v38_listings WHERE id=?',payload.listingId);
  if(!listing)fail('판매 물품을 찾지 못했어',404);
  seller=listing.seller_key;
  if(listing.status!=='active')fail('이미 거래됐거나 취소된 물품이야');
  if(kind==='buy'&&seller===actor)fail('내 상품은 내가 구매할 수 없어',400);
  if(kind==='cancel'&&seller!==actor)fail('내 판매 물품만 취소할 수 있어',403);
 }
 if(kind==='list'){
  const active=Number(one(sql,`SELECT count(*) AS n FROM village_market_v38_listings
    WHERE seller_key=? AND status='active'`,actor)?.n||0);
  if(active>=MARKET_MAX_LISTINGS)fail('판매 등록은 최대 12개야');
 }
 const keys=[...new Set([actor,seller])].sort();
 const current=new Map(keys.map(key=>[key,account(sql,key,at)]));
 const prior=new Map(keys.map(key=>[key,lastHash(sql,key,current.get(key),at)]));
 let changes,result;
 if(kind==='list'){
  const q=reserveListing(current.get(actor).state,payload.item,payload.unitPrice,payload.quantity);
  const listingId=randomUUID();
  sql.exec(`INSERT INTO village_market_v38_listings
    (id,seller_key,item,quantity,unit_price,status,created_at)
    VALUES(?,?,?,?,?,'active',?)`,listingId,actor,q.quote.item,q.quote.quantity,q.quote.unitPrice,at);
  changes=[{key:actor,next:q.state,delta:q.delta,action:'market_list',
   requestId,detail:'상점 판매 등록 · '+q.quote.label}];
  result={kind,listingId,item:q.quote.item,quantity:q.quote.quantity,unitPrice:q.quote.unitPrice,listingFee:q.quote.fee};
 }else if(kind==='cancel'){
  const q=cancelListing(current.get(actor).state,listing);
  sql.exec(`UPDATE village_market_v38_listings SET status='cancelled',settled_at=?
    WHERE id=? AND status='active'`,at,listing.id);
  if(changeCount(sql)!==1)fail('이미 취소된 상품이야');
  changes=[{key:actor,next:q.state,delta:0,action:'market_cancel',
   requestId,detail:'상점 등록 취소 · '+q.quote.label}];
  result={kind,listingId:listing.id,item:q.quote.item,quantity:q.quote.quantity,refunded:true};
 }else{
  const settled=settleListing(current.get(actor).state,current.get(seller).state,listing);
  sql.exec(`UPDATE village_market_v38_listings SET status='sold',buyer_key=?,settled_at=?
    WHERE id=? AND status='active'`,actor,at,listing.id);
  if(changeCount(sql)!==1)fail('상품이 먼저 거래됐어');
  changes=[
   {key:actor,next:settled.buyer,delta:settled.buyerDelta,action:'market_buy',
    requestId,detail:'주민 상품 구매 · '+settled.quote.label},
   {key:seller,next:settled.seller,delta:settled.sellerDelta,action:'market_sold',
    requestId:randomUUID(),detail:'주민 상품 판매 · '+settled.quote.label}
  ];
  result={kind,listingId:listing.id,item:settled.quote.item,quantity:settled.quote.quantity,
   total:settled.quote.gross,tax:settled.quote.tax,sellerNet:settled.quote.net};
 }
 for(const c of changes){
  const hash=sha(JSON.stringify({kind,listing:result.listingId,side:c.key,origin:requestId}));
  write(sql,{...c,original:current.get(c.key),prior:prior.get(c.key),requestHash:hash,at});
 }
 sql.exec(`INSERT INTO village_market_v38_requests(actor_key,request_id,request_hash,result,created_at)
 VALUES(?,?,?,?,?)`,actor,requestId,requestHash,JSON.stringify(result),at);
 const fresh=one(sql,'SELECT state FROM village_economy_v36_accounts WHERE user_key=?',actor);
 return {ok:true,trial:true,...result,economy:economyView(parse(fresh.state),new Date(at))};
}
export async function handleMarketV51(request,storage,db){
 if(!['GET','POST'].includes(request.method))return respond({error:'GET/POST 요청만 지원해'},405);
 const url=new URL(request.url);
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
   return respond({error:'같은 게임 화면에서만 거래할 수 있어'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return respond({error:'JSON 거래 요청만 허용해'},415);
 }
 const user=await userForSession(request,db);
 if(!user)return respond({error:'게임 계정에 로그인해야 거래할 수 있어'},401);
 try{
  const sql=storage.sql,actor=user.id;
  if(request.method==='GET'){
   const current=one(sql,'SELECT state,version FROM village_economy_v36_accounts WHERE user_key=?',actor);
   const all=rows(sql,`SELECT l.id,l.seller_key,l.item,l.quantity,l.unit_price,l.status,l.created_at,
    COALESCE(u.nickname,'마을 주민') AS seller_name
    FROM village_market_v38_listings l
    LEFT JOIN village_users u ON u.id=l.seller_key
    WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 40`);
   const own=rows(sql,`SELECT id,item,quantity,unit_price,status,created_at
    FROM village_market_v38_listings WHERE seller_key=?
    ORDER BY created_at DESC LIMIT 25`,actor);
   return respond({ok:true,trial:true,me:actor,products:MARKET_CATALOG,
    economy:economyView(current?parse(current.state):startingEconomy()),
    listings:all,ownListings:own,version:Number(current?.version||0)});
  }
  const raw=await request.text();
  if(raw.length>20000)return respond({error:'거래 요청이 너무 길어'},413);
  let data;try{data=JSON.parse(raw)}catch{return respond({error:'JSON 형식을 확인해 줘'},400)}
  const outcome=storage.transactionSync(()=>transaction(storage.sql,actor,data,new Date().toISOString()));
  return respond(outcome);
 }catch(e){
  if(e.status&&e.status<500)return respond({error:e.message},e.status);
  console.error('v51 Cloudflare trial market failed',e?.name||'error');
  return respond({error:'서버 거래가 실패했어. 잔액·재고 변경은 취소됐어.'},503);
 }
}
