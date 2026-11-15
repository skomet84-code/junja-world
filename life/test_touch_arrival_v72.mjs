import assert from 'node:assert/strict';
import {installTouchArrivalFeedback,isCanvasPointInside} from './touch-arrival-v56.js';
class Mock {
 constructor(){this.listeners={};this.style={};this.children=[];this.className='';}
 appendChild(node){this.children.push(node)}
 setAttribute(){}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 emit(type,data={}){for(const fn of this.listeners[type]||[])fn({type,...data})}
}
const doc=new Mock();doc.head=new Mock();doc.body=new Mock();doc.defaultView=new Mock();doc.createElement=()=>new Mock();
const canvas=new Mock();
canvas.getBoundingClientRect=()=>({left:20,top:40,right:320,bottom:640});
assert.equal(isCanvasPointInside(canvas,20,40),true);
assert.equal(isCanvasPointInside(canvas,320,640),true);
assert.equal(isCanvasPointInside(canvas,19,50),false);
assert.equal(isCanvasPointInside(canvas,50,641),false);
assert.equal(isCanvasPointInside(canvas,NaN,100),false);
assert.equal(isCanvasPointInside(null,50,50),false);
const cue=installTouchArrivalFeedback(canvas,doc);
canvas.emit('pointerdown',{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:100});
canvas.emit('pointermove',{pointerId:1,clientX:140,clientY:130});
assert.match(cue.element.className,/is-drag/);
// Drag release inside canvas should NOT signal a movement destination.
canvas.emit('pointerup',{pointerId:1,clientX:140,clientY:130});
assert.equal(cue.element.className,'v56-touch-cue','camera drag must not show arrival');
canvas.emit('pointerdown',{pointerId:1,button:0,isPrimary:true,clientX:100,clientY:100});
canvas.emit('pointermove',{pointerId:1,clientX:140,clientY:130});
// Pointer capture delivers pointerup to canvas even when released outside.
canvas.emit('pointerup',{pointerId:1,clientX:500,clientY:130});
assert.equal(cue.element.className,'v56-touch-cue','outside release must not show arrival');
canvas.emit('pointerdown',{pointerId:2,button:0,isPrimary:true,clientX:80,clientY:90});
canvas.emit('pointerup',{pointerId:2,clientX:90,clientY:90});
assert.match(cue.element.className,/is-arrival/,'inside release shows destination ripple');
canvas.emit('pointerdown',{pointerId:3,button:0,isPrimary:true,clientX:100,clientY:120});
canvas.emit('pointercancel',{pointerId:4});
assert.match(cue.element.className,/is-press/,'unrelated pointer cancel ignored');
canvas.emit('pointercancel',{pointerId:3});
assert.equal(cue.element.className,'v56-touch-cue');
canvas.emit('pointerdown',{pointerId:5,button:0,isPrimary:true,clientX:80,clientY:90});
doc.defaultView.emit('blur');
assert.equal(cue.element.className,'v56-touch-cue');
// Two-finger camera pinch must never look like a tap-to-move destination.
canvas.emit('pointerdown',{pointerId:10,button:0,isPrimary:true,clientX:100,clientY:120});
canvas.emit('pointerdown',{pointerId:11,button:0,isPrimary:false,clientX:140,clientY:120});
assert.equal(cue.element.className,'v56-touch-cue','second finger cancels press feedback');
canvas.emit('pointerup',{pointerId:11,clientX:140,clientY:120});
canvas.emit('pointerup',{pointerId:10,clientX:100,clientY:120});
assert.equal(cue.element.className,'v56-touch-cue','pinch must not trigger arrival');
canvas.emit('pointerdown',{pointerId:12,button:0,isPrimary:true,clientX:100,clientY:120});
canvas.emit('pointerup',{pointerId:12,clientX:100,clientY:120});
assert.match(cue.element.className,/is-arrival/,'fresh tap after pinch works');
canvas.emit('pointerdown',{pointerId:13,button:0,isPrimary:true,clientX:NaN,clientY:120});
assert.match(cue.element.className,/is-arrival/,'invalid pointerdown is ignored');
console.log('PASS v95 touch arrival, multitouch suppression, capture bounds, cancel and blur');
