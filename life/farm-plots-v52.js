// v52 - Expanded public village farm. The first fourteen plots keep their
// original exact indices/locations. New plots append as a third row.
// The migration is deterministic and NEVER clears existing crops or growth times.
export const FARM_COLUMNS=7;
export const FARM_OLD_PLOTS=14;
export const FARM_PLOT_COUNT=21;
export const VILLAGE_WALK_SPEED=228; // v51: 205; +11.2%, still gentle touch controls.
export const FARM_BED_CENTERS=Object.freeze(
 Array.from({length:FARM_PLOT_COUNT},(_,i)=>Object.freeze({
  x:816+(i%FARM_COLUMNS)*79,
  y:1171+Math.floor(i/FARM_COLUMNS)*79
 }))
);
export function migrateVillageBeds(saved,now=Date.now()){
 // An entirely new account retains the three starter carrots. An existing
 // (possibly empty) saved array never receives starter crops again.
 if(!Array.isArray(saved)){
  return FARM_BED_CENTERS.map((_,i)=>i<3?
    {crop:'carrot',at:now-90000}:{crop:null,at:0});
 }
 return FARM_BED_CENTERS.map((_,i)=>{
  const old=saved[i];
  if(!old||typeof old!=='object'||Array.isArray(old))return {crop:null,at:0};
  // Do not normalize or reorder valid crop and timestamp values: they are the
  // unique persisted state for a planted item, including still-growing crops.
  return {...old};
 });
}
