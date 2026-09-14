import Phaser from 'phaser';

const trackedGames=new Set<any>();
const installedScenes=new WeakSet<any>();

function installTracking(){
  const proto=(Phaser.Game as any)?.prototype;
  if(!proto||proto.__jwV17Tracked)return;
  const boot=proto.boot,destroy=proto.destroy;
  if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};
  if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};
  proto.__jwV17Tracked=true;
}
installTracking();

function worldScene():any|null{
  const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];
  for(const game of games){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const found=game?.scene?.getScene?.('world');if(found?.sys?.isActive?.())return found;}catch{}
  }
  return null;
}

function make(s:any,key:string,w:number,h:number,draw:(g:any)=>void){
  if(s.textures?.exists?.(key))return;
  const g=s.add.graphics();draw(g);g.generateTexture(key,w,h);g.destroy();
}

function createTextures(s:any){
  make(s,'jw17-grass-slime',92,76,g=>{
    g.fillStyle(0x15231b,.25).fillEllipse(46,67,68,12);
    g.fillStyle(0x47783e).fillRoundedRect(13,29,66,35,19);
    g.fillStyle(0x78b85d).fillCircle(31,30,23).fillCircle(57,29,25);
    g.fillStyle(0x9ad576,.7).fillEllipse(34,23,21,10);
    g.fillStyle(0x203d25).fillCircle(32,44,4).fillCircle(59,44,4);
    g.lineStyle(3,0x315431,.9).beginPath().moveTo(40,54).quadraticCurveTo(46,59,53,54).strokePath();
    g.fillStyle(0x7ebc54).fillTriangle(20,25,11,11,29,22).fillTriangle(65,23,79,13,72,31);
  });
  make(s,'jw17-water-drop',84,88,g=>{
    g.fillStyle(0x10222b,.22).fillEllipse(42,78,58,11);
    g.fillStyle(0x4aa3c6,.9).fillCircle(42,50,28);
    g.fillStyle(0x65c5e0,.92).fillTriangle(42,5,19,52,65,52);
    g.fillStyle(0x9ce6f3,.62).fillEllipse(31,42,12,21);
    g.fillStyle(0x153947).fillCircle(34,55,4).fillCircle(51,55,4);
    g.lineStyle(2,0x236075,.9).beginPath().moveTo(36,66).quadraticCurveTo(42,69,49,65).strokePath();
  });
  make(s,'jw17-wisp',90,94,g=>{
    g.fillStyle(0x15211d,.18).fillEllipse(45,84,54,9);
    g.fillStyle(0xf6bf58,.14).fillCircle(45,47,36);
    g.fillStyle(0xf1a936,.26).fillCircle(45,47,29);
    g.fillStyle(0xffdb77).fillCircle(45,45,19);
    g.fillStyle(0xfff3b0).fillCircle(39,39,9);
    g.fillStyle(0x613914).fillCircle(39,49,3).fillCircle(51,49,3);
    g.fillStyle(0xe9852e).fillTriangle(33,66,43,86,47,62).fillTriangle(47,64,57,87,60,57).fillTriangle(38,62,31,82,50,65);
  });
  make(s,'jw17-bat',112,82,g=>{
    g.fillStyle(0x101318,.24).fillEllipse(56,73,70,9);
    g.fillStyle(0x5a5068).fillTriangle(50,40,7,17,21,59).fillTriangle(62,40,105,17,91,59);
    g.fillStyle(0x756784).fillTriangle(45,43,18,31,30,60).fillTriangle(67,43,94,31,82,60);
    g.fillStyle(0x393544).fillEllipse(56,46,34,42);
    g.fillStyle(0x706378).fillTriangle(45,28,49,11,55,31).fillTriangle(57,31,64,11,68,29);
    g.fillStyle(0xe9cf73).fillCircle(49,43,4).fillCircle(63,43,4);
    g.fillStyle(0xefe8dc).fillTriangle(51,54,54,62,57,54).fillTriangle(58,54,61,62,64,54);
  });
  make(s,'jw17-golem',116,116,g=>{
    g.fillStyle(0x11171b,.28).fillEllipse(58,105,86,15);
    g.fillStyle(0x4d5962).fillRoundedRect(29,43,58,55,15);
    g.fillStyle(0x68747d).fillRoundedRect(36,19,44,38,12);
    g.fillStyle(0x404b53).fillCircle(24,59,20).fillCircle(92,59,20);
    g.fillStyle(0x303a42).fillRoundedRect(33,88,20,22,6).fillRoundedRect(63,88,20,22,6);
    g.lineStyle(4,0x93a6b3,.8).lineBetween(43,33,73,43).lineBetween(48,64,67,78).lineBetween(30,67,43,80);
    g.fillStyle(0x95d9e8).fillCircle(48,39,5).fillCircle(68,39,5);
    g.fillStyle(0x6fd0df,.45).fillCircle(58,69,10);
  });
  make(s,'jw17-cave-dokkaebi',98,108,g=>{
    g.fillStyle(0x12141b,.28).fillEllipse(49,99,68,12);
    g.fillStyle(0x72538d).fillRoundedRect(22,48,54,45,15);
    g.fillStyle(0x9b75b8).fillCircle(49,36,25);
    g.fillStyle(0xd6c7a1).fillTriangle(30,25,34,3,43,27).fillTriangle(57,27,67,4,69,29);
    g.fillStyle(0x2c2335).fillCircle(40,38,4).fillCircle(59,38,4);
    g.lineStyle(3,0x4c345d,.9).beginPath().moveTo(39,49).quadraticCurveTo(49,55,60,48).strokePath();
    g.fillStyle(0x43324d).fillRect(25,87,18,17).fillRect(56,87,18,17);
    g.lineStyle(5,0x77562d,.9).lineBetween(76,51,90,91);g.fillStyle(0xb99654).fillCircle(76,49,8);
  });
  make(s,'jw17-wolf',126,88,g=>{
    g.fillStyle(0x101619,.25).fillEllipse(62,80,88,10);
    g.fillStyle(0x71808a).fillEllipse(63,55,76,37);
    g.fillStyle(0x8597a2).fillCircle(94,43,24);
    g.fillStyle(0x8799a4).fillTriangle(80,29,82,5,96,27).fillTriangle(99,25,112,5,112,35);
    g.fillStyle(0xdce5e7).fillEllipse(103,52,25,15);
    g.fillStyle(0x20292d).fillCircle(94,41,4);g.fillStyle(0xe0cf67).fillCircle(95,40,2);
    g.fillStyle(0x263035).fillCircle(114,51,4);
    g.fillStyle(0x667680).fillRect(35,66,12,17).fillRect(74,66,12,17);
    g.lineStyle(8,0x65747d,.9).beginPath().moveTo(30,49).quadraticCurveTo(10,35,7,55).strokePath();
  });
  make(s,'jw17-shadow',96,112,g=>{
    g.fillStyle(0x0b0c11,.32).fillEllipse(48,102,64,12);
    g.fillStyle(0x392c55,.88).fillRoundedRect(22,43,52,48,21);
    g.fillStyle(0x594174,.92).fillCircle(48,35,24);
    g.fillStyle(0x291f3d,.92).fillTriangle(25,45,14,79,34,70).fillTriangle(71,45,84,78,62,70);
    g.fillStyle(0xb89cff).fillCircle(40,36,5).fillCircle(57,36,5);
    g.fillStyle(0xefe7ff).fillCircle(40,35,2).fillCircle(57,35,2);
    g.fillStyle(0x74599a,.35).fillCircle(48,57,30);
    g.fillStyle(0x6b4d92,.7).fillTriangle(28,82,38,108,47,82).fillTriangle(47,82,58,108,68,80);
  });
  make(s,'jw17-ent',120,126,g=>{
    g.fillStyle(0x111911,.26).fillEllipse(60,116,88,14);
    g.fillStyle(0x6b4d2c).fillRoundedRect(40,45,42,64,13);
    g.fillStyle(0x80603a).fillCircle(61,43,28);
    g.lineStyle(8,0x6b4d2c,.95).lineBetween(42,67,18,44).lineBetween(80,65,103,39);
    g.lineStyle(7,0x6b4d2c,.95).lineBetween(49,101,38,120).lineBetween(73,101,86,120);
    g.fillStyle(0x4f8a49).fillCircle(24,35,18).fillCircle(95,31,19).fillCircle(54,18,20).fillCircle(76,20,18);
    g.fillStyle(0x81b964,.7).fillCircle(33,25,8).fillCircle(88,18,8);
    g.fillStyle(0xd9c46c).fillCircle(52,46,4).fillCircle(69,46,4);
    g.lineStyle(3,0x4b351f,.9).beginPath().moveTo(51,60).quadraticCurveTo(61,67,71,58).strokePath();
  });
}

