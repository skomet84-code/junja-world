// v53 main-world actions share the server-owned energy meter with v47 lab.
// Every confirmed expense is idempotent, never changes character XP/coins,
// and refuses the world action when the account/API cannot validate the charge.
export const WORLD_ENERGY_KINDS=Object.freeze(['plant','harvest','gather','fish','craft','order','business_produce']);
export function createWorldEnergySpend({request=fetch,onChange=()=>{}}={}){
 let inFlight=false,pending=null;
 async function spend(kind){
  if(!WORLD_ENERGY_KINDS.includes(kind))throw Error('존재하지 않는 행동력 사용이야');
  if(inFlight)throw Error('이전 행동력을 확인하는 중이야. 잠깐 기다려 줘');
  // Following an ambiguous connection loss, the original request ID must be
  // retried. A new action is blocked until the first server charge is resolved.
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
 return {spend,get busy(){return inFlight},get unresolved(){return !!pending}};
}
