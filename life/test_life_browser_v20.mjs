import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=38630,server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;const errors=[];
async function wait(){
 for(let i=0;i<150;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}
 throw Error('Server not ready');
}
async function rendered(page){await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000})}
try{
 await wait();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});await rendered(page);
 const metrics=await page.evaluate(()=>window.__JUNJA_TEST__.getRenderer());
 assert(metrics.displayNameWidth>=115,'Overhead name should be readable');
 const previous=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 const target={x:previous.x+65,y:previous.y+25};
 assert.equal(await page.evaluate(p=>window.__JUNJA_TEST__.moveTo(p.x,p.y),target),true);
 await page.waitForFunction(()=>window.__JUNJA_TEST__.getState().pathlen===0,null,{timeout:15000});
 const end=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 assert(Math.hypot(target.x-end.x,target.y-end.y)<1&&end.vx===0&&end.vy===0,'Keep v18 exact-stop movement');
 await page.locator('#socialStatus').click();
 assert.equal(await page.locator('#chatInput').count(),0,'Free text chat removed');
 assert.equal(await page.locator('#chatSend').count(),0,'Chat send removed');
 assert.equal(await page.locator('[data-phrase]').count(),6);
 await page.locator('[data-phrase="0"]').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getRenderer())).speech,'안녕하세요!');
 await page.locator('#bagBtn').click();
 await page.locator('#rodInBag').click();
 assert.equal(await page.locator('[data-rod]').count(),6);
 assert(await page.locator('[data-rod="gold"]').isDisabled(),'Rod level gate should work');
 await page.locator('#openAquariumFromGear').click();
 assert.equal(await page.locator('.aquarium-item').count(),12);
 assert.equal(await page.locator('.aquarium-item svg').count(),12);
 assert.equal(await page.locator('[data-fishfilter]').count(),8);
 await page.locator('[data-fishfilter="mythic"]').click();
 assert.equal(await page.locator('.aquarium-item').count(),8);
 await page.locator('[data-fishfilter="all"]').click();
 await page.locator('#aquariumNext').click();
 assert.equal(await page.locator('.aquarium-item').count(),12);
 await page.locator('#aquariumPrev').click();
 assert.equal(await page.locator('.aquarium-fish').count(),0,'Uncaught fish should not appear');
 await page.locator('#close').click();
 // Test-only save patch is applied after beforeunload auto-save, preserving production behavior.
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('qa-v20-start')!=='yes')return;
  const s=JSON.parse(localStorage.getItem('junja-harbor-v1')||'{}');
  s.xp=3400;s.coins=50000;s.collection=['송사리','금붕어','비단 송어'];
  s.fish=3;s.fishingGear={owned:['branch'],equipped:'branch'};s.aquarium={display:['송사리']};
  localStorage.setItem('junja-harbor-v1',JSON.stringify(s));
  sessionStorage.removeItem('qa-v20-start');
 });
 await page.evaluate(()=>sessionStorage.setItem('qa-v20-start','yes'));
 await page.reload({waitUntil:'domcontentloaded'});await rendered(page);
 await page.locator('#bagBtn').click();
 await page.locator('#aquariumInBag').click();
 assert.equal(await page.locator('.aquarium-fish').count(),1);
 await page.locator('[data-fish="금붕어"]').click();
 assert.equal(await page.locator('.aquarium-fish').count(),2);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v20-illustrated-aquarium.png'});
 await page.locator('#aquariumRodShop').click();
 await page.locator('[data-rod="carbon"]').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getLifeSystems())).rod.equipped,'carbon');
 await page.locator('#close').click();
 await page.evaluate(()=>window.__JUNJA_TEST__.openHome());
 assert.equal(await page.locator('#upgradeHome').count(),1);
 await page.locator('#upgradeHome').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getLifeSystems())).home.level,2);
 await page.locator('#homeCare').click();
 assert((await page.evaluate(()=>window.__JUNJA_TEST__.getLifeSystems())).home.lastCare);
 await page.locator('#close').click();
 await page.reload({waitUntil:'domcontentloaded'});await rendered(page);
 const result=await page.evaluate(()=>window.__JUNJA_TEST__.getLifeSystems());
 assert.equal(result.rod.equipped,'carbon');
 assert.equal(result.home.level,2);
 assert(result.aquarium.display.includes('금붕어'));
 assert.equal(result.missions.length,5);
 assert.equal(errors.length,0,'Unhandled JS errors: '+errors.join('; '));
 console.log('PASS v20: preserved movement, overhead names, preset speech, free text blocked, fish illustrations, gear upgrades, home stages, saved aquarium');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
