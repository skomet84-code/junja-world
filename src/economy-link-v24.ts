import './v24.css';

const SAVE_KEY='junja-world-v01';
type WalletState={linked:boolean;jcoin:number;nickname?:string;status?:string};
let wallet:WalletState={linked:false,jcoin:0};
let remoteBusy=false;

function readSave():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function fmt(n:number){return new Intl.NumberFormat('ko-KR').format(Math.max(0,Math.trunc(Number(n)||0)));}
function gameActive(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}

function createUi(){
 const top=document.querySelector<HTMLElement>('.top-bar');
 if(top&&!top.querySelector('.jw24-wallet-chip')){
  const b=document.createElement('button');b.type='button';b.className='jw24-wallet-chip';b.innerHTML='<i></i><span>J-Coin 연결</span>';b.addEventListener('click',openLink);const guide=top.querySelector('.jw15-guide-button');guide?.before(b)??top.appendChild(b);
 }
 if(!document.querySelector('.jw24-wallet-card')){const card=document.createElement('section');card.className='jw24-wallet-card hidden';card.innerHTML='<small>DUAL WALLET</small><div class="jw24-wallet-row"><span>준자월드 엽전</span><b id="jw24-gold">0 냥</b></div><div class="jw24-wallet-row jcoin"><span>준자랜드 J-Coin</span><b id="jw24-jcoin">연결 안 됨</b></div>';document.body.appendChild(card);}
 if(!document.querySelector('.jw24-link-layer')){
  const layer=document.createElement('div');layer.className='jw24-link-layer hidden';layer.innerHTML=`<section class="jw24-link-panel"><div class="jw24-link-head"><div><small>JUNJA ACCOUNT BRIDGE</small><h3>준자랜드 J-Coin 연결</h3></div><button class="jw24-link-close" type="button">×</button></div><p class="jw24-link-desc">준자월드의 <b>엽전</b>은 사냥·제작용 별도 화폐로 유지하고, 준자랜드의 현재 게임머니는 <b>J-Coin</b>으로 실시간 조회합니다. 기존 준자랜드 잔액은 이전하거나 복사하지 않습니다.</p><div class="jw24-balance-box"><div><span>준자월드 엽전</span><b id="jw24-modal-gold">0 냥</b></div><div class="jcoin"><span>준자랜드 J-Coin</span><b id="jw24-modal-jcoin">연결 안 됨</b></div></div><div id="jw24-unlinked"><form class="jw24-link-form"><label>준자랜드 아이디<input id="jw24-land-id" maxlength="20" autocomplete="username" required></label><label>준자랜드 비밀번호<input id="jw24-land-password" type="password" maxlength="72" autocomplete="current-password" required></label><button class="jw24-link-submit" type="submit">안전하게 계정 연결</button></form><p class="jw24-link-note">비밀번호는 연결 요청 순간에만 준자랜드 로그인 서버로 전달되며 준자월드에 저장하지 않습니다.</p></div><div id="jw24-linked" class="jw24-linked-box" hidden><div class="jw24-linked-user"><b id="jw24-linked-name">연결됨</b><br>준자랜드 잔액을 J-Coin으로 조회 중입니다.</div><button class="jw24-unlink" type="button">준자랜드 연결 해제</button></div><p id="jw24-link-status" class="jw24-link-status"></p><div class="jw24-safety">v2.5부터 <b>허용된 외형·펫 상점 구매</b>에서만 J-Coin 사용이 가능합니다. 결제는 준자랜드의 기존 상점 검증·거래 원장을 그대로 사용하며, 준자월드에는 임의 지급·차감·환전·이체 기능이 없습니다.</div></section>`;document.body.appendChild(layer);
  layer.querySelector('.jw24-link-close')?.addEventListener('click',closeLink);layer.addEventListener('click',e=>{if(e.target===layer)closeLink();});
  layer.querySelector<HTMLFormElement>('.jw24-link-form')?.addEventListener('submit',linkAccount);
  layer.querySelector<HTMLButtonElement>('.jw24-unlink')?.addEventListener('click',unlinkAccount);
 }
 render();
}
function openLink(){createUi();document.querySelector<HTMLElement>('.jw24-link-layer')?.classList.remove('hidden');render();}
function closeLink(){document.querySelector<HTMLElement>('.jw24-link-layer')?.classList.add('hidden');}
function status(text:string){const el=document.querySelector<HTMLElement>('#jw24-link-status');if(el)el.textContent=text;}

