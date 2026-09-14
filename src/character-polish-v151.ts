import Phaser from 'phaser';

const patched=new WeakSet<any>();

function activeScene():any|null{
 const games=((((Phaser as any).GAMES||[]) as any[]));
 for(const game of games){const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}}
 return null;
}
function make(scene:any,key:string,w:number,h:number,draw:(g:any)=>void){if(scene.textures.exists(key))return;const g=scene.add.graphics();draw(g);g.generateTexture(key,w,h);g.destroy();}
function createGearTextures(s:any){
 make(s,'jw15-armor-warrior',74,58,g=>{g.fillStyle(0x192738,.96).fillRoundedRect(18,13,38,38,8);g.fillStyle(0x405b79).fillTriangle(18,16,3,24,18,33).fillTriangle(56,16,71,24,56,33);g.fillStyle(0x6e89a5).fillRoundedRect(23,17,28,25,6);g.lineStyle(3,0xd0dde8,.85).strokeRoundedRect(23,17,28,25,6);g.fillStyle(0xd3aa4e).fillRect(34,18,6,27);g.fillStyle(0x8e3030).fillTriangle(23,44,51,44,37,55);});
 make(s,'jw15-armor-mage',72,64,g=>{g.fillStyle(0x2e2343,.96).fillRoundedRect(20,10,32,31,10);g.fillStyle(0x554274).fillTriangle(21,29,10,61,34,49).fillTriangle(51,29,62,61,38,49);g.fillStyle(0x705a93,.95).fillTriangle(18,15,5,25,20,32).fillTriangle(54,15,67,25,52,32);g.lineStyle(2,0xd6c0f0,.8).strokeRoundedRect(24,14,24,20,6);g.fillStyle(0xf0ce6a).fillCircle(36,27,4).fillCircle(36,45,3);g.lineStyle(2,0xf0ce6a,.7).lineBetween(36,31,36,43);});
 make(s,'jw15-armor-ranger',72,58,g=>{g.fillStyle(0x263529,.98).fillRoundedRect(20,13,32,36,8);g.fillStyle(0x5c764c).fillRoundedRect(24,17,24,28,5);g.fillStyle(0x8c6840).fillRect(18,20,5,28).fillRect(49,20,5,28);g.lineStyle(3,0xb68c59,.85).lineBetween(25,18,48,43).lineBetween(47,18,26,43);g.fillStyle(0x7d5634).fillTriangle(52,13,67,18,54,24);g.fillStyle(0xd7bf78).fillRect(33,17,5,28);});
 make(s,'jw15-weapon-warrior',30,84,g=>{g.fillStyle(0x4a311c).fillRoundedRect(12,58,6,22,2);g.fillStyle(0xd4a84d).fillRect(5,55,20,5);g.fillStyle(0xcdd9e4).fillTriangle(15,2,25,54,5,54);g.fillStyle(0xffffff,.75).fillTriangle(15,7,18,49,11,49);g.lineStyle(2,0x8092a2,.65).lineBetween(7,52,23,52);});
 make(s,'jw15-weapon-mage',36,88,g=>{g.fillStyle(0x5c3b28).fillRoundedRect(16,20,5,66,2);g.fillStyle(0x9a7558).fillRoundedRect(17,22,2,61,1);g.fillStyle(0x7455a5,.75).fillCircle(18,14,12);g.lineStyle(3,0xd2baf5,.9).strokeCircle(18,14,9);g.fillStyle(0xf5de80).fillCircle(18,14,4);g.fillStyle(0xa682d0,.8).fillCircle(6,22,3).fillCircle(30,25,3);});
 make(s,'jw15-weapon-ranger',68,86,g=>{g.lineStyle(5,0x8d5d34,1).beginPath().moveTo(20,7).lineTo(11,23).lineTo(6,43).lineTo(11,63).lineTo(20,79).strokePath();g.lineStyle(3,0xcca96e,.95).beginPath().moveTo(21,8).lineTo(48,43).lineTo(21,78).strokePath();g.lineStyle(1,0xe6dfc5,.9).lineBetween(21,8,48,43).lineBetween(48,43,21,78);g.fillStyle(0xb7c5d0).fillTriangle(48,40,65,43,48,46);g.fillStyle(0xead9a7).fillRect(46,42,14,2);});
}
function tierTint(level:number,rare:boolean){if(rare)return 0xe6b2ff;if(level>=8)return 0xffe082;if(level>=5)return 0xa6d8ff;if(level>=3)return 0xc1b0ef;return 0xffffff;}
function classKeys(hero:string){if(hero==='mage')return {armor:'jw15-armor-mage',weapon:'jw15-weapon-mage'};if(hero==='ranger')return {armor:'jw15-armor-ranger',weapon:'jw15-weapon-ranger'};return {armor:'jw15-armor-warrior',weapon:'jw15-weapon-warrior'};}
function patchScene(s:any){
 if(!s||patched.has(s)||!s.player||!s.gearArmor||!s.gearWeapon)return;
 createGearTextures(s);patched.add(s);
 const oldRefresh=typeof s.refreshGearVisual==='function'?s.refreshGearVisual.bind(s):null;
 s.refreshGearVisual=function(){
  try{oldRefresh?.();}catch{}
  const hero=String(this.save?.heroClass||'warrior'),keys=classKeys(hero),weaponLv=Number(this.save?.weaponLevel||0),armorLv=Number(this.save?.armorLevel||0),rare=Array.isArray(this.save?.rareItems)&&this.save.rareItems.includes('blackIronBlade');
  this.gearArmor?.setTexture(keys.armor).setVisible(armorLv>0).setTint(tierTint(armorLv,false));
  this.gearWeapon?.setTexture(keys.weapon).setVisible(weaponLv>0||rare).setTint(tierTint(weaponLv,rare));
  const armorBase=hero==='mage'?.77:.76;const weaponBase=hero==='ranger'?.68:hero==='mage'?.7:.72;
  this.gearArmor?.setScale(armorBase+Math.min(8,armorLv)*.018);
  this.gearWeapon?.setScale(weaponBase+Math.min(8,weaponLv)*.018);
 };
 s.updateGearVisual=function(time:number){
  if(!this.player)return;const facing=this.facing||{x:0,y:1},vx=Number(this.player?.body?.velocity?.x||0),vy=Number(this.player?.body?.velocity?.y||0),moving=Math.hypot(vx,vy)>8;const bob=moving?Math.sin(time*.018)*1.8:Math.sin(time*.004)*.45;const hero=String(this.save?.heroClass||'warrior');const x=Number(this.player.x),y=Number(this.player.y);const side=facing.x<0?-1:1;const vertical=Math.abs(facing.y)>Math.abs(facing.x);
  this.gearArmor?.setFlipX(false).setRotation(0);
  if(vertical&&facing.y<0){
   this.gearArmor?.setPosition(x,y+2+bob).setDepth(y-3);
   this.gearWeapon?.setPosition(x+side*(hero==='ranger'?27:23),y-5+bob).setFlipX(side<0).setRotation(side*(hero==='mage'?.08:hero==='ranger'?.02:.13)).setDepth(y-14);
  }else if(vertical){
   this.gearArmor?.setPosition(x,y+2+bob).setDepth(y+19);
   this.gearWeapon?.setPosition(x+side*(hero==='ranger'?29:25),y+4+bob).setFlipX(side<0).setRotation(side*(hero==='mage'?.12:hero==='ranger'?.04:.19)).setDepth(y+30);
  }else{
   this.gearArmor?.setPosition(x-side*2,y+2+bob).setDepth(y+13);
   this.gearWeapon?.setPosition(x+side*(hero==='ranger'?31:27),y+1+bob).setFlipX(side<0).setRotation(side*(hero==='mage'?.15:hero==='ranger'?.06:.2)).setDepth(y+25);
  }
  this.gearAura?.setPosition(x,y+bob*.35).setDepth(y-6).setRotation(time*.00045).setAlpha(.43+Math.sin(time*.004)*.1);
  if(this.jw15LevelText){this.jw15LevelText.setPosition(x,y-42+bob*.2).setDepth(3001);}
 };
 if(!s.jw15LevelText){s.jw15LevelText=s.add.text(s.player.x,s.player.y-42,`Lv.${Number(s.save?.level||1)}`,{fontFamily:'Noto Sans KR',fontSize:'8px',fontStyle:'bold',color:'#f2d678',stroke:'#14232b',strokeThickness:3}).setOrigin(.5).setDepth(3001);}
 s.refreshGearVisual();
}
function tick(){const s=activeScene();if(!s)return;patchScene(s);if(s.jw15LevelText)s.jw15LevelText.setText(`Lv.${Number(s.save?.level||1)}`);}
function boot(){tick();window.setInterval(tick,500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
