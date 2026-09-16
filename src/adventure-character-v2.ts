import Phaser from 'phaser';
import './adventure-character-v2.css';

type Hero='warrior'|'mage'|'ranger';
type CharacterState={
  aura:any;
  lastStep:number;
  lastX:number;
  lastY:number;
  attackPatched:boolean;
  postUpdate?:()=>void;
};

const states=new WeakMap<any,CharacterState>();
const tuned=new WeakSet<any>();

function activeScene():any|null{
  const games=((((Phaser as any).GAMES||[]) as any[]));
  for(const game of games){
    const direct=game?.scene?.keys?.world;
    if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}

function hero(scene:any):Hero{
  const h=String(scene?.save?.heroClass||'warrior');
  return h==='mage'||h==='ranger'?h:'warrior';
}

function classColor(h:Hero){
  return h==='warrior'?0xffc36f:h==='mage'?0xc691ff:0x9fd67d;
}

function classHex(h:Hero){
  return h==='warrior'?'#ffc36f':h==='mage'?'#c691ff':'#9fd67d';
}

function addDust(scene:any,state:CharacterState,h:Hero){
  const now=performance.now();
  if(now-state.lastStep<155)return;
  state.lastStep=now;
  const color=h==='warrior'?0xd7b67a:h==='mage'?0xc3a6dc:0xa9c985;
  for(let i=0;i<2;i++){
    const p=scene.add.circle(
      scene.player.x+Phaser.Math.Between(-11,11),
      scene.player.y+25+Phaser.Math.Between(-2,4),
      Phaser.Math.Between(2,4),color,.42
    ).setDepth(scene.player.y-4);
    scene.tweens.add({targets:p,x:p.x+Phaser.Math.Between(-16,16),y:p.y+Phaser.Math.Between(6,15),alpha:0,scale:.35,duration:320,onComplete:()=>p.destroy()});
  }
}

function attackFx(scene:any,h:Hero){
  const p=scene.player;if(!p)return;
  const color=classColor(h);
  const f=scene.facing||{x:0,y:1};
  const len=h==='ranger'?105:70;
  const nx=Math.abs(Number(f.x||0))+Math.abs(Number(f.y||0))<.1?0:Number(f.x||0);
  const ny=Math.abs(Number(f.x||0))+Math.abs(Number(f.y||0))<.1?1:Number(f.y||0);

  if(h==='warrior'){
    const a=Math.atan2(ny,nx)*180/Math.PI;
    const arc=scene.add.arc(p.x+nx*22,p.y+ny*16,42,a-52,a+52,false,color,.08)
      .setStrokeStyle(7,color,.82).setDepth(p.y+150);
    scene.tweens.add({targets:arc,scale:1.35,alpha:0,duration:210,ease:'Quad.out',onComplete:()=>arc.destroy()});
  }else if(h==='mage'){
    const ring=scene.add.circle(p.x,p.y+5,22,color,.05).setStrokeStyle(4,color,.72).setDepth(p.y+145);
    scene.tweens.add({targets:ring,scale:2.15,alpha:0,duration:300,ease:'Cubic.out',onComplete:()=>ring.destroy()});
    for(let i=0;i<5;i++){
      const dot=scene.add.circle(p.x,p.y,3,color,.82).setDepth(p.y+147);
      const ang=Math.PI*2*i/5;
      scene.tweens.add({targets:dot,x:p.x+Math.cos(ang)*46,y:p.y+Math.sin(ang)*34-4,alpha:0,duration:330,onComplete:()=>dot.destroy()});
    }
  }else{
    const line=scene.add.line(0,0,p.x,p.y-2,p.x+nx*len,p.y+ny*len*.72, color,.78)
      .setOrigin(0).setLineWidth(4).setDepth(p.y+145);
    scene.tweens.add({targets:line,alpha:0,duration:190,onComplete:()=>line.destroy()});
    const tip=scene.add.circle(p.x+nx*len,p.y+ny*len*.72,4,color,.9).setDepth(p.y+146);
    scene.tweens.add({targets:tip,scale:2.1,alpha:0,duration:220,onComplete:()=>tip.destroy()});
  }
}

function patchAttack(scene:any,state:CharacterState){
  if(state.attackPatched||typeof scene.attack!=='function')return;
  const original=scene.attack.bind(scene);
  scene.attack=function(...args:any[]){
    const result=original(...args);
    try{attackFx(scene,hero(scene));}catch{}
    return result;
  };
  state.attackPatched=true;
}

function tuneCharacter(scene:any,state:CharacterState){
  if(!scene?.player)return;
  const h=hero(scene),p=scene.player;
  if(!tuned.has(scene)){
    tuned.add(scene);
    try{
      p.setScale(h==='warrior'?.268:.262);
      p.setAlpha(1);
      scene.shadow?.setDisplaySize?.(48,14)?.setAlpha?.(.28);
      scene.nameText?.setFontSize?.(11)?.setColor?.('#fff8df')?.setStroke?.('#173532',4);
    }catch{}
  }

  const vx=Number(p.body?.velocity?.x||0),vy=Number(p.body?.velocity?.y||0);
  const moving=Math.hypot(vx,vy)>18;
  if(moving)addDust(scene,state,h);

  const bob=moving?Math.sin(performance.now()*.018)*1.2:Math.sin(performance.now()*.004)*.45;
  const f=scene.facing||{x:0,y:1};
  const side=Number(f.x||0)<-.2?-1:1;
  const facingUp=Math.abs(Number(f.y||0))>Math.abs(Number(f.x||0))&&Number(f.y||0)<0;

  state.aura.setPosition(p.x,p.y+21).setDepth(p.y-10).setAlpha(.22+Math.sin(performance.now()*.004)*.035);
  scene.shadow?.setPosition?.(p.x,p.y+24+bob*.15)?.setDepth?.(p.y-12);
  scene.nameText?.setPosition?.(p.x,p.y-50+bob*.2)?.setDepth?.(3200);

  const armor=scene.gearArmor,weapon=scene.gearWeapon;
  try{
    if(armor){
      armor.setAlpha(.97).setPosition(p.x-side*1,p.y+2+bob).setDepth(facingUp?p.y-3:p.y+18);
      const base=h==='mage'?.79:h==='ranger'?.765:.78;
      armor.setScale(base+Math.min(8,Number(scene.save?.armorLevel||0))*.012);
    }
    if(weapon){
      const dx=h==='ranger'?30:h==='mage'?25:27;
      const rot=h==='ranger'?.045:h==='mage'?.105:.16;
      const base=h==='ranger'?.70:h==='mage'?.72:.735;
      weapon.setAlpha(.99).setPosition(p.x+side*dx,p.y+(facingUp?-5:2)+bob).setFlipX(side<0).setRotation(side*rot).setDepth(facingUp?p.y-12:p.y+29);
      weapon.setScale(base+Math.min(8,Number(scene.save?.weaponLevel||0))*.013);
    }
  }catch{}

  state.lastX=p.x;state.lastY=p.y;
}

function createState(scene:any):CharacterState{
  const h=hero(scene),color=classColor(h);
  const aura=scene.add.ellipse(scene.player.x,scene.player.y+21,78,29,color,.05)
    .setStrokeStyle(2,color,.22).setDepth(scene.player.y-10);
  const state:CharacterState={aura,lastStep:0,lastX:scene.player.x,lastY:scene.player.y,attackPatched:false};
  states.set(scene,state);
  return state;
}

function syncDom(scene:any){
  const h=hero(scene);
  document.body.dataset.jaHero=h;
  document.documentElement.style.setProperty('--ja-class-color',classHex(h));
  const panel=document.querySelector<HTMLElement>('.status-panel');
  if(panel)panel.dataset.hero=h;
}

function tick(){
  const scene=activeScene();
  if(!scene?.player)return;
  const state=states.get(scene)||createState(scene);
  patchAttack(scene,state);
  tuneCharacter(scene,state);
  syncDom(scene);
}

function boot(){
  tick();
  window.setInterval(tick,50);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
