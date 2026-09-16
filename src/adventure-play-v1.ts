import Phaser from 'phaser';
import './adventure-play-v1.css';
import './adventure-character-v2';
import './adventure-world-v2';

type Hero='warrior'|'mage'|'ranger';
const tuned=new WeakSet<any>();

function activeScene():any|null{
  const games=((((Phaser as any).GAMES||[]) as any[]));
  for(const game of games){
    const direct=game?.scene?.keys?.world;
    if(direct?.sys?.isActive?.())return direct;
    try{const scene=game?.scene?.getScene?.('world');if(scene?.sys?.isActive?.())return scene;}catch{}
  }
  return null;
}

function hero(scene:any):Hero{
  const value=String(scene?.save?.heroClass||'warrior');
  return value==='mage'||value==='ranger'?value:'warrior';
}

function tuneScene(scene:any){
  if(!scene?.player||tuned.has(scene))return;
  tuned.add(scene);
  const h=hero(scene);
  const scale=h==='warrior'?.255:.25;
  try{
    scene.player.setScale(scale);
    scene.player.setAlpha(1);
    scene.player.setDepth(Number(scene.player.y||800)+24);
    scene.shadow?.setDisplaySize?.(44,13)?.setAlpha?.(.3);
    scene.nameText?.setFontSize?.(10)?.setColor?.('#fff8de')?.setStroke?.('#18302e',4);
    scene.gearArmor?.setAlpha?.(.9);
    scene.gearWeapon?.setAlpha?.(.94);
  }catch{}
}

function lateBranding(){
  document.querySelectorAll<HTMLElement>('.jw-zone-title small').forEach(el=>{if(el.textContent!=='JUNJA ADVENTURE')el.textContent='JUNJA ADVENTURE';});
  document.querySelectorAll<HTMLElement>('.jw16-world-head b').forEach(el=>{if(el.textContent?.includes('지역 지도'))el.textContent='지역 지도';});
  document.querySelectorAll<HTMLElement>('.jw19-zone-mood').forEach(el=>el.setAttribute('aria-label','현재 지역 분위기'));
}

function tick(){
  lateBranding();
  const scene=activeScene();
  if(scene?.player)tuneScene(scene);
}

function boot(){
  tick();
  window.setInterval(tick,350);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
