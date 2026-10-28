import * as T from './vendor/three.module.js';
import {CATALOG_BY_ID} from './fashion-catalog.js';
import {sampleFootGait,sampleBodyGait} from './gait-pose-v58.js';
import {sampleFaceExpression} from './face-expression-v65.js';
import {sampleSkirtClearance} from './skirt-clearance-v62.js';
import {sampleHeadwearMotion} from './headwear-motion-v63.js';
import {resolveHairHatFit,sampleLooseHairMotion} from './hair-hat-fit-v64.js';
import {sampleTurnAnticipation} from './turn-anticipation-v60.js';
import {sampleContactShadow} from './contact-shadow-v61.js';
import {renderHair,renderAccessory,decorateOutfit} from './fashion-3d.js';

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
for(const item of Object.values(CATALOG_BY_ID))if(item.type==='outfit'){
 outfits[item.id]={main:mat(item.color),dark:mat(new T.Color(item.color).multiplyScalar(.76)),
 light:mat(item.accent)};
}
const pants=mat(0xa1947b),gold=mat(0xe4bc62),ribbonMat=mat(0xc67493),strawMat=mat(0xe6c58b);

export function createAvatar({coat='mint',hat='none',animal=null}={}){
 const root=new T.Group(),pelvis=group(root,0,34),torso=group(pelvis,0,5),head=group(torso,0,42);
 // Low-cost ground contact: body ambience + independently fading shoe shadows.
 // Shadows live on the avatar root, not on the moving pelvis or clothing rig.
 const shadowMaterials=[];
 function groundShadow(x,z,width,depth,opacity){
  const material=new T.MeshBasicMaterial({color:0x294a37,transparent:true,opacity,depthWrite:false});
  const mesh=new T.Mesh(new T.CircleGeometry(1,32),material);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.set(x,.18,z);
  mesh.scale.set(width,depth,1);
  root.add(mesh);shadowMaterials.push(material);
  return mesh;
 }
 groundShadow(0,0,18,11,.075);
 const footShadows=new Map([[-1,groundShadow(-7.5,3.8,8,5,.13)],[1,groundShadow(7.5,3.8,8,5,.13)]]);
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
 const eyes=[];for(const x of [-8.5,8.5]){const eyeRig=group(head,x,1,18.3);eyeRig.name='eye-rig';ball(eyeRig,eyeMat,0,0,0,3.1,4.4,1.8);ball(eyeRig,white,-1,1.5,1.7,1.1,1.25,.5);eyes.push(eyeRig);ball(head,blushMat,x*1.6,-6.3,16.1,4.8,2.4,.7);if(!animal){const brow=tube(head,hairMat,1,7,x,9,17.8);brow.rotation.z=Math.PI/2+(x>0?-.05:.05)}}
 ball(head,animal?eyeMat:skin,0,-4,20.5,animal?3:2.6,2.2,2.2);
 const mouth=curve(head,[[-3.5,-10,18.7],[0,-11.7,20],[3.5,-10,18.7]],eyeMat,.65);
 const hair=group(head),bangs=group(head);
 if(!animal){
  const cap=new T.Mesh(new T.SphereGeometry(25,24,16,0,Math.PI*2,0,Math.PI*.55),hairMat);cap.position.y=2;cap.scale.z=.87;hair.add(cap);cap.castShadow=true;
  for(const [x,y,z,sx,sy,sz,angle] of [[-15,12,13,9,12,7,-.35],[-4,17,17,10,9,6,.45],[9,18,15,11,8,7,.3],[20,8,4,5,13,8,-.1],[-21,6,1,5,12,8,.1]]){const lock=ball(bangs,hairMat,x,y,z,sx,sy,sz);lock.rotation.z=angle}
  for(let i=0;i<5;i++){const lock=ball(hair,hairMat,-14+i*7,25+Math.sin(i)*3,-4,9,7,10);lock.rotation.z=(i-2)*.16}
 }
 const hatSocket=group(head,0,24),garment=group(torso),limbs=[];
 const newHair=group(head),accHead=group(head),accTorso=group(torso),accPelvis=group(pelvis);
 let fashionHair=null,fashionAccessory=null,hairRig=null;
 function syncHairHatFit(){
  const fit=resolveHairHatFit(equipped.hat,CATALOG_BY_ID[fashionHair]?.shape);
  newHair.visible=!!hairRig;
  if(hairRig){hairRig.crown.visible=fit.crownVisible;hairRig.loose.visible=fit.looseVisible;}
 }
 for(const side of [-1,1]){
  const arm=group(torso,side*17,24),elbow=group(arm,0,-15),armCloth=group(arm),foreCloth=group(elbow);
  tube(arm,skin,4.3,17,0,-7,0);tube(elbow,skin,3.7,15,0,-6,0);ball(elbow,skin,0,-14,0,4.5,5,4.5);
  arm.rotation.z=side*.11;
  const hip=group(pelvis,side*7.5,-1),knee=group(hip,0,-15),ankle=group(knee,0,-13);
  const upperPant=tube(hip,pants,6,20,0,-7,0),lowerPant=tube(knee,pants,5.1,16,0,-6,0);
  disc(knee,white,0,-11,0,5.3,3);
  ball(ankle,shoeMat,0,-1,3.5,7,5.3,10);ball(ankle,soleMat,0,-4.2,3.8,7.3,1.8,10.2);
  curve(ankle,[[-3,2,8],[0,2.8,9],[3,2,8]],white,.65);
  limbs.push({side,arm,elbow,hip,knee,ankle,armCloth,foreCloth,upperPant,lowerPant});
 }
 if(animal==='fox'||animal==='cat'){const tail=ball(pelvis,face.material,0,7,-16,7,15,8);tail.rotation.x=-.6}
 const equipped={coat:null,hat:null};
 let swayingHem=null;
 function equip(nextCoat,nextHat){
  if(equipped.coat!==nextCoat){
   equipped.coat=nextCoat;clear(garment);swayingHem=null;const cloth=outfits[nextCoat]||outfits.mint;
   const item=CATALOG_BY_ID[nextCoat]?.type==='outfit'?CATALOG_BY_ID[nextCoat]:null;
    const dress=['lavender','pink'].includes(nextCoat)||['dress','robe','royal'].includes(item?.shape);
   // One shell replaces the visible torso; sleeves share the exact shoulder/elbow hierarchy.
   body.visible=false;
   // Tailored one-piece torso mesh: soft continuous shoulders, waist and hem instead of a pasted-on sphere.
   const torsoProfile=[new T.Vector2(0,-6),new T.Vector2(11.8,-6),new T.Vector2(14.6,-2),new T.Vector2(16,5),new T.Vector2(16.8,14),new T.Vector2(16.2,21),new T.Vector2(12.2,29),new T.Vector2(6,32),new T.Vector2(0,32)];
   const shell=new T.Mesh(new T.LatheGeometry(torsoProfile,32),cloth.main);shell.name='coat-shell';shell.castShadow=true;shell.receiveShadow=true;garment.add(shell);
   if(dress){const skirtProfile=[new T.Vector2(13,4),new T.Vector2(15,0),new T.Vector2(17,-5),new T.Vector2(20,-12),new T.Vector2(22,-16.5),new T.Vector2(22.1,-18)];
    const skirtRig=group(garment);skirtRig.name='skirt-rig';
    const skirt=new T.Mesh(new T.LatheGeometry(skirtProfile.slice().reverse(),32),cloth.main);skirt.castShadow=true;skirt.receiveShadow=true;skirtRig.add(skirt);swayingHem=skirtRig;
    const hem=new T.Mesh(new T.TorusGeometry(22.1,.95,7,40),cloth.light);hem.rotation.x=Math.PI/2;hem.position.y=-18;skirtRig.add(hem);
   }else {disc(garment,cloth.dark,0,-5.5,0,12.8,1.5);for(const x of [-8,8]){const pocket=ball(garment,cloth.light,x,5,13.1,3.4,3.7,.9);pocket.name='pocket'}}
   for(const side of [-1,1]){const collar=tube(garment,white,2.5,12,side*4.7,25,10);collar.rotation.z=side*.44}
   for(const y of [18,11,4])ball(garment,gold,0,y,15.5,1.35,1.35,.9);
   // Garment details are rig-local: no separate paper-doll planes or misaligned image cutouts.
   const details=group(garment);details.name='outfit-details';
    if(item)decorateOutfit(details,item);
   const belt=(color,r=15.4,y=2)=>{const ring=new T.Mesh(new T.TorusGeometry(r,.95,6,36),color);ring.rotation.x=Math.PI/2;ring.position.y=y;details.add(ring);return ring};
   if(nextCoat==='navy'){
    belt(gold,15.2,1);
    for(const side of [-1,1]){const lapel=ball(details,white,side*8,22,11.7,5,9,2.7);lapel.rotation.z=side*.35}
    ball(details,gold,0,7,16,2.4,2.4,1.6);
   }else if(nextCoat==='blue'){
    for(const side of [-1,1]){const flap=ball(details,white,side*7.7,27,10,6.4,4.4,2);flap.rotation.z=side*.28}
    const bow=ball(details,ribbonMat,0,21,16.8,5,3.6,2);bow.name='marine-bow';
    for(const side of [-1,1]){const stripe=ball(details,white,side*6,4,15.4,2.2,7,.9);stripe.rotation.z=side*.18}
   }else if(nextCoat==='cream'||nextCoat==='linen'){
    const accent=nextCoat==='linen'?outfits.linen.dark:outfits.cream.light;
    for(const xx of [-9,-4,1,6,11]){const knit=ball(details,accent,xx,13,15.7,.55,13,.7);knit.name='woven-seam'}
    for(const side of [-1,1])ball(details,white,side*7,27,11,4.5,5,1.4);
   }else if(nextCoat==='forest'){
    belt(cloth.dark);
    const bag=ball(details,cloth.light,17,2,8,8,10,4);bag.name='forest-satchel';
    const strap=tube(details,cloth.dark,1.9,41,6.4,16,12);strap.rotation.z=-.58;
   }else if(nextCoat==='lavender'||nextCoat==='pink'){
    belt(cloth.light,15,1);
    ball(details,white,0,21,16,4.5,4,2);
    for(const side of [-1,1]){const ribbon=ball(details,cloth.light,side*6,3,16,7,4.3,2);ribbon.rotation.z=side*.55}
   }else if(nextCoat==='coral'){
    belt(white,15.2,1);
    for(const side of [-1,1])ball(details,cloth.light,side*8,21,14.1,3.4,5,1.7);
   }else if(nextCoat==='amber'){
    belt(cloth.dark,15.4,-1);
    for(const side of [-1,1])ball(details,cloth.light,side*8,15,14.5,4,3.2,1.4);
   }else if(nextCoat==='rose'){
    for(const side of [-1,1]){const cuff=ball(details,white,side*8,29,7.2,6.4,2.5,2);cuff.rotation.z=side*.2}
    ball(details,ribbonMat,0,10,16,4.4,5,1.4);
   }else if(nextCoat==='mint'){
    for(const side of [-1,1])ball(details,cloth.light,side*7,24,14.2,4.5,5,2);
   }
   const legMaterial=item?outfits[nextCoat].dark:dress?outfits.cream.light:nextCoat==='navy'?outfits.navy.dark:nextCoat==='blue'?outfits.blue.dark:nextCoat==='forest'?outfits.forest.dark:pants;
   for(const limb of limbs){limb.upperPant.material=legMaterial;limb.lowerPant.material=legMaterial;clear(limb.armCloth);clear(limb.foreCloth);
    ball(limb.armCloth,cloth.main,0,-2.5,0,7.2,7.2,7.2); // joined shoulder cap
    tube(limb.armCloth,cloth.main,5.9,19,0,-7.5,0);
    ball(limb.armCloth,cloth.main,0,-14,0,5.6,5.6,5.6);
    tube(limb.foreCloth,cloth.main,5,14,0,-5,0);
    ball(limb.foreCloth,cloth.main,0,-1,0,5.2,5,5.2);
    disc(limb.foreCloth,cloth.light,0,-10,0,5,2.2);
    if(nextCoat==='linen'){const rolled=disc(limb.foreCloth,white,0,-8,0,5.1,2.5);rolled.name='linen-rolled-sleeve'}
    if(nextCoat==='navy'){ball(limb.armCloth,gold,0,-3,5.5,2,1,.7)}
    if(dress){const cuff=disc(limb.foreCloth,cloth.light,0,-9,0,5.7,2);cuff.name='dress-cuff'}
   }
  }
  if(equipped.hat!==nextHat){
   equipped.hat=nextHat;clear(hatSocket);hair.visible=nextHat==='none'||['crown','cat','ribbon'].includes(nextHat);
   if(nextHat==='none'){syncHairHatFit();return;}
   if(nextHat==='straw'||nextHat==='flower'){disc(hatSocket,strawMat,0,-1,0,30,2.8);disc(hatSocket,strawMat,0,6,0,20,13);disc(hatSocket,ribbonMat,0,1,0,20.2,3);if(nextHat==='flower'){for(let i=0;i<5;i++)ball(hatSocket,white,16+Math.cos(i*6.28/5)*4,4+Math.sin(i*6.28/5)*4,17,3,3,1.8);ball(hatSocket,gold,16,4,19,2.2)}}
   else if(nextHat==='crown'){disc(hatSocket,gold,0,0,0,19,7);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const point=new T.Mesh(new T.ConeGeometry(5,12,4),gold);point.position.set(Math.sin(a)*17,7,Math.cos(a)*17);hatSocket.add(point);ball(hatSocket,ribbonMat,Math.sin(a)*19,1,Math.cos(a)*19,2)}}
   else if(nextHat==='cat'){for(const x of [-18,18]){const ear=new T.Mesh(new T.ConeGeometry(8,17,3),shoeMat);ear.position.set(x,2,0);hatSocket.add(ear)}}
   else if(nextHat==='ribbon'){disc(hatSocket,ribbonMat,0,-7,0,24,2);for(const x of [-10,10]){const bow=ball(hatSocket,ribbonMat,x,0,18,12,7,3);bow.rotation.z=x>0?.4:-.4}ball(hatSocket,gold,0,0,20,3)}
   else{const m=nextHat==='beret'?ribbonMat:nextHat==='beanie'?outfits.amber.main:nextHat==='navycap'?outfits.navy.main:white;
    ball(hatSocket,m,nextHat==='beret'?-3:0,0,0,25,10,23);disc(hatSocket,nextHat==='captain'?outfits.navy.main:m,0,-5,0,23,3);
    if(nextHat==='beanie')ball(hatSocket,white,0,10,0,5);if(nextHat==='captain'||nextHat==='navycap'){ball(hatSocket,m,0,-5,18,21,2,12);ball(hatSocket,gold,0,1,23,3,3,1)}}
   syncHairHatFit();
  }
 }
 function setFashion({hair:hairId=null,accessory:accId=null}={}){
  const h=CATALOG_BY_ID[hairId]?.type==='hair'?hairId:null;
  const a=CATALOG_BY_ID[accId]?.type==='accessory'?accId:null;
  if(fashionHair!==h){fashionHair=h;clear(newHair);hairRig=h?renderHair(newHair,CATALOG_BY_ID[h]):null}
  if(fashionAccessory!==a){
   fashionAccessory=a;clear(accHead);clear(accTorso);clear(accPelvis);
   if(a)renderAccessory({head:accHead,torso:accTorso,pelvis:accPelvis},CATALOG_BY_ID[a]);
  }
  const showOriginal=!fashionHair;
  hair.visible=showOriginal&&(equipped.hat==='none'||['crown','cat','ribbon'].includes(equipped.hat));
  bangs.visible=showOriginal;
  syncHairHatFit();
 }
 let angle=0,blend=0,turnYaw=0,shoulderYaw=0;root.userData.rig={pelvis,torso,head,hatSocket,garment,limbs};
 function animate({x,y,vx=0,vy=0,dir=0,stride=0},dt,time){
  root.position.set(x,0,y);
  const moving=Math.hypot(vx,vy)>1;
  const frameDt=Math.max(0,Math.min(Number(dt)||0,.05));
  const desired=moving?Math.atan2(vx,vy):[0,Math.PI/2,Math.PI,-Math.PI/2][dir];
  const delta=T.MathUtils.euclideanModulo(desired-angle+Math.PI,Math.PI*2)-Math.PI;
  angle+=delta*Math.min(1,frameDt*17);
  root.rotation.y=angle;
  blend=T.MathUtils.damp(blend,moving?1:0,12,frameDt);
  // Let the eyes and shoulders lead a quick tap-to-move turn, then settle naturally.
  const anticipation=sampleTurnAnticipation(delta,blend);
  turnYaw=T.MathUtils.damp(turnYaw,anticipation.headYaw,18,frameDt);
  shoulderYaw=T.MathUtils.damp(shoulderYaw,anticipation.shoulderYaw,11,frameDt);
  // Keep the planted shoe low while the opposite ankle lifts; fade to idle on stop.
  const body=sampleBodyGait(stride,blend,time);
  pelvis.position.set(body.pelvisX,body.pelvisY,0);
  pelvis.rotation.z=body.pelvisRoll;
  torso.rotation.z=body.torsoRoll;torso.rotation.y=body.torsoTurn+shoulderYaw;
  head.rotation.z=body.headRoll;head.rotation.x=body.headPitch;head.rotation.y=turnYaw;
  // Hats are mounted to the head; a tiny counter-lean gives the brim weight.
  const hatMotion=sampleHeadwearMotion(stride,blend,turnYaw,equipped.hat);
  hatSocket.position.y=24+hatMotion.bob;
  hatSocket.rotation.z=hatMotion.roll;
  hatSocket.rotation.x=hatMotion.pitch;
  if(hairRig){const hairMotion=sampleLooseHairMotion(stride,blend,turnYaw,CATALOG_BY_ID[fashionHair]?.shape);
   hairRig.loose.rotation.z=hairMotion.roll;
   hairRig.loose.position.y=hairMotion.bob;
  }
  if(swayingHem){const cloth=sampleSkirtClearance(stride,blend,Math.hypot(vx,vy));swayingHem.rotation.z=cloth.roll;swayingHem.rotation.x=cloth.pitch;swayingHem.position.y=cloth.hemLift;swayingHem.scale.set(cloth.spread,1,cloth.spread);}
  for(const l of limbs){
   const pose=sampleFootGait(stride,blend,l.side);
   l.hip.rotation.x=pose.hip;
   l.knee.rotation.x=pose.knee;
   l.ankle.rotation.x=pose.ankle;
   l.ankle.position.y=-13+pose.ankleLift;
   const contact=sampleContactShadow(pose.ankleLift);
   const shoeShadow=footShadows.get(l.side);
   shoeShadow.material.opacity=contact.opacity;
   shoeShadow.scale.set(8*contact.scale,5*contact.scale,1);
   shoeShadow.position.z=3.8-5*Math.sin(pose.hip)-3*Math.sin(pose.knee);
   l.arm.rotation.x=pose.arm;
   l.elbow.rotation.x=pose.elbow;
  }
  // Smooth facial pose: eye glints close with lids; smile responds gently to walking.
  const expression=sampleFaceExpression(time,blend);
  for(const eyeRig of eyes)eyeRig.scale.y=expression.eyeOpen;
  mouth.scale.x=expression.mouthWidth;
  mouth.scale.y=expression.mouthHeight;
  mouth.position.y=10*(expression.mouthHeight-1)+expression.mouthLift;
 }
 function dispose(){
  root.traverse(o=>{if(o.geometry&&!Object.values(sharedGeometries).includes(o.geometry)&&!capsuleCacheHas(o.geometry))o.geometry.dispose()});
  for(const material of shadowMaterials)material.dispose();
 }
 equip(coat,hat);return {root,equip,setFashion,animate,dispose,equipped,rig:root.userData.rig};
}
