import {restoreProfile,createSaveQueue} from './save-client.js';
import * as T from './vendor/three.module.js';
import {createAvatar} from './avatar3d.js';
import {CATALOG_BY_ID} from './fashion-catalog.js';
import {HUNT_ZONES,HUNT_BOSSES,HUNT_SKILLS,HUNT_CRAFTS,MAX_ACTIVE_ENEMIES,huntLevel,canCraft,dailyBossKey,zoneUnlocked} from './hunt-data.js?v=v55-six-regions-20261020';
import {initEconomy,credit,debit} from './economy-v28.js';
import {initBag,bagCapacity,bagUsed,canStore,addBagItems} from './inventory-v29.js';
import {EQUIPMENT,SKILL_PRICES,initCombat,purchaseSkill,purchaseEquipment,equipItem,equippedStats,skillStatus,spendSkill,incomingDamage} from './combat-progression-v30.js?v=v55-elite-gear-20261020';
import {POTIONS,ensurePotions,purchasePotion,consumePotion} from './combat-potions-v29.js';
import {initHuntMastery,zoneAccess,bossAccess,masteryEnemy,hunterDamage,registerHuntKill,dailyHuntContracts,claimHuntContract,HUNT_MASTERY_GATES} from './hunt-balance-v54.js?v=v55-six-regions-20261020';
import {registerHuntWeekV55,weeklyHuntChallengesV55,claimHuntWeekV55,koreaHuntWeekV55} from './hunt-weekly-v55.js';

