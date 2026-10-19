// v49 single, player-facing information architecture. No developer version labels.
// This module changes navigation only: never writes game saves, coins or inventory.
export const VILLAGE_NAV_V49=Object.freeze([
 Object.freeze({id:'home',icon:'🏡',label:'홈',heading:'오늘의 마을',subtitle:'지금 할 일과 다음 목적지를 한곳에서'}),
 Object.freeze({id:'life',icon:'🌿',label:'생활',heading:'생활과 모험',subtitle:'농사·낚시·채집을 하고 하루의 목표를 채워봐'}),
 Object.freeze({id:'production',icon:'🛠️',label:'생산',heading:'생산과 거래',subtitle:'재료를 모아 만들고, 주문을 납품해 골드를 벌어봐'}),
 Object.freeze({id:'house',icon:'🏠',label:'집',heading:'집과 꾸미기',subtitle:'나만의 방, 캐릭터와 수집품을 가꾸는 공간'}),
 Object.freeze({id:'bag',icon:'🎒',label:'가방',heading:'보관과 관리',subtitle:'모은 재료와 보관함을 한 번에 관리해'})
]);
export const VILLAGE_ACTIONS_V49=Object.freeze({
 home:Object.freeze([
  {id:'goal',icon:'📖',label:'다음 생활 목표',description:'현재 진행 중인 목표·보상 확인'},
  {id:'farm',icon:'🌾',label:'농장',description:'작물을 심고 수확하기'},
  {id:'craft',icon:'🧵',label:'제작소',description:'재료를 가공해 가치 높이기'},
  {id:'orders',icon:'📦',label:'주민 주문',description:'주문을 납품하고 명성 쌓기'}
 ]),
 life:Object.freeze([
  {id:'farm',icon:'🌾',label:'내 농장',description:'나만의 텃밭·과수원'},
  {id:'fishing',icon:'🎣',label:'낚시',description:'부두로 이동해 물고기 잡기',travel:true},
  {id:'gather',icon:'🌲',label:'채집',description:'숲으로 이동해 재료 모으기',travel:true},
  {id:'daily',icon:'📅',label:'오늘의 할 일',description:'일일 미션과 업적 확인'},
  {id:'career',icon:'🏅',label:'직업과 계약',description:'전문 분야를 키우고 일일 계약 받기',trial:true},
  {id:'hunt',icon:'⚔️',label:'사냥터',description:'몬스터·스킬·장비 성장'},
  {id:'festival',icon:'🎪',label:'축제·주간 의뢰',description:'이번 주 축제와 출석 이벤트'},
  {id:'social',icon:'👫',label:'친구와 소통',description:'친구 말풍선·함께 플레이'}
 ]),
 production:Object.freeze([
  {id:'craft',icon:'🧵',label:'제작소',description:'채집 재료로 도구와 선물 제작'},
  {id:'orders',icon:'📦',label:'주민 주문',description:'농산물 가공과 주문 납품'},
  {id:'business',icon:'🏭',label:'나의 사업장',description:'직업 전문 생산품 만들기',trial:true},
  {id:'district',icon:'🏘️',label:'사업장 거리',description:'3D 공방과 손님·매출 확인',trial:true},
  {id:'market',icon:'⚓',label:'판매 상점',description:'잡은 물고기·재료 판매'},
  {id:'trade',icon:'🏪',label:'주민 거래소',description:'주민 간 시범 거래',trial:true}
 ]),
 house:Object.freeze([
  {id:'house',icon:'🏠',label:'나의 집',description:'3D 인테리어·가구 배치·증축'},
  {id:'decorate',icon:'🌷',label:'마을 꾸미기',description:'내 장식과 정원 꾸미기'},
  {id:'wardrobe',icon:'👒',label:'옷장',description:'옷·헤어·소품 바꾸기'},
  {id:'collection',icon:'🐠',label:'어항 컬렉션',description:'잡은 물고기 감상'},
  {id:'reputation',icon:'🏆',label:'명예 기록',description:'마을 성장과 칭호 확인'}
 ]),
 bag:Object.freeze([
  {id:'inventory',icon:'🎒',label:'내 가방',description:'아이템·재료·보관 용량'},
  {id:'storage',icon:'🧺',label:'수확 창고',description:'농장에 보관한 작물 확인'},
  {id:'materials',icon:'🪵',label:'재료 판매',description:'모은 재료 확인·판매'},
  {id:'map',icon:'🗺️',label:'마을 지도',description:'장소 확인 후 목적지로 이동'},
  {id:'backup',icon:'🔐',label:'저장 보관함',description:'기존 저장 기록 백업과 확인'}
 ])
});
const advanced=Object.freeze([
 {id:'economy',icon:'📒',label:'경제·복구 기록',description:'독립 시험 경제와 거래 장부',trial:true}
]);
const findSection=id=>VILLAGE_NAV_V49.find(s=>s.id===id)||VILLAGE_NAV_V49[0];
const make=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=String(text);
 if(cls)el.className=cls;
 return el;
};
const add=(parent,tag,text,cls)=>{const el=make(tag,text,cls);parent.append(el);return el;};
const button=(icon,title,description,handler,{trial=false,travel=false,main=false}={})=>{
 const b=make('button',undefined,'v49-link'+(main?' v49-link-main':''));
 b.type='button';
 b.dataset.action=handler.id;
 b.setAttribute('aria-label',title+(travel?' · 장소로 이동':''));
 const mark=add(b,'span',icon,'v49-link-icon');
 mark.setAttribute('aria-hidden','true');
 const copy=add(b,'span',undefined,'v49-link-copy');
 add(copy,'strong',title);
 add(copy,'small',description);
 if(trial)add(b,'span','시험','v49-trial');
 else add(b,'span','›','v49-arrow');
 b.addEventListener('click',()=>handler.onAction(handler.id));
 return b;
};
export function renderVillageMenuV49(host,{
 section='home',goal=null,level=1,onAction=()=>{},onCategory=()=>{}
}={}){
 if(!host)throw Error('마을 안내 화면을 열 수 없어요');
 const active=findSection(section);
 host.replaceChildren();host.classList.add('v49-menu');
 const header=add(host,'header',undefined,'v49-menu-head');
 add(header,'span','준자마을 · 생활 안내','v49-eyebrow');
 add(header,'h2',active.icon+' '+active.heading);
 add(header,'p',active.subtitle);
 if(active.id==='home'){
  const lead=add(host,'section',undefined,'v49-goal-card');
  const top=add(lead,'div',undefined,'v49-goal-top');
  add(top,'span','🌱 지금 해야 할 일','v49-eyebrow');
  add(top,'span','Lv. '+Math.max(1,Math.floor(Number(level)||1)),'v49-level');
  const done=!!goal&&goal.total>0&&goal.done>=goal.total;
  add(lead,'strong',goal?.title||( '자유로운 마을 생활을 즐겨봐'));
  add(lead,'p',done?'✨ 목표를 달성했어! 보상을 받고 다음 목표를 열어봐':
   goal?.description||'오늘의 농장, 낚시, 수집과 꾸미기를 마음껏 즐겨봐.');
  if(goal&&goal.total>0){
   const track=add(lead,'div',undefined,'v49-goal-progress');
   track.setAttribute('role','progressbar');
   track.setAttribute('aria-label','현재 생활 목표 진행률');
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax',String(goal.total));
   track.setAttribute('aria-valuenow',String(Math.min(goal.total,Math.max(0,goal.done))));
   add(track,'i').style.width=Math.max(0,Math.min(100,goal.done/goal.total*100))+'%';
   add(lead,'small',goal.done+' / '+goal.total+' · 보상 '+goal.reward+'G');
  }
  const cta=make('button',done?'🎁 목표 보상 받기':'🧭 목표 장소로 이동','v49-goal-go');
  cta.type='button';
  cta.addEventListener('click',()=>onAction(done?'goal':'go-goal'));
  lead.append(cta);
  add(host,'h3','골드를 버는 3단계','v49-block-title');
  const route=add(host,'div',undefined,'v49-steps');
  for(const [id,icon,label,note] of [
   ['farm','🌱','농장 수확','작물 모으기'],
   ['craft','🧵','제작','가치 높이기'],
   ['orders','📦','주문 납품','골드·명성']
  ]){
   const b=make('button',undefined,'v49-step');b.type='button';
   add(b,'span',icon);add(b,'strong',label);add(b,'small',note);
   b.addEventListener('click',()=>onAction(id));route.append(b);
  }
 }
 const title=active.id==='home'?'바로 가기':'여기서 할 수 있는 일';
 add(host,'h3',title,'v49-block-title');
 const tiles=add(host,'div',undefined,'v49-tiles');
 for(const a of VILLAGE_ACTIONS_V49[active.id])tiles.append(button(a.icon,a.label,a.description,
  {id:a.id,onAction},{trial:a.trial,travel:a.travel,main:active.id==='home'}));
 if(active.id==='production'){
  const details=add(host,'details',undefined,'v49-advanced');
  add(details,'summary','⚙️ 경제 시험·복구 기능 보기');
  add(details,'p','정식 마을 골드와 별도로 운영하는 개발용 시험 경제야. 시험 재화와 일반 재화를 혼동하지 않도록 분리했어.');
  for(const a of advanced)details.append(button(a.icon,a.label,a.description,{id:a.id,onAction},{trial:true}));
 }
 const footer=add(host,'footer',undefined,'v49-menu-footer');
 add(footer,'p','원하는 메뉴가 보이지 않으면 아래 다섯 가지 탭에서 찾을 수 있어.');
 const tabs=add(footer,'nav',undefined,'v49-mini-tabs');tabs.setAttribute('aria-label','마을 메뉴 분류');
 for(const item of VILLAGE_NAV_V49){
  const b=make('button',item.label,'v49-mini-tab'+(item.id===active.id?' active':''));
  b.type='button';
  b.setAttribute('aria-current',String(item.id===active.id));
  b.addEventListener('click',()=>onCategory(item.id));
  tabs.append(b);
 }
 return host;
}
export function activateVillageDockV49(dock,section){
 if(!dock)return;
 for(const button of dock.querySelectorAll('[data-v49-section]')){
  const chosen=button.dataset.v49Section===section;
  button.classList.toggle('active',chosen);
  button.setAttribute('aria-current',chosen?'page':'false');
 }
}
