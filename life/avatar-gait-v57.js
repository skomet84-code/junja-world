// Original JUNJA VILLAGE distance-driven walk pose. No game-state or save mutations.
export function computeGaitPose(phase,blend,time,turn=0){
 const finite=v=>Number.isFinite(v)?v:0;
 const p=finite(phase),b=Math.max(0,Math.min(1,finite(blend))),t=finite(time);
 const lead=Math.max(-.6,Math.min(.6,finite(turn)));
 const step=Math.sin(p)*b,idle=(1-b)*Math.sin(t*1.4);
 const limbs=[-1,1].map(side=>{
  const cycle=p+(side>0?Math.PI:0);
  const swing=Math.sin(cycle)*b,lift=Math.max(0,Math.cos(cycle))*b;
  const kneeX=lift*.52+Math.max(0,-swing)*.08;
  return {hipX:swing*.5,kneeX,ankleX:-kneeX*.6-swing*.12,armX:-swing*.42,elbowX:-.12-Math.max(0,-swing)*.14};
 });
 return {pelvisY:34+Math.max(0,Math.sin(p*2))*.85*b+idle*.28,
  pelvisRoll:step*.028,torsoRoll:-step*.035+idle*.008-lead*.045,
  torsoYaw:step*.045+lead*.075,headRoll:step*.015,headPitch:-b*.025+idle*.014,
  headYaw:lead*.22,limbs};
}
