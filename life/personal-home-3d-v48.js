// Real WebGL 3D showroom v48, drawn from a SERVER-validated house layout only.
// Tap a tile to select a furniture position; swipe to orbit. No game economy mutation.
import * as T from './vendor/three.module.js';
const WALL={cream:0xf7e8d5,sage:0xc7d9bd,blush:0xe7ccd7,amethyst:0xbcaad2};
const FLOOR={oak:0xc69b70,walnut:0x8c694e,marble:0xe8e6de,royal:0xcfc1a1};
export function mountHome3D(host,house,{onSelect=()=>{}}={}){
 if(!host)throw Error('v48 3D 가구 배치 화면 없음');
 let disposed=false,raf=0,angle=.56,selected=null,snapshot=house;
 const scene=new T.Scene();scene.background=new T.Color(0xe9e8df);
 const camera=new T.OrthographicCamera(-200,200,200,-200,1,2600);
 const renderer=new T.WebGLRenderer({antialias:false,powerPreference:'low-power',alpha:false});
 renderer.setPixelRatio(Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,1.25));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';
 renderer.domElement.setAttribute('aria-label','3D 인테리어 미리보기: 바닥을 눌러 위치를 선택하고 좌우로 드래그해 집을 돌려 보세요');
 host.replaceChildren(renderer.domElement);
 const boxGeo=new T.BoxGeometry(1,1,1),ballGeo=new T.SphereGeometry(1,12,10),cylGeo=new T.CylinderGeometry(1,1,1,12);
 const shared=[boxGeo,ballGeo,cylGeo],materials=new Map(),ownedGeometries=[];
 const material=(c,other='')=>{const key=c+'-'+other;if(!materials.has(key))materials.set(key,
  new T.MeshStandardMaterial({color:c,roughness:other==='metal'?.33:.83,metalness:other==='metal'?.65:0,
   transparent:other==='glass',opacity:other==='glass'?.78:1}));return materials.get(key)};
 const root=new T.Group();scene.add(root);
 const mesh=(p,geo,color,x,y,z,w,h,d,opt='')=>{
  const o=new T.Mesh(geo,material(color,opt));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=false;p.add(o);return o
 };
 const block=(p,c,x,y,z,w,h,d,o)=>mesh(p,boxGeo,c,x,y,z,w,h,d,o);
 const ball=(p,c,x,y,z,w,h=w,d=w,o)=>mesh(p,ballGeo,c,x,y,z,w,h,d,o);
 const cyl=(p,c,x,y,z,w,h)=>mesh(p,cylGeo,c,x,y,z,w,h,d);
 const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g};
 scene.add(new T.HemisphereLight(0xfff3dd,0x87958d,2.8));
 const sun=new T.DirectionalLight(0xffd6ae,3.0);sun.position.set(-420,680,580);scene.add(sun);
 const extra=new T.DirectionalLight(0xe2f3ff,1.4);extra.position.set(400,470,-370);scene.add(extra);
 let tiles=[],selection=null,grid=4,span=224;
 const floorColor=(id)=>FLOOR[id]||FLOOR.oak;
 const wallColor=(id)=>WALL[id]||WALL.cream;
 function furnishing(item,slot,turn){
  const col=slot%grid,row=Math.floor(slot/grid),x=(col+.5-grid/2)*56,z=(row+.5-grid/2)*56;
  const g=group(root,x,0,z);g.rotation.y=turn*Math.PI/2;
  const walnut=0x997453,linen=0xe8dec7,olive=0x87a77d,rose=0xcc9aac,gold=0xd7ba6e;
  switch(item){
   case 'oak_chair':
    block(g,walnut,0,17,0,24,5,23);block(g,walnut,0,33,-10,24,29,5);
    for(const x of [-8,8])for(const z of [-8,8])block(g,0x765c43,x,8,z,4,16,4);
    break;
   case 'tea_table':
    block(g,walnut,0,24,0,38,6,30);for(const x of [-15,15])for(const z of [-10,10])block(g,0x7b614d,x,11,z,4,23,4);
    cyl(g,0xfff3e1,0,28,0,4,4);ball(g,0xb4c5a8,0,32,0,5,3,5);break;
   case 'leaf_plant':
    cyl(g,0xd5a77f,0,9,0,12,16);cyl(g,0x6b8965,0,25,0,3,25);
    for(const [x,y,z] of [[-10,35,4],[11,39,0],[0,43,-9],[-3,49,6]])ball(g,olive,x,y,z,15,5,9);
    break;
   case 'warm_lamp':
    cyl(g,0x786f59,0,5,0,12,5);cyl(g,0x92826c,0,29,0,2,45);
    cyl(g,0xf5d69a,0,53,0,13,20);ball(g,0xffe4a4,0,60,0,10,7,10);break;
   case 'velvet_sofa':
    block(g,rose,0,17,0,41,22,25);block(g,0xba7b94,0,30,-9,41,18,8);
    for(const x of [-19,19])block(g,0xb8899a,x,22,0,7,16,30);
    block(g,linen,-9,26,8,15,6,11);block(g,0xe0bac3,10,26,8,14,6,11);break;
   case 'bookcase':
    block(g,walnut,0,40,0,37,78,17);
    for(const h of [16,36,56]){block(g,0xead1a7,0,h,9,32,3,3);for(const [i,c] of [0xbd8182,0x90a7aa,0xe3cc9e,0x7f9778].entries())block(g,c,-12+i*8,h+8,9,5,15,4)}
    break;
   case 'crystal_lamp':
    cyl(g,gold,0,7,0,12,7);cyl(g,0xc4b8a1,0,35,0,2,54);
    for(let i=0;i<6;i++){const v=i*Math.PI/3;ball(g,0xa6c8d5,Math.cos(v)*11,58,Math.sin(v)*11,7,11,7,'glass')}
    ball(g,0xfef5dd,0,68,0,13,7,13);break;
   case 'royal_piano':
    block(g,0x62494b,0,27,0,43,7,32);block(g,0x8a6148,0,38,-11,39,7,6);
    for(const x of [-17,17])block(g,walnut,x,13,11,4,26,4);
    block(g,0xfff0d0,0,33,17,32,3,12);
    for(let i=0;i<12;i++)block(g,i%5===0?0x333743:0xf4ebdf,-15+i*2.7,36,17,2.4,2,13);
    block(g,gold,0,40,-12,23,3,3,'metal');break;
   case 'royal_chandelier':
    cyl(g,gold,0,62,0,7,5);cyl(g,gold,0,87,0,2,50);
    for(let i=0;i<8;i++){const v=i*Math.PI/4;
     const x=Math.cos(v)*21,z=Math.sin(v)*21;
     cyl(g,0xbfa060,x,67,z,3,4);ball(g,0xf8e1a9,x,75,z,5,9,5);
    }ball(g,0xffebc4,0,76,0,12,14,12);break;
  }
  return g;
 }
 function reset(h){
  snapshot=h;grid=({1:4,2:5,3:6,4:7})[h.level]||4;span=grid*56;
  while(root.children.length)root.remove(root.children[0]);
  tiles=[];
  block(root,0x8d765e,0,-11,0,span+16,18,span+16);
  block(root,floorColor(h.floor),0,-1,0,span,4,span);
  const wall=wallColor(h.wall);
  block(root,wall,0,48,-span/2-2,span+7,100,7);
  block(root,wall,-span/2-2,48,0,7,100,span+7);
  block(root,0xfffcf1,0,97,-span/2+1,span+7,8,4);
  block(root,0xfffcf1,-span/2+1,97,0,4,8,span+7);
  // Window, curtain and warm trims are architectural geometry, not photographs.
  block(root,0xd5e9ef,0,60,-span/2+3,57,46,5);
  block(root,0xfff0cd,0,60,-span/2+7,3,48,4);
  block(root,0xfff0cd,0,60,-span/2+7,59,3,4);
  for(const x of [-30,30])block(root,0xcbb8a9,x,59,-span/2+11,6,58,5);
  for(let row=0;row<grid;row++)for(let col=0;col<grid;col++){
   const x=(col+.5-grid/2)*56,z=(row+.5-grid/2)*56,index=row*grid+col;
   const floor=block(root,(row+col)%2?floorColor(h.floor):h.floor==='royal'?0xe6d8c1:0xd4b18a,
    x,1,z,54,1,54);
   floor.userData.floorSlot=index;tiles.push(floor);
  }
  for(const p of h.placed||[])furnishing(p.item,p.slot,p.turn);
  if(selected!==null&&selected<grid*grid){
   const x=(selected%grid+.5-grid/2)*56,z=(Math.floor(selected/grid)+.5-grid/2)*56;
   selection=block(root,0xf4d481,x,3,z,54,2,54,'glass');
  }else selection=null;
  const dim=span*.90;
  camera.left=-dim;camera.right=dim;camera.top=dim*.75;camera.bottom=-dim*.75;
  camera.updateProjectionMatrix();updateCamera();
 }
 function updateCamera(){
  const orbit=span*1.60;
  camera.position.set(Math.sin(angle)*orbit,span*1.25,Math.cos(angle)*orbit);
  camera.lookAt(0,24,0);
 }
 let pointer=null;
 const canvas=renderer.domElement;
 const down=e=>{pointer={x:e.clientX,y:e.clientY,angle}};
 const move=e=>{if(!pointer)return;const dx=e.clientX-pointer.x;if(Math.abs(dx)>6)angle=pointer.angle+dx*.008;updateCamera()};
 const up=e=>{
  if(!pointer)return;
  const moved=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);pointer=null;
  if(moved>=13||!canvas.isConnected)return;
  const box=canvas.getBoundingClientRect();
  const cursor=new T.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);
  const ray=new T.Raycaster();ray.setFromCamera(cursor,camera);
  const hit=ray.intersectObjects(tiles,false)[0];if(hit){selected=hit.object.userData.floorSlot;reset(snapshot);onSelect(selected)}
 };
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>pointer=null);
 function resize(){
  if(disposed)return;const b=host.getBoundingClientRect();renderer.setSize(Math.max(120,b.width),Math.max(180,b.height),false)
 }
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);
 reset(house);resize();
 function draw(){
  if(disposed)return;
  renderer.render(scene,camera);
  // Idle page load runs no economy and uses one WebGL context only.
  raf=requestAnimationFrame(draw);
 }
 raf=requestAnimationFrame(draw);
 return {
  refresh:next=>{if(disposed)return;reset(next)},
  select:slot=>{if(!disposed){selected=slot;reset(snapshot)}},
  stats:()=>({grid,objects:root.children.length,placed:snapshot.placed?.length||0}),
  dispose:()=>{
   if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();
   canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);
   scene.traverse(o=>{if(o.geometry&&!shared.includes(o.geometry))o.geometry.dispose()});
   for(const g of shared)g.dispose();for(const m of materials.values())m.dispose();
   renderer.dispose();renderer.forceContextLoss();canvas.remove();host.replaceChildren();
  }
 };
}
