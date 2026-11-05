// JUNJA Village v40: browser presentation only — NEVER credits money or goods locally.
const el=(tag,content)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=String(content);return n};
const add=(p,tag,content)=>{const n=el(tag,content);p.append(n);return n};
const money=n=>Number(n).toLocaleString('ko-KR')+'G';
const buttonCss='border:0;padding:11px 12px;margin:5px 3px;border-radius:12px;background:#588869;color:white;font-weight:750';
const roleLabels={farmer:'농부',chef:'요리사',merchant:'상인'};
export function openBusinessCenter(host,{back}={}){
 if(!host)throw Error('사업장 화면이 준비되지 않았습니다');
 host.replaceChildren();
 add(host,'h2','🏭 나의 사업장 · 시험 경제');
 add(host,'p','주민 직업 경력과 전문 생산품은 시험 경제 서버에만 저장돼요. 운영 중인 캐릭터의 재산에는 영향을 주지 않습니다.');
 const status=add(host,'p','직업 사업장 확인 중…');
 status.style.cssText='background:#f1f3e5;border-radius:12px;padding:12px;font-weight:700';
 const area=add(host,'div');
 let data=null,busy=false,pending=null;
 function btn(label,onClick,disabled=false){
  const b=el('button',label);b.style.cssText=buttonCss;b.disabled=busy||disabled;b.onclick=onClick;return b;
 }
 if(back)host.append(btn('← 개인 농장으로 돌아가기',back));
 async function fetchData(){
  try{
   const res=await fetch('/api/business-v40',{credentials:'same-origin',cache:'no-store'});
   const next=await res.json();
   if(!res.ok)throw Error(next.error||'사업장 정보를 가져올 수 없어요');
   if(!host.isConnected)return;
   data=next;status.textContent=next.audit?.ok?'✅ 서버 복구 장부 검증 완료 · 시험 골드 '+money(next.coins):
    next.audit?.reason==='not_created'?'🌱 첫 사업 활동 전 신규 시험 계정':
    '⚠️ 복구 장부 확인 필요 · '+(next.audit?.reason||'미확인');
   render();
  }catch(e){status.textContent='⚠️ '+e.message;area.replaceChildren()}
 }
 async function submit(action,role){
  if(busy)return;
  const signature=JSON.stringify({action,role});
  if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const res=await fetch('/api/business-v40',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action,role,requestId:pending.requestId})});
   const json=await res.json();
   if(!res.ok)throw Object.assign(new Error(json.error||'사업 거래에 실패했어요'),{status:res.status});
   pending=null;
   status.textContent='✅ '+json.receipt.detail+' · '+money(json.receipt.balance)+' 남음'+(json.replayed?' (중복 요청은 한 번만 처리)':'');
   if(host.isConnected)await fetchData();
  }catch(e){
   if(e.status&&e.status<500&&![408,429].includes(e.status))pending=null;
   status.textContent='⚠️ '+e.message;
  }finally{busy=false;if(host.isConnected)render()}
 }
 function render(){
  area.replaceChildren();if(!data)return;
  const {business,rankings}=data;
  add(area,'h3','🏅 내 전문 직업 · '+(roleLabels[business.active]||'미등록')+
   (business.rank?' · '+business.rank.title:''));
  if(!business.active)add(area,'p','먼저 직업 센터에서 면허를 취득하세요. 숙련 등급부터 사업장을 지을 수 있어요.');
  for(const [role,type] of Object.entries(business.types)){
   const facility=business.workshops[role],product=business.products[type.product];
   const card=add(area,'section');card.style.cssText='padding:14px;margin:11px 0;border-radius:17px;background:#f0f4e8;border:1px solid #d7e5ce';
   add(card,'h3',type.name+(facility?' · '+facility.level+'단계':' · 미건설'));
   add(card,'p','전문 생산품 · '+product.label+' (거래소 기준가 '+money(product.sell)+')');
   add(card,'p','재료: '+Object.entries(product.needs).map(([item,n])=>item+' ×'+n).join(' / '));
   if(!facility){
    add(card,'p','건설 비용 '+money(business.costs[role].build)+' · 숙련 이상');
    card.append(btn('🏗️ 내 사업장 건설',()=>submit('build',role),business.active!==role||business.rank?.tier<2));
   }else{
    add(card,'p','생산 가공비 '+money(business.costs[role].production)+' · 레벨이 오르면 가공비 절약');
    card.append(btn('📦 전문 생산품 만들기',()=>submit('produce',role),business.active!==role));
    if(facility.level<3){
     const requirement=facility.level===1?3:4;
     card.append(btn('⬆️ 시설 확장 '+money(business.costs[role].next),()=>submit('upgrade',role),
       business.active!==role||business.rank?.tier<requirement));
    }
   }
  }
  add(area,'h3','🏆 이번 주 생산 경쟁 · 서버 기록 기준');
  add(area,'p',new Date(rankings.weekStart).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})+' 시작 / 주간 생산 건수로만 순위 집계 / 아직 순위 보상은 지급하지 않아요');
  for(const [role,rows] of Object.entries(rankings.board)){
   const block=add(area,'section');block.style.cssText='padding:12px;margin:8px 0;border-radius:13px;background:#f3f0e5';
   add(block,'strong',roleLabels[role]+' 생산 랭킹');
   if(!rows.length)add(block,'p','아직 기록이 없어요. 첫 생산의 주인공이 되어보세요.');
   for(const row of rows)add(block,'p',row.rank+'위 · '+row.name+' · '+row.total+'건');
  }
  area.append(btn('↻ 사업장 기록 새로고침',fetchData));
 }
 fetchData();
 return {refresh:fetchData};
}
