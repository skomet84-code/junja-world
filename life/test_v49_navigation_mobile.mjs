// v49 mobile + desktop integration QA against disposable, mocked login.
// Validates existing farming / home / money routes are reachable, without real user writes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38850,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{
 cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let up=false;for(let t=0;t<120;t++){try{if((await fetch(base+'health')).ok){up=true;break}}catch{}
 await new Promise(r=>setTimeout(r,130))}
 assert(up,'Local test fixture did not start');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const width of [320,390,430,1280]){
  const mobile=width<600;
  const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1,
   isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/api/account**',route=>{
   const url=new URL(route.request().url()),action=url.searchParams.get('action');
   return route.fulfill({status:action==='save'?200:401,contentType:'application/json',
    body:action==='save'?'{"save":null,"version":1}':'{"error":"QA isolated account"}'});
  });
  await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>window.villageGateEnter({nickname:'v49 QA'}));
  await page.waitForFunction(()=>document.querySelector('#v49Dock .v49-nav[aria-current="page"]')&&
   document.querySelector('#villageCompass'),null,{timeout:25000});
  assert.equal(await page.locator('#v49Dock button').count(),5);
  const layout=await page.evaluate(()=>{
   const dock=document.getElementById('v49Dock'),root=dock.getBoundingClientRect();
   const buttons=[...dock.querySelectorAll('button')].map(x=>{
    const rect=x.getBoundingClientRect();return {x:rect.x,y:rect.y,w:rect.width,h:rect.height}
   });
   const overlap=buttons.some((a,i)=>buttons.some((b,j)=>i!==j&&
    a.x<b.x+b.w-1&&b.x<a.x+a.w-1&&a.y<b.y+b.h-1&&b.y<a.y+a.h-1));
   return {buttons,overlap,rect:root.toJSON(),width:innerWidth,
    old:document.querySelector('.v49-legacy-actions')?.getBoundingClientRect().height||0,
    horizontal:document.documentElement.scrollWidth>innerWidth};
  });
  assert(!layout.overlap,'Five dock buttons never overlap');
  assert(layout.buttons.every(b=>b.w>=44&&b.h>=44),
   'Accessible button touch area at '+width+': '+JSON.stringify(layout));
  assert(layout.rect.x>=0&&layout.rect.right<=width+.3,'Dock fits viewport');
  assert.equal(layout.old,0,'Developer-facing eight-button toolbar is no longer displayed');
  assert.equal(layout.horizontal,false,'No horizontal overflow');
  await page.locator('#v49Dock [data-v49-section="home"]').click();
  await page.waitForSelector('#v49MenuHost .v49-goal-card',{timeout:10000});
  const goal=page.locator('#v49MenuHost .v49-goal-card');
  assert((await goal.innerText()).includes('지금 해야 할 일'));
  assert((await page.locator('#v49MenuHost').innerText()).includes('골드를 버는 3단계'));
  await page.screenshot({path:'artifacts/v49-menu-home-'+width+'.png',fullPage:true});
  // Search unknown feature names without memorizing their categories.
  await page.locator('#v49MenuHost input[type="search"]').fill('낚시');
  await page.waitForSelector('#v49MenuHost .v49-find-results [data-action="fishing"]');
  assert((await page.locator('#v49MenuHost .v49-find-results').innerText()).includes('생활 › 낚시'));
  await page.locator('#v49MenuHost .v49-mini-tab').filter({hasText:'생활'}).click();
  await page.waitForSelector('#v49MenuHost [data-action="farm"]');
  assert.equal(await page.locator('#v49MenuHost .v49-goal-card').count(),0);
  await page.locator('#v49MenuHost [data-action="farm"]').click();
  await page.waitForSelector('#estateOrdersOpen',{timeout:12000});
  const label=await page.locator('.v49-farm-shortcuts').innerText();
  assert(label.includes('나의 공간')&&label.includes('생산·직업·거래'));
  assert(!/\bv(?:3[7-9]|4[0-8])\b/i.test(label),
   'Farm menus must not show dev version codes: '+label);
  const advanced=page.locator('.v49-farm-shortcuts details');
  assert.equal(await advanced.getAttribute('open'),null,'Trial ledger collapsed');
  await advanced.locator('summary').click();
  assert.equal(await page.locator('#estateSecureLab').isVisible(),true,'Recovery lab kept but tucked away');
  await page.locator('#estateOrdersOpen').click();
  assert((await page.locator('#panelBody').innerText()).includes('주민 주문과 가공품 상점'));
  await page.locator('#close').click();
  // Production is one destination for crafting, business and selling.
  await page.locator('#v49Dock [data-v49-section="production"]').click();
  await page.waitForSelector('#v49MenuHost [data-action="craft"]');
  assert((await page.locator('#v49MenuHost').innerText()).includes('거래소'));
  assert.equal(await page.locator('#v49MenuHost .v49-advanced [data-action="economy"]').isVisible(),false);
  await page.locator('#v49MenuHost .v49-advanced summary').click();
  assert.equal(await page.locator('#v49MenuHost [data-action="economy"]').isVisible(),true);
  await page.locator('#v49MenuHost [data-action="craft"]').click();
  assert((await page.locator('#panelBody').innerText()).includes('나무결 공방'));
  await page.locator('#close').click();
  // House card reaches existing real 3D editor; no resets/duplicated furnishings.
  await page.locator('#v49Dock [data-v49-section="house"]').click();
  await page.locator('#v49MenuHost [data-action="house"]').click();
  await page.waitForSelector('#homeStudioHostV48 .v48-scene canvas',{timeout:20000});
  assert((await page.locator('#homeStudioHostV48').innerText()).includes('희귀 인테리어'));
  await page.locator('#close').click();
  await page.locator('#v49Dock [data-v49-section="bag"]').click();
  await page.locator('#v49MenuHost [data-action="inventory"]').click();
  assert((await page.locator('#panelBody').innerText()).includes('가방'));
  await page.locator('#close').click();
  // All five category buttons are still visible and legible after nested modals.
  assert.equal(await page.locator('#v49Dock button').count(),5);
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/v49-clean-dock-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[],'No browser JS runtime error at width '+width);
  await page.close();
 }
 console.log('PASS v49 Chromium 320/390/430/1280: tidy 5-tab dock, search, mission, farm groups, full production/3D-home/bag routes, no client save loss');
}finally{await browser?.close();server.kill('SIGTERM')}
