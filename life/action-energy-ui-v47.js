// v47 action-energy mobile card. The server decides regen, balance and pack limits.
// This is the segregated TRIAL economy; no client editing of saved character XP/gold.
const node=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=String(value);return e};
const viewG=n=>Number(n||0).toLocaleString('ko-KR')+'G';
const html=(p,tag,text)=>{const x=node(tag,text);p.append(x);return x};
export function mountEnergyPanel(host,{onChange=()=>{}}={}){
 if(!host)throw Error('행동력 표시 영역을 찾을 수 없습니다');
 host.replaceChildren();
 const title=html(host,'h3','⚡ 행동력 · 휴식과 회복');
 title.className='v47-energy-title';
 html(host,'p','마을의 농사·낚시·채집·제작·납품에서 행동력이 소모돼. 시간에 따라 회복되고, 별도 경제 골드로 충전할 수 있어. 캐릭터 골드·레벨은 그대로야.');
 const main=html(host,'div');main.className='v47-energy-card';
 const amount=html(main,'strong','행동력 불러오는 중…');
 const gauge=html(main,'div');gauge.className='v47-energy-track';gauge.setAttribute('role','progressbar');
 gauge.setAttribute('aria-label','마을 행동력');
 const fill=html(gauge,'span');fill.className='v47-energy-fill';
 const countdown=html(main,'p','');
 const prices=html(main,'p','');
 const buy=node('button','⚡ 행동력 +25 충전 · 1,200G');
 buy.type='button';buy.className='v47-buy-button';main.append(buy);
 const status=html(main,'p','');
 const notes=html(host,'p','🌱 심기 2 · 🧺 수확 0(무료) · 🌲 채집 3 · 🎣 낚시 5 · 🍳 제작 6 · 📦 납품 3 · 🏪 전문 생산 8');
 notes.className='v47-energy-notes';
 let alive=true,snapshot=null,baseline=0,received=0,busy=false,pending=null;
 function projection(){
  if(!snapshot)return null;
  const ticks=Math.max(0,Math.floor((Date.now()-received)/1000));
  const regained=Math.floor((ticks+(snapshot.current<snapshot.max?
   snapshot.regenSeconds-snapshot.nextRegenSeconds:0))/snapshot.regenSeconds);
  const current=Math.min(snapshot.max,snapshot.current+regained);
  const elapsedInto=ticks+(snapshot.regenSeconds-snapshot.nextRegenSeconds);
  const next=current>=snapshot.max?0:snapshot.regenSeconds-((elapsedInto%snapshot.regenSeconds+
   snapshot.regenSeconds)%snapshot.regenSeconds);
  return {...snapshot,current,nextRegenSeconds:next};
 }
 function render(){
  if(!alive)return;
  const e=projection();
  if(!e){amount.textContent='서버 연결 확인 중…';buy.disabled=true;return}
  amount.textContent='⚡ '+e.current+' / '+e.max;
  gauge.setAttribute('aria-valuemin','0');gauge.setAttribute('aria-valuemax',String(e.max));
  gauge.setAttribute('aria-valuenow',String(e.current));
  fill.style.width=Math.round(e.current/e.max*100)+'%';
  countdown.textContent=e.current===e.max?'✨ 행동력이 가득 찼어':
   '⏳ 다음 행동력 +1까지 약 '+Math.max(1,Math.ceil(e.nextRegenSeconds/60))+'분';
  prices.textContent='회복 속도 '+e.regenSeconds/60+'분당 +1 · 충전 '+e.packPrice.toLocaleString('ko-KR')+'G · 오늘 '+e.packsLeft+'회 남음 · 시험 G '+viewG(baseline);
  buy.textContent='⚡ +'+e.packSize+' 충전 · '+viewG(e.packPrice);
  buy.disabled=busy||e.packsLeft<=0||e.current>=e.max||baseline<e.packPrice;
 }
 async function refresh(){
  if(!alive)return;
  try{
   const res=await fetch('/api/economy-v36',{credentials:'same-origin',cache:'no-store'});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'행동력 서버에 연결할 수 없어요');
   if(!alive||!host.isConnected)return;
   if(!data.energy)throw Error('시험 행동력 기능이 아직 비활성화되어 있어요');
   snapshot=data.energy;baseline=data.economy.coins;received=Date.now();
   status.textContent='✅ 행동력은 서버에 안전하게 저장돼';render();
   onChange(snapshot);
  }catch(err){if(alive){status.textContent='⚠️ '+err.message;buy.disabled=true}}
 }
 async function purchase(){
  if(busy||!alive||!projection()||buy.disabled)return;
  if(!pending)pending={action:'energy_buy',payload:{},requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const res=await fetch('/api/economy-v36',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
   const data=await res.json();
   if(!res.ok)throw Object.assign(new Error(data.error||'행동력 충전을 취소했어'),{status:res.status});
   pending=null;
   if(!alive)return;
   snapshot=data.energy;baseline=data.economy.coins;received=Date.now();
   status.textContent='✅ '+data.receipt.detail+(data.replayed?' · 중복 결제 방지':'');
   onChange(snapshot);
  }catch(err){
   if(err.status&&err.status<500)pending=null;
   if(alive)status.textContent='⚠️ '+err.message;
  }finally{busy=false;render()}
 }
 buy.onclick=purchase;
 const timer=setInterval(()=>{if(!host.isConnected){alive=false;clearInterval(timer);return}if(alive)render()},10000); // no detached-modal timers, NO HTTP polling
 refresh();
 return {refresh,dispose(){alive=false;clearInterval(timer);host.replaceChildren()}};
}
export function mountEnergyHud(host,{open}={}){
 if(!host)return {refresh:async()=>{},dispose:()=>{}};
 let active=true,latest=null,lastRead=0;
 const display=()=>{
  if(!active||!latest)return;
  const seconds=Math.floor((Date.now()-lastRead)/1000),added=Math.floor((seconds+latest.regenSeconds-latest.nextRegenSeconds)/latest.regenSeconds);
  const current=Math.min(latest.max,latest.current+Math.max(0,added));
  host.textContent='⚡ '+current+'/'+latest.max;
  host.setAttribute('aria-label','마을 행동력 '+current+'/'+latest.max+' · 눌러서 회복·구매');
 };
 const refresh=async()=>{
  try{
   const res=await fetch('/api/economy-v36',{cache:'no-store',credentials:'same-origin'});
   if(!res.ok)return;
   const body=await res.json();
   if(!active||!body.energy)return;
   latest=body.energy;lastRead=Date.now();display();
  }catch{}
 };
 host.onclick=()=>{if(typeof open==='function')open()};
 host.textContent='⚡ 행동력';
 host.setAttribute('aria-label','마을 행동력 조회·충전');
 const interval=setInterval(display,15000);
 refresh();
 return {refresh,dispose(){active=false;clearInterval(interval)}};
}
