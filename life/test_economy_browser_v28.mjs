import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const port=38651,origin='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
async function ready(){for(let i=0;i<120;i++){try{if((await fetch(origin+'health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Economy test server unavailable')}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('economic-qa-seeded'))return;
  sessionStorage.setItem('economic-qa-seeded','yes');
  localStorage.setItem('junja-harbor-v1',JSON.stringify({
   x:1050,y:955,coins:1000,xp:320,chapter:8,collection:['송사리'],fish:1,
   fishStock:{'송사리':1},fishRecords:{'송사리':{lastCm:29,bestCm:29,count:1}},
   fishingGear:{owned:['branch'],equipped:'branch'},fashion:{owned:[],equipped:{}},
   home:{level:1,wall:'cream',floor:'oak',furniture:['sofa','table']}
  }));
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>4,null,{timeout:60000});
 let current=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
 assert.equal(current.coins,1000,'Existing and new starter coin balance preserved');
 await page.evaluate(()=>window.__JUNJA_TEST__.openJournal());
 await page.locator('#journalEconomy').click();
 assert((await page.locator('#panelBody').innerText()).includes('경제 수첩'));
 assert((await page.locator('#panelBody').innerText()).includes('1,000'));
 await page.locator('#economyGoMarket').click();
 assert.equal(await page.locator('[data-sell-fish]').count(),1);
 assert((await page.locator('#panelBody').innerText()).includes('송사리'));
 await page.locator('[data-sell-fish]').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(saved.fishStock['송사리'],0,'NPC purchase must remove actual fish from inventory');
 assert.equal(saved.collection.length,1,'Historical fish discovery remains in museum');
 assert(saved.coins>1000,'NPC fish sale pays money');
 assert.equal(await page.locator('[data-sell-fish]').count(),0,'No duplicate fish re-selling');
 await page.locator('#marketBait').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')).coins);
 await page.locator('[data-bait-purchase="basic"]').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(saved.baitInventory.basic,10,'Shop purchase creates 10 bait consumables');
 assert.equal(saved.coins,before-180,'Bait shop burns exactly 180G');
 await page.locator('[data-bait-equip="basic"]').click();
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')))).baitEquipped,'basic');
 await page.locator('#baitToMarket').click();
 await page.locator('#marketEconomy').click();
 const ledger=await page.locator('#panelBody').innerText();
 assert(ledger.includes('낚시 미끼')&&ledger.includes('수산시장 판매'),'Ledger shows NPC selling and item sink');
 assert(!errors.length,'Runtime JS error: '+errors.join('; '));
 console.log('PASS v28 mobile economy: market sells actual fish once, keeps museum, consumes bait money, tracks credits/debits and preserves starting balance');
}finally{await browser?.close();server.kill('SIGTERM')}
