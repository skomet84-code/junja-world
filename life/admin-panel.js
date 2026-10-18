import {CATALOG} from './fashion-catalog.js';
const style=document.createElement('style');style.textContent=`
#junjaAdminBtn{display:none;position:fixed;top:calc(120px + env(safe-area-inset-top));right:10px;z-index:96;background:linear-gradient(120deg,#f9d878,#fff4c5);color:#513a15;border:2px solid #b89542;border-radius:18px;padding:12px 15px;font-size:16px;font-weight:900;box-shadow:0 4px 18px #0004}
#junjaAdminPanel{display:none;position:fixed;inset:0;z-index:210;background:#102b24d9;padding:calc(18px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));overflow:auto}
#junjaAdminPanel.show{display:block}
#junjaAdminBox{max-width:510px;margin:auto;background:#fffaf0;color:#294934;border:3px solid #ddbd66;border-radius:22px;padding:17px;box-shadow:0 16px 50px #0005}
#junjaAdminBox h2{margin:3px 0 12px}#junjaAdminBox input,#junjaAdminBox select{width:100%;padding:13px;border:1px solid #a8c1ae;border-radius:12px;background:white;font-size:16px;margin:5px 0 12px}
#junjaAdminBox button{border:0;border-radius:12px;background:#bfe1c5;color:#234531;font-size:15px;font-weight:800;padding:12px;margin:3px}
#junjaAdminBox #jaGiveGold,#junjaAdminBox #jaTakeGold{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;white-space:nowrap;min-width:118px;line-height:1.35;margin:8px 5px 4px 0}#junjaAdminBox .danger{background:#f4cebf}#junjaAdminBox .gold{background:#f5df96}#junjaAdminBox .quick{padding:10px 12px;background:#f1eddc}
#junjaAdminBox .group{padding:11px 0;border-top:1px solid #ddd4bc}#junjaAdminBox .muted{font-size:12px;color:#65766b}
#junjaAdminMembers{max-height:180px;overflow:auto;background:#f5f4e9;border-radius:12px;padding:6px}
#junjaAdminMembers button{display:block;width:100%;text-align:left;background:white;border:1px solid #dae3d7;margin:4px 0;font-size:13px}
`;document.head.append(style);
const btn=document.createElement('button');btn.id='junjaAdminBtn';btn.textContent='👑 관리자';document.body.append(btn);
const panel=document.createElement('div');panel.id='junjaAdminPanel';panel.innerHTML=`
<div id="junjaAdminBox">
<button id="jaClose" style="float:right">✕ 닫기</button><h2>👑 준자 관리자</h2>
<p class="muted">친구를 선택하고 바로 지급하거나 회수해. 게임 골드와 서버 지갑은 별개야.</p>
<div class="group"><strong>👥 받을 친구 선택</strong><input id="jaSearch" placeholder="아이디 또는 닉네임 검색" autocomplete="off"/><div id="junjaAdminMembers">회원 목록 불러오는 중…</div><p id="jaSelected">선택한 친구 없음</p><button id="jaSelf">👑 나에게 지급</button><button id="jaReload">↻ 목록 새로고침</button></div>
<div class="group"><strong>💰 게임 골드</strong><input id="jaGold" type="number" inputmode="numeric" min="1" placeholder="지급하거나 회수할 금액"/><div><button class="quick" data-gold="10000">1만</button><button class="quick" data-gold="100000">10만</button><button class="quick" data-gold="1000000">100만</button><button class="quick" data-gold="10000000">1000만</button></div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button class="gold" id="jaGiveGold">💰 지급</button><button class="danger" id="jaTakeGold">↩ 회수</button></div></div>
<div class="group"><strong>🎁 아이템 선물</strong><select id="jaItem"></select><button id="jaGiveItem">🎁 선택 아이템 지급</button></div>
<div class="group"><strong>⭐ 레벨 변경</strong><input id="jaLevel" type="number" inputmode="numeric" min="1" placeholder="변경할 레벨 (예: 5000)"/><button id="jaSetLevel">⭐ 레벨 적용</button></div>
<p id="jaResult" aria-live="polite">관리자 계정에서만 실행할 수 있어.</p>
<p class="muted">게임 기록 변경은 서버 저장에 반영돼. 접속 중인 친구는 로그아웃한 뒤 다시 로그인해야 해.</p>
</div>`;document.body.append(panel);
const $=id=>document.getElementById(id);let members=[],selected='';
const itemNames=CATALOG.map(x=>[x.id,({hair:'💇',outfit:'👕',accessory:'💍',pet:'🐾'}[x.type]||'🎁')+' ['+({common:'일반',fine:'고급',rare:'희귀',hero:'영웅',legend:'전설',mythic:'신화'}[x.grade]||x.grade)+'] '+x.name]);
for(const [id,name] of itemNames){const o=document.createElement('option');o.value=id;o.textContent=name;$('jaItem').append(o)}
function status(t){$('jaResult').textContent=t}
async function call(action,data){const res=await fetch('/api/account?action='+action,{method:data?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const out=await res.json().catch(()=>({}));if(!res.ok)throw Error(out.error||'서버 오류');return out}
function choose(u){selected=u.username;$('jaSelected').textContent='✅ 선택: '+u.nickname+' ('+u.username+')';$('jaSearch').value=u.nickname}
function render(){const q=$('jaSearch').value.trim().toLowerCase(),list=$('junjaAdminMembers');list.replaceChildren();const filtered=members.filter(u=>(u.username+' '+u.nickname).toLowerCase().includes(q)).slice(0,70);for(const u of filtered){const b=document.createElement('button');b.textContent=(u.role==='admin'?'👑 ':'👤 ')+u.nickname+' ('+u.username+')';b.onclick=()=>choose(u);list.append(b)}if(!filtered.length)list.textContent='검색된 회원 없음'}
async function load(){try{const r=await call('admin_users');members=r.users;render();status('회원 '+members.length+'명 불러왔어')}catch(e){status('⚠️ '+e.message)}}
btn.onclick=()=>{panel.classList.add('show');load()};$('jaClose').onclick=()=>panel.classList.remove('show');$('jaReload').onclick=load;$('jaSearch').oninput=render;$('jaSelf').onclick=()=>choose({username:'admin_junja2',nickname:'준자'});
panel.querySelectorAll('[data-gold]').forEach(b=>b.onclick=()=>{$('jaGold').value=b.dataset.gold});
async function submit(mode,value,item){if(!selected)return status('⚠️ 먼저 친구를 선택해');if(!confirm(selected+'에게 '+(mode==='coins_add'?'골드 '+value+'G 지급':mode==='coins_take'?'골드 '+value+'G 회수':mode==='level'?'레벨 '+value+' 적용':'아이템 '+item+' 지급')+'할까?'))return;try{const r=await call('admin_character',{recipient:selected,mode,value,item});status('✅ '+r.message+' · 접속 중인 캐릭터에도 잠시 후 반영돼')}catch(e){status('⚠️ '+e.message)}}
$('jaGiveGold').onclick=()=>{const n=Number($('jaGold').value);if(!Number.isSafeInteger(n)||n<1)return status('⚠️ 골드 금액을 입력해');submit('coins_add',n)};
$('jaTakeGold').onclick=()=>{const n=Number($('jaGold').value);if(!Number.isSafeInteger(n)||n<1)return status('⚠️ 골드 금액을 입력해');submit('coins_take',n)};
$('jaSetLevel').onclick=()=>{const n=Number($('jaLevel').value);if(!Number.isSafeInteger(n)||n<1||n>100000000)return status('⚠️ 올바른 레벨을 입력해');submit('level',n)};
$('jaGiveItem').onclick=()=>submit('item',0,$('jaItem').value);
window.addEventListener('village-auth',e=>{const u=e.detail;btn.style.display=u?.username==='admin_junja2'&&u?.role==='admin'?'block':'none';if(!u)panel.classList.remove('show')});
