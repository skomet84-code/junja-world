import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=38835,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(host+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert(ready,'Fixture server did not become ready');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(host+'test_estate_world_v35.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.estateDemo?.scene?.stats()?.frames>5,null,{timeout:60000});
 const canvas=page.locator('#farm canvas');
 assert(await canvas.isVisible(),'3D farm actually renders on mobile');
 const initial=await page.evaluate(()=>window.estateDemo.scene.stats());
 assert.equal(initial.plots,6,'Uses existing account farm tier');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v35-walkable-farm-mobile.png',fullPage:true});
 // Explicit button has the same walk-to-field path as tapping a 3D plot.
 await page.locator('#plotTest').click();
 await page.waitForFunction(()=>window.estateDemo.selected.includes(0),null,{timeout:20000});
 const arrived=await page.evaluate(()=>window.estateDemo.scene.stats());
 assert(arrived.frames>initial.frames,'3D rendering animation continues during walking');
 assert(Math.hypot(arrived.walker.x-initial.walker.x,arrived.walker.z-initial.walker.z)>30,'Character physically moved toward the selected bed');
 await page.locator('#closeTest').click();
 assert.equal(await canvas.count(),0,'Farm renderer is removed when leaving');
 assert.deepEqual(errors,[],'No uncaught WebGL or event-loop runtime errors');
 console.log('PASS v35 mobile farm WebGL, walk-to-field action, scene frame animation and context cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
