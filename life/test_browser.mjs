// Browser-level smoke test for the actual WebGL renderer and phone touch controls.
// Run after "npm install --no-save playwright" and "npx playwright install chromium".
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';

const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:'38627'},stdio:'pipe'});
let browser;
const errors=[];
async function waitServer(){
 for(let tries=0;tries<100;tries++){
  try{const r=await fetch('http://127.0.0.1:38627/health');if(r.ok)return}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('Village server failed to start');
}
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-web-security']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:38627/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>Boolean(window.__JUNJA_TEST__?.getRenderer()?.frames>3),null,{timeout:60000});
 const stats=await page.evaluate(()=>window.__JUNJA_TEST__.getRenderer());
 assert.equal(stats.renderer,'WebGL 3D');
 assert(stats.interactiveRaycastRoots>=20,'Interactive raycast register should be populated');
 assert(!await page.locator('#renderError').isVisible(),'No WebGL startup error');
 const previous=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 const requested={x:previous.x+65,y:previous.y+25};
 const navigated=await page.evaluate(({x,y})=>window.__JUNJA_TEST__.moveTo(x,y),requested);
 assert.equal(navigated,true,'Start pathfinding to nearby walkable target');
 await page.waitForFunction(()=>window.__JUNJA_TEST__.getState().pathlen===0,null,{timeout:15000});
 const arrived=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 assert(Math.hypot(arrived.x-requested.x,arrived.y-requested.y)<1,'Reach exact destination');
 assert.equal(arrived.vx,0);assert.equal(arrived.vy,0);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v17-mobile-island.png'});
 await page.locator('#shopBtn').click();
 await page.waitForSelector('#fitting3D');
 await page.locator('[data-try="navy"]').click();
 await page.waitForSelector('#fitting3D');
 await page.locator('#turnFitting').click();
 await page.locator('#walkFitting').click();
 await page.waitForTimeout(400);
 await page.screenshot({path:'artifacts/v17-mobile-wardrobe.png'});
 assert.equal(errors.length,0,'No unhandled JavaScript errors: '+errors.join('; '));
 console.log('PASS browser smoke:',{stats,previous,requested,arrived});
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
