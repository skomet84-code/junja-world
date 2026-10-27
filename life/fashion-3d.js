import * as T from './vendor/three.module.js';

// Procedural meshes attach to the same animated joints: no detached paper-doll sprites.
const sphere=new T.SphereGeometry(1,16,12),cylinder=new T.CylinderGeometry(1,1,1,20);
const materials=new Map();
const mat=(c,metal=false)=>{const id=c+':'+metal;if(!materials.has(id))materials.set(id,new T.MeshStandardMaterial({color:c,roughness:metal?.37:.79,metalness:metal?.47:0}));return materials.get(id)};
const ball=(parent,c,x,y,z,sx,sy=sx,sz=sx)=>{const m=new T.Mesh(sphere,typeof c==='number'?mat(c):c);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m};
const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g};
const disc=(parent,c,x,y,z,r,h)=>{const m=new T.Mesh(cylinder,typeof c==='number'?mat(c):c);m.position.set(x,y,z);m.scale.set(r,h,r);m.castShadow=true;parent.add(m);return m};
const rod=(parent,c,a,b,r=1.5)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),v=end.clone().sub(start),m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),8),mat(c));m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(m);return m};

export function renderHair(parent,item){
 if(!item)return;
 const color=item.color,shape=item.shape,k=item.index;
 const crown=group(parent),loose=group(parent);crown.name='hair-crown';loose.name='hair-loose';
 // A cohesive scalp and hand-authored silhouette for each cut.
 const scalp=ball(crown,color,0,14,-4,24,16.5,20);scalp.name='hair-scalp';
 if(['bob','long','layer','wolf','wave'].includes(shape)){
  const length=shape==='long'?27:shape==='wolf'?22:shape==='layer'?19:shape==='bob'?15:13;
  for(const side of [-1,1])ball(loose,color,side*19,3,-6,7,length+4,12);
 }
 if(shape==='short'||shape==='side'||shape==='slick'){
  for(let i=0;i<5;i++){const x=(i-2)*9;ball(crown,color,x,25-(i%2)*2,10,8,6,9)}
 }else if(shape==='part'){
  for(let i=0;i<5;i++)ball(crown,color,(i-2)*9,20+i*1.5,13,7,7,8);
 }else if(shape==='bob'){
  for(let i=0;i<6;i++)ball(crown,color,-21+i*8,12+(i%2)*2,16,7,10,7);
 }else if(shape==='slick'){
  for(let i=0;i<4;i++)ball(crown,color,-16+i*11,22,6,10,6,15);
 }else if(shape==='bang'){
  for(let i=0;i<7;i++)ball(crown,color,-20+i*7,17+(i%3),18,5,9,4);
 }else if(shape==='wolf'||shape==='layer'){
  for(let i=0;i<8;i++){const x=-22+i*6.2;const lock=ball(crown,color,x,16+(i%3)*3,16,5,10+(i%2)*5,6);lock.rotation.z=(i-3.5)*.09}
  for(const side of [-1,1]){const spike=ball(loose,color,side*23,1,-8,7,12,9);spike.rotation.z=side*.36}
 }else if(shape==='wave'){
  for(let i=0;i<7;i++){const x=-21+i*7;const l=ball(crown,color,x,22-(i%3)*2,15,7,9,7);l.rotation.z=Math.sin(i*2)*.3}
 }else if(shape==='twin'||shape==='braid'){
  for(const side of [-1,1]){
   ball(loose,color,side*26,6,-6,9,11,10);
   for(let j=0;j<4;j++)ball(loose,color,side*(28+(j%2)*2),-2-j*7,-5,6-j*.5,6,6);
  }
 }
 if(['twin','braid'].includes(shape))ball(crown,0xf4d9a7,0,21,20,5,2,3);
 if(k>=12)for(const side of [-1,1])ball(crown,item.index>=18?0xf0d06e:0xffffff,side*12,28,11,2.7,2.7,2.7);
 return {crown,loose};
}
export function renderAccessory({head,torso,pelvis},item){
 if(!item)return;
 const c=item.color,m=item.shape;
 const metal=mat(c,true);
 if(m==='glasses'||m==='shades'){
  for(const side of [-1,1]){
   const frame=new T.Mesh(new T.TorusGeometry(7.8,1.35,6,20),metal);
   frame.position.set(side*9.7,1,20);head.add(frame);
   if(m==='shades')ball(head,0x2d3440,side*9.7,1,20,6,5,1);
  }
  rod(head,c,[-2,1,21],[2,1,21],1.2);
 }else if(m==='earring'){
  for(const side of [-1,1])ball(head,c,side*25,-8,6,3.8,6,2);
 }else if(m==='pin'||m==='bow'){
  const x=m==='bow'?-17:18;
  for(const j of [-1,1]){const b=ball(head,c,x+j*5,25,16,7,4,3);b.rotation.z=j*.45}
  ball(head,0xf8e6c3,x,25,19,3,3,2);
 }else if(m==='band'){
  const hoop=new T.Mesh(new T.TorusGeometry(23.6,2.6,7,32,Math.PI),metal);
  hoop.rotation.z=Math.PI;hoop.position.set(0,15,-2);head.add(hoop);
 }else if(m==='beret'){
  const beret=ball(head,c,-4,29,0,25,9,21);beret.rotation.z=.13;
 }else if(m==='crown'){
  disc(head,c,0,25,0,19,6);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;
   const spike=new T.Mesh(new T.ConeGeometry(3.6,13,5),metal);spike.position.set(17*Math.sin(a),33,17*Math.cos(a));head.add(spike)}
 }else if(m==='halo'||m==='aura'){
  const ring=new T.Mesh(new T.TorusGeometry(m==='aura'?39:20,2.7,8,36),metal);
  ring.rotation.x=m==='halo'?0:Math.PI/2;ring.position.set(0,m==='halo'?45:8,0);head.add(ring);
  if(m==='aura')for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(head,0xf7edc4,Math.sin(a)*34,8,Math.cos(a)*34,3.8)}
 }else if(m==='wings'){
  for(const side of [-1,1]){
   for(let j=0;j<3;j++){const wing=ball(torso,c,side*(20+j*9),14+j*7,-15,16-j*2,8,4);wing.rotation.z=side*(.32+j*.2)}
  }
 }else if(m==='cape'){
  const cape=new T.Mesh(new T.ConeGeometry(25,62,8,1,true),mat(c));
  cape.rotation.z=Math.PI;cape.scale.z=.35;cape.position.set(0,5,-13);pelvis.add(cape);
  ball(torso,0xdcc389,0,26,-16,14,3,3);
 }else if(m==='watch'){
  for(const side of [-1,1])ball(torso,c,side*18,8,10,3.5,3.5,2);
 }else if(m==='badge'){
  ball(torso,c,9,17,15,5,5,2);
 }else if(m==='necklace'){
  for(let j=0;j<7;j++){const a=Math.PI*(.12+j*.125);ball(torso,c,Math.cos(a)*13,21-Math.sin(a)*10,14,2.2)}
  ball(torso,c,0,10,16.5,4,5,2);
 }
}
export function decorateOutfit(groupNode,item){
 if(!item)return;
 const c=item.accent??0xf0d38f,shape=item.shape,grade=item.grade;
 // Accessories and emblem geometries move with the torso rig.
 if(['jacket','coat','suit','royal','armor'].includes(shape)){
  for(const side of [-1,1]){
   const lapel=ball(groupNode,c,side*8.3,22,13.2,5.3,11,2.2);lapel.rotation.z=side*.24;
  }
 }
 if(shape==='hood'){ball(groupNode,c,0,27,-6,16,7,13);ball(groupNode,0xf0eadf,0,5,16,6,6,1.7)}
 if(shape==='sailor'){
  for(const side of [-1,1])ball(groupNode,c,side*8,25,12.8,7,4,3);
  ball(groupNode,c,0,17,17,5,5,1.6);
 }
 if(shape==='apron'){ball(groupNode,c,0,5,15,12,16,2);rod(groupNode,c,[-10,20,13],[10,-6,15],1.6)}
 if(shape==='knit'){
  for(let i=-3;i<=3;i++)ball(groupNode,c,i*3.5,8,15.2,.75,13,.55);
 }
 if(shape==='robe'||shape==='royal'){
  const cape=new T.Mesh(new T.ConeGeometry(23,52,20,1,true),mat(item.color));
  cape.rotation.z=Math.PI;cape.scale.z=.45;cape.position.set(0,-5,-8);groupNode.add(cape);
  for(const x of [-9,9])ball(groupNode,c,x,27,11,6,5,2.7);
 }
 if(shape==='armor'){
  ball(groupNode,c,0,14,16,12,13,2.7);
  for(const side of [-1,1])ball(groupNode,c,side*19,23,0,8,6,9);
 }
 if(shape==='dress')for(const side of [-1,1])ball(groupNode,c,side*8,22,13.8,5,6,2);
 if(['suit','royal','coat'].includes(shape)){
  for(let j=0;j<3;j++)ball(groupNode,c,0,14-j*7,17,2.1);
 }
 if(['legend','mythic'].includes(grade)){
  const gem=ball(groupNode,c,0,19,18,4,5,2);gem.name='premium-embellishment';
  for(const side of [-1,1])ball(groupNode,c,side*14,6,11,2,2,2);
 }
}
export function createPet(item){
 const root=new T.Group(),model=group(root),type=item.shape,c=item.color;
 const fur=mat(c),light=mat(0xf9eee1),dark=mat(0x3b3837);
 const flying=['bird','ghost','cloud','dragon','swan','phoenix'].includes(type);
 ball(model,fur,0,18,0,15,12,14);
 const head=ball(model,fur,0,35,8,14,13,13);
 for(const side of [-1,1]){
  ball(model,dark,side*5.5,37,20,2.5,3.5,1.3);
  ball(model,0xffffff,side*6,39,21,1.1,1.1,.8);
 }
 ball(model,light,0,30,20,6,4,3);
 if(['dog','cat','fox','tiger','bear','hamster','rabbit','deer','unicorn'].includes(type)){
  for(const side of [-1,1]){
   if(['cat','fox','tiger','unicorn'].includes(type)){const ear=new T.Mesh(new T.ConeGeometry(6,16,4),fur);ear.position.set(side*11,49,6);model.add(ear)}
   else ball(model,fur,side*12,type==='rabbit'?56:44,4,type==='rabbit'?5:8,type==='rabbit'?19:9,6);
  }
  for(const side of [-1,1])ball(model,fur,side*9,7,8,5,6,6);
 }
 if(type==='fox'||type==='dog'||type==='cat'||type==='tiger'){
  const tail=ball(model,fur,0,17,-16,7,12,6);tail.rotation.x=.65;
 }
 if(['bird','swan','dragon','phoenix','penguin'].includes(type)){
  for(const side of [-1,1]){const wing=ball(model,fur,side*15,23,-1,10,6,15);wing.rotation.z=side*.4}
  const beak=new T.Mesh(new T.ConeGeometry(4,9,5),mat(0xe8ba64));beak.rotation.x=Math.PI/2;beak.position.set(0,30,25);model.add(beak);
 }
 if(type==='dragon')for(let i=0;i<4;i++){const spike=new T.Mesh(new T.ConeGeometry(5,11,4),mat(item.grade==='mythic'?0xf1c779:0x7ac3aa));spike.position.set(0,39-i*10,-9);model.add(spike)}
 if(type==='deer'||type==='unicorn'){const horn=new T.Mesh(new T.ConeGeometry(4,19,6),mat(0xe7c886,true));horn.position.set(0,57,7);model.add(horn)}
 if(type==='cloud'||type==='ghost')for(const side of [-1,1])ball(model,fur,side*13,14,0,10,10,9);
 if(type==='tiger')for(let i=-1;i<=1;i++)ball(model,0x645a50,i*5,41,19,2,5,1);
 if(['legend','mythic'].includes(item.grade)){
  const star=ball(model,0xf5d48c,0,55,0,4,4,4);star.name='pet-star';
 }
 let at=null;
 return {root,item,update(x,y,dt,time){
  const target=new T.Vector3(x+46,0,y+32);
  if(!at||root.position.distanceTo(target)>420){root.position.copy(target);at=true}
  else root.position.lerp(target,Math.min(1,dt*4.5));
  model.position.y=(flying?12:0)+Math.sin(time*4)*1.8;
  model.rotation.y=Math.sin(time*1.1)*.1;
 },dispose(){
  root.traverse(o=>{if(o.geometry&&o.geometry!==sphere&&o.geometry!==cylinder)o.geometry.dispose()})
 }};
}
