// v51 online quests. Read-only progress from Cloudflare API and one-time
// reward claims; localStorage NEVER advances quest progress or mints currency.
const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
export function mountQuestsV51(host,{career,market,business}={}){
 if(!host)return;
 let alive=true,busy=false,pending=null;
 host.replaceChildren();
 const heading=make('h3','🌳 v51 신규 콘텐츠 의뢰');
 const blurb=make('p','직업·거래소·사업장 활동을 완료하면 서버에서 진행도를 확인해요. 퀘스트 보상은 시험 경제 골드이며 캐릭터 레벨·본 게임 골드와 별개예요.');
 const status=make('p','서버 의뢰 목록을 확인하는 중…');
 status.style.cssText='padding:10px;background:#f2f5e6;border-radius:12px;color:#58705b;font-size:12px';
 const controls=make('div');
 controls.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:11px 0';
 for(const [label,callback] of [
  ['🧑‍🌾 직업 센터',career],['🛍️ 주민 거래소',market],['🏭 사업장',business]
 ]){
  if(typeof callback!=='function')continue;
  const b=make('button',label);
  b.type='button';b.style.cssText='padding:10px 9px;min-height:43px;border:0;border-radius:11px;background:#dcebd6;color:#385e47;font-weight:750';
  b.onclick=callback;controls.append(b);
 }
 const list=make('div');
 host.append(heading,blurb,status,controls,list);
 function render(rows){
  list.replaceChildren();
  for(const scope of ['once','daily']){
   const entries=(rows||[]).filter(q=>q.scope===scope);
   if(!entries.length)continue;
   const title=make('h4',scope==='once'?'🏅 신규 콘텐츠 성장 퀘스트':'📅 오늘의 서버 의뢰');
   title.style.cssText='color:#3c5c42;font-size:14px;margin:14px 0 8px';
   list.append(title);
   for(const q of entries){
    const card=make('section');
    card.style.cssText='padding:12px;background:#f7f8ef;border:1px solid #d9e6d2;border-radius:14px;margin:8px 0';
    const name=make('strong',q.icon+' '+q.title);
    const guide=make('p',q.hint);
    guide.style.cssText='margin:7px 0;color:#658166;font-size:12px';
    const progress=make('div',q.done+' / '+q.need+' · 보상 시험 '+q.gold.toLocaleString('ko-KR')+'G');
    progress.style.cssText='font-size:12px;color:#60785c;margin-bottom:8px';
    const bar=make('div');bar.style.cssText='height:6px;border-radius:8px;background:#e3ebdb;overflow:hidden';
    const fill=make('i');fill.style.cssText='display:block;height:100%;width:'+Math.min(100,Math.max(0,q.done/q.need*100))+'%;background:#83b488;border-radius:8px';
    bar.append(fill);
    const button=make('button',q.claimed?'✅ 보상 수령 완료':q.claimable?'🎁 보상 받기':'🔒 진행 중');
    button.type='button';button.disabled=busy||q.claimed||!q.claimable;
    button.style.cssText='width:100%;min-height:44px;margin-top:10px;border:0;border-radius:11px;font-weight:800;background:'+
      (q.claimable?'#518a66':'#e6ede1')+';color:'+(q.claimable?'#fff':'#7b8e7d');
    button.onclick=()=>claim(q);
    card.append(name,guide,progress,bar,button);list.append(card);
   }
  }
 }
 async function load(){
  if(!alive||!host.isConnected)return;
  try{
   const res=await fetch('/api/quests-v51',{credentials:'same-origin',cache:'no-store'});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'퀘스트 서버 연결 실패');
   if(!alive||!host.isConnected)return;
   status.textContent='✔ 서버 퀘스트 연결 · '+data.day+' · 신규 성장 의뢰 '+data.quests.filter(x=>x.scope==='once').length+'개 + 일일 의뢰 '+data.quests.filter(x=>x.scope==='daily').length+'개';
   render(data.quests);
  }catch(e){status.textContent='⚠️ '+e.message+' · 기존 생활 의뢰는 그대로 이용할 수 있어.'}
 }
 async function claim(q){
  if(busy||!q.claimable||q.claimed)return;
  const signature=q.scope+':'+q.id;
  if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
  busy=true;status.textContent='⏳ 보상을 서버에 저장 중이야…';
  try{
   const res=await fetch('/api/quests-v51',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({questId:q.id,requestId:pending.requestId})});
   const data=await res.json();
   if(!res.ok)throw Object.assign(Error(data.error||'보상 수령에 실패했어'),{status:res.status});
   pending=null;
   status.textContent='✅ '+q.title+' · 시험 골드 '+data.gold.toLocaleString('ko-KR')+'G 지급 완료'+(data.replayed?' · 중복 요청 방지':'');
   await load();
  }catch(e){
   if(e.status&&e.status<500)pending=null;
   status.textContent='⚠️ '+e.message;
  }finally{busy=false}
 }
 void load();
 return {refresh:load,destroy(){alive=false}};
}
