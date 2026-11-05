// v45 only presents authenticated trial-economy analytics and special orders.
// Server receipts alone set loyalty, purchase prices and leaderboard. Browser cannot award anything.
const el=(tag,content)=>{const e=document.createElement(tag);if(content!==undefined)e.textContent=String(content);return e};
const append=(parent,tag,content)=>{const e=el(tag,content);parent.append(e);return e};
const money=n=>Number(n||0).toLocaleString('ko-KR')+'G';
const button=(text,fn,disabled=false)=>{
 const b=el('button',text);b.type='button';b.disabled=disabled;
 b.style.cssText='border:0;margin:5px 4px;padding:11px 13px;border-radius:11px;background:#846d9a;color:white;font-weight:750';
 b.onclick=fn;return b;
};
export function mountCustomerLoyalty(host,{onComplete=()=>{}}={}){
 if(!host)throw Error('단골손님 게시판 영역이 없습니다');
 host.replaceChildren();
 append(host,'h3','💜 v45 · 단골손님 & 사업장 명예');
 append(host,'p','손님에게 서로 다른 날 3번 납품하면 VIP 주문이 열려. 실제 납품 내역으로만 단계가 올라가고, 주간 매출은 시험 장부 기준으로 집계돼.');
 const info=append(host,'p','오늘의 단골 관계를 불러오는 중…');
 info.style.cssText='background:#ede7f3;border-radius:10px;padding:11px;font-weight:700';
 const content=append(host,'div');
 let current=null,active=true,busy=false,pending=null;
 async function fetchBoard(){
  if(!active)return;
  try{
   const resp=await fetch('/api/customer-loyalty-v45',{credentials:'same-origin',cache:'no-store'});
   const data=await resp.json();
   if(!resp.ok)throw Error(data.error||'단골 명예 게시판을 가져올 수 없어요');
   if(!active||!host.isConnected)return;
   current=data;render();
  }catch(error){if(active){info.textContent='⚠️ '+error.message;content.replaceChildren()}}
 }
 function render(){
  content.replaceChildren();if(!current)return;
  const {loyalty,rankings,mine}=current;
  info.textContent='🏆 이번 주 내 매출 '+money(mine.net)+' · 주민 거래 '+mine.sales+'건 · '+
   (loyalty.weeklyUsed?'이번 주 VIP 납품 완료':'이번 주 VIP 주문 1건 가능');
  append(content,'h3','🫶 단골 고객 관계');
  for(const c of loyalty.customers){
   const card=append(content,'section');
   card.style.cssText='margin:9px 0;padding:13px;border-radius:15px;background:#f3edf5;border:1px solid #ded0e5';
   append(card,'strong',c.customer+' · '+c.tier);
   append(card,'p','누적 방문 '+c.days+'일 · '+(c.remainingVisits?
    '특별 주문까지 '+c.remainingVisits+'회 남음':'VIP 주문 해금 완료'));
   append(card,'p',c.itemName+' ×'+c.quantity+'개 · 특별 구매 '+money(c.gross)+
    ' / 운영세 '+money(c.tax)+' / 서비스료 '+money(c.fee)+' / 실수령 '+money(c.net));
   append(card,'p',c.fulfilled?'✅ 이번 주 특별 주문 완료':
    c.canAccept?'📦 내 창고에 충분한 재고가 있어 납품 가능':'내 상품 재고 '+c.stock+'개 · 현재 직업/사업장/주간 한도 확인 필요');
   card.append(button(c.fulfilled?'이번 주 완료':'💜 특별 주문 납품',()=>sell(c.npcId),
    busy||!c.canAccept));
  }
  append(content,'h3','🥇 이번 주 사업가 랭킹');
  append(content,'p','매주 월요일 00:00(KST) 집계 시작 · 서버에 저장된 일반 주민 구매와 VIP 구매의 실수령 매출 기준');
  if(!rankings.top.length)append(content,'p','이번 주 첫 주민 판매 기록을 기다리고 있어!');
  for(const row of rankings.top)append(content,'p',row.rank+'위 '+row.name+' · '+money(row.net)+' · '+row.sales+'건');
  content.append(button('↻ 최신 단골 기록 새로고침',fetchBoard,busy));
 }
 async function sell(npcId){
  if(busy||!active||!current?.loyalty.customers.find(c=>c.npcId===npcId)?.canAccept)return;
  if(!pending||pending.npcId!==npcId)pending={npcId,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const resp=await fetch('/api/customer-loyalty-v45',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
   const value=await resp.json();
   if(!resp.ok)throw Object.assign(new Error(value.error||'특별 거래가 완료되지 않았어요'),{status:resp.status});
   pending=null;
   info.textContent='✅ '+value.receipt.detail+' · '+money(value.receipt.net)+' 정산'+(value.replayed?' (재요청 중복 방지)':'');
   onComplete(value.receipt);
   await fetchBoard();
  }catch(error){
   if(error.status&&error.status<500&&error.status!==429)pending=null;
   if(active)info.textContent='⚠️ '+error.message;
  }finally{busy=false;if(active&&current)render()}
 }
 fetchBoard();
 return {refresh:fetchBoard,dispose(){active=false;host.replaceChildren()}};
}
