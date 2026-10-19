// v46 actual 390px mobile Chromium WebGL and account-backed achievement board.
// All server APIs are intercepted with mocks; NO real player sessions/database writes.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=38847,base='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,['server.mjs'],{
 cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
try{
 let up=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'health')).ok){up=true;break}}catch{}
  await new Promise(r=>setTimeout(r,130));
 }
 assert(up,'v46 mobile fixture server missing');
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let badge=null,requests=[],readCalls=0;
 const days=Array.from({length:30},(_,i)=>({
  date:new Date(Date.UTC(2026,8,20+i)).toISOString().slice(0,10),
  sales:i%3===0?1:0,net:i%3===0?1290:0,tax:i%3===0?155:0,fee:0
 }));
 await page.route('**/api/business-honors-v46',async route=>{
  const req=route.request();
  if(req.method()==='POST'){
   const payload=req.postDataJSON();requests.push(payload);
   badge=payload.id==='none'?null:payload.id;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,receipt:{action:'honor_equip',delta:0,detail:'칭호 장착 완료'}
   })});
  }
  readCalls++;
  const honors=[
   {id:'first_sale',name:'첫 장사 성공',icon:'🌟',role:'all',required:1,progress:1,total:1,unlocked:true,description:'첫 주문 1건'},
   {id:'green_thumb',name:'풍요로운 농부',icon:'🌾',role:'farmer',required:5,progress:2,total:2,unlocked:false,description:'농부 생산 5회'}
  ];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,trial:true,audit:{ok:true},version:badge?3:2,
   honors:{equipped:badge?{id:'first_sale',icon:'🌟',name:'첫 장사 성공',role:'all'}:null,
    unlockedCount:1,totalCount:2,honors},
   economy:{days:30,daily:days,totals:{sales:10,net:12900,tax:1550,fee:0}}
  })});
 });
 await page.goto(base+'test_workshop_world_v41.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.workshopDemo?.scene?.stats()?.frames>4,null,{timeout:60000});
 assert.equal((await page.evaluate(()=>window.workshopDemo.scene.stats())).customerFigures,3);
 await page.evaluate(async()=>{
  const {mountBusinessHonors}=await import('./business-honors-ui-v46.js');
  const host=document.createElement('div');host.id='honorsBoardV46';document.querySelector('main').append(host);
  window.honorBoardTest=mountBusinessHonors(host);
 });
 await page.waitForFunction(()=>document.getElementById('honorsBoardV46')?.textContent.includes('최근 30일'));
 assert.equal(await page.locator('#honorsBoardV46 [role="img"] > div').count(),30);
 assert((await page.locator('#honorsBoardV46').innerText()).includes('실수령 12,900G'));
 await mkdir('artifacts',{recursive:true});
 await page.screenshot({path:'artifacts/v46-achievements-economy-phone.png',fullPage:true});
 await page.getByRole('button',{name:'🏅 칭호 착용하기'}).click();
 await page.waitForFunction(()=>document.querySelector('#honorsBoardV46')?.textContent?.includes('착용 칭호: 🌟 첫 장사 성공'));
 assert.equal(requests.length,1);
 assert.deepEqual(Object.keys(requests[0]).sort(),['id','requestId'],
  'Browser sends ONLY chosen honor ID and request UUID, never role, XP or money');
 assert.match(requests[0].requestId,/^[0-9a-f-]{36}$/);
 assert(readCalls>=2,'Equipping triggers fresh authenticated server audit');
 await page.evaluate(()=>window.honorBoardTest.dispose());
 await page.locator('#close').click();
 assert.equal(await page.locator('#plaza canvas').count(),0,'No leftover WebGL canvas');
 assert.deepEqual(errors,[],'No browser crashes while using honor board');
 console.log('PASS v46 phone WebGL: 3 live shop figures, 30-day economic chart, progress, secure title equip and GPU cleanup');
}finally{await browser?.close();server.kill('SIGTERM')}
