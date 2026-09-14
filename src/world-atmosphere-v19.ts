import Phaser from 'phaser';
import './v19.css';

type Zone='village'|'field'|'mine'|'forest';
type AmbientState={zone:Zone;objects:any[];lastZone:string};
const trackedGames=new Set<any>();
const states=new WeakMap<any,AmbientState>();

function installTracking(){const proto=(Phaser.Game as any)?.prototype;if(!proto||proto.__jwV19Tracked)return;const boot=proto.boot,destroy=proto.destroy;if(typeof boot==='function')proto.boot=function(...args:any[]){trackedGames.add(this);return boot.apply(this,args);};if(typeof destroy==='function')proto.destroy=function(...args:any[]){trackedGames.delete(this);return destroy.apply(this,args);};proto.__jwV19Tracked=true;}
installTracking();
function scene():any|null{const games=[...trackedGames,...((((Phaser as any).GAMES||[]) as any[]))];for(const game of games){const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}}return null;}
function make(s:any,key:string,w:number,h:number,draw:(g:any)=>void){if(s.textures?.exists?.(key))return;const g=s.add.graphics();draw(g);g.generateTexture(key,w,h);g.destroy();}

function textures(s:any){
 make(s,'jw19-lantern',34,74,g=>{g.lineStyle(4,0x4a2f1d,.95).lineBetween(17,0,17,31);g.fillStyle(0x8b3428).fillRoundedRect(5,27,24,27,6);g.fillStyle(0xf2c467,.92).fillRoundedRect(9,32,16,17,4);g.lineStyle(2,0x4b2918,.9).strokeRoundedRect(5,27,24,27,6);g.lineStyle(2,0x7b4225,.9).lineBetween(8,59,26,59);g.fillStyle(0x6b3a21).fillRect(15,54,4,18);});
 make(s,'jw19-banner',44,94,g=>{g.fillStyle(0x5b3a22).fillRect(7,2,5,90);g.fillStyle(0x7d2f2d).fillRoundedRect(12,8,27,54,3);g.fillStyle(0xd6ad55).fillRect(16,13,3,42);g.fillStyle(0xe9d6a4).fillTriangle(30,17,37,27,30,37);g.fillStyle(0x4a2b21).fillTriangle(12,62,25,72,38,62);});
 make(s,'jw19-well',88,72,g=>{g.fillStyle(0x101915,.22).fillEllipse(44,65,72,10);g.fillStyle(0x6f6d63).fillRoundedRect(12,35,64,28,12);g.fillStyle(0x929084).fillRoundedRect(17,30,54,12,6);g.fillStyle(0x2e4d59).fillEllipse(44,35,42,10);g.lineStyle(5,0x5a3b25).lineBetween(18,35,18,10).lineBetween(70,35,70,10).lineBetween(18,10,70,10);g.fillStyle(0x765333).fillRect(41,8,6,31);});
 make(s,'jw19-reed',58,82,g=>{g.lineStyle(3,0x557743,.95);for(let i=0;i<7;i++){const x=9+i*7;g.lineBetween(29,76,x,18+(i%3)*9);}g.fillStyle(0x7fa25b);g.fillEllipse(14,34,16,8).fillEllipse(43,28,17,8).fillEllipse(21,51,15,7).fillEllipse(38,47,16,7);g.fillStyle(0xb99556).fillRoundedRect(6,10,5,18,3).fillRoundedRect(45,12,5,20,3);});
 make(s,'jw19-flower',44,52,g=>{g.lineStyle(3,0x47723f).lineBetween(22,49,22,18).lineBetween(22,36,10,29).lineBetween(22,33,34,24);g.fillStyle(0x7dad67).fillEllipse(10,29,14,7).fillEllipse(34,24,14,7);g.fillStyle(0xe7d98d).fillCircle(22,15,5);g.fillStyle(0xeaa6a0).fillCircle(15,16,7).fillCircle(29,16,7).fillCircle(22,9,7).fillCircle(22,23,7);g.fillStyle(0xf4d56e).fillCircle(22,16,4);});
 make(s,'jw19-torch',36,94,g=>{g.fillStyle(0x604327).fillRoundedRect(15,36,6,56,2);g.fillStyle(0xb56533).fillTriangle(18,3,8,32,28,32);g.fillStyle(0xf1c85a).fillTriangle(18,10,12,30,24,30);g.fillStyle(0xffec9c).fillTriangle(18,16,15,29,21,29);});
 make(s,'jw19-mine-crystal',62,76,g=>{g.fillStyle(0x10161b,.25).fillEllipse(31,69,52,9);g.fillStyle(0x718bb0,.75).fillTriangle(31,4,42,60,30,70).fillTriangle(31,4,18,58,30,70);g.fillStyle(0x9fc4e9,.7).fillTriangle(9,28,21,63,9,69).fillTriangle(51,22,59,61,44,68);g.fillStyle(0xd2e9ff,.8).fillTriangle(31,8,35,48,28,54);});
 make(s,'jw19-cart',104,64,g=>{g.fillStyle(0x111619,.24).fillEllipse(52,58,88,10);g.fillStyle(0x765438).fillRoundedRect(17,20,70,27,5);g.fillStyle(0x9a7049).fillTriangle(17,20,7,5,24,20).fillTriangle(87,20,97,5,80,20);g.fillStyle(0x2b3137).fillCircle(27,50,12).fillCircle(76,50,12);g.fillStyle(0x59646d).fillCircle(27,50,5).fillCircle(76,50,5);g.fillStyle(0x5b6470).fillTriangle(34,15,46,4,58,18).fillTriangle(54,17,66,2,78,18);});
 make(s,'jw19-moonstone',72,92,g=>{g.fillStyle(0x10191a,.24).fillEllipse(36,84,58,10);g.fillStyle(0x5c6b72).fillRoundedRect(17,22,38,59,15);g.fillStyle(0x82969f,.65).fillRoundedRect(23,17,28,20,10);g.lineStyle(3,0xb9dbd1,.7).strokeCircle(36,50,11);g.lineStyle(2,0xb9dbd1,.65).lineBetween(36,38,36,62).lineBetween(24,50,48,50);g.fillStyle(0xcff2b9,.8).fillCircle(36,50,3);});
 make(s,'jw19-shrub',90,74,g=>{g.fillStyle(0x101914,.22).fillEllipse(45,67,68,9);g.fillStyle(0x315c3f).fillCircle(23,44,20).fillCircle(48,35,27).fillCircle(68,46,19);g.fillStyle(0x4f7a4b).fillCircle(34,30,17).fillCircle(59,27,16);g.fillStyle(0x93c874,.65).fillCircle(25,34,6).fillCircle(58,19,5).fillCircle(70,39,5);});
}

