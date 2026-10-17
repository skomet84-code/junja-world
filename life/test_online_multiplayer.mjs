import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {PHRASES} from './life-systems-v20.js';
const port=38942,url='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
const sockets=[];
async function awaitReady(){
 for(let i=0;i<100;i++){try{if((await fetch(url+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,50))}
 throw Error('WebSocket relay never became ready');
}
async function connect(nick,room='SPRING',fashion={},clientId=null){
 const ws=new WebSocket(url.replace('http:','ws:')+'/ws');
 const messages=[],waiters=[];
 ws.addEventListener('message',e=>{
  let message;try{message=JSON.parse(e.data)}catch{return}
  const waiterIndex=waiters.findIndex(w=>w.type===message.type);
  if(waiterIndex>=0){const w=waiters.splice(waiterIndex,1)[0];clearTimeout(w.timeout);w.resolve(message)}
  else messages.push(message);
 });
 const next=(type,ms=3000)=>new Promise((resolve,reject)=>{
  const index=messages.findIndex(m=>m.type===type);
  if(index>=0){resolve(messages.splice(index,1)[0]);return}
  const w={type,resolve,timeout:setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('Timed out waiting for '+type+' from '+nick))},ms)};
  waiters.push(w);
 });
 sockets.push(ws);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(Error('WebSocket connect failed')),{once:true})});
 ws.send(JSON.stringify({type:'join',room,nick,x:1050,y:955,coat:'mint',hat:'none',dir:0,fashion,clientId}));
 return {ws,next};
}
try{
 await awaitReady();
 assert.equal((await fetch(url+'/health').then(r=>r.json())).ok,true);
 const a=await connect('준자');
 const welcomeA=await a.next('welcome');
 assert.equal(welcomeA.players.length,0);
 const b=await connect('친구B','SPRING',{hair:'fashion_hair_01',outfit:'fashion_outfit_01',pet:'fashion_pet_01'});
 const [welcomeB,joined]=await Promise.all([b.next('welcome'),a.next('join')]);
 assert.equal(welcomeB.players.length,1);
 assert.equal(joined.player.nick,'친구B');
 assert.equal(joined.player.fashion.hair,'fashion_hair_01');
 assert.equal(joined.player.fashion.pet,'fashion_pet_01');
 a.ws.send(JSON.stringify({type:'pos',x:1090,y:970,dir:1,coat:'mint',hat:'none',fashion:{hair:'fashion_hair_02',pet:'not-a-real-pet'}}));
 const moved=await b.next('pos');
 assert.equal(moved.x,1090);
 assert.equal(moved.fashion.hair,'fashion_hair_02');
 assert.equal(moved.fashion.pet,null,'invalid pet ID must be removed');
 b.ws.send(JSON.stringify({type:'say',phrase:PHRASES[0]}));
 const speech=await a.next('speech');
 assert.equal(speech.phrase,PHRASES[0]);
 const c=await connect('친구C','OTHER');
 const welcomeC=await c.next('welcome');
 assert.equal(welcomeC.players.length,0,'different rooms must be isolated');
 for(let i=0;i<6;i++){const guest=await connect('guest'+i);const w=await guest.next('welcome');console.log('capacity QA',i+1,w.players.length);assert.equal(w.players.length,i+2,'room population before guest '+i)}
 const full=await connect('ninth');
 assert.match((await full.next('error')).message,/8명/,'ninth player should get capacity error');
 const status=await fetch(url+'/health').then(r=>r.json());
 assert.equal(status.rooms,2);
 // Same session reopens in another tab -> previous avatar disappears, no duplicates.
 const first=await connect('갓준자','DUPQA',{},'client-87c8a081-cc33-4fb2-bbea');
 await first.next('welcome');
 const second=await connect('갓준자','DUPQA',{},'client-87c8a081-cc33-4fb2-bbea');
 const replaced=await first.next('replaced');
 assert.equal(replaced.type,'replaced');
 const welcomeSecond=await second.next('welcome');
 assert.equal(welcomeSecond.players.length,0,'same browser must show only one avatar');
 assert.equal(welcomeSecond.nick,'갓준자');
 // Different browser with same nickname is uniquely identified on screen.
 const distinct=await connect('갓준자','DUPQA',{},'client-c31c6b7c-d9a8-4fea-b118');
 const welcomeDistinct=await distinct.next('welcome');
 assert.equal(welcomeDistinct.nick,'갓준자·2');
 assert.equal(welcomeDistinct.players.length,1);
 console.log('PASS: WebSocket outfits, chat, room capacity and deduplication with unique names');
}finally{
 for(const ws of sockets){try{ws.close()}catch{}}
 server.kill('SIGTERM');
}
