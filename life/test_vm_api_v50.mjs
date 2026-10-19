import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=38862,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{
 cwd:new URL('.',import.meta.url),
 env:{...process.env,PORT:String(port),VERCEL:'',VILLAGE_DATABASE_URL:'',DATABASE_URL:''},
 stdio:['ignore','pipe','pipe']
});
let logs='';server.stderr.on('data',d=>{logs+=d.toString().slice(0,2500)});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function openSocket(){
 const sock=new WebSocket('ws://127.0.0.1:'+port+'/api/ws');
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('WebSocket connection timeout')),7000);
  sock.addEventListener('open',()=>{clearTimeout(timeout);resolve()},{once:true});
  sock.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('WebSocket failed'))},{once:true});
 });
 return sock;
}
function nextEvent(socket,predicate,timeout=7000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.removeEventListener('message',listener);reject(Error('Socket message timeout'))},timeout);
  function listener(event){
   try{const data=JSON.parse(String(event.data));if(!predicate(data))return;
    clearTimeout(timer);socket.removeEventListener('message',listener);resolve(data);
   }catch{}
  }
  socket.addEventListener('message',listener);
 });
}
let a,b;
try{
 let alive=false;
 for(let i=0;i<70;i++){
  if(server.exitCode!==null)throw Error('Server exited early: '+logs);
  try{if((await fetch(base+'/health')).ok){alive=true;break}}catch{}
  await pause(100);
 }
 assert(alive,'VM startup health check failed '+logs);
 const html=await fetch(base+'/index.html');
 assert.equal(html.status,200);
 assert((await html.text()).includes('v49Dock'),'v49 is preserved in VM');
 const missing=await fetch(base+'/api/not-found');
 assert.equal(missing.status,404);
 const source=await fetch(base+'/api/account.js');
 assert.equal(source.status,404,'API source must never be served as a static file');
 const upgrade=await fetch(base+'/api/ws');
 assert.equal(upgrade.status,426,'WebSocket upgrade required');
 const noDb=await fetch(base+'/api/account?action=me');
 assert.equal(noDb.status,503,'Without external DB, refuse account operations; do not reset users');
 const invalid=await fetch(base+'/api/account?action=login',{
  method:'POST',headers:{'content-type':'application/json'},body:'{broken'
 });
 assert.equal(invalid.status,400,'Invalid JSON must be rejected');
 const image=await fetch(base+'/api/share-image');
 assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
 assert((await image.arrayBuffer()).byteLength>1000,'Share image renders');
 a=await openSocket();
 const aw=nextEvent(a,x=>x.type==='welcome');
 a.send(JSON.stringify({type:'join',room:'GARDEN',nick:'friend-A',clientId:'friend-test-client-A-2026'}));
 assert.equal((await aw).players.length,0);
 b=await openSocket();
 const bw=nextEvent(b,x=>x.type==='welcome');
 const joined=nextEvent(a,x=>x.type==='join');
 b.send(JSON.stringify({type:'join',room:'GARDEN',nick:'friend-B',clientId:'friend-test-client-B-2026'}));
 const welcome=await bw;assert.equal(welcome.players.length,1);
 assert.equal((await joined).player.nick,'friend-B');
 const pos=nextEvent(a,x=>x.type==='pos');
 b.send(JSON.stringify({type:'pos',x:700,y:700,dir:1}));
 assert.equal((await pos).x,700);
 console.log('PASS v50 VM: all account routes bridged, auth fails safely without DB, static UI, sharing, 2-user websocket, no API source leak');
}finally{
 a?.close();b?.close();
 server.kill('SIGTERM');
}
