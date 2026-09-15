import './account-admin-v26';
import './stability-recovery-v286';
import './mobile-fallback-v287';

const CURRENT_VERSION='2.9.9';
const VERSION_LABEL=`JUNJA WORLD v${CURRENT_VERSION}`;
let enhancementsLoading=false;
function gameStarted(){const ui=document.querySelector('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
async function loadEnhancements(){
  if(enhancementsLoading||!gameStarted())return;
  enhancementsLoading=true;
  try{await Promise.all([
    import('./auto-hunt-v081'),import('./workshop-v07'),import('./world-polish-v08'),
    import('./world-density-v09'),import('./combat-polish-v091'),import('./rpg-systems-v10'),
    import('./world-life-v101'),import('./loot-feed-v102'),import('./quest-finish-v104'),
    import('./workshop-polish-v103'),import('./inventory-v11'),import('./adventure-v12'),
    import('./auto-safety-v121'),import('./progression-v13'),import('./ui-hotfix-v131'),
    import('./endgame-v14'),import('./guidebook-v15'),import('./character-polish-v151'),
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
