import * as T from './vendor/three.module.js';
import {createAvatar,ball,tube} from './avatar3d.js';
import {createPet} from './fashion-3d.js';
import {CATALOG_BY_ID} from './fashion-catalog.js';

const materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.95}));return materials.get(color)}
const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,16,12),cylinderGeo=new T.CylinderGeometry(1,1,1,20);
function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,typeof color==='object'?color:material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(p,color,x,y,z,w,h,d){return mesh(p,boxGeo,color,x,y,z,w,h,d)}
function sphere(p,color,x,y,z,w,h=w,d=w){return mesh(p,sphereGeo,color,x,y,z,w,h,d)}
function cylinder(p,color,x,y,z,r,h){return mesh(p,cylinderGeo,color,x,y,z,r,h,r)}
function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g}
function label(parent,text,x,y,z,width=150,own=false){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false,depthTest:false,transparent:true}));
 sprite.renderOrder=500;sprite.position.set(x,y,z);
 const renderName=(name)=>{
  ctx.clearRect(0,0,512,128);
  const title=(own?'★ ':'')+String(name||'마을 친구').slice(0,12);
  const isSpeech=width>=160;
  const fontSize=isSpeech?43:51;
  ctx.font='900 '+fontSize+'px "Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const measured=ctx.measureText(title).width;
  const pillWidth=Math.min(490,Math.max(112,Math.ceil(measured+52)));
  const left=(512-pillWidth)/2;
  ctx.shadowColor='rgba(24,45,31,.22)';ctx.shadowBlur=6;ctx.shadowOffsetY=3;
  ctx.fillStyle=own?'#fff0b8':'rgba(255,253,242,.97)';
  ctx.beginPath();ctx.roundRect(left,15,pillWidth,98,35);ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle=own?'#b58b31':'#72977d';ctx.lineWidth=4;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.fillStyle='#183a2b';ctx.fillText(title,256,64,pillWidth-35);
  const scaledWidth=width*(pillWidth/512)*1.1;
  sprite.scale.set(scaledWidth, width*1.1/4,1);
  tex.needsUpdate=true;
 };
 renderName(text);sprite.userData.setLabel=renderName;parent.add(sprite);return sprite;
}
function gable(parent,color,width,depth,height,y){
 const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,height);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:4,bevelThickness:4});const roof=new T.Mesh(g,material(color));roof.position.set(0,y,-depth/2);roof.castShadow=true;roof.receiveShadow=true;parent.add(roof);return roof;
}
function building(scene,{x,y,w=280,d=180,roof=0x6e9a99,kind='shop',name='가게',action}){
 const g=group(scene,x,0,y);g.userData.pick={type:'station',id:action};
 box(g,0xc6ae87,0,7,0,w+32,14,d+25);box(g,0xf3e5c7,0,82,0,w,145,d);
 for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])cylinder(g,0xb79b6f,xx,76,zz,7,145);
 box(g,0xd6c29b,0,20,d/2+1,w,22,4);
 gable(g,roof,w+42,d+40,75,155);
 for(const xx of [-w/2-18,w/2+18])box(g,0xf5e7ce,xx,152,0,10,10,d+50);
 // Roof boards follow the two sloping faces; no photograph facades.
 for(let i=0;i<9;i++){const z=-d/2-14+i*(d+28)/8;const a=box(g,0xffffff, -w/4,192,z,w*.58,2,2);a.rotation.z=.49;a.material=material(new T.Color(roof).lerp(new T.Color(0xffffff),.1).getHex());const b=a.clone();b.position.x=w/4;b.rotation.z=-.49;g.add(b)}
 const door=box(g,0x897558,0,49,d/2+4,43,83,8);box(g,0x6c927f,0,63,d/2+9,28,36,2);sphere(g,0xe8cc7a,13,43,d/2+11,3);box(g,0xf6edd4,0,97,d/2+9,54,9,10);
 for(const xx of [-w*.31,w*.31]){box(g,0xeee3c8,xx,82,d/2+4,59,65,10);box(g,0x89b6b7,xx,83,d/2+10,46,52,2);box(g,0xf7eacb,xx,83,d/2+13,4,54,3);box(g,0xf7eacb,xx,83,d/2+13,48,4,3);box(g,0x9eaf78,xx,46,d/2+14,65,16,18);for(let j=-1;j<=1;j++){sphere(g,0x70955b,xx+j*16,58,d/2+14,11,11,9);sphere(g,0xe6b3b0,xx+j*17,65,d/2+15,5)}}
 if(kind!=='home'){for(let i=0;i<7;i++){const awning=box(g,i%2?0xf5eac9:roof,-w*.37+i*w*.123,119,d/2+25,w*.123,7,55);awning.rotation.x=.12;const lip=cylinder(g,i%2?0xf5eac9:roof,-w*.37+i*w*.123,112,d/2+52,8,w*.123);lip.rotation.z=Math.PI/2}}
 const chimney=box(g,0xb08b75,w*.3,211,-d*.25,28,70,30);box(g,0x876e62,w*.3,248,-d*.25,35,9,37);
 box(g,0xe1ceaa,0,5,d/2+31,67,10,35);
 label(g,name,0,260,0,170);
 return g;
}
function tree(scene,x,z,{fruit=false,pink=false,size=1}={}){
 const g=group(scene,x,0,z);g.scale.setScalar(size);cylinder(g,0x9f8059,0,40,0,11,80);const b=cylinder(g,0x9f8059,-9,63,0,6,40);b.rotation.z=.55;
 const colors=pink?[0xe8b4be,0xf2c7c5,0xdca7b6]:[0x83b36b,0x9fc17b,0x75a565];
 for(const [i,a] of [[0,[-27,101,0,35]],[1,[22,105,0,37]],[2,[0,127,-3,41]],[3,[0,102,23,35]]])sphere(g,colors[i%3],a[0],a[1],a[2],a[3],a[3]*.95,a[3]);
 if(fruit)for(const [xx,yy,zz] of [[-24,105,29],[18,122,26],[7,89,35]]){sphere(g,0xe7b166,xx,yy,zz,8);const leaf=sphere(g,0x648c53,xx+3,yy+7,zz,5,2,3);leaf.rotation.z=.4}
 return g;
}
function flower(scene,x,z,color=0xe9bcb5){const g=group(scene,x,.5,z);cylinder(g,0x6d9557,0,6,0,1.1,12);sphere(g,0x85a863,-3,4,0,4,1.4,2);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;sphere(g,color,Math.cos(a)*4,12,Math.sin(a)*4,3.5,1.8,3.5)}sphere(g,0xe4bf6c,0,13,0,2.8);return g}
function road(scene,points,width=70,color=0xdfcea7){const g=group(scene);for(let i=1;i<points.length;i++){const [x1,z1]=points[i-1],[x2,z2]=points[i];const len=Math.hypot(x2-x1,z2-z1),piece=box(g,color,(x1+x2)/2,1,(z1+z2)/2,width,2,len);piece.rotation.y=Math.atan2(x2-x1,z2-z1);piece.castShadow=false;cylinder(g,color,x1,1,z1,width/2,2).castShadow=false;}const last=points.at(-1);cylinder(g,color,last[0],1,last[1],width/2,2).castShadow=false;return g}
function bench(scene,x,z){const g=group(scene,x,0,z);for(const xx of [-25,25])for(const zz of [-10,10])box(g,0x8c7756,xx,11,zz,5,22,5);for(let j=0;j<3;j++)box(g,0xd2b686,0,24,-10+j*9,65,5,7);box(g,0xc4a475,0,40,-14,65,17,5);return g}
function lamp(scene,x,z){const g=group(scene,x,0,z);cylinder(g,0x79917c,0,42,0,3,84);cylinder(g,0x79917c,0,3,0,10,6);box(g,0xf5dc9b,0,90,0,15,22,15);const roof=new T.Mesh(new T.ConeGeometry(15,12,4),material(0x6f8776));roof.position.y=107;roof.rotation.y=Math.PI/4;g.add(roof);return g}
function fountain(scene){const g=group(scene,1010,0,695);g.userData.pick={type:'action',kind:'fountain'};cylinder(g,0xe4d4b6,0,5,0,91,10);cylinder(g,0xc8c5ae,0,15,0,79,18);cylinder(g,0x8ec7c1,0,25,0,70,2);cylinder(g,0xc8c5ae,0,47,0,13,43);cylinder(g,0xdad6be,0,66,0,40,12);cylinder(g,0xa5d5c9,0,73,0,34,2);sphere(g,0xe4d4b6,0,87,0,11);return g}
function soilBed(scene,x,z,i){const g=group(scene,x,0,z);g.userData.pick={type:'farm',idx:i};box(g,0x9e8059,0,2,0,64,4,62);for(let j=-1;j<=1;j++)box(g,0x92734f,0,4,j*17,58,2,2);return g}

