// JUNJA Village v35 — walkable personal farm scene.
// Rendering only. No economy values, XP, cloud saves or user ownership are modified here.
import * as T from './vendor/three.module.js';
import {createAvatar} from './avatar3d.js';
import {estateLayout,estateCropView,estateWalkStep} from './estate-layout-v35.js';

const PALETTE={
 grass:0xb4cf8d,grassLight:0xc5daa1,soil:0x9a7656,soilEdge:0xdeb987,
 path:0xe9d9ad,fence:0xf4e4c6,leaf:0x82b16c,leafDark:0x628f58,
 house:0xffedcb,roof:0xbd9187,wood:0xb58d69,water:0x97c9c8,
 flower:0xecc0c1,fruit:0xd57568,stone:0xbec4aa
};
const CROPS={
 lettuce:{leaf:0x8dc56f,fruit:0xadd88a},
 carrot:{leaf:0x7fb45d,fruit:0xe89a4e},
 berry:{leaf:0x719c63,fruit:0xda5964},
 tomato:{leaf:0x6da05e,fruit:0xe07e5c},
 wheat:{leaf:0xc2b779,fruit:0xe8cd76},
 apple:{leaf:0x6a9d62,fruit:0xe47b68},
 peach:{leaf:0x79ac6a,fruit:0xe7ab8d},
 cherry:{leaf:0x77ab69,fruit:0xc76278},
 mango:{leaf:0x74a563,fruit:0xe6bc68}
};