function addImage(s:any,key:string,x:number,y:number,zone:Zone,scale=1,alpha=1){const img=s.add.image(x,y,key).setScale(scale).setAlpha(alpha).setDepth(y-8);img.setData('jw19Zone',zone);return img;}
function build(s:any):AmbientState{textures(s);const objects:any[]=[];
 // 백운성: 등불·깃발·우물로 생활감 강화
 [[910,665],[1285,680],[1035,920],[1420,890]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-lantern',x,y,'village',.86);objects.push(o);s.tweens.add({targets:o,alpha:{from:.82,to:1},duration:700+i*90,yoyo:true,repeat:-1,ease:'Sine.inOut'});});
 [[835,570],[1470,585]].forEach(([x,y])=>objects.push(addImage(s,'jw19-banner',x,y,'village',.9)));
 objects.push(addImage(s,'jw19-well',720,820,'village',.92));
 // 청운들판: 풀숲·야생화
 [[370,270],[690,1070],[1120,250],[1580,1110],[2050,320],[2140,980]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-reed',x,y,'field',.8+i%2*.08,.92);objects.push(o);s.tweens.add({targets:o,angle:{from:-2,to:2},duration:1000+i*100,yoyo:true,repeat:-1,ease:'Sine.inOut'});});
 [[520,890],[990,1060],[1510,320],[1900,800]].forEach(([x,y])=>objects.push(addImage(s,'jw19-flower',x,y,'field',.8)));
 // 흑철광산: 횃불·광석·광차
 [[330,300],[720,1030],[1180,250],[1690,1040],[2110,350]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-torch',x,y,'mine',.78);objects.push(o);s.tweens.add({targets:o,scaleY:{from:.74,to:.84},alpha:{from:.82,to:1},duration:340+i*30,yoyo:true,repeat:-1});});
 [[500,720],[1320,1080],[1850,590],[2200,1120]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-mine-crystal',x,y,'mine',.8);objects.push(o);s.tweens.add({targets:o,alpha:{from:.64,to:.95},duration:850+i*120,yoyo:true,repeat:-1});});
 objects.push(addImage(s,'jw19-cart',970,550,'mine',.84));
 // 월영숲: 월석·관목·은은한 빛
 [[430,330],[930,1060],[1510,260],[2060,980]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-moonstone',x,y,'forest',.82);objects.push(o);s.tweens.add({targets:o,alpha:{from:.72,to:1},duration:1100+i*120,yoyo:true,repeat:-1});});
 [[620,820],[1170,330],[1630,1020],[2140,480],[350,1080]].forEach(([x,y],i)=>{const o=addImage(s,'jw19-shrub',x,y,'forest',.84+i%2*.06);objects.push(o);s.tweens.add({targets:o,scaleX:{from:o.scaleX*.97,to:o.scaleX*1.03},duration:1300+i*80,yoyo:true,repeat:-1,ease:'Sine.inOut'});});
 return {zone:'village',objects,lastZone:''};}

const mood:Record<Zone,{title:string,copy:string}>={
 village:{title:'백운성 · 사람의 온기',copy:'경비대와 주민이 오가는 초보자 거점 · 제작소와 촌장 백운'},
 field:{title:'청운들판 · 바람의 길',copy:'들풀과 야생화 사이로 하급 요괴가 배회하는 초반 사냥터'},
 mine:{title:'흑철광산 · 철의 숨결',copy:'횃불과 광맥이 빛나는 지하 채굴지 · 강인한 요괴 출현'},
 forest:{title:'월영숲 · 달빛의 기운',copy:'월석과 고목이 숨쉬는 상위 지역 · 정예와 봉인의 흔적'}
};
function createDom(){if(!document.querySelector('.jw19-zone-atmosphere')){const fx=document.createElement('div');fx.className='jw19-zone-atmosphere village';for(let i=0;i<16;i++){const m=document.createElement('i');m.className='jw19-float';m.style.left=`${(i*37)%96}%`;m.style.top=`${20+(i*53)%75}%`;m.style.animationDuration=`${4+(i%5)*.8}s`;m.style.animationDelay=`${-(i%7)*.6}s`;fx.appendChild(m);}document.body.appendChild(fx);}if(!document.querySelector('.jw19-zone-mood')){const box=document.createElement('div');box.className='jw19-zone-mood';box.innerHTML='<b>백운성 · 사람의 온기</b><span>경비대와 주민이 오가는 초보자 거점</span>';document.body.appendChild(box);}}
function applyZone(s:any,state:AmbientState,zone:Zone){if(state.lastZone===zone)return;state.lastZone=zone;state.zone=zone;state.objects.forEach(o=>o?.setVisible?.(o?.getData?.('jw19Zone')===zone));const fx=document.querySelector<HTMLElement>('.jw19-zone-atmosphere');if(fx)fx.className=`jw19-zone-atmosphere ${zone}`;const box=document.querySelector<HTMLElement>('.jw19-zone-mood');if(box){const m=mood[zone]||mood.village;box.innerHTML=`<b>${m.title}</b><span>${m.copy}</span>`;}try{s.cameras?.main?.fadeIn?.(260,zone==='mine'?8:zone==='forest'?10:18,zone==='mine'?12:zone==='forest'?22:32,zone==='mine'?20:zone==='forest'?28:24);}catch{}}
function tick(){createDom();const s=scene();if(!s?.player)return;let state=states.get(s);if(!state){state=build(s);states.set(s,state);}const zone=(['village','field','mine','forest'].includes(String(s.zone))?String(s.zone):'village') as Zone;applyZone(s,state,zone);}
function boot(){createDom();window.setInterval(tick,220);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
