import './account-input-repair-v285.css';

function focusInput(input:HTMLInputElement){
  try{input.focus({preventScroll:true});}catch{input.focus();}
}

function repairAccountInputs(){
  const gate=document.querySelector<HTMLElement>('.jw26-account-gate');
  if(!gate||gate.classList.contains('hidden'))return;
  gate.removeAttribute('inert');
  gate.style.pointerEvents='auto';

  const inputs=[
    document.querySelector<HTMLInputElement>('#jw26-id'),
    document.querySelector<HTMLInputElement>('#jw26-password')
  ].filter((v):v is HTMLInputElement=>!!v);

  for(const input of inputs){
    input.disabled=false;
    input.readOnly=false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');
    input.tabIndex=0;
    input.style.pointerEvents='auto';
    if(input.dataset.jw285Bound==='1')continue;
    input.dataset.jw285Bound='1';

    const stop=(e:Event)=>e.stopPropagation();
    input.addEventListener('pointerdown',e=>{stop(e);window.setTimeout(()=>focusInput(input),0);});
    input.addEventListener('mousedown',stop);
    input.addEventListener('touchstart',stop,{passive:true});
    input.addEventListener('click',e=>{stop(e);focusInput(input);});
    input.addEventListener('keydown',stop);
    input.addEventListener('keyup',stop);
    input.addEventListener('keypress',stop);
    input.addEventListener('beforeinput',stop);
    input.addEventListener('input',stop);
  }

  const form=document.querySelector<HTMLFormElement>('#jw26-auth-form');
  if(form&&form.dataset.jw285Bound!=='1'){
    form.dataset.jw285Bound='1';
    form.addEventListener('pointerdown',e=>e.stopPropagation());
    form.addEventListener('click',e=>e.stopPropagation());
    form.addEventListener('keydown',e=>e.stopPropagation());
  }
}

function boot(){
  repairAccountInputs();
  const gate=document.querySelector<HTMLElement>('.jw26-account-gate');
  if(gate)new MutationObserver(repairAccountInputs).observe(gate,{attributes:true,attributeFilter:['class','style']});
  window.addEventListener('pageshow',repairAccountInputs);
  window.addEventListener('focus',repairAccountInputs);
  [150,500,1200].forEach(ms=>window.setTimeout(repairAccountInputs,ms));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
