// v48 Three.js miniature furnished rooms. One WebGL context only while the home modal is open.
// Rendering and picking only: no money, save, XP, privileges or inventory changes here.
import * as T from './vendor/three.module.js';
import {homeRoomV48,HOME_SLOTS_V48} from './home-interiors-v48.js';
const THEMES={
 honey:{floor:0xdbb78d,wall:0xf6e6cc,trim:0xc49a78,rug:0xe7b9a1,accent:0x7c9c87,window:0xb5d6ce,metal:0xbaa171},
 sage:{floor:0xbcaa89,wall:0xc9ddc2,trim:0x8caa86,rug:0xa7c4a3,accent:0x5a816e,window:0xa3cdd1,metal:0xa6a28a},
 rose:{floor:0xe8c4a8,wall:0xf3d4db,trim:0xc99eae,rug:0xf0b9b9,accent:0xb88aa4,window:0xaccbd6,metal:0xc0a58f},
 cream:{floor:0xe0cfae,wall:0xf7f0d9,trim:0xc3a86e,rug:0xc3b7de,accent:0xb59dce,window:0xa8d6d8,metal:0xd4af65}
};
export function mountHomeInteriorV48({host,home,room=0,onSlot=()=>{}}){
 if(!host)throw Error('3D 주택 실내 화면이 없습니다');
 const view=homeRoomV48(home,room),tone=THEMES[view.info.style]||THEMES.honey;
 const scene=new T.Scene();scene.background=new T.Color(0xe6ede4);
 scene.fog=new T.Fog(0xe6ede4,650,1300);
 const renderer=new T.WebGLRenderer({alpha:false,antialias:false,powerPreference:'low-power'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.17;
 renderer.setPixelRatio(Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,1.3));
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab';
 renderer.domElement.setAttribute('aria-label','3D 주택 인테리어. 가구를 터치하면 배치할 수 있고 손가락으로 좌우 드래그하면 시점을 회전해요.');
 renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const camera=new T.OrthographicCamera(-235,235,185,-185,1,1500);
 scene.add(new T.HemisphereLight(0xfffaf0,0x93a9a0,2.15));
 const sun=new T.DirectionalLight(0xfff2d9,2.5);sun.position.set(-220,390,230);scene.add(sun);
 const bounce=new T.DirectionalLight(0xb5cfe8,.8);bounce.position.set(220,150,-120);scene.add(bounce);
 let angle=.76,zoom=1,selectedSlot=-1,dragCount=0;const cameraTarget=new T.Vector3(0,43,0);
 function aimCamera(){const distance=555;camera.position.set(
  Math.sin(angle)*distance,405,Math.cos(angle)*distance);camera.lookAt(cameraTarget);}
 aimCamera();
 const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,12,9),cylGeo=new T.CylinderGeometry(1,1,1,12);
 const mats=new Map(),picks=[],geos=[boxGeo,sphereGeo,cylGeo],shadows=[];
 const shadowMaterial=new T.MeshBasicMaterial({color:0x213728,transparent:true,opacity:.13,depthWrite:false});
 function mat(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,
  roughness:color===tone.metal? .36:.86,metalness:color===tone.metal? .38:0}));return mats.get(color)}
 function mesh(parent,geo,color,x,y,z,sx,sy,sz){
  const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
 }
 const box=(p,c,x,y,z,w,h,d)=>mesh(p,boxGeo,c,x,y,z,w,h,d);
 const ball=(p,c,x,y,z,r=10)=>mesh(p,sphereGeo,c,x,y,z,r,r,r);
 const cylinder=(p,c,x,y,z,r,h)=>mesh(p,cylGeo,c,x,y,z,r,h,r);
 const group=(x,z)=>{const g=new T.Group();g.position.set(x,0,z);scene.add(g);return g};
 const cream=0xfaf3e4,wood=0xb58e66,deep=0x36594c;
 // Fake soft ambient-occlusion disks retain cozy grounding without expensive shadow maps.
 function floorShadow(parent,x,z,size=52){
  const shadow=new T.Mesh(cylGeo,shadowMaterial);
  shadow.position.set(x,11,z);shadow.scale.set(size,.45,size*.72);parent.add(shadow);shadows.push(shadow);
 }
 box(scene,tone.floor,0,0,0,430,13,355);
 box(scene,tone.wall,0,98,-180,430,200,12);
 box(scene,tone.wall,-220,98,0,12,200,355);
 box(scene,tone.trim,0,8,-171,420,12,6);
 box(scene,tone.trim,-211,8,0,6,12,350);
 box(scene,tone.rug,0,8,0,315,2,235);
 // Thin planks + floor seams visually remove the toy-block flatness.
 for(let i=-5;i<=5;i++){
  const x=i*36;
  box(scene,i%2===0?0xc2a57e:tone.floor,x,7,0,1,1,350);
 }
 for(let i=-3;i<=3;i++){const z=i*48;box(scene,tone.trim,0,7,z,420,1.2,.85)}
 // Wall wainscoting, skirting and brass picture lights.
 box(scene,cream,0,45,-171,419,4,7);
 box(scene,tone.trim,0,8,-167,420,12,7);
 for(let x=-189;x<200;x+=87){
  box(scene,tone.trim,x,31,-171,3,36,7);
  box(scene,cream,x+41,43,-166,66,1.5,4);
 }
 box(scene,tone.accent,-210,58,-18,4,94,102);
 box(scene,cream,-205,116,-5,8,8,142);
 // Warm halo behind the rug, warm wood and tiny potted flower.
 box(scene,0xe9d6b5,0,10,0,326,2,245);
 box(scene,tone.rug,0,12,0,310,2,228);
 for(const z of [-109,109])box(scene,cream,0,13,z,303,1.6,3);
 cylinder(scene,wood,-176,14,128,15,22);
 for(const [x,z] of [[-177,130],[-188,121],[-163,126]]){cylinder(scene,deep,x,35,z,3,25);ball(scene,0x7ea489,x,50,z,16)}
 // A little luminous window and picture frame add depth to the handmade room.
 box(scene,0xf6f3dc,100,130,-172,85,82,5);
 box(scene,tone.window,100,134,-167,70,64,6);
 box(scene,0xf2e7c7,100,132,-162,5,70,4);
 box(scene,0xf2e7c7,100,132,-160,76,5,4);
 box(scene,tone.trim,-122,130,-171,94,72,6);
 box(scene,0xf5dfae,-122,130,-166,77,57,4);
 box(scene,tone.accent,-143,130,-161,20,38,3);
 ball(scene,0xf7efe0,-121,128,-160,18);
 box(scene,0xd7b992,-95,133,-160,18,31,3);
 for(const x of [-155,-96])ball(scene,tone.metal,x,173,-161,5);
 // Window highlight/sill and curtain pleats.
 box(scene,cream,100,91,-162,92,7,23);
 for(const x of [62,71,128,139])box(scene,0xf6eee0,x,137,-155,5,82,6);
 for(const x of [60,140])ball(scene,tone.metal,x,179,-156,6);
 // Wall sconces create a deliberate nighttime ambience without expensive dynamic shadows.
 for(const x of [-181,181]){box(scene,tone.metal,x,145,-165,10,29,13);
  ball(scene,0xf2db9a,x,163,-156,9)}
 const warm=new T.PointLight(0xffe6bc,.6,690);warm.position.set(0,205,40);scene.add(warm);
 const slotOffsets=Array.from({length:HOME_SLOTS_V48},(_,i)=>({
  x:((i%3)-1)*120,z:(Math.floor(i/3)-1)*105
 }));
 function furniture(parent,id){
  const wood=0xb28a66,metal=0xcfb87b,white=0xf6f1e3,pink=0xc6a0a3;
  switch(id){
   case 'sofa':
    box(parent,0x8fac9a,0,23,0,82,28,43);
    box(parent,0x71958d,0,43,-23,82,38,14);
    for(const x of [-41,41])box(parent,0x668880,x,29,0,13,28,52);
    for(const x of [-22,22])box(parent,white,x,38,7,18,12,19);break;
   case 'table':
    box(parent,wood,0,42,0,75,8,51);
    for(const x of [-25,25])for(const z of [-15,15])box(parent,wood,x,21,z,8,38,8);break;
   case 'lamp':cylinder(parent,0xa6b9a4,0,5,0,17,10);cylinder(parent,0xc6b691,0,34,0,5,53);
    box(parent,0xf3ddab,0,68,0,34,26,34);break;
   case 'plant':cylinder(parent,0xc79f84,0,13,0,22,26);
    for(const [x,z] of [[-10,4],[12,2],[0,-10],[7,13]]){cylinder(parent,0x5f8560,x/2,35,z/2,2,27);ball(parent,0x6c9d72,x,50,z,16)}break;
   case 'cat':box(parent,0xe6cbb0,0,10,0,33,12,25);ball(parent,0xf5dcbe,0,33,0,23);
    for(const x of [-13,13]){const ear=box(parent,0xe3bfa7,x,51,-2,15,21,9);ear.rotation.z=x>0?-.3:.3}break;
   case 'piano':
    box(parent,0x604d47,0,38,-7,82,72,40);box(parent,0xf1eee4,0,41,18,72,5,19);
    for(let x=-31;x<32;x+=8)box(parent,0x3a373b,x,44,24,4,6,12);break;
   case 'fireplace':
    box(parent,0xe1d6c6,0,39,-9,80,79,47);box(parent,0x4b4b4b,0,28,18,53,39,7);
    for(const x of [-13,11])ball(parent,0xef9953,x,27,24,10);
    box(parent,0xf0e6d8,0,82,-9,98,9,55);break;
   case 'library':
    box(parent,wood,0,43,-6,80,86,24);
    for(const y of [24,49,73]){box(parent,0xe1c59f,0,y,-1,72,4,19);
      for(let x=-29;x<=29;x+=12)box(parent,[(0xa3b28a),(0xc9a0ac),(0xc6b77f)][Math.abs(x)%3],x,y+10,2,9,20,13)}break;
   case 'aquarium':
    box(parent,0x9a805b,0,13,0,85,25,47);box(parent,0x87bac7,0,52,0,80,52,40);
    for(const x of [-24,12,29])ball(parent,0xe9b07a,x,53,(x%17),7);
    box(parent,white,0,81,0,90,6,51);break;
   case 'harp':
    cylinder(parent,metal,-22,40,0,5,82);cylinder(parent,metal,19,46,0,5,94);
    box(parent,metal,0,14,0,76,10,13);
    for(let x=-15;x<18;x+=5)cylinder(parent,0xf5ebcf,x,51,0,1,66);break;
   case 'throne':
    box(parent,metal,0,32,0,72,20,54);box(parent,0xb77e9a,0,70,-21,66,90,14);
    for(const x of [-39,39])box(parent,metal,x,42,0,12,44,58);
    ball(parent,0xf4e1a1,0,125,-21,14);break;
   case 'starlamp':
    cylinder(parent,metal,0,45,0,5,64);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const x=Math.cos(a)*29,z=Math.sin(a)*29;
     ball(parent,0xf7e2a2,x,74,z,13)}ball(parent,white,0,88,0,19);break;
   default:ball(parent,pink,0,20,0,19);
  }
 }
 for(const slot of view.slots){
  const loc=slotOffsets[slot.slot],place=group(loc.x,loc.z);
  const base=box(place,slot.item?0xefe5cf:0xe7e2cb,0,9,0,111,2,96);
  base.userData.slot=slot.slot;picks.push(base);
  if(slot.item)furniture(place,slot.item);
  else{
   const x=box(place,0xd2ccb9,0,10,0,23,1.5,3),z=box(place,0xd2ccb9,0,10,0,3,1.5,23);
   x.userData.slot=slot.slot;z.userData.slot=slot.slot;
  }
 }
 const ray=new T.Raycaster(),mouse=new T.Vector2();
 function pointer(event){
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.set((event.clientX-rect.left)/Math.max(1,rect.width)*2-1,
   -(event.clientY-rect.top)/Math.max(1,rect.height)*2+1);
  ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(picks);
  if(hits[0])onSlot(hits[0].object.userData.slot);
 }
 renderer.domElement.addEventListener('pointerup',pointer);
 let disposed=false,raf=0,frames=0;
 function resize(){
  if(disposed)return;
  const width=Math.max(180,Math.round(host.clientWidth)),height=Math.max(200,Math.round(host.clientHeight));
  renderer.setSize(width,height,false);
  const aspect=width/height;
  camera.left=-260*Math.max(1,aspect);camera.right=260*Math.max(1,aspect);
  camera.top=250;camera.bottom=-250;camera.updateProjectionMatrix();
 }
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);
 function frame(){
  if(disposed)return;
  raf=requestAnimationFrame(frame);
  if(!host.isConnected){dispose();return}
  if(document.hidden)return;
  renderer.render(scene,camera);frames++;
 }
 function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);
  observer?.disconnect();renderer.domElement.removeEventListener('pointerup',pointer);
  for(const x of geos)x.dispose();for(const m of mats.values())m.dispose();
  renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
 }
 resize();raf=requestAnimationFrame(frame);
 return {stats:()=>({frames,room,placed:view.slots.filter(x=>x.item).length,picks:picks.length}),
  dispose};
}
