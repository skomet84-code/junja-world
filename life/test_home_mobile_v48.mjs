import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38848,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(base+'health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,125))}
 assert(ready,'Fixture server did not boot');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/account**',route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');
   return route.fulfill({status:action==='save'?200:401,contentType:'application/json',
    body:action==='save'?'{"save":null,"version":1}':'{"error":"isolated QA"}'});
  });
  await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>window.villageGateEnter({nickname:'v48 test'}));
  await page.waitForFunction(()=>window.__JUNJA_TEST__?.openHome,{timeout:30000});
  await page.evaluate(()=>window.__JUNJA_TEST__.openHome());
  await page.getByRole('button',{name:/v48 · 입체 실내/}).click();
  await page.waitForSelector('#homeStudioHostV48 .v48-scene canvas',{timeout:20000});
  assert((await page.locator('#homeStudioHostV48').innerText()).includes('희귀 인테리어'));
  const main=await page.evaluate(()=>{
   const x=document.querySelector('#homeStudioHostV48').getBoundingClientRect();
   return {w:x.width,x:x.x,viewport:innerWidth,storeItems:document.querySelectorAll('.v48-store-item').length,
    canvas:document.querySelectorAll('#homeStudioHostV48 canvas').length};
  });
  assert(main.w<=width, 'Home editor fits viewport');
  assert.equal(main.storeItems,11);
  assert.equal(main.canvas,1);
  await page.locator('#close').click();
  await page.waitForFunction(()=>!document.querySelector('#homeStudioHostV48 canvas'));
  // An isolated UI fixture exercises purchase + reposition of rare items without
  // spending an actual player's coins or writing to their cloud profile.
  await page.evaluate(async()=>{
   const {mountHomeStudioV48}=await import('./home-studio-ui-v48.js');
   const host=document.createElement('section');host.id='testStudioV48';
   host.style.cssText='position:fixed;inset:8px;z-index:150;overflow:auto;background:#fffaf0;padding:12px;border-radius:18px;touch-action:pan-y';
   document.body.append(host);
   let home={level:4,wall:'cream',floor:'oak',furniture:['sofa','table','piano'],lastCare:'2026-10-18'};
   let money=900000,buys=0,places=0;
   window.__homeFixtureV48={
    ui:mountHomeStudioV48(host,{getHome:()=>home,getCoins:()=>money,
     onBuy(change){if(money<change.cost)return false;money-=change.cost;home=change.next;buys++;return true},
     onArrange(next){home=next;places++;return true}}),
    snapshot(){return {home,money,buys,places}}
   };
  });
  await page.waitForSelector('#testStudioV48 .v48-scene canvas');
  assert.equal(await page.locator('#testStudioV48 .v48-tab').count(),4);
  await page.locator('#testStudioV48 .v48-tab').nth(3).click();
  const royalShop=page.locator('#testStudioV48 .v48-store-item').filter({hasText:'왕실 황금 의자'});
  assert((await royalShop.innerText()).includes('360,000G'));
  await royalShop.getByRole('button',{name:'구매하기'}).click();
  let snapshot=await page.evaluate(()=>window.__homeFixtureV48.snapshot());
  assert.equal(snapshot.buys,1);
  assert.equal(snapshot.money,540000);
  assert(snapshot.home.furniture.includes('throne'),'Rare item is in saved home inventory');
  await page.locator('#testStudioV48 .v48-tab').nth(3).click();
  await page.locator('#testStudioV48 .v48-item').filter({hasText:'왕실 황금 의자'}).click();
  await page.locator('#testStudioV48 .v48-grid-cell').nth(4).click();
  snapshot=await page.evaluate(()=>window.__homeFixtureV48.snapshot());
  assert.equal(snapshot.places,1);
  assert(snapshot.home.decorV48.some(p=>p.item==='throne'&&p.room===3&&p.slot===4));
  assert(snapshot.home.furniture.includes('piano')&&snapshot.home.furniture.includes('table'),
   'Old purchases survive new home placement');
  assert.equal(snapshot.buys,1,'Repositioning never charges again');
  const positions=await page.evaluate(()=>{
   const host=document.querySelector('#testStudioV48'),items=[...host.querySelectorAll('.v48-store-item')];
   const cards=items.map(x=>x.getBoundingClientRect().toJSON());
   return {width:host.getBoundingClientRect().width,overflow:host.scrollWidth>host.clientWidth,
    cards,canvas:host.querySelectorAll('canvas').length};
  });
  assert.equal(positions.overflow,false,'No horizontal scroll inside mobile studio');
  assert.equal(positions.canvas,1);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/v48-homestead-'+width+'.png',fullPage:true});
  await page.evaluate(()=>{window.__homeFixtureV48.ui.dispose();document.getElementById('testStudioV48').remove()});
  assert.equal(await page.locator('#testStudioV48 canvas').count(),0);
  assert.deepEqual(errors,[],'No JavaScript errors during room shop/3D scene/legacy home');
  await page.close();
 }
 console.log('PASS v48 phone Chromium 320/390/430: original home integration, 4 unlockable 3D rooms, rare throne purchase, safe 3D positioning, old furniture, no overflow');
}finally{await browser?.close();server.kill('SIGTERM')}
