import Phaser from 'phaser';
import './v18.css';

type Hero='warrior'|'mage'|'ranger';
const SAVE_KEY='junja-world-v01';
const trackedGames=new Set<any>();
const patched=new WeakSet<any>();
const trailState=new WeakMap<any,{lastX:number;lastY:number;lastAt:number}>();

function installTracking(){
 const proto=(Phaser.Game as any)?.prototype;if(!proto||proto.__jwV18Tracked)return;
 const boot=proto.boot,destroy=proto.destroy;
 if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};
 if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};
 proto.__jwV18Tracked=true;
}
installTracking();
function scene():any|null{const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];for(const game of games){const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}}return null;}
function save():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function hero():Hero{return (save()?.heroClass||'warrior') as Hero;}
function facing(s:any){const f=s?.facing;if(f&&Number.isFinite(f.x)&&Number.isFinite(f.y))return new Phaser.Math.Vector2(f.x,f.y).normalize();return new Phaser.Math.Vector2(0,1);}

function createUi(){
 if(!document.querySelector('.jw18-combat-vignette')){const v=document.createElement('div');v.className='jw18-combat-vignette';document.body.appendChild(v);}
 if(!document.querySelector('.jw18-skill-pulse')){const p=document.createElement('div');p.className='jw18-skill-pulse';document.body.appendChild(p);}
 if(!document.querySelector('.jw18-action-strip')){const a=document.createElement('div');a.className='jw18-action-strip';a.innerHTML='<b>전투 강화</b> · 직업별 타격 모션 활성';document.body.appendChild(a);}
}
function vignette(){const v=document.querySelector<HTMLElement>('.jw18-combat-vignette');if(!v)return;v.classList.add('show');window.setTimeout(()=>v.classList.remove('show'),120);}
function pulse(kind:Hero){const p=document.querySelector<HTMLElement>('.jw18-skill-pulse');if(!p)return;p.className=`jw18-skill-pulse ${kind}`;void p.offsetWidth;p.classList.add('show');window.setTimeout(()=>p.classList.remove('show'),450);}

function afterImage(s:any,alpha=.26,dx=0,dy=0,duration=170){
 const p=s?.player;if(!p?.texture?.key)return;try{const ghost=s.add.sprite(p.x,p.y,p.texture.key,p.frame?.name??p.frame?.index??0).setScale(p.scaleX,p.scaleY).setFlipX(!!p.flipX).setAlpha(alpha).setTint(0xffffff).setDepth(p.depth-1);s.tweens.add({targets:ghost,x:p.x+dx,y:p.y+dy,alpha:0,duration,ease:'Quad.out',onComplete:()=>ghost.destroy()});}catch{}
}
function spark(s:any,x:number,y:number,color:number,count=7){for(let i=0;i<count;i++){const a=(Math.PI*2*i/count)+Math.random()*.35,r=Phaser.Math.Between(22,46);const dot=s.add.circle(x,y,Phaser.Math.Between(2,4),color,.92).setDepth(y+120);s.tweens.add({targets:dot,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,alpha:0,scale:.2,duration:Phaser.Math.Between(180,320),ease:'Quad.out',onComplete:()=>dot.destroy()});}}
function bladeArc(s:any,color:number,radius:number,start:number,end:number,depth:number){const arc=s.add.arc(s.player.x,s.player.y,radius,start,end,false,color,.1).setStrokeStyle(6,color,.95).setDepth(depth);s.tweens.add({targets:arc,scale:1.28,alpha:0,duration:190,ease:'Cubic.out',onComplete:()=>arc.destroy()});}
function arrowFx(s:any,dir:Phaser.Math.Vector2){const x=s.player.x,y=s.player.y;const len=180;const line=s.add.line(0,0,x,y,x+dir.x*len,y+dir.y*len,0xd9f59c,.95).setOrigin(0).setLineWidth(4).setDepth(y+120);const tip=s.add.triangle(x+dir.x*len,y+dir.y*len,0,-7,14,0,0,7,0xf0ffd0,1).setRotation(Math.atan2(dir.y,dir.x)).setDepth(y+121);s.tweens.add({targets:[line,tip],alpha:0,duration:220,onComplete:()=>{line.destroy();tip.destroy();}});}
function magicFx(s:any){const x=s.player.x,y=s.player.y;const ring=s.add.circle(x,y,22,0x78d9ff,.1).setStrokeStyle(4,0xa8ecff,.92).setDepth(y+110);s.tweens.add({targets:ring,scale:2.3,alpha:0,duration:260,ease:'Cubic.out',onComplete:()=>ring.destroy()});for(let i=0;i<4;i++){const orb=s.add.circle(x,y-18,4,0xd5f6ff,.9).setDepth(y+115);const a=Math.PI*.5*i+Math.random()*.2;s.tweens.add({targets:orb,x:x+Math.cos(a)*55,y:y+Math.sin(a)*42,alpha:0,duration:280,onComplete:()=>orb.destroy()});}}
function basicAttackFx(s:any){if(!s?.player)return;const h=hero(),dir=facing(s),x=s.player.x+dir.x*68,y=s.player.y+dir.y*52;afterImage(s,.22,-dir.x*16,-dir.y*12,150);if(h==='warrior'){bladeArc(s,0xffd36b,64,205,520,s.player.y+115);spark(s,x,y,0xffdc7c,6);}else if(h==='mage'){magicFx(s);spark(s,x,y,0xa9eaff,5);}else{arrowFx(s,dir);spark(s,x,y,0xd9f59c,5);}try{s.cameras?.main?.shake?.(55,h==='warrior'?.0026:.0013);}catch{}vignette();}

