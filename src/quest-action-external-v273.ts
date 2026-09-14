const MOBILE='(max-width: 760px), (pointer: coarse)';
let raf=0;

function positionQuestAction(){
  const btn=document.querySelector<HTMLButtonElement>('#jw-quest-action');
  const panel=document.querySelector<HTMLElement>('#quest-panel');
  const game=document.querySelector<HTMLElement>('#game-ui');
  if(!btn||!panel||!game)return;
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
function requestPosition(){cancelAnimationFrame(raf);raf=requestAnimationFrame(positionQuestAction);}
function boot(){
  requestPosition();
  const panel=document.querySelector('#quest-panel');
  const game=document.querySelector('#game-ui');
  if(panel)new ResizeObserver(requestPosition).observe(panel);
  if(game)new MutationObserver(requestPosition).observe(game,{attributes:true,attributeFilter:['class']});
  new MutationObserver(requestPosition).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',requestPosition,{passive:true});
  window.addEventListener('orientationchange',requestPosition);
  window.setInterval(requestPosition,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
