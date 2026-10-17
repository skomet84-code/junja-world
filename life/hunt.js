import * as T from './vendor/three.module.js';
import {createAvatar} from './avatar3d.js';
import {CATALOG_BY_ID} from './fashion-catalog.js';
import {HUNT_ZONES,HUNT_BOSSES,HUNT_SKILLS,HUNT_CRAFTS,MAX_ACTIVE_ENEMIES,huntLevel,combatStats,enemyDamage,canCraft,dailyBossKey,zoneUnlocked} from './hunt-data.js';

const $=id=>document.getElementById(id),canvas=$('battle');
const saveKey='junja-harbor-v1',room=new URLSearchParams(location.search).get('room')||'SPRING';
let state={};
try{state=JSON.parse(localStorage.getItem(saveKey)||'{}')}catch{}
if(!state||typeof state!=='object'||Array.isArray(state))state={};
state.coins=Math.max(0,Number(state.coins)||0);state.xp=Math.max(0,Number(state.xp)||0);
state.fashion=state.fashion||{owned:[],equipped:{}};
state.fashion.owned=Array.isArray(state.fashion.owned)?state.fashion.owned:[];
state.fashion.equipped=state.fashion.equipped||{};
state.hunt=state.hunt&&typeof state.hunt==='object'?state.hunt:{};
state.hunt.materials=state.hunt.materials||{};
state.hunt.bossDates=state.hunt.bossDates||{};
state.hunt.kills=Math.max(0,state.hunt.kills||0);
const level=()=>huntLevel(state.xp),stats=()=>combatStats(level()),today=()=>new Date().toLocaleDateString('en-CA');
function save(){
 state.hunt.hp=Math.max(1,Math.ceil(hero.hp));state.hunt.mp=Math.max(0,Math.ceil(hero.mp));
 state.hunt.lastZone=currentZone?.id||state.hunt.lastZone||null;
 state.savedAt=Date.now();
 try{localStorage.setItem(saveKey,JSON.stringify(state))}catch{}
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
hero.mp=clamp(Number(state.hunt.mp)||stats().maxMp,0,stats().maxMp);
const cooldowns=Object.fromEntries(HUNT_SKILLS.map(s=>[s.id,0]));
const raycaster=new T.Raycaster(),mouse=new T.Vector2(),floor=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
const textEl=$('toast');let toastTimer=0;
function toast(s){textEl.textContent=s;textEl.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>textEl.classList.remove('on'),2400)}
function makeMesh(parent,geo,color,x,y,z,sx,sy,sz){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
function sphere(parent,color,x,y,z,sx,sy=sx,sz=sx){return makeMesh(parent,globe,color,x,y,z,sx,sy,sz)}
function box(parent,color,x,y,z,sx,sy,sz){return makeMesh(parent,roundBox,color,x,y,z,sx,sy,sz)}
function makeMonster(model){
 const boss=model.boss,scale=boss?1.65:1,kind=model.kind,c=model.color;
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
 if(boss){
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const g=sphere(body,0xf7dc89,Math.cos(a)*26,72+Math.sin(a*2)*5,Math.sin(a)*12,4,8,4);g.rotation.z=a}
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
  if(zone.id==='crystal'||zone.id==='ruins'){const c=zone.id==='crystal'?0xa4c6ec:0xd3c2a4;const tall=23+(i%6)*7;
   const crystal=makeMesh(worldDecor,cone,c,x,tall/2,z,13,tall,13);crystal.rotation.z=Math.sin(i)*.15}
  else makeTree(worldDecor,x,z,i*29,zone);
 }
 for(let i=0;i<140;i++){const a=i*2.399963,r=40+(i*71)%550,x=Math.cos(a)*r,z=Math.sin(a)*r;
  const color=i%4===0?0xf9dabf:i%4===1?0xeaf0c5:i%4===2?0xbddbc7:0xeac2e5;
  sphere(worldDecor,color,x,1.7,z,2.5,2,2.5);
 }
}
function spawnMonster(model,x,z,index){
 const m=makeMonster(model);m.root.position.set(x,0,z);scene.add(m.root);
 return {...m,model,x,z,homeX:x,homeZ:z,maxHp:model.hp,hp:model.hp,lastHit:0,attackAt:0,deadUntil:0,index,velX:0,velZ:0,hitFlashUntil:0,hitCount:0};
}
function clearZone(){
 for(const m of monsters){scene.remove(m.root);m.labelTexture?.dispose();m.root.traverse(o=>{if(o.material?.type==='SpriteMaterial'||o.material?.type==='MeshBasicMaterial'&&o.material.depthTest===false)o.material.dispose()})}
 monsters.length=0;target=null;
 if(worldDecor){scene.remove(worldDecor);worldDecor=null}
 for(const f of fx){scene.remove(f.mesh);if(f.mesh.geometry!==impactGeo)f.mesh.geometry.dispose();f.mesh.material.dispose()}fx.length=0;
}
function startZone(index){
 const zone=HUNT_ZONES[index];if(!zoneUnlocked(zone,level())){toast('Lv.'+zone.level+'부터 입장할 수 있어요');return}
 clearZone();currentZone=zone;areaIndex=index;decorate(zone);
 hero.x=0;hero.z=140;hero.moveX=0;hero.moveZ=140;
 const s=stats();hero.hp=clamp(hero.hp,1,s.maxHp);hero.mp=clamp(hero.mp,0,s.maxMp);
 const positions=[[250,-150],[-250,-140],[285,170],[-310,115],[70,-300],[-95,285]];
 for(let i=0;i<6;i++){const p=positions[i],mob=zone.mobs[i%5];monsters.push(spawnMonster(mob,p[0],p[1],i))}
 const boss=HUNT_BOSSES[index],defeated=!!state.hunt.bossDates[dailyBossKey(zone.id,today())];
 if(!defeated)monsters.push(spawnMonster(boss,0,-342,6));
 active=true;$('region').textContent=zone.icon+' '+zone.name+' · Lv.'+zone.level+'+';
 $('hint').textContent='터치 이동 · 몬스터 터치 후 자동 공격 · 스킬 3개';
 $('modal').classList.remove('open');save();updateHud();
 toast('🌸 '+zone.name+' 입장! '+(defeated?'오늘 보스는 이미 처치했어요':'보스 1일 1회 도전'));
}
function healthRatio(m){return clamp(m.hp/m.maxHp,0,1)}
function updateHud(){
 const s=stats();$('heroLevel').textContent='Lv.'+level()+' · 사냥 '+state.hunt.kills+'회';
 $('cash').textContent='★ '+Math.floor(state.coins).toLocaleString('ko-KR')+' G';
 $('hpBar').style.width=clamp(hero.hp/s.maxHp*100,0,100)+'%';$('mpBar').style.width=clamp(hero.mp/s.maxMp*100,0,100)+'%';
 $('heroName').textContent='⚔️ '+(localStorage.getItem('junja-village-nickname')||'마을 모험가');
 const current=target&&target.hp>0?target:null;$('target').classList.toggle('visible',!!current);
 if(current){$('targetName').textContent=(current.model.boss?'👑 ':'')+current.model.name;$('targetHp').style.width=healthRatio(current)*100+'%'}
 const t=performance.now();
 for(const skill of HUNT_SKILLS){const node=$(skill.id),sec=Math.ceil(Math.max(0,cooldowns[skill.id]-t)/1000),locked=level()<skill.level||hero.mp<skill.mp;node.classList.toggle('cooling',sec>0||locked);
  node.disabled=sec>0||locked;node.querySelector('em').textContent=level()<skill.level?'Lv.'+skill.level:sec>0?sec+'초':skill.mp+'MP'}
}
function openModal(content){$('panelBody').innerHTML=content;$('modal').classList.add('open');active=false}
function zoneMenu(){
 const rows=HUNT_ZONES.map((zone,i)=>{
  const unlocked=zoneUnlocked(zone,level()),won=!!state.hunt.bossDates[dailyBossKey(zone.id,today())];
  return '<article class="zone-card"><div class="emoji">'+zone.icon+'</div><strong>'+zone.name+'</strong><small>Lv.'+zone.level+' 이상 · 몬스터 5종 · 보스 '+zone.boss+'</small><p>'+(won?'✅ 오늘 보스 처치 완료':'👑 일일 보스 도전 가능')+'</p><button data-zone="'+i+'" '+(unlocked?'':'disabled')+'>'+(unlocked?'사냥터 이동':'레벨 '+zone.level+' 필요')+'</button></article>';
 }).join('');
 openModal('<div class="hero">🌸 생활과 전투를 연결하는 준자마을 액션 모험! 사냥 재료로 의상을 만들고 친구들에게 자랑해요.</div><h2>⚔️ 마을 밖 모험 지도</h2><p>바닥을 터치하면 정확히 이동하고 몬스터를 터치하면 자동으로 다가가 공격해요. 구역별 보스는 하루 한 번 보상을 받을 수 있어요.</p><div class="grid">'+rows+'</div><button id="viewHuntLoot" class="wide">🎁 전리품 공방 열기</button><button id="returnVillage" class="wide">🏡 준자마을로 돌아가기</button>');
 document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>startZone(+b.dataset.zone));
 $('viewHuntLoot').onclick=craftMenu;$('returnVillage').onclick=goHome;
}
function craftMenu(){
 const bag=state.hunt.materials||{},owned=state.fashion.owned||[];
 const recipes=HUNT_CRAFTS.map(r=>{
  const got=owned.includes(r.gives),possible=canCraft(r,bag,owned,state.coins);
  const cost=r.requires.map(([key,n])=>key+' '+(bag[key]||0)+'/'+n).join(' · ');
  const displayName=CATALOG_BY_ID[r.gives]?.name||'특별 코스튬';
  return '<article class="craft-card"><strong>'+r.icon+' '+r.name+'</strong><p>완성 아이템: '+displayName+'</p><p>'+cost+'</p><p>제작비 '+r.coins.toLocaleString()+'G</p><button data-craft="'+r.id+'" '+(got||!possible?'disabled':'')+'>'+(got?'✅ 소장 중':possible?'제작하고 옷장에 보관':'재료 부족')+'</button></article>';
 }).join('');
 const supplies=Object.entries(bag).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(([id,n])=>'<span class="item-pill">'+id+' × '+n+'</span>').join('');
 openModal('<h2>🎁 사냥 전리품 공방</h2><p>사냥 재료를 모아 기존 준자마을 의상을 제작해 보세요. 제작한 의상은 마을 옷장에서도 바로 착용할 수 있어요.</p><h3>🎒 전리품 보관함</h3><div>'+(supplies||'<p>아직 모은 재료가 없어요.</p>')+'</div><h3>👑 테마 코스튬 제작</h3><div class="grid">'+recipes+'</div><button id="backHuntMap" class="wide">🗺️ 사냥터 선택</button>');
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{
  const r=HUNT_CRAFTS.find(x=>x.id===b.dataset.craft);
  if(!r||!canCraft(r,state.hunt.materials,state.fashion.owned,state.coins))return;
  for(const [key,n] of r.requires)state.hunt.materials[key]-=n;
  state.coins-=r.coins;state.fashion.owned.push(r.gives);save();toast('✨ '+r.name+' 제작 완료!');craftMenu();
 });
 $('backHuntMap').onclick=zoneMenu;
}
function goHome(){save();location.assign('/?room='+encodeURIComponent(room))}
function floatNumber(x,z,label,color='#ffeaa5'){
 if(!camera)return;
 const v=new T.Vector3(x,92,z).project(camera),el=document.createElement('div');
 el.className='float';el.textContent=label;el.style.color=color;
 el.style.left=(v.x*.5+.5)*innerWidth+'px';el.style.top=(-v.y*.5+.5)*innerHeight+'px';
 document.body.appendChild(el);setTimeout(()=>el.remove(),790);
}
function effect(x,z,color=0xfbe7a9){
 const mesh=new T.Mesh(new T.RingGeometry(12,15,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:T.DoubleSide}));
 mesh.position.set(x,2,z);mesh.rotation.x=-Math.PI/2;scene.add(mesh);fx.push({mesh,ttl:.42});
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
  state.hunt.materials[loot]=(state.hunt.materials[loot]||0)+amount;
  state.hunt.kills++;state.coins+=m.model.coins;
  state.xp+=m.model.xp;
  hero.hp=clamp(hero.hp+8,0,stats().maxHp);
  m.root.visible=false;m.deadUntil=performance.now()+(boss?Infinity:7000);
  if(boss){state.hunt.bossDates[dailyBossKey(currentZone.id,today())]=true;toast('🏆 '+m.model.name+' 토벌 성공! 한정 재료 '+loot+' 획득')}
  else toast('✨ '+m.model.name+' 토벌! +'+m.model.coins+'G · '+loot+' 획득');
  if(target===m)target=null;save();
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
 const skill=HUNT_SKILLS.find(s=>s.id===id),now=performance.now();if(!skill||now<cooldowns[id]||level()<skill.level||hero.mp<skill.mp)return;
 let selected=chooseTarget();
 if(!selected){toast('스킬 대상이 될 몬스터가 근처에 없어요');return}
 if(id==='whirl'){selected=chooseTarget()}
 const d=Math.hypot(selected.x-hero.x,selected.z-hero.z);
 if(d>skill.range&&id!=='whirl'){target=selected;hero.moveX=selected.x;hero.moveZ=selected.z;toast('몬스터에게 조금 더 가까이 다가가세요');return}
 hero.mp-=skill.mp;cooldowns[id]=now+skill.cooldown*1000;
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
 if(!raycaster.ray.intersectPlane(floor,point))return;
 const x=clamp(point.x,-545,545),z=clamp(point.z,-370,370);
 let closest=null,distance=68;
 for(const m of monsters)if(m.hp>0&&m.root.visible){const d=Math.hypot(x-m.x,z-m.z);if(d<distance){distance=d;closest=m}}
 if(closest){target=closest;hero.moveX=closest.x;hero.moveZ=closest.z;toast((closest.model.boss?'👑 보스 · ':'🐾 ')+closest.model.name+' 자동 공격')}
 else{target=null;hero.moveX=x;hero.moveZ=z}
 updateHud();
}
function update(time,dt){
 if(!active||!currentZone)return;
 const s=stats(),now=performance.now();
 hero.hp=clamp(hero.hp+(now-hero.hurtAt>2400?2.5:0)*dt,0,s.maxHp);
 hero.mp=clamp(hero.mp+4.6*dt,0,s.maxMp);
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
  if(d<215&&d>58){
   const speed=mob.model.boss?34:30;
   mob.x+=(hero.x-mob.x)/d*speed*dt;mob.z+=(hero.z-mob.z)/d*speed*dt;
  }else if(d>280){const to=Math.hypot(mob.homeX-mob.x,mob.homeZ-mob.z);if(to>8){mob.x+=(mob.homeX-mob.x)/to*15*dt;mob.z+=(mob.homeZ-mob.z)/to*15*dt}}
  mob.root.position.set(mob.x,0,mob.z);
  const hitRemaining=Math.max(0,(mob.hitFlashUntil-now)/260);
  const breathing=1+Math.sin(time*(mob.model.boss?1.5:3.1)+mob.index)*.028;
  mob.body.scale.set(mob.baseScale*breathing*(1+hitRemaining*.13),mob.baseScale*breathing*(1-hitRemaining*.22),mob.baseScale*breathing*(1+hitRemaining*.13));
  mob.body.position.y=Math.sin(time*(mob.model.boss?1.4:2.7)+mob.index)*2.5+hitRemaining*13;
  mob.body.rotation.z=Math.sin(time*1.5+mob.index)*.035+hitRemaining*(mob.index%2?-.13:.13);
  mob.ui.quaternion.copy(camera.quaternion);
  if(mob.hp>0)mob.hpFill.material.color.setHex(hitRemaining>.05?0xffe7a1:mob.model.boss?0xf6c875:0x93ddb0);
  if(d<70&&now>mob.attackAt&&now>hero.hurtAt+350){
   mob.attackAt=now+(mob.model.boss?2200:2550);hero.hurtAt=now;
   const amount=enemyDamage(areaIndex,mob.model.boss,level());
   hero.hp=Math.max(0,hero.hp-amount);floatNumber(hero.x,hero.z,'-'+amount,'#ff9e98');
   effect(hero.x,hero.z,0xf79c8a);
   if(hero.hp<=0){
    hero.hp=s.maxHp;hero.mp=s.maxMp;
    hero.x=0;hero.z=145;hero.moveX=0;hero.moveZ=145;target=null;hero.hurtAt=now+2400;
    toast('💛 잠시 기절했지만 안전하게 회복했어요. 코인과 아이템은 그대로예요.');
   }
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
 playerMesh.setFashion(state.fashion.equipped);scene.add(playerMesh.root);
 camera.position.set(0,285,600);camera.lookAt(0,40,145);
 antiZoomTouch();
 canvas.addEventListener('pointerdown',pointer,{passive:false});
 $('resetView').onclick=resetView;
 $('map').onclick=zoneMenu;$('craft').onclick=craftMenu;$('home').onclick=goHome;
 $('close').onclick=()=>{if(currentZone){$('modal').classList.remove('open');active=true}else zoneMenu()};
 document.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>skillUse(b.dataset.skill));
 window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
 let last=performance.now(),elapsed=0;
 function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;elapsed+=dt;update(elapsed,dt);renderer.render(scene,camera);requestAnimationFrame(frame)}
 requestAnimationFrame(frame);updateHud();zoneMenu();
 }catch(e){console.error('JUNJA HUNT LOAD',e);$('panelBody').innerHTML='<h2>⚠️ 3D 사냥터 준비 실패</h2><p>브라우저의 3D 그래픽 기능이 필요해요. 최신 Safari나 Chrome에서 다시 시도해 주세요.</p><button class="wide" id="returnVillage">마을로 돌아가기</button>';$('returnVillage').onclick=goHome;$('modal').classList.add('open')}
}
init();
window.__JUNJA_HUNT_QA__={zones:HUNT_ZONES,skills:HUNT_SKILLS,getState:()=>({zone:currentZone?.id,level:level(),coins:state.coins,xp:state.xp,kills:state.hunt.kills,monsterCount:monsters.length,alive:monsters.filter(x=>x.hp>0).length,materials:{...state.hunt.materials},hp:hero.hp,mp:hero.mp,active}),startZone,goHome};
