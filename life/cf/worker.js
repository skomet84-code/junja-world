// Cloudflare game/relay with a transitional bridge to the authoritative account API.
// Database hosting stays unchanged; failures never fall back to local saves.
import {bridgeApi} from "./api-bridge.js";
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
  server.serializeAttachment({id:crypto.randomUUID(),room:null,createdAt:Date.now(),lastPos:0,lastChat:0,trustedNick:request.headers.get('x-village-verified-nick')||null});
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
   const desired=sanitizeText(p.trustedNick||msg.nick,12)||'새싹 친구';
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
   return json({ok:true,edge:'cloudflare',database:'existing-api-bridge',release:'v50-bridge',apiHealth:'not-probed'});
  if(u.pathname==='/api/ws'){
   const id=env.VILLAGE_ROOMS.idFromName('village-room-relay-v50');
   return env.VILLAGE_ROOMS.get(id).fetch(request);
  }
  if(u.pathname.startsWith('/api/')){
   return bridgeApi(request);
  }
  if(u.pathname==='/'||u.pathname==='/index.html'){
   return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
  }
  return env.ASSETS.fetch(request);
 }
};
