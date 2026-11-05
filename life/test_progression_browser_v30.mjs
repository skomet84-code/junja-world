import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const port=38830,host='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(host+'health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('v30-seed'))return;sessionStorage.setItem('v30-seed','yes');
  localStorage.setItem('junja-harbor-v1',JSON.stringify({xp:2240,coins:50000,x:1050,y:955,fishStock:{'송사리':2,'황금 잉어':1},collection:['송사리','황금 잉어'],materials:{},crafted:{},hunt:{hp:40,mp:0,materials:{},potions:{hp:2,mp:2,hpPlus:1},starterPotionsV29:true},fashion:{owned:[],equipped:{}}}));
 });
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('junja-harbor-v1')));
 const qa=()=>page.evaluate(()=>window.__JUNJA_HUNT_QA__.getState());
 await page.goto(host+'hunt.html');await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__);
 assert.equal((await qa()).mp,0,'zero mana survives reload');
 await page.locator('#combatSkillShop').click();await page.locator('[data-learn="strike"]').click();
 assert.equal((await saved()).coins,49350);assert((await saved()).hunt.skills.includes('strike'));
 await page.locator('#skillBack').click();await page.locator('#combatGearShop').click();
 await page.locator('[data-gear="bronze"]').click();await page.locator('[data-gear="leather"]').click();
 let s=await saved();assert.equal(s.coins,47650);assert.equal(s.hunt.gear.weapon,'bronze');assert.equal(s.hunt.gear.armor,'leather');
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/v30-gear-mobile.png'});
 await page.locator('#gearBack').click();await page.locator('#viewHuntLoot').click();await page.locator('#potionShopLink').click();
 await page.locator('[data-potion-equip="hpPlus"]').click();
 await page.locator('#potionsMap').click();await page.locator('[data-zone="0"]').click();
 await page.locator('#hpPotion').click();s=await saved();assert.equal(s.hunt.potions.hpPlus,0);assert(s.hunt.hp>40);assert(s.hunt.potionCooldowns.hp>Date.now());
 await page.locator('#mpPotion').click();assert((await qa()).mp>=70);
 await page.reload();await page.waitForFunction(()=>window.__JUNJA_HUNT_QA__);
 assert.equal((await qa()).gear.weapon,'bronze');assert((await qa()).skills.includes('strike'));
 await page.locator('#returnVillage').click();await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>3);
 await page.locator('#bagBtn').click();
 await page.locator('[data-fish-lock="황금 잉어"]').click();
 const money=(await saved()).coins;
 await page.locator('#buyAutoSellTicket').click();assert.equal((await saved()).coins,money-350);
 page.once('dialog',d=>d.accept());await page.locator('#autoSellBag').click();
 s=await saved();assert.equal(s.fishStock['송사리'],0);assert.equal(s.fishStock['황금 잉어'],1);assert.equal(s.bag.autoSellTickets,0);
 await page.screenshot({path:'artifacts/v30-bag-mobile.png'});
 await page.locator('#bagGoMarket').click();assert(await page.locator('[data-sell-fish="황금 잉어"]').count());
 await page.locator('[data-sell-fish="황금 잉어"]').click();assert.equal((await saved()).fishStock['황금 잉어'],1);
 assert.deepEqual(errors,[]);
 console.log('PASS v30 mobile UI skill purchase, gear purchase/equip/reload, advanced HP potion, zero mana, shared cooldown, paid voucher, protected fish and market shortcut');
}finally{await browser?.close();server.kill('SIGTERM');}
