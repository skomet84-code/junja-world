import Phaser from 'phaser';

const IOS=/iP(?:hone|ad|od)/i.test(navigator.userAgent);
const INAPP=/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent);
let rendererMode:'webgl'|'canvas'=INAPP?'canvas':'webgl';
let retryCount=0;
let verifyTimer=0;

function gameUiVisible(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function accountGateOpen(){const gate=document.querySelector<HTMLElement>('.jw26-account-gate');return !!gate&&!gate.classList.contains('hidden');}
function currentGame():any{const games=((Phaser as any).GAMES||[]) as any[];return games.length?games[games.length-1]:null;}
function worldScene(game=currentGame()):any{if(!game)return null;return game?.scene?.keys?.world||(()=>{try{return game.scene?.getScene?.('world');}catch{return null;}})();}
function worldReady(){
  const game=currentGame(),scene=worldScene(game);
  const canvas=game?.canvas as HTMLCanvasElement|undefined;
  const player=scene?.player;
  const map=scene?.map;
  return !!(game&&canvas&&canvas.width>0&&canvas.height>0&&scene?.sys?.isActive?.()&&player&&map);
}
function kickResize(){requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));window.setTimeout(()=>window.dispatchEvent(new Event('resize')),180);}
function notice(text:string){
  let el=document.querySelector<HTMLElement>('.jw301-render-note');
  if(!el){el=document.createElement('aside');el.className='jw301-render-note';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',zIndex:'2147483601',maxWidth:'calc(100vw - 24px)',padding:'10px 13px',border:'1px solid rgba(240,199,103,.48)',borderRadius:'11px',background:'rgba(8,17,24,.96)',color:'#f7e6b2',font:'800 11px Noto Sans KR, sans-serif',boxShadow:'0 10px 28px rgba(0,0,0,.45)',textAlign:'center'} as Partial<CSSStyleDeclaration>);(document.querySelector('#app')||document.body).appendChild(el);}el.textContent=text;
}
function verifyWorld(){
  window.clearTimeout(verifyTimer);
  if(!IOS||!gameUiVisible()||accountGateOpen())return;
  if(worldReady()){document.querySelector('.jw301-render-note')?.remove();kickResize();return;}
  if(retryCount<1){
    retryCount++;
    rendererMode=rendererMode==='webgl'?'canvas':'webgl';
    notice(`월드 화면 복구 중 · ${rendererMode.toUpperCase()} 재시도`);
    const enter=document.querySelector<HTMLButtonElement>('#enter-game');
    if(enter){window.setTimeout(()=>{try{enter.click();}catch{}scheduleVerify(7000);},120);return;}
  }
  notice('월드 화면 복구가 지연되고 있어. 새로고침 후 다시 입장해줘.');
}
function scheduleVerify(delay=6500){window.clearTimeout(verifyTimer);verifyTimer=window.setTimeout(verifyWorld,delay);}

function installRendererGuard(){
  if(!IOS)return;
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
  installRendererGuard();
  const ui=document.querySelector<HTMLElement>('#game-ui');
  if(ui)new MutationObserver(()=>{if(gameUiVisible()){retryCount=0;scheduleVerify();}}).observe(ui,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',()=>{if(gameUiVisible())scheduleVerify(2500);});
  window.addEventListener('focus',()=>{if(gameUiVisible())scheduleVerify(2500);});
  if(gameUiVisible())scheduleVerify();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
