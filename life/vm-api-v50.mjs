// Node VM compatibility bridge for previously Vercel-only API handlers.
// Reuses the exact authenticated handlers and PostgreSQL ledger: no save migration.
import account from './api/account.js';
import economy36 from './api/economy-v36.js';
import economy37 from './api/economy-v37.js';
import market38 from './api/market-v38.js';
import professions39 from './api/professions-v39.js';
import business40 from './api/business-v40.js';
import workshop41 from './api/workshop-visits-v41.js';
import demand44 from './api/resident-demand-v44.js';
import loyalty45 from './api/customer-loyalty-v45.js';
import honors46 from './api/business-honors-v46.js';
import shareImage from './api/share-image.js';

const ROUTES=Object.freeze({
 '/api/account':account,
 '/api/economy-v36':economy36,
 '/api/economy-v37':economy37,
 '/api/market-v38':market38,
 '/api/professions-v39':professions39,
 '/api/business-v40':business40,
 '/api/workshop-visits-v41':workshop41,
 '/api/resident-demand-v44':demand44,
 '/api/customer-loyalty-v45':loyalty45,
 '/api/business-honors-v46':honors46,
 '/api/share-image':shareImage
});
const MAX_JSON_BYTES=1600000;
function decorateResponse(res){
 res.status=function(code){this.statusCode=code;return this};
 res.send=function(payload){
  if(this.writableEnded)return this;
  if(Buffer.isBuffer(payload)){this.end(payload);return this}
  if(typeof payload==='object'&&payload!==null)return this.json(payload);
  if(!this.hasHeader('content-type'))this.setHeader('content-type','text/plain; charset=utf-8');
  this.end(String(payload??''));return this;
 };
 res.json=function(payload){
  if(this.writableEnded)return this;
  if(!this.hasHeader('content-type'))this.setHeader('content-type','application/json; charset=utf-8');
  this.end(JSON.stringify(payload));return this;
 };
 return res;
}
async function readJSON(req){
 if(req.method!=='POST'&&req.method!=='PUT'&&req.method!=='PATCH')return {};
 const size=Number(req.headers['content-length']||0);
 if(Number.isFinite(size)&&size>MAX_JSON_BYTES)throw Object.assign(new Error('요청 데이터가 너무 큽니다'),{status:413});
 const parts=[];let total=0;
 for await(const chunk of req){
  total+=chunk.length;
  if(total>MAX_JSON_BYTES)throw Object.assign(new Error('요청 데이터가 너무 큽니다'),{status:413});
  parts.push(chunk);
 }
 if(!total)return {};
 const type=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
 if(type!=='application/json')throw Object.assign(new Error('JSON 요청만 지원해요'),{status:415});
 try{
  const decoded=JSON.parse(Buffer.concat(parts).toString('utf8'));
  if(!decoded||typeof decoded!=='object'||Array.isArray(decoded))throw Error('invalid object');
  return decoded;
 }catch{throw Object.assign(new Error('JSON 요청 형식이 올바르지 않습니다'),{status:400})}
}
export async function handleVillageApiV50(req,res,url){
 if(url.pathname==='/api/ws'){
  res.writeHead(426,{'content-type':'application/json','upgrade':'websocket','cache-control':'no-store'});
  res.end(JSON.stringify({error:'WebSocket 연결을 이용해 주세요'}));
  return true;
 }
 if(!url.pathname.startsWith('/api/'))return false;
 const handler=ROUTES[url.pathname];
 if(!handler){
  res.writeHead(404,{'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify({error:'API 경로를 찾지 못했어요'}));
  return true;
 }
 decorateResponse(res);
 req.query=Object.fromEntries(url.searchParams.entries());
 try{
  req.body=await readJSON(req);
  await handler(req,res);
  if(!res.writableEnded)res.end();
 }catch(err){
  if(res.writableEnded)return true;
  const status=Number.isInteger(err?.status)&&err.status>=400&&err.status<=499?err.status:500;
  if(!res.headersSent){
   res.statusCode=status;
   res.setHeader('content-type','application/json; charset=utf-8');
   res.setHeader('cache-control','no-store');
  }
  // Do not expose authentication tokens, SQL, internal file paths or DB details.
  res.end(JSON.stringify({error:status===500?'서버 처리 중 문제가 발생했습니다':err.message}));
  if(status===500)console.error('v50 API failure:',url.pathname,err?.name||'unknown');
 }
 return true;
}
