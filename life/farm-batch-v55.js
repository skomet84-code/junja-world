// v55 production-quality five-at-a-time village farming planner.
// Pure, deterministic plot selection; effects/payments stay in game.js and
// require authenticated server energy per action before crop save changes.
export const FARM_BATCH_LIMIT_V55=5;
export function planFarmBatchV55(beds,crops,{mode,seed,stock=0,now=Date.now(),limit=FARM_BATCH_LIMIT_V55}={}){
 if(!Array.isArray(beds)||!crops||!['plant','harvest'].includes(mode))return [];
 const cap=Math.max(0,Math.min(FARM_BATCH_LIMIT_V55,Math.trunc(Number(limit)||0)));
 if(!cap)return [];
 const queue=[];
 for(let i=0;i<beds.length&&queue.length<cap;i++){
  const b=beds[i];
  if(!b||typeof b!=='object')continue;
  if(mode==='plant'){
   if(!Object.hasOwn(crops,seed)||b.crop||queue.length>=Math.floor(Math.max(0,Number(stock)||0)))continue;
  }else {
   const crop=crops[b.crop];
   if(!crop||!Number.isFinite(Number(b.at))||now-Number(b.at)<crop.seconds*1000)continue;
  }
  queue.push(i);
 }
 return queue;
}
