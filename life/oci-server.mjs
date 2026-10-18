/**
 * Oracle Cloud VM entrypoint for the Village (NOT the MMORPG frontdoor).
 * Reuses the existing multiplayer WebSocket upgrade handler from server.mjs.
 * Serves ONLY the allowlisted browser assets produced by build-vercel.mjs.
 * PostgreSQL remains external; nothing here initializes or overwrites saves.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, extname, sep, dirname} from 'node:path';
import {URL} from 'node:url';
import accountHandler from './api/account.js';

const previousVercel=process.env.VERCEL;
process.env.VERCEL='1'; // prevents the legacy relay from binding its own HTTP port
const {default:server}=await import('./server.mjs');
if(previousVercel===undefined)delete process.env.VERCEL;
else process.env.VERCEL=previousVercel;

// Replace legacy static-file response routing; keep its WebSocket upgrade listener.
server.removeAllListeners('request');

const publicRoot=resolve(dirname(fileURLToPath(import.meta.url)),'public');
const mime={
 '.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.png':'image/png',
 '.webp':'image/webp',
 '.jpg':'image/jpeg',
 '.jpeg':'image/jpeg',
 '.svg':'image/svg+xml',
 '.woff2':'font/woff2',
 '.txt':'text/plain; charset=utf-8'
};
const port=Number(process.env.PORT||3000);

function error(res,status,message){
 if(res.headersSent){res.end();return}
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
 res.end(JSON.stringify({error:message}));
}
function adaptResponse(res){
 res.status=(status)=>{res.statusCode=status;return res};
 res.json=(body)=>{if(!res.headersSent)res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));return res};
 res.send=(body)=>{
  if(!res.hasHeader('Content-Type'))res.setHeader('Content-Type',Buffer.isBuffer(body)?'application/octet-stream':'text/plain; charset=utf-8');
  res.end(body);return res;
 };
}
async function parseBody(req){
 if(req.method!=='POST')return {};
 const ct=String(req.headers['content-type']||'').toLowerCase();
 if(!ct.startsWith('application/json')){const e=new Error('JSON 요청만 지원해요');e.status=415;throw e}
 const chunks=[];let size=0;
 for await(const chunk of req){
  size+=chunk.length;
  if(size>256*1024){const e=new Error('요청 크기 제한 초과');e.status=413;throw e}
  chunks.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
 catch{const e=new Error('JSON 요청 형식 오류');e.status=400;throw e}
}
async function route(req,res){
 const url=new URL(req.url||'/', 'http://localhost');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(url.pathname==='/health'||url.pathname==='/api/health'){
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({ok:true,service:'junja-village-oci',databaseConfigured:Boolean(process.env.VILLAGE_DATABASE_URL||process.env.DATABASE_URL)}));
  return;
 }
 if(url.pathname==='/api/account'){
  req.query=Object.fromEntries(url.searchParams.entries());
  req.body=await parseBody(req);
  adaptResponse(res);
  return accountHandler(req,res);
 }
 if(url.pathname==='/api/share-image'){
  adaptResponse(res);
  const {default:handler}=await import('./api/share-image.js');
  return handler(req,res);
 }
 if(url.pathname==='/api/ws'){
  return error(res,426,'WebSocket Upgrade 요청이 필요합니다');
 }
 if(!['GET','HEAD'].includes(req.method))return error(res,405,'지원하지 않는 요청');
 let pathname;
 try{pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)}
 catch{return error(res,400,'잘못된 경로')}
 if(pathname.includes('\0')||pathname.includes('\\'))return error(res,400,'잘못된 경로');
 const file=resolve(publicRoot,'.'+pathname);
 if(!file.startsWith(publicRoot+sep))return error(res,403,'접근 불가');
 const type=mime[extname(file).toLowerCase()];
 if(!type)return error(res,404,'파일 없음');
 let data;
 try{data=await readFile(file)}
 catch{return error(res,404,'파일 없음')}
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
 res.end(req.method==='HEAD'?undefined:data);
}
server.on('request',(req,res)=>{Promise.resolve(route(req,res)).catch(e=>{
 console.error('[OCI village]',String(e?.message||e));
 if(!res.writableEnded)error(res,e?.status||500,e?.status?String(e.message):'서버 요청 처리 오류');
})});
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
server.listen(port,'0.0.0.0',()=>console.log('[OCI village] listening on '+port));
