import './workshop-polish-v103.css';

const grades=['','일반','고급','희귀','영웅','전설'];
const gradeClass=(tier:number)=>`jw-grade-${Math.max(1,Math.min(5,tier))}`;

function decorateWorkshop(){
  const panel=document.querySelector<HTMLElement>('#workshop-panel');
  if(!panel||panel.classList.contains('hidden'))return;
  panel.querySelectorAll<HTMLButtonElement>('.workshop-item[data-recipe]').forEach(item=>{
    const id=item.dataset.recipe||'';
    const match=id.match(/-(\d+)$/);
    const tier=match?Number(match[1]):0;
    if(!tier)return;
    item.classList.add(`jw-tier-${tier}`);
    const text=item.querySelector('span:nth-child(2)');
    if(text&&!text.querySelector('.jw-grade-badge')){
      const badge=document.createElement('span');badge.className=`jw-grade-badge ${gradeClass(tier)}`;badge.textContent=`${grades[tier]} · ${tier}단계`;text.appendChild(badge);
    }
  });
  const selected=panel.querySelector<HTMLButtonElement>('.workshop-item.selected[data-recipe]');
  const detail=panel.querySelector<HTMLElement>('.workshop-detail');
  const spec=panel.querySelector<HTMLElement>('.workshop-spec');
  if(selected&&detail&&spec){
    const match=(selected.dataset.recipe||'').match(/-(\d+)$/);const tier=match?Number(match[1]):0;
    spec.querySelector('.jw-detail-grade')?.remove();spec.querySelector('.jw-appearance-note')?.remove();
    if(tier){
      const grade=document.createElement('div');grade.className=`jw-detail-grade ${gradeClass(tier)}`;grade.textContent=`${grades[tier]} 등급 · ${tier}단계`;spec.prepend(grade);
      const note=document.createElement('div');note.className='jw-appearance-note';note.innerHTML=`<b>외형 반영:</b> 제작 완료 즉시 캐릭터 장비 레이어에 적용됩니다. ${tier>=3?'상위 등급은 전용 색상과 광택 효과가 추가됩니다.':'다음 등급 제작 시 실루엣과 색상이 강화됩니다.'}`;spec.appendChild(note);
    }
  }
}

function boot(){const panel=document.querySelector('#workshop-panel');if(!panel)return;const observer=new MutationObserver(()=>decorateWorkshop());observer.observe(panel,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});window.setInterval(decorateWorkshop,500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
