// Small head-leading turn response for the original JUNJA VILLAGE character rig.
// Pure animation math; does not touch player position, physics, or persistence.
const unit = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export function sampleTurnAnticipation(angleError=0, movingBlend=0) {
  const error=Number.isFinite(angleError)?Math.atan2(Math.sin(angleError),Math.cos(angleError)):0;
  const strength=.6+.4*unit(movingBlend);
  const headYaw=Math.max(-.32,Math.min(.32,error*.34))*strength;
  return {headYaw,shoulderYaw:headYaw*.35};
}
