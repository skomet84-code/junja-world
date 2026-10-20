// v55: Small in-world arcade, virtual game gold only. No purchases for real
// money, no cash-out, no external betting, capped per-day play.
// The game economy is still client-game state, NOT a server-audited casino.
import {debit,credit} from './economy-v28.js';
export const ARCADE_RULES_V55=Object.freeze({entry:100,payout:200,winChance:45,playsPerDay:10});
const DAY=/^\d{4}-\d{2}-\d{2}$/;
export function arcadeDay(date=new Date()){
 const x=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(y=>[y.type,y.value]));
 return x.year+'-'+x.month+'-'+x.day;
}
export function arcadeStatus(state,day=arcadeDay()){
 const d=DAY.test(day)?day:arcadeDay();
 const existing=state.arcadeV55&&typeof state.arcadeV55==='object'&&!Array.isArray(state.arcadeV55)?state.arcadeV55:{};
 if(existing.day!==d)state.arcadeV55={day:d,plays:0,wins:0,spent:0,won:0,last:''};
 else{
  state.arcadeV55={...existing,day:d,plays:Math.max(0,Math.min(ARCADE_RULES_V55.playsPerDay,Math.floor(Number(existing.plays)||0))),
   wins:Math.max(0,Math.floor(Number(existing.wins)||0)),
   spent:Math.max(0,Math.floor(Number(existing.spent)||0)),
   won:Math.max(0,Math.floor(Number(existing.won)||0))};
 }
 return state.arcadeV55;
}
export function playArcade(state,{choice='sun',date=new Date(),rng=null}={}){
 if(!['sun','moon'].includes(choice))return {ok:false,error:'태양 또는 달을 선택해 줘'};
 const p=arcadeStatus(state,arcadeDay(date));
 if(p.plays>=ARCADE_RULES_V55.playsPerDay)return {ok:false,error:'오늘의 게임장 이용 횟수를 다 썼어. 내일 다시 도전해 줘'};
 if(!Number.isSafeInteger(state.coins)||state.coins<ARCADE_RULES_V55.entry)
  return {ok:false,error:'참가비 100G가 부족해'};
 const source=typeof rng==='function'?rng:()=>{
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
  return bytes[0]/4294967296;
 };
 const roll=source();
 if(!Number.isFinite(roll)||roll<0||roll>=1)return {ok:false,error:'카드 셔플이 실패했어'};
 const fee=debit(state,ARCADE_RULES_V55.entry,'arcade','달빛 게임장 · 행운의 카드',date);
 if(!fee.ok)return {ok:false,error:fee.error||'게임 참가비가 부족해'};
 const success=roll<ARCADE_RULES_V55.winChance/100;
 const payout=success?credit(state,ARCADE_RULES_V55.payout,'arcade','달빛 게임장 · 행운의 카드 당첨',1,date):null;
 p.plays++;p.spent+=ARCADE_RULES_V55.entry;
 if(success){p.wins++;p.won+=payout?.amount||0}
 p.last=choice+':'+(success?'win':'lose');
 return {ok:true,success,spent:ARCADE_RULES_V55.entry,won:payout?.amount||0,
  net:(payout?.amount||0)-ARCADE_RULES_V55.entry,plays:p.plays,
  remaining:ARCADE_RULES_V55.playsPerDay-p.plays,
  note:'가상 G만 사용 · 45% 당첨 확률 · 1회 100G · 최대 200G 보상(경제 일일 상한 적용)'};
}
