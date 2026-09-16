import Phaser from 'phaser';
import './adventure-world-v2.css';

type Zone='village'|'field'|'mine'|'forest';
type AmbientState={zone:string;objects:any[]};
const states=new WeakMap<any,AmbientState>();

function scene():any|null{
  const games=((((Phaser as any).GAMES||[]) as any[]));
  for(const game of games){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}

function make(s:any,key:string,w:number,h:number,draw:(g:any)=>void){
  if(s.textures?.exists?.(key))return;
  const g=s.add.graphics();draw(g);g.generateTexture(key,w,h);g.destroy();
}

function textures(s:any){
  make(s,'ja2-butterfly',26,22,g=>{
    g.fillStyle(0x855991,.8).fillEllipse(8,10,11,14).fillEllipse(18,10,11,14);
    g.fillStyle(0xe8b1d9,.82).fillEllipse(7,7,7,8).fillEllipse(19,7,7,8);
    g.fillStyle(0x533d43).fillRoundedRect(12,5,3,13,2);
  });
  make(s,'ja2-seed',18,26,g=>{
    g.fillStyle(0xf4ead4,.82).fillCircle(9,7,4);
    g.lineStyle(1,0xcfd9c0,.7).lineBetween(9,9,8,24);
    for(let i=0;i<5;i++){const a=Math.PI*2*i/5;g.lineStyle(1,0xf7f0df,.65).lineBetween(9,7,9+Math.cos(a)*7,7+Math.sin(a)*7);}
  });
  make(s,'ja2-spark',14,24,g=>{
    g.fillStyle(0xffbd58,.24).fillCircle(7,11,7);
    g.fillStyle(0xffe58b,.92).fillTriangle(7,1,11,11,7,22).fillTriangle(7,3,3,12,7,20);
  });
  make(s,'ja2-firefly',18,18,g=>{
    g.fillStyle(0xd8ff8d,.16).fillCircle(9,9,9);
    g.fillStyle(0xeaffab,.88).fillCircle(9,9,3);
    g.fillStyle(0xffffff,.7).fillCircle(8,7,1);
  });
}

function add(s:any,state:AmbientState,key:string,x:number,y:number,scale=1,depth=12){
  const img=s.add.image(x,y,key).setScale(scale).setDepth(depth).setAlpha(.86);
  state.objects.push(img);return img;
}

function buildVillage(s:any,state:AmbientState){
  [[760,780],[850,905],[1320,850],[1430,760],[990,1000],[1220,980]].forEach(([x,y],i)=>{
    const b=add(s,state,'ja2-butterfly',x,y,.72+i%2*.08,y+80);
    s.tweens.add({targets:b,x:x+(i%2?28:-26),y:y-18-(i%3)*8,angle:{from:-8,to:8},duration:1800+i*170,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  });
}

function buildField(s:any,state:AmbientState){
  for(let i=0;i<12;i++){
    const x=330+(i*173)%1750,y=270+(i*211)%850;
    const seed=add(s,state,'ja2-seed',x,y,.65+(i%3)*.08,y+40);
    s.tweens.add({targets:seed,x:x+40+(i%2)*25,y:y-75-(i%4)*18,angle:45+(i%3)*35,alpha:{from:.15,to:.9},duration:2600+i*130,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }
}

function buildMine(s:any,state:AmbientState){
  [[520,430],[720,930],[980,530],[1280,1040],[1560,620],[1850,890],[2110,430],[2250,1040]].forEach(([x,y],i)=>{
    const spark=add(s,state,'ja2-spark',x,y,.7+(i%2)*.12,y+30);
    s.tweens.add({targets:spark,y:y-34-(i%3)*8,alpha:{from:.18,to:.9},scaleY:{from:.65,to:1.05},duration:760+i*70,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  });
}

function buildForest(s:any,state:AmbientState){
  for(let i=0;i<13;i++){
    const x=360+(i*157)%1800,y=250+(i*197)%900;
    const fly=add(s,state,'ja2-firefly',x,y,.75+(i%3)*.1,y+15);
    s.tweens.add({targets:fly,x:x+(i%2?26:-24),y:y-30-(i%4)*11,alpha:{from:.22,to:1},duration:1500+i*120,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }
}

function clear(state?:AmbientState){
  if(!state)return;
  for(const o of state.objects){try{o?.destroy?.();}catch{}}
  state.objects.length=0;
}

function rebuild(s:any){
  textures(s);
  const zone=(['village','field','mine','forest'].includes(String(s.zone))?String(s.zone):'village') as Zone;
  let state=states.get(s);
  if(state?.zone===zone)return;
  if(state)clear(state);
  else{state={zone,objects:[]};states.set(s,state);}
  state.zone=zone;
  if(zone==='village')buildVillage(s,state);
  else if(zone==='field')buildField(s,state);
  else if(zone==='mine')buildMine(s,state);
  else buildForest(s,state);
}

function syncDom(s:any){
  const zone=String(s?.zone||'village');
  document.body.dataset.jaZone=zone;
  document.querySelectorAll<HTMLElement>('.jw23-panel,.jw23-nearby,.jw23-talk-button').forEach(el=>el.classList.add('ja-npc-ui'));
}

function tick(){
  const s=scene();if(!s?.player)return;
  rebuild(s);syncDom(s);
}

function boot(){tick();window.setInterval(tick,260);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
