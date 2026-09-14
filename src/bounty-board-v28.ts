import Phaser from 'phaser';
import './bounty-board-v28.css';

const SAVE_KEY='junja-world-v01';
type BountyType='hunt'|'craft'|'boss';
type ActiveBounty={type:BountyType;base:number;target:number;title:string;desc:string;gold:number;potions:number;crystals:number};
type BountyState={rep:number;completed:number;active:ActiveBounty|null};

function scene():any|null{
  for(const game of (((Phaser as any).GAMES||[]) as any[])){
    const direct=game?.scene?.keys?.world;if(direct?.sys?.isActive?.())return direct;
    try{const s=game?.scene?.getScene?.('world');if(s?.sys?.isActive?.())return s;}catch{}
  }
  return null;
}
function readSave(){const s=scene();if(s?.save)return s.save;try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function persist(save:any,s=scene()){
  if(!save)return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}
  if(s?.save&&s.save!==save)Object.assign(s.save,save);
}
function state(save:any):BountyState{
  if(!save.jw28Bounty||typeof save.jw28Bounty!=='object')save.jw28Bounty={rep:0,completed:0,active:null};
  save.jw28Bounty.rep=Math.max(0,Number(save.jw28Bounty.rep||0));
  save.jw28Bounty.completed=Math.max(0,Number(save.jw28Bounty.completed||0));
  if(!save.jw28Bounty.active||typeof save.jw28Bounty.active!=='object')save.jw28Bounty.active=null;
  return save.jw28Bounty as BountyState;
}
function toast(text:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=text;el.classList.remove('hidden');window.setTimeout(()=>el.classList.add('hidden'),2300);}
function stat(save:any,type:BountyType){if(type==='hunt')return Number(save.kills||0);if(type==='craft')return Number(save.crafted||0);return Array.isArray(save.bossKills)?save.bossKills.length:0;}
function rank(rep:number){if(rep>=25)return['백운성 명예대장','III'];if(rep>=10)return['숙련 현상금 사냥꾼','II'];return['초급 현상금 사냥꾼','I'];}
function offers(save:any):ActiveBounty[]{
  const level=Math.max(1,Number(save.level||1)),scale=Math.max(0,Math.floor(level/5));
  return[
    {type:'hunt',base:stat(save,'hunt'),target:10+scale*2,title:'요괴 토벌령',desc:`사냥터 요괴 ${10+scale*2}마리를 처치`,gold:500+level*35,potions:1+Math.floor(level/15),crystals:0},
    {type:'craft',base:stat(save,'craft'),target:2+Math.floor(scale/2),title:'대장장이의 발주',desc:`제작소에서 장비·물약 ${2+Math.floor(scale/2)}회 제작`,gold:650+level*40,potions:1,crystals:level>=10?1:0},
    {type:'boss',base:stat(save,'boss'),target:1,title:'마왕 현상수배',desc:'월드보스 또는 보스 1회 토벌',gold:1200+level*70,potions:2,crystals:level>=10?2:1}
  ];
}
function progress(save:any,a:ActiveBounty){return Math.max(0,stat(save,a.type)-Number(a.base||0));}
function accept(type:BountyType){const save=readSave();if(!save)return;const st=state(save);if(st.active){toast('이미 진행 중인 의뢰가 있어.');return;}const pick=offers(save).find(x=>x.type===type);if(!pick)return;st.active={...pick};persist(save);toast(`${pick.title} 수락`);render();}
function abandon(){const save=readSave();if(!save)return;const st=state(save);if(!st.active)return;if(!window.confirm('현재 현상금 의뢰를 포기할까? 진행도는 사라져.'))return;st.active=null;persist(save);toast('현상금 의뢰를 포기했어.');render();}
function claim(){const s=scene(),save=s?.save||readSave();if(!save)return;const st=state(save),a=st.active;if(!a)return;const p=progress(save,a);if(p<a.target){toast(`아직 ${a.target-p}만큼 더 진행해야 해.`);return;}save.gold=Number(save.gold||0)+a.gold;save.potions=Number(save.potions||0)+a.potions;if(!save.resources)save.resources={wood:0,herb:0,ore:0,crystal:0};save.resources.crystal=Number(save.resources.crystal||0)+a.crystals;st.rep+=a.type==='boss'?3:1;st.completed+=1;st.active=null;persist(save,s);toast(`현상금 완료 · ${a.gold.toLocaleString()}엽전 보상`);render();}
function close(){document.querySelector('#jw28-bounty-layer')?.classList.add('hidden');}
function open(){ensureUi();document.querySelector('#jw28-bounty-layer')?.classList.remove('hidden');render();}
function ensureUi(){
  if(!document.querySelector('.jw28-bounty-button')){const b=document.createElement('button');b.className='jw28-bounty-button';b.type='button';b.textContent='⚑ 현상금';b.onclick=open;document.body.appendChild(b);}
  if(document.querySelector('#jw28-bounty-layer'))return;
  const layer=document.createElement('section');layer.id='jw28-bounty-layer';layer.className='jw28-bounty-layer hidden';
  layer.innerHTML='<div class="jw28-bounty-shell"><header><div><b>백운성 현상금 게시판</b><small>반복 의뢰 · 성장 보상</small></div><button type="button" data-close>×</button></header><div class="jw28-bounty-body"></div></div>';
  layer.querySelector<HTMLButtonElement>('[data-close]')!.onclick=close;
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  document.body.appendChild(layer);
}
function rewardText(a:ActiveBounty){const parts=[`${a.gold.toLocaleString()} 엽전`];if(a.potions)parts.push(`회복약 ${a.potions}`);if(a.crystals)parts.push(`월광결정 ${a.crystals}`);return parts.join(' · ');}
function render(){
  const body=document.querySelector<HTMLElement>('.jw28-bounty-body'),save=readSave();if(!body||!save)return;const st=state(save),[rankName,rankNo]=rank(st.rep);
  let html=`<div class="jw28-rank"><div><small>현상금 등급</small><b>${rankName} ${rankNo}</b></div><span>명성 ${st.rep} · 완료 ${st.completed}</span></div>`;
  if(st.active){const a=st.active,p=Math.min(progress(save,a),a.target),pct=Math.min(100,Math.round(p/a.target*100));html+=`<div class="jw28-active"><small>진행 중</small><b>${a.title}</b><p>${a.desc}</p><div class="jw28-progress"><i style="width:${pct}%"></i></div><strong>${p} / ${a.target}</strong><em>보상 ${rewardText(a)}</em><div class="jw28-actions"><button data-claim ${p<a.target?'disabled':''}>${p>=a.target?'보상 받기':'진행 중'}</button><button data-abandon>포기</button></div></div>`;
  }else{html+=`<p class="jw28-intro">현재 레벨에 맞춰 의뢰 난이도와 보상이 자동으로 올라간다. 한 번에 하나만 받을 수 있어.</p><div class="jw28-offers">${offers(save).map(a=>`<button class="jw28-offer" data-type="${a.type}"><span>${a.type==='hunt'?'⚔':a.type==='craft'?'⚒':'♛'}</span><b>${a.title}</b><small>${a.desc}</small><em>${rewardText(a)}</em><strong>수락</strong></button>`).join('')}</div>`;}
  body.innerHTML=html;
  body.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(b=>b.onclick=()=>accept((b.dataset.type||'hunt') as BountyType));
  body.querySelector<HTMLButtonElement>('[data-claim]')?.addEventListener('click',claim);
  body.querySelector<HTMLButtonElement>('[data-abandon]')?.addEventListener('click',abandon);
}
function key(e:KeyboardEvent){const t=e.target as HTMLElement|null;if(t?.matches('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='KeyB'){e.preventDefault();const layer=document.querySelector('#jw28-bounty-layer');if(layer?.classList.contains('hidden'))open();else close();}}
function tick(){const layer=document.querySelector('#jw28-bounty-layer');if(layer&&!layer.classList.contains('hidden'))render();}
function boot(){ensureUi();window.addEventListener('keydown',key);window.setInterval(tick,850);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