async function linkAccount(e:SubmitEvent){
 e.preventDefault();if(remoteBusy)return;const id=document.querySelector<HTMLInputElement>('#jw24-land-id'),pw=document.querySelector<HTMLInputElement>('#jw24-land-password'),btn=document.querySelector<HTMLButtonElement>('.jw24-link-submit');if(!id||!pw)return;
 const username=id.value.trim(),password=pw.value;if(!username||!password){status('아이디와 비밀번호를 입력해주세요.');return;}
 remoteBusy=true;if(btn)btn.disabled=true;status('준자랜드 계정을 확인하고 있습니다…');
 try{
  const r=await fetch('/api/jcoin/link',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  const d=await r.json().catch(()=>({}));pw.value='';if(!r.ok)throw new Error(d?.error||'계정 연결에 실패했습니다.');wallet={linked:true,jcoin:Number(d?.jcoin||0),nickname:String(d?.nickname||'')};status('연결 완료 · 준자랜드 잔액을 안전하게 불러왔습니다.');render();
 }catch(err:any){pw.value='';status(String(err?.message||'연결에 실패했습니다.'));}
 finally{remoteBusy=false;if(btn)btn.disabled=false;}
}
async function unlinkAccount(){
 if(remoteBusy)return;remoteBusy=true;status('연결을 해제하고 있습니다…');
 try{await fetch('/api/jcoin/unlink',{method:'POST',credentials:'same-origin'});wallet={linked:false,jcoin:0};status('준자랜드 연결을 해제했습니다. 준자랜드 본 계정에는 영향이 없습니다.');render();}
 catch{status('연결 해제 확인이 지연되고 있습니다.');}
 finally{remoteBusy=false;}
}
async function refreshRemote(silent=true){
 if(remoteBusy)return;remoteBusy=true;
 try{const r=await fetch('/api/jcoin/wallet',{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(r.ok){wallet={linked:!!d.linked,jcoin:Number(d.jcoin||0),nickname:d.nickname?String(d.nickname):undefined,status:d.status};render();}else if(!silent)status(d?.error||'J-Coin 확인에 실패했습니다.');}
 catch{if(!silent)status('준자랜드 연결 상태를 확인할 수 없습니다.');}
 finally{remoteBusy=false;}
}
function render(){
 const save=readSave(),gold=Number(save?.gold||0),active=gameActive();const card=document.querySelector<HTMLElement>('.jw24-wallet-card');card?.classList.toggle('hidden',!active);
 const g=document.querySelector<HTMLElement>('#jw24-gold'),j=document.querySelector<HTMLElement>('#jw24-jcoin'),mg=document.querySelector<HTMLElement>('#jw24-modal-gold'),mj=document.querySelector<HTMLElement>('#jw24-modal-jcoin'),chip=document.querySelector<HTMLElement>('.jw24-wallet-chip'),chipText=chip?.querySelector<HTMLElement>('span');
 if(g)g.textContent=`${fmt(gold)} 냥`;if(mg)mg.textContent=`${fmt(gold)} 냥`;if(j)j.textContent=wallet.linked?`${fmt(wallet.jcoin)} J`:'연결 안 됨';if(mj)mj.textContent=wallet.linked?`${fmt(wallet.jcoin)} J`:'연결 안 됨';if(chip){chip.classList.toggle('linked',wallet.linked);chip.style.display=active?'inline-flex':'none';}if(chipText)chipText.textContent=wallet.linked?`J ${fmt(wallet.jcoin)}`:'J-Coin 연결';
 const unlinked=document.querySelector<HTMLElement>('#jw24-unlinked'),linked=document.querySelector<HTMLElement>('#jw24-linked'),name=document.querySelector<HTMLElement>('#jw24-linked-name');if(unlinked)unlinked.hidden=wallet.linked;if(linked)linked.hidden=!wallet.linked;if(name)name.textContent=wallet.nickname?`${wallet.nickname} 계정 연결됨`:'준자랜드 계정 연결됨';
}
function tick(){createUi();render();}
function boot(){createUi();refreshRemote(true);window.setInterval(tick,1000);window.setInterval(()=>refreshRemote(true),15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshRemote(true);});window.addEventListener('keydown',e=>{if(e.key==='Escape')closeLink();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
