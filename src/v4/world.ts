import Phaser from 'phaser';
import { V4NavigationController } from './navigation';

export type V4WorldHooks = {
  onPosition?: (x:number,y:number) => void;
  onTarget?: (label:string) => void;
};

const W = 2200;
const H = 1500;
const INPUT_TOP = 135;
const INPUT_BOTTOM = 165;
const DRAG_DEADZONE = 12;

export class V4WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private dragging = false;
  private activePointerId: number | null = null;
  private dragOrigin = new Phaser.Math.Vector2();
  private moveVector = new Phaser.Math.Vector2();
  private hooks: V4WorldHooks;
  private questMarker!: Phaser.GameObjects.Container;
  private navigator?: V4NavigationController;

  constructor(hooks: V4WorldHooks = {}) { super('v4-world'); this.hooks = hooks; }

  create() {
    this.cameras.main.setBackgroundColor('#13261e');
    this.cameras.main.setBounds(0,0,W,H);
    this.drawWorld();
    this.player = this.makePlayer(1040,790);
    this.navigator = new V4NavigationController(this,this.player);
    this.questMarker = this.makeQuestMarker(1480,530);
    this.cameras.main.startFollow(this.player,true,.09,.09);
    this.applyCameraZoom();
    this.installInput();
    this.scale.on('resize',this.applyCameraZoom,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.scale.off('resize',this.applyCameraZoom,this);
      this.stopManualMove();
      this.navigator?.cancel();
    });
  }

  update(_time:number,delta:number) {
    if (!this.player) return;
    const speed = 250;
    if (this.dragging && this.moveVector.lengthSq() > DRAG_DEADZONE * DRAG_DEADZONE) {
      const dir = this.moveVector.clone().normalize();
      this.player.x = Phaser.Math.Clamp(this.player.x + dir.x * speed * delta / 1000,40,W-40);
      this.player.y = Phaser.Math.Clamp(this.player.y + dir.y * speed * delta / 1000,60,H-40);
      this.player.setDepth(this.player.y+30);
      this.hooks.onPosition?.(Math.round(this.player.x),Math.round(this.player.y));
    }
  }

  goToQuest() {
    if (!this.player || !this.questMarker || !this.navigator) return;
    this.stopManualMove();
    this.navigator.moveTo({x:this.questMarker.x-90,y:this.questMarker.y+40},{
      onStep:(x,y)=>this.hooks.onPosition?.(x,y),
      onArrive:()=>this.hooks.onTarget?.('경비 무진')
    });
  }

  private applyCameraZoom() { this.cameras.main.setZoom(this.scale.width < 600 ? 1.06 : 1.18); }

  private installInput() {
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      if (this.dragging) return;
      if (p.y < INPUT_TOP || p.y > this.scale.height - INPUT_BOTTOM) return;
      this.navigator?.cancel();
      this.dragging = true;
      this.activePointerId = p.id;
      this.dragOrigin.set(p.x,p.y);
      this.moveVector.set(0,0);
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      if (!this.dragging || !p.isDown || p.id !== this.activePointerId) return;
      this.moveVector.set(p.x-this.dragOrigin.x,p.y-this.dragOrigin.y);
    });
    const stop=(p:Phaser.Input.Pointer)=>{
      if (this.activePointerId !== null && p.id !== this.activePointerId) return;
      this.stopManualMove();
    };
    this.input.on('pointerup',stop);
    this.input.on('pointerupoutside',stop);
    this.input.on('gameout',()=>this.stopManualMove());
  }

  private stopManualMove() {
    this.dragging=false;
    this.activePointerId=null;
    this.moveVector.set(0,0);
  }

  private drawWorld() {
    const g = this.add.graphics();
    g.fillStyle(0x183628,1).fillRect(0,0,W,H); g.fillStyle(0x244b33,1).fillRect(0,0,W,260); g.fillStyle(0x11261e,1).fillRect(0,1260,W,240);
    g.fillStyle(0x745d3a,1).fillRoundedRect(0,650,W,220,28); g.fillStyle(0x8c7448,1).fillRoundedRect(835,0,300,H,26); g.fillStyle(0xb5a16d,.32).fillRect(0,748,W,18); g.fillStyle(0xe2c483,.22).fillRect(975,0,20,H);
    for (let x=80;x<W;x+=170) for (let y=90;y<H;y+=160) { if (y>600&&y<930) continue; if (x>760&&x<1190) continue; this.makeTree(x + ((y/160)%2)*35,y); }
    this.makeBuilding(690,410,'백운 객잔'); this.makeBuilding(1180,350,'대장간'); this.makeBuilding(1540,760,'약방'); this.makeGate(940,210); this.makeNpc(1480,530,'경비 무진'); this.makeNpc(1235,910,'장인 소월');
    this.add.text(92,706,'백 운 성 · 중앙대로',{fontFamily:'sans-serif',fontSize:'30px',fontStyle:'bold',color:'#f3deb0'}).setAlpha(.5);
  }

  private makeTree(x:number,y:number) { const shadow=this.add.ellipse(x+3,y+21,52,20,0x06130e,.35); const trunk=this.add.rectangle(x,y+8,12,28,0x5e4129); const crown=this.add.circle(x,y-6,30,0x2d6643); const crown2=this.add.circle(x-20,y,18,0x3b7750); const crown3=this.add.circle(x+19,y-1,17,0x234f36); shadow.setDepth(y-15);trunk.setDepth(y-10);crown.setDepth(y);crown2.setDepth(y);crown3.setDepth(y); }
  private makeBuilding(x:number,y:number,label:string) { const d=y; this.add.ellipse(x+100,y+120,250,60,0x07130f,.32).setDepth(d-5); this.add.rectangle(x+100,y+58,220,120,0xd3b982).setStrokeStyle(5,0x5f432b).setDepth(d); this.add.polygon(x+100,y-24,[-135,15,0,-72,135,15],0x4b2828).setStrokeStyle(6,0x241818).setDepth(d+1); this.add.rectangle(x+100,y+75,50,85,0x38251d).setDepth(d+2); this.add.text(x+100,y+8,label,{fontFamily:'sans-serif',fontSize:'19px',fontStyle:'bold',color:'#2b2118'}).setOrigin(.5).setDepth(d+3); }
  private makeGate(x:number,y:number) { const d=y+100; this.add.rectangle(x-95,y+80,34,190,0x4b2d25).setDepth(d); this.add.rectangle(x+95,y+80,34,190,0x4b2d25).setDepth(d); this.add.rectangle(x,y,235,42,0x60342c).setStrokeStyle(5,0x2b1c19).setDepth(d+1); this.add.polygon(x,y-38,[-150,10,0,-35,150,10],0x352522).setDepth(d+2); this.add.text(x,y-1,'白雲城',{fontFamily:'serif',fontSize:'24px',fontStyle:'bold',color:'#e7c977'}).setOrigin(.5).setDepth(d+3); }
  private makeNpc(x:number,y:number,name:string) { const c=this.add.container(x,y).setDepth(y+20); const shadow=this.add.ellipse(0,20,36,14,0x000000,.28); const body=this.add.rectangle(0,0,30,42,0x39566f).setStrokeStyle(2,0x17232f); const head=this.add.circle(0,-28,14,0xe0b38e).setStrokeStyle(2,0x6b4b39); const hat=this.add.rectangle(0,-42,32,8,0x202a33); const badge=this.add.circle(0,1,4,0xe1bc59); const tag=this.add.text(0,-65,name,{fontFamily:'sans-serif',fontSize:'15px',fontStyle:'bold',color:'#f4e6be',backgroundColor:'#0c1513cc',padding:{x:7,y:4}}).setOrigin(.5); c.add([shadow,body,head,hat,badge,tag]); }
  private makeQuestMarker(x:number,y:number) { const c=this.add.container(x,y-105).setDepth(y+80); const ring=this.add.circle(0,0,18,0xe3b94f,.16).setStrokeStyle(3,0xf4d76e,.95); const mark=this.add.text(0,-1,'!',{fontFamily:'sans-serif',fontSize:'28px',fontStyle:'bold',color:'#ffe39b'}).setOrigin(.5); c.add([ring,mark]); this.tweens.add({targets:c,y:c.y-12,duration:950,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}); return c; }
  private makePlayer(x:number,y:number) { const c=this.add.container(x,y).setDepth(y+30); const shadow=this.add.ellipse(0,26,48,17,0x000000,.35); const cloak=this.add.polygon(0,8,[-20,-4,20,-4,28,34,-28,34],0x203f55).setStrokeStyle(2,0x102530); const tunic=this.add.rectangle(0,3,30,43,0x8b3831).setStrokeStyle(2,0x3a1715); const belt=this.add.rectangle(0,12,34,7,0xd2ae54); const head=this.add.circle(0,-26,16,0xe2b38c).setStrokeStyle(2,0x6f4936); const hair=this.add.arc(0,-31,17,190,350,false,0x201c1a).setStrokeStyle(3,0x201c1a); const sword=this.add.rectangle(25,4,6,52,0xc8d0d5).setRotation(.55).setStrokeStyle(2,0x4d575f); const hilt=this.add.rectangle(11,-7,24,5,0xd3b155).setRotation(.55); const name=this.add.text(0,-63,'준자',{fontFamily:'sans-serif',fontSize:'16px',fontStyle:'bold',color:'#fff0c4',backgroundColor:'#0a1210cc',padding:{x:8,y:4}}).setOrigin(.5); c.add([shadow,sword,hilt,cloak,tunic,belt,head,hair,name]); return c; }
}
