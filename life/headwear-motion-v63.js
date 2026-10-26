// v63: subtle, bounded hat inertia attached to the existing head socket.
// Pure pose math; never changes navigation, economy, save data or outfit ownership.
const finite = value => Number.isFinite(value) ? value : 0;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function sampleHeadwearMotion(stride=0,blend=0,headYaw=0,hat='none'){
 if(typeof hat!=='string'||hat==='none')return {bob:0,roll:0,pitch:0};
 const phase=finite(stride),weight=clamp(finite(blend),0,1),turn=clamp(finite(headYaw),-.32,.32);
 const loose=hat==='straw'||hat==='flower'?1:hat==='crown'?.55:.75;
 return {
  bob:Math.abs(Math.sin(phase))*.38*weight*loose,
  roll:clamp(Math.sin(phase)*.018*weight-turn*.12,-.06,.06)*loose,
  pitch:Math.cos(phase)*.014*weight*loose
 };
}
