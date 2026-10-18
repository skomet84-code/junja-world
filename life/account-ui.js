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
 $('accountAdmin').hidden=r.user.role!=='admin';
 $('accountOpen').textContent='👤 '+r.user.nickname;window.villageGateEnter?.(r.user);
 }catch{$('accountGuest').hidden=false;$('accountMember').hidden=true;$('accountOpen').textContent='🔐 계정 · 송금';window.villageGateLogout?.()}
}
$('accountOpen').onclick=()=>{layer.classList.add('show');refresh()};
$('accountClose').onclick=()=>layer.classList.remove('show');
async function action(name,body){try{const r=await api(name,body);say(r.message||'처리 완료');await refresh()}catch(e){say('⚠️ '+e.message)}}
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
