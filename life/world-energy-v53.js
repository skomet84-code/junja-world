// v54 hotfix: recover pending v53 energy debits after mobile timeouts.
// Only server-confirmed spend responses unlock a world action. A read-only
// receipt lookup releases a lost request without billing it again.
export const WORLD_ENERGY_KINDS=Object.freeze(['plant','harvest','gather','fish','craft','order','business_produce']);
export function createWorldEnergySpend({request=fetch,onChange=()=>{},onRecovery=()=>{}}={}){
 let inFlight=false,pending=null;
 const timeoutMs=9000;
 const headers={'Content-Type':'application/json'};
 async function reconcile(){
  if(!pending)return;
  const query=pending;
  // GET is read-only. It never performs an old planting/fishing action.
  const res=await request('/api/economy-v36?requestId='+encodeURIComponent(query.requestId),{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(timeoutMs)
  });
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'이전 행동력 기록을 조회하지 못했어');
  if(!data.ok||!data.transaction||typeof data.transaction.found!=='boolean')
   throw Error('이전 행동력 조회 결과를 확인할 수 없어');
  if(data.transaction.found&&(!data.transaction.isWorldSpend||data.transaction.kind!==query.kind))
   throw Error('행동력 거래 기록이 일치하지 않아. 다시 로그인해서 확인해 줘');
  if(pending===query){
   pending=null;
   if(data.energy)onChange(data.energy);
   if(data.transaction.found)onRecovery('이전 행동력 차감은 서버에 기록돼 있어. 이제 다른 활동을 할 수 있어.');
  }
 }
 async function spend(kind){
  if(!WORLD_ENERGY_KINDS.includes(kind))throw Error('존재하지 않는 행동력 사용이야');
  if(inFlight)throw Error('⚡ 행동력 저장 확인 중이야. 잠깐만 기다려 줘');
  inFlight=true;
  try{
   // Different action after ambiguous timeout: automatically check the old
   // request ID, then release it. No perpetual "repeat same action" dead end.
   if(pending&&pending.kind!==kind)await reconcile();
   if(!pending)pending={kind,requestId:crypto.randomUUID()};
   const entry=pending;
   const response=await request('/api/economy-v36',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers,signal:AbortSignal.timeout(timeoutMs),
    body:JSON.stringify({action:'world_spend',payload:{kind},requestId:entry.requestId})
   });
   const data=await response.json();
   if(!response.ok){
    // A definitive 4xx (except timeout/rate-limit) cannot have charged.
    // A 5xx/timeout may have charged; preserve ID for safe retry.
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
 return {spend,reconcile,get busy(){return inFlight},get unresolved(){return !!pending}};
}
