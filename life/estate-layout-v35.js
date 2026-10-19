// Coordinate & growth rules shared by the walkable farm scene and its tests.
// Pure: does not read browser storage, mutate account data, or mint game money.
const GRID_STEP=96;
const MAX_PLOTS=96;
export function estateLayout(inputSlots){
 const slots=Math.min(MAX_PLOTS,Math.max(0,Number.isFinite(Number(inputSlots))?Math.floor(Number(inputSlots)):0));
 const columns=slots<=6?3:slots<=24?6:slots<=48?8:12;
 const rows=Math.ceil(slots/columns);
 const beds=Array.from({length:slots},(_,index)=>({
  index,
  x:(index%columns-(columns-1)/2)*GRID_STEP,
  z:(Math.floor(index/columns)-(rows-1)/2)*GRID_STEP
 }));
 const width=Math.max(490,columns*GRID_STEP+148);
 const depth=Math.max(430,rows*GRID_STEP+230);
 return {slots,columns,rows,beds,width,depth,entrance:{x:0,z:depth/2-62}};
}
export function estateCropView(plot,cropMap,now=Date.now()){
 if(!plot||typeof plot!=='object')return {id:null,progress:0,ready:false,remaining:0};
 const data=cropMap?.[plot.id];
 const seconds=Number(data?.seconds);
 const start=Number(plot.at);
 if(!data||!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(start)||start<0)
  return {id:null,progress:0,ready:false,remaining:0};
 const passed=Math.max(0,(now-start)/1000);
 const progress=Math.max(0,Math.min(1,passed/seconds));
 return {id:plot.id,progress,ready:progress>=1,remaining:Math.max(0,Math.ceil(seconds-passed))};
}
export function estateWalkStep(position,target,dt,speed=280){
 if(!target)return {x:position.x,z:position.z,arrived:true,moving:false};
 const dx=target.x-position.x,dz=target.z-position.z,dist=Math.hypot(dx,dz);
 const step=Math.max(0,Math.min(.05,Number(dt)||0))*speed;
 if(dist<=Math.max(step,1))return {x:target.x,z:target.z,arrived:true,moving:false};
 return {x:position.x+dx/dist*step,z:position.z+dz/dist*step,arrived:false,moving:true};
}
