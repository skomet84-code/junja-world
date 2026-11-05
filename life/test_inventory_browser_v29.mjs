import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const port=38829,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
async function ready(){for(let i=0;i<130;i++){try{if((await fetch(host+'health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('v29 server failed')}
try{
 await ready();browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('v29-seed'))return;
  sessionStorage.setItem('v29-seed','yes');
  localStorage.setItem('junja-harbor-v1',JSON.stringify({x:1050,y:955,coins:6000,xp:320,fishStock:{'송사리':2},fish:3,collection:['송사리'],
   materials:{wood:0,stone:0},crafted:{parcel:0},hunt:{materials:{},potions:{hp:2,mp:2},starterPotionsV29:true},
   bag:{level:1,autoSellTickets:1},fashion:{owned:[],equipped:{}},fishingGear:{owned:['branch'],equipped:'branch'}}));
 });
 await page.goto(host,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>3,null,{timeout:60000});
 await page.evaluate(()=>window.__JUNJA_TEST__.openBag());
 assert((await page.locator('#panelBody').innerText()).includes('24칸')||await page.locator('#panelBody').innerText().then(x=>x.includes('/24칸')));
 assert(await page.locator('#upgradeBag').isVisible());
 assert(await page.locator('#bagGoMarket').isVisible());
 await page.locator('#upgradeBag').click();
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(state.bag.level,2);
 assert.equal(state.coins,3400);
 await page.locator('#bagGoMarket').click();
 assert.equal(await page.locator('[data-sell-fish]').count(),1);
 await page.locator('#marketStorage').click();
 assert.equal(await page.locator('#autoSellBag').isDisabled(),false);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#autoSellBag').click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(state.fishStock['송사리'],0);
 assert.equal(state.bag.autoSellTickets,0);
 assert(state.coins>3400);
 assert(!errors.length,errors.join('; '));
 await page.goto(host+'hunt.html?room=SPRING',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__?.getState()?.zone===undefined,null,{timeout:60000});
 await page.locator('[data-zone="0"]').click();
 await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__?.getState()?.active===true);
 assert.equal(await page.locator('#hpPotion').count(),1);
 assert.equal(await page.locator('#mpPotion').count(),1);
 await page.locator('#craft').click();
 await page.locator('#potionShopLink').click();
 assert.equal(await page.locator('[data-potion-buy]').count(),4);
 const money=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')).coins);
 await page.locator('[data-potion-buy="hp"]').click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(state.coins,money-190);
 await page.locator('#potionsMap').click();
 await page.locator('[data-zone="0"]').click();
 assert.equal(await page.locator('#hpPotion').count(),1);
 console.log('PASS v29 mobile bag upgrade, direct fish market, event auto-sale, combat HP/MP potion purchase and buttons');
}finally{await browser?.close();server.kill('SIGTERM')}
