// Non-blocking touch destination cue for the 3D village canvas.
// UI only: no gameplay state, movement speed, or save data is modified.
const STYLES = `
.v56-touch-cue{position:fixed;z-index:3;left:0;top:0;width:38px;height:38px;
  border:2px solid rgba(255,250,218,.96);border-radius:50%;pointer-events:none;
  opacity:0;transform:translate(-50%,-50%) scale(.7);
  background:radial-gradient(circle,rgba(255,250,215,.42) 0 14%,rgba(255,250,215,.08) 30%,transparent 72%);
  box-shadow:0 0 0 2px rgba(46,106,80,.66),0 5px 18px rgba(22,65,48,.22);
  will-change:transform,opacity}
.v56-touch-cue::after{content:'';position:absolute;left:50%;top:50%;width:6px;height:6px;
  background:#fff9dc;border-radius:50%;transform:translate(-50%,-50%);
  box-shadow:0 0 0 2px rgba(46,106,80,.55)}
.v56-touch-cue.is-press{opacity:.85;transform:translate(-50%,-50%) scale(.7);
  transition:opacity .12s ease-out,transform .12s ease-out}
.v56-touch-cue.is-drag{opacity:.95;transform:translate(-50%,-50%) scale(1);
  border-style:dashed;transition:transform .12s ease-out}
.v56-touch-cue.is-arrival{animation:v56-touch-arrival .48s ease-out forwards}
@keyframes v56-touch-arrival{
  0%{opacity:.94;transform:translate(-50%,-50%) scale(.65)}
  60%{opacity:.76}
  100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}
}
@media(prefers-reduced-motion:reduce){
  .v56-touch-cue{will-change:auto}
  .v56-touch-cue.is-press,.v56-touch-cue.is-drag{transition:none}
  .v56-touch-cue.is-arrival{animation-duration:.01s}
}
`;
export function createTouchArrivalFeedback(doc = document) {
 const style=doc.createElement('style');
 style.id='v56-touch-feedback-style';
 style.textContent=STYLES;
 doc.head.appendChild(style);
 const cue=doc.createElement('div');
 cue.className='v56-touch-cue';
 cue.setAttribute('aria-hidden','true');
 doc.body.appendChild(cue);
 function position(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  cue.style.left=`${Math.round(x)}px`;
  cue.style.top=`${Math.round(y)}px`;
  return true;
 }
 function press(x,y){
  if(!position(x,y))return false;
  cue.className='v56-touch-cue is-press';
  return true;
 }
 function drag(x,y){
  if(!position(x,y))return false;
  cue.className='v56-touch-cue is-drag';
  return true;
 }
 function arrive(x,y){
  if(!position(x,y))return false;
  cue.className='v56-touch-cue is-arrival';
  return true;
 }
 function cancel(){cue.className='v56-touch-cue';}
 cue.addEventListener('animationend',e=>{
  if(e.animationName==='v56-touch-arrival')cancel();
 });
 return {press,drag,arrive,cancel,element:cue};
}

/** Passive visual listeners: do not cancel events, capture pointers or alter game movement. */
export function installTouchArrivalFeedback(canvas,doc=document){
 if(!canvas)return null;
 const cue=createTouchArrivalFeedback(doc);
 let pointerId=null,startX=0,startY=0,dragging=false;
 canvas.addEventListener('pointerdown',e=>{
  if(pointerId!==null||e.button!==0)return;
  pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;dragging=false;
  cue.press(e.clientX,e.clientY);
 },{passive:true});
 canvas.addEventListener('pointermove',e=>{
  if(pointerId!==e.pointerId)return;
  if(Math.hypot(e.clientX-startX,e.clientY-startY)>9)dragging=true;
  if(dragging)cue.drag(e.clientX,e.clientY);
 },{passive:true});
 canvas.addEventListener('pointerup',e=>{
  if(pointerId!==e.pointerId)return;
  pointerId=null;cue.arrive(e.clientX,e.clientY);
 },{passive:true});
 canvas.addEventListener('pointercancel',e=>{
  if(pointerId!==e.pointerId)return;
  pointerId=null;cue.cancel();
 },{passive:true});
 const clear=()=>{pointerId=null;cue.cancel()};
 doc.defaultView?.addEventListener('blur',clear);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear()});
 return cue;
}
