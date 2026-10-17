import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const port=38633,server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
const base='http://127.0.0.1:'+port+'/';
try{
 for(let i=0;i<140;i++){try{if((await fetch(base+'health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const normal=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await normal.goto(base,{waitUntil:'domcontentloaded'});
 await normal.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>10);
 assert.equal((await normal.evaluate(()=>window.__JUNJA_TEST__.getState())).coins,800,'normal player gets normal initial coins');
 await normal.locator('#shopBtn').click();
 const canvas=normal.locator('#fitting3D');
 await canvas.waitFor();
 await normal.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.fittingView?.height>=310);
 const fit=await normal.evaluate(()=>window.__JUNJA_TEST__.getRenderer().fittingView);
 assert(fit.feetNdcY>-0.97&&fit.headNdcY<0.97,'Full avatar including feet and hairstyle must fit orthographic view: '+JSON.stringify(fit));
 await mkdir('artifacts',{recursive:true});await normal.screenshot({path:'artifacts/v21-full-body-fitting.png'});
 // Optional QA of the private bearer token, injected from a local secret only.
 // Never commit the bearer token to a publicly readable repository.
 if(process.env.JUNJA_OWNER_QA_GIFT){
  const owner=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await owner.goto(base+'?ownerGift='+encodeURIComponent(process.env.JUNJA_OWNER_QA_GIFT),{waitUntil:'domcontentloaded'});
  await owner.waitForFunction(()=>window.__JUNJA_TEST__?.getState().coins===100000000,null,{timeout:15000});
  assert(!(await owner.evaluate(()=>location.search.includes('ownerGift'))),'gift code removed from address bar');
  await owner.reload({waitUntil:'domcontentloaded'});
  await owner.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5);
  assert.equal((await owner.evaluate(()=>window.__JUNJA_TEST__.getState())).coins,100000000,'owner gift persists');
 }
 const invalid=await browser.newPage();
 await invalid.goto(base+'?ownerGift=wrong',{waitUntil:'domcontentloaded'});
 await invalid.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5);
 assert.equal((await invalid.evaluate(()=>window.__JUNJA_TEST__.getState())).coins,800,'invalid owner code must not grant money');
 console.log('PASS: mobile head-to-toe view, ordinary wallet, invalid gift; private gift QA when secret provided.');
}finally{await browser?.close();server.kill('SIGTERM')}
