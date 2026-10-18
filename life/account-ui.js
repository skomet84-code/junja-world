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
 $('accountAdmin').hidden=r.user.role!=='admin';sessionStorage.setItem('village-auth-role',r.user.role);
 $('accountOpen').textContent='👤 '+r.user.nickname;sessionStorage.setItem('village-auth-nickname',r.user.nickname);if(sessionStorage.getItem('village-auth-user')!==r.user.username){sessionStorage.setItem('village-auth-user',r.user.username);location.reload();return}window.villageGateEnter?.(r.user);
 }catch{$('accountGuest').hidden=false;$('accountMember').hidden=true;$('accountOpen').textContent='🔐 계정 · 송금';window.villageGateLogout?.()}
}
$('accountOpen').onclick=()=>{layer.classList.add('show');refresh()};
$('accountClose').onclick=()=>layer.classList.remove('show');
async function action(name,body){try{const r=await api(name,body);say(r.message||'처리 완료');if(name==='logout'){sessionStorage.removeItem('village-auth-user');sessionStorage.removeItem('village-auth-nickname');sessionStorage.removeItem('village-auth-role');location.reload();return}await refresh()}catch(e){say('⚠️ '+e.message)}}
$('accountRegister').onclick=()=>action('register',{username:$('accountUser').value,nickname:$('accountNick').value,password:$('accountPassword').value});
$('accountLogin').onclick=()=>action('login',{username:$('accountUser').value,password:$('accountPassword').value});
$('accountLogout').onclick=()=>action('logout',{});
$('accountTransfer').onclick=()=>{
 const recipient=$('accountRecipient').value.trim(),amount=Number($('accountAmount').value);
 if(!recipient||!Number.isSafeInteger(amount)||amount<=0)return say('받는 아이디와 금액을 확인해줘');
 if(!confirm(recipient+'에게 '+amount.toLocaleString()+'G 송금할까요?'))return;
 action('transfer',{recipient,amount,key:crypto.randomUUID()});
};
$('accountGrant').onclick=()=>{
 const recipient=$('accountRecipient').value.trim(),amount=Number($('accountAmount').value);
 if(!recipient||!Number.isSafeInteger(amount)||amount<=0)return say('아이디와 금액을 확인해줘');
 if(!confirm('운영자 권한으로 '+recipient+'에게 '+amount.toLocaleString()+'G 지급할까요?'))return;
 action('admin_grant',{recipient,amount,key:crypto.randomUUID()});
};
refresh();

$('accountRestoreLegacy').onclick=async()=>{
 if(sessionStorage.getItem('village-auth-role')!=='admin')return say('운영자 계정으로 로그인해야 합니다');
 let legacy;try{legacy=JSON.parse(localStorage.getItem('junja-harbor-v1')||'null')}catch{}
 if(!legacy||typeof legacy!=='object'||(!legacy.xp&&!legacy.coins))return say('이 기기에 기존 갓준자 저장 기록이 없습니다. 이전에 사용한 기기에서 진행해 주세요.');
 if(!confirm('이 기기의 기존 캐릭터 기록을 갓준자 계정에 연결할까요? 현재 갓준자 서버 기록은 덮어쓰게 됩니다.'))return;
 try{
  const owned=JSON.parse(localStorage.getItem('junja-harbor-owned')||'[]');
  const r=await api('save',{profile:legacy,owned:Array.isArray(owned)?owned:[]});
  if(r.ok){say('기존 갓준자 기록을 연결했어요. 다시 입장합니다.');location.reload()}
 }catch(e){say('복구 실패: '+e.message)}
};
