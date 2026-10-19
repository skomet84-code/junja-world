import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38847,url='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),
 env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(url+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,120))}
 assert(ready,'fixture server must boot');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:780},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let energy=7,packs=0,coins=5500,postPayload=null;
  await page.route('**/api/economy-v36',async route=>{
   const req=route.request();
   if(req.method()==='POST'){
    postPayload=req.postDataJSON();
    if(postPayload.action!=='energy_buy')throw Error('Unexpected action');
    energy=Math.min(100,energy+25);packs++;coins-=1200;
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,version:9,receipt:{action:'energy_buy',detail:'행동력 +25 충전',balance:coins},
    economy:{coins},
    energy:{current:energy,max:100,regenSeconds:360,nextRegenSeconds:270,packSize:25,
     packPrice:1200,packsUsed:packs,packsLeft:3-packs,day:'2026-10-19'}
   })});
  });
  await page.route('**/api/account**',async route=>route.fulfill({
   status:401,contentType:'application/json',body:'{"error":"isolated QA"}'
  }));
  await page.goto(url+'index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>window.villageGateEnter({nickname:'v47 test'}));
  await page.waitForFunction(()=>document.querySelector('.actions #estateBtn')&&
   document.getElementById('energyHudV47')?.textContent?.includes('7/100'),null,{timeout:60000});
  const layout=await page.evaluate(()=>{
   const controls=[...document.querySelectorAll('.hud.actions>.act')];
   const root=document.querySelector('.hud.actions');
   const boxes=controls.map(x=>{const a=x.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,label:x.innerText}});
   const overlaps=[];
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];
    if(a.x<b.x+b.w-1&&b.x<a.x+a.w-1&&a.y<b.y+b.h-1&&b.y<a.y+a.h-1)overlaps.push([i,j]);
   }
   return {boxes,overlaps,actions:root.getBoundingClientRect().toJSON(),
    scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.equal(layout.boxes.length,8,'Seven base actions + estate action must be uniformly laid out');
  assert.equal(layout.overlaps.length,0,JSON.stringify(layout.overlaps));
  assert(layout.boxes.every(b=>b.w>=44&&b.h>=44),'Each icon needs at least a 44px touch target');
  assert(layout.scrollWidth<=width,'No horizontal scrolling/overflow on mobile');
  assert(layout.actions.x>=0&&layout.actions.x+layout.actions.width<=width,'Dock stays on screen');
  if(width===320)assert(new Set(layout.boxes.map(x=>Math.round(x.y))).size===2,'Narrow phone must use two rows');
  else assert(new Set(layout.boxes.map(x=>Math.round(x.y))).size===1,'Typical phone uses one uniform row');
  await page.locator('#energyHudV47').click();
  await page.waitForSelector('#energyModalV47 .v47-energy-card',{timeout:10000});
  assert((await page.locator('#energyModalV47').innerText()).includes('1,200G'));
  assert((await page.locator('#energyModalV47').innerText()).includes('7 / 100'));
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/v47-energy-mobile-'+width+'.png',fullPage:true});
  await page.locator('#energyModalV47 .v47-buy-button').click();
  await page.waitForFunction(()=>document.querySelector('#energyModalV47')?.textContent?.includes('32 / 100'));
  assert.equal(postPayload.action,'energy_buy');
  assert.deepEqual(Object.keys(postPayload).sort(),['action','payload','requestId']);
  assert.equal(postPayload.payload&&Object.keys(postPayload.payload).length,0,true);
  assert.equal(coins,4300);
  await page.locator('#close').click();
  assert.deepEqual(errors,[],'No unexpected JS exceptions');
  await page.close();
 }
 console.log('PASS v47 Chromium 320/390/430: all 8 quick icons aligned, >=44px, two-row fallback, energy HUD, 1200G purchase, no phone overflow');
}finally{await browser?.close();server.kill('SIGTERM')}
