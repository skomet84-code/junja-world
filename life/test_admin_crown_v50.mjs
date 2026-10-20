// A regression test for the live crown button that failed when the owner
// changed from legacy admin_junja2 to skomet.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./admin-panel.js',import.meta.url),'utf8')
 .replace("import {CATALOG} from './fashion-catalog.js';","const CATALOG=[];");
const elements=new Map();
function element(id){
 if(!elements.has(id)){
  const e={id,style:{},dataset:{},value:'',textContent:'',innerHTML:'',hidden:false,
   append(){},replaceChildren(){},setAttribute(){},addEventListener(){},
   classList:{add(n){e.open=n==='show'},remove(){e.open=false}},
   querySelectorAll(){return []}};
  elements.set(id,e);
 }
 return elements.get(id);
}
const listeners={};
const win={
 addEventListener(name,handler){(listeners[name]??=[]).push(handler)},
 dispatch(name,detail){for(const fn of listeners[name]||[])fn({detail})}
};
let actor={username:'skomet',nickname:'준자',role:'admin'};
const replies={
 me:()=>({status:200,user:actor}),
 admin_users:()=>({status:200,users:[{username:'skomet',nickname:'준자',role:'admin'}]})
};
const fetcher=async url=>{
 const action=new URL(url,'https://game.example').searchParams.get('action');
 const response=replies[action]?.();
 if(!response)return {ok:false,status:404,json:async()=>({error:'unknown action'})};
 return {ok:response.status===200,status:response.status,json:async()=>response};
};
const document={
 createElement(tag){return element('new-'+tag+'-'+elements.size)},
 getElementById:id=>element(id),
 head:{append(){}},body:{append(){}}
};
const sandbox={window:win,document,fetch:fetcher,console,confirm:()=>true};
vm.runInNewContext(source,sandbox);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
await tick();
const btn=element('junjaAdminBtn');
assert.equal(btn.style.display,'flex','skomet owner should see crown');
assert.equal(element('jaSelf').onclick instanceof Function || typeof element('jaSelf').onclick==='function',true);
element('jaSelf').onclick();
assert.equal(element('jaSelected').textContent,'✅ 선택: 준자 (skomet)',
 'self-grant must target real skomet user, not removed admin_junja2');
win.dispatch('village-auth',{username:'ordinary',nickname:'친구',role:'player'});
assert.equal(btn.style.display,'none','regular users never see crown');
assert.equal(element('junjaAdminPanel').open,false);
win.dispatch('village-auth',{username:'skomet',nickname:'준자',role:'admin'});
assert.equal(btn.style.display,'flex','verified admin event restores crown');
win.dispatch('village-auth',null);
assert.equal(btn.style.display,'none','logout hides crown');
actor={username:'skomet',nickname:'준자',role:'admin'};
for(const callback of listeners.pageshow||[])callback({});
await tick();
assert.equal(btn.style.display,'flex','browser returning to tab refreshes admin crown');
console.log('PASS: skomet crown, user-only hiding, current-account self grant, tab resume refresh');
