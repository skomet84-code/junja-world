import assert from 'node:assert/strict';
import {installTouchArrivalFeedback} from './touch-arrival-v56.js';
class Mock {
 constructor(){this.listeners={};this.style={};this.children=[];this.className='';}
 appendChild(node){this.children.push(node)}
 setAttribute(){}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 emit(type,data={}){for(const fn of this.listeners[type]||[])fn({type,...data})}
}
const doc=new Mock();doc.head=new Mock();doc.body=new Mock();doc.defaultView=new Mock();doc.createElement=()=>new Mock();
const canvas=new Mock();canvas.getBoundingClientRect=()=>({left:0,top:0,right:400,bottom:700});
const cue=installTouchArrivalFeedback(canvas,doc);
canvas.emit('pointerdown',{pointerId:1,button:0,isPrimary:true,clientX:30,clientY:50});
canvas.emit('pointermove',{pointerId:1,clientX:50,clientY:80});
assert.match(cue.element.className,/is-drag/);
doc.defaultView.emit('pointerup',{pointerId:1,clientX:600,clientY:600});
assert.equal(cue.element.className,'v56-touch-cue');
canvas.emit('pointerdown',{pointerId:2,button:0,isPrimary:true,clientX:20,clientY:20});
canvas.emit('pointerup',{pointerId:2,clientX:20,clientY:20});
assert.match(cue.element.className,/is-arrival/);
assert.match(doc.head.children[0].textContent,/v57-touch-halo/);
console.log('v57 touch halo/release regression passed');
