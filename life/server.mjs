/**
 * JUNJA VILLAGE local multiplayer relay. Zero runtime dependencies.
 * Rooms are temporary. Economy / inventories are intentionally client-only in this preview;
 * NEVER treat guest state as authenticated production data.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import crypto from 'node:crypto';
import {PHRASES} from './life-systems-v20.js';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const rooms=new Map();
const port=Number(process.env.PORT||process.env.PORT_HTTP||3000);
const types={'.html':'text/html; charset=utf-8','.webp':'image/webp','.png':'image/png','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  if(url.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return}
  const pathname=url.pathname==='/'?'/index.html':url.pathname;
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(resolve(root)+'/')){res.writeHead(403);res.end('Forbidden');return}
  const type=types[extname(file)];if(!type){res.writeHead(404);res.end('Not found');return}
  let data=await fs.readFile(file);
  if(pathname==='/index.html')data=Buffer.from(data.toString('utf8').replace('<head>','<head><meta name="junja-relay" content="yes">'));
  res.writeHead(200,{'content-type':type,'cache-control':pathname==='/index.html'?'no-cache':'public,max-age=86400','x-content-type-options':'nosniff'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):a));
const clean=(s,n=30)=>String(s||'').replace(/[\x00-\x1f\x7f<>]/g,'').trim().slice(0,n);
const safeRoom=s=>clean(s,12).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'SPRING';
function send(peer,msg){try{if(!peer?.sock?.destroyed){let data=Buffer.from(JSON.stringify(msg));if(data.length>65535)return;const header=data.length<126?Buffer.from([0x81,data.length]):Buffer.from([0x81,126,data.length>>8,data.length&255]);peer.sock.write(Buffer.concat([header,data]));}}catch{}}
function broadcast(room,msg,except){for(const p of room.values())if(p!==except)send(p,msg)}
function removePeer(p){if(p.dead)return;p.dead=true;if(p.room){const r=rooms.get(p.room);r?.delete(p.id);if(r){broadcast(r,{type:'leave',id:p.id});if(r.size===0)rooms.delete(p.room)}}try{p.sock.destroy()}catch{}}
const allowedCoats=new Set(['mint','blue','rose','amber','lavender','coral','navy','cream','forest','pink','linen']);
const allowedHats=new Set(['none','straw','beret','crown','flower','navycap','beanie','cat','ribbon','captain']);
function onMessage(p,msg){
 if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
 if(msg.type==='join'){
  if(p.room)return;
  const roomCode=safeRoom(msg.room);const room=rooms.get(roomCode)||new Map();
  if(room.size>=8){send(p,{type:'error',message:'방이 가득 찼어요 (최대 8명)'});return}
  p.room=roomCode;p.nick=clean(msg.nick,12)||'마을 주민';p.x=clamp(msg.x,85,3515);p.y=clamp(msg.y,120,2300);p.coat=allowedCoats.has(msg.coat)?msg.coat:'mint';p.hat=allowedHats.has(msg.hat)?msg.hat:'none';p.dir=clamp(msg.dir,0,3);
  send(p,{type:'welcome',id:p.id,room:roomCode,players:[...room.values()].map(q=>({id:q.id,nick:q.nick,x:q.x,y:q.y,coat:q.coat,hat:q.hat,dir:q.dir}))});
  rooms.set(roomCode,room);room.set(p.id,p);
  broadcast(room,{type:'join',player:{id:p.id,nick:p.nick,x:p.x,y:p.y,coat:p.coat,hat:p.hat,dir:p.dir}},p);
 }else if(msg.type==='pos'&&p.room){
  const now=Date.now();if(now-p.lastPos<85)return;p.lastPos=now;
  p.x=clamp(msg.x,85,3515);p.y=clamp(msg.y,120,2300);p.dir=clamp(msg.dir,0,3);
  p.coat=allowedCoats.has(msg.coat)?msg.coat:p.coat;p.hat=allowedHats.has(msg.hat)?msg.hat:p.hat;
  broadcast(rooms.get(p.room),{type:'pos',id:p.id,x:p.x,y:p.y,dir:p.dir,coat:p.coat,hat:p.hat},p);
 }else if(msg.type==='say'&&p.room){
  // No free-form chat. Only six server-validated prewritten speech balloons.
  const now=Date.now();if(now-p.lastChat<1000)return;
  if(typeof msg.phrase!=='string'||!PHRASES.includes(msg.phrase))return;
  p.lastChat=now;
  broadcast(rooms.get(p.room),{type:'speech',id:p.id,phrase:msg.phrase,at:now},p);
 }
}
function decodeFrames(p,buf){
 p.buffer=Buffer.concat([p.buffer,buf]);if(p.buffer.length>131072){removePeer(p);return}
 while(p.buffer.length>=2){const first=p.buffer[0],b=p.buffer[1],masked=!!(b&128),op=first&15;if(!masked){removePeer(p);return}
  let n=b&127,header=2;if(n===126){if(p.buffer.length<4)return;n=p.buffer.readUInt16BE(2);header=4}if(n===127||n>8192){removePeer(p);return}
  if(p.buffer.length<header+4+n)return;const mask=p.buffer.subarray(header,header+4),data=Buffer.from(p.buffer.subarray(header+4,header+4+n));p.buffer=p.buffer.subarray(header+4+n);
  for(let i=0;i<data.length;i++)data[i]^=mask[i%4];
  if(op===8){removePeer(p);return}if(op===9){const pong=Buffer.concat([Buffer.from([0x8a,data.length]),data]);p.sock.write(pong);continue}if(op!==1)continue;
  try{onMessage(p,JSON.parse(data.toString('utf8')))}catch{}
 }
}
server.on('upgrade',(req,sock,head)=>{
 try{
  const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(u.pathname!=='/ws'){sock.destroy();return}
  if(req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'){sock.destroy();return}
  const key=req.headers['sec-websocket-key'];if(typeof key!=='string'||Buffer.from(key,'base64').length!==16){sock.destroy();return}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const peer={id:crypto.randomBytes(5).toString('hex'),sock,dead:false,room:null,buffer:Buffer.alloc(0),lastChat:0,lastPos:0};
  sock.on('data',b=>decodeFrames(peer,b));sock.on('close',()=>removePeer(peer));sock.on('error',()=>removePeer(peer));if(head?.length)decodeFrames(peer,head);
 }catch{sock.destroy()}
});
server.listen(port,'0.0.0.0',()=>console.log(`JUNJA VILLAGE http://localhost:${port}`));