// v64: keep side/back hair visible under fitted hats without scalp clipping.
// Pure pose and visibility math; no ownership, save, or economy mutations.
const brimHats=new Set(['straw','flower','beret','beanie','navycap','captain']);
const looseStyles=new Set(['bob','long','layer','wolf','wave','twin','braid']);
const finite=v=>Number.isFinite(v)?v:0;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function resolveHairHatFit(hat='none',shape=null){
 const covered=brimHats.has(hat);
 return {crownVisible:!covered,looseVisible:looseStyles.has(shape)};
}
export function sampleLooseHairMotion(stride=0,blend=0,headYaw=0,shape=null){
 if(!looseStyles.has(shape))return {roll:0,bob:0};
 const phase=finite(stride),weight=clamp(finite(blend),0,1),turn=clamp(finite(headYaw),-.32,.32);
 const length=shape==='long'||shape==='twin'||shape==='braid'?1:shape==='wolf'||shape==='layer'?.8:.6;
 return {
  roll:clamp(Math.sin(phase*.72)*.028*weight-turn*.09,-.06,.06)*length,
  bob:Math.abs(Math.sin(phase))*.32*weight*length
 };
}
