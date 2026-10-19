// 390px mobile Chrome: real animated shop customers + VIP dashboard without any live DB.
// Mock fetch only; output screenshot and assert client payload cannot set price or XP.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38846,root='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{
 cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let j=0;j<120;j++){
  try{if((await fetch(root+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,130));
 }
 assert(ready,'Local V45 test server missing');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let purchases=0,sold=false,requestShape=null;
 page.route('**/api/customer-loyalty-v45',async route=>{
  const req=route.request();
  if(req.method()==='POST'){
   purchases++;
   requestShape=req.postDataJSON();
   sold=true;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,receipt:{action:'npc_vip_purchase',detail:'토비 단골 주문 납품',net:1632}
   })});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,coins:sold?12345:10713,audit:{ok:true},
   mine:{net:sold?1632:0,sales:sold?1:0},
   rankings:{weekStart:'2026-10-18T15:00:00.000Z',top:[
    {rank:1,name:'온실 장인',net:sold?1632:0,sales:sold?1:0}]},
   loyalty:{weeklyUsed:sold,customers:[{
    npcId:'tobi',customer:'🎣 토비',itemName:'프리미엄 딸기 상자',tier:'단골',
    days:3,remainingVisits:0,quantity:2,gross:2274,tax:342,fee:300,net:1632,
    stock:sold?0:2,canAccept:!sold,fulfilled:sold
   }]}
  })});
 });
 await page.goto(root+'test_workshop_world_v41.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.workshopDemo?.scene?.stats()?.frames>5,{timeout:30000});
 const stats=await page.evaluate(()=>window.workshopDemo.scene.stats());
 assert.equal(stats.customerFigures,3,'Three specialist customers must render in WebGL street');
 assert.equal(stats.buildings,3);
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v45-business-customers-mobile.png',fullPage:true});
 await page.evaluate(async()=>{
  const {mountCustomerLoyalty}=await import('./customer-loyalty-ui-v45.js');
  const host=document.createElement('section');host.id='loyaltyPreviewV45';document.querySelector('main').append(host);
  window.customerPanel=mountCustomerLoyalty(host);
 });
 await page.waitForFunction(()=>document.querySelector('#loyaltyPreviewV45')?.textContent?.includes('누적 방문 3일'));
 await page.screenshot({path:'artifacts/v45-vip-board-mobile.png',fullPage:true});
 assert((await page.locator('#loyaltyPreviewV45').innerText()).includes('사업가 랭킹'));
 await page.getByRole('button',{name:'💜 특별 주문 납품'}).click();
 await page.waitForFunction(()=>document.querySelector('#loyaltyPreviewV45')?.textContent?.includes('이번 주 VIP 납품 완료'));
 assert.equal(purchases,1);
 assert.deepEqual(Object.keys(requestShape).sort(),['npcId','requestId'],'Client must NOT send gold/reputation/proof/price');
 assert.equal(requestShape.npcId,'tobi');
 assert.match(requestShape.requestId,/^[0-9a-f-]{36}$/);
 await page.evaluate(()=>window.customerPanel.dispose());
 await page.locator('#close').click();
 assert.equal(await page.locator('#plaza canvas').count(),0,'3D scene releases its canvas');
 assert.deepEqual(errors,[]);
 console.log('PASS v45 phone Chromium: 3 animated shop visitors, VIP loyalty display, secure payload, market leaderboard and WebGL cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
