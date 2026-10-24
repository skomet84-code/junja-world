// Deterministic foot-contact shadow response, independent of frame rate.
// Contact is darkest while the shoe is planted and fades as the ankle lifts.
export function sampleContactShadow(ankleLift=0){
 const lift=Number.isFinite(ankleLift)?Math.max(0,ankleLift):0;
 const contact=Math.max(0,1-Math.min(lift/6,1));
 return {opacity:0.025+0.105*contact,scale:0.8+0.2*contact};
}
