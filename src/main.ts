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
  gold: number;
  potions: number;
  weaponLevel: number;
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
  ,inventoryButton: document.querySelector<HTMLButtonElement>('#inventory-button')!
  ,inventoryPanel: document.querySelector<HTMLElement>('#inventory-panel')!
  ,inventoryClose: document.querySelector<HTMLButtonElement>('#inventory-close')!
  ,gold: document.querySelector<HTMLElement>('#gold-text')!
  ,potions: document.querySelector<HTMLElement>('#potion-text')!
  ,weapon: document.querySelector<HTMLElement>('#weapon-text')!
  ,upgradeCost: document.querySelector<HTMLElement>('#upgrade-cost')!
  ,usePotion: document.querySelector<HTMLButtonElement>('#use-potion')!
  ,upgradeWeapon: document.querySelector<HTMLButtonElement>('#upgrade-weapon')!
};

let chosenClass: HeroClass = 'warrior';
let game: Phaser.Game | undefined;
let sceneRef: WorldScene | undefined;
let launchSave: SaveData | undefined;
let toastTimer = 0;

function freshSave(name: string, heroClass: HeroClass): SaveData {
  return { name, heroClass, level: 1, xp: 0, hp: HERO_CLASSES[heroClass].maxHp, kills: 0, quest: 0, gold: 0, potions: 1, weaponLevel: 0 };
}

