import './mobile-force-v271.css';

const MOBILE='(max-width: 760px), (pointer: coarse)';
function isMobile(){return window.matchMedia(MOBILE).matches;}
function gameOn(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function sync(){
  const mobile=isMobile();
  document.body.classList.toggle('jw271-mobile',mobile);
  document.body.classList.toggle('jw271-game-on',mobile&&gameOn());
}
function boot(){
  sync();
  const ui=document.querySelector('#game-ui');
  if(ui)new MutationObserver(sync).observe(ui,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',sync);
  window.setInterval(sync,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