function skillFx(s:any,h:Hero,secondary=false){if(!s?.player)return;pulse(h);const x=s.player.x,y=s.player.y;afterImage(s,.32,-facing(s).x*24,-facing(s).y*18,210);if(h==='warrior'){for(let i=0;i<(secondary?3:2);i++)s.time.delayedCall(i*70,()=>bladeArc(s,i%2?0xff8e64:0xffd56d,78+i*14,190+i*18,520+i*18,y+140));spark(s,x,y,0xffc067,secondary?14:10);}else if(h==='mage'){for(let i=0;i<(secondary?3:2);i++){const ring=s.add.circle(x,y,34+i*16,0x6fcfff,.06).setStrokeStyle(4,0xa8edff,.9).setDepth(y+125);s.tweens.add({targets:ring,scale:3.3+i*.3,alpha:0,duration:430+i*90,onComplete:()=>ring.destroy()});}spark(s,x,y,0xb9efff,secondary?16:12);}else{const dir=facing(s);for(let i=-1;i<=1;i++){const d=dir.clone().rotate(i*(secondary?.18:.1));const line=s.add.line(0,0,x,y,x+d.x*(secondary?360:300),y+d.y*(secondary?360:300),0xd8f59d,.86).setOrigin(0).setLineWidth(3).setDepth(y+130);s.tweens.add({targets:line,alpha:0,duration:260+i*20+60,onComplete:()=>line.destroy()});}spark(s,x+dir.x*70,y+dir.y*55,0xe3ffad,secondary?14:9);}try{s.cameras?.main?.shake?.(secondary?110:80,h==='warrior'?.0035:.0022);}catch{}}

function patchScene(s:any){if(patched.has(s)||typeof s.attack!=='function')return;const original=s.attack.bind(s);s.attack=function(...args:any[]){basicAttackFx(s);return original(...args);};patched.add(s);}
function motionTrail(s:any){if(!s?.player)return;let st=trailState.get(s);if(!st){st={lastX:s.player.x,lastY:s.player.y,lastAt:0};trailState.set(s,st);return;}const now=performance.now(),d=Math.hypot(s.player.x-st.lastX,s.player.y-st.lastY);if(d>18&&now-st.lastAt>120){afterImage(s,.1,0,3,130);st.lastX=s.player.x;st.lastY=s.player.y;st.lastAt=now;}}
function bindSkillCues(){window.addEventListener('keydown',(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(target?.matches('input,textarea,select,[contenteditable="true"]'))return;const s=scene();if(!s?.player)return;if(e.code==='KeyQ'){const b=document.querySelector<HTMLButtonElement>('#jw-skill-button');if(b?.classList.contains('ready'))window.setTimeout(()=>skillFx(s,hero(),false),0);}if(e.code==='KeyF'){const b=document.querySelector<HTMLButtonElement>('#jw-secondary-skill');if(b?.classList.contains('ready'))window.setTimeout(()=>skillFx(s,hero(),true),0);}},true);
 document.addEventListener('click',(e:MouseEvent)=>{const el=e.target as Element|null;const s=scene();if(!s?.player)return;if(el?.closest('#jw-skill-button')){const b=document.querySelector<HTMLButtonElement>('#jw-skill-button');if(b?.classList.contains('ready'))window.setTimeout(()=>skillFx(s,hero(),false),0);}if(el?.closest('#jw-secondary-skill')){const b=document.querySelector<HTMLButtonElement>('#jw-secondary-skill');if(b?.classList.contains('ready'))window.setTimeout(()=>skillFx(s,hero(),true),0);}},true);
}
function tick(){const s=scene();if(!s?.player)return;patchScene(s);motionTrail(s);}
function boot(){createUi();bindSkillCues();window.setInterval(tick,120);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
