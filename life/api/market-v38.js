// v38 trial-only player market: authenticated, DB-serialized escrow and one-transaction settlement.
// Never read or modify village_wallets, village_saves, levels or the original personal-farm inventory.
import pg from 'pg';
import {createHash,randomUUID} from 'node:crypto';
import {startingEconomy,economyView} from '../secure-economy-v36.js';
import {makeCheckpoint,validateCheckpointChain} from '../economy-integrity-v37.js';
import {reserveListing,cancelListing,settleListing,marketQuote,MARKET_MAX_LISTINGS} from '../player-market-v38.js';
const livePool=new pg.Pool({connectionString:process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:4});
const hash=s=>createHash('sha256').update(s).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(error,status=409)=>{let e=new Error(error);e.status=status;throw e};
function requestBody(b){
 if(!b||typeof b!=='object'||Array.isArray(b))fail('거래 요청이 올바르지 않습니다',400);
 const kind=b.kind,raw=b.payload&&typeof b.payload==='object'&&!Array.isArray(b.payload)?b.payload:{};
 if(!['list','buy','cancel'].includes(kind))fail('지원하지 않는 거래입니다',400);
 let payload;
 if(kind==='list')payload={item:raw.item,quantity:raw.quantity,unitPrice:raw.unitPrice};
 else payload={listingId:raw.listingId};
 if(kind!=='list'&&(typeof payload.listingId!=='string'||!uuid.test(payload.listingId)))fail('거래 상품 번호가 올바르지 않습니다',400);
 if(kind==='list')marketQuote(payload.item,payload.unitPrice,payload.quantity);
 return {kind,payload};
}
function userCookie(req){
 return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('village_session='))?.slice(16)||'';
}
function sameOrigin(req){
 try{
  const url=new URL(req.headers.origin);
  return ['http:','https:'].includes(url.protocol)&&url.host.toLowerCase()===String(req.headers.host||'').toLowerCase()&&
    !['cross-site','same-site','none'].includes(req.headers['sec-fetch-site']||'');
 }catch{return false}
}
async function latestCheckpoints(client,key){
 const q=await client.query('SELECT version,state,previous_hash,state_hash,request_id FROM village_economy_v37_checkpoints WHERE user_key=$1 ORDER BY version DESC LIMIT 25',[key]);
 return q.rows;
}
async function readyAccount(client,key,row){
 let rows=await latestCheckpoints(client,key);
 if(rows.length){
  const audit=validateCheckpointChain(key,row,rows);
  if(!audit.ok)fail('거래 장부와 보유 재산 기록이 일치하지 않습니다 ('+audit.reason+')',409);
  return rows[0].state_hash;
 }
 const baseline=makeCheckpoint(key,Number(row.version),row.state);
 await client.query(`INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id)
 VALUES($1,$2,$3::jsonb,$4,$5,$6)`,[key,baseline.version,JSON.stringify(baseline.state),null,baseline.state_hash,null]);
 return baseline.state_hash;
}
async function writeAccount(client,key,row,next,delta,action,requestId,requestHash,now,details,previousHash){
 const version=Number(row.version)+1;
 if(!Number.isSafeInteger(version))fail('저장 버전이 너무 큽니다',500);
 await client.query(`UPDATE village_economy_v36_accounts SET state=$2::jsonb,version=version+1,updated_at=now()
 WHERE user_key=$1`,[key,JSON.stringify(next)]);
 const receipt={action,detail:details,delta,balance:next.coins,day:now.toISOString().slice(0,10),at:now.toISOString()};
 await client.query(`INSERT INTO village_economy_v36_events
 (user_key,request_id,request_hash,action,amount_delta,balance_after,receipt)
 VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
 [key,requestId,requestHash,action,delta,next.coins,JSON.stringify(receipt)]);
 const snap=makeCheckpoint(key,version,next,previousHash,requestId);
 await client.query(`INSERT INTO village_economy_v37_checkpoints(user_key,version,state,previous_hash,state_hash,request_id)
 VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
 [key,version,JSON.stringify(next),snap.previous_hash,snap.state_hash,requestId]);
 return version;
}
const respond=(res,status,json)=>res.status(status).json(json);
export function makePlayerMarketHandler({pool=livePool,now=()=>new Date()}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'지원하지 않는 요청'});
  if(process.env.ENABLE_VILLAGE_MARKET_V38!=='true')return respond(res,503,{error:'마을 거래소는 안전성 검증 전까지 비활성화 상태예요'});
  if(!process.env.VILLAGE_DATABASE_URL&&!process.env.DATABASE_URL&&pool===livePool)return respond(res,503,{error:'시험 데이터베이스를 연결해야 해요'});
  if(req.method==='POST'&&(!sameOrigin(req)||!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')))
   return respond(res,403,{error:'같은 게임에서 보낸 JSON 요청만 허용합니다'});
  const token=userCookie(req);
  if(!/^[a-f0-9]{64}$/.test(token))return respond(res,401,{error:'준자마을 계정으로 로그인해야 해요'});
  let client=null,tx=false;
  try{
   client=await pool.connect();
   const auth=await client.query(`SELECT u.id,u.nickname FROM village_sessions s
     JOIN village_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash(token)]);
   if(!auth.rows.length)return respond(res,401,{error:'로그인 세션이 만료됐어요'});
   const actor=String(auth.rows[0].id);
   if(req.method==='GET'){
    const mine=await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1',[actor]);
    const all=await client.query(`SELECT l.id,l.seller_key,l.item,l.quantity,l.unit_price,l.status,l.created_at,
      COALESCE(u.nickname,'마을 주민') AS seller_name
      FROM village_market_v38_listings l LEFT JOIN village_users u ON u.id::text=l.seller_key
      WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 40`);
    const own=await client.query(`SELECT id,item,quantity,unit_price,status,created_at
      FROM village_market_v38_listings WHERE seller_key=$1 ORDER BY created_at DESC LIMIT 25`,[actor]);
    return respond(res,200,{ok:true,trial:true,me:actor,economy:economyView(mine.rows[0]?.state||startingEconomy(),now()),listings:all.rows,ownListings:own.rows,version:Number(mine.rows[0]?.version||0)});
   }
   const id=req.body?.requestId;
   if(typeof id!=='string'||!uuid.test(id))return respond(res,400,{error:'중복 거래 방지 요청 ID가 필요합니다'});
   const {kind,payload}=requestBody(req.body),requestHash=hash(JSON.stringify({kind,payload}));
   await client.query('BEGIN');tx=true;
   let listing=null,seller=actor;
   if(kind!=='list'){
    const find=await client.query('SELECT * FROM village_market_v38_listings WHERE id=$1',[payload.listingId]);
    if(!find.rows.length)fail('해당 판매 물품을 찾을 수 없어요',404);
    listing=find.rows[0];seller=String(listing.seller_key);
   }
   // Lock every involved wallet in the SAME sorted order to prevent deadlocks.
   const ids=[...new Set([actor,seller])].sort();
   const accounts=new Map();
   for(const key of ids){
    await client.query(`INSERT INTO village_economy_v36_accounts(user_key,state)
      VALUES($1,$2::jsonb) ON CONFLICT(user_key) DO NOTHING`,[key,JSON.stringify(startingEconomy())]);
   }
   for(const key of ids){
    const q=await client.query('SELECT state,version FROM village_economy_v36_accounts WHERE user_key=$1 FOR UPDATE',[key]);
    if(!q.rows.length)fail('경제 계정을 잠그지 못했어요',500);
    accounts.set(key,q.rows[0]);
   }
   // Check committed replay under the actor's account lock before enforcing listing state.
   const duplicated=await client.query('SELECT request_hash,result FROM village_market_v38_requests WHERE actor_key=$1 AND request_id=$2',[actor,id]);
   if(duplicated.rows.length){
    if(duplicated.rows[0].request_hash!==requestHash)fail('같은 요청 번호로 다른 거래를 할 수 없어요');
    await client.query('COMMIT');tx=false;
    return respond(res,200,{ok:true,replayed:true,...duplicated.rows[0].result,economy:economyView(accounts.get(actor).state,now())});
   }
   if(listing){
    const locked=await client.query('SELECT * FROM village_market_v38_listings WHERE id=$1 FOR UPDATE',[payload.listingId]);
    if(!locked.rows.length)fail('상품을 찾을 수 없어요',404);
    listing=locked.rows[0];
    if(String(listing.seller_key)!==seller)fail('판매자 정보가 변경됐어요');
    if(listing.status!=='active')fail('이미 판매되었거나 등록 취소된 상품이에요');
   }
   if(kind==='buy'&&seller===actor)fail('본인 상점의 상품은 구매할 수 없어요',400);
   if(kind==='cancel'&&seller!==actor)fail('본인 상점의 판매만 취소할 수 있어요',403);
   if(kind==='list'){
    const active=await client.query("SELECT count(*)::int AS n FROM village_market_v38_listings WHERE seller_key=$1 AND status='active'",[actor]);
    if(Number(active.rows[0].n)>=MARKET_MAX_LISTINGS)fail('동시 판매 등록은 12개까지 가능합니다');
   }
   const before=new Map();
   for(const key of ids)before.set(key,await readyAccount(client,key,accounts.get(key)));
   let changes,marketResult;
   const when=now();
   if(kind==='list'){
    const q=reserveListing(accounts.get(actor).state,payload.item,payload.unitPrice,payload.quantity);
    const listingId=randomUUID();
    await client.query(`INSERT INTO village_market_v38_listings(id,seller_key,item,quantity,unit_price,status)
      VALUES($1,$2,$3,$4,$5,'active')`,[listingId,actor,q.quote.item,q.quote.quantity,q.quote.unitPrice]);
    changes=[{key:actor,state:q.state,delta:q.delta,action:'market_list',requestId:id,detail:'개인 상점 판매 등록 · '+q.quote.label}];
    marketResult={kind,listingId,item:q.quote.item,quantity:q.quote.quantity,unitPrice:q.quote.unitPrice,listingFee:q.quote.fee};
   }else if(kind==='cancel'){
    const q=cancelListing(accounts.get(actor).state,listing);
    await client.query("UPDATE village_market_v38_listings SET status='cancelled',settled_at=now() WHERE id=$1",[listing.id]);
    changes=[{key:actor,state:q.state,delta:0,action:'market_cancel',requestId:id,detail:'상점 등록 취소 · '+q.quote.label}];
    marketResult={kind,listingId:listing.id,item:q.quote.item,quantity:q.quote.quantity,refunded:true};
   }else{
    const s=settleListing(accounts.get(actor).state,accounts.get(seller).state,listing);
    await client.query(`UPDATE village_market_v38_listings SET status='sold',buyer_key=$2,settled_at=now()
      WHERE id=$1`,[listing.id,actor]);
    changes=[
     {key:actor,state:s.buyer,delta:s.buyerDelta,action:'market_buy',requestId:id,detail:'주민 상점 구매 · '+s.quote.label},
     {key:seller,state:s.seller,delta:s.sellerDelta,action:'market_sold',requestId:randomUUID(),detail:'주민 상점 판매 완료 · '+s.quote.label}
    ];
    marketResult={kind,listingId:listing.id,item:s.quote.item,quantity:s.quote.quantity,total:s.quote.gross,tax:s.quote.tax,sellerNet:s.quote.net};
   }
   for(const change of changes){
    const prev=accounts.get(change.key);
    await writeAccount(client,change.key,prev,change.state,change.delta,change.action,
      change.requestId,hash(JSON.stringify({kind,listing:marketResult.listingId,side:change.key,origin:id})),when,change.detail,before.get(change.key));
    accounts.set(change.key,{state:change.state,version:Number(prev.version)+1});
   }
   await client.query(`INSERT INTO village_market_v38_requests(actor_key,request_id,request_hash,result)
     VALUES($1,$2,$3,$4::jsonb)`,[actor,id,requestHash,JSON.stringify(marketResult)]);
   await client.query('COMMIT');tx=false;
   return respond(res,200,{ok:true,...marketResult,economy:economyView(accounts.get(actor).state,when)});
  }catch(error){
   if(tx&&client){try{await client.query('ROLLBACK')}catch{}}
   if(error.code==='42P01')return respond(res,503,{error:'마을 거래소의 시험용 테이블이 아직 준비되지 않았어요'});
   if(error.status&&error.status<500)return respond(res,error.status,{error:error.message});
   console.error('market v38 transaction failure',error.code||'',error.message);
   return respond(res,500,{error:'서버 거래가 실패해 거래를 취소했어요. 재고나 골드를 임의로 바꾸지 않았습니다'});
  }finally{client?.release()}
 };
}
export default makePlayerMarketHandler();
