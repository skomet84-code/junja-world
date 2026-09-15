import Phaser from 'phaser';
import './mobile-compositor-v302.css';

const IOS=/iP(?:hone|ad|od)/i.test(navigator.userAgent);
const INAPP=/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
const MOBILE=IOS||matchMedia('(pointer:coarse)').matches||innerWidth<=760;
let rendererMode:'webgl'|'canvas'=INAPP?'canvas':'webgl';
let retryCount=0;
let verifyTimer=0;

function gameUiVisible(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function accountGateOpen(){const gate=document.querySelector<HTMLElement>('.jw26-account-gate');return !!gate&&!gate.classList.contains('hidden');}
function currentGame():any{const games=((Phaser as any).GAMES||[]) as any[];return games.length?games[games.length-1]:null;}
function worldScene(game=currentGame()):any{if(!game)return null;return game?.scene?.keys?.world||(()=>{try{return game.scene?.getScene?.('world');}catch{return null;}})();}

function enableSafeCompositor(){
  if(!MOBILE)return;
  document.body?.classList.add('jw302-mobile-safe');
}

function repairWorldSurface(){
  if(!MOBILE)return;
  enableSafeCompositor();
  const game=currentGame(),scene=worldScene(game);
  const canvas=game?.canvas as HTMLCanvasElement|undefined;
  const w=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
  const h=Math.max(1,window.innerHeight||document.documentElement.clientHeight||1);

  if(canvas){
    canvas.style.setProperty('display','block','important');
    canvas.style.setProperty('visibility','visible','important');
    canvas.style.setProperty('opacity','1','important');
    canvas.style.setProperty('filter','none','important');
    canvas.style.setProperty('mix-blend-mode','normal','important');
    canvas.style.setProperty('transform','none','important');
    canvas.style.setProperty('-webkit-transform','none','important');
    canvas.style.setProperty('width','100%','important');
    canvas.style.setProperty('height','100%','important');
    canvas.style.setProperty('z-index','2','important');
  }

  try{game?.scale?.resize?.(w,h);}catch{}
  if(!scene)return;

  const player=scene?.player,map=scene?.map,camera=scene?.cameras?.main;
  try{map?.setVisible?.(true)?.setAlpha?.(1);}catch{}
  try{player?.setVisible?.(true)?.setAlpha?.(1)?.setActive?.(true);}catch{}
  try{scene?.nameText?.setVisible?.(true)?.setAlpha?.(1);}catch{}
  try{
    camera?.resetFX?.();
    if(Number.isFinite(Number(player?.x))&&Number.isFinite(Number(player?.y))){
      camera?.startFollow?.(player,true,.1,.1);
      camera?.centerOn?.(Number(player.x),Number(player.y));
    }
  }catch{}

  requestAnimationFrame(()=>{
    try{game?.scale?.resize?.(Math.max(1,innerWidth),Math.max(1,innerHeight));}catch{}
    window.dispatchEvent(new Event('resize'));
  });
}

function worldReady(){
  const game=currentGame(),scene=worldScene(game);
  const canvas=game?.canvas as HTMLCanvasElement|undefined;
  const player=scene?.player,map=scene?.map;
  if(!game||!canvas||!canvas.isConnected||canvas.width<=0||canvas.height<=0||!scene?.sys?.isActive?.()||!player||!map)return false;
  const style=getComputedStyle(canvas);
  return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&player.visible!==false&&map.visible!==false;
}
function kickResize(){repairWorldSurface();requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));window.setTimeout(()=>{repairWorldSurface();window.dispatchEvent(new Event('resize'));},180);}
function notice(text:string){
  let el=document.querySelector<HTMLElement>('.jw301-render-note');
  if(!el){el=document.createElement('aside');el.className='jw301-render-note';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',zIndex:'2147483601',maxWidth:'calc(100vw - 24px)',padding:'10px 13px',border:'1px solid rgba(240,199,103,.48)',borderRadius:'11px',background:'rgba(8,17,24,.96)',color:'#f7e6b2',font:'800 11px Noto Sans KR, sans-serif',boxShadow:'0 10px 28px rgba(0,0,0,.45)',textAlign:'center'} as Partial<CSSStyleDeclaration>);(document.querySelector('#app')||document.body).appendChild(el);}el.textContent=text;
}
function verifyWorld(){
  window.clearTimeout(verifyTimer);
  if(!MOBILE||!gameUiVisible()||accountGateOpen())return;
  repairWorldSurface();
  if(worldReady()){document.querySelector('.jw301-render-note')?.remove();kickResize();return;}
  if(retryCount<1){
    retryCount++;
    rendererMode=rendererMode==='webgl'?'canvas':'webgl';
    notice(`월드 화면 복구 중 · ${rendererMode.toUpperCase()} 재시도`);
    const enter=document.querySelector<HTMLButtonElement>('#enter-game');
    if(enter){window.setTimeout(()=>{try{enter.click();}catch{}scheduleVerify(4500);},120);return;}
  }
  notice('월드 화면을 다시 구성 중이야. 새로고침 없이 잠시 기다려줘.');
  [300,900,1800].forEach(ms=>window.setTimeout(repairWorldSurface,ms));
}
function scheduleVerify(delay=1800){window.clearTimeout(verifyTimer);verifyTimer=window.setTimeout(verifyWorld,delay);}

function installRendererGuard(){
  if(!MOBILE)return;
  const P=Phaser as any;
  const OriginalGame=P.Game;
  if(!OriginalGame||OriginalGame.__jw301Guarded)return;
  class GuardedGame extends OriginalGame{
    constructor(config:any){
      const isWorld=config?.parent==='game-container';
      const next=isWorld?{...config,type:rendererMode==='canvas'?P.CANVAS:P.WEBGL}:config;
      super(next);
      if(isWorld)(this as any).__jw301Renderer=rendererMode;
    }
  }
  (GuardedGame as any).__jw301Guarded=true;
  try{P.Game=GuardedGame;}catch(error){console.warn('[JW301] renderer guard install failed',error);}
}

function boot(){
  enableSafeCompositor();
  installRendererGuard();
  const ui=document.querySelector<HTMLElement>('#game-ui');
  if(ui)new MutationObserver(()=>{if(gameUiVisible()){retryCount=0;repairWorldSurface();scheduleVerify(900);}}).observe(ui,{attributes:true,attributeFilter:['class']});
  const host=document.querySelector<HTMLElement>('#game-container');
  if(host)new MutationObserver(()=>repairWorldSurface()).observe(host,{childList:true});
  window.addEventListener('pageshow',()=>{if(gameUiVisible()){repairWorldSurface();scheduleVerify(700);}});
  window.addEventListener('focus',()=>{if(gameUiVisible()){repairWorldSurface();scheduleVerify(700);}});
  window.addEventListener('resize',()=>{if(gameUiVisible())repairWorldSurface();});
  [120,450,900,1800,3200].forEach(ms=>window.setTimeout(()=>{if(gameUiVisible())repairWorldSurface();},ms));
  if(gameUiVisible())scheduleVerify(700);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
