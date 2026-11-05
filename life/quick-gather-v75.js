// v75: make the existing mobile quick-action button useful before a tiny
// resource mesh is within tapping distance. Pure selection: never spends energy,
// mutates the save, or grants materials.
const ICONS=Object.freeze({
 wood:{near:'🪓 목재 채집',far:'🌳 나무까지 이동 · 채집'},
 stone:{near:'⛏️ 돌 채집',far:'⛏️ 돌까지 이동 · 채집'},
 petal:{near:'🌼 꽃잎 채집',far:'🌼 꽃까지 이동 · 채집'}
});
export const QUICK_GATHER_REACH=110;
export const QUICK_GATHER_DISCOVERY=280;
export function nearestGatherResource(nodes,player,ready={},at=Date.now(),radius=QUICK_GATHER_DISCOVERY){
 if(!Array.isArray(nodes)||!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))return null;
 const limit=Number.isFinite(radius)?Math.max(0,radius):QUICK_GATHER_DISCOVERY;
 let best=null,bestDistance=Infinity;
 for(const n of nodes){
  if(!n||typeof n.id!=='string'||!Object.hasOwn(ICONS,n.kind)||
   !Number.isFinite(n.x)||!Number.isFinite(n.y))continue;
  if(Number(ready?.[n.id])>at)continue;
  const distance=Math.hypot(player.x-n.x,player.y-n.y);
  if(distance>limit||distance>=bestDistance)continue;
  best=n;bestDistance=distance;
 }
 if(!best)return null;
 return {id:best.id,kind:best.kind,x:best.x,y:best.y,
  distance:bestDistance,needsApproach:bestDistance>QUICK_GATHER_REACH};
}
export function quickGatherLabel(target){
 if(!target||!Object.hasOwn(ICONS,target.kind))return '';
 return target.needsApproach?ICONS[target.kind].far:ICONS[target.kind].near;
}
