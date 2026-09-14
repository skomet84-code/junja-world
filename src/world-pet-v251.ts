import Phaser from 'phaser';

const STYLE_KEY='junja-world-v25-style';
const PETS:Record<string,{icon:string,label:string}>={
 pet_cat:{icon:'🐈',label:'카지노 캣'},
 pet_fox:{icon:'🦊',label:'루비 폭스'},
 pet_dragon:{icon:'🐉',label:'베이비 드래곤'}
};
let sceneRef:any=null;
let pet:any=null;
let petKey='';

function style():any{try{return JSON.parse(localStorage.getItem(STYLE_KEY)||'{}')||{};}catch{return {};}}
function scene():any{const games=((Phaser as any).GAMES||[]) as any[];for(let i=games.length-1;i>=0;i--){const s=games[i]?.scene?.getScene?.('world');if(s?.scene?.isActive?.())return s;}return null;}
function clear(){try{pet?.destroy?.();}catch{}pet=null;sceneRef=null;petKey='';}
function tick(){
 const s=scene(),p=s?.player,cfg=style(),key=String(cfg?.pet||'');
 if(!s||!p||!PETS[key]){if(pet)clear();return;}
 if(s!==sceneRef||key!==petKey||!pet?.active){clear();sceneRef=s;petKey=key;pet=s.add.text(p.x-34,p.y+10,PETS[key].icon,{fontSize:'22px'}).setOrigin(.5).setDepth((p.depth||20)+5);}
 const t=performance.now()/420;pet.x=p.x-34+Math.cos(t)*4;pet.y=p.y+10+Math.sin(t)*3;pet.setDepth((p.depth||20)+5);
}
window.setInterval(tick,120);