// Merge static meshes by material inside each object. The parent still owns picking and transforms.
function batchStatic(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;let list=buckets.get(o.material);if(!list){list=[];buckets.set(o.material,list)}list.push(o)});
 for(const [mat,list] of buckets){if(list.length<2)continue;const positions=[],normals=[];
  for(const m of list){let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));const pos=g.getAttribute('position'),normal=g.getAttribute('normal');for(let i=0;i<pos.count;i++){positions.push(pos.getX(i),pos.getY(i),pos.getZ(i));normals.push(normal.getX(i),normal.getY(i),normal.getZ(i))}g.dispose();m.parent.remove(m)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();const merged=new T.Mesh(geo,mat);merged.castShadow=true;merged.receiveShadow=true;root.add(merged);
 }
}
export function createWorld({canvas,width,height,stations,resources,beds,npcs,animals,walkable,nickname='준자'}){
 const isCompact=typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 // Limit retina backbuffer fill-rate on phones without changing CSS tap coordinates.
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,isCompact?1.35:1.8));renderer.setClearColor(0xbadbd0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 // Mobile shadows are expensive: update when the light follows a meaningful distance.
 renderer.shadowMap.autoUpdate=false;
 let lastShadowPos={x:Infinity,y:Infinity},lastShadowTime=-10;
 const scene=new T.Scene();scene.background=new T.Color(0xb3decd);
 // Raycast only intentionally interactive objects, not the full island/grass meshes.
 const pickRoots=[];
 const camera=new T.OrthographicCamera(-400,400,400,-400,1,5000),raycaster=new T.Raycaster(),groundPlane=new T.Plane(new T.Vector3(0,1,0),0),v=new T.Vector3();
 scene.add(new T.HemisphereLight(0xfff6de,0x94b294,2.65));
  // A soft frontal fill brings out the face, eyes and sleeve trim without changing scale.
  const faceFill=new T.DirectionalLight(0xfff3de,1.0);
  faceFill.position.set(0,420,620);scene.add(faceFill);const sun=new T.DirectionalLight(0xffedca,3.1);sun.position.set(-400,900,400);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-680;sun.shadow.camera.right=680;sun.shadow.camera.top=680;sun.shadow.camera.bottom=-680;sun.shadow.camera.near=10;sun.shadow.camera.far=2200;sun.shadow.bias=-.0004;sun.shadow.normalBias=1.7;scene.add(sun);scene.add(sun.target);
 const water=box(scene,0x8bc6c3,width/2,-24,height/2,width+2000,28,height+2000);water.castShadow=false;
 const edge=[[70,110],[1930,110],[1930,710],[2070,710],[2070,110],[3530,110],[3530,2330],[2070,2330],[2070,1070],[1930,1070],[1930,1150],[1585,1150],[1585,1400],[1375,1400],[1375,1580],[570,1580],[570,1470],[445,1470],[445,1230],[70,1230]];
 const shape=new T.Shape();edge.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const landGeo=new T.ExtrudeGeometry(shape,{depth:26,bevelEnabled:true,bevelThickness:8,bevelSize:10,bevelSegments:2,steps:1});const land=new T.Mesh(landGeo,[material(0xb5cc91),material(0xd7c59d)]);land.rotation.x=-Math.PI/2;land.position.y=-34;land.receiveShadow=true;scene.add(land);
 // Grass top is y=0, matching the movement plane. A continuous beach edge borders the island.
 const grass=new T.Mesh(new T.ShapeGeometry(shape),material(0xb5cc91));grass.rotation.x=-Math.PI/2;grass.position.y=.02;grass.receiveShadow=true;scene.add(grass);
 road(scene,[[515,610],[700,790],[820,900],[1130,900],[1390,645]],78);
 road(scene,[[1010,785],[1050,955],[1030,1100],[1030,1350]],80);
 road(scene,[[1130,900],[1490,1020],[1464,1168]],70);
 road(scene,[[1490,1020],[1780,960],[2130,900],[2500,800],[3100,920]],78);
 road(scene,[[2130,900],[2150,1450],[2470,2140],[2910,1900],[3350,1660],[3200,1430],[3100,920]],72);
 cylinder(scene,0xe6d7b8,1010,.8,695,150,1.5).castShadow=false;
 pickRoots.push(building(scene,{x:515,y:470,w:275,d:180,roof:0x7b9b83,name:'해빛 상점',action:'shop'}));
 pickRoots.push(building(scene,{x:1430,y:465,w:260,d:180,roof:0xbb8b7f,kind:'home',name:'우리집',action:'home'}));
 pickRoots.push(building(scene,{x:1585,y:837,w:240,d:140,roof:0xe2bc78,name:'씨앗 가게',action:'seeds'}));
 pickRoots.push(building(scene,{x:2500,y:640,w:280,d:175,roof:0x8e9eab,name:'나무결 공방',action:'workshop'}));
 pickRoots.push(building(scene,{x:3100,y:740,w:280,d:175,roof:0xbda4ba,name:'달빛 의상실',action:'boutique'}));
 pickRoots.push(building(scene,{x:2910,y:1740,w:310,d:170,roof:0x81a695,name:'숲속 교역소',action:'lodge'}));
 pickRoots.push(fountain(scene));bench(scene,845,875);bench(scene,1160,810);bench(scene,2740,1940);
 for(const [x,z] of [[650,780],[1340,780],[760,1100],[1450,1020],[1215,605],[740,610],[2130,950],[2700,860],[3100,1000],[2830,1940]])lamp(scene,x,z);
 // Pier physically projects above the sea; fish action uses this same location.
 const dock=group(scene,1498,0,1240);dock.userData.pick={type:'station',id:'pier'};for(let j=0;j<12;j++)box(dock,j%2?0xc8a77a:0xd2b386,0,2,-50+j*10,94,5,8);for(const x of [-50,50])for(const z of [-50,60]){cylinder(dock,0x9c815e,x,12,z,5,35);sphere(dock,0xbfa17b,x,30,z,6,3,6)}
 pickRoots.push(dock);
 const solids=[],treeGroups=[];
 // Hand-placed borders avoid blocking the deliberately designed paths.
 const treeCoords=[[210,280],[350,190],[760,240],[1030,230],[1220,180],[1700,260],[1830,450],[250,650],[190,920],[530,1010],[610,1400],[720,1470],[1360,1090],[1830,1080],[2200,350],[2380,260],[2740,300],[2940,250],[3270,400],[3410,600],[3450,1000],[3470,1900],[3320,2160],[3100,2230],[2750,2240],[2160,2260]];
 for(const [i,[x,z]] of treeCoords.entries()){treeGroups.push(tree(scene,x,z,{pink:i%5===0,fruit:i%4===0,size:.9+(i%3)*.11}));solids.push({x,z,r:18})}
 const resGroups=new Map();for(const r of resources){let g;if(r.kind==='wood'){g=tree(scene,r.x,r.y,{fruit:true,size:.8});solids.push({x:r.x,z:r.y,r:12})}else if(r.kind==='stone'){g=group(scene,r.x,0,r.y);for(const [x,z,s] of [[0,0,25],[-15,13,14],[20,5,12]]){const rock=new T.Mesh(new T.DodecahedronGeometry(s,1),material(0xa7b1a3));rock.position.set(x,s*.6,z);rock.scale.y=.7;rock.castShadow=true;rock.receiveShadow=true;g.add(rock)}}else{g=group(scene,r.x,0,r.y);for(let j=0;j<5;j++)flower(g,Math.cos(j*1.25)*13,Math.sin(j*1.25)*13,j%2?0xe4c56e:0xeab4b2)}g.userData.pick={type:'gather',id:r.id};resGroups.set(r.id,g);pickRoots.push(g)}
 // Small ground details use instancing to keep the mobile draw-call cost bounded.
 const grassDetail=new T.InstancedMesh(new T.ConeGeometry(2,8,3),material(0x9bb97d),700);const matrix=new T.Matrix4();let count=0;for(let i=0;i<3000&&count<700;i++){const x=100+(i*173)%3400,z=160+(i*317)%2100;if(!walkable(x,z))continue;matrix.makeTranslation(x,4,z);grassDetail.setMatrixAt(count++,matrix)}grassDetail.count=count;scene.add(grassDetail);
 const bedGroups=beds.map((b,i)=>soilBed(scene,b.x,b.y,i)),cropGroups=beds.map((b)=>group(scene,b.x,0,b.y));let cropKey='';
 pickRoots.push(...bedGroups);
 for(const object of [...scene.children])if(object.isGroup)batchStatic(object);
 const player=createAvatar(),villagers=npcs.map((n,i)=>{const a=createAvatar({coat:n.coat,hat:n.hat});a.root.userData.pick={type:'npc',index:i};scene.add(a.root);label(a.root,n.name,0,142,0,118);pickRoots.push(a.root);return a});scene.add(player.root);
 const residents=animals.map((n,i)=>{const a=createAvatar({coat:['lavender','mint','amber','rose'][i],animal:n.species});a.root.scale.setScalar(.85);a.root.userData.pick={type:'animal',id:n.id};scene.add(a.root);label(a.root,n.name,0,n.species==='rabbit'?161:140,0,118);pickRoots.push(a.root);return a});
 const questMarkers=animals.map(()=>{const mark=label(scene,'❗',0,185,0,48);mark.visible=false;return mark});
 const playerLabel=label(scene,nickname,0,143,0,120,true);
 const playerSpeech=label(scene,'',0,192,0,172);playerSpeech.visible=false;
 let playerPhrase='',playerPhraseUntil=0;
 function sayLocal(text){
   if(!text){playerSpeech.visible=false;playerPhraseUntil=0;return}
   playerPhrase=String(text).slice(0,25);playerPhraseUntil=Date.now()+3200;
   playerSpeech.userData.setLabel('💬 '+playerPhrase);playerSpeech.visible=true;
 }
 // Online guests are real articulated actors with the same wardrobe rig.
 const guestAvatars=new Map();
 function updateGuests(peers,dt,time){
  for(const id of guestAvatars.keys())if(!Object.hasOwn(peers,id)){
   const old=guestAvatars.get(id);scene.remove(old.avatar.root);old.avatar.dispose();if(old.pet){scene.remove(old.pet.root);old.pet.dispose()}guestAvatars.delete(id);
  }
  for(const [id,p] of Object.entries(peers)){
   let rec=guestAvatars.get(id);
   if(!rec){
    const avatar=createAvatar({coat:p.coat||'mint',hat:p.hat||'none'});
    scene.add(avatar.root);label(avatar.root,String(p.nick||'마을친구').slice(0,12),0,139,0,120);
    const speech=label(avatar.root,'',0,186,0,171);speech.visible=false;
    rec={avatar,speech,spoken:'',prevX:p.x,prevY:p.y,distance:0,pet:null,petId:null};
    guestAvatars.set(id,rec);
   }
   const dx=p.x-rec.prevX,dy=p.y-rec.prevY,movement=Math.hypot(dx,dy);
   rec.distance+=movement/70*Math.PI*2;rec.prevX=p.x;rec.prevY=p.y;
   rec.avatar.equip(p.fashion?.outfit||p.coat||'mint',p.hat||'none');
   rec.avatar.setFashion(p.fashion||{});
   const nextPet=CATALOG_BY_ID[p.fashion?.pet]?.type==='pet'?p.fashion.pet:null;
   if(nextPet!==rec.petId){
    if(rec.pet){scene.remove(rec.pet.root);rec.pet.dispose();rec.pet=null}
    rec.petId=nextPet;
    if(nextPet){rec.pet=createPet(CATALOG_BY_ID[nextPet]);scene.add(rec.pet.root)}
   }
   if(rec.pet)rec.pet.update(p.x+41,p.y+21,dt,time);
   const phrase=p.phraseUntil>Date.now()?p.phrase:null;
   if(phrase!==rec.spoken){
    rec.spoken=phrase;
    rec.speech.visible=Boolean(phrase);
    if(phrase)rec.speech.userData.setLabel('💬 '+phrase);
   }
   rec.avatar.animate({x:p.x,y:p.y,vx:movement>0.01?dx/Math.max(dt,.001):0,vy:movement>0.01?dy/Math.max(dt,.001):0,dir:p.dir||0,stride:rec.distance},dt,time);
  }
 }
 const destination=new T.Mesh(new T.RingGeometry(12,17,32),new T.MeshBasicMaterial({color:0xfff3b1,side:T.DoubleSide}));destination.rotation.x=-Math.PI/2;destination.position.y=2;scene.add(destination);destination.visible=false;
 const pathLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xfff6dc,dashSize:10,gapSize:8,transparent:true,opacity:.7}));scene.add(pathLine);let routeKey='';
 const decorGroup=group(scene);let decorKey='';
 let cw=0,ch=0,currentPlayer={x:1050,y:955};
 function resize(){const w=innerWidth,h=innerHeight;if(w===cw&&h===ch)return;cw=w;ch=h;renderer.setSize(w,h,false);const viewWidth=Math.max(450,Math.min(1100,w*1.12)),viewHeight=viewWidth*h/w;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix()}
 function follow(p){
  currentPlayer=p;
  // Keep the orthographic FOV and player scale identical to v18.
  // V22: tilt slightly toward eye-level (~32°), retaining the same world scale and tap projection.
  camera.position.set(p.x,595,p.y+880);
  camera.lookAt(p.x,46,p.y);
  camera.updateMatrixWorld();
  faceFill.position.set(p.x-130,450,p.y+550);
  sun.position.set(p.x-360,900,p.y+350);sun.target.position.set(p.x,0,p.y);sun.target.updateMatrixWorld();
 }
 function projectRay(sx,sy){resize();raycaster.setFromCamera(new T.Vector2(sx/cw*2-1,1-sy/ch*2),camera)}
 function screenToWorld(sx,sy){projectRay(sx,sy);const hit=raycaster.ray.intersectPlane(groundPlane,v);return hit?{x:hit.x,y:hit.z}:{x:currentPlayer.x,y:currentPlayer.y}}
 function pick(sx,sy){
  projectRay(sx,sy);
  // Static background can never intercept a tap intended for a person or workbench.
  const hits=raycaster.intersectObjects(pickRoots,true);
  for(const hit of hits){
   let o=hit.object,pick=null,visible=true;
   if(o.isSprite)continue;
   while(o&&o!==scene){if(!o.visible){visible=false;break}if(o.userData.pick)pick=o.userData.pick;o=o.parent}
   if(visible&&pick)return pick;
  }
  return null;
 }
 const previewCanvas=document.createElement('canvas');previewCanvas.id='fitting3D';previewCanvas.setAttribute('aria-label','입체 캐릭터 전신 착용 미리보기 · 손가락으로 돌려보기');
 let fittingPointer=null,lastFittingX=0;
 previewCanvas.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;fittingPointer=e.pointerId;lastFittingX=e.clientX;try{previewCanvas.setPointerCapture(e.pointerId)}catch{}});
 previewCanvas.addEventListener('pointermove',e=>{if(fittingPointer!==e.pointerId)return;previewAngle+=(e.clientX-lastFittingX)*.014;lastFittingX=e.clientX;e.preventDefault()});
 const endFittingPointer=e=>{if(fittingPointer!==e.pointerId)return;fittingPointer=null;try{previewCanvas.releasePointerCapture(e.pointerId)}catch{}};
 previewCanvas.addEventListener('pointerup',endFittingPointer);previewCanvas.addEventListener('pointercancel',endFittingPointer);
 let previewRenderer=null,previewScene=null,previewCamera=null,previewAvatar=null,previewPet=null,previewAngle=0,previewWalking=false,previewLook={coat:'mint',hat:'none',fashion:{}};
 function fitting(parent,coat,hat,fashion={}){
  if(!previewRenderer){previewRenderer=new T.WebGLRenderer({canvas:previewCanvas,antialias:true,alpha:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));previewRenderer.setSize(300,320,false);previewRenderer.outputColorSpace=T.SRGBColorSpace;previewRenderer.toneMapping=T.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.3;previewScene=new T.Scene();previewScene.add(new T.HemisphereLight(0xfff5df,0x8b9c86,3));const l=new T.DirectionalLight(0xffeed6,3);l.position.set(-70,160,100);previewScene.add(l);/* symmetric camera bounds center the whole character rather than burying its feet below the viewport */previewCamera=new T.OrthographicCamera(-79.7,79.7,85,-85,.1,1000);previewCamera.position.set(0,99,255);previewCamera.lookAt(0,69,0);previewAvatar=createAvatar();previewScene.add(previewAvatar.root);cylinder(previewScene,0xdce5cc,0,-4,0,40,6)}
  parent.appendChild(previewCanvas);
  // Match the real phone-sized container without squashing the horizontal silhouette.
  const fitWidth=Math.min(300,Math.max(200,parent.clientWidth||300));
  if(previewCanvas.style.width!==fitWidth+'px'){
   previewRenderer.setSize(fitWidth,320,false);
   previewCamera.left=-85*fitWidth/320;previewCamera.right=85*fitWidth/320;
   previewCamera.top=85;previewCamera.bottom=-85;previewCamera.updateProjectionMatrix();
   previewCanvas.style.width=fitWidth+'px';previewCanvas.style.height='320px';
  }
  previewLook={coat,hat,fashion};
  previewAvatar.equip(fashion.outfit||coat,hat);
  previewAvatar.setFashion(fashion);
  if(previewPet){previewScene.remove(previewPet.root);previewPet.dispose();previewPet=null}
  if(CATALOG_BY_ID[fashion.pet]?.type==='pet'){
    previewPet=createPet(CATALOG_BY_ID[fashion.pet]);previewScene.add(previewPet.root);
    previewPet.root.position.set(49,0,26);previewPet.root.scale.setScalar(.77);
  }
 }
 function updateCrops(state){const key=state.beds.map(b=>b.crop+':'+Math.min(3,Math.floor((Date.now()-b.at)/1000/({carrot:65,strawberry:120,pumpkin:220,lily:300}[b.crop]||1)*3))).join('|');if(key===cropKey)return;cropKey=key;
  state.beds.forEach((b,i)=>{const g=cropGroups[i];g.clear();if(!b.crop)return;const age=Math.min(1,(Date.now()-b.at)/1000/({carrot:65,strawberry:120,pumpkin:220,lily:300}[b.crop]||65));for(let j=0;j<6;j++){const x=(j%3-1)*18,z=(Math.floor(j/3)-.5)*22;const stem=cylinder(g,0x729252,x,4+age*5,z,1.8,8+age*10);for(const k of [-1,1]){const leaf=sphere(g,0x88a964,x+k*4,8+age*8,z,5+age*2,2.2,3);leaf.rotation.z=k*.4}if(age>=.66)sphere(g,b.crop==='carrot'?0xe2a465:b.crop==='strawberry'?0xd68b83:b.crop==='pumpkin'?0xe3bc6d:0xf1dab1,x,7,z,4+age*3,5+age*2,4+age*3)}})
 }
 function updateDecor(state){const key=JSON.stringify(state.decorations);if(key===decorKey)return;decorKey=key;decorGroup.clear();for(const d of state.decorations){if(d.id==='bench')bench(decorGroup,d.x,d.y);else if(d.id==='lantern')lamp(decorGroup,d.x,d.y);else if(d.id==='topiary')tree(decorGroup,d.x,d.y,{size:.4});else if(d.id==='birdbath'){const g=group(decorGroup,d.x,0,d.y);cylinder(g,0xd8d0b9,0,20,0,5,40);cylinder(g,0xd8d0b9,0,40,0,22,6);cylinder(g,0x94c7c0,0,44,0,18,1)}else if(d.id==='picnic'){box(decorGroup,0xe5bdb0,d.x,2,d.y,65,2,55)}else{const g=group(decorGroup,d.x,0,d.y);cylinder(g,0xc49d80,0,9,0,12,18);for(const [x,z] of [[0,0],[-6,5],[5,-5]]){const f=flower(g,x,z);f.position.y=16}}}}
 let lastFrameMs=0,frameCount=0,avgMs=0;
 let petActor=null,petId=null;
 function updateCompanion(pet,x,y,dt,time){
  const valid=CATALOG_BY_ID[pet]?.type==='pet'?pet:null;
  if(valid!==petId){
   if(petActor){scene.remove(petActor.root);petActor.dispose();petActor=null}
   petId=valid;
   if(valid){petActor=createPet(CATALOG_BY_ID[valid]);scene.add(petActor.root)}
  }
  if(petActor)petActor.update(x,y,dt,time);
 }
 function render({state,actor,npcs:ns,animals:as,peers={},time,dt,goal,path}){
  resize();follow(actor);
  if(time-lastShadowTime>.28||Math.hypot(actor.x-lastShadowPos.x,actor.y-lastShadowPos.y)>75){
   renderer.shadowMap.needsUpdate=true;lastShadowPos={x:actor.x,y:actor.y};lastShadowTime=time;
  }
  const fashion=state.fashion?.equipped||{};
  player.equip(fashion.outfit||state.coat,state.hat);
  player.setFashion(fashion);
  player.animate(actor,dt,time);
  updateCompanion(fashion.pet,actor.x,actor.y,dt,time);
  playerLabel.position.set(actor.x,143,actor.y);
  playerSpeech.position.set(actor.x,194,actor.y);
  if(playerSpeech.visible&&Date.now()>playerPhraseUntil)playerSpeech.visible=false;
  ns.forEach((n,i)=>{villagers[i].animate({x:n.x,y:n.y,dir:0},dt,time+i)});
  as.forEach((n,i)=>{residents[i].animate({x:n.x,y:n.y,vx:n.moving?n.dx-n.x:0,vy:n.moving?n.dy-n.y:0,stride:(n.travel||0)/70*Math.PI*2,dir:0},dt,time+i)});
  as.forEach((n,i)=>{const m=questMarkers[i];if(m){m.visible=!!n.questMark;m.position.set(n.x,195+Math.sin(time*3+i)*5,n.y)}});
  updateGuests(peers,dt,time);
  for(const r of resources){const ready=!(state.nodeReady[r.id]>Date.now()),g=resGroups.get(r.id);g.scale.y=ready?1:.55;}
  updateCrops(state);updateDecor(state);
  destination.visible=!!goal;if(goal)destination.position.set(goal.x,2,goal.y);
  const key=path.map(p=>Math.round(p.x)+','+Math.round(p.y)).join(';');if(key!==routeKey){routeKey=key;pathLine.geometry.dispose();pathLine.geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(actor.x,2,actor.y),...path.map(p=>new T.Vector3(p.x,2,p.y))]);pathLine.computeLineDistances();pathLine.visible=path.length>0}
  // Hide fully off-screen small objects before traversing their meshes.
  for(const g of [...treeGroups,...resGroups.values()])g.visible=Math.abs(g.position.x-actor.x)<950&&Math.abs(g.position.z-actor.y)<1400;
  renderer.render(scene,camera);
  if(previewRenderer&&previewCanvas.isConnected){
   previewAvatar.equip(previewLook.fashion?.outfit||previewLook.coat,previewLook.hat);
   previewAvatar.setFashion(previewLook.fashion);
   previewAvatar.animate({x:0,y:0,vx:previewWalking?1.1:0,vy:previewWalking?1.1:0,stride:time*8},dt,time);
   previewAvatar.root.rotation.y=previewAngle;
   if(previewPet){previewPet.root.rotation.y=previewAngle;previewPet.root.children[0].position.y=Math.sin(time*4)*1.5}
   previewRenderer.render(previewScene,previewCamera);
  }
  avgMs+=(dt*1000-avgMs)*.05;frameCount++;
 }
 resize();follow(currentPlayer);
 return {render,screenToWorld,pick,fitting,setNickname:(name)=>playerLabel.userData.setLabel(name),sayLocal,turnFitting:()=>{previewAngle+=Math.PI/4},walkFitting:()=>{previewWalking=!previewWalking;return previewWalking},blocked:(x,z)=>solids.some(s=>Math.hypot(x-s.x,z-s.z)<s.r+8),stats:()=>({renderer:'WebGL 3D',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,averageFrameMs:Math.round(avgMs),frames:frameCount,rig:'shared joint hierarchy',mobileBackbuffer:isCompact?1.35:1.8,interactiveRaycastRoots:pickRoots.length,onlineGuests:guestAvatars.size,displayNameWidth:playerLabel.scale.x,speech:playerSpeech.visible?playerPhrase:null,pet:petId,faceCameraElevation:Math.round(Math.atan2(595-46,880)*180/Math.PI),fittingView:previewCamera?(()=>{previewAvatar.root.updateMatrixWorld(true);previewCamera.updateMatrixWorld(true);const box=new T.Box3().setFromObject(previewAvatar.root);return {width:previewCanvas.clientWidth,height:previewCanvas.clientHeight,feetNdcY:new T.Vector3(0,box.min.y,0).project(previewCamera).y,headNdcY:new T.Vector3(0,box.max.y,0).project(previewCamera).y}})():null,coat:player.equipped.coat,hat:player.equipped.hat}),dispose:()=>{for(const guest of guestAvatars.values())guest.avatar.dispose();guestAvatars.clear();if(petActor)petActor.dispose();if(previewPet)previewPet.dispose();for(const guest of guestAvatars.values())if(guest.pet)guest.pet.dispose();renderer.dispose();previewRenderer?.dispose()}};
}
