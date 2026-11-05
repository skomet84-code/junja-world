import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
// Genuine Chromium WebGL with a disposable local mock home; no account/database access.
const port=38849,root='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{
 cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(root+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,125));
 }
 assert(ready,'Mobile graphics QA local HTTP server missing');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
   const {mountHomeStudioV48}=await import('./home-studio-ui-v48.js');
   const host=document.createElement('section');
   host.id='premiumStudioQA';host.style.cssText='position:fixed;inset:7px;z-index:300;overflow:auto;background:#faf6ea;padding:12px;border-radius:16px;touch-action:pan-y';
   document.body.append(host);
   let home={level:4,wall:'gold',floor:'oak',furniture:['sofa','table','piano','throne'],lastCare:'2026-10-18'};
   let money=500000,charges=0,places=0;
   const ui=mountHomeStudioV48(host,{
    getHome:()=>home,getCoins:()=>money,
    onBuy(change){money-=change.cost;home=change.next;charges++;return true},
    onArrange(next){home=next;places++;return true}
   });
   window.premiumQA={ui,snapshot:()=>({home,money,charges,places}),stats:()=>ui.sceneStats()};
  });
  await page.waitForFunction(()=>window.premiumQA?.stats()?.frames>0,{timeout:20000});
  const controls=page.locator('#premiumStudioQA .v48-camera-btn');
  assert.equal(await controls.count(),5,'Camera toolbar must contain five functional controls');
  const buttonBoxes=await controls.evaluateAll(xs=>xs.map(x=>{
   const {width,height}=x.getBoundingClientRect();return {w:width,h:height};
  }));
  assert(buttonBoxes.every(x=>x.w>=44&&x.h>=44),
   'Camera buttons must have large touch areas at '+width+': '+JSON.stringify(buttonBoxes));
  const initial=await page.evaluate(()=>window.premiumQA.stats());
  assert(initial.picks>9,'Pick list must include actual furniture geometry, not just floor tiles');
  assert(initial.shadows>=4,'Owned furniture should have contact shadows');
  await controls.nth(1).click();
  let changed=await page.evaluate(()=>window.premiumQA.stats());
  assert(changed.angle>initial.angle,'Right camera button must rotate room');
  await controls.nth(3).click();changed=await page.evaluate(()=>window.premiumQA.stats());
  assert(changed.zoom<initial.zoom,'Zoom-in must tighten camera framing');
  await controls.nth(4).click();changed=await page.evaluate(()=>window.premiumQA.stats());
  assert(Math.abs(changed.angle-.76)<.00001&&changed.zoom===1,'Home button resets view and zoom');
  const canvas=page.locator('#premiumStudioQA .v48-scene canvas');
  await canvas.scrollIntoViewIfNeeded();
  let rect=await canvas.boundingBox();assert(rect?.width>150,'Canvas must be visible');
  await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.5,{steps:5});
  await page.mouse.up();
  changed=await page.evaluate(()=>window.premiumQA.stats());
  assert(changed.dragCount>0,'Touch drag must rotate actual WebGL room');
  assert.equal((await page.evaluate(()=>window.premiumQA.snapshot())).places,0,
   'Camera dragging must never place or buy furniture');
  await controls.nth(4).click(); // reset to predictable camera
  // Choose table without forcing a new WebGL context, then tap the 3D room.
  await page.evaluate(()=>{window.premiumCanvasOriginal=document.querySelector('#premiumStudioQA .v48-scene canvas')});
  await page.locator('#premiumStudioQA .v48-item').filter({hasText:'원목 식탁'}).click();
  assert.equal(await page.evaluate(()=>window.premiumCanvasOriginal===document.querySelector('#premiumStudioQA .v48-scene canvas')),true,
   'Changing furniture selection must preserve GPU context');
  await canvas.scrollIntoViewIfNeeded();rect=await canvas.boundingBox();
  await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  const pos=await page.evaluate(()=>window.premiumQA.snapshot());
  assert(pos.places>=1,'Touching the 3D center must place the selected furniture');
  assert.equal(pos.charges,0,'Moving old furniture never costs coins');
  assert.equal(pos.money,500000,'Decorating must not alter existing coins');
  assert(pos.home.furniture.includes('throne')&&pos.home.furniture.includes('piano'));
  // Demand-driven GPU painting: static rooms should stop rendering until changed.
  await page.waitForTimeout(300);
  const idle1=await page.evaluate(()=>window.premiumQA.stats().frames);
  await page.waitForTimeout(350);
  const idle2=await page.evaluate(()=>window.premiumQA.stats().frames);
  assert(idle2-idle1<=2,'Static home room must not render continuously');
  const overflow=await page.locator('#premiumStudioQA').evaluate(el=>({
   overflow:el.scrollWidth>el.clientWidth,viewport:el.getBoundingClientRect().width
  }));
  assert.equal(overflow.overflow,false,'Luxury UI must not overflow '+width+'px phone');
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/v48-deluxe-mobile-'+width+'.png',fullPage:true});
  await page.evaluate(()=>{window.premiumQA.ui.dispose();document.getElementById('premiumStudioQA').remove()});
  assert.equal(await page.locator('#premiumStudioQA canvas').count(),0);
  assert.deepEqual(errors,[],'No JavaScript errors on premium WebGL room');
  await page.close();
 }
 console.log('PASS premium v48 mobile WebGL 320/390/430: accessible orbit/zoom controls, real 3D slot tap, safe drag, zero-cost moves, idle GPU and cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
