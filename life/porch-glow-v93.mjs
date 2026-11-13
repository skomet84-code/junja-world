// Frame-rate independent porch-light transition. No Three.js dependency.
export function approachGlow(current,target,dt,settleSeconds=1.2){
 const safeDt=Number.isFinite(dt)?Math.max(0,dt):0;
 const alpha=1-Math.exp(-safeDt/Math.max(.001,settleSeconds));
 return current+(target-current)*alpha;
}
export function porchGlowTarget(phase,time,index,reducedMotion=false){
 const isNight=phase==='night'||phase==='evening';
 if(!isNight)return .16;
 if(reducedMotion)return .52;
 return .48+.075*Math.sin(time*1.7+index*1.31);
}
