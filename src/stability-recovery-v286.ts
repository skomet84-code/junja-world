import './stability-recovery-v286.css';

const LOCAL_MODE_KEY='jw286-local-mode';
const INAPP=/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i;
let accountBusy=false;

function localMode(){return sessionStorage.getItem(LOCAL_MODE_KEY)==='1';}
function gate(){return document.querySelector<HTMLElement>('.jw26-account-gate');}
function gateOpen(){const g=gate();return !!g&&!g.classList.contains('hidden')&&!localMode();}
function entry(){return document.querySelector<HTMLElement>('#auth-layer');}
function entryOpen(){const a=entry();return !!a&&!a.classList.contains('hidden')&&!gateOpen();}
function status(text:string){const el=document.querySelector<HTMLElement>('#jw26-auth-status');if(el)el.textContent=text;}
async function json(url:string,options:RequestInit={},timeout=9000){
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||`서버 오류 (${response.status})`);
    return data;
  }finally{window.clearTimeout(timer);}
}

function ensureLocalButton(show=false){
  const box=document.querySelector<HTMLElement>('.jw26-account-box');
  if(!box)return null;
  let button=document.querySelector<HTMLButtonElement>('#jw286-local-enter');
  if(!button){
    button=document.createElement('button');
    button.id='jw286-local-enter';button.type='button';button.className='jw286-local-enter';
    button.textContent='서버 없이 로컬 모드로 입장';
    button.onclick=()=>{
      sessionStorage.setItem(LOCAL_MODE_KEY,'1');
      document.body.classList.add('jw286-local-mode');
      status('로컬 모드 · 이 기기에만 저장됩니다.');
      repair();
    };
    box.appendChild(button);
  }
  button.classList.toggle('show',show);
  return button;
}

function repairAccountGate(){
  const g=gate();
  document.body.classList.toggle('jw286-local-mode',localMode());
  if(!g||!gateOpen())return;
  g.removeAttribute('inert');
  ['#jw26-id','#jw26-password'].forEach(selector=>{
    const input=document.querySelector<HTMLInputElement>(selector);if(!input)return;
    input.disabled=false;input.readOnly=false;input.removeAttribute('disabled');input.removeAttribute('readonly');input.tabIndex=0;
  });
  const form=document.querySelector<HTMLFormElement>('#jw26-auth-form');
  if(form&&form.dataset.jw286Submit!=='1'){
    form.dataset.jw286Submit='1';
    form.onsubmit=async e=>{
      e.preventDefault();e.stopPropagation();
      if(accountBusy)return;
      const id=document.querySelector<HTMLInputElement>('#jw26-id');
      const pw=document.querySelector<HTMLInputElement>('#jw26-password');
      const submit=document.querySelector<HTMLButtonElement>('#jw26-auth-submit');
      if(!id||!pw||!submit)return;
      const register=document.querySelector<HTMLElement>('[data-jw26-tab="register"]')?.classList.contains('active');
      const mode=register?'register':'login';
      accountBusy=true;submit.disabled=true;ensureLocalButton(false);
      status(mode==='login'?'로그인 중…':'계정 생성 중…');
      try{
        await json(`/api/world/${mode}`,{method:'POST',body:JSON.stringify({username:id.value.trim(),password:pw.value})},9000);
        sessionStorage.removeItem(LOCAL_MODE_KEY);
        status(mode==='login'?'로그인 완료 · 캐릭터 불러오는 중…':'계정 생성 완료 · 캐릭터 불러오는 중…');
        window.setTimeout(()=>location.reload(),120);
      }catch(error:any){
        const timeout=error?.name==='AbortError';
        status(timeout?'서버 응답이 지연되고 있어. 로컬 모드로 먼저 플레이할 수 있어.':(error?.message||'로그인에 실패했습니다.'));
        ensureLocalButton(true);
        pw.value='';
      }finally{accountBusy=false;submit.disabled=false;}
    };
  }
}

function repairCharacterEntry(){
  const a=entry();const open=entryOpen();
  document.body.classList.toggle('jw286-entry-open',open);
  if(!a||!open)return;
  a.removeAttribute('inert');
  const name=document.querySelector<HTMLInputElement>('#hero-name');
  if(name){
    name.disabled=false;name.readOnly=false;name.removeAttribute('disabled');name.removeAttribute('readonly');name.tabIndex=0;
  }
  document.querySelectorAll<HTMLButtonElement>('#auth-layer .class-card,#auth-layer #enter-game').forEach(button=>{
    button.disabled=false;button.removeAttribute('disabled');button.tabIndex=0;
  });
}

function ensureInAppNotice(){
  if(!INAPP.test(navigator.userAgent)||document.querySelector('.jw286-inapp-notice'))return;
  const notice=document.createElement('aside');notice.className='jw286-inapp-notice';
  notice.innerHTML='<strong>앱 내부 브라우저로 열렸어</strong><span>카카오톡 등에서는 입력·터치가 불안정할 수 있어. 우측 상단 ⋯ → Safari에서 열기를 권장해.</span><div><button type="button" data-copy>주소 복사</button><button type="button" data-close>닫기</button></div>';
  document.body.appendChild(notice);
  notice.querySelector<HTMLButtonElement>('[data-copy]')!.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);notice.querySelector<HTMLButtonElement>('[data-copy]')!.textContent='복사됨';}catch{notice.querySelector<HTMLButtonElement>('[data-copy]')!.textContent='주소창에서 복사';}};
  notice.querySelector<HTMLButtonElement>('[data-close]')!.onclick=()=>notice.remove();
}

function repair(){repairAccountGate();repairCharacterEntry();}
function boot(){
  ensureInAppNotice();repair();
  const g=gate(),a=entry();
  // Observing inline style while repair writes inline style creates an endless
  // microtask loop in WebKit. Class changes are the only state signal needed.
  if(g)new MutationObserver(repair).observe(g,{attributes:true,attributeFilter:['class']});
  if(a)new MutationObserver(repair).observe(a,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',repair);window.addEventListener('focus',repair);
  [120,450,1200].forEach(ms=>window.setTimeout(repair,ms));
  window.setTimeout(()=>{if(gateOpen()&&!accountBusy)ensureLocalButton(true);},6500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
