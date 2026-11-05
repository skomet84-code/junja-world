// v46 prestige paths use immutable SERVER economy receipts, not client-supplied points.
// Titles are purely decorative: 0 gold, 0 items, 0 experience and no profile-save writes.
export const HONORS_V46=Object.freeze([
 Object.freeze({id:'first_sale',name:'첫 장사 성공',role:'all',icon:'🌟',metric:'npc_sale',required:1,description:'실제 주민 주문 1건 납품'}),
 Object.freeze({id:'trusted_neighbor',name:'마을 단골왕',role:'all',icon:'💜',metric:'npc_sale',required:6,description:'주민 일반·특별 주문 합계 6건'}),
 Object.freeze({id:'crafting_master',name:'손끝의 명장',role:'all',icon:'🛠️',metric:'manufacture',required:10,description:'전문 생산품 10회 실제 제작'}),
 Object.freeze({id:'green_thumb',name:'풍요로운 농부',role:'farmer',icon:'🌾',metric:'farmer_manufacture',required:5,description:'농부 온실에서 전문 생산품 5회 제작'}),
 Object.freeze({id:'berry_supplier',name:'베리 납품 장인',role:'farmer',icon:'🍓',metric:'farmer_sales',required:3,description:'농부 전문 생산품 주민 판매 3회'}),
 Object.freeze({id:'golden_harvest',name:'황금빛 온실',role:'farmer',icon:'🏡',metric:'farmer_manufacture',required:25,description:'농부 전문 생산품 누적 25회 제작'}),
 Object.freeze({id:'pastry_artist',name:'달콤한 파티시에',role:'chef',icon:'🥧',metric:'chef_manufacture',required:5,description:'베이커리 전문 생산품 5회 제작'}),
 Object.freeze({id:'festival_baker',name:'축제의 요리사',role:'chef',icon:'🎂',metric:'chef_sales',required:3,description:'요리사 전문 생산품 주민 판매 3회'}),
 Object.freeze({id:'trade_pioneer',name:'교역의 개척자',role:'merchant',icon:'📦',metric:'merchant_manufacture',required:5,description:'상인 유통 공방 전문 생산품 5회 제작'}),
 Object.freeze({id:'festival_merchant',name:'마을의 큰손',role:'merchant',icon:'🎁',metric:'merchant_sales',required:3,description:'상인 전문 생산품 주민 판매 3회'})
]);
export const HONOR_METRICS=Object.freeze(['npc_sale','manufacture','farmer_manufacture','farmer_sales',
 'chef_manufacture','chef_sales','merchant_manufacture','merchant_sales']);
const knownIds=new Set(HONORS_V46.map(h=>h.id));
const error=(message,status=409)=>{const e=new Error(message);e.status=status;throw e;};
const count=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0&&Number(n)<=10_000_000?Number(n):0;
export function validateHonorCounters(rows=[]){
 if(!Array.isArray(rows)||rows.length>32)error('서버 업적 통계가 올바르지 않아요',500);
 const values=Object.fromEntries(HONOR_METRICS.map(k=>[k,0]));
 const seen=new Set();
 for(const row of rows){
  if(!row||!HONOR_METRICS.includes(row.metric)||seen.has(row.metric)||
   !Number.isSafeInteger(Number(row.total))||Number(row.total)<0||Number(row.total)>10_000_000)
   error('서버 업적 통계를 검증할 수 없어요',500);
  seen.add(row.metric);values[row.metric]=Number(row.total);
 }
 return values;
}
export function honorsView(state,counters){
 const valid=validateHonorCounters(HONOR_METRICS.map(metric=>({metric,total:counters?.[metric]??0})));
 const selected=state?.businessHonorV46?.equipped;
 const all=HONORS_V46.map(h=>({...h,progress:Math.min(h.required,valid[h.metric]),total:valid[h.metric],
  unlocked:valid[h.metric]>=h.required}));
 const equipped=all.find(h=>h.id===selected&&h.unlocked)||null;
 return {equipped:equipped?{id:equipped.id,name:equipped.name,icon:equipped.icon,role:equipped.role}:null,
  unlockedCount:all.filter(h=>h.unlocked).length,totalCount:all.length,honors:all};
}
export function equipHonor(state,id,counters){
 if(typeof id!=='string'||id.length>48)error('올바른 업적 칭호를 선택해 주세요',400);
 if(id!=='none'&&!knownIds.has(id))error('없는 업적 칭호를 선택했어요',400);
 const view=honorsView(state,counters);
 const target=view.honors.find(h=>h.id===id);
 if(id!=='none'&&!target?.unlocked)error('실제 거래 기록으로 해금하지 않은 칭호입니다',403);
 if(!state||!Number.isSafeInteger(state.coins)||state.coins<0||state.coins>1_000_000_000_000)
  error('시험 지갑의 무결성을 확인해 주세요',500);
 if((state.businessHonorV46?.equipped||'none')===id)error('이미 적용한 칭호입니다');
 const next=structuredClone(state);
 next.businessHonorV46={equipped:id==='none'?null:id};
 return {next,delta:0,id,title:target?.name||'칭호 미착용'};
}
export function monthDayLabels(now=new Date(),days=30){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime())||!Number.isInteger(days)||days<1||days>31)
  throw Error('Invalid statistics range');
 const local=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const labels=[];const [y,m,d]=local.split('-').map(Number);
 for(let i=days-1;i>=0;i--){
  const x=new Date(Date.UTC(y,m-1,d-i));
  labels.push(x.toISOString().slice(0,10));
 }
 return labels;
}
export function economicsView(rows=[],now=new Date()){
 if(!Array.isArray(rows)||rows.length>31)error('경제 통계 조회 범위 오류',500);
 const labels=monthDayLabels(now,30),byDay=new Map(labels.map(date=>[date,{date,sales:0,net:0,tax:0,fee:0}]));
 for(const row of rows){
  if(!row||typeof row.date!=='string'||!byDay.has(row.date))error('경제 통계 날짜 오류',500);
  const gross=Number(row.net),tax=Number(row.tax),fee=Number(row.fee),sales=Number(row.sales);
  if(![gross,tax,fee,sales].every(Number.isSafeInteger)||[gross,tax,fee,sales].some(n=>n<0||n>1_000_000_000_000))
   error('경제 통계 거래 금액 검증 오류',500);
  const d=byDay.get(row.date);d.sales+=sales;d.net+=gross;d.tax+=tax;d.fee+=fee;
 }
 const daily=[...byDay.values()];
 return {days:30,daily,totals:daily.reduce((a,x)=>({
  sales:a.sales+x.sales,net:a.net+x.net,tax:a.tax+x.tax,fee:a.fee+x.fee
 }),{sales:0,net:0,tax:0,fee:0})};
}