type ArtDef={key:string;scale:number;bodyW:number;bodyH:number;offX:number;offY:number};
function artFor(name:string):ArtDef|null{
  if(/들슬라임/.test(name))return {key:'jw17-grass-slime',scale:.84,bodyW:58,bodyH:42,offX:17,offY:24};
  if(/푸른 물방울/.test(name))return {key:'jw17-water-drop',scale:.78,bodyW:48,bodyH:54,offX:18,offY:24};
  if(/도깨비불/.test(name))return {key:'jw17-wisp',scale:.78,bodyW:48,bodyH:55,offX:21,offY:26};
  if(/광산박쥐/.test(name))return {key:'jw17-bat',scale:.78,bodyW:72,bodyH:36,offX:20,offY:38};
  if(/흑철골렘/.test(name))return {key:'jw17-golem',scale:.72,bodyW:72,bodyH:78,offX:22,offY:28};
  if(/동굴도깨비/.test(name))return {key:'jw17-cave-dokkaebi',scale:.73,bodyW:56,bodyH:68,offX:21,offY:35};
  if(/월영늑대/.test(name))return {key:'jw17-wolf',scale:.76,bodyW:86,bodyH:46,offX:18,offY:36};
  if(/그림자요괴/.test(name))return {key:'jw17-shadow',scale:.72,bodyW:54,bodyH:70,offX:21,offY:31};
  if(/고목정령/.test(name))return {key:'jw17-ent',scale:.72,bodyW:72,bodyH:86,offX:24,offY:30};
  return null;
}

function applyArt(m:any){
  if(!m?.active||m.getData?.('isBoss')||m.getData?.('jw14Label'))return;
  const name=String(m.getData?.('name')||'').replace(/^정예\s+/,''),def=artFor(name);if(!def)return;
  if(m.getData?.('jw17Art')===def.key)return;
  try{m.anims?.stop?.();}catch{}
  m.setTexture?.(def.key);m.setScale?.(def.scale*(m.getData?.('jwElite')?1.18:1));m.setSize?.(def.bodyW,def.bodyH).setOffset?.(def.offX,def.offY);
  if(!m.getData?.('jwElite'))m.clearTint?.();
  m.setData?.('jw17Art',def.key);m.setData?.('jw16Styled',true);
}

function installScene(s:any){
  if(installedScenes.has(s))return;createTextures(s);installedScenes.add(s);
}

function tick(){
  const s=worldScene();if(!s?.player)return;installScene(s);
  for(const m of (s.monsters?.getChildren?.()||[]))applyArt(m);
}

function boot(){window.setInterval(tick,140);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
