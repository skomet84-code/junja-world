const MOBILE='(max-width: 760px), (pointer: coarse)';

function syncQuestActionPosition(){
  const btn=document.querySelector<HTMLButtonElement>('.jw273-quest-action');
  const panel=document.querySelector<HTMLElement>('#quest-panel');
  const game=document.querySelector<HTMLElement>('#game-ui');
  if(!btn||!panel||!game)return;
  if(btn.parentElement!==document.body)document.body.appendChild(btn);
  const isMobile=window.matchMedia(MOBILE).matches;
  const gameOn=!game.classList.contains('hidden');
  const visible=gameOn&&(!isMobile||document.body.classList.contains('jw272-open-mission'));
  if(!visible){btn.style.setProperty('display','none','important');return;}
  const r=panel.getBoundingClientRect();
  btn.style.setProperty('display','block','important');
  btn.style.position='fixed';
  btn.style.zIndex='10061';
  btn.style.left=`${Math.max(6,r.left)}px`;
  btn.style.top=`${Math.min(window.innerHeight-54,r.bottom+6)}px`;
  btn.style.width=`${Math.max(120,Math.min(r.width,window.innerWidth-12))}px`;
  btn.style.margin='0';
  btn.style.transform='none';
}
function boot(){syncQuestActionPosition();window.setInterval(syncQuestActionPosition,160);window.addEventListener('resize',syncQuestActionPosition,{passive:true});window.addEventListener('orientationchange',syncQuestActionPosition);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
