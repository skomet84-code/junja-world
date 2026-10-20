// v50 mobile-safe account controls. Always show the result of a tap.
const $=id=>document.getElementById(id);
const layer=$('accountLayer'),message=$('accountMessage');
const loginButton=$('accountLogin'),registerButton=$('accountRegister');
const say=t=>{
 message.textContent=String(t);
 message.style.cssText='padding:10px 12px;background:#e7f0df;border:1px solid #c1d8b7;border-radius:12px;color:#214a36;white-space:pre-wrap;overflow-wrap:anywhere';
};
const userStore=(key,val)=>{
 try{if(val===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,val)}catch{}
};
const userRead=key=>{try{return sessionStorage.getItem(key)}catch{return null}};
let authBusy=false;
async function api(action,data){
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),20000);
 try{
  const res=await fetch('/api/account?action='+encodeURIComponent(action),{
   method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},
   ...(data?{body:JSON.stringify(data)}:{}),signal:abort.signal
  });
  const out=await res.json().catch(()=>({error:'서버 응답을 읽지 못했어요. 잠시 후 다시 시도해 줘.'}));
  if(!res.ok){const error=Error(out.error||'요청을 처리하지 못했어요.');error.status=res.status;throw error}
  return out;
 }catch(e){
  if(e?.name==='AbortError')throw Error('서버 응답이 20초 이상 지연됐어. 중복 가입을 피하려면 먼저 로그인으로 확인해 줘.');
  if(e instanceof TypeError)throw Error('서버 연결에 실패했어. 네트워크 상태를 확인하고 다시 시도해 줘.');
  throw e;
 }finally{clearTimeout(timer)}
}
function signOutView(){
 $('accountGuest').hidden=false;$('accountMember').hidden=true;
 $('accountOpen').textContent='🔐 계정 · 송금';
 window.dispatchEvent(new CustomEvent('village-auth',{detail:null}));
 window.villageGateLogout?.();
}
async function refresh(){
 let r;
 try{r=await api('me')}catch(e){
  signOutView();
  if(e.status!==401)say('⚠️ 로그인 상태를 확인하지 못했어: '+e.message);
  return false;
 }
 $('accountGuest').hidden=true;$('accountMember').hidden=false;
 $('accountIdentity').textContent='👤 '+r.user.nickname+' ('+r.user.username+')';
 $('accountBalance').textContent='서버 지갑 '+Number(r.balance).toLocaleString()+'G';
 $('accountAdmin').hidden=!(r.user.role==='admin'&&r.user.username==='admin_junja2');
 userStore('village-auth-role',r.user.role);
 $('accountOpen').textContent='👤 '+r.user.nickname;
 userStore('village-auth-nickname',r.user.nickname);
 if(userRead('village-auth-user')!==r.user.username){
  userStore('village-auth-user',r.user.username);
  location.reload();return true;
 }
 window.dispatchEvent(new CustomEvent('village-auth',{detail:r.user}));
 try{await window.villageGateEnter?.(r.user)}catch(e){say('⚠️ 마을 입장 중 오류: '+(e?.message||'확인 필요'))}
 return true;
}
$('accountOpen').onclick=()=>{layer.classList.add('show');void refresh()};
$('accountClose').onclick=()=>layer.classList.remove('show');
async function action(name,body){
 if(authBusy)return;
 authBusy=true;
 const current=name==='register'?registerButton:name==='login'?loginButton:null;
 const original=current?.textContent;
 loginButton.disabled=true;registerButton.disabled=true;
 if(current)current.textContent=name==='register'?'가입 처리 중…':'로그인 확인 중…';
 say(name==='register'?'⏳ 계정을 만드는 중이야. 완료 안내가 나올 때까지 기다려 줘.':
  name==='login'?'⏳ 새 Cloudflare 서버에서 로그인 정보를 확인 중이야…':'⏳ 처리 중이야…');
 try{
  const r=await api(name,body);
  if(name==='logout'){
   userStore('village-auth-user',null);
   userStore('village-auth-nickname',null);
   userStore('village-auth-role',null);
   location.reload();return;
  }
  if(name==='register'){
   say('✅ 회원가입 완료! 이제 같은 아이디·비밀번호로 로그인 버튼을 눌러 줘.');
   return;
  }
  say(r.message||'✅ 로그인 성공! 마을을 불러오는 중이야.');
  if(name==='login'){$('accountPassword').value='';layer.classList.remove('show')}
  await refresh();
 }catch(e){say('⚠️ '+e.message)}
 finally{
  authBusy=false;
  loginButton.disabled=false;registerButton.disabled=false;
  if(current)current.textContent=original;
 }
}
registerButton.onclick=()=>action('register',{
 username:$('accountUser').value.trim(),nickname:$('accountNick').value.trim(),password:$('accountPassword').value
});
loginButton.onclick=()=>action('login',{
 username:$('accountUser').value.trim(),password:$('accountPassword').value
});
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

// Flag successful completion of all account and admin control bindings.
window.__villageAccountUiLoaded=true;
