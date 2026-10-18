// Server versions, never wall clocks or maximum XP, determine snapshot ordering.
export function readJSON(storage,key,fallback=null){try{return JSON.parse(storage.getItem(key)||'null')??fallback}catch{return fallback}}
export function restoreProfile(cloud,storage,key){
 const valid=o=>o&&typeof o==='object'&&!Array.isArray(o);
 const version=Number.isSafeInteger(Number(cloud?.version))?Number(cloud.version):0;
 const remote=valid(cloud?.profile)?cloud.profile:null;
 const draft=readJSON(storage,key+'-unsynced');
 const resume=valid(draft?.profile)&&draft.baseVersion===version;
 return {profile:resume?draft.profile:(remote||{}),owned:resume&&Array.isArray(draft.owned)?draft.owned:(cloud?.owned||[]),version,resume};
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
    const response=await send(sent),result=await response.json();
    if([401,403,409,428].includes(response.status)){blocked=true;onStatus('blocked',result);return false}
    if(!response.ok||!Number.isSafeInteger(result.version))throw Error(result.error||'저장 확인 실패');
    version=result.version;pending=null;onCommit(version,latest);onStatus('saved',sent);
   }catch(error){onStatus('retry',error);timer=setTimeout(()=>flush(),5000);return false}
  }
  return !blocked;
 }
 function flush(){if(!running)running=drain().finally(()=>{running=null});return running}
 return {enqueue(profile,owned){latest={profile:clone(profile),owned:[...owned]};return flush()},flush,get version(){return version},get blocked(){return blocked}};
}