const $=id=>document.getElementById(id),canvas=$('battle');
const accountScope=(()=>{try{return sessionStorage.getItem('village-auth-user')||''}catch{return ''}})();
const saveKey=accountScope?'junja-harbor-v1-user-'+accountScope:'junja-harbor-v1';
const room=new URLSearchParams(location.search).get('room')||'SPRING';
let cloud=null,storage;try{storage=localStorage}catch{}
if(accountScope){
 try{
  const response=await fetch('/api/account?action=save',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('서버 기록을 불러올 수 없어요');
  cloud=(await response.json()).save;
 }catch(error){document.body.textContent='저장 기록을 확인할 수 없어 사냥터 입장을 중지했어요. 잠시 후 새로고침해 주세요.';throw error}
}
const restored=restoreProfile(cloud,storage,saveKey);
let state=restored.profile;
if(!state||typeof state!=='object'||Array.isArray(state))state={};
state.coins=Math.max(0,Number(state.coins)||0);state.xp=Math.max(0,Number(state.xp)||0);
initEconomy(state);
state.fashion=state.fashion||{owned:[],equipped:{}};
state.fashion.owned=Array.isArray(state.fashion.owned)?state.fashion.owned:[];
state.fashion.equipped=state.fashion.equipped||{};
state.hunt=state.hunt&&typeof state.hunt==='object'?state.hunt:{};
state.hunt.materials=state.hunt.materials||{};
state.hunt.bossDates=state.hunt.bossDates||{};
state.hunt.kills=Math.max(0,state.hunt.kills||0);
initHuntMastery(state.hunt,HUNT_ZONES);
ensurePotions(state);initBag(state);initCombat(state);
state.hunt.potionCooldowns=state.hunt.potionCooldowns||{};
const level=()=>huntLevel(state.xp),stats=()=>equippedStats(state);
const today=()=>{
 const fields=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 return fields.year+'-'+fields.month+'-'+fields.day;
};
let cloudSaveTimer=null;
const saveNotice=document.createElement('div');saveNotice.id='huntSaveStatus';saveNotice.style.cssText='position:fixed;top:70px;left:12px;z-index:90;background:#fff7e5;color:#31543c;padding:6px 10px;border-radius:12px;font-size:12px';document.body.append(saveNotice);
const saveQueue=createSaveQueue({version:restored.version,
 send:payload=>fetch('/api/account?action=save',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)}),
 onCommit:(version,latest)=>{try{if(latest)storage.setItem(saveKey+'-unsynced',JSON.stringify({baseVersion:version,...latest}));else storage.removeItem(saveKey+'-unsynced')}catch{}},
 onStatus:(status,data)=>{saveNotice.textContent=status==='saved'?'✔ 사냥 기록 저장 완료':status==='saving'?'⏳ 사냥 기록 저장 중':status==='retry'?'⚠ 저장 재시도 중':('⚠ '+(data.error||'최신 기록으로 재접속해 주세요'));}
});
async function syncHuntSave(){if(!accountScope)return true;return saveQueue.enqueue(state,restored.owned)}
function save(){
 state.hunt.hp=Math.max(1,Math.ceil(hero.hp));state.hunt.mp=Math.max(0,Math.ceil(hero.mp));
 state.hunt.lastZone=currentZone?.id||state.hunt.lastZone||null;
 state.savedAt=Date.now();
 try{storage.setItem(saveKey,JSON.stringify(state));storage.setItem(saveKey+'-unsynced',JSON.stringify({baseVersion:saveQueue.version,profile:state,owned:restored.owned}))}catch{}
 if(accountScope){clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(syncHuntSave,1200)}
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const materialCache=new Map(),mat=c=>{const k=String(c);if(!materialCache.has(k))materialCache.set(k,new T.MeshStandardMaterial({color:c,roughness:.82,metalness:.03,flatShading:false}));return materialCache.get(k)};
const globe=new T.SphereGeometry(1,20,16),roundBox=new T.BoxGeometry(1,1,1),pillar=new T.CylinderGeometry(1,1,1,9),cone=new T.ConeGeometry(1,1,10),groundGeo=new T.PlaneGeometry(1280,900),shadowGeo=new T.CircleGeometry(1,22);
const eyeRingGeo=new T.TorusGeometry(1,0.14,6,22,Math.PI*1.3);
const impactGeo=new T.IcosahedronGeometry(1,0);
const barGeometry=new T.PlaneGeometry(1,1);
function mobLabel(text,boss){
 const label=document.createElement('canvas');label.width=512;label.height=100;
 const ctx=label.getContext('2d'),font=boss?'900 38px sans-serif':'bold 37px sans-serif';
 ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle=boss?'#70502e':'#355d55';ctx.strokeStyle='#fffdf3';ctx.lineWidth=11;
 ctx.lineJoin='round';ctx.strokeText(text,256,51,480);ctx.fillText(text,256,51,480);
 const tex=new T.CanvasTexture(label);tex.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false}));
 sprite.scale.set(boss?118:103,21,1);
 return {sprite,tex};
}
function mobOverhead(root,model){
 const ui=new T.Group();ui.position.y=model.boss?155:99;root.add(ui);
 const label=mobLabel(model.name,model.boss);label.sprite.position.y=13;ui.add(label.sprite);
 const under=new T.Mesh(barGeometry,new T.MeshBasicMaterial({color:0x244a46,transparent:true,opacity:.72,depthWrite:false,depthTest:false}));
 under.position.z=1;under.scale.set(66,7,1);ui.add(under);
 const hp=new T.Mesh(barGeometry,new T.MeshBasicMaterial({color:model.boss?0xf6c875:0x93ddb0,depthWrite:false,depthTest:false}));
 hp.position.set(0,0,2);hp.scale.set(62,4.8,1);ui.add(hp);
 return {ui,hpFill:hp,labelTexture:label.tex};
}
let renderer,scene,camera,playerMesh,currentZone=null,areaIndex=0,worldDecor=null,monsters=[],fx=[],active=false;
const VIEW_HEIGHT=650;
let resetViewCount=0,lastTouchEnd=0,visualHitCount=0,lastImpact=0,screenShake=0,impactTimer=null;
function fitGameView(){
 if(!camera||!renderer)return;
 const width=Math.max(320,Math.round(document.documentElement.clientWidth||innerWidth));
 const height=Math.max(400,Math.round(document.documentElement.clientHeight||innerHeight));
 camera.zoom=1;
 camera.left=-(VIEW_HEIGHT*width/height)/2;camera.right=-camera.left;
 camera.top=VIEW_HEIGHT/2;camera.bottom=-VIEW_HEIGHT/2;
 camera.updateProjectionMatrix();renderer.setSize(width,height,false);
 canvas.style.width='100%';canvas.style.height='100%';
}
function resetView(){
 resetViewCount++;const vp=document.querySelector('meta[name="viewport"]');
 if(vp)vp.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
 fitGameView();
 window.scrollTo(0,0);
 // The browser alone controls iOS visual-viewport pinch scale; reloading resets it safely.
 if(window.visualViewport?.scale>1.05){save();location.reload();return}
 toast('⤢ 화면 크기를 정상으로 맞췄어요');
}
function antiZoomTouch(){
 for(const name of ['gesturestart','gesturechange','gestureend'])
  document.addEventListener(name,e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
 canvas.addEventListener('touchend',e=>{
  if(e.changedTouches.length!==1)return;
  const now=Date.now();
  if(now-lastTouchEnd<320)e.preventDefault();
  lastTouchEnd=now;
 },{passive:false});
}
let target=null,hero={x:0,z:145,hp:stats().maxHp,mp:stats().maxMp,dir:0,attackAt:0,hurtAt:0,moveX:0,moveZ:145,stride:0};
hero.hp=clamp(Number(state.hunt.hp)||stats().maxHp,1,stats().maxHp);
hero.mp=clamp(Number.isFinite(state.hunt.mp)?state.hunt.mp:stats().maxMp,0,stats().maxMp);
state.hunt.quickPotions=state.hunt.quickPotions||{hp:'hp',mp:'mp'};
const raycaster=new T.Raycaster(),mouse=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
const textEl=$('toast');let toastTimer=0;
function toast(s){textEl.textContent=s;textEl.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>textEl.classList.remove('on'),2400)}
function makeMesh(parent,geo,color,x,y,z,sx,sy,sz){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
function sphere(parent,color,x,y,z,sx,sy=sx,sz=sx){return makeMesh(parent,globe,color,x,y,z,sx,sy,sz)}
function box(parent,color,x,y,z,sx,sy,sz){return makeMesh(parent,roundBox,color,x,y,z,sx,sy,sz)}
function makeMonster(model){
 const boss=model.boss,scale=boss?1.65:model.elite?1.3:1,kind=model.kind,c=model.color;
 const root=new T.Group(),body=new T.Group();root.add(body);body.scale.setScalar(scale);
 const dark=new T.Color(c).multiplyScalar(.7),light=new T.Color(c).lerp(new T.Color(0xffffff),.25);
 const eyes=0x253a3c,glint=0xfffbed;
 if(kind==='slime'){sphere(body,c,0,24,0,22,20,22);sphere(body,light,0,36,9,13,9,11);sphere(body,light,-17,11,10,7,7,7)}
 else if(kind==='mushroom'){sphere(body,0xf6e6c9,0,17,0,12,20,11);sphere(body,c,0,38,0,29,13,25);for(const x of [-14,4,16])sphere(body,glint,x,48,10,4,2,4)}
 else if(kind==='bat'){sphere(body,c,0,24,0,16,17,15);for(const x of [-1,1]){const wing=sphere(body,dark,x*25,24,0,19,7,13);wing.rotation.z=x*.5;box(body,c,x*10,45,0,10,14,8)}}
 else if(kind==='golem'){box(body,c,0,22,0,29,30,26);box(body,light,0,47,2,22,19,20);for(const x of [-23,23])box(body,dark,x,23,0,12,27,14);for(const x of [-10,10])box(body,dark,x,5,0,12,12,15)}
 else if(kind==='beetle'){sphere(body,c,0,22,0,21,13,19);sphere(body,light,0,34,0,15,7,13);for(const x of [-19,19])for(let z of [-11,10]){let leg=box(body,dark,x,9,z,4,12,3);leg.rotation.z=x>0?-.5:.5}}
 else if(kind==='dragon'){sphere(body,c,0,25,0,26,20,24);sphere(body,light,0,48,16,19,16,23);const h1=makeMesh(body,cone,dark,-12,67,15,7,16,7),h2=makeMesh(body,cone,dark,12,67,15,7,16,7);for(const x of [-24,24]){const wing=sphere(body,light,x,38,-11,13,23,5);wing.rotation.z=x>0?-.4:.4}sphere(body,dark,0,14,-25,7,10,19)}
 else if(kind==='ghost'){sphere(body,c,0,31,0,22,28,21);sphere(body,light,0,51,0,15,8,15);for(const x of [-11,0,11])sphere(body,c,x,8,0,8,13,9)}
 else if(kind==='fairy'){sphere(body,c,0,26,0,16,21,14);sphere(body,light,0,48,0,18,18,17);for(const x of [-19,19]){let wing=sphere(body,0xf4eafa,x,32,-4,11,22,4);wing.rotation.z=x>0?-.45:.45}}
 else if(kind==='wolf'){sphere(body,c,0,23,0,27,15,21);sphere(body,light,0,39,13,16,13,14);sphere(body,0xf9eee5,0,32,25,10,7,9);
  for(const x of [-13,13]){makeMesh(body,cone,dark,x,56,11,9,18,8);box(body,dark,x,7,0,8,16,9)}
  const tail=sphere(body,light,0,27,-22,8,8,24);tail.rotation.x=-.3}
 else if(kind==='acorn'){sphere(body,c,0,27,0,20,24,18);sphere(body,dark,0,47,0,24,10,22);makeMesh(body,cone,dark,0,61,0,8,13,8)}
 else {sphere(body,c,0,27,0,20,23,19)}
 // Sculpted features and small silhouette-specific accessories: not flat painted cut-outs.
 if(kind==='slime'){
  for(const x of [-14,14]){sphere(body,light,x,43,3,6,7,6);sphere(body,0xf5bfca,x,24,18,5,3,2)}
  sphere(body,0xfff7df,0,48,0,7,3,6);
 } else if(kind==='mushroom'){
  for(const p of [[-13,39,14],[9,43,15],[0,49,-9]])sphere(body,0xfff7dc,...p,5,3.5,5);
  for(const x of [-11,11])sphere(body,0xeed3ae,x,5,4,7,7,7);
 } else if(kind==='golem'){
  box(body,dark,0,27,15,17,10,2);sphere(body,light,0,29,18,6,6,2);
  for(const x of [-9,9])sphere(body,0xd5ecf0,x,50,13,5,4,3);
 } else if(kind==='bat'){
  for(const x of [-13,13]){const ear=makeMesh(body,cone,light,x,53,0,7,17,7);ear.rotation.z=x<0?.14:-.14}
  sphere(body,0xffd0c5,0,18,18,6,6,3);
 } else if(kind==='dragon'){
  for(let k=0;k<4;k++)makeMesh(body,cone,light,0,52-k*10,-15-k*8,7,13-k,8);
  sphere(body,0xffebbd,0,44,35,7,5,3);
 } else if(kind==='fairy'){
  sphere(body,0xfff0b7,0,67,0,7,10,7);
  for(const x of [-20,20])sphere(body,0xfff8ea,x,42,7,4,10,3);
 } else if(kind==='ghost'){
  for(const x of [-11,0,11])sphere(body,light,x,9,16,5,10,5);
 } else if(kind==='beetle'){
  box(body,dark,0,34,15,4,13,5);
  for(const x of [-14,14])sphere(body,0xece8d3,x,24,14,4,4,4);
 } else if(kind==='acorn'){
  makeMesh(body,cone,0x95c78a,0,65,0,7,18,8);
  for(const x of [-18,18])sphere(body,light,x,24,6,6,8,7);
 }
 for(const x of [-8,8]){
  sphere(body,0xfffaf3,x,32,17.5,5.1,6.3,3.3);
  sphere(body,eyes,x,32,20,3.7,4.8,2.6);
  sphere(body,glint,x-1.1,34,22,1.5,1.6,1);
  sphere(body,0xf2b8ac,x*2.25,23,13,4.3,2.5,2);
 }
 const smile=new T.Mesh(eyeRingGeo,mat(0x74534a));smile.position.set(0,20,20);smile.scale.set(4,3,1);smile.rotation.z=-.25;body.add(smile);
 const halo=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({color:0x293a35,transparent:true,opacity:.13,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.7;halo.scale.setScalar(boss?57:28);root.add(halo);
 if(boss||model.elite){
  for(let i=0;i<(boss?7:4);i++){const a=i*Math.PI*2/7;const g=sphere(body,0xf7dc89,Math.cos(a)*26,72+Math.sin(a*2)*5,Math.sin(a)*12,4,8,4);g.rotation.z=a}
  const gem=sphere(body,0xffe48a,0,59,20,7,9,4);
  for(const x of [-17,0,17])makeMesh(body,cone,0xf6d889,x,79,0,8,16,8);
 }
 const overhead=mobOverhead(root,model);
 return {root,body,...overhead,baseScale:scale};
}
function makeTree(parent,x,z,seed,zone){const height=50+seed%33;const c=zone.tree;
 makeMesh(parent,pillar,0x947b5c,x,height*.49,z,6,height,6);
 sphere(parent,c,x,height+26,z,26,30,26);sphere(parent,new T.Color(c).lerp(new T.Color(0xc2ebba),.3),x+18,height+20,z+5,17,19,16)}
function decorate(zone){
 if(worldDecor)scene.remove(worldDecor);
 worldDecor=new T.Group();scene.add(worldDecor);
 scene.background=new T.Color(zone.sky);scene.fog=new T.Fog(zone.fog,540,1300);
 const ground=new T.Mesh(groundGeo,mat(zone.ground));ground.rotation.x=-Math.PI/2;ground.position.y=-1;worldDecor.add(ground);
 const border=new T.Mesh(new T.RingGeometry(570,650,8,1,Math.PI/8),mat(zone.tree));border.rotation.x=-Math.PI/2;border.position.y=-.5;worldDecor.add(border);
 for(let i=0;i<44;i++){let a=i*2.399963,rad=350+((i*49)%205),x=Math.cos(a)*rad,z=Math.sin(a)*rad;
  if(['crystal','ruins','frost','astral'].includes(zone.id)){const c=zone.id==='crystal'?0xa4c6ec:zone.id==='ruins'?0xd3c2a4:zone.id==='frost'?0xdff3ff:0x9d91ff;const tall=23+(i%6)*7;
   const crystal=makeMesh(worldDecor,cone,c,x,tall/2,z,13,tall,13);crystal.rotation.z=Math.sin(i)*.15}
  else makeTree(worldDecor,x,z,i*29,zone);
 }
 for(let i=0;i<140;i++){const a=i*2.399963,r=40+(i*71)%550,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const color=zone.id==='frost'?i%2?0xe5f9ff:0xb9e0f2:zone.id==='astral'?i%2?0xf3d8ff:0xaba1ed:i%4===0?0xf9dabf:i%4===1?0xeaf0c5:i%4===2?0xbddbc7:0xeac2e5;
  sphere(worldDecor,color,x,1.7,z,2.5,2,2.5);
 }
}
function spawnMonster(model,x,z,index){
 const m=makeMonster(model);m.root.position.set(x,0,z);scene.add(m.root);
 return {...m,model,x,z,homeX:x,homeZ:z,maxHp:model.hp,hp:model.hp,lastHit:0,attackAt:0,deadUntil:0,index,velX:0,velZ:0,hitFlashUntil:0,hitCount:0,windupUntil:0};
}
function clearZone(){
 for(const m of monsters){scene.remove(m.root);m.labelTexture?.dispose();m.root.traverse(o=>{if(o.material?.type==='SpriteMaterial'||o.material?.type==='MeshBasicMaterial'&&o.material.depthTest===false)o.material.dispose()})}
 monsters.length=0;target=null;
 if(worldDecor){scene.remove(worldDecor);worldDecor=null}
 for(const f of fx){scene.remove(f.mesh);if(f.mesh.geometry!==impactGeo)f.mesh.geometry.dispose();f.mesh.material.dispose()}fx.length=0;
}
function ensureZoneBoss(){
 if(!currentZone||!active)return;
 const dayKey=dailyBossKey(currentZone.id,today());
 if(state.hunt.bossDates[dayKey]||monsters.some(m=>m.model.boss))return;
 const trial=bossAccess(state.hunt,HUNT_ZONES,areaIndex);
 if(!trial.ok)return;
 const base=HUNT_BOSSES[areaIndex];
 const boss=masteryEnemy(base,level(),currentZone.level,{boss:true});
 monsters.push(spawnMonster(boss,0,-342,monsters.length));
 toast('👑 정예 토벌 목표 달성! '+base.name+'이 나타났어!');
}
function startZone(index){
 const zone=HUNT_ZONES[index],permit=zoneAccess(state.hunt,HUNT_ZONES,index,level());
 if(!permit.ok){toast('🔒 '+permit.reason);return}
 clearZone();currentZone=zone;areaIndex=index;decorate(zone);
 hero.x=0;hero.z=140;hero.moveX=0;hero.moveZ=140;
 const current=stats();hero.hp=clamp(hero.hp,1,current.maxHp);hero.mp=clamp(hero.mp,0,current.maxMp);
 const positions=[[250,-150],[-250,-140],[285,170],[-310,115],[70,-300],[-95,285]];
 for(let i=0;i<6;i++){
  const p=positions[i],model=zone.mobs[i%zone.mobs.length];
  const elite=i===2||i===5;
  monsters.push(spawnMonster(masteryEnemy(model,level(),zone.level,{elite}),p[0],p[1],i));
 }
 active=true;
 ensureZoneBoss();
 const trial=bossAccess(state.hunt,HUNT_ZONES,index);
 $('region').textContent=zone.icon+' '+zone.name+' · 사냥 숙련 '+state.hunt.masteryV54.score;
 $('hint').textContent='정예 ✦ 토벌 → 보스 해금 · 몬스터 예고 공격은 이동해 회피';
 $('modal').classList.remove('open');save();updateHud();
 toast('⚔️ '+zone.name+' · 보스 조건 '+trial.kills+'/'+trial.neededKills+' 일반 · 정예 '+trial.elites+'/'+trial.neededElites);
}
function healthRatio(m){return clamp(m.hp/m.maxHp,0,1)}
function updateHud(){
 const s=stats();$('heroLevel').textContent='Lv.'+level()+' · 숙련 '+state.hunt.masteryV54.score+' · 토벌 '+state.hunt.kills;
 $('cash').textContent='★ '+Math.floor(state.coins).toLocaleString('ko-KR')+' G';
 $('hpBar').style.width=clamp(hero.hp/s.maxHp*100,0,100)+'%';$('mpBar').style.width=clamp(hero.mp/s.maxMp*100,0,100)+'%';
 $('heroName').textContent='⚔️ '+(localStorage.getItem('junja-village-nickname')||'마을 모험가');
 const current=target&&target.hp>0?target:null;$('target').classList.toggle('visible',!!current);
 if(current){$('targetName').textContent=(current.model.boss?'👑 ':'')+current.model.name;$('targetHp').style.width=healthRatio(current)*100+'%'}
 $('vitals').textContent='HP '+Math.ceil(hero.hp)+'/'+s.maxHp+' · MP '+Math.floor(hero.mp)+'/'+s.maxMp;
 for(const item of ['hp','mp']){
  const el=$(item+'Potion'),rest=Math.max(0,Math.ceil(((state.hunt.potionCooldowns[item]||0)-Date.now())/1000)),id=state.hunt.quickPotions[item]||item,qty=state.hunt.potions?.[id]||0;
  el.disabled=rest>0||qty<1||(item==='hp'?hero.hp>=s.maxHp:hero.mp>=s.maxMp);
  el.querySelector('small').textContent=rest?rest+'초':(id.endsWith('Plus')?'고급 ':'')+qty+'개';
 }
 for(const skill of HUNT_SKILLS){
  const node=$(skill.id),status=skillStatus(state,skill.id,hero.mp);
  node.classList.toggle('cooling',!status.ok);
  node.disabled=!status.ok;
  node.querySelector('em').textContent=status.ok?skill.mp+'MP':status.error;
 }

}
function openModal(content){$('panelBody').innerHTML=content;$('modal').classList.add('open');active=false}
function zoneMenu(){
 const mastery=initHuntMastery(state.hunt,HUNT_ZONES),rows=HUNT_ZONES.map((zone,i)=>{
  const permit=zoneAccess(state.hunt,HUNT_ZONES,i,level()),trial=bossAccess(state.hunt,HUNT_ZONES,i);
  const won=!!state.hunt.bossDates[dailyBossKey(zone.id,today())];
  return '<article class="zone-card"><div class="emoji">'+zone.icon+'</div><strong>'+zone.name+'</strong>'+
   '<small>생활 Lv.'+zone.level+' · 사냥 숙련 '+HUNT_MASTERY_GATES[i]+' · 5종 몬스터 + 정예</small>'+
   '<p>⚔️ 보스 개방: 토벌 '+trial.kills+'/'+trial.neededKills+' · 정예 '+trial.elites+'/'+trial.neededElites+'</p>'+
   '<p>'+(trial.cleared?'🏅 지역 수호자 토벌 이력 보유':won?'✅ 오늘의 보스 처치 완료':permit.ok?'정예를 물리쳐 보스에 도전!': '🔒 '+permit.reason)+'</p>'+
   '<button data-zone="'+i+'" '+(permit.ok?'':'disabled')+'>'+(permit.ok?'사냥터 입장':'🔒 해금 조건 부족')+'</button></article>';
 }).join('');
 openModal('<div class="hero">⚔️ v54 사냥 대개편 · <strong>숙련 '+mastery.score+'</strong><br>생활 레벨과 별개로 전투를 익혀 새 구역에 도전해! 기존 레벨·장비·전리품은 유지돼.</div>'+
  '<h2>🗺️ 모험가 도전 지도</h2><p>각 구역에서 정예를 포함한 몬스터를 토벌하고 보스를 이겨 다음 구역을 해금해. 몬스터의 공격 경고가 보이면 움직여 피할 수 있어.</p>'+
  '<div class="grid">'+rows+'</div><button id="huntContracts" class="wide">📜 오늘의 토벌 의뢰 · 사냥 목표 보기</button>'+
  '<button id="viewHuntLoot" class="wide">🎁 전리품 공방 열기</button><button id="returnVillage" class="wide">🏡 준자마을로 돌아가기</button>');
 document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>startZone(+b.dataset.zone));
 addShopLinks();$('viewHuntLoot').onclick=craftMenu;$('returnVillage').onclick=goHome;
 $('huntContracts').onclick=openHuntContracts;
}
function openHuntWeekV55(){
 const now=today(),week=koreaHuntWeekV55(now),entries=weeklyHuntChallengesV55(state.hunt,now);
 openModal('<h2>🏅 이번 주 원정대 도전</h2>'+
  '<p>매주 월요일 갱신 · 출석 의무 없음 · 모든 사냥터 기록이 함께 쌓여요.</p>'+
  '<div class="hero">📅 시작 '+week+' · 생활 Lv.'+level()+' · 사냥 숙련 '+state.hunt.masteryV54.score+'</div>'+
  entries.map(task=>'<div class="craft-card" style="margin-bottom:10px"><strong>'+task.icon+' '+task.name+'</strong>'+
   '<p>이번 주 '+task.progress+' / '+task.target+' · 완료 보상 '+task.reward.toLocaleString('ko-KR')+'G</p>'+
   '<button data-weekly-hunt="'+task.id+'" '+(task.ready?'':'disabled')+'>'+
   (task.claimed?'✅ 지급 완료':task.ready?'🎁 보상 받기':'토벌 실적이 더 필요해')+'</button></div>').join('')+
  '<button id="weeklyBack" class="wide">📜 일일 토벌 의뢰로</button>');
 $('weeklyBack').onclick=openHuntContracts;
 document.querySelectorAll('[data-weekly-hunt]').forEach(button=>button.onclick=()=>{
  const task=weeklyHuntChallengesV55(state.hunt,today()).find(x=>x.id===button.dataset.weeklyHunt);
  if(!task?.ready)return;
  const earned=credit(state,task.reward,'hunt','주간 원정대 · '+task.name,level());
  if(!earned.ok||earned.amount<1){toast('오늘 보상 발행 한도를 확인해 줘');return}
  const marked=claimHuntWeekV55(state.hunt,today(),task.id);
  if(!marked.ok)return;
  save();updateHud();toast('🏅 '+task.name+' 달성! +'+earned.amount.toLocaleString('ko-KR')+'G');
  openHuntWeekV55();
 });
}
function openHuntContracts(){
 const lines=HUNT_ZONES.map((zone,i)=>{
  const p=state.hunt.masteryV54.areas[zone.id],tasks=dailyHuntContracts(state.hunt,HUNT_ZONES,i,today());
  return '<section class="zone-card" style="margin:8px 0"><strong>'+zone.icon+' '+zone.name+'</strong>'+
   '<small>누적 토벌 '+p.kills+'회 · 정예 '+p.elites+'회 · 보스 '+p.bosses+'회</small>'+
   tasks.map(q=>'<p>📌 '+q.label+' · '+q.progress+'/'+q.required+' · '+q.reward+'G '+
    '<button data-contract="'+i+':'+q.id+'" '+(!q.ready?'disabled':'')+'>'+
    (q.claimed?'✅ 수령 완료':q.ready?'🎁 보상 받기':'진행 중')+'</button></p>').join('')+'</section>';
 }).join('');
 openModal('<h2>📜 오늘의 모험가 도전</h2>'+
  '<p>매일 정찰·정예 추적·보스 임무를 완료하고 보상을 받아! 마을 레벨이 높아도 새로운 토벌 실력이 필요해.</p>'+
  '<p>⚠️ 토벌 기록은 현재 캐릭터 게임 저장에 보관되며, 별도 서버 공인 랭킹은 아직 없어.</p>'+lines+
  '<button class="wide" id="openWeeklyHuntV55">🏅 이번 주 원정대 도전</button>'+ 
  '<button class="wide" id="backToHuntMap">🗺️ 지역 선택으로 돌아가기</button>');
 $('backToHuntMap').onclick=zoneMenu;
 $('openWeeklyHuntV55').onclick=openHuntWeekV55;
 document.querySelectorAll('[data-contract]').forEach(btn=>btn.onclick=()=>{
  const [n,id]=btn.dataset.contract.split(':'),index=Number(n),tasks=dailyHuntContracts(state.hunt,HUNT_ZONES,index,today());
  const task=tasks.find(q=>q.id===id);
  if(!task?.ready)return;
  const payment=credit(state,task.reward,'hunt','모험가 토벌 의뢰 · '+task.label,level());
  if(!payment.ok||payment.amount<1){toast('오늘 사냥 보상 한도에 도달했어');return}
  const claimed=claimHuntContract(state.hunt,HUNT_ZONES,index,today(),id);
  if(!claimed.ok)return;
  save();updateHud();toast('🏅 '+task.label+' 달성! +'+payment.amount+'G');openHuntContracts();
 });
}
function addShopLinks(){
 const links=document.createElement('div');
 links.innerHTML='<button class="wide" id="combatSkillShop">📖 스킬 교본 상점</button><button class="wide" id="combatGearShop">⚔️ 무기 · 보호구 상점</button>';
 $('panelBody').appendChild(links);
 $('combatSkillShop').onclick=skillShop;$('combatGearShop').onclick=gearShop;
}
function skillShop(){
 openModal('<h2>📖 스킬 교본 상점</h2><p>기본 공격은 무료예요. 스킬은 요구 레벨을 달성한 뒤 교본을 한 번 구매해 배워요. 재접속해도 재사용 대기가 유지됩니다.</p><div class="grid">'+HUNT_SKILLS.map(k=>{
  const owned=state.hunt.skills.includes(k.id),cost=SKILL_PRICES[k.id];
  return '<article class="craft-card"><strong>'+k.icon+' '+k.name+'</strong><p>Lv.'+k.level+' · '+cost.toLocaleString()+'G</p><p>공격력 ×'+k.multiplier+' · '+k.mp+'MP<br>재사용 '+k.cooldown+'초</p><button data-learn="'+k.id+'" '+(owned||level()<k.level||state.coins<cost?'disabled':'')+'>'+(owned?'✓ 습득 완료':'교본 구매')+'</button></article>';
 }).join('')+'</div><button class="wide" id="skillBack">🗺️ 모험 지도</button>');
 document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{
  const r=purchaseSkill(state,b.dataset.learn);if(!r.ok){toast(r.error);return}save();updateHud();skillShop();toast('📖 스킬을 배웠어요!');
 });$('skillBack').onclick=zoneMenu;
}
function gearShop(){
 const st=stats();
 openModal('<h2>⚔️ 모험 장비 상점</h2><div class="hero">공격 '+st.attack+' · 방어 '+st.defense+' · 최대 HP '+st.maxHp+'</div><p>무기와 보호구를 각각 하나씩 착용해요. 구입한 장비는 영구 소장하며 가방 공간을 사용하지 않아요. 착용 시 손에 든 검과 방패도 바뀝니다.</p>'+['weapon','armor'].map(slot=>'<h3>'+(slot==='weapon'?'🗡️ 무기':'🛡️ 보호구')+'</h3><div class="grid">'+EQUIPMENT.filter(g=>g.slot===slot).map(g=>{
  const owned=state.hunt.gearOwned.includes(g.id),worn=state.hunt.gear[slot]===g.id;
  return '<article class="craft-card"><strong>'+g.name+'</strong><p>Lv.'+g.level+' · '+g.price.toLocaleString()+'G</p><p>'+(slot==='weapon'?'공격 +'+g.attack:'방어 +'+g.defense+' · HP +'+g.hp)+'</p><button data-gear="'+g.id+'" '+(worn||level()<g.level||!owned&&state.coins<g.price?'disabled':'')+'>'+(worn?'✓ 착용 중':owned?'착용하기':'구매 후 착용')+'</button></article>';
 }).join('')+'</div>').join('')+'<button class="wide" id="gearBack">🗺️ 모험 지도</button>');
 document.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.gear;
  if(!state.hunt.gearOwned.includes(id)){const r=purchaseEquipment(state,id);if(!r.ok){toast(r.error);return}}
  if(!equipItem(state,id))return;
  hero.hp=Math.min(hero.hp,stats().maxHp);refreshGearVisual();save();updateHud();gearShop();toast('⚔️ 장비를 착용했어요');
 });$('gearBack').onclick=zoneMenu;
}
let gearVisuals=[];
function refreshGearVisual(){
 if(!playerMesh)return;
 for(const node of gearVisuals)node.removeFromParent();gearVisuals=[];
 const weapon=EQUIPMENT.find(x=>x.id===state.hunt.gear.weapon),armor=EQUIPMENT.find(x=>x.id===state.hunt.gear.armor);
 const sword=new T.Group();sword.name='equipped-'+weapon.id;
 box(sword,0x775843,0,-2,0,3,11,3);box(sword,0xd3b96b,0,4,0,13,3,4);
 box(sword,weapon.color,0,21,0,4,31,2.5);sword.position.set(0,-15,4);sword.rotation.x=-.65;
 playerMesh.rig.limbs[1].elbow.add(sword);gearVisuals.push(sword);
 const shield=new T.Group();shield.name='equipped-'+armor.id;
 sphere(shield,armor.color,0,0,0,12,15,3);box(shield,0xf6e2af,0,0,3,2,22,1);box(shield,0xf6e2af,0,0,3,16,2,1);
 shield.position.set(0,-9,7);playerMesh.rig.limbs[0].elbow.add(shield);gearVisuals.push(shield);
}
function potionShop(){
 const bag=state.hunt.potions||{},capacity=bagCapacity(state),used=bagUsed(state);
 openModal('<h2>🧪 모험가 물약 상점</h2><p>HP·MP 회복 물약은 소비 아이템이며, 7~9초 재사용 대기가 있어요.</p>'+
 '<div class="hero"><strong>🎒 가방 '+used+'/'+capacity+'칸</strong><p>마을 가방에서 용량을 확장할 수 있어요.</p></div>'+
 '<div class="grid">'+POTIONS.map(p=>'<article class="craft-card"><strong>'+p.icon+' '+p.name+'</strong><p>회복 '+p.heal+' · 3개 '+p.price+'G</p>'+
 '<p>보유 '+(bag[p.id]||0)+'개</p><button data-potion-equip="'+p.id+'">'+(state.hunt.quickPotions[p.id.startsWith('hp')?'hp':'mp']===p.id?'✓ 빠른 사용 중':'빠른 사용에 등록')+'</button><button data-potion-buy="'+p.id+'" '+(state.coins<p.price||!canStore(state,3)?'disabled':'')+'>3개 구매</button></article>').join('')+'</div>'+
 '<button class="wide" id="potionsBack">🎁 전리품 공방</button><button class="wide" id="potionsMap">🗺️ 사냥터 지도</button>');
 document.querySelectorAll('[data-potion-buy]').forEach(b=>b.onclick=()=>{
  const p=POTIONS.find(p=>p.id===b.dataset.potionBuy),res=purchasePotion(state,b.dataset.potionBuy);
  if(!res.ok){toast(res.error);return}
  save();updateHud();toast('🧪 '+p.name+' 3개 구입');potionShop();
 });
 document.querySelectorAll('[data-potion-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.potionEquip;state.hunt.quickPotions[id.startsWith('hp')?'hp':'mp']=id;save();updateHud();potionShop();});
 $('potionsBack').onclick=craftMenu;$('potionsMap').onclick=zoneMenu;
}
function useQuickPotion(kind){
 const id=state.hunt.quickPotions[kind]||kind;
 if(!active)return;
 const now=Date.now(),s=stats(),current=kind==='hp'?hero.hp:hero.mp,max=kind==='hp'?s.maxHp:s.maxMp;
 const res=consumePotion(state,id,current,max,now,state.hunt.potionCooldowns[kind]||0);
 if(!res.ok){toast('🧪 '+res.error);return}
 if(kind==='hp')hero.hp=res.value;else hero.mp=res.value;
 state.hunt.potionCooldowns[kind]=res.nextAt;save();updateHud();
 floatNumber(hero.x,hero.z,(kind==='hp'?'❤️ +':'💧 +')+res.amount,kind==='hp'?'#c2f9c9':'#b7dcff');
 toast((kind==='hp'?'❤️ HP':'💧 MP')+' '+res.amount+' 회복');
}
function claimOverflow(){
 const table=state.hunt.overflow||{},stored=Object.entries(table).filter(([,n])=>n>0);
 if(!stored.length){toast('보관된 전리품이 없어요');return}
 let moved=0;
 for(const [name,n] of stored){const qty=Math.min(n,Math.max(0,bagFreeSafe()));
  if(qty&&addBagItems(state,'hunt',name,qty)){table[name]-=qty;moved+=qty}
 }
 if(moved){save();toast('📦 전리품 '+moved+'개 가방으로 이동');craftMenu()}
 else toast('가방 공간을 더 확보해야 해요');
}
function bagFreeSafe(){return Math.max(0,bagCapacity(state)-bagUsed(state))}
function craftMenu(){
 const bag=state.hunt.materials||{},owned=state.fashion.owned||[];
 const recipes=HUNT_CRAFTS.map(r=>{
  const got=owned.includes(r.gives),possible=canCraft(r,bag,owned,state.coins);
  const cost=r.requires.map(([key,n])=>key+' '+(bag[key]||0)+'/'+n).join(' · ');
  const displayName=CATALOG_BY_ID[r.gives]?.name||'특별 코스튬';
  return '<article class="craft-card"><strong>'+r.icon+' '+r.name+'</strong><p>완성 아이템: '+displayName+'</p><p>'+cost+'</p><p>제작비 '+r.coins.toLocaleString()+'G</p><button data-craft="'+r.id+'" '+(got||!possible?'disabled':'')+'>'+(got?'✅ 소장 중':possible?'제작하고 옷장에 보관':'재료 부족')+'</button></article>';
 }).join('');
 const supplies=Object.entries(bag).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>'<span class="item-pill">'+id+' × '+n+'</span>').join('');
 openModal('<h2>🎁 사냥 전리품 공방</h2><p>사냥 재료를 모아 기존 준자마을 의상을 제작해 보세요. 제작한 의상은 마을 옷장에서도 바로 착용할 수 있어요.</p><h3>🎒 전리품 보관함</h3><div>'+(supplies||'<p>아직 모은 재료가 없어요.</p>')+'</div><h3>👑 테마 코스튬 제작</h3><div class="grid">'+recipes+'</div><button id="potionShopLink" class="wide">🧪 HP/MP 물약 상점</button><button id="collectHuntOverflow" class="wide">📦 임시 보관함 회수</button><button id="backHuntMap" class="wide">🗺️ 사냥터 선택</button>');
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{
  const r=HUNT_CRAFTS.find(x=>x.id===b.dataset.craft);
  if(!r||!canCraft(r,state.hunt.materials,state.fashion.owned,state.coins))return;
  for(const [key,n] of r.requires)state.hunt.materials[key]-=n;
  if(!debit(state,r.coins,'craft','사냥 전리품 코디 제작').ok)return;
  state.fashion.owned.push(r.gives);save();toast('✨ '+r.name+' 제작 완료!');craftMenu();
 });
 $('backHuntMap').onclick=zoneMenu;
 addShopLinks();$('potionShopLink').onclick=potionShop;
 $('collectHuntOverflow').onclick=claimOverflow;
}
async function goHome(){save();clearTimeout(cloudSaveTimer);if(!await syncHuntSave()){toast('저장 확인 후 돌아갈 수 있어요. 잠시 후 다시 눌러주세요');return}location.assign('/?room='+encodeURIComponent(room))}
function floatNumber(x,z,label,color='#ffeaa5'){
 if(!camera)return;
 const v=new T.Vector3(x,92,z).project(camera),el=document.createElement('div');
 el.className='float';el.textContent=label;el.style.color=color;
 el.style.left=(v.x*.5+.5)*innerWidth+'px';el.style.top=(-v.y*.5+.5)*innerHeight+'px';
 document.body.appendChild(el);setTimeout(()=>el.remove(),790);
}
function effect(x,z,color=0xfbe7a9,duration=.42,wide=false){
 const mesh=new T.Mesh(new T.RingGeometry(wide?46:12,wide?51:15,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.86,depthWrite:false,side:T.DoubleSide}));
 mesh.position.set(x,2,z);mesh.rotation.x=-Math.PI/2;scene.add(mesh);fx.push({mesh,ttl:duration,life:duration});
}
function hitBurst(x,z,critical=false){
 // Reuses a tiny low-poly shared geometry. Transient mesh count is bounded on mobile.
 const count=critical?13:7;
 for(let i=0;i<count&&fx.length<110;i++){
  const angle=(i/count)*Math.PI*2+Math.random()*.38;
  const color=critical?0xffd37f:i%3===0?0xfff7d1:i%3===1?0xa9eee5:0xf6b5de;
  const mesh=new T.Mesh(impactGeo,new T.MeshBasicMaterial({color,transparent:true,opacity:.92,depthWrite:false}));
  mesh.position.set(x+Math.cos(angle)*8,36+Math.random()*23,z+Math.sin(angle)*9);
  mesh.scale.setScalar(critical?4:3);
  scene.add(mesh);
  fx.push({mesh,ttl:.40,life:.40,velocity:new T.Vector3(Math.cos(angle)*(critical?110:78),(critical?95:70)+Math.random()*45,Math.sin(angle)*(critical?110:78))});
 }
 const stroke=new T.Mesh(new T.TorusGeometry(critical?45:33,critical?4.5:3.2,6,35,Math.PI*1.55),new T.MeshBasicMaterial({color:critical?0xffe2a1:0xe7fff1,transparent:true,opacity:.93,depthWrite:false,side:T.DoubleSide}));
 stroke.rotation.set(Math.PI*.38,0,-.46);stroke.position.set(x,39,z);scene.add(stroke);
 fx.push({mesh:stroke,ttl:.30,life:.30,slash:true});
}
function mobHit(m,damage){
 if(!m||m.hp<=0)return;
 const critical=Math.random()<.14,amount=Math.max(1,Math.round(damage*(critical?1.5:1)));
 m.hp=Math.max(0,m.hp-amount);m.lastHit=performance.now();m.hitFlashUntil=m.lastHit+260;m.hitCount++;
 const hpRatio=healthRatio(m);m.hpFill.scale.x=62*hpRatio;m.hpFill.position.x=-31*(1-hpRatio);
 effect(m.x,m.z,m.model.boss?0xffd484:0xe8ffca);
 hitBurst(m.x,m.z,critical||m.model.boss);
 screenShake=Math.min(6.5,screenShake+(critical?4.1:1.5));
 visualHitCount++;lastImpact=m.lastHit;
 if(critical||m.model.boss)navigator.vibrate?.(15);
 if(critical){document.body.classList.add('screen-hit');clearTimeout(impactTimer);impactTimer=setTimeout(()=>document.body.classList.remove('screen-hit'),110)}
 floatNumber(m.x,m.z,(critical?'💥 ':'')+'-'+amount,critical?'#ffe595':'#fff');
 if(m.hp===0){
  const loot=m.model.material,boss=m.model.boss,amount=boss?1:Math.random()<.24?2:1;
  const added=addBagItems(state,'hunt',loot,amount);
  if(!added){
   state.hunt.overflow=state.hunt.overflow||{};
   state.hunt.overflow[loot]=(state.hunt.overflow[loot]||0)+amount;
  }
  state.hunt.kills++;
  const mastery=registerHuntKill(state.hunt,HUNT_ZONES,areaIndex,{elite:Boolean(m.model.elite),boss,day:today()});
  registerHuntWeekV55(state.hunt,today(),{elite:Boolean(m.model.elite),boss});
  const paid=credit(state,m.model.coins,'hunt','몬스터 토벌 · '+m.model.name,huntLevel(state.xp));
  // Combat XP grows substantially slower than life XP, while the independent
  // mastery score measures actual combat progress and unlocks tougher regions.
  state.xp+=m.model.xp;
  hero.hp=clamp(hero.hp+(boss?20:m.model.elite?8:3),0,stats().maxHp);
  m.root.visible=false;m.deadUntil=performance.now()+(boss?Infinity:m.model.elite?13000:9000);m.windupUntil=0;
  if(!added)toast('📦 전리품이 임시 보관함에 저장됐어요');
  if(boss){state.hunt.bossDates[dailyBossKey(currentZone.id,today())]=true;
   toast('🏆 '+m.model.name+' 토벌! 숙련 +'+mastery.points+' · '+loot+' 획득 · 다음 구역 도전 가능')}
  else toast((m.model.elite?'✦ 정예':'✨')+' '+m.model.name+' 토벌! 숙련 +'+mastery.points+' · '+loot+' 획득');
  if(target===m)target=null;save();
  if(!boss)ensureZoneBoss();
  $('region').textContent=currentZone.icon+' '+currentZone.name+' · 사냥 숙련 '+mastery.score;
 }
 updateHud();
}
function chooseTarget(){
 if(target?.hp>0&&target.root.visible)return target;
 let near=null,dist=330;
 for(const mob of monsters)if(mob.hp>0&&mob.root.visible){const d=Math.hypot(mob.x-hero.x,mob.z-hero.z);if(d<dist){near=mob;dist=d}}
 return near;
}
function skillUse(id){
 if(!active||!currentZone)return;
 const check=skillStatus(state,id,hero.mp);if(!check.ok){toast(check.error);return}const skill=check.skill;
 let selected=chooseTarget();
 if(!selected){toast('스킬 대상이 될 몬스터가 근처에 없어요');return}
 if(id==='whirl'){selected=chooseTarget()}
 const d=Math.hypot(selected.x-hero.x,selected.z-hero.z);
 if(d>skill.range){target=selected;hero.moveX=selected.x;hero.moveZ=selected.z;toast('몬스터에게 조금 더 가까이 다가가세요');return}
 const spent=spendSkill(state,id,hero.mp);if(!spent.ok)return;hero.mp=spent.mp;save();
 const damage=stats().attack*skill.multiplier;
 const center=id==='whirl'?{x:hero.x,z:hero.z}:selected;
 const affected=id==='strike'?[selected]:monsters.filter(m=>m.hp>0&&m.root.visible&&Math.hypot(m.x-center.x,m.z-center.z)<=(skill.aoe||160));
 for(const mob of affected)mobHit(mob,damage);
 effect(center.x,center.z,id==='star'?0xe9b5ff:id==='whirl'?0xb5ebef:0xfbe099);
 for(let n=0;n<(id==='star'?3:1);n++)hitBurst(center.x+Math.cos(n*2.1)*19,center.z+Math.sin(n*2.1)*19,id==='star');
 if(id==='star')floatNumber(center.x,center.z,'✨ 별빛 폭발','#ffd2ff');
 updateHud();
}
function pointer(e){
 if(e.isPrimary===false||e.pointerType==='touch'&&e.width>95)return;
 e.preventDefault();
 if(!active||!currentZone||$('modal').classList.contains('open'))return;
 const rect=canvas.getBoundingClientRect();
 mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(mouse,camera);
 // Touch the actual 3D monster silhouette, not just its ground footprint.
 // This makes large bosses and aerial monsters tappable over their entire body.
 let closest=null,closestHit=Infinity;
 for(const m of monsters){
  if(m.hp<=0||!m.root.visible)continue;
  const hits=raycaster.intersectObjects(m.body.children,true);
  if(hits.length&&hits[0].distance<closestHit){closest=m;closestHit=hits[0].distance}
 }
 if(!raycaster.ray.intersectPlane(floor,point))return;
 const x=clamp(point.x,-545,545),z=clamp(point.z,-370,370);
 // A generous landing zone keeps small monsters easy to select with fingers.
 if(!closest){let distance=86;for(const m of monsters)if(m.hp>0&&m.root.visible){
  const d=Math.hypot(x-m.x,z-m.z);if(d<distance){distance=d;closest=m}
 }}
 if(closest){target=closest;hero.moveX=closest.x;hero.moveZ=closest.z;toast((closest.model.boss?'👑 보스 · ':'🐾 ')+closest.model.name+' 자동 공격')}
 else{target=null;hero.moveX=x;hero.moveZ=z}
 updateHud();
}
function update(time,dt){
 if(!active||!currentZone)return;
 const s=stats(),now=performance.now();
 hero.hp=clamp(hero.hp+(now-hero.hurtAt>6000?2.5:0)*dt,0,s.maxHp);
 hero.mp=clamp(hero.mp+(.65+Math.min(.35,level()*.012))*dt,0,s.maxMp);
 if(target?.hp>0){const d=Math.hypot(target.x-hero.x,target.z-hero.z);
  if(d>85){hero.moveX=target.x;hero.moveZ=target.z}
  else{hero.moveX=hero.x;hero.moveZ=hero.z;
   if(now>=hero.attackAt){hero.attackAt=now+670;mobHit(target,s.attack);if(target?.hp<=0)target=null}
  }
 }
 const dx=hero.moveX-hero.x,dz=hero.moveZ-hero.z,dist=Math.hypot(dx,dz);
 let vx=0,vz=0;
 if(dist>4){const amt=Math.min(dist,205*dt);vx=dx/dist*205;vz=dz/dist*205;hero.x+=dx/dist*amt;hero.z+=dz/dist*amt;hero.stride+=dt*13;
 hero.dir=Math.abs(vx)>Math.abs(vz)?vx>0?1:3:vz>0?0:2}
 else{hero.moveX=hero.x;hero.moveZ=hero.z}
 playerMesh.animate({x:hero.x,y:hero.z,vx,vy:vz,dir:hero.dir,stride:hero.stride},dt,time);
 for(const mob of monsters){
  if(mob.hp<=0){
   if(!mob.model.boss&&now>=mob.deadUntil){
    mob.hp=mob.maxHp;mob.root.visible=true;mob.x=mob.homeX;mob.z=mob.homeZ;mob.attackAt=now+1500;
   }
   else continue;
  }
  const d=Math.hypot(mob.x-hero.x,mob.z-hero.z);
  const ranged=mob.model.pattern==='ranged',keepDistance=ranged?126:58;
  const berserk=mob.model.boss&&healthRatio(mob)<.4;
  if(d<255&&d>keepDistance){
   const speed=(mob.model.boss?42:mob.model.elite?58:ranged?39:33)*(berserk?1.35:1);
   if(d>0){mob.x+=(hero.x-mob.x)/d*speed*dt;mob.z+=(hero.z-mob.z)/d*speed*dt}
  }else if(ranged&&d<90&&d>1){
   // Ranged enemies retreat from melee, forcing a deliberate approach.
   mob.x-=(hero.x-mob.x)/d*22*dt;mob.z-=(hero.z-mob.z)/d*22*dt;
  }else if(d>285){
   const to=Math.hypot(mob.homeX-mob.x,mob.homeZ-mob.z);
   if(to>8){mob.x+=(mob.homeX-mob.x)/to*16*dt;mob.z+=(mob.homeZ-mob.z)/to*16*dt}
  }
  mob.root.position.set(mob.x,0,mob.z);
  const hitRemaining=Math.max(0,(mob.hitFlashUntil-now)/260);
  const breathing=1+Math.sin(time*(mob.model.boss?1.5:3.1)+mob.index)*.028;
  mob.body.scale.set(mob.baseScale*breathing*(1+hitRemaining*.13),mob.baseScale*breathing*(1-hitRemaining*.22),mob.baseScale*breathing*(1+hitRemaining*.13));
  mob.body.position.y=Math.sin(time*(mob.model.boss?1.4:2.7)+mob.index)*2.5+hitRemaining*13;
  mob.body.rotation.z=Math.sin(time*1.5+mob.index)*.035+hitRemaining*(mob.index%2?-.13:.13);
  mob.ui.quaternion.copy(camera.quaternion);
  if(mob.hp>0)mob.hpFill.material.color.setHex(hitRemaining>.05?0xffe7a1:mob.model.boss?0xf6c875:0x93ddb0);
  const strikeRange=mob.model.boss?150:ranged?155:mob.model.elite?106:85;
  if(mob.windupUntil&&now>=mob.windupUntil){
   mob.windupUntil=0;
   const aimed=mob.windupTarget||{x:mob.x,z:mob.z};
   const hitRadius=mob.model.boss?76:ranged?60:mob.model.elite?65:46;
   const evaded=Math.hypot(hero.x-aimed.x,hero.z-aimed.z)>hitRadius;
   if(evaded){if(mob.model.boss||mob.model.elite)floatNumber(hero.x,hero.z,'✨ 회피!','#b8ffe0')}
   else if(now>hero.hurtAt+350){
    hero.hurtAt=now;
    const damage=incomingDamage(areaIndex,mob.model.boss,s.defense);
    const amount=hunterDamage(damage,level(),currentZone.level,{boss:mob.model.boss,elite:mob.model.elite});
    hero.hp=Math.max(0,hero.hp-amount);
    floatNumber(hero.x,hero.z,'-'+amount,'#ff9e98');
    effect(hero.x,hero.z,0xf79c8a);
    if(hero.hp<=0){
     state.hunt.defeats=(Number(state.hunt.defeats)||0)+1;
     hero.hp=Math.max(1,Math.ceil(s.maxHp*.6));hero.mp=Math.ceil(s.maxMp*.55);
     hero.x=0;hero.z=145;hero.moveX=0;hero.moveZ=145;target=null;hero.hurtAt=now+2400;
     toast('💛 안전 지점에서 회복했어! 체력이 60%라 물약과 회피가 필요해.');
     save();
    }
   }
  }
  if(!mob.windupUntil&&d<strikeRange&&now>=mob.attackAt){
   // Clearly telegraphed aimed attacks. Walking out of the warning ring dodges
   // the damage; elite, ranged, and berserk bosses have different timing.
   const delay=mob.model.boss?(berserk?680:1100):mob.model.elite?850:ranged?980:700;
   mob.windupTarget={x:hero.x,z:hero.z};
   mob.windupUntil=now+delay;
   mob.attackAt=now+(mob.model.boss?(berserk?1900:2800):mob.model.elite?2200:ranged?2800:3100);
   effect(hero.x,hero.z,mob.model.boss?0xf2b478:ranged?0xc7b0ff:0xffe29f,delay/1000,true);
   if(mob.model.boss||mob.model.elite||ranged)
    floatNumber(mob.x,mob.z,mob.model.boss?'👑 광역 공격 예고!':ranged?'✨ 원거리 공격 예고!':'⚠️ 돌진 예고!','#ffd5a5');
  }
 }
 for(let i=fx.length-1;i>=0;i--){
  const f=fx[i];f.ttl-=dt;
  if(f.velocity){f.mesh.position.addScaledVector(f.velocity,dt);f.velocity.y-=190*dt;f.mesh.rotation.y+=dt*8}
  else f.mesh.scale.multiplyScalar(1+dt*(f.slash?1.2:4));
  f.mesh.material.opacity=Math.max(0,f.ttl/(f.life||.42));
  if(f.ttl<=0){scene.remove(f.mesh);if(f.mesh.geometry!==impactGeo)f.mesh.geometry.dispose();f.mesh.material.dispose();fx.splice(i,1)}
}
 camera.position.lerp(new T.Vector3(hero.x,285,hero.z+450),Math.min(1,dt*9));
 camera.lookAt(hero.x,40,hero.z);
 if(screenShake>.08){const j=screenShake*.6;camera.position.x+=Math.sin(now*.11)*j;camera.position.y+=Math.cos(now*.17)*j*.45;camera.lookAt(hero.x,40,hero.z);screenShake=Math.max(0,screenShake-dt*26)}
 if(Math.floor(now/180)!==Math.floor((now-dt*1000)/180))updateHud();
}
function init(){
 try{
 renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;
 scene=new T.Scene();scene.background=new T.Color(0xcbe8c9);
 scene.add(new T.HemisphereLight(0xffffff,0x899c8d,2.6));
 const sun=new T.DirectionalLight(0xfff4d8,2.4);sun.position.set(-180,350,210);scene.add(sun);
 camera=new T.OrthographicCamera(-250,250,VIEW_HEIGHT/2,-VIEW_HEIGHT/2,.1,2000);
 addEventListener('resize',fitGameView);window.visualViewport?.addEventListener('resize',fitGameView);
 fitGameView();
 playerMesh=createAvatar({coat:state.fashion?.equipped?.outfit||state.coat||'mint',hat:state.hat||'none'});
 playerMesh.setFashion(state.fashion.equipped);scene.add(playerMesh.root);refreshGearVisual();
 camera.position.set(0,285,600);camera.lookAt(0,40,145);
 antiZoomTouch();
 canvas.addEventListener('pointerdown',pointer,{passive:false});
 $('resetView').onclick=resetView;
 $('map').onclick=zoneMenu;$('craft').onclick=craftMenu;$('home').onclick=goHome;
 $('hpPotion').onclick=()=>useQuickPotion('hp');$('mpPotion').onclick=()=>useQuickPotion('mp');
 $('close').onclick=()=>{if(currentZone){$('modal').classList.remove('open');active=true}else goHome()};
 document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>skillUse(b.dataset.skill));
 window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
 let last=performance.now(),elapsed=0;
 function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;elapsed+=dt;update(elapsed,dt);renderer.render(scene,camera);requestAnimationFrame(frame)}
 requestAnimationFrame(frame);updateHud();zoneMenu();
 }catch(e){console.error('JUNJA HUNT LOAD',e);$('panelBody').innerHTML='<h2>⚠️ 3D 사냥터 준비 실패</h2><p>브라우저의 3D 그래픽 기능이 필요해요. 최신 Safari나 Chrome에서 다시 시도해 주세요.</p><button class="wide" id="returnVillage">마을로 돌아가기</button>';$('returnVillage').onclick=goHome;$('modal').classList.add('open')}
}
init();
window.__JUNJA_HUNT_QA__={zones:HUNT_ZONES,skills:HUNT_SKILLS,getState:()=>({zone:currentZone?.id,level:level(),coins:state.coins,xp:state.xp,kills:state.hunt.kills,monsterCount:monsters.length,alive:monsters.filter(x=>x.hp>0).length,monsterNames:monsters.filter(x=>x.hp>0).map(m=>m.model.name),hitCount:monsters.reduce((n,m)=>n+m.hitCount,0),visualHitCount,lastImpact,effects:fx.length,enemyLabelCount:monsters.filter(m=>!!m.labelTexture).length,cameraZoom:camera?.zoom||1,viewHeight:VIEW_HEIGHT,resetViewCount,visualScale:window.visualViewport?.scale||1,enemyModelMeshes:monsters.filter(m=>m.hp>0).map(m=>({name:m.model.name,count:(()=>{let n=0;m.body.traverse(o=>{if(o.isMesh)n++});return n})()})),stats:stats(),gear:{...state.hunt.gear},skills:[...state.hunt.skills],cooldowns:{...state.hunt.skillCooldowns},materials:{...state.hunt.materials},hp:hero.hp,mp:hero.mp,active}),getTargets:()=>monsters.filter(m=>m.hp>0&&m.root.visible).map(m=>{const p=new T.Vector3(m.x,0,m.z).project(camera);return {name:m.model.name,boss:m.model.boss,x:(p.x*.5+.5)*canvas.clientWidth,y:(1-p.y)*.5*canvas.clientHeight,health:m.hp,maxHealth:m.maxHp}}),startZone,goHome};
