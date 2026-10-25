// v58: small, deterministic stance/swing offsets for the shared 3D avatar rig.
// Pure animation math: no account, currency, movement, or persistence changes.
const unit = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export function sampleFootGait(phase, blend, side) {
 const weight=unit(blend);
 const cycle=(Number.isFinite(phase)?phase:0)+(side>0?Math.PI:0);
 const stride=Math.sin(cycle);
 const swing=Math.max(0,Math.cos(cycle));
 const stance=Math.max(0,-Math.cos(cycle));
 return {
  hip:stride*.53*weight,
  knee:(swing*.52+Math.max(0,-stride)*.08)*weight,
  ankle:(-swing*.33+stance*.09-stride*.09)*weight,
  ankleLift:swing*2.6*weight,
  arm:-stride*.38*weight,
  elbow:-.12-Math.max(0,-stride)*.17*weight
 };
}

export function sampleBodyGait(phase, blend, time) {
 const weight=unit(blend);
 const p=Number.isFinite(phase)?phase:0;
 const t=Number.isFinite(time)?time:0;
 const step=Math.sin(p)*weight;
 const idle=(1-weight)*Math.sin(t*1.25);
 return {
  pelvisY:34+Math.sin(p)**2*.55*weight,
  pelvisX:Math.sin(p)*1.1*weight,
  pelvisRoll:Math.sin(p)*.018*weight,
  torsoRoll:-step*.026+idle*.008,
  torsoTurn:step*.038,
  headRoll:step*.014,
  headPitch:-weight*.025+idle*.014
 };
}
