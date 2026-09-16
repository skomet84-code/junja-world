const SAVE_KEY='junja-world-v01';
export const JUNJA_WORLD_VERSION='3.2.0';

type ModuleState='idle'|'loading'|'ready'|'failed';
type ModuleRecord={state:ModuleState;startedAt?:number;finishedAt?:number;error?:string};
type ModuleLoader=()=>Promise<unknown>;

const bus=new EventTarget();
const modules:Record<string,ModuleRecord>={};

function readSave<T=any>():T|null{
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null') as T|null;}catch{return null;}
}

function writeSave(save:any){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(save));
    emit('save',{save});
    return true;
  }catch(error){
    console.error('[JW CORE] save failed',error);
    emit('save-error',{error:String((error as any)?.message||error)});
    return false;
  }
}

function emit(name:string,detail?:unknown){bus.dispatchEvent(new CustomEvent(name,{detail}));}
function on(name:string,handler:(detail:any)=>void){const listener=(event:Event)=>handler((event as CustomEvent).detail);bus.addEventListener(name,listener);return()=>bus.removeEventListener(name,listener);}
function moduleState(id:string){return modules[id]?.state||'idle';}
function snapshot(){return {version:JUNJA_WORLD_VERSION,modules:structuredClone(modules),savePresent:!!readSave()};}

export async function loadCoreModule(id:string,loader:ModuleLoader){
  const existing=modules[id];
  if(existing?.state==='ready')return true;
  const startedAt=Date.now();
  modules[id]={state:'loading',startedAt};
  emit('module-loading',{id});
  try{
    await loader();
    modules[id]={state:'ready',startedAt,finishedAt:Date.now()};
    emit('module-ready',{id});
    return true;
  }catch(error){
    const message=String((error as any)?.message||error).slice(0,500);
    modules[id]={state:'failed',startedAt,finishedAt:Date.now(),error:message};
    console.error(`[JW CORE] module failed: ${id}`,error);
    emit('module-failed',{id,error:message});
    return false;
  }
}

export async function loadCoreGroup(entries:Array<[string,ModuleLoader]>){
  const results=await Promise.all(entries.map(([id,loader])=>loadCoreModule(id,loader)));
  const ready=results.filter(Boolean).length;
  const failed=results.length-ready;
  emit('group-settled',{ready,failed,total:results.length});
  return {ready,failed,total:results.length};
}

export const JunjaWorldCore={
  version:JUNJA_WORLD_VERSION,
  bootStartedAt:Date.now(),
  modules,
  readSave,
  writeSave,
  emit,
  on,
  moduleState,
  snapshot
};

declare global{interface Window{JUNJA_WORLD_CORE?:typeof JunjaWorldCore}}
window.JUNJA_WORLD_CORE=JunjaWorldCore;
document.documentElement.dataset.jwCore='3';
window.dispatchEvent(new CustomEvent('junja:core-ready',{detail:{version:JUNJA_WORLD_VERSION}}));