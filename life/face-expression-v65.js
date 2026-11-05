// Original JUNJA VILLAGE character facial motion. Pure sampling keeps animation
// deterministic across rendering frame rates and avoids per-frame allocations.
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
const clamp01=value=>Math.max(0,Math.min(1,value));
const smoothstep=value=>{const x=clamp01(value);return x*x*(3-2*x)};
export function sampleFaceExpression(time=0,movement=0){
 const t=finite(time);
 const walking=clamp01(finite(movement));
 const period=4.7;
 const phase=((t%period)+period)%period;
 // Short eased blink near the end of each cycle; eye glints close with the eyes.
 const p=(phase-4.45)/.24;
 const blink=p>0&&p<1?(p<.45?smoothstep(p/.45):smoothstep((1-p)/.55)):0;
 const smile=clamp01(.24+.10*Math.sin(t*.72)+.06*walking);
 return {
  eyeOpen:1-.90*blink,
  mouthWidth:1+.15*smile,
  mouthHeight:1+.22*smile,
  mouthLift:.30*smile
 };
}
