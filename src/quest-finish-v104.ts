import './v104.css';

function saveData():any{try{return JSON.parse(localStorage.getItem('junja-world-v01')||'null');}catch{return null;}}
function toast(msg:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2200);}

function syncQuestComplete(){
  const save=saveData();const panel=document.querySelector<HTMLElement>('#quest-panel');
  const title=document.querySelector<HTMLElement>('#quest-title');const text=document.querySelector<HTMLElement>('#quest-text');const bar=document.querySelector<HTMLElement>('#quest-bar');
  if(!panel||!title||!text||!bar||!save)return;
  const complete=Number(save.quest||0)>=5;
  panel.classList.toggle('jw-main-complete',complete);
  if(complete){title.textContent='1장 · 백운성의 수호자';text.textContent='메인 임무 완료 · 정예 요괴, 제작, 월드보스와 상위 성장을 진행하세요.';bar.style.width='100%';}
}

function bindCompleteClick(){
  const panel=document.querySelector<HTMLElement>('#quest-panel');if(!panel||panel.dataset.jwCompleteBound==='1')return;panel.dataset.jwCompleteBound='1';
  panel.addEventListener('click',e=>{const save=saveData();if(Number(save?.quest||0)>=5){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toast('메인 임무 1장 완료 · 이제 성장 목표와 정예/보스 콘텐츠를 진행하세요.');}},true);
}

function boot(){bindCompleteClick();syncQuestComplete();window.setInterval(()=>{bindCompleteClick();syncQuestComplete();},500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
