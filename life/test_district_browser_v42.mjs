// Main-village → v41 3D district → original position on actual mobile Chromium.
// APIs are deliberately mocked; NEVER touches any live account or database.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38842,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let k=0;k<120;k++){
  try{if((await fetch(host+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert(ready,'V42 local village server must boot');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(url=>url.pathname==='/api/account',async route=>{
  const action=new URL(route.request().url()).searchParams.get('action');
  if(action==='save')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({save:null})});
  return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'isolated QA'})});
 });
 await page.route(url=>url.pathname==='/api/business-v40',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,coins:1500,audit:{ok:true},business:{workshops:{farmer:{level:2,site:0}},active:'farmer'}})
 }));
 await page.route(url=>url.pathname==='/api/workshop-visits-v41',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({ok:true,readOnly:true,visitable:[]})
 }));
 await page.goto(host+'index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>window.startVillageGame());
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000});
 const initial=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
 assert.equal(initial.player.x,1050,'Baseline player at known safe village spawn');
 assert.equal(initial.coins,1000,'Baseline player balance remains separate from lab wallet');
 // Genuine same routing as clicking the 3D island gateway / map card.
 const start=await page.evaluate(()=>window.__JUNJA_TEST__.goToBusinessDistrict());
 assert(start===undefined,'Navigation to business quarter accepted');
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getDistrictPortal().open===true,null,{timeout:60000});
 await page.waitForSelector('#districtPortalV42 canvas',{state:'visible',timeout:30000});
 const arrival=await page.evaluate(()=>window.__JUNJA_TEST__.getDistrictPortal());
 assert(arrival.open&&arrival.modal,'Business district portal opens an actual modal');
 assert(Math.hypot(arrival.avatar.x-arrival.entry.x,arrival.avatar.y-arrival.entry.y)<65,'Main island walker arrived at actual gateway');
 const canvas=page.locator('#districtPortalV42 canvas');
 const count=await canvas.count();assert.equal(count,1,'One workshop WebGL canvas, no double mount');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v42-village-business-portal-phone.png',fullPage:true});
 // Returning never edits actor coords, inventory or legacy saved character gold.
 await page.getByRole('button',{name:'← 준자마을로 돌아가기'}).click();
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getDistrictPortal().open===false);
 assert.equal(await canvas.count(),0,'Exit disposes the workshop WebGL canvas');
 const returned=await page.evaluate(()=>({gate:window.__JUNJA_TEST__.getDistrictPortal(),state:window.__JUNJA_TEST__.getState()}));
 assert.equal(returned.state.coins,initial.coins,'Trial district cannot mutate real village gold');
 assert.equal(returned.gate.avatar.x,arrival.avatar.x);
 assert.equal(returned.gate.avatar.y,arrival.avatar.y);
 assert.equal(returned.gate.modal,false);
 assert.deepEqual(errors,[],'No uncaught browser exceptions while walking in/out of portal');
 console.log('PASS v42 actual 390px village portal navigation, workshop WebGL mount, return to unchanged village actor/gold and context cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
