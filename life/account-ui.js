const $=id=>document.getElementById(id);
const layer=$('accountLayer'),message=$('accountMessage');
const say=t=>{message.textContent=t};
async function api(action,data){
 const res=await fetch('/api/account?action='+encodeURIComponent(action),{method:data?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 const out=await res.json().catch(()=>({error:'서버 응답 오류'}));if(!res.ok)throw Error(out.error||'요청 실패');return out;
}
async function refresh(){
 try{const r=await api('me');$('accountGuest').hidden=true;$('accountMember').hidden=false;
 $('accountIdentity').textContent='👤 '+r.user.nickname+' ('+r.user.username+')';
 $('accountBalance').textContent='서버 지갑 '+Number(r.balance).toLocaleString()+'G';
 $('accountAdmin').hidden=!(r.user.role==='admin'&&r.user.username==='admin_junja2');sessionStorage.setItem('village-auth-role',r.user.role);
 $('accountOpen').textContent='👤 '+r.user.nickname;sessionStorage.setItem('village-auth-nickname',r.user.nickname);if(sessionStorage.getItem('village-auth-user')!==r.user.username){sessionStorage.setItem('village-auth-user',r.user.username);location.reload();return}window.dispatchEvent(new CustomEvent('village-auth',{detail:r.user}));window.villageGateEnter?.(r.user);
 }catch{$('accountGuest').hidden=false;$('accountMember').hidden=true;$('accountOpen').textContent='🔐 계정 · 송금';window.dispatchEvent(new CustomEvent('village-auth',{detail:null}));window.villageGateLogout?.()}
}
$('accountOpen').onclick=()=>{layer.classList.add('show');refresh()};
$('accountClose').onclick=()=>layer.classList.remove('show');
async function action(name,body){try{const r=await api(name,body);say(r.message||'처리 완료');if(name==='logout'){sessionStorage.removeItem('village-auth-user');sessionStorage.removeItem('village-auth-nickname');sessionStorage.removeItem('village-auth-role');location.reload();return}if(name==='login'){layer.classList.remove('show');$('accountPassword').value=''}await refresh()}catch(e){say('⚠️ '+e.message)}}
$('accountRegister').onclick=()=>action('register',{username:$('accountUser').value,nickname:$('accountNick').value,password:$('accountPassword').value});
$('accountLogin').onclick=()=>action('login',{username:$('accountUser').value,password:$('accountPassword').value});
$('accountLogout').onclick=()=>action('logout',{});
$('accountTransfer').onclick=async()=>{
 const recipient=$('accountRecipient').value.trim(),amount=Number($('accountAmount').value);
 if(!recipient||!Number.isSafeInteger(amount)||amount<=0)return say('받는 친구의 닉네임과 금액을 확인해줘');
 try{
  const found=await api('resolve_recipient&nickname='+encodeURIComponent(recipient));
  if(!confirm(`받는 친구: ${found.nickname}\n송금 금액: ${amount.toLocaleString()}G\n정말 송금할까요?`))return;
  await action('transfer',{recipient:found.nickname,confirmedNickname:found.nickname,amount,key:crypto.randomUUID()});
 }catch(e){say(e.message)}
};
$('accountGrant').onclick=()=>{
 const recipient=$('accountRecipient').value.trim(),amount=Number($('accountAmount').value);
 if(!recipient||!Number.isSafeInteger(amount)||amount<=0)return say('아이디와 금액을 확인해줘');
 if(!confirm('운영자 권한으로 '+recipient+'에게 '+amount.toLocaleString()+'G 지급할까요?'))return;
 action('admin_grant',{recipient,amount,key:crypto.randomUUID()});
};
refresh();



const ownerTarget=()=>$('accountRecipient').value.trim().toLowerCase();
$('accountSelf').onclick=()=>{$('accountRecipient').value='admin_junja2';say('내 계정을 선택했어')};
$('accountUsers').onclick=async()=>{
 try{const r=await api('admin_users');const list=$('accountUserList');list.replaceChildren();for(const u of r.users){const btn=document.createElement('button');btn.type='button';btn.style.cssText='display:block;width:100%;text-align:left;font-size:13px;margin:4px 0';btn.textContent=(u.role==='admin'?'👑 ':'👤 ')+u.nickname+' ('+u.username+') · 서버 '+Number(u.balance).toLocaleString()+'G'+(u.version?' · 저장 있음':'');btn.onclick=()=>{$('accountRecipient').value=u.username;say(u.nickname+' 선택됨')};list.append(btn)}if(!r.users.length)list.textContent='회원 없음';say('회원 '+r.users.length+'명 조회 완료')}catch(e){say('⚠️ '+e.message)}
};
$('accountReclaim').onclick=()=>{
 const recipient=ownerTarget(),amount=Number($('accountAmount').value);
 if(!recipient||!Number.isSafeInteger(amount)||amount<1)return say('회수 대상과 금액을 입력해줘');
 if(confirm(recipient+' 서버 지갑에서 '+amount.toLocaleString()+'G 회수할까요?'))action('admin_reclaim',{recipient,amount,key:crypto.randomUUID()});
};
function editCharacter(mode){
 const recipient=ownerTarget(),value=Number($('accountCharacterValue').value);
 if(!recipient)return say('대상 회원을 먼저 선택해줘');
 if(!Number.isSafeInteger(value)||value<0)return say('올바른 수치를 입력해줘');
 if(mode==='level'&&value<1)return say('레벨은 1 이상');
 if(confirm(recipient+'의 '+(mode==='level'?'레벨':'게임 골드')+'을 '+value.toLocaleString()+'으로 설정할까요?'))action('admin_character',{recipient,mode,value});
}
$('accountSetCoins').onclick=()=>editCharacter('coins');
$('accountSetLevel').onclick=()=>editCharacter('level');
$('accountGiveItem').onclick=()=>{
 const recipient=ownerTarget(),item=$('accountItem').value;
 if(!recipient)return say('대상 회원을 먼저 선택해줘');
 if(confirm(recipient+'에게 '+$('accountItem').selectedOptions[0].textContent+' 지급할까요?'))action('admin_character',{recipient,mode:'item',item});
};
