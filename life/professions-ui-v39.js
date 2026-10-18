// v39 optional career panel; does not alter browser character XP, coins or inventory.
// Every license charge and daily reward is performed by the authenticated server.
const elem=(type,value)=>{const x=document.createElement(type);if(value!==undefined)x.textContent=String(value);return x};
const make=(parent,type,value)=>{const el=elem(type,value);parent.append(el);return el};
const buttonStyle='padding:10px 12px;border:0;border-radius:11px;background:#628b72;color:white;margin:4px;font-weight:750';
const coin=value=>Number(value).toLocaleString('ko-KR')+'G';
const labelMap={farmer:'🌿 농부',chef:'🥧 요리사',merchant:'🏪 상인'};
const levels=['','수습','숙련','전문가','명장','전설'];

export function openProfessionCenter(host,{back}={}){
 if(!host)throw Error('직업 센터 화면이 준비되지 않았습니다');
 host.replaceChildren();
 make(host,'h2','🏅 준자마을 직업 · 사업 성장 센터');
 make(host,'p','현재는 시험용 경제 서버에서만 작동해요. 실제 플레이어의 레벨·재산에는 영향을 주지 않습니다.');
 const note=make(host,'p','직업 기록 확인 중…');
 note.style.cssText='padding:12px;background:#f0f0dd;border-radius:12px';
 const main=make(host,'section');
 let response=null,busy=false,pending=null;
 const btn=(title,callback,disabled=false)=>{
  const el=elem('button',title);el.type='button';el.style.cssText=buttonStyle;
  el.disabled=disabled||busy;el.onclick=callback;return el;
 };
 if(typeof back==='function')host.append(btn('← 개인 농장으로 돌아가기',back));
 async function refresh(){
  try{
   const res=await fetch('/api/professions-v39',{credentials:'same-origin',cache:'no-store'});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||'서버 직업 정보를 가져올 수 없어요');
   if(!host.isConnected)return;
   response=data;note.textContent='✅ 서버 직업 기록 확인 완료 · 시험 골드 '+coin(data.coins);render();
  }catch(error){note.textContent='⚠️ '+error.message;main.replaceChildren()}
 }
 async function run(action,role){
  if(busy)return;
  const signature=JSON.stringify({action,role});
  if(!pending||pending.signature!==signature)pending={signature,requestId:crypto.randomUUID()};
  busy=true;render();
  try{
   const res=await fetch('/api/professions-v39',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action,role,requestId:pending.requestId})});
   const data=await res.json();
   if(!res.ok)throw Object.assign(new Error(data.error||'서버 처리에 실패했어요'),{status:res.status});
   pending=null;response={...response,...data};
   note.textContent='✅ '+data.receipt.detail+' · '+(data.receipt.delta>=0?'+':'')+coin(data.receipt.delta)+
    (data.replayed?' · 중복 요청은 1회만 정산':'');
  }catch(error){
   if(error.status&&error.status<500&&![408,429].includes(error.status))pending=null;
   note.textContent='⚠️ '+error.message+(!error.status||error.status>=500?' · 재시도 시 같은 요청 번호로 확인':'');
  }finally{busy=false;if(host.isConnected)render()}
 }
 function render(){
  main.replaceChildren();const data=response?.profession;if(!data)return;
  const register=make(main,'section');
  register.style.cssText='padding:12px;background:#eaf1e6;border-radius:16px;margin:12px 0';
  make(register,'h3',data.active?'현재 직업 · '+labelMap[data.active]+' / '+(data.rank?.title||'수습'):'아직 직업을 정하지 않았어요');
  if(data.active){
   make(register,'p','직업 경력 '+(data.rank?.xp||0)+' XP · 다음 변경 가능일 '+new Date(data.nextSwitchAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}));
   make(register,'p','직업을 변경해도 기존 직업별 누적 경력은 남아 있어요.');
  }else make(register,'p','첫 면허 비용 '+coin(data.firstLicense)+' · 농부/요리사/상인 중 자유롭게 선택');
  for(const [id,job] of Object.entries(data.roles)){
   const card=make(main,'div');
   card.style.cssText='padding:12px;margin:9px 0;background:#f4f4ec;border-radius:14px';
   make(card,'strong',job.name);
   make(card,'p',job.focus+' · 일일 보상 '+coin(job.reward));
   make(card,'small','현재 직업 경력 '+(data.career?.[id]||0)+' XP · '+(data.ranks?.[id]?.title||'수습'));
   if(id===data.active)make(card,'p','✅ 현재 직업');
   else{
    const cost=data.active?data.switchFee:data.firstLicense;
    card.append(btn('면허 등록 / 직업 변경 · '+coin(cost),()=>run('register',id),
     data.active&&!data.canSwitch));
   }
  }
  if(data.active){
   const panel=make(main,'section');
   panel.style.cssText='padding:13px;background:#edf2e6;border-radius:14px;margin:14px 0';
   make(panel,'h3','📜 '+data.day+' 오늘의 직업 계약');
   const req=data.roles[data.active];
   const pieces=[];
   if(req.daily)for(const [action,count] of Object.entries(req.daily))pieces.push(action+' '+(data.progress?.[action]||0)+'/'+count+'회');
   if(req.dailyEither)for(const option of req.dailyEither)pieces.push(Object.entries(option).map(([action,count])=>action+' '+(data.progress?.[action]||0)+'/'+count+'회').join(', '));
   make(panel,'p',pieces.join(' 또는 '));
   make(panel,'p','보상 '+coin(data.reward)+' · 실제 서버에서 기록된 활동만 인정합니다');
   panel.append(btn(data.completed?'✅ 오늘 보상 수령 완료':data.ready?'🎁 계약 보상 받기':'진행 중 · 목표 미달',
     ()=>run('claim',null),data.completed||!data.ready));
  }
  main.append(btn('↻ 서버 직업 기록 새로고침',refresh));
 }
 refresh();return {refresh};
}
