import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorldEnergySpend} from './world-energy-v53.js';
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const hunt=readFileSync(new URL('./hunt.js',import.meta.url),'utf8');
const economy=readFileSync(new URL('./cf/d1/economy-staging.js',import.meta.url),'utf8');
assert(game.includes("display:none;position:fixed;z-index:38;"),'routine village save status should start hidden');
assert(game.includes("if(status==='saved')setSaveStatus('',false)"),'successful village saves cannot show toast');
assert(game.includes("else if(status==='retry')setSaveStatus"),'save-retry warning must remain visible');
assert(game.includes("if(status==='blocked')showSaveConflict"),'conflict cannot be silently ignored');
assert(game.includes('setInterval(save,12000)'), 'periodic movement autosaves should be less noisy');
assert(hunt.includes("saveNotice.style.cssText='display:none;"),'hunt save status starts hidden');
assert(hunt.includes("if(status==='saved'){saveNotice.style.display='none'"),'successful hunt saves remain silent');
assert(hunt.includes("saveNotice.style.display='block'"),'hunt save errors remain visible');
assert(economy.includes("url.searchParams.get('requestId')"),'GET must allow exact server receipt lookup');
assert(economy.includes("SELECT receipt,action FROM village_economy_v36_events WHERE user_key=? AND request_id=?"),'lookup must be scoped to authenticated player');

// Simulate a mobile POST whose response is lost AFTER the server committed.
// Next different action must reconcile the exact old ID using read-only GET,
// then POST a new action once, with no duplicate old charge.
const ids=[],calls=[],recovery=[],updates=[];
let count=0,oldId='',oldKind='';
const stub=async(url,options)=>{
 calls.push({url,method:options.method,body:options.body});
 assert(options.signal,'POST and reconciliation GET must have explicit timeouts');
 if(options.method==='GET'){
  assert(url.includes('requestId='+encodeURIComponent(oldId)));
  return Response.json({ok:true,transaction:{found:true,kind:oldKind,isWorldSpend:true},energy:{current:96,max:100}});
 }
 const p=JSON.parse(options.body);ids.push(p.requestId);count++;
 if(count===1){oldId=p.requestId;oldKind=p.payload.kind;throw Error('network vanished after commit')}
 return Response.json({ok:true,energy:{current:93,max:100}});
};
const h=createWorldEnergySpend({request:stub,onRecovery:s=>recovery.push(s),onChange:x=>updates.push(x.current)});
await assert.rejects(()=>h.spend('fish'),/network vanished/);
assert.equal(h.unresolved,true);
await h.spend('plant');
assert.equal(calls.filter(x=>x.method==='GET').length,1);
assert.equal(calls.filter(x=>x.method==='POST').length,2,'failed fish was NOT resubmitted by plant action');
assert.notEqual(ids[0],ids[1]);
assert.equal(h.unresolved,false);
assert.equal(recovery.length,1);
assert.deepEqual(updates,[96,93]);

// In another transient case, the original POST NEVER reached the server.
// GET proves absence and releases the pending ID without billing for it.
let phase=0,pendingId;
const absent=createWorldEnergySpend({request:async(url,opt)=>{
 phase++;
 if(phase===1){pendingId=JSON.parse(opt.body).requestId;throw Error('offline before send')}
 if(phase===2){
  assert.equal(opt.method,'GET');
  assert(url.includes(pendingId));
  return Response.json({ok:true,transaction:{found:false,kind:null,isWorldSpend:false},energy:{current:100,max:100}});
 }
 assert.equal(JSON.parse(opt.body).payload.kind,'craft');
 return Response.json({ok:true,energy:{current:94,max:100}});
}});
await assert.rejects(()=>absent.spend('plant'),/offline/);
await absent.spend('craft');
assert.equal(phase,3);
assert.equal(absent.unresolved,false);

// Network still down during status lookup: never charge an unrelated action.
// Once the link recovers, the next user action automatically attempts again.
let repair=false,post=0;
const missing=createWorldEnergySpend({request:async(url,opt)=>{
 if(opt.method==='GET'){
  if(!repair)throw Error('lookup unavailable');
  return Response.json({ok:true,transaction:{found:false,kind:null,isWorldSpend:false},energy:{current:100,max:100}});
 }
 post++;
 if(post===1)throw Error('first request timeout');
 return Response.json({ok:true,energy:{current:95,max:100}});
}});
await assert.rejects(()=>missing.spend('fish'),/timeout/);
await assert.rejects(()=>missing.spend('harvest'),/lookup unavailable/);
assert.equal(post,1,'no different-action POST before resolving earlier ambiguity');
repair=true;
await missing.spend('harvest');
assert.equal(post,2);
assert.equal(missing.unresolved,false);

// Reuse the SAME UUID for the same action after a response drop, preserving
// Cloudflare's idempotent receipt protection.
let last=null,index=0;
const same=createWorldEnergySpend({request:async(url,opt)=>{
 const p=JSON.parse(opt.body);if(index++===0){last=p.requestId;throw Error('read failed')}
 assert.equal(p.requestId,last);
 return Response.json({ok:true,replayed:true,energy:{current:95,max:100}});
}});
await assert.rejects(()=>same.spend('fish'),/read failed/);
await same.spend('fish');
assert.equal(same.unresolved,false);

// Malformed or unauthenticated reconciliation cannot discard a pending debit.
let queries=0;
const unknown=createWorldEnergySpend({request:async(url,opt)=>{
 if(opt.method==='POST')throw Error('temporary');
 queries++;
 return Response.json({error:'다시 로그인해 줘'},{status:401});
}});
await assert.rejects(()=>unknown.spend('plant'),/temporary/);
await assert.rejects(()=>unknown.spend('fish'),/다시 로그인/);
assert.equal(unknown.unresolved,true);
assert.equal(queries,1);

console.log('PASS v54: silent normal save, visible failures, server-verified pending recovery, never double-charge or discard uncertain debit');
