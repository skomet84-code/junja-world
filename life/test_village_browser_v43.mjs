// V43 headless Chromium 390px UI: actual island pedestrians + workshop tier reveal.
// All private APIs mocked; CI test NEVER touches live Neon or Vercel accounts.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {v43LightMood} from './village-life-v43.js';
const port=38843,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(host+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,125));
 }
 assert(ready,'Local game server must boot');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route(url=>url.pathname==='/api/account',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='save')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({save:null})});
  return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'local preview test only'})});
 });
 await page.goto(host+'index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>window.villageGateEnter({nickname:'QA 주민'}));
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>10,null,{timeout:60000});
 const before=await page.evaluate(()=>({
  render:window.__JUNJA_TEST__.getRenderer(),
  profile:window.__JUNJA_TEST__.getState()
 }));
 assert.equal(before.render.residentMotion,3,'All three citizens should have active articulated models');
 assert.equal(before.render.residentPositions.length,3);
 assert(['morning','day','evening','night'].includes(before.render.daypart),'Scene must apply Korean daylight mood');
 assert.equal(before.profile.coins,1000,'Main village wallet unchanged');
 assert.equal(before.render.daypart,v43LightMood(new Date()).phase);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v43-lively-island-mobile.png',fullPage:true});
 // Dedicated local fixture deliberately holds three buildings at all level tiers.
 await page.goto(host+'test_workshop_world_v41.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.workshopDemo?.scene?.stats()?.frames>5,null,{timeout:60000});
 await page.waitForFunction(()=>window.workshopDemo?.scene?.stats()?.constructionReveal>=98,null,{timeout:15000});
 const constructed=await page.evaluate(()=>window.workshopDemo.scene.stats());
 assert.equal(constructed.buildings,3);
 assert.equal(constructed.tierDecorations,1,'Top-tier workshop has distinct roof banners');
 assert.equal(await page.locator('#plaza canvas').count(),1,'Still one mobile WebGL canvas');
 await page.screenshot({path:'artifacts/v43-tiered-business-street-mobile.png',fullPage:true});
 await page.locator('#enter').click();
 await page.waitForFunction(()=>window.workshopDemo.scene.stats().inside==='chef',{timeout:10000});
 await page.locator('#exit').click();
 await page.locator('#close').click();
 assert.equal(await page.locator('#plaza canvas').count(),0,'Scene cleans up its WebGL context after exit');
 assert.deepEqual(errors,[],'v43 mobile island + street contain no uncaught rendering errors');
 console.log('PASS v43 Chromium phone: NPC life/lighting, 3-tier 3D workshop reveal, one WebGL canvas, entrance and resource disposal');
}finally{await browser?.close();server.kill('SIGTERM')}
