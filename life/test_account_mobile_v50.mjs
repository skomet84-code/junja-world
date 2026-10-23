// Regression tests for mobile account UI: visible tap feedback and graceful failure.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./account-ui.js',import.meta.url),'utf8');
const ids=['accountLayer','accountMessage','accountLogin','accountRegister','accountOpen','accountClose',
'accountUser','accountNick','accountPassword','accountGuest','accountMember','accountIdentity',
'accountBalance','accountAdmin','accountLogout','accountTransfer','accountRecipient',
'accountAmount','accountGrant','accountUsers','accountUserList','accountReclaim','accountSelf',
'accountSetCoins','accountSetLevel','accountGiveItem','accountCharacterValue','accountItem'];
const elems={};
for(const id of ids)elems[id]={
 value:'',textContent:id,style:{},disabled:false,hidden:false,
 classList:{add(){},remove(){}}, selectedOptions:[{textContent:'hair'}],
 replaceChildren(){},append(){},focus(){}
};
const store=new Map(),postCalls=[];
const replies=[];
const response=(status,body)=>({ok:status>=200&&status<300,status,async json(){return body}});
const sandbox={
 document:{getElementById:id=>elems[id]},
 window:{dispatchEvent(){}},
 location:{reload(){sandbox.reloads++}},
 reloads:0,
 sessionStorage:{
  getItem:key=>store.get(key)||null,
  setItem:(key,val)=>store.set(key,String(val)),
  removeItem:key=>store.delete(key)
 },
 setTimeout,clearTimeout,AbortController,
 crypto:{randomUUID:()=>'11111111-1111-4111-8111-111111111111'},
 CustomEvent:class{},
 confirm:()=>false,
 console,
 fetch:async (path,options)=>{
  const action=new URL(path,'https://qa.invalid/').searchParams.get('action');
  if(action==='me')return response(401,{error:'로그인 필요'});
  postCalls.push({action,...options});
  if(!replies.length)throw Error('No response prepared');
  return replies.shift();
 }
};
vm.runInNewContext(source,sandbox);
assert.equal(sandbox.window.__villageAccountUiLoaded,true);
await new Promise(ok=>setTimeout(ok,0));
elems.accountUser.value='qauser22';
elems.accountNick.value='QA22';
elems.accountPassword.value='not-real-password';
replies.push(response(201,{ok:true,message:'회원가입 완료'}));
const pending=elems.accountRegister.onclick();
assert.match(elems.accountMessage.textContent,/만드는 중/);
assert.equal(elems.accountLogin.disabled,true);
await pending;
assert.match(elems.accountMessage.textContent,/회원가입 완료/);
assert.equal(elems.accountLogin.disabled,false);
assert.equal(JSON.parse(postCalls[0].body).username,'qauser22');
replies.push(response(401,{error:'아이디 또는 비밀번호를 확인해주세요'}));
await elems.accountLogin.onclick();
assert.match(elems.accountMessage.textContent,/아이디 또는 비밀번호/);
assert.equal(elems.accountLogin.disabled,false);
assert.equal(sandbox.reloads,0);
assert.equal(store.size,0,'failure must not create fake sessions');
console.log('PASS mobile signup/loading feedback, login errors, preserved session state');
