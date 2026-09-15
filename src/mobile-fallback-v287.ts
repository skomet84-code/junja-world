import './mobile-fallback-v287.css';

const FALLBACK_HOST=location.hostname.endsWith('.github.io');

function activateFallback(){
  if(!FALLBACK_HOST)return;
  try{sessionStorage.setItem('jw286-local-mode','1');}catch{}
  document.body.classList.add('jw286-local-mode','jw287-fallback');
  document.querySelector<HTMLElement>('.jw26-account-gate')?.classList.add('hidden');

  if(!document.querySelector('.jw287-fallback-note')){
    const note=document.createElement('aside');
    note.className='jw287-fallback-note';
    note.innerHTML='<strong>JUNJA WORLD 모바일 비상 접속</strong><span>Render 접속 장애를 우회한 로컬 플레이 모드입니다. 캐릭터는 이 기기에 저장됩니다.</span><button type="button">확인</button>';
    note.querySelector('button')!.addEventListener('click',()=>note.remove());
    document.body.appendChild(note);
  }
}

function boot(){
  if(!FALLBACK_HOST)return;
  activateFallback();
  const observer=new MutationObserver(()=>activateFallback());
  observer.observe(document.body,{childList:true,subtree:false});
  window.addEventListener('pageshow',activateFallback);
  [120,500,1500].forEach(ms=>window.setTimeout(activateFallback,ms));
  window.setTimeout(()=>observer.disconnect(),5000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
