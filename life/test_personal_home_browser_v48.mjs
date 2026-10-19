// v48 REAL Chromium 320/390/430px, mock only the safe private home JSON API.
// Validated core transaction rules live in Node and disposable PostgreSQL tests.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startingEconomy} from './secure-economy-v36.js';
import {homeAction,houseView} from './personal-home-v48.js';
const port=38848,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),
 env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(base+'health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,130))}
 assert(ready,'Local v48 fixture web server failed to boot');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let wallet=startingEconomy();wallet.coins=250000;
  const proof={sales:3,craft:10},requests=[];
  await page.route('**/api/personal-home-v48',async route=>{
   const request=route.request();
   if(request.method()==='POST'){
    const payload=request.postDataJSON();requests.push(payload);
    try{
     const tx=homeAction(wallet,payload.action,payload.data,proof);wallet=tx.next;
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,version:requests.length,receipt:{action:'home_'+payload.action,detail:tx.detail,delta:tx.delta,
       balance:wallet.coins},home:houseView(wallet,proof)
     })});
    }catch(e){
     return route.fulfill({status:e.status||400,contentType:'application/json',
      body:JSON.stringify({error:e.message})});
    }
   }
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,trial:true,home:houseView(wallet,proof),version:requests.length,
     audit:{ok:requests.length>0}})});
  });
  await page.goto(base+'test_home_v48.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
   const {openPersonalHome}=await import('./personal-home-ui-v48.js');
   window.homePreviewV48=openPersonalHome(document.getElementById('houseHost'));
  });
  await page.waitForFunction(()=>document.querySelectorAll('.v48-item').length===9,{timeout:25000});
  assert.equal(await page.locator('.v48-3d canvas').count(),1,'3D house rendered actual WebGL canvas');
  assert.equal(await page.locator('.v48-tile').count(),16,'Starter room has real 4x4 layout');
  assert.equal(await page.locator('.v48-item.rare').count(),3,'Three rare/legendary furniture displayed');
  const metrics=await page.evaluate(()=>({
   pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,
   scene:document.querySelector('.v48-3d canvas')?.getBoundingClientRect()?.toJSON(),
   buy:document.querySelector('.v48-item .v48-button')?.getBoundingClientRect()?.toJSON()
  }));
  assert(metrics.pageWidth<=width,'No viewport overflow '+JSON.stringify(metrics));
  assert(metrics.scene.width>=220&&metrics.scene.height>=180,'3D room viewer sufficiently large');
  assert(metrics.buy.height>=43,'Buy button large enough for touch');
  await page.locator('.v48-item').filter({hasText:'작은 몬스테라'}).getByRole('button',{name:'구매 · 450G'}).click();
  await page.waitForFunction(()=>document.querySelector('.v48-item')?.textContent&&
   document.getElementById('houseHost').textContent.includes('보유 1/3'));
  assert.equal(wallet.coins,249550,'Only trial wallet debited for furniture');
  await page.getByRole('button',{name:'🪑 선택 칸에 배치하기'}).click();
  await page.waitForFunction(()=>document.getElementById('houseHost')?.textContent?.includes('2/5개 배치'));
  assert.equal(wallet.houseV48.placed.length,2);
  await page.getByRole('button',{name:/1번 칸/}).click();
  await page.getByRole('button',{name:'↻ 가구 90° 회전'}).click();
  assert.equal(wallet.houseV48.placed.find(x=>x.slot===0).turn,1);
  const next=page.getByRole('button',{name:/햇살 정원 하우스 증축/});
  await next.click();
  await page.waitForFunction(()=>document.querySelectorAll('.v48-tile').length===25);
  assert.equal(wallet.houseV48.level,2);
  await page.locator('.v48-item').filter({hasText:'별빛 크리스털 조명'}).getByRole('button',{name:'구매 · 9,800G'}).click();
  assert.equal(wallet.houseV48.owned.crystal_lamp,1,'Receipt-earned rare fixture can be bought');
  assert.deepEqual(Object.keys(requests[0]).sort(),['action','data','requestId']);
  assert.deepEqual(Object.keys(requests[0].data),['item'],'Client must never send prices, inventories or rank');
  assert.match(requests[0].requestId,/^[a-f0-9-]{36}$/);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/v48-home-mobile-'+width+'.png',fullPage:true});
  await page.evaluate(()=>window.homePreviewV48.dispose());
  assert.equal(await page.locator('.v48-3d canvas').count(),0,'WebGL canvas is freed after closing showroom');
  assert.deepEqual(errors,[],'Mobile JavaScript errors: '+JSON.stringify(errors));
  await page.close();
 }
 console.log('PASS v48 real WebGL mobile 320/390/430: starter 4x4 house, 3D render, 9 catalog tiles, plant purchase, placement/rotation, upgrade, rare buy, secure request shape and GPU cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
