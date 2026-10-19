// JUNJA v41 mobile-friendly business district UI. Server owns all placement, inventory and sales.
import {mountWorkshopVillage} from './workshop-world-v41.js';
import {mountResidentDemand} from './resident-demand-ui-v44.js';
import {mountCustomerLoyalty} from './customer-loyalty-ui-v45.js';
import {mountBusinessHonors} from './business-honors-ui-v46.js';
import {mountEnergyPanel} from './action-energy-ui-v47.js';
import {villagePlots,WORKSHOP_ROLES,WORKSHOP_SITES,DEFAULT_WORKSHOP_SLOTS} from './workshop-plots-v41.js';
const mk=(tag,label)=>{const el=document.createElement(tag);if(label!==undefined)el.textContent=String(label);return el};
const add=(parent,tag,text)=>{const e=mk(tag,text);parent.append(e);return e};
const btnStyle='border:0;border-radius:11px;padding:10px 12px;margin:4px 5px 4px 0;background:#598873;color:#fff;font-weight:700';
const roleNames={farmer:'🌿 프리미엄 온실',chef:'🥧 수제 베이커리',merchant:'🏪 유통 공방'};
const currency=n=>Number(n).toLocaleString('ko-KR')+'G';
export function openWorkshopPlaza(host,{back,backLabel='← 개인 농장으로 돌아가기',look={}}={}){
 if(!host)throw Error('사업장 구역 화면을 찾지 못했습니다');
 host.replaceChildren();
 add(host,'h2','🏘️ 준자마을 3D 사업장 거리 · v46');
 add(host,'p','사업장 터치를 통해 직접 걸어가고, 실내를 둘러볼 수 있어요. 방문은 열람만 가능하며 다른 주민의 재산을 변경할 수 없습니다.');
 const note=add(host,'p','서버 사업장 기록을 확인하는 중…');
 note.style.cssText='padding:12px;background:#f2f3e4;border-radius:12px;font-weight:700';
 const viewport=add(host,'div');viewport.style.cssText='height:365px;max-height:56vh;min-height:275px;width:100%;border-radius:17px;overflow:hidden;border:2px solid #e2d1a7;background:#bfd69e';
 const controls=add(host,'div');
 const actionPanel=add(host,'section');actionPanel.style.cssText='background:#edf3e9;padding:10px;border-radius:14px;margin-top:8px';
 const selector=add(host,'section');
 let scene=null,removed=false,self=null,owner=null,visitorList=[],busy=false,pending=null,current=null,residentShop=null,loyaltyPanel=null,honorsPanel=null,energyPanel=null;
 const button=(label,fn,disabled=false)=>{
  const b=mk('button',label);b.type='button';b.style.cssText=btnStyle;b.disabled=disabled||busy;b.onclick=fn;return b;
 };
 const warning=msg=>{note.textContent='⚠️ '+msg};
 if(back)host.append(button(backLabel,back));
 const keepScene=()=>{scene?.dispose();scene=null};
 function safeScene(buildings,readOnly,who){
  keepScene();
  try{
   scene=mountWorkshopVillage({host:viewport,buildings,readOnly,ownerName:who,look,
    onArrival:({role})=>facilityPanel(role,readOnly,who),
    onInteriorChange:({inside,role})=>{
     if(inside)facilityPanel(role,readOnly,who,true);
     else if(role)facilityPanel(role,readOnly,who,false);
    }
   });
  }catch(e){
   warning('3D 화면을 표시할 수 없어요. 아래 건물별 조작 버튼을 이용해 주세요.');
   viewport.replaceChildren();
   add(viewport,'p','이 기기에서는 3D 사업장을 표시할 수 없어요.');
   viewport.style.height='auto';
  }
 }
 async function fetchJSON(url){
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  const j=await r.json();if(!r.ok)throw Error(j.error||'서버에서 정보를 가져오지 못했습니다');
  return j;
 }
 async function load(){
  if(removed)return;
  try{
   const [mine,guests]=await Promise.all([
    fetchJSON('/api/business-v40'),fetchJSON('/api/workshop-visits-v41')
   ]);
   if(removed||!host.isConnected)return;
   self=mine;visitorList=guests.visitable||[];
   await viewSelf(false);
   note.textContent=mine.audit?.ok?'✅ 서버 복구 장부 검증 완료 · 시험 골드 '+currency(mine.coins):
     mine.audit?.reason==='not_created'?'🌱 아직 개업한 사업장이 없어요. 먼저 v40에서 건설해 주세요.':
     '⚠️ 저장 장부를 확인해야 합니다 · '+(mine.audit?.reason||'미확인');
  }catch(e){
   if(!removed)warning(e.message);
  }
 }
 function buildingsFromOwn(){
  const plan=villagePlots({workshops:self?.business?.workshops||{}});
  if(!plan.ok)throw Error('사업장 배치 위치가 중복되어 관리자 확인이 필요해요');
  return plan.buildings.map(b=>({role:b.role,level:b.level,site:b.slot}));
 }
 function facilityPanel(role,readOnly,who,interior=false){
  current={role,readOnly,who,interior};
  actionPanel.replaceChildren();
  add(actionPanel,'h3',(roleNames[role]||role)+' · '+who+(readOnly?' · 방문 중':' · 내 사업장'));
  const facility=(readOnly?owner?.buildings:buildingsFromOwn()).find(b=>b.role===role);
  add(actionPanel,'p',(facility?.level||1)+'단계 설비 · '+(readOnly?'시설 구경만 할 수 있어요':'이 시설에서 전문 생산이 가능해요'));
  if(!interior)actionPanel.append(button('🚪 실내로 들어가기',()=>scene?.enter(role)));
  else actionPanel.append(button('🌳 밖으로 나가기',()=>scene?.exit()));
  if(!readOnly){
   actionPanel.append(button('📦 이곳에서 전문 생산하기',()=>transact('produce',role),busy||self?.business?.active!==role));
   add(actionPanel,'p','생산 시 서버에서 실제 재료와 비용을 확인하고, 완료한 상품만 창고에 지급해요.');
  }else add(actionPanel,'p','방문 중에는 생산·재배치·골드/재고 변경이 허용되지 않습니다.');
 }
 function renderControls(readOnly,buildings,who){
  residentShop?.dispose();residentShop=null;
  loyaltyPanel?.dispose();loyaltyPanel=null;
  honorsPanel?.dispose();honorsPanel=null;
  energyPanel?.dispose();energyPanel=null;
  controls.replaceChildren();selector.replaceChildren();
  const first=add(controls,'h3','📍 '+who+'의 사업장');
  if(!buildings.length)add(controls,'p','아직 지어진 사업장이 없어요.');
  for(const building of buildings){
   controls.append(button('🚶 '+roleNames[building.role]+' '+building.level+'단계로 이동',
    ()=>{if(!scene?.visitRole(building.role))facilityPanel(building.role,readOnly,who)}));
  }
  if(readOnly){
   controls.append(button('🏡 내 사업장으로 돌아가기',()=>viewSelf(true)));
  }
  const visitors=visitorList.filter(p=>p.owner!==owner?.owner&&p.owner!==self?.me);
  if(!readOnly){
   add(selector,'h3','🚪 다른 주민 사업장 방문');
   if(!visitors.length)add(selector,'p','아직 공개된 주민 사업장이 없어요.');
   for(const visiting of visitors.slice(0,12)){
    selector.append(button('🏘️ '+visiting.ownerName+' · 사업장 '+visiting.workshopCount+'곳',
     ()=>visitPlayer(visiting.owner)));
   }
   add(selector,'h3','🔧 내 사업장 자리 이동 (하루 5회)');
   for(const b of buildings){
    const line=add(selector,'div');
    line.style.cssText='border:1px solid #d6e0c9;border-radius:12px;padding:10px;margin:8px 0';
    add(line,'strong',roleNames[b.role]+' 현재 '+(b.site+1)+'번 터');
    const choose=mk('select');
    choose.style.cssText='margin:6px;padding:9px;max-width:100%;border-radius:8px';
    const plan=villagePlots({workshops:self.business.workshops});
    for(const site of WORKSHOP_SITES){
     if(plan.sites[site.slot].role&&plan.sites[site.slot].role!==b.role)continue;
     const opt=mk('option',site.slot+1+'번 터'+(site.slot===b.site?' (현재 위치)':''));opt.value=site.slot;choose.append(opt);
    }
    choose.value=String(b.site);
    line.append(choose);
    line.append(button('이 자리로 옮기기',()=>transact('place',b.role,Number(choose.value)),busy));
   }
   const demandHost=add(selector,'section');
   demandHost.style.cssText='margin-top:12px;padding:10px;border-radius:14px;background:#f8f6e9';
   residentShop=mountResidentDemand(demandHost,{onSold:receipt=>{
    note.textContent='✅ '+receipt.detail+' · 실수령 '+currency(receipt.net);
    loyaltyPanel?.refresh();honorsPanel?.refresh();
    fetchJSON('/api/business-v40').then(data=>{if(!removed)self=data}).catch(()=>{});
   }});
   const loyaltyHost=add(selector,'section');
   loyaltyHost.style.cssText='margin-top:12px;padding:11px;border-radius:15px;background:#faf4fc';
   loyaltyPanel=mountCustomerLoyalty(loyaltyHost,{onComplete:receipt=>{
    note.textContent='💜 '+receipt.detail+' · '+currency(receipt.net)+' 정산 완료';
    residentShop?.refresh();honorsPanel?.refresh();
    fetchJSON('/api/business-v40').then(data=>{if(!removed)self=data}).catch(()=>{});
   }});
   const energyHost=add(selector,'section');
   energyHost.style.cssText='padding:10px;margin:12px 0;border-radius:16px;background:#fbf7ed';
   energyPanel=mountEnergyPanel(energyHost);
   const honorsHost=add(selector,'section');
   honorsHost.style.cssText='margin-top:12px;padding:11px;border-radius:15px;background:#f1f8ef';
   honorsPanel=mountBusinessHonors(honorsHost);
  }
 }
 async function viewSelf(recreate){
  if(!self)return;
  const buildings=buildingsFromOwn();
  owner=null;safeScene(buildings,false,'나');
  renderControls(false,buildings,'나');
  actionPanel.replaceChildren();
  add(actionPanel,'p',buildings.length?'건물을 터치하거나 이동 버튼을 누르면 캐릭터가 걸어가요.':'v39에서 직업을 키우고 v40에서 먼저 사업장을 건설해 보세요.');
 }
 async function visitPlayer(key){
  if(busy||removed)return;
  try{
   const publicPage=await fetchJSON('/api/workshop-visits-v41?owner='+encodeURIComponent(key));
   if(removed||!host.isConnected)return;
   owner=publicPage;
   safeScene(publicPage.buildings,true,publicPage.ownerName);
   renderControls(true,publicPage.buildings,publicPage.ownerName);
   actionPanel.replaceChildren();add(actionPanel,'p','방문자 모드입니다. 사업장 내부는 구경할 수 있지만 골드·재고·시설 위치를 변경할 수 없어요.');
   note.textContent='🏡 '+publicPage.ownerName+'님의 공개 사업장 방문 중';
  }catch(e){warning(e.message)}
 }
 async function transact(action,role,site){
  if(busy||removed||owner)return;
  const identity=JSON.stringify({action,role,site:action==='place'?site:null});
  if(!pending||pending.identity!==identity)pending={identity,id:crypto.randomUUID()};
  busy=true;try{
   const r=await fetch('/api/business-v40',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,role,site,requestId:pending.id})});
   const j=await r.json();
   if(!r.ok)throw Object.assign(new Error(j.error||'거래를 처리하지 못했어요'),{status:r.status});
   pending=null;
   note.textContent='✅ '+j.receipt.detail+(j.replayed?' · 중복 요청 1회 처리':'');
   self=await fetchJSON('/api/business-v40');
   honorsPanel?.refresh();energyPanel?.refresh();
   if(removed||!host.isConnected)return;
   await viewSelf(true);
  }catch(e){
   if(e.status&&e.status<500&&![408,429].includes(e.status))pending=null;
   warning(e.message);
  }finally{busy=false}
 }
 load();
 return {dispose(){removed=true;residentShop?.dispose();loyaltyPanel?.dispose();honorsPanel?.dispose();energyPanel?.dispose();keepScene();host.replaceChildren()},refresh:load,
  enterRole:role=>scene?.enter(role),stats:()=>scene?.stats()};
}
