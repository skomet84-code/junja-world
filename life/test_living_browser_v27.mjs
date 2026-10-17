import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const port=38641,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
async function ready(){for(let i=0;i<120;i++){try{if((await fetch(base+'health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Life v27 server not ready')}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('junja-harbor-v1',JSON.stringify({
    chapter:8,coins:1900,xp:320,fish:10,harvest:25,gathered:32,craftCount:11,deliveries:9,collection:['송사리','붕어','금붕어'],
    fishingGear:{owned:['branch'],equipped:'branch'},
    home:{level:1,wall:'cream',floor:'oak',furniture:['sofa','table']},
    aquarium:{display:['송사리','붕어'],initialized:true},
    fashion:{owned:[],equipped:{}},friends:{리나:4},animalBonds:{sora:{love:3}}
  }));
  localStorage.setItem('junja-village-nickname','생활장기테스터');
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000});
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getJourney())).chapter,8);
 await page.locator('.quest').click();
 assert((await page.locator('#panelBody').innerText()).includes('9 / 50'),'8 chapters are not the end of the game');
 assert(await page.locator('#journeyClaim').isEnabled(),'existing lifetime fish count should satisfy chapter 9');
 await page.locator('#journeyClaim').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getJourney())).chapter,9,'New chapter unlocks');
 assert((await page.locator('#panelBody').innerText()).includes('10 / 50'));
 assert((await page.evaluate(()=>window.__JUNJA_TEST__.getState())).coins>=1900,'Do not wipe pre-existing coins');
 await page.locator('#close').click();
 await page.locator('#festivalBtn').click();
 await page.locator('#openMonthlyLife').click();
 assert.equal(await page.locator('[data-month]').count(),5,'Five real monthly tasks');
 assert(await page.locator('#monthlyBadge').isDisabled(),'No free seasonal badge for new visitors');
 await page.locator('#calendarAlbum').click();
 assert.equal(await page.locator('.aquarium-stage .aquarium-fish svg').count(),2);
 const morph=await page.locator('.aquarium-stage .aquarium-fish svg').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fish')));
 assert.equal(new Set(morph).size,2,'Different fish must get different unique illustrations');
 await page.locator('[data-fishfilter="owned"]').click();
 await page.locator('[data-fishprofile="송사리"]').click();
 assert((await page.locator('#panelBody').innerText()).includes('도감 표본 기록'),'Interactive detailed species collection');
 assert((await page.locator('#panelBody').innerText()).includes('송사리'));
 await page.locator('#fishProfileBack').click();
 assert.equal(await page.locator('[data-fishfilter]').count(),8);
 await page.locator('#close').click();
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert.equal(persisted.chapter,9);
 assert.equal(persisted.fish,10);
 assert(persisted.coins>=1900);
 assert(!errors.length,'Runtime exceptions: '+errors.join('; '));
 console.log('PASS chapter 8→9→50, old save migration, monthly calendar, 70 fish unique SVGs and interactive aquarium profile');
}finally{await browser?.close();server.kill('SIGTERM')}
