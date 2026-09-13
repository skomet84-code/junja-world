import Phaser from 'phaser';
import './style.css';
import { GAME_TITLE, GAME_VERSION, HERO_CLASSES, PLAYER_SPEED, WORLD_HEIGHT, WORLD_WIDTH, type HeroClass } from '../shared/constants';

type SaveData = {
  name: string;
  heroClass: HeroClass;
  level: number;
  xp: number;
  hp: number;
  kills: number;
  quest: 0 | 1 | 2 | 3;
};

const SAVE_KEY = 'junja-world-v01';
const ui = {
  auth: document.querySelector<HTMLElement>('#auth-layer')!,
  game: document.querySelector<HTMLElement>('#game-ui')!,
  nameInput: document.querySelector<HTMLInputElement>('#hero-name')!,
  enter: document.querySelector<HTMLButtonElement>('#enter-game')!,
  classCards: [...document.querySelectorAll<HTMLButtonElement>('.class-card')],
  name: document.querySelector<HTMLElement>('#ui-name')!,
  heroClass: document.querySelector<HTMLElement>('#ui-class')!,
  portrait: document.querySelector<HTMLElement>('#portrait')!,
  hpBar: document.querySelector<HTMLElement>('#hp-bar')!,
  hpText: document.querySelector<HTMLElement>('#hp-text')!,
  xpBar: document.querySelector<HTMLElement>('#xp-bar')!,
  xpText: document.querySelector<HTMLElement>('#xp-text')!,
  atk: document.querySelector<HTMLElement>('#atk-text')!,
  kills: document.querySelector<HTMLElement>('#kill-text')!,
  questTitle: document.querySelector<HTMLElement>('#quest-title')!,
  questText: document.querySelector<HTMLElement>('#quest-text')!,
  questBar: document.querySelector<HTMLElement>('#quest-bar')!,
  hint: document.querySelector<HTMLElement>('#interaction-hint')!,
  toast: document.querySelector<HTMLElement>('#toast')!,
  dialogue: document.querySelector<HTMLElement>('#dialogue')!,
  dialogueText: document.querySelector<HTMLElement>('#dialogue-text')!,
  reset: document.querySelector<HTMLButtonElement>('#reset-save')!,
  mobileAttack: document.querySelector<HTMLButtonElement>('#mobile-attack')!,
  mobileTalk: document.querySelector<HTMLButtonElement>('#mobile-talk')!
};

let chosenClass: HeroClass = 'warrior';
let game: Phaser.Game | undefined;
let sceneRef: WorldScene | undefined;
let launchSave: SaveData | undefined;
let toastTimer = 0;

function freshSave(name: string, heroClass: HeroClass): SaveData {
  return { name, heroClass, level: 1, xp: 0, hp: HERO_CLASSES[heroClass].maxHp, kills: 0, quest: 0 };
}

function readSave(): SaveData | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as SaveData | null;
    return parsed?.name && HERO_CLASSES[parsed.heroClass] ? parsed : null;
  } catch { return null; }
}

function persist(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function notify(message: string) {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  toastTimer = window.setTimeout(() => ui.toast.classList.add('hidden'), 2200);
}

function updateHud(save: SaveData) {
  const base = HERO_CLASSES[save.heroClass];
  const maxHp = base.maxHp + (save.level - 1) * 14;
  const requiredXp = save.level * 100;
  const attack = base.attack + (save.level - 1) * 5;
  ui.name.textContent = save.name;
  ui.heroClass.textContent = `Lv.${save.level} ${base.label}`;
  ui.portrait.textContent = save.heroClass === 'warrior' ? '⚔' : save.heroClass === 'mage' ? '✦' : '➳';
  ui.hpBar.style.width = `${Math.max(0, save.hp / maxHp) * 100}%`;
  ui.hpText.textContent = `${Math.ceil(save.hp)} / ${maxHp}`;
  ui.xpBar.style.width = `${Math.min(100, save.xp / requiredXp * 100)}%`;
  ui.xpText.textContent = `${save.xp} / ${requiredXp}`;
  ui.atk.textContent = String(attack);
  ui.kills.textContent = String(save.kills);

  const quests = [
    ['낯선 마을의 부름', '촌장 백운에게 말을 걸어보자.', '10%'],
    ['단풍골의 골칫거리', `마을 밖의 초록 슬라임을 처치하자. (${Math.min(save.kills, 3)}/3)`, `${25 + Math.min(save.kills, 3) * 18}%`],
    ['첫 번째 승리', '촌장 백운에게 돌아가 보고하자.', '88%'],
    ['단풍골의 수호자', '첫 임무 완료! 마을과 주변을 자유롭게 탐험하자.', '100%']
  ];
  const quest = quests[save.quest];
  ui.questTitle.textContent = quest[0];
  ui.questText.textContent = quest[1];
  ui.questBar.style.width = quest[2];
}

function startGame(save: SaveData) {
  ui.auth.classList.add('hidden');
  ui.game.classList.remove('hidden');
  updateHud(save);
  game?.destroy(true);
  launchSave = save;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#6e9a62',
    pixelArt: false,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [WorldScene]
  });
}

