// Reproduce real touchscreen events, including a saved character trapped by new scenery.
// This catches faults that direct calls to window.__JUNJA_TEST__.moveTo cannot detect.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const port=38628;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
const errors=[];
async function waitServer(){
 for(let i=0;i<150;i++){
  try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Server did not start');
}
async function waitGame(page){
 await page.waitForFunction(()=>window.__JUNJA_TEST__?.getRenderer()?.frames>5,{},{timeout:60000});
}
async function tapActualGround(page,label){
 const probe=await page.evaluate(()=>{
  const actor=window.__JUNJA_TEST__.getState().player;
  for(const y of [425,470,510,550,365,590]){
   for(const x of [255,145,285,115,195,320]){
    const probe=window.__JUNJA_TEST__.probeTap(x,y);
    const goal=probe.endpoint,world=probe.world;
    if(probe.hit||!probe.safe||!probe.reachable||!goal)continue;
    const d=Math.hypot(goal.x-actor.x,goal.y-actor.y);
    if(d>=65&&d<=290&&Math.hypot(goal.x-world.x,goal.y-world.y)<2)return probe;
   }
  }
  return null;
 });
 assert(probe,label+': no reachable visible bare ground point');
 const initial=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 await page.touchscreen.tap(probe.screen.x,probe.screen.y);
 await page.waitForFunction(({x,y})=>Math.hypot(window.__JUNJA_TEST__.getState().player.x-x,window.__JUNJA_TEST__.getState().player.y-y)>15,{x:initial.x,y:initial.y},{timeout:7000});
 await page.waitForFunction(()=>window.__JUNJA_TEST__.getState().pathlen===0,null,{timeout:16000});
 const final=await page.evaluate(()=>window.__JUNJA_TEST__.getState().player);
 assert(Math.hypot(final.x-probe.world.x,final.y-probe.world.y)<1.5,label+': touch should stop on exact ground coordinate');
 assert.equal(final.vx,0);assert.equal(final.vy,0);
 console.log(label,'TOUCH SUCCESS',JSON.stringify({screen:probe.screen,requested:probe.world,arrived:{x:final.x,y:final.y}}));
 return final;
}
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
 await waitGame(page);
 assert(!await page.locator('#renderError').isVisible(),'WebGL initialization error');
 await tapActualGround(page,'New player');
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v18-real-iphone-size-tap.png'});
 await page.evaluate(()=>{
  const old=JSON.parse(localStorage.getItem('junja-harbor-v1')||'{}');
  localStorage.setItem('junja-harbor-v1',JSON.stringify({...old,x:1010,y:695}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await waitGame(page);
 assert(await page.evaluate(()=>window.__JUNJA_TEST__.getNavSafe()),'A save inside the fountain must automatically recover');
 await tapActualGround(page,'Recovered player');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS: real iPhone-size pointer touch and save-position escape');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
