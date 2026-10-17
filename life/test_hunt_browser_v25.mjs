import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const port=38726,root='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
async function waitServer(){for(let i=0;i<130;i++){try{if((await fetch(root+'health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Hunt QA server not ready')}
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   if(sessionStorage.getItem('hunt-qa-seeded'))return;
   sessionStorage.setItem('hunt-qa-seeded','yes');
   const data={coins:5000,xp:320,coat:'mint',hat:'none',x:1050,y:955,
    fashion:{owned:[],equipped:{}},
    hunt:{skills:['strike'],kills:0,materials:{'젤리 조각':12,'숲의 조각':9,'왕의 도토리':1},bossDates:{}}};
   localStorage.setItem('junja-harbor-v1',JSON.stringify(data));
   localStorage.setItem('junja-village-nickname','테스트모험가');
 });
 const pageRes=await page.goto(root+'hunt.html?room=SPRING',{waitUntil:'domcontentloaded'});
 assert.equal(pageRes.status(),200);
 await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__?.zones?.length===4,null,{timeout:60000});
 assert.equal(await page.locator('[data-zone]').count(),4);
 assert(await page.locator('[data-zone="3"]').isDisabled(),'high-tier zone locked at level 3');
 assert(await page.locator('[data-zone="0"]').isEnabled(),'starter hunting unlocked');
 await page.locator('[data-zone="0"]').click();
 await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__?.getState()?.active===true,null,{timeout:15000});
 const battle=await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState());
 assert.equal(battle.zone,'meadow');
 assert.equal(battle.monsterCount,7);
 assert.equal(battle.level,3);
 assert.equal(battle.enemyLabelCount,7,'Every sculpted monster has an overhead name & life bar');
 assert.equal(battle.viewHeight,650,'Fixed world view is zoomed out on mobile');
 assert.equal(battle.cameraZoom,1,'Camera scale starts at 1');
 assert(battle.enemyModelMeshes.every(x=>x.count>=12),'Monsters should have detailed geometric faces and accessories');
 const screenBefore=await page.evaluate(()=>document.documentElement.clientWidth);
 await page.locator('#resetView').click();
 assert.equal((await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState())).resetViewCount,1,'User screen reset works');
 assert.equal((await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState())).cameraZoom,1,'Reset button restores camera zoom');
 await page.touchscreen.tap(188,405);await page.touchscreen.tap(188,405);
 assert.equal(await page.evaluate(()=>document.documentElement.clientWidth),screenBefore,'Double tap must not expand layout viewport');
 assert.equal((await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState())).cameraZoom,1,'Double tap cannot modify in-game camera');
 assert.equal(await page.locator('[data-skill]').count(),3);
 assert(await page.locator('#strike').isEnabled());
 assert(await page.locator('#star').isDisabled(),'star skill level gated');
 // Test real screen input: select one visible monster and wait for automatic attacking effects.
 await page.waitForTimeout(400);
 const targets=await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getTargets());
 const clickOn=targets.find(t=>t.x>28&&t.x<362&&t.y>215&&t.y<670&&!t.boss);
 assert(clickOn,'At least one attackable monster must be visible on mobile');
 await page.touchscreen.tap(Math.round(clickOn.x),Math.round(clickOn.y));
 await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__.getState().visualHitCount>0,null,{timeout:15000});
 const hit=await page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState());
 assert(hit.hitCount>0&&hit.lastImpact>0,'Touching monster should trigger actual damage and recoil');
 assert(hit.effects>=0,'Visual attack effects maintain a finite scene state');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v26-hunting-3d-hit-mobile.png'});
 await page.locator('#craft').click();
 assert.equal(await page.locator('[data-craft]').count(),4);
 await page.locator('[data-craft="forest-look"]').click();
 const crafting=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert(crafting.fashion.owned.includes('fashion_outfit_19'),'hunting loot produces real wardrobe inventory');
 assert.equal(crafting.hunt.materials['왕의 도토리'],0,'craft material is spent');
 await page.locator('#backHuntMap').click();
 await page.locator('#returnVillage').click();
 await page.waitForURL(/\/\?room=SPRING/,{timeout:60000});
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>4,null,{timeout:60000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 assert(saved.fashion.owned.includes('fashion_outfit_19'),'cosmetic should survive return to the village');
 assert(saved.xp>=320,'Combat experience must persist after returning to village');
 assert(!errors.length,'No JS errors: '+errors.join('; '));
 console.log('PASS v26: mobile anti-zoom reset, detailed 3D enemy labels, touch-target auto-hit effects, 4 regions, 3 skills and village return');
}finally{await browser?.close();server.kill('SIGTERM')}
