// JUNJA v41 — deterministic 3D homestead sites, owner-only placement and visitor snapshots.
// State changes are pure and committed only by authenticated server + v37 checkpoint.
export const WORKSHOP_SITES=Object.freeze(Array.from({length:9},(_,slot)=>Object.freeze({
 slot,x:(slot%3-1)*280,z:(Math.floor(slot/3)-1)*270
})));
export const DEFAULT_WORKSHOP_SLOTS=Object.freeze({farmer:0,chef:4,merchant:8});
export const WORKSHOP_ROLES=Object.freeze(['farmer','chef','merchant']);
export const DAILY_RELOCATIONS=5;
const deny=(msg,status=409)=>{const e=new Error(msg);e.status=status;throw e};
const validRole=role=>WORKSHOP_ROLES.includes(role);
const own=(state,role)=>state?.workshops?.[role];
export function siteFor(role,state){
 if(!validRole(role))return null;
 const workshop=own(state,role);
 if(!workshop||!Number.isInteger(workshop.level)||workshop.level<1||workshop.level>3)return null;
 const slot=Number.isInteger(workshop.site)&&workshop.site>=0&&workshop.site<WORKSHOP_SITES.length
  ?workshop.site:DEFAULT_WORKSHOP_SLOTS[role];
 return WORKSHOP_SITES[slot];
}
export function villagePlots(state){
 const occupied=new Map();
 for(const role of WORKSHOP_ROLES){
  const site=siteFor(role,state);
  if(!site)continue;
  if(occupied.has(site.slot))return {ok:false,reason:'duplicate_workshop_site',site:site.slot};
  occupied.set(site.slot,role);
 }
 const sites=WORKSHOP_SITES.map(s=>({...s,role:occupied.get(s.slot)||null,
  level:occupied.has(s.slot)?own(state,occupied.get(s.slot)).level:null}));
 return {ok:true,sites,buildings:sites.filter(s=>s.role)};
}
export function relocateWorkshop(state,role,slot,now=new Date()){
 if(!validRole(role))deny('선택할 수 없는 사업장 종류입니다',400);
 const here=siteFor(role,state);
 if(!here)deny('소유한 사업장만 배치할 수 있어요',403);
 if(!Number.isInteger(slot)||slot<0||slot>=WORKSHOP_SITES.length)deny('존재하지 않는 사업장 터입니다',400);
 if(slot===here.slot)deny('이미 이 자리에 배치한 사업장이에요');
 const previous=villagePlots(state);
 if(!previous.ok)deny('사업장 배치 기록이 중복되어 확인이 필요해요');
 if(previous.sites[slot].role)deny('다른 사업장이 이미 사용 중인 위치예요');
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))deny('시간 확인 오류',500);
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const usage=state.workshopRelocation||{};
 const previousMoves=usage.day===day&&Number.isSafeInteger(usage.count)?usage.count:0;
 if(previousMoves>=DAILY_RELOCATIONS)deny('오늘 가능한 사업장 이동 5회를 모두 사용했어요');
 const next=structuredClone(state);
 next.workshops[role].site=slot;
 next.workshopRelocation={day,count:previousMoves+1};
 return {next,delta:0,detail:role+' 사업장 배치 변경 · '+(slot+1)+'번 터',
  role,slot,remaining:DAILY_RELOCATIONS-previousMoves-1};
}
export function visitorWorkshops(state){
 const plan=villagePlots(state);
 if(!plan.ok)return {ok:false,reason:plan.reason,buildings:[]};
 // Only public ownership/plot/level, NEVER wallet, seed inventory, account notes or profession state.
 return {ok:true,buildings:plan.buildings.map(b=>({role:b.role,level:b.level,site:b.slot}))};
}
export function walkStep(position,target,dt,speed=255){
 if(!target)return {x:position.x,z:position.z,arrived:true};
 const dx=target.x-position.x,dz=target.z-position.z,dist=Math.hypot(dx,dz);
 const distance=Math.min(Math.max(0,Number(dt)||0),.05)*speed;
 if(dist<=Math.max(1,distance))return {x:target.x,z:target.z,arrived:true};
 return {x:position.x+dx/dist*distance,z:position.z+dz/dist*distance,arrived:false};
}
