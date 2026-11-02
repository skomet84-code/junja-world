// v76: choose a reachable standing point around a resource before auto-gather.
// This is navigation-only. Never changes energy, inventory, XP or saved progress.
export const GATHER_APPROACH_REACH=100;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function findGatherApproach(resource,player,navigation,{reach=GATHER_APPROACH_REACH,maxRoutes=12}={}){
 if(!validPoint(resource)||!validPoint(player)||!navigation||
  typeof navigation.safe!=='function'||typeof navigation.route!=='function'||
  !Number.isFinite(reach)||reach<30)return null;
 if(distance(resource,player)<=reach)return {x:player.x,y:player.y,immediate:true};
 const origin=navigation.safe(player)?player:navigation.nearest?.(player,288);
 if(!validPoint(origin)||!navigation.safe(origin))return null;
 const bearing=Math.atan2(origin.y-resource.y,origin.x-resource.x);
 // Start on the player's side, then sweep both sides. Two rings avoid trees,
 // rocks and narrow garden edges without requiring a precise mesh tap.
 const offsets=[0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,
  3*Math.PI/4,-3*Math.PI/4,Math.PI];
 const candidates=[];
 for(const offset of offsets)for(const factor of [.72,.9]){
  const angle=bearing+offset;
  const point={x:resource.x+Math.cos(angle)*reach*factor,
   y:resource.y+Math.sin(angle)*reach*factor};
  if(navigation.safe(point)&&distance(point,resource)<reach-5)candidates.push(point);
 }
 // Cheap line-of-sight fast path keeps one-tap gather responsive on phones.
 if(typeof navigation.clear==='function'){
  for(const point of candidates)if(navigation.clear(origin,point,8))
   return {...point,immediate:false};
 }
 // The navigation engine can return a partial path when a destination is
 // blocked. Reject those routes: otherwise the player stops without gathering.
 let best=null,bestLength=Infinity;
 const limit=Math.min(candidates.length,Math.max(0,Math.floor(maxRoutes)||0));
 for(let i=0;i<limit;i++){
  const point=candidates[i],route=navigation.route(origin,point);
  if(!Array.isArray(route)||!route.length)continue;
  const last=route[route.length-1];
  if(!validPoint(last)||distance(last,point)>30||distance(last,resource)>reach-5)continue;
  let length=0,previous=origin;
  for(const waypoint of route){
   if(!validPoint(waypoint)){length=Infinity;break}
   length+=distance(previous,waypoint);previous=waypoint;
  }
  if(length<bestLength){bestLength=length;best={...point,immediate:false}}
 }
 return best;
}
