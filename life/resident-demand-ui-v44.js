// v44 mobile resident shop window; all displayed prices and payouts are from server only.
// This module has no access to live character gold, XP, saved profile or other residents' stock.
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};
const append=(root,tag,text)=>{const n=make(tag,text);root.append(n);return n};
const money=n=>Number(n).toLocaleString('ko-KR')+'G';
export function mountResidentDemand(host,{onSold=()=>{}}={}){
 if(!host)throw Error('주민 주문판 위치가 없습니다');
 host.replaceChildren();
 const header=append(host,'h3','🧺 v44 · 마을 주민들의 오늘 주문');
 append(host,'p','주민이 상품 1개를 실제로 소비하는 시험 경제 주문이야. 하루 최대 2건, 주민당 1건만 가능해.');
 const line=append(host,'p','🔄 오늘의 주민 구매 주문을 확인하는 중…');
 line.style.cssText='border-radius:10px;background:#fff8e7;padding:10px;font-weight:700';
 const list=append(host,'div');
 let destroyed=false,busy=false,pending=null,snapshot=null;
 const styled=(label,fn,disabled=false)=>{
  const button=make('button',label);button.type='button';
  button.style.cssText='margin:5px;padding:11px;border:0;border-radius:10px;background:#6f967a;color:white;font-weight:800';
  button.disabled=disabled;button.onclick=fn;return button;
 };
 function render(){
  list.replaceChildren();if(!snapshot)return;
  const {demand}=snapshot;
  line.textContent='🏪 시험 골드 '+money(snapshot.coins)+' · 오늘 구매 '+demand.used+'/'+demand.dailyLimit+
   '건 · 예산 '+money(demand.grossUsed)+'/'+money(demand.dailyGrossCap);
  for(const q of demand.orders){
   const section=append(list,'section');
   section.style.cssText='border:1px solid #d9e4cf;background:#f1f6e9;margin:10px 0;padding:12px;border-radius:14px';
   append(section,'strong',q.buyer+' · '+q.itemName);
   append(section,'p',q.message);
   append(section,'p',q.demand+' · 구매 총액 '+money(q.gross)+' / 주민 운영세 '+money(q.tax)+
    ' / 실수령 '+money(q.net));
   append(section,'p','내 전문 재고 '+q.stock+'개 · '+(q.sold?'✅ 오늘 판매 완료':q.canSell?'📦 즉시 납품 가능':'면허·재고·일일 한도 확인 필요'));
   section.append(styled(q.sold?'오늘 납품 완료':'주민에게 1개 납품',()=>sell(q.npcId),
    busy||!q.canSell));
  }
  list.append(styled('↻ 오늘 주문 새로고침',refresh,busy));
 }
 async function refresh(){
  if(destroyed)return;
  try{
   const resp=await fetch('/api/resident-demand-v44',{credentials:'same-origin',cache:'no-store'});
   const json=await resp.json();if(!resp.ok)throw Error(json.error||'주민 주문판을 확인하지 못했어요');
   if(destroyed||!host.isConnected)return;
   snapshot=json;render();
  }catch(e){if(!destroyed){line.textContent='⚠️ '+e.message;list.replaceChildren()}}
 }
 async function sell(npcId){
  if(destroyed||busy||!snapshot?.demand.orders.some(o=>o.npcId===npcId&&o.canSell))return;
  if(!pending||pending.npcId!==npcId)pending={npcId,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const resp=await fetch('/api/resident-demand-v44',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
   const json=await resp.json();
   if(!resp.ok)throw Object.assign(new Error(json.error||'주민 거래에 실패했어요'),{status:resp.status});
   pending=null;
   line.textContent='✅ '+json.receipt.detail+' · 실수령 '+money(json.receipt.net)+(json.replayed?' (중복 거래 방지)':'');
   onSold(json.receipt);
   await refresh();
  }catch(e){
   if(e.status&&e.status<500&&e.status!==429)pending=null;
   if(!destroyed)line.textContent='⚠️ '+e.message;
  }finally{busy=false;if(!destroyed&&snapshot)render()}
 }
 refresh();
 return {refresh,dispose(){destroyed=true;host.replaceChildren()}};
}
