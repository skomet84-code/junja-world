import './account-admin-v26';
import './stability-recovery-v286';
import './mobile-fallback-v287';

const CURRENT_VERSION='2.9.6';
const VERSION_LABEL=`JUNJA WORLD v${CURRENT_VERSION}`;
let enhancementsLoading=false;
function gameStarted(){const ui=document.querySelector('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
async function loadEnhancements(){
  if(enhancementsLoading||!gameStarted())return;
  enhancementsLoading=true;
  try{await Promise.all([
    import('./living-world-v16'),import('./creature-art-v17'),import('./combat-motion-v18'),
    import('./world-atmosphere-v19'),import('./target-combat-v20'),import('./class-identity-v21'),
    import('./equipment-evolution-v22'),import('./village-hub-v23'),import('./economy-link-v24'),
    import('./commerce-admin-v25'),import('./world-pet-v251'),import('./mobile-shell-v272'),
    import('./quest-stability-v273'),import('./quest-action-external-v273'),
    import('./quest-ui-authority-v274'),import('./quest-touch-v275'),import('./bounty-board-v28')
  ]);}catch(error){enhancementsLoading=false;console.error('[WORLD ENHANCEMENTS]',error);}
}
function syncVersion(){
  document.documentElement.dataset.jwVersion=CURRENT_VERSION;
  document.querySelectorAll<HTMLElement>('.login-footer span').forEach(node=>{
    if(node.textContent?.includes('JUNJA WORLD')&&node.textContent!==VERSION_LABEL)node.textContent=VERSION_LABEL;
  });
  const badge=document.querySelector<HTMLElement>('.jw-v09-badge b');
  if(badge&&badge.textContent!==VERSION_LABEL)badge.textContent=VERSION_LABEL;
}
function boot(){
  syncVersion();
  const footer=document.querySelector('.login-footer');
  if(footer)new MutationObserver(syncVersion).observe(footer,{subtree:true,childList:true,characterData:true});
  const gameUi=document.querySelector('#game-ui');
  if(gameUi)new MutationObserver(loadEnhancements).observe(gameUi,{attributes:true,attributeFilter:['class']});
  loadEnhancements();
  window.setInterval(syncVersion,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