ui.classCards.forEach(card => card.addEventListener('click', () => {
  chosenClass = card.dataset.class as HeroClass;
  ui.classCards.forEach(item => item.classList.toggle('selected', item === card));
}));

const existing = readSave();
if (existing) {
  ui.nameInput.value = existing.name;
  chosenClass = existing.heroClass;
  ui.classCards.forEach(card => card.classList.toggle('selected', card.dataset.class === chosenClass));
  ui.enter.textContent = `${existing.name}로 계속하기`;
}

ui.enter.addEventListener('click', () => {
  const name = ui.nameInput.value.trim() || '준자';
  const saved = readSave();
  startGame(saved && saved.name === name && saved.heroClass === chosenClass ? saved : freshSave(name, chosenClass));
});
ui.nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') ui.enter.click(); });
ui.reset.addEventListener('click', () => {
  if (!window.confirm('현재 캐릭터 기록을 지우고 처음부터 시작할까?')) return;
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
});
ui.dialogue.addEventListener('click', () => sceneRef?.talk());
ui.mobileAttack.addEventListener('pointerdown', () => sceneRef?.attack());
ui.mobileTalk.addEventListener('pointerdown', () => sceneRef?.talk());

class WorldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerName!: Phaser.GameObjects.Text;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private elder!: Phaser.Physics.Arcade.Sprite;
  private slimes!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing = new Phaser.Math.Vector2(0, 1);
  private lastAttack = 0;
  private lastHurt = 0;
  private talking = false;
  private mobileDirection = new Phaser.Math.Vector2();

  constructor() { super('world'); }

  init(data: SaveData) {
    this.save = { ...(data?.name ? data : launchSave ?? freshSave('준자', 'warrior')) };
    sceneRef = this;
  }

  create() {
    this.createTextures();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.buildWorld();
    this.createActors();
    this.bindControls();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    this.cameras.main.setZoom(1.08);
    this.cameras.main.fadeIn(700, 8, 18, 28);
    this.time.delayedCall(650, () => notify(`단풍골에 온 것을 환영한다, ${this.save.name}!`));
    persist(this.save);
    updateHud(this.save);
  }

  private createTextures() {
    const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics(); draw(g); g.generateTexture(key, w, h); g.destroy();
    };
    make('grass', 96, 96, g => {
      g.fillStyle(0x6f9d60).fillRect(0, 0, 96, 96);
      g.lineStyle(1, 0x5f8e53, .45);
      for (let i=0;i<18;i++) { const x=(i*37)%94+1,y=(i*53)%90+3; g.lineBetween(x,y,x+2,y-5); }
      g.fillStyle(0x83aa6e,.45); for(let i=0;i<12;i++) g.fillCircle((i*43)%94,(i*29)%94,1.3);
    });
    make('water', 96, 96, g => {
      g.fillStyle(0x3d87a2).fillRect(0,0,96,96); g.lineStyle(2,0x83c5cf,.28);
      for(let y=12;y<96;y+=22) {
        g.beginPath().moveTo(0,y).lineTo(24,y-4).lineTo(50,y+5).lineTo(76,y-2).lineTo(96,y).strokePath();
      }
    });
    make('tree', 84, 112, g => {
      g.fillStyle(0x5b391f).fillRoundedRect(35,65,15,40,4);
      g.fillStyle(0x295d39).fillCircle(25,52,23).fillCircle(58,48,27).fillCircle(42,25,29);
      g.fillStyle(0x3f7d45).fillCircle(28,35,18).fillCircle(56,30,17);
      g.fillStyle(0x8db058,.55).fillCircle(35,19,8);
    });
    make('rock', 62, 48, g => {
      g.fillStyle(0x4d6261,.28).fillEllipse(31,42,52,10); g.fillStyle(0x71827c).fillTriangle(5,39,18,10,45,8).fillTriangle(5,39,45,8,58,39); g.fillStyle(0x98a69c,.6).fillTriangle(18,10,45,8,34,22);
    });
    (Object.keys(HERO_CLASSES) as HeroClass[]).forEach(heroClass => {
      make(`hero-${heroClass}`, 56, 78, g => {
        const c = HERO_CLASSES[heroClass].color;
        g.fillStyle(0x15222b,.25).fillEllipse(28,70,40,10);
        g.fillStyle(0xf1caa5).fillCircle(28,22,14);
        g.fillStyle(0x252b35).fillRoundedRect(14,8,28,12,6);
        g.fillStyle(c).fillRoundedRect(12,34,32,31,8);
        g.fillStyle(0xe8d19b).fillRect(12,46,32,5);
        g.fillStyle(0x1d2630).fillRect(15,62,10,10).fillRect(31,62,10,10);
        g.fillStyle(0xffffff).fillCircle(23,21,2).fillCircle(33,21,2);
        if(heroClass==='warrior') { g.lineStyle(4,0xe0c27d).lineBetween(45,30,53,62); g.lineStyle(2,0xffffff).lineBetween(48,26,54,58); }
        if(heroClass==='mage') { g.lineStyle(4,0x6d482a).lineBetween(47,30,47,68); g.fillStyle(0xd990ff).fillCircle(47,26,6); }
        if(heroClass==='ranger') { g.lineStyle(3,0xd5a65c).strokeEllipse(47,46,14,38); }
      });
    });
    make('elder', 58, 82, g => {
      g.fillStyle(0x18232a,.24).fillEllipse(29,75,42,9); g.fillStyle(0xf0c8a1).fillCircle(29,23,15); g.fillStyle(0xeeeeea).fillTriangle(19,29,39,29,30,54); g.fillStyle(0x445b75).fillRoundedRect(11,39,36,33,7); g.fillStyle(0xc3a768).fillRect(11,51,36,5); g.fillStyle(0xffffff).fillCircle(24,22,2).fillCircle(34,22,2); g.lineStyle(3,0x5c4027).lineBetween(49,38,52,76);
    });
    make('slime', 64, 52, g => {
      g.fillStyle(0x1e2c25,.2).fillEllipse(32,46,50,10); g.fillStyle(0x57bb63).fillRoundedRect(7,16,50,31,16); g.fillStyle(0x85dc78).fillCircle(23,20,15).fillCircle(39,20,16); g.fillStyle(0x173429).fillCircle(23,30,3).fillCircle(42,30,3); g.lineStyle(2,0x255c37).beginPath().moveTo(29,38).lineTo(35,38).strokePath();
    });
  }

  private buildWorld() {
    this.add.tileSprite(WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH, WORLD_HEIGHT, 'grass').setDepth(-20);
    const scenery = this.add.graphics().setDepth(-18);
    scenery.fillStyle(0xc7ad72).fillRoundedRect(0, 730, 1500, 180, 45).fillRoundedRect(430, 0, 175, 1100, 40);
    scenery.fillStyle(0xb89961).fillRoundedRect(0, 792, 1500, 55, 26).fillRoundedRect(490, 0, 55, 1100, 26);
    scenery.fillStyle(0x739f61).fillCircle(500,800,230);
    scenery.lineStyle(3,0xe4cc91,.34).strokeCircle(500,800,224);
    this.add.tileSprite(1690, WORLD_HEIGHT/2, 260, WORLD_HEIGHT, 'water').setDepth(-17);
    scenery.fillStyle(0xd0b776).fillRect(1560,760,260,105);
    scenery.fillStyle(0x766246).fillRect(1560,760,260,15).fillRect(1560,850,260,15);
    scenery.lineStyle(3,0x8b724f,.55); for(let x=1570;x<1820;x+=28) scenery.lineBetween(x,775,x,850);

    this.obstacles = this.physics.add.staticGroup();
    const trees = [[100,120],[220,190],[335,90],[740,130],[870,80],[1040,160],[1200,90],[1390,170],[120,520],[1260,470],[1420,560],[130,1110],[280,1290],[430,1430],[760,1330],[1020,1450],[1280,1280],[1430,1430],[1930,120],[2090,230],[2250,110],[1990,570],[2210,680],[2010,1120],[2210,1340],[1920,1480]];
    trees.forEach(([x,y],i) => {
      const tree=this.add.image(x,y,'tree').setDepth(y); tree.setScale(.92+(i%3)*.08);
      const body=this.obstacles.create(x,y+20,'tree') as Phaser.Physics.Arcade.Image; body.setVisible(false).setSize(38,44).refreshBody();
    });
    [[1120,610],[1200,1080],[2100,920],[1940,910],[300,410],[1320,300]].forEach(([x,y]) => {
      this.add.image(x,y,'rock').setDepth(y); const body=this.obstacles.create(x,y+8,'rock') as Phaser.Physics.Arcade.Image; body.setVisible(false).setSize(52,34).refreshBody();
    });
    this.createHouse(240,610,'여관',0xb54f3f);
    this.createHouse(860,590,'대장간',0x3c6276);
    this.createHouse(900,1030,'잡화점',0x7a5a9a);
    this.createHouse(210,1020,'무예관',0x8e713d);

    const boundary = [[-20,WORLD_HEIGHT/2,40,WORLD_HEIGHT],[WORLD_WIDTH+20,WORLD_HEIGHT/2,40,WORLD_HEIGHT],[WORLD_WIDTH/2,-20,WORLD_WIDTH,40],[WORLD_WIDTH/2,WORLD_HEIGHT+20,WORLD_WIDTH,40],[1690,350,260,700],[1690,1230,260,740]];
    boundary.forEach(([x,y,w,h]) => { const b=this.obstacles.create(x,y,'rock') as Phaser.Physics.Arcade.Image; b.setVisible(false).setDisplaySize(w,h).refreshBody(); });

    this.add.text(500,405,'단풍골', {fontFamily:'serif',fontSize:'30px',fontStyle:'bold',color:'#fff2c1',stroke:'#4b3420',strokeThickness:6}).setOrigin(.5).setDepth(200);
    this.add.text(500,440,'초보자 마을', {fontFamily:'Noto Sans KR',fontSize:'12px',color:'#e4d6aa',stroke:'#3a2a1b',strokeThickness:4}).setOrigin(.5).setDepth(200);
    this.add.text(2060,370,'야생 숲', {fontFamily:'serif',fontSize:'24px',fontStyle:'bold',color:'#e9e1bd',stroke:'#243a2a',strokeThickness:5}).setOrigin(.5).setDepth(200);
  }

  private createHouse(x:number,y:number,label:string,roofColor:number) {
    const g=this.add.graphics().setDepth(y);
    g.fillStyle(0x223039,.24).fillEllipse(x,y+60,210,40);
    g.fillStyle(0xe3d2ac).fillRoundedRect(x-80,y-35,160,95,7);
    g.fillStyle(0x5c3b29).fillRect(x-16,y+8,32,52);
    g.fillStyle(0x91c2c5).fillRect(x-59,y+2,27,27).fillRect(x+32,y+2,27,27);
    g.fillStyle(roofColor).fillTriangle(x-112,y-30,x,y-105,x+112,y-30).fillRoundedRect(x-94,y-44,188,22,8);
    g.lineStyle(5,0x392920,.8).lineBetween(x-112,y-30,x,y-105).lineBetween(x,y-105,x+112,y-30);
    this.add.text(x,y-10,label,{fontFamily:'serif',fontSize:'13px',fontStyle:'bold',color:'#4d321d'}).setOrigin(.5).setDepth(y+1);
    const wall=this.obstacles.create(x,y-16,'rock') as Phaser.Physics.Arcade.Image; wall.setVisible(false).setDisplaySize(190,112).refreshBody();
  }

  private createActors() {
    this.elder = this.physics.add.staticSprite(635,680,'elder').setDepth(681);
    this.add.text(635,620,'!',{fontFamily:'serif',fontSize:'25px',fontStyle:'bold',color:'#ffd65c',stroke:'#4e3308',strokeThickness:5}).setOrigin(.5).setDepth(900).setName('quest-mark');
    this.add.text(635,724,'촌장 백운',{fontFamily:'Noto Sans KR',fontSize:'11px',color:'#fff3c8',stroke:'#13212a',strokeThickness:4}).setOrigin(.5).setDepth(900);

    this.playerShadow=this.add.ellipse(500,850,42,15,0x10251d,.22).setDepth(800);
    this.player=this.physics.add.sprite(500,820,`hero-${this.save.heroClass}`).setDepth(821).setCollideWorldBounds(true);
    this.player.setSize(31,35).setOffset(13,38);
    this.playerName=this.add.text(500,770,this.save.name,{fontFamily:'Noto Sans KR',fontSize:'11px',fontStyle:'bold',color:'#ffffff',stroke:'#14232b',strokeThickness:4}).setOrigin(.5).setDepth(950);
    this.physics.add.collider(this.player,this.obstacles);

    this.slimes=this.physics.add.group();
    [[1940,470],[2130,560],[2010,760],[2210,850],[1930,1040],[2150,1190],[2050,1400]].forEach(([x,y],i) => {
      const slime=this.slimes.create(x,y,'slime') as Phaser.Physics.Arcade.Sprite;
      slime.setDepth(y).setSize(46,30).setOffset(9,20).setCollideWorldBounds(true).setBounce(.4);
      slime.setData({ hp: 54, maxHp: 54, bornX:x, bornY:y, nextMove:i*420, dir: new Phaser.Math.Vector2() });
    });
    this.physics.add.collider(this.slimes,this.obstacles);
    this.physics.add.collider(this.slimes,this.slimes);
    this.physics.add.overlap(this.player,this.slimes,(_p,s) => this.hurtPlayer(s as Phaser.Physics.Arcade.Sprite));
  }

  private bindControls() {
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.keys.E.on('down',()=>this.talk());
    this.keys.SPACE.on('down',()=>this.attack());
    document.querySelectorAll<HTMLButtonElement>('.dpad button').forEach(button => {
      const set=(down:boolean) => {
        const x=button.dataset.dir==='left'?-1:button.dataset.dir==='right'?1:0;
        const y=button.dataset.dir==='up'?-1:button.dataset.dir==='down'?1:0;
        if(down) this.mobileDirection.set(x,y); else if(this.mobileDirection.x===x&&this.mobileDirection.y===y) this.mobileDirection.set(0,0);
      };
      button.addEventListener('pointerdown',e=>{e.preventDefault();set(true)});
      button.addEventListener('pointerup',()=>set(false));
      button.addEventListener('pointercancel',()=>set(false));
    });
  }

  update(time:number) {
    if(!this.player?.active) return;
    const x=(this.cursors.left.isDown||this.keys.A.isDown?-1:0)+(this.cursors.right.isDown||this.keys.D.isDown?1:0)+this.mobileDirection.x;
    const y=(this.cursors.up.isDown||this.keys.W.isDown?-1:0)+(this.cursors.down.isDown||this.keys.S.isDown?1:0)+this.mobileDirection.y;
    const velocity=new Phaser.Math.Vector2(x,y).normalize().scale(this.talking?0:PLAYER_SPEED);
    this.player.setVelocity(velocity.x,velocity.y);
    if(velocity.lengthSq()>0){ this.facing.copy(velocity).normalize(); this.player.setFlipX(velocity.x<0); this.player.setAngle(Math.sin(time/70)*1.4); }
    else this.player.setAngle(0);
    this.player.setDepth(this.player.y+20);
    this.playerName.setPosition(this.player.x,this.player.y-48);
    this.playerShadow.setPosition(this.player.x,this.player.y+29).setDepth(this.player.y-2);
    const near=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.elder.x,this.elder.y)<105;
    ui.hint.classList.toggle('hidden',!near||this.talking);
    this.updateSlimes(time);
  }

  private updateSlimes(time:number) {
    this.slimes.getChildren().forEach(item => {
      const slime=item as Phaser.Physics.Arcade.Sprite;
      if(!slime.active)return;
      const distance=Phaser.Math.Distance.Between(slime.x,slime.y,this.player.x,this.player.y);
      const data=slime.data.values as {hp:number;maxHp:number;bornX:number;bornY:number;nextMove:number;dir:Phaser.Math.Vector2};
      if(distance<330&&!this.talking){ this.physics.moveToObject(slime,this.player,62); }
      else if(time>data.nextMove){ data.nextMove=time+Phaser.Math.Between(1100,2400); data.dir.setToPolar(Phaser.Math.FloatBetween(0,Math.PI*2),Phaser.Math.Between(20,48)); slime.setVelocity(data.dir.x,data.dir.y); }
      if(distance>520){ this.physics.moveTo(slime,data.bornX,data.bornY,85); }
      slime.setFlipX((slime.body as Phaser.Physics.Arcade.Body).velocity.x<0);
      slime.setDepth(slime.y+10);
    });
  }

  talk() {
    if(!this.player?.active)return;
    if(this.talking){ ui.dialogue.classList.add('hidden'); this.talking=false; return; }
    if(Phaser.Math.Distance.Between(this.player.x,this.player.y,this.elder.x,this.elder.y)>=115){ notify('촌장에게 조금 더 가까이 가야 한다.'); return; }
    this.player.setVelocity(0,0); this.talking=true; ui.dialogue.classList.remove('hidden');
    if(this.save.quest===0){
      ui.dialogueText.textContent=`${this.save.name}, 잘 왔네. 동쪽 다리 너머 슬라임들이 마을 곡식을 훔치고 있다네. 세 마리만 처치해 주겠나?`;
      this.save.quest=1; persist(this.save); updateHud(this.save);
    } else if(this.save.quest===1){
      ui.dialogueText.textContent=this.save.kills>=3?'벌써 해치웠나? 참으로 대단한 솜씨로군!':'동쪽 다리 너머 야생 숲에 있네. 무리하지 말고 세 마리만 처치하게.';
      if(this.save.kills>=3)this.save.quest=2;
    } else if(this.save.quest===2){
      ui.dialogueText.textContent='단풍골을 지켜줘서 고맙네. 보답으로 경험치 120과 회복의 기운을 주겠네. 이제 자네도 진짜 모험가일세!';
      this.save.quest=3; this.gainXp(120); this.save.hp=this.maxHp(); notify('임무 완료 · 경험치 +120 · 체력 회복');
      const mark=this.children.getByName('quest-mark') as Phaser.GameObjects.Text | null; if(mark) mark.setVisible(false);
    } else ui.dialogueText.textContent='세상은 넓고 숨겨진 이야기는 많다네. 다음 업데이트에서 북쪽 성문이 열릴 걸세.';
    persist(this.save); updateHud(this.save);
  }

  attack() {
    if(!this.player?.active||this.talking||this.time.now-this.lastAttack<430)return;
    this.lastAttack=this.time.now;
    const attackPoint=new Phaser.Math.Vector2(this.player.x,this.player.y).add(this.facing.clone().scale(56));
    const slash=this.add.arc(attackPoint.x,attackPoint.y,46,225,495,false,0xffe098,.35).setStrokeStyle(5,0xfff0b3,.9).setDepth(999).setRotation(this.facing.angle()+Math.PI/2);
    this.tweens.add({targets:slash,alpha:0,scale:1.35,duration:180,onComplete:()=>slash.destroy()});
    this.cameras.main.shake(70,.002);
    let target:Phaser.Physics.Arcade.Sprite|undefined; let nearest=105;
    this.slimes.getChildren().forEach(item=>{const slime=item as Phaser.Physics.Arcade.Sprite;if(!slime.active)return;const d=Phaser.Math.Distance.Between(attackPoint.x,attackPoint.y,slime.x,slime.y);if(d<nearest){nearest=d;target=slime;}});
    if(!target)return;
    const damage=this.attackPower()+Phaser.Math.Between(-3,5);
    const slime=target as Phaser.Physics.Arcade.Sprite;
    slime.setData('hp',(slime.getData('hp') as number)-damage);
    const number=this.add.text(slime.x,slime.y-38,`-${damage}`,{fontFamily:'Noto Sans KR',fontSize:'17px',fontStyle:'bold',color:'#fff0a8',stroke:'#6c291d',strokeThickness:4}).setOrigin(.5).setDepth(1100);
    this.tweens.add({targets:number,y:number.y-38,alpha:0,duration:650,onComplete:()=>number.destroy()});
    slime.setTintFill(0xffffff); this.time.delayedCall(80,()=>slime.clearTint());
    const push=new Phaser.Math.Vector2(slime.x-this.player.x,slime.y-this.player.y).normalize().scale(180); slime.setVelocity(push.x,push.y);
    if((slime.getData('hp') as number)<=0)this.defeatSlime(slime);
  }

  private defeatSlime(slime:Phaser.Physics.Arcade.Sprite) {
    const x=slime.x,y=slime.y,bornX=slime.getData('bornX') as number,bornY=slime.getData('bornY') as number;
    slime.disableBody(true,true); this.save.kills++; this.gainXp(35);
    if(this.save.quest===1&&this.save.kills>=3){this.save.quest=2;notify('목표 달성! 촌장 백운에게 돌아가자.');}
    else notify('초록 슬라임 처치 · 경험치 +35');
    for(let i=0;i<9;i++){const p=this.add.circle(x,y,Phaser.Math.Between(3,7),0x8be07b).setDepth(1000);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-60,60),y:y+Phaser.Math.Between(-60,40),alpha:0,duration:Phaser.Math.Between(350,650),onComplete:()=>p.destroy()});}
    this.time.delayedCall(9000,()=>{if(!slime.scene)return;slime.enableBody(true,bornX+Phaser.Math.Between(-80,80),bornY+Phaser.Math.Between(-80,80),true,true);slime.setData('hp',54);});
    persist(this.save);updateHud(this.save);
  }

  private hurtPlayer(slime:Phaser.Physics.Arcade.Sprite) {
    if(this.time.now-this.lastHurt<900||this.talking)return;
    this.lastHurt=this.time.now;this.save.hp-=9;this.player.setTintFill(0xff6f6f);this.time.delayedCall(120,()=>this.player.clearTint());this.cameras.main.shake(110,.006);
    const push=new Phaser.Math.Vector2(this.player.x-slime.x,this.player.y-slime.y).normalize().scale(300);this.player.setVelocity(push.x,push.y);
    if(this.save.hp<=0)this.respawn();
    persist(this.save);updateHud(this.save);
  }

  private respawn(){
    this.player.disableBody(true,true);notify('기력이 다해 마을에서 깨어났다.');this.cameras.main.fadeOut(420,30,5,5);
    this.time.delayedCall(500,()=>{this.save.hp=this.maxHp();this.player.enableBody(true,500,820,true,true);this.cameras.main.fadeIn(650,8,18,28);persist(this.save);updateHud(this.save);});
  }
  private maxHp(){return HERO_CLASSES[this.save.heroClass].maxHp+(this.save.level-1)*14;}
  private attackPower(){return HERO_CLASSES[this.save.heroClass].attack+(this.save.level-1)*5;}
  private gainXp(amount:number){
    this.save.xp+=amount;
    while(this.save.xp>=this.save.level*100){this.save.xp-=this.save.level*100;this.save.level++;this.save.hp=this.maxHp();notify(`레벨 업! Lv.${this.save.level} · 체력이 회복됐다.`);}
  }
}

console.info(`${GAME_TITLE} v${GAME_VERSION}`);
