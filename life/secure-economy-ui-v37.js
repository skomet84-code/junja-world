// v37 tamper-evident server economy lab — browser UI only; never owns or mutates a balance.
// This is opt-in preview currency. It is NOT the existing village wallet or saved character gold.
const make=(tag,text,className)=>{
 const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);
 if(className)el.className=className;return el;
};
const format=n=>Number(n).toLocaleString('ko-KR')+'G';
const style=(el,css)=>{el.style.cssText=css;return el};
const txt=(parent,text,tag='p')=>{const el=make(tag,text);parent.append(el);return el};

export function openSecureEconomyLab(host,{back}={}){
 if(!host)throw Error('서버 경제 연구소 화면을 찾을 수 없어요');
 host.replaceChildren();
 host.append(make('h2','🔐 준자마을 서버 경제 연구소'));
 style(txt(host,'시험장 전용 골드와 창고를 사용합니다. 기존 캐릭터의 레벨, 골드, 농장에는 영향을 주지 않아요.'),'font-weight:700;color:#637a64');
 const notification=style(make('p','준자마을 계정 확인 중…'),'background:#f3f3e6;padding:12px;border-radius:12px');
 host.append(notification);
 const contents=make('div');host.append(contents);
 let snapshot=null,busy=false,retry=null;
 const link=(caption,handler)=>{
  const btn=make('button',caption);
  style(btn,'border:0;border-radius:12px;padding:11px 12px;margin:4px;background:#72a17b;color:white;font-weight:750;');
  btn.type='button';btn.disabled=busy;btn.onclick=handler;return btn;
 };
 if(typeof back==='function')host.append(link('← 개인 농장으로 돌아가기',back));
 async function request(){
  try{
   const r=await fetch('/api/economy-v37',{credentials:'same-origin',cache:'no-store'});
   const json=await r.json();
   if(!r.ok)throw Error(json.error||'서버 경제를 불러올 수 없어요');
   if(!host.isConnected)return;
   snapshot=json.economy;
   notification.textContent=json.audit?.ok?'✅ 서버 거래 장부 검증 완료 · 저장 버전 '+json.version:
    json.audit?.reason==='trial_account_not_created'?'🌱 신규 시험 계정 · 첫 거래 시 복구 기록이 생성됩니다':
    '⚠️ 복구 장부 확인 필요: '+(json.audit?.reason||'알 수 없는 상태');
   render();
  }catch(error){
   notification.textContent='⚠️ '+error.message;
   contents.replaceChildren();
   if(error.message.includes('테스트 승인')||error.message.includes('설치')){
    txt(contents,'현재는 개발 브랜치에서만 준비 중이며 운영 게임에서는 이용할 수 없어요.');
   }
  }
 }
 async function transact(action,payload){
  if(busy)return;
  const signature=JSON.stringify({action,payload});
  if(!retry||retry.signature!==signature)retry={signature,id:crypto.randomUUID()};
  busy=true;render();
  try{
   const r=await fetch('/api/economy-v37',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({action,payload,requestId:retry.id})});
   const json=await r.json();
   if(!r.ok)throw Object.assign(new Error(json.error||'요청 실패'),{serverStatus:r.status});
   retry=null;if(!host.isConnected)return;
   snapshot=json.economy;
   notification.textContent='✅ '+json.receipt.detail+(json.replayed?' (이미 처리된 요청 확인)':'')+' · 잔액 '+format(json.receipt.balance);
  }catch(error){
   if(error.serverStatus)retry=null; // Transport errors retry the *same* request ID.
   notification.textContent='⚠️ '+error.message+(error.serverStatus?'':' · 동일 거래 ID로 다시 시도할 수 있어요');
  }finally{busy=false;if(host.isConnected&&snapshot)render()}
 }
 function render(){
  contents.replaceChildren();
  if(!snapshot)return;
  const s=snapshot;
  txt(contents,'💰 시범 경제 잔액 '+format(s.coins)+' · 명성 '+s.reputation+'점','h3');
  const crops=s.catalog;
  const holder=make('div');
  holder.append(txt(document.createDocumentFragment(),'심을 작물: ','strong'));
  const select=make('select');
  style(select,'padding:10px;margin:7px 0;background:white;border:1px solid #becdb7;border-radius:10px;max-width:100%');
  for(const [id,o] of Object.entries(crops)){
   const option=make('option',o.label+' · 씨앗 '+format(o.cost)+' · '+Math.round(o.growSeconds/60)+'분');option.value=id;select.append(option);
  }
  holder.append(select);
  contents.append(holder);
  txt(contents,'🌱 농장 '+s.plots.length+'칸 · 심기와 수확은 서버 시각으로 검증돼요.','h3');
  const plotGrid=style(make('div'),'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;');
  s.plots.forEach((p,i)=>{
   const crop=crops[p?.crop],rem=crop?Math.max(0,Math.ceil((p.at+crop.growSeconds*1000-Date.now())/1000)):0;
   const b=link(crop?(crop.label+' '+(rem?Math.ceil(rem/60)+'분 남음':'수확하기')):'🌿 '+(i+1)+'번 빈 밭',
     ()=>transact(crop?'harvest':'plant',crop?{index:i}:{index:i,crop:select.value}));
   style(b,'min-height:66px;border:1px solid #c3d4b2;border-radius:12px;background:'+(crop?'#e0edca':'#eae3cc')+';color:#314e3c;padding:7px;font-weight:700;font-size:12px');
   if(busy)b.disabled=true;
   plotGrid.append(b);
  });
  contents.append(plotGrid);
  if(s.upgrade)contents.append(link('🏡 농장 확장 '+s.upgrade.size+'칸 · '+format(s.upgrade.cost),()=>transact('expand',{})));
  txt(contents,'🧺 서버 창고와 판매','h3');
  const validStock=Object.entries(s.stock).filter(([,count])=>count>0);
  if(!validStock.length)txt(contents,'창고가 비어 있어요. 작물을 수확해 봐요.');
  validStock.forEach(([id,count])=>{
   const item=crops[id]||s.recipes[id];if(!item)return;
   const line=style(make('div'),'padding:8px;background:#f1f3e8;border-radius:10px;margin:5px 0');
   txt(line,item.label+' × '+count+' · 판매가 '+format(item.sell),'span');
   line.append(link('1개 판매',()=>transact('sell',{item:id})));contents.append(line);
  });
  txt(contents,'🍳 가공 공방','h3');
  Object.entries(s.recipes).forEach(([id,recipe])=>{
   const box=style(make('div'),'padding:8px;background:#f1f3e8;border-radius:10px;margin:5px 0');
   txt(box,recipe.label+' · 재료 '+Object.entries(recipe.needs).map(([x,n])=>crops[x]?.label+' '+(s.stock[x]||0)+'/'+n).join(' · ')+' · 가공비 '+format(recipe.cost));
   box.append(link('제작하기',()=>transact('craft',{recipe:id})));contents.append(box);
  });
  txt(contents,'📦 오늘의 주민 주문 (최대 2건)','h3');
  s.orders.forEach(order=>{
   const box=style(make('div'),'padding:8px;background:#f1f3e8;border-radius:10px;margin:5px 0');
   txt(box,order.label+' · 보상 '+format(order.reward)+' · 명성 +'+order.reputation,'strong');
   txt(box,Object.entries(order.needs).map(([id,n])=>(crops[id]?.label||s.recipes[id]?.label||id)+' '+(s.stock[id]||0)+'/'+n).join(' · '),'p');
   const b=link(order.completed?'✅ 오늘 납품 완료':order.ready?'납품하기':'재료 준비 중',()=>transact('order',{order:order.id}));
   b.disabled=busy||order.completed||!order.ready;box.append(b);contents.append(box);
  });
  contents.append(link('↻ 서버 기록 새로고침',request));
 }
 request();
 return {refresh:request};
}
