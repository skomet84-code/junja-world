// v46 personal business achievements and last 30 days trial revenue/fee statistics.
// All progress, unlocked state and selected title are obtained from authenticated server.
const element=(tag,label)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=String(label);return e};
const add=(parent,tag,label)=>{const child=element(tag,label);parent.append(child);return child};
const cash=n=>Number(n||0).toLocaleString('ko-KR')+'G';
function action(label,onClick,disabled=false){
 const b=element('button',label);b.type='button';b.disabled=disabled;b.onclick=onClick;
 b.style.cssText='border:0;border-radius:10px;padding:10px 12px;margin:4px;background:#538979;color:white;font-weight:750';
 return b;
}
export function mountBusinessHonors(host){
 if(!host)throw Error('사업 업적 게시판 위치가 없습니다');
 host.replaceChildren();
 add(host,'h3','🏅 v46 · 나만의 장인 업적과 마을 경제');
 add(host,'p','실제 판매·제작 영수증으로 업적이 열려. 칭호는 명예용이고 골드·경험치 보상은 없어.');
 const notice=add(host,'p','업적 장부를 조회하는 중…');
 notice.style.cssText='background:#e9f3e9;padding:11px;border-radius:10px;font-weight:700';
 const body=add(host,'section');
 let alive=true,busy=false,pending=null,model=null;
 async function refresh(){
  if(!alive)return;
  try{
   const resp=await fetch('/api/business-honors-v46',{credentials:'same-origin',cache:'no-store'});
   const json=await resp.json();if(!resp.ok)throw Error(json.error||'업적 장부 확인 실패');
   if(!alive||!host.isConnected)return;
   model=json;render();
  }catch(error){if(alive){notice.textContent='⚠️ '+error.message;body.replaceChildren()}}
 }
 function render(){
  if(!alive||!model)return;
  body.replaceChildren();const {honors,economy}=model;
  notice.textContent='🏅 '+honors.unlockedCount+'/'+honors.totalCount+' 달성 · 착용 칭호: '+
   (honors.equipped?(honors.equipped.icon+' '+honors.equipped.name):'없음')+
   (model.audit?.ok?' · 저장 장부 정상':' · 시험 저장 장부 확인 필요');
  add(body,'h3','🌿 직업별 업적');
  const groups=[['all','공통 성장'],['farmer','🌾 농부'],['chef','🥧 요리사'],['merchant','🏪 상인']];
  for(const [role,name] of groups){
   const items=honors.honors.filter(h=>h.role===role);
   add(body,'h4',name);
   for(const honor of items){
    const card=add(body,'div');
    card.style.cssText='border:1px solid #d9dec9;border-radius:12px;padding:10px;margin:7px 0;background:#f9f8ef';
    add(card,'strong',honor.icon+' '+honor.name+(honor.unlocked?' ✅':' 🔒'));
    add(card,'p',honor.description+' · '+honor.progress+'/'+honor.required);
    const progress=add(card,'div');progress.style.cssText='height:9px;background:#dde4d8;overflow:hidden;border-radius:9px';
    const fill=add(progress,'div');fill.style.cssText='height:100%;background:#70ae87;width:'+Math.round(honor.progress/honor.required*100)+'%';
    if(honor.unlocked){
     card.append(action(honors.equipped?.id===honor.id?'착용 중':'🏅 칭호 착용하기',()=>equip(honor.id),
      busy||!model.audit?.ok||honors.equipped?.id===honor.id));
    }
   }
  }
  if(honors.equipped)body.append(action('현재 칭호 해제',()=>equip('none'),busy||!model.audit?.ok));
  add(body,'h3','📊 최근 30일 주민 판매 통계');
  add(body,'p','시험 경제의 주민 일반 주문과 VIP 특별주문만 포함해. 지난달·미래 날짜의 거래는 따로 계산돼.');
  const x=economy.totals;
  add(body,'p','총 '+x.sales+'건 · 실수령 '+cash(x.net)+' · 운영세 '+cash(x.tax)+' · 서비스료 '+cash(x.fee));
  const chart=add(body,'div');chart.style.cssText='display:flex;align-items:end;gap:3px;height:112px;padding:8px 0;border-bottom:1px solid #aab9ad';
  chart.setAttribute('role','img');chart.setAttribute('aria-label','최근 30일 주민 판매 매출 막대그래프');
  const max=Math.max(1,...economy.daily.map(d=>Number(d.net)||0));
  for(const day of economy.daily){
   const pillar=add(chart,'div');
   pillar.style.cssText='flex:1;min-width:2px;background:#81b7a2;border-radius:3px 3px 0 0;height:'+
    Math.max(2,Math.round(day.net/max*100))+'%';
   pillar.title=day.date+' · '+day.sales+'건 · '+cash(day.net);
  }
  add(body,'p','왼쪽은 30일 전, 오른쪽은 오늘(KST) · 해당 날짜의 주민 납품 매출');
  body.append(action('↻ 업적·매출 갱신',refresh,busy));
 }
 async function equip(id){
  if(busy||!alive||!model?.audit?.ok)return;
  if(!pending||pending.id!==id)pending={id,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const resp=await fetch('/api/business-honors-v46',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
   const data=await resp.json();
   if(!resp.ok)throw Object.assign(new Error(data.error||'칭호 장착 실패'),{status:resp.status});
   pending=null;await refresh();
  }catch(error){
   if(error.status&&error.status<500&&error.status!==429)pending=null;
   if(alive)notice.textContent='⚠️ '+error.message;
  }finally{busy=false;if(alive&&model)render()}
 }
 refresh();
 return {refresh,dispose(){alive=false;host.replaceChildren()}};
}
