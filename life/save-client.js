// Server versions, never wall clocks or maximum XP, determine snapshot ordering.
export function readJSON(storage,key,fallback=null){try{return JSON.parse(storage.getItem(key)||'null')??fallback}catch{return fallback}}
export function restoreProfile(cloud,storage,key){
 const valid=o=>o&&typeof o==='object'&&!Array.isArray(o);
 const version=Number.isSafeInteger(Number(cloud?.version))?Number(cloud.version):0;
 const remote=valid(cloud?.profile)?cloud.profile:null;
 const draft=readJSON(storage,key+'-unsynced');
 const disk=readJSON(storage,key);
 const checkpoints=readJSON(storage,key+'-checkpoints-v33',[]);
 const lastCheckpoint=Array.isArray(checkpoints)?checkpoints.slice().reverse().find(item=>valid(item?.profile)):null;
 const resume=valid(draft?.profile)&&draft.baseVersion===version;
 // A fresh/missing cloud row is not proof that an account's device progress
 // disappeared. Recover only that account's own local snapshot; never let
 // a local snapshot replace an existing cloud record of a different version.
 const recoverable=!remote&&version===0;
 const local=valid(draft?.profile)?draft.profile:(valid(disk)?disk:(lastCheckpoint?.profile||null));
 const recovered=recoverable&&!!local;
 const profile=resume?draft.profile:(remote||(recovered?local:{}));
 const owned=resume&&Array.isArray(draft.owned)?draft.owned:
    recovered&&Array.isArray(draft?.owned)?draft.owned:
    recovered&&Array.isArray(lastCheckpoint?.owned)?lastCheckpoint.owned:(cloud?.owned||[]);
 return {profile,owned,version,resume:resume||recovered,recovered};
}
export function createSaveQueue({version=0,send,onStatus=()=>{},onCommit=()=>{}}){
 let latest=null,pending=null,running=null,blocked=false,timer=null;
 const clone=x=>JSON.parse(JSON.stringify(x));
 async function drain(){
  clearTimeout(timer);
  while(!blocked&&(pending||latest)){
   if(!pending){pending={...latest,version,requestId:globalThis.crypto.randomUUID()};latest=null}
   const sent=pending;onStatus('saving',sent);
   try{
    const response=await send(sent),result=await response.json().catch(()=>({error:'서버 응답을 읽지 못했습니다'}));
    if([401,403,409,428].includes(response.status)){blocked=true;onStatus('blocked',{...result,status:response.status});return false}
    if(!response.ok&&response.status>=400&&response.status<500&&![408,429].includes(response.status)){
      blocked=true;onStatus('blocked',{...result,status:response.status,error:'HTTP '+response.status+' · '+(result.error||'저장 요청이 거부됐습니다')});return false;
    }
    if(!response.ok||!Number.isSafeInteger(result.version))throw Error('HTTP '+response.status+' · '+(result.error||'저장 확인 실패'));
    version=result.version;pending=null;onCommit(version,latest);onStatus('saved',sent);
   }catch(error){onStatus('retry',error);timer=setTimeout(()=>flush(),5000);return false}
  }
  return !blocked;
 }
 function flush(){if(!running)running=drain().finally(()=>{running=null});return running}
 return {enqueue(profile,owned){latest={profile:clone(profile),owned:[...owned]};return flush()},flush,get version(){return version},get blocked(){return blocked}};
}
