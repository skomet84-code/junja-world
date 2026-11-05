// Isolated D1 production-candidate WebSocket relay, no Vercel/Neon bridge imports.
import {DurableObject} from 'cloudflare:workers';
import {
 MAX_ROOM_PLAYERS,normalizeRoom,normalizeClientId,sanitizeText,sanitizeAvatar,
 isAllowedPhrase,playerSummary
} from '../room-protocol-v50.js';
const response=(error,status)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
const state=s=>{try{return s.deserializeAttachment()||null}catch{return null}};
const open=s=>s.readyState===WebSocket.OPEN;
function send(ws,data){try{if(open(ws))ws.send(JSON.stringify(data))}catch{}}
export class VillageRoom extends DurableObject {
 peers(room,except=null){return this.ctx.getWebSockets().filter(s=>s!==except&&open(s)&&state(s)?.room===room)}
 broadcast(room,data,except=null){for(const ws of this.peers(room,except))send(ws,data)}
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return response('WebSocket 업그레이드가 필요해요',426);
  const verifiedNick=sanitizeText(request.headers.get('x-village-verified-nick'),12);
  if(!verifiedNick)return response('인증된 계정의 이름이 필요해요',401);
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({
   id:crypto.randomUUID(),room:null,trustedNick:verifiedNick,
   lastPos:0,lastChat:0,createdAt:Date.now()
  });
  return new Response(null,{status:101,webSocket:client});
 }
 webSocketMessage(ws,raw){
  if(typeof raw!=='string'||raw.length>8192)return;
  let msg;try{msg=JSON.parse(raw)}catch{return}
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
  const p=state(ws);if(!p)return;
  if(msg.type==='join'){
   if(p.room)return;
   const room=normalizeRoom(msg.room),clientId=normalizeClientId(msg.clientId);
   // A single browser session in a room replaces its old tab only.
   if(clientId)for(const other of this.peers(room)){
    const older=state(other);
    if(older?.clientId===clientId&&older?.trustedNick===p.trustedNick){
     send(other,{type:'replaced',message:'다른 탭에서 같은 계정으로 접속했습니다'});
     this.discard(other);try{other.close(1000,'replaced')}catch{}
    }
   }
   const others=this.peers(room);
   if(others.length>=MAX_ROOM_PLAYERS){
    send(ws,{type:'error',message:'방이 가득 찼어요 (최대 8명)'});return;
   }
   const desired=p.trustedNick,used=new Set(others.map(s=>state(s)?.nick));
   let nick=desired;
   if(used.has(nick))for(let i=2;i<100;i++){
    const candidate=desired.slice(0,10)+'·'+i;
    if(!used.has(candidate)){nick=candidate;break}
   }
   const next={...p,...sanitizeAvatar(msg),clientId,room,nick};
   ws.serializeAttachment(next);
   send(ws,{type:'welcome',id:next.id,nick,room,players:others.map(s=>playerSummary(state(s)))});
   this.broadcast(room,{type:'join',player:playerSummary(next)},ws);
  }else if(msg.type==='pos'&&p.room){
   const now=Date.now();if(now-Number(p.lastPos||0)<85)return;
   const next={...p,...sanitizeAvatar(msg,p),lastPos:now};
   ws.serializeAttachment(next);
   this.broadcast(p.room,{type:'pos',id:p.id,x:next.x,y:next.y,dir:next.dir,
    coat:next.coat,hat:next.hat,fashion:next.fashion},ws);
  }else if(msg.type==='say'&&p.room){
   const now=Date.now();if(now-Number(p.lastChat||0)<1000||!isAllowedPhrase(msg.phrase))return;
   ws.serializeAttachment({...p,lastChat:now});
   this.broadcast(p.room,{type:'speech',id:p.id,phrase:msg.phrase,at:now},ws);
  }
 }
 discard(ws){
  const p=state(ws);
  if(p?.room){ws.serializeAttachment({...p,room:null});this.broadcast(p.room,{type:'leave',id:p.id},ws)}
 }
 webSocketClose(ws){this.discard(ws)}
 webSocketError(ws){this.discard(ws)}
}
