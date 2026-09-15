import {JUNJA_WORLD_VERSION,loadCoreModule} from './core-v30';

const CURRENT_VERSION=JUNJA_WORLD_VERSION;
const VERSION_LABEL=`JUNJA WORLD v${CURRENT_VERSION}`;
let bootstrapPromise:Promise<any>|null=null;
let enhancementsPromise:Promise<any>|null=null;

const BOOT_MODULES:Array<[string,()=>Promise<unknown>]>=[
  ['account-admin',()=>import('./account-admin-v26')],
  ['stability-recovery',()=>import('./stability-recovery-v286')],
  ['mobile-fallback',()=>import('./mobile-fallback-v287')]
];

const GAME_MODULES:Array<[string,()=>Promise<unknown>]>=[
  ['auto-hunt',()=>import('./auto-hunt-v081')],['workshop',()=>import('./workshop-v07')],['world-polish',()=>import('./world-polish-v08')],
  ['world-density',()=>import('./world-density-v09')],['combat-polish',()=>import('./combat-polish-v091')],['rpg-systems',()=>import('./rpg-systems-v10')],
  ['world-life',()=>import('./world-life-v101')],['loot-feed',()=>import('./loot-feed-v102')],['quest-finish',()=>import('./quest-finish-v104')],
  ['workshop-polish',()=>import('./workshop-polish-v103')],['inventory',()=>import('./inventory-v11')],['adventure',()=>import('./adventure-v12')],
  ['auto-safety',()=>import('./auto-safety-v121')],['progression',()=>import('./progression-v13')],['ui-hotfix',()=>import('./ui-hotfix-v131')],
  ['endgame',()=>import('./endgame-v14')],['guidebook',()=>import('./guidebook-v15')],['character-polish',()=>import('./character-polish-v151')],
  ['living-world',()=>import('./living-world-v16')],['creature-art',()=>import('./creature-art-v17')],['combat-motion',()=>import('./combat-motion-v18')],
  ['world-atmosphere',()=>import('./world-atmosphere-v19')],['target-combat',()=>import('./target-combat-v20')],['class-identity',()=>import('./class-identity-v21')],
  ['equipment-evolution',()=>import('./equipment-evolution-v22')],['village-hub',()=>import('./village-hub-v23')],['economy-link',()=>import('./economy-link-v24')],
  ['commerce-admin',()=>import('./commerce-admin-v25')],['world-pet',()=>import('./world-pet-v251')],['mobile-shell',()=>import('./mobile-shell-v272')],
  ['quest-stability',()=>import('./quest-stability-v273')],['quest-action',()=>import('./quest-action-external-v273')],
  ['quest-ui-authority',()=>import('./quest-ui-authority-v274')],['quest-touch',()=>import('./quest-touch-v275')],['bounty-board',()=>import('./bounty-board-v28')]
];

function gameStarted(){const ui=document.querySelector('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function isMobile(){return matchMedia('(max-width: 900px),(pointer: coarse)').matches;}
function pause(ms=0){return new Promise<void>(resolve=>window.setTimeout(resolve,ms));}
function nextPaint(){return new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}

async function waitForWorldCanvas(timeoutMs=8000){
  const started=performance.now();
  while(performance.now()-started<timeoutMs){
    if(!gameStarted())return false;
    const canvas=document.querySelector<HTMLCanvasElement>('#game-container canvas');
    if(canvas&&canvas.width>100&&canvas.height>100){
      await nextPaint();
      return true;
    }
    await pause(50);
  }
  return false;
}

function loadBootstrap(){
  if(bootstrapPromise)return bootstrapPromise;
  bootstrapPromise=(async()=>{
    let ready=0,failed=0;
    // These modules have DOM/order dependencies on mobile. Keep the order stable:
    // account gate first, then its recovery observers, then optional fallback.
    for(const [id,loader] of BOOT_MODULES){
      if(await loadCoreModule(id,loader))ready++;else failed++;
    }
    const result={ready,failed,total:BOOT_MODULES.length};
    if(failed){console.warn(`[JW CORE] bootstrap degraded: ${failed}/${result.total}`);window.setTimeout(()=>{bootstrapPromise=null;loadBootstrap();},3000);}
    return result;
  })();
  return bootstrapPromise;
}

async function loadGameplayStaged(){
  // The base Phaser world must get the first frames before optional feature modules run.
  // Loading every feature in Promise.all froze mobile WebKit/Chromium during character entry.
  const canvasReady=await waitForWorldCanvas();
  if(!canvasReady){
    console.warn('[JW CORE] gameplay modules deferred: world canvas not ready');
    return {ready:0,failed:0,total:GAME_MODULES.length,deferred:true};
  }

  let ready=0,failed=0;
  const mobile=isMobile();
  for(let i=0;i<GAME_MODULES.length;i++){
    if(!gameStarted())break;
    const [id,loader]=GAME_MODULES[i];
    if(await loadCoreModule(id,loader))ready++;else failed++;
    // Yield rendering/input time between feature initializers. On phones this prevents
    // the long main-thread stall that hid the actual Phaser world after login.
    await nextPaint();
    if(mobile)await pause(i<8?32:16);
  }
  return {ready,failed,total:GAME_MODULES.length,deferred:false};
}

function loadEnhancements(){
  if(!gameStarted()||enhancementsPromise)return enhancementsPromise;
  enhancementsPromise=loadGameplayStaged().then(result=>{
    if((result as any).deferred){
      enhancementsPromise=null;
      if(gameStarted())window.setTimeout(loadEnhancements,500);
      return result;
    }
    if(result.failed){
      console.warn(`[JW CORE] gameplay degraded: ${result.failed}/${result.total}`);
      window.setTimeout(()=>{enhancementsPromise=null;if(gameStarted())loadEnhancements();},3000);
    }
    return result;
  });
  return enhancementsPromise;
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
  loadBootstrap();
  const footer=document.querySelector('.login-footer');
  if(footer)new MutationObserver(syncVersion).observe(footer,{subtree:true,childList:true,characterData:true});
  const gameUi=document.querySelector('#game-ui');
  if(gameUi)new MutationObserver(loadEnhancements).observe(gameUi,{attributes:true,attributeFilter:['class']});
  loadEnhancements();
  window.setInterval(syncVersion,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
