// v48 mobile-first 3D home & rare furnishing salon.
// Entire account state is fetched from the authenticated trial economy.
import {mountHome3D} from './personal-home-3d-v48.js';
const el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n};
const append=(p,t,v)=>{const n=el(t,v);p.append(n);return n};
const gold=v=>Number(v||0).toLocaleString('ko-KR')+'G';
function button(text,fn,disabled=false,type='normal'){
 const b=el('button',text);b.type='button';b.className='v48-button'+(type==='ghost'?' ghost':'');
 b.disabled=disabled;b.addEventListener('click',fn);return b;
}
function section(host,title){const e=append(host,'section');e.className='v48-section';append(e,'h3',title);return e}
export function openPersonalHome(host,{back}={}){
 if(!host)throw Error('나만의 집 화면을 찾을 수 없어요');
 host.replaceChildren();host.classList.add('v48-home');
 append(host,'div','JUNJA V48 · PERSONAL HOME & ATELIER').className='v48-eyebrow';
 append(host,'h2','🏡 나만의 집 · 인테리어');
 append(host,'p','실제 가구를 수집해 3D 방에 놓고, 나만의 취향으로 집을 키워 가는 공간. 지금은 시험 경제 G를 사용하며 기존 우리집·레벨·의상은 그대로 유지돼.');
 if(back)host.append(button('← 기존 우리집으로',back,false,'ghost'));
 const status=append(host,'p','🏠 안전한 집 장부를 확인하는 중…');status.className='v48-status';
 const frame=append(host,'div');frame.className='v48-3d';
 const tooltip=append(host,'p','👆 3D 바닥 칸을 선택 · 좌우 드래그로 집 돌려보기');
 tooltip.className='v48-help';
 const info=append(host,'div');info.className='v48-totals';
 const main=append(host,'div');
 let active=true,busy=false,server=null,room=null,slot=0,item='oak_chair',pending=null;
 function styles(){
  const h=server?.home?.house;
  const level=server?.home?.levels?.[h.level-1];
  info.textContent=h?'🏡 '+level.name+' · '+h.level+'/4단계 · 배치 '+h.placed.length+'/'+level.capacity+' · 시험 잔액 '+gold(server.home.coins):'';
 }
 function refreshView(){
  if(!active||!server)return;
  const data=server.home,h=data.house,config=data.levels[h.level-1];
  if(!room){
   try{room=mountHome3D(frame,h,{onSelect:p=>{slot=p;refreshView()}})}
   catch(e){frame.replaceChildren(el('p','이 브라우저에서는 3D 실내 표시가 제한돼. 아래 위치 선택으로 꾸밀 수 있어.'));frame.style.height='auto'}
  }else room.refresh(h);
  room?.select(slot);
  styles();main.replaceChildren();
  const heading=section(main,'🛋️ 내 인테리어');
  const desc=append(heading,'p','집 '+h.level+'단계 · '+h.placed.length+'/'+config.capacity+'개 배치 / '+Object.values(h.owned).reduce((a,b)=>a+b,0)+'개 보유');
  desc.className='v48-note';
  const select=append(heading,'div');select.className='v48-grid';select.setAttribute('role','group');select.setAttribute('aria-label','집 가구 위치');
  const n=config.grid;
  for(let i=0;i<n*n;i++){
   const placed=h.placed.find(p=>p.slot===i);
   const label=placed?data.catalog[placed.item]?.emoji||'🪑':'·';
   const b=button(label,()=>{slot=i;room?.select(i);refreshView()},false,'ghost');
   b.className='v48-tile'+(slot===i?' selected':'')+(placed?' occupied':'');
   b.setAttribute('aria-label',(i+1)+'번 칸 '+(placed?data.catalog[placed.item]?.name:'빈자리'));
   b.setAttribute('aria-pressed',String(slot===i));select.append(b);
  }
  select.style.gridTemplateColumns='repeat('+n+',minmax(0,1fr))';
  const chosen=h.placed.find(p=>p.slot===slot);
  const current=append(heading,'p',chosen?'📍 '+(slot+1)+'번 · '+data.catalog[chosen.item].name+' · '+chosen.turn*90+'도':'📍 '+(slot+1)+'번 빈자리 · 가구를 선택해 배치할 수 있어');
  current.className='v48-note';
  const actions=append(heading,'div');actions.className='v48-action-row';
  if(chosen){
   actions.append(button('↻ 가구 90° 회전',()=>transact('rotate',{slot}),busy));
   actions.append(button('📦 보관함으로',()=>transact('remove',{slot}),busy,'ghost'));
  }else{
   const picker=append(heading,'select');picker.className='v48-select';picker.setAttribute('aria-label','배치할 보유 가구');
   const inventory=Object.values(data.catalog).filter(f=>f.owned>f.placed);
   for(const f of inventory){const opt=el('option',f.emoji+' '+f.name+' · 배치 가능 '+(f.owned-f.placed));opt.value=f.id;picker.append(opt)}
   if(inventory.some(f=>f.id===item))picker.value=item;
   else item=picker.options[0]?.value||'';
   picker.onchange=()=>item=picker.value;
   actions.append(button('🪑 선택 칸에 배치하기',()=>transact('place',{item,slot,turn:0}),busy||!inventory.length));
  }
  const build=section(main,'🔨 나의 집 성장');
  append(build,'p','확장하면 보관 가능한 가구와 배치 공간이 늘어나. 업그레이드는 영구적인 골드 소비야.').className='v48-note';
  if(config.nextPrice!==null){
   const next=data.levels[h.level];
   build.append(button('🏠 '+next.name+' 증축 · '+gold(config.nextPrice),()=>transact('upgrade',{}),
    busy||data.coins<config.nextPrice));
  }else append(build,'strong','👑 로열 저택 최고 단계');
  const roomStyle=section(main,'🎨 벽지와 바닥재');
  const decorate=(label,entries,key)=>{
   append(roomStyle,'h4',label);
   const row=append(roomStyle,'div');row.className='v48-style-row';
   for(const [id,v] of Object.entries(entries)){
    row.append(button((h[key]===id?'✓ ':'')+v.name+(v.tier>h.level?' 🔒 '+v.tier+'단계':''),
     ()=>transact('style',{kind:key,id}),busy||h[key]===id||v.tier>h.level,'ghost'));
   }
  };
  decorate('벽지',data.walls,'wall');decorate('바닥',data.floors,'floor');
  const shop=section(main,'✨ 희귀 가구 컬렉션');
  append(shop,'p','일반 가구는 골드로 구입하고, 희귀·전설 가구는 주민 납품·전문 생산 실적까지 필요해. 뽑기 없이 정해진 가격으로 판매돼.').className='v48-note';
  append(shop,'p','✅ 내 실제 납품 '+data.verified.sales+'건 · 전문 제작 '+data.verified.craft+'건').className='v48-note';
  const cards=append(shop,'div');cards.className='v48-catalog';
  for(const f of Object.values(data.catalog)){
   const card=append(cards,'article');card.className='v48-item'+(f.rarity==='희귀'||f.rarity==='전설'?' rare':'');
   append(card,'span',f.emoji).className='v48-item-icon';
   append(card,'strong',f.name);
   const rarity=append(card,'small',f.rarity+' · '+gold(f.price));
   rarity.className='v48-rarity';
   append(card,'p','보유 '+f.owned+'/'+f.limit+' · 배치 '+f.placed).className='v48-note';
   if(!f.unlocked)append(card,'p',(h.level<f.tier?f.tier+'단계 집 · ':'')+
    (data.verified.sales<f.sales?'납품 '+f.sales+'건 · ':'')+
    (data.verified.craft<f.craft?'전문 생산 '+f.craft+'건':'')).className='v48-lock';
   card.append(button(f.owned>=f.limit?'보유 한도 완료':f.unlocked?'구매 · '+gold(f.price):'🔒 아직 잠김',
    ()=>transact('buy',{item:f.id}),busy||!f.unlocked||f.owned>=f.limit||
    data.coins<f.price||Object.values(h.owned).reduce((a,b)=>a+b,0)>=config.capacity));
  }
  const foot=append(main,'p','※ 본 화면의 집은 3D 인테리어 시험판이야. 기존 게임의 집 레벨·가구·골드·체력·마나·행동력은 변경하지 않아.');
  foot.className='v48-help';
 }
 async function load(){
  if(!active)return;
  try{
   const res=await fetch('/api/personal-home-v48',{credentials:'same-origin',cache:'no-store'});
   const json=await res.json();
   if(!res.ok)throw Error(json.error||'집 장부를 조회할 수 없어');
   if(!active||!host.isConnected)return;
   server=json;status.textContent='✅ 집 기록은 서버에서 검증해 저장돼';refreshView();
  }catch(e){if(active){status.textContent='⚠️ '+e.message;main.replaceChildren()}}
 }
 async function transact(action,data){
  if(!active||busy||!server)return;
  const signature=JSON.stringify({action,data});
  if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
  busy=true;
  try{
   const res=await fetch('/api/personal-home-v48',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,requestId:pending.requestId})});
   const json=await res.json();
   if(!res.ok)throw Object.assign(new Error(json.error||'꾸미기 거래 실패'),{status:res.status});
   pending=null;
   if(!active||!host.isConnected)return;
   server={...server,home:json.home,version:json.version};
   status.textContent='✅ '+json.receipt.detail+(json.replayed?' · 중복 결제 방지':'')+' · '+gold(json.home.coins);
   refreshView();
  }catch(e){
   if(e.status&&e.status<500)pending=null;
   if(active)status.textContent='⚠️ '+e.message;
  }finally{busy=false}
 }
 load();
 return {refresh:load,dispose(){active=false;room?.dispose();room=null;host.replaceChildren();host.classList.remove('v48-home')}};
}
