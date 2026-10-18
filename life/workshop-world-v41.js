// JUNJA V41 — walkable 3D business village and compact interior scenes.
// This renderer NEVER changes wallet, inventory or real player progression.
import * as THREE from './vendor/three.module.js';
import {createAvatar} from './avatar3d.js';
import {WORKSHOP_SITES,WORKSHOP_ROLES,walkStep} from './workshop-plots-v41.js';
const COLORS={
 ground:0xbdd99f,tile:0xe9d8b1,earth:0x9dba83,wood:0x9b6f50,
 cream:0xffe9c8,teal:0x81bdb1,roof:0xcc867b,soil:0xab8661,
 lavender:0xb2a1c9,leaf:0x72ad76,rose:0xe2a1a0,water:0x8bc9d1
};
const roleColors={farmer:{wall:0xd0e4c4,roof:0x80b1a0,accent:0x658f71},
 chef:{wall:0xfbe2c5,roof:0xc3827c,accent:0xc99e73},
 merchant:{wall:0xdcd4e5,roof:0x9d94b9,accent:0x8a779c}};
const titles={farmer:'프리미엄 온실',chef:'수제 베이커리',merchant:'유통 공방'};
export function mountWorkshopVillage({host,buildings=[],readOnly=false,ownerName='나',look={},onArrival=()=>{},onInteriorChange=()=>{}}={}){
 if(!host)throw Error('3D 사업장 장면을 표시할 위치가 없습니다');
 if(!Array.isArray(buildings)||buildings.length>3)throw Error('허용되지 않는 사업장 배치 데이터입니다');
 const validate=new Set();
 for(const b of buildings){
  if(!WORKSHOP_ROLES.includes(b.role)||!Number.isInteger(b.level)||b.level<1||b.level>3
   ||!Number.isInteger(b.site)||b.site<0||b.site>8||validate.has(b.site)||validate.has(b.role))
   throw Error('사업장 데이터가 중복되거나 손상됐어요');
  validate.add(b.site);validate.add(b.role);
 }
 const owned=new Map(buildings.map(b=>[b.role,b]));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xdbe9d6);
 const outdoor=new THREE.Group(),indoor=new THREE.Group();scene.add(outdoor,indoor);indoor.visible=false;
 const camera=new THREE.OrthographicCamera(-350,350,220,-220,1,3500);
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(1.3,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;outline:none;border-radius:16px';
 renderer.domElement.setAttribute('aria-label','준자마을 입체 사업장. 건물을 터치하면 주민이 걸어가고, 시설 내부도 볼 수 있어요.');
 renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const box=new THREE.BoxGeometry(1,1,1),ball=new THREE.SphereGeometry(1,12,8),
  pole=new THREE.CylinderGeometry(1,1,1,10),cone=new THREE.ConeGeometry(1,1,8);
 const geometry=new Set([box,ball,pole,cone]),materials=new Map(),labels=[];
 function mat(color,transparent=false){
  const key=color+'-'+transparent;
  if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.91,
   transparent,opacity:transparent ? .025 : 1,depthWrite:!transparent}));
  return materials.get(key);
 }
 function mesh(parent,geo,color,x,y,z,w,h,d){
  const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;
 }
 const cube=(p,color,x,y,z,w,h,d)=>mesh(p,box,color,x,y,z,w,h,d);
 const sphere=(p,color,x,y,z,w,h=w,d=w)=>mesh(p,ball,color,x,y,z,w,h,d);
 const cylinder=(p,color,x,y,z,r,h)=>mesh(p,pole,color,x,y,z,r,h,r);
 function group(p,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g}
 scene.add(new THREE.HemisphereLight(0xfff5e8,0x7ea584,2.6));
 const sun=new THREE.DirectionalLight(0xffe9c8,2.2);sun.position.set(-400,720,350);scene.add(sun);
 // Raised landscape, roads and plots give consistent geospatial coordinates for all residents.
 cube(outdoor,0x97b48e,0,-20,0,1035,36,1040);
 cube(outdoor,COLORS.ground,0,-1,0,1000,7,1000);
 for(const center of [-280,0,280])cube(outdoor,COLORS.tile,center,4,0,53,5,920);
 for(const center of [-270,0,270])cube(outdoor,COLORS.tile,0,4,center,950,5,52);
 cube(outdoor,0xd7c6a3,0,5,425,130,5,130); // plaza and spawn
 for(const s of WORKSHOP_SITES){
  cube(outdoor,0x8da977,s.x,5,s.z,194,10,190);
  cube(outdoor,0xdbc7a0,s.x,11,s.z,179,4,173);
  for(const x of [-89,89])for(const z of [-82,82])cylinder(outdoor,0xe7d6bd,s.x+x,21,s.z+z,5,22);
 }
 // Each owner facility is a mesh with distinct roof and products, not a flat sprite.
 const picks=[];
 function decorateBuilding(facility){
  const {role,site,level}=facility,c=roleColors[role],point=WORKSHOP_SITES[site];
  const base=group(outdoor,point.x,0,point.z);
  const height=75+(level-1)*16;
  cube(base,c.wall,0,15+height/2,-15,151,height,122);
  cube(base,c.roof,0,height+23,-15,175,13,151);
  if(level>=2)cube(base,c.roof,0,height+38,-15,96,17,110);
  if(level===3)cube(base,COLORS.cream,0,height+55,-15,50,25,46);
  cube(base,0x977256,0,37,47,42,70,5); // door
  for(const x of [-54,54]){
   cube(base,0x9dd1cf,x,55,47,30,33,4);
   cube(base,COLORS.cream,x,55,51,3,36,5);
  }
  if(role==='farmer'){
   for(const x of [-50,-18,14,46]){
    cylinder(base,COLORS.wood,x,44,-45,4,27);
    sphere(base,0x78b777,x,64,-45,19);
    sphere(base,0xc96674,x-7,68,-31,5);
   }
   cube(base,0xc5e5d7,0,20,-80,150,25,15);
  }else if(role==='chef'){
   for(const x of [-46,46])cylinder(base,0xbc875f,x,87,42,6,15);
   const sign=sphere(base,0xebc17d,0,height+48,45,22,15,5);
   cube(base,0xd09a96,-50,93,25,35,12,45);
  }else{
   for(const x of [-55,-20,15,50])cube(base,0xb6abc9,x,13,72,25,17,24);
   for(const x of [-55,0,55])sphere(base,0xf3d2a3,x,37,80,14,13,10);
  }
  // Dedicated ray-pick mesh prevents small roofs from being hard to select on mobile.
  const hit=cube(base,c.accent,0,65,-15,186,156,183);
  hit.material=mat(0xffffff,true);hit.userData.role=role;picks.push(hit);
 }
 buildings.forEach(decorateBuilding);
 function tree(x,z,flower=false){
  const g=group(outdoor,x,0,z);
  cylinder(g,COLORS.wood,0,30,0,7,60);
  for(const [xx,yy,zz,r] of [[-14,65,0,26],[14,70,4,29],[0,86,5,27]])
   sphere(g,flower?COLORS.rose:COLORS.leaf,xx,yy,zz,r);
 }
 for(const [x,z] of [[-400,-390],[385,-395],[-405,398],[398,390],[-412,0],[412,0]])tree(x,z,(x+z)%2===0);
 // The 3D interior is modeled independently and never mounts a second WebGL context.
 cube(indoor,0xd4b998,0,-12,0,660,25,540);
 cube(indoor,0xffe9ce,0,130,-245,660,290,18);
 cube(indoor,0xf0d8b2,-324,120,0,18,250,520);
 cube(indoor,0xf0d8b2,324,120,0,18,250,520);
 cube(indoor,0xd0ac86,0,30,-35,235,55,95);
 cube(indoor,0xf5ede0,0,62,10,245,16,110);
 for(const x of [-235,235]){
  cube(indoor,0x997459,x,75,-120,95,120,60);
  for(const y of [35,75,116])cube(indoor,0xe8cc9b,x,y,-82,110,9,60);
 }
 const workbench=group(indoor,0,0,0);
 function populateInterior(role){
  for(const part of [...workbench.children])workbench.remove(part);
  // Shapes are reused (shared box/ball/cylinder geometry) for every interior.
  const c=roleColors[role];
  for(const x of [-74,0,74])cube(workbench,c.accent,x,97,-29,45,20,36);
  if(role==='farmer'){
   for(const x of [-210,-125,-40,45,130,215]){
    cube(workbench,0x9d7957,x,26,118,53,26,72);
    for(const z of [100,120,140])sphere(workbench,0x78b775,x,54,z,16,17,15);
   }
  }else if(role==='chef'){
   cube(workbench,0x9d8f85,-190,92,100,110,100,95);
   cube(workbench,0x6c6b69,-190,95,150,65,51,7);
   for(const x of [-80,0,80,160])sphere(workbench,0xdbaa72,x,66,100,16,12,16);
  }else{
   for(const x of [-210,-100,10,120,210]){
    cube(workbench,COLORS.wood,x,43,100,65,75,64);
    sphere(workbench,0xf2cb7f,x,90,100,16);
    sphere(workbench,0xbb87a1,x+9,103,100,9);
   }
  }
 }
 const avatar=createAvatar({coat:look.coat||'mint',hat:look.hat||'none'});
 avatar.equip(look.fashion?.outfit||look.coat||'mint',look.hat||'none');
 avatar.setFashion(look.fashion||{});
 scene.add(avatar.root);avatar.root.scale.setScalar(.72);
 const pos={x:0,z:435};let goal=null,targetRole=null,inside=null,paused=false,disposed=false,raf=0,last=0,frames=0,stride=0;
 const mark=new THREE.Mesh(new THREE.TorusGeometry(24,3,6,28),mat(0xffe09b));
 geometry.add(mark.geometry);mark.rotation.x=Math.PI/2;scene.add(mark);mark.visible=false;
 const pointer=new THREE.Vector2(),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-8);
 const intersect=new THREE.Vector3();
 function resize(){
  if(disposed)return;
  const w=Math.max(280,host.clientWidth||375),h=Math.max(235,host.clientHeight||320);
  renderer.setSize(w,h,false);
  const width=Math.max(500,Math.min(980,w*1.75));
  camera.left=-width/2;camera.right=width/2;camera.top=width*h/w/2;camera.bottom=-width*h/w/2;
  camera.updateProjectionMatrix();
 }
 resize();window.addEventListener('resize',resize);
 function visitRole(role){
  const s=owned.get(role);
  if(!s||inside||disposed)return false;
  const site=WORKSHOP_SITES[s.site];
  targetRole=role;goal={x:site.x,z:site.z+122};
  mark.visible=true;mark.position.set(goal.x,15,goal.z);
  return true;
 }
 function enter(role){
  if(disposed||!owned.has(role))return false;
  inside=role;goal=null;targetRole=null;mark.visible=false;
  indoor.visible=true;outdoor.visible=false;
  populateInterior(role);scene.background.set(0xf2d5bc);
  avatar.root.visible=true;onInteriorChange({inside:true,role,readOnly});
  return true;
 }
 function exit(){
  if(disposed||!inside)return false;
  const oldRoom=inside;
  inside=null;outdoor.visible=true;indoor.visible=false;scene.background.set(0xdbe9d6);
  onInteriorChange({inside:false,role:oldRoom,readOnly});return true;
 }
 function onTap(e){
  if(disposed||inside)return;
  const b=renderer.domElement.getBoundingClientRect();
  if(b.width<=0||b.height<=0)return;
  pointer.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);
  ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(picks,false);
  if(hits.length&&hits[0].object.userData.role){
   visitRole(hits[0].object.userData.role);return;
  }
  if(ray.ray.intersectPlane(plane,intersect)){
   targetRole=null;goal={x:Math.max(-465,Math.min(465,intersect.x)),
    z:Math.max(-465,Math.min(465,intersect.z))};
   mark.visible=true;mark.position.set(goal.x,16,goal.z);
  }
 }
 let down=null;
 const canvas=renderer.domElement;
 function onDown(e){if(!e.isPrimary)return;down={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch{}}
 function onUp(e){
  if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<15)onTap(e);
  down=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch{}
 }
 const cancel=()=>{down=null};
 canvas.addEventListener('pointerdown',onDown);
 canvas.addEventListener('pointerup',onUp);
 canvas.addEventListener('pointercancel',cancel);
 function draw(time){
  if(disposed)return;raf=requestAnimationFrame(draw);
  if(time-last<30)return;
  const dt=Math.max(0,Math.min(.05,(time-(last||time))/1000));last=time;
  if(document.hidden)return;
  let vx=0,vz=0;
  if(!inside&&goal){
   const x=pos.x,z=pos.z;
   const moved=walkStep(pos,goal,dt);
   pos.x=moved.x;pos.z=moved.z;vx=(pos.x-x)/Math.max(dt,.01);vz=(pos.z-z)/Math.max(dt,.01);
   stride+=Math.hypot(pos.x-x,pos.z-z)/22;
   if(moved.arrived){
    goal=null;mark.visible=false;
    if(targetRole){
     const arrived=targetRole;targetRole=null;onArrival({role:arrived,readOnly,ownerName});
    }
   }
  }
  if(inside){
   avatar.animate({x:0,y:145,vx:0,vy:0,stride},dt,time/1000);
   camera.position.lerp(new THREE.Vector3(340,340,420),1-Math.exp(-dt*6));
   camera.lookAt(0,70,0);
  }else{
   avatar.animate({x:pos.x,y:pos.z,vx,vy:vz,stride},dt,time/1000);
   camera.position.lerp(new THREE.Vector3(pos.x+440,510,pos.z+500),1-Math.exp(-dt*5));
   camera.lookAt(pos.x,42,pos.z);
   mark.rotation.z=time/1800;
  }
  renderer.render(scene,camera);frames++;
 }
 camera.position.set(440,510,935);camera.lookAt(0,42,435);
 raf=requestAnimationFrame(draw);
 return {
  visitRole,enter,exit,
  stats:()=>({frames,inside,walker:{...pos},buildings:buildings.length,readOnly}),
  dispose(){
   if(disposed)return;disposed=true;cancelAnimationFrame(raf);
   window.removeEventListener('resize',resize);
   canvas.removeEventListener('pointerdown',onDown);
   canvas.removeEventListener('pointerup',onUp);
   canvas.removeEventListener('pointercancel',cancel);
   avatar.dispose();
   for(const g of geometry)g.dispose();
   for(const m of materials.values())m.dispose();
   renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
 };
}
