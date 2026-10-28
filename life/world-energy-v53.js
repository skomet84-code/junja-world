// v71: FIFO queue prevents a slow server round trip from rejecting fast taps.
// Only the server can charge energy; each queued action has its own replay-safe ID.
export const WORLD_ENERGY_KINDS=Object.freeze(['plant','gather','fish','craft','order','business_produce']);
export function createWorldEnergySpend({request=fetch,onChange=()=>{}}={}){
 let inFlight=false,pending=null,tail=Promise.resolve(),waiting=0;
 async function charge(kind){
  // Preserve the request ID after a network/5xx uncertainty. Never double-debit.
  if(pending&&pending.kind!==kind)
   throw Error('이전 행동력이 저장됐는지 확인해야 해. 먼저 같은 행동을 다시 시도해 줘');
  if(!pending)pending={kind,requestId:crypto.randomUUID()};
  inFlight=true;
  try{
   const response=await request('/api/economy-v36',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'world_spend',payload:{kind},requestId:pending.requestId})
   });
   const data=await response.json();
   if(!response.ok){
    if(response.status<500&&response.status!==408&&response.status!==429)pending=null;
    throw Error(data.error||'행동력 서버가 응답하지 않았어');
   }
   if(!data.ok||!data.energy||!Number.isSafeInteger(data.energy.current))
    throw Error('서버 행동력 확인에 실패했어. 잠시 후 다시 시도해 줘');
   pending=null;
   onChange(data.energy);
   return data.energy;
  }finally{inFlight=false}
 }
 function spend(kind){
  if(!WORLD_ENERGY_KINDS.includes(kind))return Promise.reject(Error('존재하지 않는 행동력 사용이야'));
  waiting++;
  // Each tap waits only within the network queue, never triggers an in-flight toast.
  const task=tail.then(()=>charge(kind));
  tail=task.catch(()=>{});
  return task.finally(()=>{waiting--});
 }
 return {spend,get busy(){return inFlight||waiting>0},get queued(){return waiting},get unresolved(){return !!pending}};
}
