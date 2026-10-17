// Real relay integration: 8 players per room, no user-entered chat,
// validated preset speech and fully independent resource state.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {PHRASES} from './life-systems-v20.js';
const port=38631;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
const peers=[];
async function ready(){
 for(let i=0;i<130;i++){
  try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 throw Error('Relay server not ready');
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function connect(){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws');ws.inbox=[];
 ws.addEventListener('message',ev=>{try{ws.inbox.push(JSON.parse(ev.data))}catch{}});
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
 });
 peers.push(ws);return ws;
}
async function receive(ws,predicate,ms=3500){
 const start=Date.now();
 while(Date.now()-start<ms){
  const i=ws.inbox.findIndex(predicate);
  if(i>=0)return ws.inbox.splice(i,1)[0];
  await sleep(20);
 }
 throw Error('Expected websocket event was not delivered');
}
try{
 await ready();
 for(let i=0;i<8;i++){
  const ws=await connect();ws.send(JSON.stringify({type:'join',room:'TEST20',nick:'테스트'+i,x:1050,y:955,coat:'mint',hat:'none'}));
  const ack=await receive(ws,m=>m.type==='welcome');
  assert.equal(ack.players.length,i,'Room player count mismatch');
 }
 const denied=await connect();denied.send(JSON.stringify({type:'join',room:'TEST20',nick:'넘침',x:1050,y:955}));
 const err=await receive(denied,m=>m.type==='error');
 assert(err.message.includes('최대 8명'),'Ninth player must be denied');
 const receiver=peers[0],sender=peers[1];
 receiver.inbox.length=0;
 sender.send(JSON.stringify({type:'chat',text:'arbitrary text must not pass'}));
 sender.send(JSON.stringify({type:'say',phrase:'free text arbitrary'}));
 await sleep(240);
 assert(!receiver.inbox.some(m=>m.type==='chat'||m.type==='speech'),'Server must ignore free text and invalid phrases');
 sender.send(JSON.stringify({type:'say',phrase:PHRASES[0]}));
 const event=await receive(receiver,m=>m.type==='speech');
 assert.equal(event.phrase,PHRASES[0]);assert.equal(event.nick,undefined,'Speech packet is preset text only');
 // The relay has no gather/inventory messages: materials are stored on each individual client.
 sender.send(JSON.stringify({type:'gather',item:'wood',amount:99999}));
 await sleep(190);
 assert(!receiver.inbox.some(m=>m.type==='gather'),'No shared resource duplication events');
 console.log('PASS: eight friends per room, ninth refused, no unrestricted chat, preset bubbles only, independent harvest data');
}finally{for(const ws of peers)try{ws.close()}catch{};server.kill('SIGTERM')}
