// Cloudflare Workers Free prototype: static game + SQLite-backed Durable Object relay.
// Production account and wallet endpoints are explicitly blocked until fully migrated.
// Never silently fall back to guest or local data on a missing durable DB.
import {DurableObject} from 'cloudflare:workers';
import {
 MAX_ROOM_PLAYERS,normalizeRoom,normalizeClientId,sanitizeText,sanitizeAvatar,
 isAllowedPhrase,playerSummary
} from './room-protocol-v50.js';

const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const LIMIT_BYTES=8192;
const socketState=(s)=>{try{return s.deserializeAttachment()||null}catch{return null}};
const isOpen=s=>s.readyState===WebSocket.OPEN;
function send(s,payload){try{if(isOpen(s))s.send(JSON.stringify(payload))}catch{}}
export class VillageRoom extends DurableObject{
 peers(room,exclude=null){
  return this.ctx.getWebSockets().filter(s=>s!==exclude&&isOpen(s)&&socketState(s)?.room===room);
 }
 broadcast(room,payload,exclude=null){
  for(const peer of this.peers(room,exclude))send(peer,payload);
 }
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket 업그레이드가 필요해요'},426);
  const pair=new WebSocketPair();const [client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({id:crypto.randomUUID(),room:null,createdAt:Date.now(),lastPos:0,lastChat:0});
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,raw){
  if(typeof raw!=='string'||raw.length>LIMIT_BYTES)return;
  let msg;try{msg=JSON.parse(raw)}catch{return}
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  const p=socketState(ws);if(!p)return;
  if(msg.type==='join'){
   if(p.room)return;
   const room=normalizeRoom(msg.room);
   const clientId=normalizeClientId(msg.clientId);
   // Replace only same-browser session in same room. Never replace by nickname.
   if(clientId)for(const other of this.peers(room)){
    const q=socketState(other);
    if(q?.clientId===clientId){
     send(other,{type:'replaced',message:'다른 탭에서 마을에 접속해 기존 연결을 종료했어요'});
     this.discard(other);try{other.close(1000,'replaced')}catch{}
    }
   }
   const others=this.peers(room);
   if(others.length>=MAX_ROOM_PLAYERS){
    send(ws,{type:'error',message:'방이 가득 찼어요 (최대 8명)'});return;
   }
   const desired=sanitizeText(msg.nick,12)||'새싹 친구';
   const used=new Set(others.map(s=>socketState(s)?.nick));
   let nick=desired;
   if(used.has(nick))for(let i=2;i<100;i++){
    const candidate=desired.slice(0,10)+'·'+i;
    if(!used.has(candidate)){nick=candidate;break}
   }
   const next={...p,...sanitizeAvatar(msg),clientId,room,nick};
   ws.serializeAttachment(next);
   send(ws,{type:'welcome',id:next.id,nick,room,players:others.map(x=>playerSummary(socketState(x)))});
   this.broadcast(room,{type:'join',player:playerSummary(next)},ws);
  }else if(msg.type==='pos'&&p.room){
   const now=Date.now();if(now-(p.lastPos||0)<85)return;
   const next={...p,...sanitizeAvatar(msg,p),lastPos:now};
   ws.serializeAttachment(next);
   this.broadcast(p.room,{type:'pos',id:p.id,x:next.x,y:next.y,dir:next.dir,
    coat:next.coat,hat:next.hat,fashion:next.fashion},ws);
  }else if(msg.type==='say'&&p.room){
   const now=Date.now();if(now-(p.lastChat||0)<1000||!isAllowedPhrase(msg.phrase))return;
   ws.serializeAttachment({...p,lastChat:now});
   this.broadcast(p.room,{type:'speech',id:p.id,phrase:msg.phrase,at:now},ws);
  }
 }
 discard(ws){
  const p=socketState(ws);
  if(p?.room){
   ws.serializeAttachment({...p,room:null});
   this.broadcast(p.room,{type:'leave',id:p.id},ws);
  }
 }
 webSocketClose(ws){this.discard(ws)}
 webSocketError(ws){this.discard(ws)}
}
export default{
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/api/health'||u.pathname==='/health')
   return json({ok:true,edge:'cloudflare',database:'not connected',release:'v50-preview'});
  if(u.pathname==='/api/ws'){
   const id=env.VILLAGE_ROOMS.idFromName('village-room-relay-v50');
   return env.VILLAGE_ROOMS.get(id).fetch(request);
  }
  // Preserve the existing authoritative PostgreSQL account and economy APIs.
  // The Cloudflare worker is a same-origin reverse proxy, not a second wallet DB.
  // Configure VILLAGE_API_ORIGIN in Cloudflare secrets to the verified Vercel API host.
  // Fail closed if it is missing; never silently switch to local guest saves.
  if(u.pathname.startsWith('/api/')){
   const allowed=new Set(['/api/account','/api/economy-v36','/api/economy-v37',
    '/api/market-v38','/api/professions-v39','/api/business-v40',
    '/api/workshop-visits-v41','/api/resident-demand-v44',
    '/api/customer-loyalty-v45','/api/business-honors-v46','/api/share-image']);
   if(!allowed.has(u.pathname))return json({error:'알 수 없는 API 경로'},404);
   const origin=env.VILLAGE_API_ORIGIN;
   if(!origin)return json({error:'정식 저장 API 연결 전입니다. 데이터는 변경되지 않았어요',reason:'migration_incomplete'},503);
   let base;
   try{
    base=new URL(origin);
    if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')
     throw Error('invalid origin');
   }catch{return json({error:'API 서버 설정 오류',reason:'invalid_api_origin'},503)}
   const target=new URL(u.pathname+u.search,base);
   const headers=new Headers(request.headers);
   headers.delete('host');
   headers.delete('origin');
   headers.delete('referer');
   headers.delete('x-forwarded-host');
   const upstream=await fetch(new Request(target,request),{redirect:'manual',headers});
   const responseHeaders=new Headers(upstream.headers);
   responseHeaders.set('cache-control','no-store');
   responseHeaders.delete('access-control-allow-origin');
   return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  }
  if(u.pathname==='/'||u.pathname==='/index.html'){
   return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
  }
  return env.ASSETS.fetch(request);
 }
};
