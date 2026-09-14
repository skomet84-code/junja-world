import Phaser from 'phaser';

const trackedGames=new Set<any>();
let previousZone='village';
let smartTravelLockUntil=0;
let retreatLockUntil=0;

function installTracking(){const proto=(Phaser.Game as any)?.prototype;if(!proto||proto.__jwV121Tracked)return;const boot=proto.boot,destroy=proto.destroy;if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};proto.__jwV121Tracked=true;}
installTracking();
function scene():any|null{const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];for(const game of games){const s=game?.scene?.keys?.world;if(s?.sys?.isActive?.())return s;try{const x=game?.scene?.getScene?.('world');if(x?.sys?.isActive?.())return x;}catch{}}return null;}
function saveData():any{try{return JSON.parse(localStorage.getItem('junja-world-v01')||'null');}catch{return null;}}
function autoButton(){return document.querySelector<HTMLButtonElement>('#jw-auto-hunt');}
function autoOn(){return !!autoButton()?.classList.contains('on');}
function toast(msg:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2300);}
function preferredZone(level:number){if(level>=10)return'forest';if(level>=5)return'mine';return'field';}
function hpRatio(save:any){const hp=Number(save?.hp||0);const text=document.querySelector<HTMLElement>('#hp-text')?.textContent||'';const max=Number(text.split('/')[1]?.trim()||0);return max>0?hp/max:1;}
function smartZoneTick(s:any){const zone=String(s.zone||'village');if(autoOn()&&previousZone==='village'&&zone==='field'&&performance.now()>smartTravelLockUntil){const save=s.save||saveData();const target=preferredZone(Number(save?.level||1));if(target!=='field'){smartTravelLockUntil=performance.now()+4000;window.setTimeout(()=>{if(autoOn()&&String(s.zone)==='field'){s.travel?.(target);toast(`자동사냥 · ${target==='mine'?'흑철광산':'월영숲'}으로 이동`);}},350);}}previousZone=zone;}
function safetyTick(s:any){if(!autoOn()||performance.now()<retreatLockUntil)return;const save=s.save||saveData();if(!save)return;if(Number(save.potions||0)<=0&&hpRatio(save)<=.2&&String(s.zone)!=='village'){retreatLockUntil=performance.now()+7000;autoButton()?.click();s.travel?.('village');toast('체력 위험 · 회복약 없음 · 자동사냥 중지 후 백운성 귀환');}}
function bindManualPriority(){const canvas=document.querySelector<HTMLCanvasElement>('#game-container canvas');if(!canvas||canvas.dataset.jwManualGuard==='1')return;canvas.dataset.jwManualGuard='1';canvas.addEventListener('pointerdown',()=>{if(autoOn()){autoButton()?.click();toast('직접 조작 · 자동사냥 OFF');}},{capture:true});}
function tick(){bindManualPriority();const s=scene();if(!s?.player)return;smartZoneTick(s);safetyTick(s);}
function boot(){window.setInterval(tick,220);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
