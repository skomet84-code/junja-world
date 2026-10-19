// v48 independent luxury home studio; existing home upkeep/upgrade screens are retained.
// All buys and positions delegate to the game's existing save queue and spending mechanism.
import {HOME_ROOMS_V48,HOME_FURNITURE_V48,homeRoomV48,homePrestigeV48,
 normalizeHomeV48,buyHomeItemV48,arrangeHomeItemV48} from './home-interiors-v48.js';
import {mountHomeInteriorV48} from './home-room-3d-v48.js';
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);return x};
const add=(p,tag,text)=>{const x=el(tag,text);p.append(x);return x};
const gold=n=>Number(n||0).toLocaleString('ko-KR')+'G';
const btn=(text,fn,disabled=false,cls='v48-btn')=>{
 const b=el('button',text);b.type='button';b.className=cls;b.disabled=disabled;b.onclick=fn;return b;
};
export function mountHomeStudioV48(host,{getHome,getCoins,onBuy,onArrange,back}={}){
 if(!host||typeof getHome!=='function'||typeof getCoins!=='function')throw Error('주택 스튜디오 준비가 필요해요');
 let room=0,selected='sofa',scene=null,alive=true,busy=false;
 host.classList.add('v48-studio');
 function disposeScene(){scene?.dispose();scene=null}
 function render(message=''){
  if(!alive)return;
  disposeScene();host.replaceChildren();
  const home=getHome(),view=normalizeHomeV48(home),prestige=homePrestigeV48(home);
  if(room>=view.level)room=0;
  if(!view.items.includes(selected))selected=view.items[0]||'sofa';
  const data=homeRoomV48(home,room);
  add(host,'h2','🏡 나의 로열 하우스 · v48');
  add(host,'p','기존 집 레벨과 보유 가구를 이어받아 3D로 꾸미는 공간이야. 이동과 배치는 무료야.');
  const info=add(host,'section');info.className='v48-home-info';
  add(info,'strong',prestige.title+' · '+prestige.score+'점');
  add(info,'span',view.level+'단계 집 · '+view.items.length+'개 가구 · 나의 골드 '+gold(getCoins()));
  if(message){const n=add(host,'p',message);n.className='v48-message'}
  add(host,'h3','🚪 공간 선택');
  const tabs=add(host,'div');tabs.className='v48-tabs';
  for(const [i,item] of HOME_ROOMS_V48.entries()){
   tabs.append(btn(item.name+(i>=view.level?' 🔒':''),()=>{room=i;render()},i>=view.level,
    'v48-tab'+(room===i?' active':'')));
  }
  const viewport=add(host,'div');viewport.className='v48-scene';
  const hint=add(host,'p','👆 아래에서 가구를 고른 다음 실내 바닥을 누르면 배치해. 가구가 있으면 서로 자리를 교환해.');
  hint.className='v48-help';
  add(host,'h3','🎒 보유 가구 선택');
  const owned=add(host,'div');owned.className='v48-owned';
  for(const id of view.items){
   const item=HOME_FURNITURE_V48[id];
   owned.append(btn(item.icon+' '+item.name+(id===selected?' ✓':''),()=>{
    selected=id;render('선택한 가구: '+item.name)},false,'v48-item'+(id===selected?' active':'')));
  }
  add(host,'h3',data.info.name+' · 배치 공간');
  const grid=add(host,'div');grid.className='v48-grid';
  for(const slot of data.slots){
   const item=slot.data;
   grid.append(btn((item?.icon||'＋')+' '+(item?.name||'빈 자리')+' · '+(slot.slot+1)+'번',
    ()=>place(slot.slot),busy,'v48-grid-cell'));
  }
  function place(slot){
   if(busy||!alive)return;
   try{
    const change=arrangeHomeItemV48(getHome(),selected,room,slot);
    if(!change.changed)return;
    if(onArrange?.(change.next)===false)throw Error('가구 위치 저장을 완료하지 못했어');
    render('✨ 배치 저장 완료 · 기존 가구는 사라지지 않아');
   }catch(e){render('⚠️ '+e.message)}
  }
  try{scene=mountHomeInteriorV48({host:viewport,home:getHome(),room,onSlot:place})}
  catch(e){viewport.textContent='3D를 지원하지 않는 기기에서도 아래 배치 버튼으로 꾸밀 수 있어.';viewport.classList.add('fallback')}
  add(host,'h3','🏺 희귀 인테리어 · 가구 공방');
  add(host,'p','희귀/영웅/전설 가구는 골드가 더 많이 들지만, 확률 뽑기가 아니라 정가로 구입해.');
  const store=add(host,'div');store.className='v48-store';
  for(const [id,item] of Object.entries(HOME_FURNITURE_V48)){
   if(id==='sofa')continue;
   const card=add(store,'section');card.className='v48-store-item'+(item.rarity==='전설'?' legendary':'');
   add(card,'div',item.icon).className='v48-store-emoji';
   add(card,'strong',item.name);
   add(card,'small',item.rarity+' · 수집 점수 +'+item.score);
   const has=view.items.includes(id),locked=view.level<item.minHouse;
   add(card,'p',has?'보유 중':locked?item.minHouse+'단계 주택에서 해금':gold(item.cost));
   card.append(btn(has?'보유 완료':locked?'단계 해금 필요':'구매하기',()=>purchase(id),
    has||locked||item.cost>getCoins()||busy));
  }
  function purchase(id){
   if(busy||!alive)return;
   busy=true;
   try{
    const changed=buyHomeItemV48(getHome(),id,getCoins());
    if(onBuy?.(changed)===false)throw Error('기존 지갑에서 구매 비용을 차감하지 못했어');
    selected=id;busy=false;render('✨ '+changed.label+' 구매 완료 · '+gold(changed.cost)+' 지출');
   }catch(e){busy=false;render('⚠️ '+e.message)}
   finally{busy=false}
  }
  const bottom=add(host,'div');bottom.className='v48-footer';
  bottom.append(btn('🔨 집 증축·벽지·돌보기',()=>back?.()));
  bottom.append(btn('↻ 저장된 인테리어 확인',()=>render()));
 }
 function dispose(){alive=false;disposeScene();host.replaceChildren()}
 render();
 return {refresh:()=>render(),dispose};
}