export function mountEstateWorld({host,estate,cropMap,onPlot,look={}}){
 if(!host)throw Error('3D 개인 농장 화면이 없습니다');
 const tierSlots=[6,24,48,96];
 const slots=tierSlots[Math.max(0,Math.min(3,Number(estate?.tier)||0))];
 const layout=estateLayout(slots);
 const scene=new T.Scene();scene.background=new T.Color(0xcfe6d7);
 const camera=new T.OrthographicCamera(-350,350,225,-225,1,3000);
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,1.25));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.setClearColor(0xcfe6d7);
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
 renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none;border-radius:17px;outline:none';
 renderer.domElement.tabIndex=0;
 renderer.domElement.setAttribute('aria-label','터치로 걸어 다니는 나의 입체 농장. 밭을 누르면 해당 위치로 걸어가 심거나 수확해요.');
 host.appendChild(renderer.domElement);
 const geometries=new Set(),mats=new Map();
 const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,12,8),cylinderGeo=new T.CylinderGeometry(1,1,1,12),coneGeo=new T.ConeGeometry(1,1,8);
 geometries.add(boxGeo);geometries.add(sphereGeo);geometries.add(cylinderGeo);geometries.add(coneGeo);
 function material(color,transparent=false){
  const key=color+'-'+transparent;
  if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.92,transparent,opacity:transparent ? .72 : 1}));
  return mats.get(key);
 }
 function obj(parent,geo,color,x,y,z,sx,sy,sz){
  const m=new T.Mesh(geo,material(color));
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
 }
 const cube=(p,c,x,y,z,w,h,d)=>obj(p,boxGeo,c,x,y,z,w,h,d);
 const orb=(p,c,x,y,z,w,h=w,d=w)=>obj(p,sphereGeo,c,x,y,z,w,h,d);
 const cyl=(p,c,x,y,z,r,h)=>obj(p,cylinderGeo,c,x,y,z,r,h,r);
 const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g};
 scene.add(new T.HemisphereLight(0xfff7e4,0x99b79b,2.5));
 const sun=new T.DirectionalLight(0xffefd9,2.5);sun.position.set(-320,650,400);scene.add(sun);
 // Accessible island perimeter and an entrance path, visible even before buying premium expansions.
 cube(scene,0x9bbf82,0,-16,0,layout.width+40,30,layout.depth+40);
 cube(scene,PALETTE.grass,0,0,0,layout.width,6,layout.depth);
 for(let x=-layout.width/2+35;x<layout.width/2-10;x+=56){
  for(const z of [-layout.depth/2+22,layout.depth/2-22]){
   cube(scene,PALETTE.fence,x,19,z,7,38,7);
   cube(scene,PALETTE.fence,x,27,z,54,6,6);
  }
 }
 for(let z=-layout.depth/2+32;z<layout.depth/2-10;z+=56){
  for(const x of [-layout.width/2+20,layout.width/2-20]){
   cube(scene,PALETTE.fence,x,19,z,7,38,7);
   cube(scene,PALETTE.fence,x,27,z,6,6,54);
  }
 }
 cube(scene,PALETTE.path,0,4,layout.entrance.z-18,70,5,125);
 // Landmark greenhouse, cabin and cafe are stylized solid objects, not flat photographs.
 const barn=group(scene,Math.max(0,layout.width/2-145),0,-layout.depth/2+68);
 cube(barn,PALETTE.house,0,49,0,142,90,104);
 const roof=cube(barn,PALETTE.roof,0,106,0,160,15,123);roof.rotation.z=.11;
 cube(barn,PALETTE.wood,0,24,53,41,48,5);
 for(const x of [-45,45])cube(barn,PALETTE.water,x,62,54,28,31,3);
 function tree(x,z,fruit=0xe8b985){
  const t=group(scene,x,0,z);cyl(t,PALETTE.wood,0,37,0,8,74);
  for(const [a,b,c,s] of [[-18,88,0,30],[18,93,0,34],[0,106,14,32]])orb(t,PALETTE.leaf,a,b,c,s,s*.91,s);
  for(const [a,b,c] of [[-15,90,23],[10,104,29],[22,86,8]])orb(t,fruit,a,b,c,6,6,6);
 }
 const xEdge=layout.width/2-55,zEdge=layout.depth/2-42;
 tree(-xEdge,-zEdge,0xe5b07f);tree(-xEdge,zEdge,0xc96b73);
 // Separate workbench + kettle become visible as owned buildings are constructed.
 if((estate?.buildings||[]).some(s=>String(s).includes('온실'))){
  const gh=group(scene,-layout.width/2+120,0,-layout.depth/2+83);
  cube(gh,0xb9d4c2,0,46,0,115,91,94);
  for(const x of [-55,0,55])cube(gh,0xe9f3dd,x,53,49,7,95,5);
  cube(gh,0xe9f3dd,0,102,0,126,9,104);
  for(const x of [-27,27])orb(gh,0x71ae71,x,30,0,18,25,16);
 }
 if((estate?.buildings||[]).some(s=>String(s).includes('카페'))){
  const cafe=group(scene,layout.width/2-145,0,layout.depth/2-125);
  cube(cafe,0xf6d5b1,0,41,0,126,82,94);
  cube(cafe,0xd7a4a7,0,87,0,142,11,107);
  cube(cafe,0x8eb8ac,0,48,49,48,48,3);
  for(const x of [-32,32])cube(cafe,PALETTE.fence,x,12,93,6,22,6);
 }
 const plotRoots=[],plotHits=[],cropRoots=[],stageKeys=[];
 for(const bed of layout.beds){
  const g=group(scene,bed.x,0,bed.z);
  cube(g,PALETTE.soilEdge,0,5,0,88,12,84);
  const pick=cube(g,PALETTE.soil,0,12,0,78,5,73);
  pick.userData.plotIndex=bed.index;
  for(const x of [-22,0,22])cube(g,0x86634c,x,15,0,3,2,62);
  const crop=group(g);plotRoots.push(g);plotHits.push(pick);cropRoots.push(crop);stageKeys.push('');
 }
 const walker=createAvatar({coat:look.coat||'mint',hat:look.hat||'none'});
 scene.add(walker.root);
 walker.equip(look.fashion?.outfit||look.coat||'mint',look.hat||'none');
 walker.setFashion(look.fashion||{});
 walker.root.scale.setScalar(.71);
 const pos={x:layout.entrance.x,z:layout.entrance.z};
 let goal=null,targetPlot=null,stride=0,disposed=false,raf=0,last=0,lastCropRefresh=0;
 const raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),-8);
 const cursor=new T.Vector2(),intersection=new T.Vector3();
 const indicator=new T.Mesh(new T.TorusGeometry(22,2.5,7,32),material(0xf3de82));
 geometries.add(indicator.geometry);indicator.rotation.x=Math.PI/2;indicator.visible=false;scene.add(indicator);

 function updateCrops(now){
  for(const bed of layout.beds){
   const view=estateCropView(estate?.plots?.[bed.index],cropMap,now);
   const stage=view.id?Math.max(1,Math.min(4,Math.ceil(view.progress*4))):0;
   const key=view.id+':'+stage;
   if(stageKeys[bed.index]===key)continue;
   stageKeys[bed.index]=key;
   const container=cropRoots[bed.index];container.clear();
   if(!stage)continue;
   const colors=CROPS[view.id]||CROPS.lettuce;
   const height=6+stage*5;
   const isTree=['apple','peach','cherry','mango'].includes(view.id);
   if(isTree){
    cyl(container,PALETTE.wood,0,14+stage*4,0,4,22+stage*8);
    for(const [x,y,z] of [[-13,32,0],[14,36,0],[0,42,12]])orb(container,colors.leaf,x,y,z,8+stage*4,7+stage*4,8+stage*4);
    if(stage>=3)for(const x of [-14,3,16])orb(container,colors.fruit,x,36+stage*4,11,4+stage,4+stage,4+stage);
   }else{
    for(const [x,z] of [[-17,-14],[15,-14],[-17,16],[15,16]]){
     cyl(container,colors.leaf,x,3+height/2,z,2,height);
     orb(container,colors.leaf,x-5,7+height,z,7+stage,4+stage*.8,6+stage);
     orb(container,colors.leaf,x+5,9+height,z,7+stage,4+stage*.8,6+stage);
     if(stage>=3)orb(container,colors.fruit,x,8+stage*4,z,5+stage,5+stage,5+stage);
    }
   }
  }
 }
 function resize(){
  if(disposed)return;
  const w=Math.max(250,host.clientWidth||360),h=Math.max(220,host.clientHeight||294);
  renderer.setSize(w,h,false);
  // Keep a consistent world scale while allowing a comfortable zoom on phones.
  const viewWidth=Math.max(440,Math.min(760,w*1.4));
  camera.left=-viewWidth/2;camera.right=viewWidth/2;
  camera.top=viewWidth*h/w/2;camera.bottom=-viewWidth*h/w/2;
  camera.updateProjectionMatrix();
 }
 resize();window.addEventListener('resize',resize);
 function project(event){
  const rect=renderer.domElement.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return null;
  cursor.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(cursor,camera);
  const hits=raycaster.intersectObjects(plotHits,false);
  if(hits.length)return {plot:hits[0].object.userData.plotIndex};
  return raycaster.ray.intersectPlane(plane,intersection)?{world:{x:intersection.x,z:intersection.z}}:null;
 }
 function visitPlot(index){
  const bed=layout.beds[index];if(!bed||disposed)return false;
  targetPlot=bed.index;goal={x:bed.x,z:bed.z+51};
  indicator.position.set(goal.x,18,goal.z);indicator.visible=true;
  return true;
 }
 function onPointerUp(event){
  if(disposed||!renderer.domElement.isConnected)return;
  const result=project(event);if(!result)return;
  if(Number.isInteger(result.plot)){
   visitPlot(result.plot);
  }else if(result.world){
   targetPlot=null;
   goal={x:Math.max(-layout.width/2+50,Math.min(layout.width/2-50,result.world.x)),
         z:Math.max(-layout.depth/2+50,Math.min(layout.depth/2-50,result.world.z))};
  }
  if(goal){indicator.position.set(goal.x,18,goal.z);indicator.visible=true}
 }
 let start=null;
 const canvas=renderer.domElement;
 function pointerDown(e){if(!e.isPrimary)return;start={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch{}}
 function pointerUp(e){
  if(start&&Math.hypot(start.x-e.clientX,start.y-e.clientY)<14)onPointerUp(e);
  start=null;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch{}
 }
 canvas.addEventListener('pointerdown',pointerDown);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',()=>{start=null});
 let timesRendered=0;
 function frame(time){
  if(disposed)return;
  raf=requestAnimationFrame(frame);
  if(time-last<30)return;const dt=Math.min(.05,Math.max(0,(time-(last||time))/1000));last=time;
  if(document.hidden)return;
  if(time-lastCropRefresh>1000){lastCropRefresh=time;updateCrops(Date.now())}
  let velocityX=0,velocityZ=0;
  if(goal){
   const priorX=pos.x,priorZ=pos.z;
   const next=estateWalkStep(pos,goal,dt);
   pos.x=next.x;pos.z=next.z;
   velocityX=(pos.x-priorX)/Math.max(dt,.001);
   velocityZ=(pos.z-priorZ)/Math.max(dt,.001);
   stride+=Math.hypot(pos.x-priorX,pos.z-priorZ)/22;
   if(next.arrived){
    goal=null;indicator.visible=false;
    if(targetPlot!==null){
     const chosen=targetPlot;targetPlot=null;
     // The main game's own button performs the actual planting/harvesting.
     onPlot?.(chosen);
     if(disposed)return;
    }
   }
  }
  walker.animate({x:pos.x,y:pos.z,vx:velocityX,vy:velocityZ,stride},dt,time/1000);
  const zoom=1-Math.exp(-dt*5);
  const desired=new T.Vector3(pos.x+370,450,pos.z+485);
  camera.position.lerp(desired,zoom);
  camera.lookAt(pos.x,45,pos.z);
  indicator.rotation.z=time/2200;
  renderer.render(scene,camera);
  timesRendered++;
 }
 camera.position.set(pos.x+370,450,pos.z+485);camera.lookAt(pos.x,45,pos.z);
 updateCrops(Date.now());raf=requestAnimationFrame(frame);
 return {
  visitPlot,
  stats:()=>({plots:layout.slots,frames:timesRendered,walker:{...pos}}),
  dispose(){
   if(disposed)return;disposed=true;
   cancelAnimationFrame(raf);window.removeEventListener('resize',resize);
   canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);
   walker.dispose();
   for(const geo of geometries)geo.dispose();
   for(const mat of mats.values())mat.dispose();
   renderer.dispose();renderer.forceContextLoss();
   canvas.remove();
  }
 };
}
