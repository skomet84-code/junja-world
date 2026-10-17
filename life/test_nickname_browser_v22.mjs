import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=38646,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
async function ready(){for(let i=0;i<120;i++){try{if((await fetch(base+'health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('server timeout')}
async function makePage(setup){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 if(setup)await page.addInitScript(data=>{for(const [k,v] of Object.entries(data))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},setup);
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>8,null,{timeout:60000});
 assert.deepEqual(pageErrors,[]);
 return page;
}
try{
 await ready();browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const normal=await makePage();
 const first=await normal.evaluate(()=>window.__JUNJA_TEST__.getState().nickname);
 assert.match(first,/^새싹\\d{4}$/,'new visitors must not be named 마을주민');
 assert.equal(await normal.evaluate(()=>window.__JUNJA_TEST__.getRenderer().faceCameraElevation),32);
 assert(await normal.evaluate(()=>document.getElementById('name').textContent)===first);
 await normal.close();
 const legacy=await makePage({'junja-village-nickname':'마을주민1234'});
 assert.match(await legacy.evaluate(()=>window.__JUNJA_TEST__.getState().nickname),/^새싹\\d{4}$/,'migrate generic nick');
 await legacy.close();
 const saved=await makePage({'junja-village-nickname':'친구Q'});
 assert.equal(await saved.evaluate(()=>window.__JUNJA_TEST__.getState().nickname),'친구Q','keep custom nickname');
 await saved.close();
 const owner=await makePage({'junja-village-nickname':'마을주민7777','junja-harbor-v1':{operatorGiftV21:true,coins:100000000}});
 assert.equal(await owner.evaluate(()=>window.__JUNJA_TEST__.getState().nickname),'갓준자');
 assert.equal(await owner.locator('#name').innerText(),'갓준자');
 await owner.locator('#socialStatus').click();
 assert.equal(await owner.locator('#villageNickname').inputValue(),'갓준자');
 assert(await owner.locator('#saveVillageNickname').isDisabled());
 await owner.locator('#close').click();
 await owner.reload({waitUntil:'domcontentloaded'});
 await owner.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000});
 assert.equal(await owner.evaluate(()=>window.__JUNJA_TEST__.getState().nickname),'갓준자');
 assert.equal((await owner.evaluate(()=>window.__JUNJA_TEST__.getRenderer())).faceCameraElevation,32);
 await owner.close();
 console.log('PASS nickname migration, saved custom names, owner title, stable 32-degree view');
}finally{await browser?.close();server.kill('SIGTERM')}
