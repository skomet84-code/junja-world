import Phaser from 'phaser';
import './v102.css';
import './v103.css';

const trackedGames=new Set<any>();
const patched=new WeakSet<any>();

function install(){const proto=(Phaser.Game as any)?.prototype;if(!proto||proto.__jwV102Tracked)return;const boot=proto.boot,destroy=proto.destroy;if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};proto.__jwV102Tracked=true;}
install();

function scene():any|null{const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];for(const game of games){const s=game?.scene?.keys?.world;if(s?.sys?.isActive?.())return s;try{const x=game?.scene?.getScene?.('world');if(x?.sys?.isActive?.())return x;}catch{}}return null;}

function createFeed(){if(document.querySelector('.jw-feed'))return;const el=document.createElement('div');el.className='jw-feed';document.body.appendChild(el);}
function pushFeed(html:string,kind=''){createFeed();const host=document.querySelector<HTMLElement>('.jw-feed');if(!host)return;const item=document.createElement('div');item.className=`jw-feed-item ${kind}`.trim();item.innerHTML=html;host.prepend(item);while(host.children.length>5)host.lastElementChild?.remove();window.setTimeout(()=>{item.classList.add('fade');window.setTimeout(()=>item.remove(),420);},3600);}

function patchScene(s:any){
  if(patched.has(s))return;
  if(typeof s.defeat==='function'){
    const original=s.defeat.bind(s);
    s.defeat=function(m:any){const name=String(m?.getData?.('name')||'요괴');const xp=Number(m?.getData?.('xp')||0);const gold=Number(m?.getData?.('gold')||0);const elite=!!m?.getData?.('jwElite');const boss=!!m?.getData?.('isBoss');original(m);pushFeed(`<b>${boss?'★ ':elite?'◆ ':''}${name}</b> 처치 · EXP +${xp} · ${gold}엽전`,boss?'rare':elite?'elite':'');};
  }
  if(typeof s.collectDrop==='function'){
    const original=s.collectDrop.bind(s);
    s.collectDrop=function(d:any){const kind=String(d?.getData?.('kind')||'');const amount=Number(d?.getData?.('amount')||0);const rare=d?.getData?.('rareItem');original(d);if(kind==='gold')pushFeed(`전리품 · <b>${amount} 엽전</b>`);else if(kind==='potion')pushFeed(`전리품 · <b>회복약 +${amount}</b>`);else if(kind==='rare')pushFeed(`희귀 전리품 · <b>${String(rare||'장비')}</b>`,'rare');};
  }
  if(typeof s.gainXp==='function'){
    const original=s.gainXp.bind(s);
    s.gainXp=function(amount:number){const before=Number(s.save?.level||1);original(amount);const after=Number(s.save?.level||before);if(after>before)pushFeed(`<b>LEVEL UP</b> · Lv.${after} 달성`,'level');};
  }
  patched.add(s);
}

function version(){/* Version display is owned by version-v15.ts. */}
function tick(){const s=scene();if(s?.player)patchScene(s);}
function boot(){createFeed();version();window.setInterval(tick,350);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
