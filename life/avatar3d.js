import * as T from './vendor/three.module.js';

// Original Junja clay character. Every wearable is real geometry on the same rig.
const skin = new T.MeshStandardMaterial({color:0xf3c5a0,roughness:.82});
const hairMat = new T.MeshStandardMaterial({color:0x624137,roughness:.86});
const eyeMat = new T.MeshStandardMaterial({color:0x352c2a,roughness:.45});
const white = new T.MeshStandardMaterial({color:0xfffae9,roughness:.86});
const shoeMat = new T.MeshStandardMaterial({color:0x715449,roughness:.88});
const soleMat = new T.MeshStandardMaterial({color:0xe9d9b6,roughness:.96});
const blushMat = new T.MeshStandardMaterial({color:0xe9a18e,roughness:.95});
const sphere = new T.SphereGeometry(1,24,16);
const cylinder = new T.CylinderGeometry(1,1,1,24);
const capsuleCache=new Map();
function mat(color){return new T.MeshStandardMaterial({color,roughness:.9})}
export function ball(parent,material,x,y,z,sx,sy=sx,sz=sx){const m=new T.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function tube(parent,material,r,length,x,y,z){const key=r+':'+length;let geo=capsuleCache.get(key);if(!geo){geo=new T.CapsuleGeometry(r,Math.max(.1,length-2*r),6,12);capsuleCache.set(key,geo)}const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function disc(parent,material,x,y,z,r,h){const m=new T.Mesh(cylinder,material);m.position.set(x,y,z);m.scale.set(r,h,r);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function curve(parent,points,material,r=.8){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(path,16,r,6,false),material);parent.add(m);return m}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g}
function clear(g){for(const child of [...g.children]){g.remove(child);child.traverse(o=>{if(o.geometry&&!Object.values(sharedGeometries).includes(o.geometry)&&!capsuleCacheHas(o.geometry))o.geometry.dispose()})}}
const sharedGeometries={sphere,cylinder};function capsuleCacheHas(g){return [...capsuleCache.values()].includes(g)}
const palette={mint:0x79ab8f,blue:0x699fba,rose:0xd597a6,amber:0xd5a15b,lavender:0xa496c6,coral:0xdd987a,navy:0x485c79,cream:0xe7d6b2,forest:0x638960,pink:0xe5a9bf,linen:0xd8c7a6};
const outfits={};for(const [id,color] of Object.entries(palette))outfits[id]={main:mat(color),dark:mat(new T.Color(color).multiplyScalar(.78)),light:mat(new T.Color(color).lerp(new T.Color(0xfff3d7),.45))};
const pants=mat(0xa1947b),gold=mat(0xe4bc62),ribbonMat=mat(0xc67493),strawMat=mat(0xe6c58b);

export function createAvatar({coat='mint',hat='none',animal=null}={}){
 const root=new T.Group(),pelvis=group(root,0,34),torso=group(pelvis,0,5),head=group(torso,0,42);
 const body=ball(torso,white,0,13,0,14,18,10.5);
 const neck=tube(torso,skin,6,12,0,29,0);
 const face=ball(head,animal?mat(animal==='bear'?0xb78b63:animal==='fox'?0xdba16b:animal==='cat'?0xb5bebf:0xf2e5d1):skin,0,0,0,24,23,20);
 const ears=[];
 if(animal){
  const fur=face.material;
  if(animal==='rabbit'){for(const x of [-11,11]){const ear=ball(head,fur,x,31,-2,7,23,6);ear.rotation.z=x>0?-.12:.12;ball(head,blushMat,x,33,3,3.4,16,1.4);ears.push(ear)}}
  else if(animal==='cat'||animal==='fox'){for(const x of [-18,18]){const geo=new T.ConeGeometry(9,22,3);const ear=new T.Mesh(geo,fur);ear.position.set(x,23,0);ear.rotation.y=Math.PI;head.add(ear);ears.push(ear)}}
  else for(const x of [-21,21]){ball(head,fur,x,19,0,10,11,7);ball(head,blushMat,x,19,6,5,6,1)}
  ball(head,white,0,-8,15,12,9,7);
 }else{for(const x of [-24,24]){ball(head,skin,x,-1,0,5,7,4);ball(head,blushMat,x,-1,3,2,3,1)}}
 // Face features sit on the curved head, not on a floating picture plane.
 const eyes=[];for(const x of [-8.5,8.5]){const eye=ball(head,eyeMat,x,1,18.3,3.1,4.4,1.8);eyes.push(eye);ball(head,white,x-1,2.5,20,1.1,1.25,.5);ball(head,blushMat,x*1.6,-6.3,16.1,4.8,2.4,.7);if(!animal){const brow=tube(head,hairMat,1,7,x,9,17.8);brow.rotation.z=Math.PI/2+(x>0?-.05:.05)}}
 ball(head,animal?eyeMat:skin,0,-4,20.5,animal?3:2.6,2.2,2.2);
 curve(head,[[-3.5,-10,18.7],[0,-11.7,20],[3.5,-10,18.7]],eyeMat,.65);
 const hair=group(head),bangs=group(head);
 if(!animal){
  const cap=new T.Mesh(new T.SphereGeometry(25,24,16,0,Math.PI*2,0,Math.PI*.55),hairMat);cap.position.y=2;cap.scale.z=.87;hair.add(cap);cap.castShadow=true;
  for(const [x,y,z,sx,sy,sz,angle] of [[-15,12,13,9,12,7,-.35],[-4,17,17,10,9,6,.45],[9,18,15,11,8,7,.3],[20,8,4,5,13,8,-.1],[-21,6,1,5,12,8,.1]]){const lock=ball(bangs,hairMat,x,y,z,sx,sy,sz);lock.rotation.z=angle}
  for(let i=0;i<5;i++){const lock=ball(hair,hairMat,-14+i*7,25+Math.sin(i)*3,-4,9,7,10);lock.rotation.z=(i-2)*.16}
 }
 const hatSocket=group(head,0,24),garment=group(torso),limbs=[];
 for(const side of [-1,1]){
  const arm=group(torso,side*17,24),elbow=group(arm,0,-15),armCloth=group(arm),foreCloth=group(elbow);
  tube(arm,skin,4.3,17,0,-7,0);tube(elbow,skin,3.7,15,0,-6,0);ball(elbow,skin,0,-14,0,4.5,5,4.5);
  arm.rotation.z=side*.11;
  const hip=group(pelvis,side*7.5,-1),knee=group(hip,0,-15),ankle=group(knee,0,-13);
  tube(hip,pants,6,20,0,-7,0);tube(knee,pants,5.1,16,0,-6,0);
  disc(knee,white,0,-11,0,5.3,3);
  ball(ankle,shoeMat,0,-1,3.5,7,5.3,10);ball(ankle,soleMat,0,-4.2,3.8,7.3,1.8,10.2);
  curve(ankle,[[-3,2,8],[0,2.8,9],[3,2,8]],white,.65);
  limbs.push({side,arm,elbow,hip,knee,ankle,armCloth,foreCloth});
 }
 if(animal==='fox'||animal==='cat'){const tail=ball(pelvis,face.material,0,7,-16,7,15,8);tail.rotation.x=-.6}
 const equipped={coat:null,hat:null};
 function equip(nextCoat,nextHat){
  if(equipped.coat!==nextCoat){
   equipped.coat=nextCoat;clear(garment);const cloth=outfits[nextCoat]||outfits.mint;
   const dress=['lavender','pink'].includes(nextCoat);
   // One shell replaces the visible torso; sleeves share the exact shoulder/elbow hierarchy.
   body.visible=false;
   const shell=ball(garment,cloth.main,0,12,0,15.8,19,12);shell.name='coat-shell';
   if(dress){const skirt=new T.Mesh(new T.CylinderGeometry(13,22,22,24),cloth.main);skirt.position.set(0,-1,0);skirt.castShadow=true;skirt.receiveShadow=true;garment.add(skirt);disc(garment,cloth.light,0,-11,0,22.2,2)}
   else {disc(garment,cloth.dark,0,-4,0,14.6,3);for(const x of [-8,8]){const pocket=ball(garment,cloth.light,x,5,9.8,5,5,1.5);pocket.name='pocket'}}
   for(const side of [-1,1]){const collar=tube(garment,white,2.5,12,side*4.7,25,10);collar.rotation.z=side*.44}
   for(const y of [18,11,4])ball(garment,gold,0,y,12.2,1.4,1.4,.8);
   for(const limb of limbs){clear(limb.armCloth);clear(limb.foreCloth);tube(limb.armCloth,cloth.main,5.5,18,0,-7,0);tube(limb.foreCloth,cloth.main,4.7,12,0,-4.5,0);disc(limb.foreCloth,cloth.light,0,-10,0,4.9,3)}
  }
  if(equipped.hat!==nextHat){
   equipped.hat=nextHat;clear(hatSocket);hair.visible=nextHat==='none'||['crown','cat','ribbon'].includes(nextHat);
   if(nextHat==='none')return;
   if(nextHat==='straw'||nextHat==='flower'){disc(hatSocket,strawMat,0,-1,0,30,2.8);disc(hatSocket,strawMat,0,6,0,20,13);disc(hatSocket,ribbonMat,0,1,0,20.2,3);if(nextHat==='flower'){for(let i=0;i<5;i++)ball(hatSocket,white,16+Math.cos(i*6.28/5)*4,4+Math.sin(i*6.28/5)*4,17,3,3,1.8);ball(hatSocket,gold,16,4,19,2.2)}}
   else if(nextHat==='crown'){disc(hatSocket,gold,0,0,0,19,7);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const point=new T.Mesh(new T.ConeGeometry(5,12,4),gold);point.position.set(Math.sin(a)*17,7,Math.cos(a)*17);hatSocket.add(point);ball(hatSocket,ribbonMat,Math.sin(a)*19,1,Math.cos(a)*19,2)}}
   else if(nextHat==='cat'){for(const x of [-18,18]){const ear=new T.Mesh(new T.ConeGeometry(8,17,3),shoeMat);ear.position.set(x,2,0);hatSocket.add(ear)}}
   else if(nextHat==='ribbon'){disc(hatSocket,ribbonMat,0,-7,0,24,2);for(const x of [-10,10]){const bow=ball(hatSocket,ribbonMat,x,0,18,12,7,3);bow.rotation.z=x>0?.4:-.4}ball(hatSocket,gold,0,0,20,3)}
   else{const m=nextHat==='beret'?ribbonMat:nextHat==='beanie'?outfits.amber.main:nextHat==='navycap'?outfits.navy.main:white;
    ball(hatSocket,m,nextHat==='beret'?-3:0,0,0,25,10,23);disc(hatSocket,nextHat==='captain'?outfits.navy.main:m,0,-5,0,23,3);
    if(nextHat==='beanie')ball(hatSocket,white,0,10,0,5);if(nextHat==='captain'||nextHat==='navycap'){ball(hatSocket,m,0,-5,18,21,2,12);ball(hatSocket,gold,0,1,23,3,3,1)}}
  }
 }
 let angle=0,lastDistance=0,blend=0;root.userData.rig={pelvis,torso,head,hatSocket,garment,limbs};
 function animate({x,y,vx=0,vy=0,dir=0,stride=0},dt,time){
  root.position.set(x,0,y);const moving=Math.hypot(vx,vy)>1;
  const desired=moving?Math.atan2(vx,vy):[0,Math.PI/2,Math.PI,-Math.PI/2][dir];
  let delta=T.MathUtils.euclideanModulo(desired-angle+Math.PI,Math.PI*2)-Math.PI;angle+=delta*Math.min(1,dt*17);root.rotation.y=angle;
  blend=T.MathUtils.damp(blend,moving?1:0,20,dt);
  const swing=Math.sin(stride)*blend,opposite=Math.sin(stride+Math.PI)*blend;
  pelvis.position.y=34+Math.abs(Math.sin(stride*2))*.6*blend;
  torso.rotation.z=swing*.025;torso.rotation.y=swing*.025;
  head.rotation.z=-swing*.018;head.rotation.x=moving?-.025:Math.sin(time*1.6)*.012;
  for(const l of limbs){const a=l.side<0?swing:opposite;l.hip.rotation.x=a*.48;l.knee.rotation.x=Math.max(0,-a)*.55;l.ankle.rotation.x=-Math.max(0,-a)*.2;l.arm.rotation.x=-a*.38;l.elbow.rotation.x=-.12-Math.max(0,a)*.18;}
  const blink=(time%4.7)>4.58;for(const e of eyes)e.scale.y=blink?.55:4.4;
 }
 equip(coat,hat);return {root,equip,animate,equipped,rig:root.userData.rig};
}
