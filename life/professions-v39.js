// JUNJA v39 — deterministic professions driven by VERIFIED server economy receipts only.
// This module cannot create a reward from a client-supplied activity count.
export const PROFESSION_ROLES=Object.freeze({
 farmer:Object.freeze({name:'🌿 전문 농부',focus:'작물 재배와 수확',actions:Object.freeze({harvest:12,business_produce:18}),daily:Object.freeze({harvest:4}),reward:160}),
 chef:Object.freeze({name:'🥧 요리 장인',focus:'재료 가공과 요리',actions:Object.freeze({craft:30,business_produce:30}),daily:Object.freeze({craft:2}),reward:240}),
 merchant:Object.freeze({name:'🏪 전문 상인',focus:'주민 거래와 상점 유통',actions:Object.freeze({market_sold:40,sell:5,business_produce:20}),dailyEither:Object.freeze([{market_sold:1},{sell:5}]),reward:200})
});
export const PROFESSION_FIRST_LICENSE=250;
export const PROFESSION_SWITCH_FEE=1200;
export const PROFESSION_SWITCH_COOLDOWN_MS=7*24*3600*1000;
export const PROFESSION_RANKS=Object.freeze([
 Object.freeze({xp:0,title:'수습',tier:1}),
 Object.freeze({xp:120,title:'숙련',tier:2}),
 Object.freeze({xp:600,title:'전문가',tier:3}),
 Object.freeze({xp:2400,title:'명장',tier:4}),
 Object.freeze({xp:10000,title:'전설',tier:5})
]);
const safeCount=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Math.min(10_000_000,Number(value)):0;
const error=(message,status=409)=>{const e=new Error(message);e.status=status;throw e};
const minState={farmer:0,chef:0,merchant:0};
const supportedRole=role=>Object.hasOwn(PROFESSION_ROLES,role);
export function kstProfessionDay(date=new Date()){
 if(!(date instanceof Date)||!Number.isFinite(date.getTime()))error('올바르지 않은 서버 시간입니다',500);
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function kstProfessionMidnight(date=new Date()){
 const day=kstProfessionDay(date);
 // KST is UTC+09 with no daylight-saving clock changes.
 return new Date(day+'T00:00:00+09:00');
}
export function currentProfession(state){
 const raw=state?.profession;
 if(!raw||typeof raw!=='object'||!supportedRole(raw.active))return null;
 if(typeof raw.activeSince!=='string'||!Number.isFinite(Date.parse(raw.activeSince)))return null;
 const career=Object.fromEntries(Object.entries(minState).map(([role])=>[role,safeCount(raw.career?.[role])]));
 return {active:raw.active,activeSince:raw.activeSince,changedAt:String(raw.changedAt||raw.activeSince),
  lastClaimDay:typeof raw.lastClaimDay==='string'?raw.lastClaimDay:'',career};
}
export function professionRank(xp){
 const score=safeCount(xp);
 return [...PROFESSION_RANKS].reverse().find(rank=>score>=rank.xp);
}
export function professionProof(counts={}){
 return Object.fromEntries(['harvest','craft','market_sold','sell','business_produce'].map(action=>[action,safeCount(counts[action])]));
}
export function professionXp(role,counts={}){
 if(!supportedRole(role))error('존재하지 않는 직업입니다',400);
 const proof=professionProof(counts);
 return Object.entries(PROFESSION_ROLES[role].actions).reduce((sum,[action,points])=>sum+proof[action]*points,0);
}
export function professionGoalMet(role,counts={}){
 if(!supportedRole(role))return false;
 const proof=professionProof(counts),profile=PROFESSION_ROLES[role];
 if(profile.dailyEither)return profile.dailyEither.some(requirements=>Object.entries(requirements).every(([action,n])=>proof[action]>=n));
 return Object.entries(profile.daily).every(([action,n])=>proof[action]>=n);
}
export function professionView(state,counts={},dailyCounts={},now=new Date()){
 const current=currentProfession(state),day=kstProfessionDay(now);
 if(!current)return {active:null,roles:PROFESSION_ROLES,firstLicense:PROFESSION_FIRST_LICENSE,
  switchFee:PROFESSION_SWITCH_FEE,day};
 const earned=professionXp(current.active,counts),career={...current.career};
 career[current.active]=Math.min(100_000_000,career[current.active]+earned);
 const ranks=Object.fromEntries(Object.entries(career).map(([r,n])=>[r,{xp:n,...professionRank(n)}]));
 const changed=Date.parse(current.changedAt);
 const switchAllowed=Number.isFinite(changed)&&now.getTime()-changed>=PROFESSION_SWITCH_COOLDOWN_MS;
 return {active:current.active,activeSince:current.activeSince,day,roles:PROFESSION_ROLES,career,ranks,
  earned,rank:ranks[current.active],completed:current.lastClaimDay===day,
  progress:professionProof(dailyCounts),ready:professionGoalMet(current.active,dailyCounts),
  reward:PROFESSION_ROLES[current.active].reward,canSwitch:switchAllowed,
  nextSwitchAt:new Date(changed+PROFESSION_SWITCH_COOLDOWN_MS).toISOString(),
  switchFee:PROFESSION_SWITCH_FEE};
}
export function selectProfession(state,role,counts={},now=new Date()){
 if(!supportedRole(role))error('없는 직업 면허입니다',400);
 const existing=currentProfession(state),price=existing?PROFESSION_SWITCH_FEE:PROFESSION_FIRST_LICENSE;
 if(existing?.active===role)error('이미 선택한 직업입니다');
 if(existing&&now.getTime()-Date.parse(existing.changedAt)<PROFESSION_SWITCH_COOLDOWN_MS)
  error('직업 변경은 7일에 한 번만 가능합니다');
 if(!Number.isSafeInteger(state.coins)||state.coins<price)error('직업 면허 비용이 부족해요');
 const next=structuredClone(state);
 const career=existing?{...existing.career}:{...minState};
 if(existing)career[existing.active]=Math.min(100_000_000,career[existing.active]+professionXp(existing.active,counts));
 next.coins-=price;
 next.profession={active:role,activeSince:now.toISOString(),changedAt:now.toISOString(),
  career,lastClaimDay:existing?.lastClaimDay||''};
 return {next,delta:-price,description:PROFESSION_ROLES[role].name+' 직업 등록',price};
}
export function claimProfessionContract(state,dailyCounts={},now=new Date()){
 const current=currentProfession(state);
 if(!current)error('먼저 직업 면허를 등록해 주세요');
 const day=kstProfessionDay(now);
 if(current.lastClaimDay===day)error('오늘 직업 보상은 이미 받았어요');
 if(!professionGoalMet(current.active,dailyCounts))error('서버 기록상 오늘의 직업 목표가 아직 부족해요');
 const pay=PROFESSION_ROLES[current.active].reward;
 if(!Number.isSafeInteger(state.coins)||state.coins+pay>1_000_000_000_000)error('골드 보유 한도를 확인해 주세요');
 const next=structuredClone(state);
 next.coins+=pay;
 next.profession.lastClaimDay=day;
 return {next,delta:pay,description:PROFESSION_ROLES[current.active].name+' 일일 계약 완료',day};
}
