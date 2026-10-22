// Lightweight deterministic fabric response, independent of rendering frame rate.
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
export function sampleGarmentSway(stride=0,blend=0,speed=0){
 const phase=finite(stride),weight=Math.max(0,Math.min(1,finite(blend)));
 if(weight===0)return {roll:0,pitch:0,hemLift:0};
 const pace=Math.max(0,Math.min(1,finite(speed)/160));
 return {
  roll:Math.sin(phase)*weight*(.024+.018*pace),
  pitch:Math.cos(phase*2)*weight*(.012+.012*pace),
  hemLift:Math.max(0,Math.sin(phase*2))*weight*(.25+.35*pace)
 };
}
