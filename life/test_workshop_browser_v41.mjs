import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38841,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(host+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert(ready,'v41 visual fixture server failed to start');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(host+'test_workshop_world_v41.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.workshopDemo?.scene?.stats()?.frames>5,null,{timeout:60000});
 const canvas=page.locator('#plaza canvas');
 assert(await canvas.isVisible(),'3D business district visible at 390px phone viewport');
 const before=await page.evaluate(()=>window.workshopDemo.scene.stats());
 assert.equal(before.buildings,3,'Tiered owned workshops render separately');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v41-workshop-village-mobile.png',fullPage:true});
 await page.locator('#go').click();
 await page.waitForFunction(()=>window.workshopDemo.arrived.some(a=>a.role==='chef'),null,{timeout:20000});
 const moved=await page.evaluate(()=>window.workshopDemo.scene.stats());
 assert(Math.abs(moved.walker.z-before.walker.z)>80,'Village avatar actually approaches bakery');
 await page.locator('#enter').click();
 await page.waitForFunction(()=>window.workshopDemo.scene.stats().inside==='chef',null,{timeout:10000});
 assert(await canvas.isVisible(),'Interior shares same browser canvas');
 assert.equal(await canvas.count(),1,'Interior is rendered with ONE WebGL context');
 await page.screenshot({path:'artifacts/v41-workshop-interior-mobile.png',fullPage:true});
 await page.locator('#exit').click();
 await page.waitForFunction(()=>window.workshopDemo.scene.stats().inside===null);
 await page.locator('#guest').click();
 await page.waitForFunction(()=>window.workshopDemo.scene.stats().readOnly===true&&window.workshopDemo.scene.stats().frames>3);
 assert.equal(await canvas.count(),1,'Guest mode disposes old context before mounting new one');
 await page.locator('#close').click();
 assert.equal(await canvas.count(),0,'Closing business scene must release its WebGL canvas');
 assert.deepEqual(errors,[],'No uncaught browser/runtime exceptions in walk, guest or interior');
 console.log('PASS v41 mobile browser: 3D tier buildings, walk, interior, guest and WebGL context cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
