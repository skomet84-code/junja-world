// v55 Village Arcade: virtual in-game gold only. NO fiat, deposits,
// withdrawals, conversion, paid betting, cash-out, or automatic repeated play.
// One manual turn at a time, five turns/day, fixed 100G. Percentages are
// exact, publicly displayed odds. The existing economy issuance caps apply.
import {debit,credit} from './economy-v28.js';
export const ARCADE_STAKE_V55=100,ARCADE_MAX_PLAYS_V55=5;
export const ARCADE_WHEEL_V55=Object.freeze([
 Object.freeze({min:0,max:.50,multiplier:0,label:'🍂 다음 기회에',odds:'50%'}),
 Object.freeze({min:.50,max:.80,multiplier:1,label:'🌿 본전 수호',odds:'30%'}),
 Object.freeze({min:.80,max:.96,multiplier:2,label:'🎁 행운 두 배',odds:'16%'}),
 Object.freeze({min:.96,max:1,multiplier:4,label:'👑 골드 잭팟',odds:'4%'})
]);
export function arcadeWalletV55(state,day){
 if(!state||typeof state!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))throw Error('게임장 이용 기록을 확인할 수 없어');
 if(!state.arcadeV55||state.arcadeV55.day!==day)
  state.arcadeV55={day,plays:0,wins:0,totalSpent:0,totalPaid:0};
 const a=state.arcadeV55;
 a.plays=Math.min(ARCADE_MAX_PLAYS_V55,Math.max(0,Math.floor(Number(a.plays)||0)));
 for(const k of ['wins','totalSpent','totalPaid'])a[k]=Math.max(0,Math.floor(Number(a[k])||0));
 return a;
}
export function spinVillageArcadeV55(state,{day,level=1,roll}={}){
 const wallet=arcadeWalletV55(state,day);
 if(wallet.plays>=ARCADE_MAX_PLAYS_V55)return {ok:false,error:'오늘은 다섯 번 모두 즐겼어. 내일 다시 만나요!'};
 if(!Number.isFinite(roll)||roll<0||roll>=1)return {ok:false,error:'게임장 추첨값이 올바르지 않아'};
 if(!Number.isSafeInteger(state.coins)||state.coins<ARCADE_STAKE_V55)return {ok:false,error:'게임장 참여 골드 100G가 부족해'};
 const picked=ARCADE_WHEEL_V55.find(o=>roll>=o.min&&roll<o.max);
 if(!picked)return {ok:false,error:'게임장 룰렛을 다시 돌려 줘'};
 const debitResult=debit(state,ARCADE_STAKE_V55,'arcade','마을 행운의 룰렛 1회');
 if(!debitResult.ok)return {ok:false,error:debitResult.error};
 const gross=ARCADE_STAKE_V55*picked.multiplier;
 let payout=0;
 if(gross){
  const paid=credit(state,gross,'festival','행운의 룰렛 · '+picked.label,level);
  // Nonfailure is ensured by fixed bounded payout <= 400G. For defense in
  // depth, never emit extra gold if economy refuses to pay.
  payout=paid.ok?paid.amount:0;
 }
 wallet.plays++;wallet.totalSpent+=ARCADE_STAKE_V55;
 wallet.totalPaid+=payout;if(payout>ARCADE_STAKE_V55)wallet.wins++;
 return {ok:true,label:picked.label,multiplier:picked.multiplier,
  gross,payout,net:payout-ARCADE_STAKE_V55,
  remaining:ARCADE_MAX_PLAYS_V55-wallet.plays,balance:state.coins};
}
export function drawArcadeRandomV55(){
 const array=new Uint32Array(1);
 if(!globalThis.crypto?.getRandomValues)throw Error('안전한 추첨 기능을 사용할 수 없는 브라우저야');
 globalThis.crypto.getRandomValues(array);
 return array[0]/4294967296;
}
