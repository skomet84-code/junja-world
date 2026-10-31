// v74: one gathering interaction at a time, even with rapid mobile taps.
// The server remains authoritative for energy; this gate never awards items.
export function createGatherGate({onChange=()=>{}}={}){
 let activeId=null;
 const notify=()=>onChange(activeId);
 return {
  get activeId(){return activeId},
  async run(id,task){
   if(typeof id!=='string'||!id||typeof task!=='function')
    throw new TypeError('A resource id and action are required');
   if(activeId!==null)return {started:false,activeId};
   activeId=id;
   try{
    notify();
    return {started:true,result:await task()};
   }finally{
    activeId=null;
    notify();
   }
  }
 };
}
// Small tactile resource pulse while the server confirms an action.
// Scales X/Z only: resource cooldown height (Y) stays untouched.
export function sampleGatherPulse(time=0,reducedMotion=false){
 if(reducedMotion)return 1;
 const t=Number.isFinite(time)?time:0;
 return 1+.028*(.5+.5*Math.sin(t*12));
}
