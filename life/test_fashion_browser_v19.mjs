import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const port=38629,server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;const errors=[];
const url='http://127.0.0.1:'+port+'/';
const wait=async()=>{
 for(let i=0;i<130;i++){
  try{if((await fetch(url+'health')).ok)return}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('Village server not ready');
};
try{
 await wait();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000});
 const before=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
 assert.equal(before.coins,800);
 const catalog=await page.evaluate(()=>window.__JUNJA_TEST__.getCatalog());
 assert.equal(catalog.length,100);
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getRenderer())).faceCameraElevation,36);
 // v18 movement is a locked invariant after the camera changes.
 const from=before.player,target={x:from.x+70,y:from.y+25};
 assert.equal(await page.evaluate(p=>window.__JUNJA_TEST__.moveTo(p.x,p.y),target),true);
 await page.waitForFunction(()=>window.__JUNJA_TEST__.getState().pathlen===0,null,{timeout:12000});
 const after=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 assert(Math.hypot(after.x-target.x,after.y-target.y)<1);
 assert.equal(after.vx,0);assert.equal(after.vy,0);
 await page.locator('#shopBtn').click();
 await page.waitForSelector('#fitting3D');
 for(const [category,count] of [['hair',20],['outfit',40],['accessory',20],['pet',20]]){
  await page.locator('#tab-'+category).click();
  assert.equal(await page.locator('.fashion-item').count(),count,category+' catalog count');
 }
 // Purchase the lowest-cost outfit and verify exact debit.
 await page.locator('#tab-outfit').click();
 const first='fashion_outfit_01',item=catalog.find(x=>x.id===first);
 assert(item.price<=before.coins);
 await page.locator('[data-try="'+first+'"]').click();
 await page.locator('[data-outfit="'+first+'"]').click();
 let state=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
 assert.equal(state.coins,before.coins-item.price);
 assert.equal(state.fashion.equipped.outfit,first);
 assert(state.fashion.owned.includes(first));
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v19-wardrobe-outfit.png'});
 // Affordability checks: an expensive mythical item must never be given away.
 const expensive='fashion_outfit_40';
 await page.locator('[data-outfit="'+expensive+'"]').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getState())).coins,state.coins);
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getState())).fashion.equipped.outfit,first);
 await page.locator('#close').click();
 // Give this QA-only save ample coins for testing every category; real players earn theirs.
 await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('junja-harbor-v1')||'{}');
  s.coins=50000;localStorage.setItem('junja-harbor-v1',JSON.stringify(s));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,null,{timeout:60000});
 assert.equal((await page.evaluate(()=>window.__JUNJA_TEST__.getState())).fashion.equipped.outfit,first,'save/load outfit');
 await page.locator('#shopBtn').click();
 for(const [category,id] of [['hair','fashion_hair_01'],['accessory','fashion_accessory_01'],['pet','fashion_pet_01']]){
  await page.locator('#tab-'+category).click();
  await page.locator('[data-try="'+id+'"]').click();
  await page.locator('[data-outfit="'+id+'"]').click();
  const s=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
  assert.equal(s.fashion.equipped[category],id);
  assert(s.fashion.owned.includes(id));
 }
 await page.locator('#close').click();
 await page.waitForFunction(()=>window.__JUNJA_TEST__.getRenderer().pet==='fashion_pet_01',null,{timeout:5000});
 await page.screenshot({path:'artifacts/v19-pet-following.png'});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>4,null,{timeout:60000});
 const persisted=await page.evaluate(()=>window.__JUNJA_TEST__.getState());
 assert.equal(persisted.fashion.equipped.pet,'fashion_pet_01');
 assert.equal(persisted.fashion.equipped.hair,'fashion_hair_01');
 assert.equal(persisted.fashion.equipped.accessory,'fashion_accessory_01');
 assert.equal(errors.length,0,'JS errors: '+errors.join(';'));
 console.log('PASS 100 item shop, prices, previews, outfits, hair, accessories, pets, saved equips and v18 movement');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
