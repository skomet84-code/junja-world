// Functional 2-user multiplayer handshake against local Wrangler only.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import WebSocket from 'ws';
const base=process.env.LOCAL_UNIFIED_URL||'http://127.0.0.1:8788';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('local Wrangler only');
const rand=()=>randomBytes(5).toString('hex'),name=()=>('qa'+rand());
async function registerAndLogin(){
 const username=name(),nickname=username.slice(0,12),password='test-only-'+rand();
 async function api(action,data){
  const response=await fetch(base+'/api/account?action='+action,{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(data)});
  return {status:response.status,json:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 const reg=await api('register',{username,nickname,password});
 assert.equal(reg.status,201,JSON.stringify(reg.json));
 const login=await api('login',{username,password});
 assert.equal(login.status,200,JSON.stringify(login.json));
 return {username,nickname,cookie:login.cookie};
}
function connect(cookie){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/api/ws',{headers:{Cookie:cookie,Origin:base}});
  const timer=setTimeout(()=>{ws.terminate();reject(Error('WebSocket timeout'))},10000);
  ws.once('open',()=>{clearTimeout(timer);resolve(ws)});
  ws.once('error',err=>{clearTimeout(timer);reject(err)});
 });
}
function wait(ws,type){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{ws.off('message',onMessage);reject(Error('Timed out waiting for '+type))},10000);
  function onMessage(buf){
   let data;try{data=JSON.parse(String(buf))}catch{return}
   if(data.type!==type)return;
   clearTimeout(timer);ws.off('message',onMessage);resolve(data);
  }
  ws.on('message',onMessage);
 });
}
const a=await registerAndLogin(),b=await registerAndLogin();
const first=await connect(a.cookie);
const aWelcome=wait(first,'welcome');
first.send(JSON.stringify({type:'join',nick:'spoofed nickname',room:'TESTROOM',clientId:'device-a-'+rand(),x:30,y:40,dir:'down'}));
const welcomeA=await aWelcome;
assert.equal(welcomeA.nick,a.nickname,'server must ignore client-supplied nickname');
const second=await connect(b.cookie);
const aSawJoin=wait(first,'join'),bWelcome=wait(second,'welcome');
second.send(JSON.stringify({type:'join',nick:'fake',room:'TESTROOM',clientId:'device-b-'+rand(),x:33,y:44,dir:'up'}));
const [join,welcomeB]=await Promise.all([aSawJoin,bWelcome]);
assert.equal(join.player.nick,b.nickname);
assert.equal(welcomeB.players.length,1);
const seen=wait(first,'pos');
second.send(JSON.stringify({type:'pos',x:145,y:165,dir:'up'}));
const pos=await seen;
assert.equal(pos.x,145);
assert.equal(pos.y,165);
first.close();second.close();
console.log('PASS: two authenticated Cloudflare Durable Object clients, nickname cannot be forged, room join and position broadcast');
