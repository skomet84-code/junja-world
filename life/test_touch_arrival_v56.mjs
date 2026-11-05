import test from 'node:test';
import assert from 'node:assert/strict';
import {createTouchArrivalFeedback,installTouchArrivalFeedback} from './touch-arrival-v56.js';

class FakeElement {
 constructor(){this.className='';this.style={};this.listeners={};this.children=[];this.attrs={};}
 appendChild(node){this.children.push(node);return node;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 emit(type,props={}){for(const fn of this.listeners[type]||[])fn({type,...props});}
}
function fakeDoc(){
 const d=new FakeElement();
 d.head=new FakeElement();d.body=new FakeElement();d.defaultView=new FakeElement();
 d.createElement=()=>new FakeElement();
 return d;
}
test('destination cue positions in CSS pixels, remains pointer-transparent, and animates',()=>{
 const doc=fakeDoc(),cue=createTouchArrivalFeedback(doc);
 assert.equal(doc.head.children.length,1);
 assert.match(doc.head.children[0].textContent,/pointer-events:none/);
 assert.equal(doc.body.children.length,1);
 assert.equal(cue.element.attrs['aria-hidden'],'true');
 assert.equal(cue.press(22.5,50.6),true);
 assert.equal(cue.element.style.left,'23px');
 assert.equal(cue.element.style.top,'51px');
 assert.match(cue.element.className,/is-press/);
 assert.equal(cue.drag(60,90),true);
 assert.match(cue.element.className,/is-drag/);
 assert.equal(cue.arrive(60,90),true);
 assert.match(cue.element.className,/is-arrival/);
 cue.element.emit('animationend',{animationName:'v56-touch-arrival'});
 assert.equal(cue.element.className,'v56-touch-cue');
 assert.equal(cue.press(NaN,20),false);
 assert.equal(cue.element.className,'v56-touch-cue');
});
test('passive canvas handlers track one finger, cancel cleanly and never prevent input',()=>{
 const doc=fakeDoc(),canvas=new FakeElement();
 const cue=installTouchArrivalFeedback(canvas,doc);
 assert.ok(cue);
 canvas.emit('pointerdown',{pointerId:1,button:0,clientX:10,clientY:20});
 assert.match(cue.element.className,/is-press/);
 canvas.emit('pointermove',{pointerId:2,clientX:50,clientY:60});
 assert.match(cue.element.className,/is-press/);
 canvas.emit('pointermove',{pointerId:1,clientX:12,clientY:23});
 assert.match(cue.element.className,/is-press/);
 canvas.emit('pointermove',{pointerId:1,clientX:32,clientY:42});
 assert.match(cue.element.className,/is-drag/);
 canvas.emit('pointercancel',{pointerId:2});
 assert.match(cue.element.className,/is-drag/);
 canvas.emit('pointerup',{pointerId:1,clientX:34,clientY:44});
 assert.match(cue.element.className,/is-arrival/);
 canvas.emit('pointerdown',{pointerId:3,button:0,clientX:12,clientY:16});
 doc.defaultView.emit('blur');
 assert.equal(cue.element.className,'v56-touch-cue');
 assert.equal(canvas.listeners.pointerdown.length,1);
 assert.equal(installTouchArrivalFeedback(null,doc),null);
});
