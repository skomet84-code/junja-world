// v67-v70: deterministic original facial polish; no assets or saved-state changes.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>Number.isFinite(v)?v:0;
const smooth=v=>{const x=clamp(v,0,1);return x*x*(3-2*x)};
export function sampleExpressionPolish(time=0,movement=0){
 const t=Math.max(0,finite(time)),walk=clamp(finite(movement),0,1);
 // v67: staggered blink cadence, with a rare soft double-blink.
 const cycle=t%8.4;
 const blinkAt=(start,duration)=>{const p=(cycle-start)/duration;return p>0&&p<1?Math.sin(Math.PI*smooth(p))**2:0};
 const blink=Math.max(blinkAt(3.65,.24),blinkAt(7.55,.22),blinkAt(7.93,.16));
 // v68: subtle idle breathing rather than static mannequin face.
 const breath=(1-walk)*Math.sin(t*1.55);
 // v69: locomotion eases into a warmer expression.
 const smile=clamp(.28+.12*Math.sin(t*.65)+.16*walk,0,1);
 // v70: restrained asymmetric eye attention; never over-rotate the head.
 const gaze=Math.sin(t*.38)*.075*(1-.45*walk);
 return {eyeOpen:clamp(1-.91*blink, .09,1),
  mouthWidth:1+.17*smile,mouthHeight:1+.21*smile,
  mouthLift:.31*smile+.035*breath,headIdleRoll:gaze,headIdlePitch:.009*breath};
}