function readSave(): SaveData | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as SaveData | null;
    if(!parsed?.name || !HERO_CLASSES[parsed.heroClass]) return null;
    return { ...parsed, gold: parsed.gold ?? 0, potions: parsed.potions ?? 1, weaponLevel: parsed.weaponLevel ?? 0 };
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
  const attack = base.attack + (save.level - 1) * 5 + save.weaponLevel * 3;
  ui.name.textContent = save.name;
  ui.heroClass.textContent = `Lv.${save.level} ${base.label}`;
  ui.portrait.textContent = save.heroClass === 'warrior' ? '⚔' : save.heroClass === 'mage' ? '✦' : '➳';
  ui.hpBar.style.width = `${Math.max(0, save.hp / maxHp) * 100}%`;
  ui.hpText.textContent = `${Math.ceil(save.hp)} / ${maxHp}`;
  ui.xpBar.style.width = `${Math.min(100, save.xp / requiredXp * 100)}%`;
  ui.xpText.textContent = `${save.xp} / ${requiredXp}`;
  ui.atk.textContent = String(attack);
  ui.kills.textContent = String(save.kills);
  ui.gold.textContent=String(save.gold);
  ui.potions.textContent=String(save.potions);
  ui.weapon.textContent=String(save.weaponLevel*3);
  ui.upgradeCost.textContent=String((save.weaponLevel+1)*100);

  const quests = [
    ['낯선 마을의 부름', '촌장 백운에게 말을 걸어보자.', '10%'],
    ['청운들판의 골칫거리', `동문 밖 청운들판의 몬스터를 처치하자. (${Math.min(save.kills, 3)}/3)`, `${25 + Math.min(save.kills, 3) * 18}%`],
    ['첫 번째 승리', '촌장 백운에게 돌아가 보고하자.', '88%'],
    ['백운성의 수호자', '첫 임무 완료! 청운들판에서 장비와 금전을 모아보자.', '100%']
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
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#6e9a62',
    pixelArt: false,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
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
ui.inventoryButton.addEventListener('click',()=>sceneRef?.toggleInventory());
ui.inventoryClose.addEventListener('click',()=>sceneRef?.toggleInventory(false));
ui.usePotion.addEventListener('click',()=>sceneRef?.usePotion());
ui.upgradeWeapon.addEventListener('click',()=>sceneRef?.upgradeWeapon());

class WorldScene extends Phaser.Scene {
  private save!: SaveData;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerName!: Phaser.GameObjects.Text;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private elder!: Phaser.Physics.Arcade.Sprite;
  private slimes!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing = new Phaser.Math.Vector2(0, 1);
  private lastAttack = 0;
  private lastHurt = 0;
  private talking = false;
  private inventoryOpen = false;
  private mobileDirection = new Phaser.Math.Vector2();
  private zone: 'village' | 'field' = 'village';
  private worldMap!: Phaser.GameObjects.Image;
  private lastValid = new Phaser.Math.Vector2(1160, 780);
  private transitionLock = 0;

  constructor() { super('world'); }

  init(data: SaveData) {
    this.save = { ...(data?.name ? data : launchSave ?? freshSave('준자', 'warrior')) };
    sceneRef = this;
  }

  preload() {
    this.load.image('world-map', '/assets/baegun-village.webp');
    this.load.image('field-map', '/assets/cheongun-field-v1.webp');
    this.load.spritesheet('hero-warrior', '/assets/hero-warrior-sheet.webp', { frameWidth: 300, frameHeight: 300 });
    this.load.spritesheet('hero-mage', '/assets/hero-mage-sheet.webp', { frameWidth: 300, frameHeight: 300 });
    this.load.spritesheet('hero-ranger', '/assets/hero-ranger-sheet.webp', { frameWidth: 300, frameHeight: 300 });
    this.load.spritesheet('slime', '/assets/dokkaebi-slime-sheet.webp', { frameWidth: 500, frameHeight: 500 });
    this.load.image('elder-art', '/assets/elder-baegun-trim.webp');
  }

  create() {
    this.createTextures();
    this.createAnimations();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.buildWorld();
    this.createActors();
    this.bindControls();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    this.cameras.main.setZoom(1);
    this.cameras.main.fadeIn(700, 8, 18, 28);
    this.time.delayedCall(650, () => notify(`백운성에 온 것을 환영한다, ${this.save.name}!`));
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
    make('coin',24,24,g=>{g.fillStyle(0x6b3f12,.35).fillEllipse(12,19,18,6);g.fillStyle(0xf3c84d).fillCircle(12,11,9);g.lineStyle(2,0x9a611e).strokeCircle(12,11,7);});
    make('potion',24,30,g=>{g.fillStyle(0xded5b6).fillRect(8,2,8,6);g.fillStyle(0x9b2e42).fillRoundedRect(5,7,14,20,5);g.fillStyle(0xf26974,.55).fillCircle(10,14,4);});
  }

  private createAnimations() {
    if (!this.anims.exists('slime-idle')) this.anims.create({
      key: 'slime-idle',
      frames: this.anims.generateFrameNumbers('slime', { frames: [0, 1, 2, 1] }),
      frameRate: 4,
      repeat: -1
    });
  }

  private buildWorld() {
    this.worldMap=this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'world-map').setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT).setDepth(-20);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x081a16, .04).setDepth(-19);
    this.obstacles = this.physics.add.staticGroup();
    const boundary = [[-20,WORLD_HEIGHT/2,40,WORLD_HEIGHT],[WORLD_WIDTH+20,WORLD_HEIGHT/2,40,WORLD_HEIGHT],[WORLD_WIDTH/2,-20,WORLD_WIDTH,40],[WORLD_WIDTH/2,WORLD_HEIGHT+20,WORLD_WIDTH,40]];
    boundary.forEach(([x,y,w,h]) => { const b=this.obstacles.create(x,y,'rock') as Phaser.Physics.Arcade.Image; b.setVisible(false).setDisplaySize(w,h).refreshBody(); });
    const block = (x:number,y:number,w:number,h:number) => {
      const body=this.obstacles.create(x,y,'rock') as Phaser.Physics.Arcade.Image;
      body.setVisible(false).setDisplaySize(w,h).refreshBody();
    };
    // 백운성 원화의 성벽·건물·연못·정원에 맞춘 1차 충돌 지도.
    // 길, 광장, 성문 통로와 다리는 열어 두고 장식물 내부 진입을 막는다.
    [
      [300,155,600,250],[830,150,390,250],
      [1500,285,650,85],[2215,300,370,100],
      [260,600,470,390],[725,610,330,260],
      [1645,790,520,330],[2090,715,250,220],
      [2200,1050,390,440],[420,1240,840,310],
      [1130,1265,500,230],[1640,1280,430,210],
      [1215,740,150,235],[1350,915,210,150]
    ].forEach(([x,y,w,h])=>block(x,y,w,h));
    this.add.text(1120,505,'백운성', {fontFamily:'serif',fontSize:'30px',fontStyle:'bold',color:'#fff0b5',stroke:'#2b1c13',strokeThickness:7}).setOrigin(.5).setDepth(2000).setAlpha(.9).setName('village-title');
    this.add.text(1120,540,'초보자 마을', {fontFamily:'Noto Sans KR',fontSize:'12px',color:'#fff1ca',stroke:'#2b1c13',strokeThickness:5}).setOrigin(.5).setDepth(2000).setName('village-subtitle');
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
    this.elder = this.physics.add.staticSprite(1070,645,'elder-art').setScale(.058).setDepth(646);
    this.elder.setSize(430,260).setOffset(380,990).refreshBody();
    this.add.text(1070,555,'!',{fontFamily:'serif',fontSize:'28px',fontStyle:'bold',color:'#ffd65c',stroke:'#4e3308',strokeThickness:6}).setOrigin(.5).setDepth(2100).setName('quest-mark');
    this.add.text(1070,710,'촌장 백운',{fontFamily:'Noto Sans KR',fontSize:'12px',fontStyle:'bold',color:'#fff3c8',stroke:'#13212a',strokeThickness:5}).setOrigin(.5).setDepth(2100).setName('elder-label');

    this.playerShadow=this.add.ellipse(1160,805,36,11,0x10251d,.34).setDepth(800);
    this.player=this.physics.add.sprite(1160,780,`hero-${this.save.heroClass}`,1).setScale(.24).setDepth(821).setCollideWorldBounds(true);
    this.player.setSize(72,88).setOffset(114,196);
    this.playerName=this.add.text(1160,728,this.save.name,{fontFamily:'Noto Sans KR',fontSize:'11px',fontStyle:'bold',color:'#ffffff',stroke:'#14232b',strokeThickness:4}).setOrigin(.5).setDepth(2200);
    this.lastValid.set(this.player.x,this.player.y);

    this.slimes=this.physics.add.group();
    const monsters=[
      [2050,260,'초록 슬라임',54,9,35,12,0xffffff],[2210,330,'초록 슬라임',54,9,35,12,0xffffff],
      [2130,480,'푸른 물방울',72,12,48,18,0x83cfff],[2280,560,'푸른 물방울',72,12,48,18,0x83cfff],
      [1980,1040,'붉은 도깨비령',105,16,70,30,0xff8178],[2180,1130,'붉은 도깨비령',105,16,70,30,0xff8178],[2290,1230,'붉은 도깨비령',105,16,70,30,0xff8178]
    ] as const;
    monsters.forEach(([x,y,name,hp,damage,xp,gold,tint],i) => {
      const slime=this.slimes.create(x,y,'slime') as Phaser.Physics.Arcade.Sprite;
      slime.setScale(name==='붉은 도깨비령' ? .13 : .1).setDepth(y).setSize(280,190).setOffset(110,290).setCollideWorldBounds(true).setBounce(.4).setTint(tint).play('slime-idle');
      slime.setData({ name,hp,maxHp:hp,damage,xp,gold,tint,bornX:x,bornY:y,nextMove:i*420,dir:new Phaser.Math.Vector2() });
    });
    this.slimes.getChildren().forEach(item=>(item as Phaser.Physics.Arcade.Sprite).disableBody(true,true));
    this.physics.add.collider(this.slimes,this.slimes);
    this.physics.add.overlap(this.player,this.slimes,(_p,s) => this.hurtPlayer(s as Phaser.Physics.Arcade.Sprite));
    this.pickups=this.physics.add.group({allowGravity:false});
    this.physics.add.overlap(this.player,this.pickups,(_p,item)=>this.collectPickup(item as Phaser.Physics.Arcade.Sprite));
  }

  private bindControls() {
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,E,I,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.keys.E.on('down',()=>this.talk());
    this.keys.SPACE.on('down',()=>this.attack());
    this.keys.I.on('down',()=>this.toggleInventory());
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
    if(!this.isWalkable(this.player.x,this.player.y)){
      this.player.setPosition(this.lastValid.x,this.lastValid.y).setVelocity(0,0);
    } else this.lastValid.set(this.player.x,this.player.y);
    this.checkZoneTransition(time);
    const x=(this.cursors.left.isDown||this.keys.A.isDown?-1:0)+(this.cursors.right.isDown||this.keys.D.isDown?1:0)+this.mobileDirection.x;
    const y=(this.cursors.up.isDown||this.keys.W.isDown?-1:0)+(this.cursors.down.isDown||this.keys.S.isDown?1:0)+this.mobileDirection.y;
    const velocity=new Phaser.Math.Vector2(x,y).normalize().scale(this.talking||this.inventoryOpen?0:PLAYER_SPEED);
    this.player.setVelocity(velocity.x,velocity.y);
    if(velocity.lengthSq()>0){
      this.facing.copy(velocity).normalize();
      const direction=Math.abs(velocity.x)>Math.abs(velocity.y)?(velocity.x<0?'left':'right'):(velocity.y<0?'up':'down');
      this.player.stop();
      this.player.setRotation(0);
      if(direction==='left'||direction==='right'){
        this.player.setFrame(7).setFlipX(direction==='right');
      } else {
        this.player.setFrame(direction==='up'?2:1).setFlipX(false);
      }
      const pulse=Math.sin(time*.018);
      this.player.setScale(.24, .24 + Math.abs(pulse)*.012);
      this.playerShadow.setScale(1-Math.abs(pulse)*.08,1);
    } else {
      this.player.stop();
      const direction=Math.abs(this.facing.x)>Math.abs(this.facing.y)?(this.facing.x<0?'left':'right'):(this.facing.y<0?'up':'down');
      if(direction==='left'||direction==='right') this.player.setFrame(7).setFlipX(direction==='right');
      else this.player.setFrame(direction==='up'?2:1).setFlipX(false);
      this.player.setScale(.24);
      this.playerShadow.setScale(1);
    }
    this.player.setDepth(this.player.y+20);
    this.playerName.setPosition(this.player.x,this.player.y-52);
    this.playerShadow.setPosition(this.player.x,this.player.y+25).setDepth(this.player.y-2);
    const near=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.elder.x,this.elder.y)<105;
    ui.hint.classList.toggle('hidden',!near||this.talking);
    this.updateSlimes(time);
  }

  private isWalkable(x:number,y:number) {
    const inside=(r:[number,number,number,number])=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];
    if(this.zone==='village'){
      const roads:[number,number,number,number][]=[
        [820,260,470,1080],[320,515,1900,270],[540,420,1040,650],
        [1450,360,900,300],[620,925,1280,300]
      ];
      const blocked:[number,number,number,number][]=[
        [1390,640,650,350],[1540,1040,500,300],[460,1030,650,300]
      ];
      return roads.some(inside)&&!blocked.some(inside);
    }
    const fieldBounds:[number,number,number,number]=[100,110,2200,1190];
    const water:[number,number,number,number][]=[
      [720,0,330,570],[530,720,430,680]
    ];
    const bridge:[number,number,number,number]=[610,600,520,170];
    return inside(fieldBounds)&&(!water.some(inside)||inside(bridge));
  }

  private checkZoneTransition(time:number) {
    if(time<this.transitionLock)return;
    if(this.zone==='village'&&this.player.x>2240&&this.player.y>360&&this.player.y<700){
      this.enterZone('field',210,470,'청운들판');
    } else if(this.zone==='field'&&this.player.x<150&&this.player.y>300&&this.player.y<720){
      this.enterZone('village',2200,520,'백운성');
    }
  }

  private enterZone(zone:'village'|'field',x:number,y:number,label:string) {
    this.zone=zone;
    this.transitionLock=this.time.now+1200;
    this.worldMap.setTexture(zone==='village'?'world-map':'field-map');
    this.obstacles.getChildren().forEach(item=>{
      const body=(item as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      body.enable=zone==='village';
    });
    this.player.setPosition(x,y).setVelocity(0,0);
    this.lastValid.set(x,y);
    this.slimes.getChildren().forEach(item=>{
      const slime=item as Phaser.Physics.Arcade.Sprite;
      if(zone==='field') slime.enableBody(false,slime.getData('bornX'),slime.getData('bornY'),true,true);
      else slime.disableBody(true,true);
    });
    this.pickups?.clear(true,true);
    this.elder.setVisible(zone==='village').setActive(zone==='village');
    ['quest-mark','elder-label','village-title','village-subtitle'].forEach(name=>(this.children.getByName(name) as Phaser.GameObjects.Text|null)?.setVisible(zone==='village'));
    const zoneLabel=document.querySelector<HTMLElement>('.zone strong');
    if(zoneLabel)zoneLabel.textContent=zone==='village'?'백운성 초보자 마을':'청운들판';
    this.cameras.main.flash(350,230,205,140);
    notify(`${label}에 도착했다.`);
  }

  private updateSlimes(time:number) {
    this.slimes.getChildren().forEach(item => {
      const slime=item as Phaser.Physics.Arcade.Sprite;
      if(!slime.active)return;
      const distance=Phaser.Math.Distance.Between(slime.x,slime.y,this.player.x,this.player.y);
      const data=slime.data.values as {hp:number;maxHp:number;damage:number;bornX:number;bornY:number;nextMove:number;dir:Phaser.Math.Vector2};
      if(!this.isWalkable(slime.x,slime.y)){slime.setPosition(data.bornX,data.bornY).setVelocity(0,0);}
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
      ui.dialogueText.textContent=`${this.save.name}, 잘 왔네. 동문 밖 청운들판의 요괴들이 길을 막고 있다네. 세 마리만 처치해 주겠나?`;
      this.save.quest=1; persist(this.save); updateHud(this.save);
    } else if(this.save.quest===1){
      ui.dialogueText.textContent=this.save.kills>=3?'벌써 해치웠나? 참으로 대단한 솜씨로군!':'동쪽 다리 너머 야생 숲에 있네. 무리하지 말고 세 마리만 처치하게.';
      if(this.save.kills>=3)this.save.quest=2;
    } else if(this.save.quest===2){
      ui.dialogueText.textContent='단풍골을 지켜줘서 고맙네. 보답으로 경험치 120과 회복의 기운을 주겠네. 이제 자네도 진짜 모험가일세!';
      this.save.quest=3; this.gainXp(120); this.save.hp=this.maxHp(); this.save.gold+=150; this.save.potions+=2; notify('임무 완료 · 경험치 +120 · 엽전 150 · 회복약 2개');
      const mark=this.children.getByName('quest-mark') as Phaser.GameObjects.Text | null; if(mark) mark.setVisible(false);
    } else ui.dialogueText.textContent='세상은 넓고 숨겨진 이야기는 많다네. 다음 업데이트에서 북쪽 성문이 열릴 걸세.';
    persist(this.save); updateHud(this.save);
  }

  attack() {
    if(!this.player?.active||this.talking||this.inventoryOpen||this.time.now-this.lastAttack<430)return;
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
    this.showMonsterStatus(slime);
    const number=this.add.text(slime.x,slime.y-38,`-${damage}`,{fontFamily:'Noto Sans KR',fontSize:'17px',fontStyle:'bold',color:'#fff0a8',stroke:'#6c291d',strokeThickness:4}).setOrigin(.5).setDepth(1100);
    this.tweens.add({targets:number,y:number.y-38,alpha:0,duration:650,onComplete:()=>number.destroy()});
    slime.setTintFill(0xffffff); this.time.delayedCall(80,()=>slime.setTint(slime.getData('tint') as number));
    const push=new Phaser.Math.Vector2(slime.x-this.player.x,slime.y-this.player.y).normalize().scale(180); slime.setVelocity(push.x,push.y);
    if((slime.getData('hp') as number)<=0)this.defeatSlime(slime);
  }

  private defeatSlime(slime:Phaser.Physics.Arcade.Sprite) {
    const x=slime.x,y=slime.y,bornX=slime.getData('bornX') as number,bornY=slime.getData('bornY') as number;
    const xp=slime.getData('xp') as number;
    const gold=slime.getData('gold') as number;
    const monsterName=slime.getData('name') as string;
    slime.disableBody(true,true); this.save.kills++; this.gainXp(xp);
    this.dropLoot(x,y,gold);
    if(this.save.quest===1&&this.save.kills>=3){this.save.quest=2;notify('목표 달성! 촌장 백운에게 돌아가자.');}
    else notify(`${monsterName} 처치 · 경험치 +${xp}`);
    for(let i=0;i<9;i++){const p=this.add.circle(x,y,Phaser.Math.Between(3,7),0x8be07b).setDepth(1000);this.tweens.add({targets:p,x:x+Phaser.Math.Between(-60,60),y:y+Phaser.Math.Between(-60,40),alpha:0,duration:Phaser.Math.Between(350,650),onComplete:()=>p.destroy()});}
    this.time.delayedCall(9000,()=>{if(!slime.scene||this.zone!=='field')return;slime.enableBody(true,bornX+Phaser.Math.Between(-80,80),bornY+Phaser.Math.Between(-80,80),true,true);slime.setData('hp',slime.getData('maxHp'));});
    persist(this.save);updateHud(this.save);
  }

  private hurtPlayer(slime:Phaser.Physics.Arcade.Sprite) {
    if(this.time.now-this.lastHurt<900||this.talking)return;
    this.lastHurt=this.time.now;this.save.hp-=slime.getData('damage') as number;this.player.setTintFill(0xff6f6f);this.time.delayedCall(120,()=>this.player.clearTint());this.cameras.main.shake(110,.006);
    const push=new Phaser.Math.Vector2(this.player.x-slime.x,this.player.y-slime.y).normalize().scale(300);this.player.setVelocity(push.x,push.y);
    if(this.save.hp<=0)this.respawn();
    persist(this.save);updateHud(this.save);
  }

  private showMonsterStatus(monster:Phaser.Physics.Arcade.Sprite){
    const hp=monster.getData('hp') as number,max=monster.getData('maxHp') as number,name=monster.getData('name') as string;
    const label=this.add.text(monster.x,monster.y-58,`${name}  ${Math.max(0,hp)}/${max}`,{fontFamily:'Noto Sans KR',fontSize:'10px',fontStyle:'bold',color:'#fff5dc',stroke:'#172027',strokeThickness:4}).setOrigin(.5).setDepth(2400);
    const back=this.add.rectangle(monster.x,monster.y-43,62,5,0x1a2024,.9).setDepth(2399);
    const bar=this.add.rectangle(monster.x-30,monster.y-43,60*Math.max(0,hp/max),3,0xd84b51).setOrigin(0,.5).setDepth(2400);
    this.tweens.add({targets:[label,back,bar],alpha:0,duration:350,delay:700,onComplete:()=>{label.destroy();back.destroy();bar.destroy();}});
  }

  private dropLoot(x:number,y:number,gold:number){
    const coin=this.pickups.create(x,y,'coin') as Phaser.Physics.Arcade.Sprite;
    coin.setData({kind:'gold',amount:gold+Phaser.Math.Between(0,8)}).setDepth(y+30);
    this.tweens.add({targets:coin,y:y-18,duration:220,yoyo:true,ease:'Quad.out'});
    if(Math.random()<.32){
      const potion=this.pickups.create(x+28,y,'potion') as Phaser.Physics.Arcade.Sprite;
      potion.setData({kind:'potion',amount:1}).setDepth(y+31);
      this.tweens.add({targets:potion,y:y-20,duration:240,yoyo:true,ease:'Quad.out'});
    }
  }

  private collectPickup(item:Phaser.Physics.Arcade.Sprite){
    const kind=item.getData('kind') as string,amount=item.getData('amount') as number;
    if(kind==='gold'){this.save.gold+=amount;notify(`엽전 +${amount}`);}else{this.save.potions+=amount;notify('초급 회복약을 얻었다.');}
    item.destroy();persist(this.save);updateHud(this.save);
  }

  toggleInventory(force?:boolean){
    this.inventoryOpen=force??!this.inventoryOpen;
    ui.inventoryPanel.classList.toggle('hidden',!this.inventoryOpen);
    if(this.inventoryOpen)this.player?.setVelocity(0,0);
  }

  usePotion(){
    if(this.save.potions<1){notify('회복약이 없다.');return;}
    if(this.save.hp>=this.maxHp()){notify('이미 체력이 가득 차 있다.');return;}
    this.save.potions--;this.save.hp=Math.min(this.maxHp(),this.save.hp+50);persist(this.save);updateHud(this.save);notify('체력이 50 회복됐다.');
  }

  upgradeWeapon(){
    const cost=(this.save.weaponLevel+1)*100;
    if(this.save.gold<cost){notify(`엽전이 ${cost-this.save.gold} 부족하다.`);return;}
    this.save.gold-=cost;this.save.weaponLevel++;persist(this.save);updateHud(this.save);notify(`철검 +${this.save.weaponLevel} 강화 성공!`);
  }

  private respawn(){
    this.player.disableBody(true,true);notify('기력이 다해 마을에서 깨어났다.');this.cameras.main.fadeOut(420,30,5,5);
    this.time.delayedCall(500,()=>{this.save.hp=this.maxHp();this.player.enableBody(true,1160,780,true,true);this.enterZone('village',1160,780,'백운성');this.cameras.main.fadeIn(650,8,18,28);persist(this.save);updateHud(this.save);});
  }
  private maxHp(){return HERO_CLASSES[this.save.heroClass].maxHp+(this.save.level-1)*14;}
  private attackPower(){return HERO_CLASSES[this.save.heroClass].attack+(this.save.level-1)*5+this.save.weaponLevel*3;}
  private gainXp(amount:number){
    this.save.xp+=amount;
    while(this.save.xp>=this.save.level*100){this.save.xp-=this.save.level*100;this.save.level++;this.save.hp=this.maxHp();notify(`레벨 업! Lv.${this.save.level} · 체력이 회복됐다.`);}
  }
}

console.info(`${GAME_TITLE} v${GAME_VERSION}`);
