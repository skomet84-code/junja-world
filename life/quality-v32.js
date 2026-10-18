// One lightweight HUD update four times per second; no network polling.
export function installQualityHUD({snapshot,onBag,onMarket,onJourney,onContext,onMap}){
 const style=document.createElement('style');style.textContent=`
 :root{--v-ink:#294c40;--v-paper:#fffbed;--v-leaf:#477961;--v-gold:#cfab63}
 .panel{border:1px solid #e4d7b8!important;background:linear-gradient(145deg,#fffdf5,#f5f2e4)!important;box-shadow:0 24px 80px #162f3860!important;color:var(--v-ink)!important}
 .panel h2{letter-spacing:-.7px}.panel p{line-height:1.65}.mini-card{border:1px solid #dce2cc!important;border-radius:18px!important;background:#ffffffa8!important}
 .panel button{min-height:42px;cursor:pointer;transition:transform .12s,filter .12s}.panel button:active,.act:active{transform:scale(.97)}
 button:focus-visible,[role=button]:focus-visible{outline:3px solid #d29c40;outline-offset:3px}button:disabled{opacity:.45;cursor:default}
 .inventory .slot{border-radius:14px;border:1px solid #dfe4d0;background:#fffdf3}.mini-progress{overflow:hidden;border-radius:12px}.mini-progress i{background:linear-gradient(90deg,#74a77b,#bbd394)!important}
 .hud.actions{gap:5px!important;border:1px solid #f9efcfb0!important;background:#fff8e9eb!important;box-shadow:0 8px 30px #213d3c33!important;backdrop-filter:blur(14px)}
 .act{color:#365a48!important}.act.primary{background:linear-gradient(145deg,#5e9175,#3b6a52)!important;color:#fff9e9!important}
 #villageCompass{position:fixed;z-index:35;bottom:calc(130px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:7px;max-width:94vw;align-items:center}
 #villageCompass button{border:1px solid #e6d6b3;border-radius:18px;padding:10px 14px;background:#fffbeded;color:#32553f;font-weight:800;box-shadow:0 3px 12px #284b3526;white-space:nowrap;min-height:42px}
 #villageCompass #nearbyAction{background:#416f57;color:#fffbe8;border-color:#8fb598;max-width:60vw;overflow:hidden;text-overflow:ellipsis}
 #bagQuick[data-full=true]{background:#ffead3;border-color:#dca16e;color:#955328}
 #villageSaveStatus{max-width:90vw!important;overflow:hidden;text-overflow:ellipsis;font-size:10px!important;padding:4px 10px!important}
 .village-loop{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.village-loop button{padding:13px 8px;border:1px solid #d3deca;border-radius:15px;background:#eef3e6;color:#37543f;font-weight:800}.village-loop small{display:block;margin-top:5px;font-weight:500}
 @media(max-width:700px){.hud.actions{width:calc(100% - 18px)!important;max-width:560px;overflow-x:auto;justify-content:flex-start!important;padding:8px!important;scrollbar-width:none}.act{flex:0 0 55px!important;min-width:55px!important}.act small{font-size:10px!important}#villageCompass{bottom:calc(121px + env(safe-area-inset-bottom))}.panel{border-radius:24px 24px 18px 18px!important}.card-grid{gap:9px!important}.quest{max-width:170px!important}}
 /* iPhone/Kakao browser: show all seven main actions instead of hiding the
    last two beyond an unscrollable, touch-action:none horizontal overflow. */
 @media(max-width:700px){
  .hud.actions{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;
   left:50%!important;right:auto!important;transform:translateX(-50%)!important;
   width:calc(100% - 14px)!important;max-width:560px!important;
   gap:3px!important;align-items:stretch!important;overflow:visible!important;padding:6px 4px!important}
  .hud.actions .act{box-sizing:border-box!important;display:grid!important;align-content:center!important;
   flex:none!important;width:100%!important;min-width:0!important;min-height:62px!important;
   padding:5px 1px!important;gap:2px!important;border-radius:13px!important}
  .hud.actions .act .em{font-size:clamp(19px,5.3vw,26px)!important;line-height:27px!important}
  .hud.actions .act small{font-size:clamp(9px,2.5vw,11px)!important;line-height:15px!important;
   white-space:nowrap!important;letter-spacing:-.5px!important}
 }
 @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
 `;document.head.append(style);
 const bar=document.createElement('div');bar.id='villageCompass';bar.innerHTML='<button id="bagQuick" type="button" aria-label="가방 용량 확인"></button><button id="nearbyAction" type="button"></button>';document.body.append(bar);
 const bag=bar.querySelector('#bagQuick'),action=bar.querySelector('#nearbyAction');let current;
 bag.onclick=onBag;action.onclick=()=>current?.context?onContext(current.context):onJourney();
 const map=document.getElementById('mapButton');map.onclick=onMap;map.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onMap()}};
 const update=()=>{current=snapshot();bar.hidden=current.busy;bar.style.display=current.busy?'none':'flex';bag.textContent='🎒 '+current.used+'/'+current.capacity;bag.dataset.full=String(current.used>=current.capacity);action.textContent=current.context?.label||'📖 다음 생활 목표';};
 update();const timer=setInterval(update,250);
 return {dispose(){clearInterval(timer);bar.remove();style.remove()}};
}
