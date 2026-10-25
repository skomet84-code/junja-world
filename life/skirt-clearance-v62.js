import {sampleFootGait} from './gait-pose-v58.js';
import {sampleGarmentSway} from './garment-sway-v59.js';

// Keep the skirt's lower silhouette outside the swinging thighs while its trim
// follows the same rig. Pure pose sampling: no save, movement or economy changes.
export function sampleSkirtClearance(stride=0,blend=0,speed=0){
 const phase=Number.isFinite(stride)?stride:0;
 const weight=Number.isFinite(blend)?Math.max(0,Math.min(1,blend)):0;
 if(weight===0)return {roll:0,pitch:0,hemLift:0,spread:1};
 const cloth=sampleGarmentSway(phase,weight,speed);
 const left=sampleFootGait(phase,weight,-1);
 const right=sampleFootGait(phase,weight,1);
 const reach=Math.max(Math.abs(left.hip)+left.knee*.35,Math.abs(right.hip)+right.knee*.35);
 const spread=1+Math.min(.095,reach*.11+cloth.hemLift*.025);
 return {...cloth,spread};
}
