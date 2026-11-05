// v55 weekly hunt board. Stored in the existing player hunt save, separate
// from lifetime combat mastery and from server-authenticated economy.
// Week starts Monday in Korea. No save/account reset and no time-streak gate.
export const HUNT_WEEKLY_OBJECTIVES_V55=Object.freeze([
 Object.freeze({id:'expedition',name:'원정대 토벌',key:'kills',target:45,reward:780,icon:'⚔️'}),
 Object.freeze({id:'veteran',name:'정예 추적자',key:'elites',target:10,reward:1450,icon:'✦'}),
 Object.freeze({id:'guardian',name:'수호자 사냥꾼',key:'bosses',target:2,reward:2600,icon:'👑'})
]);
export function koreaHuntWeekV55(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day)))throw Error('사냥 주간 날짜 형식이 유효하지 않아');
 const start=new Date(String(day)+'T00:00:00Z');
 if(!Number.isFinite(start.getTime())||start.toISOString().slice(0,10)!==day)throw Error('사냥 주간 날짜가 유효하지 않아');
 const offset=(start.getUTCDay()+6)%7;
 start.setUTCDate(start.getUTCDate()-offset);
 return start.toISOString().slice(0,10);
}
function safeCount(v){return Number.isSafeInteger(v)&&v>=0&&v<100000000?v:0}
export function huntWeekV55(hunt,day){
 if(!hunt||typeof hunt!=='object')throw Error('사냥 저장정보를 확인할 수 없어');
 const week=koreaHuntWeekV55(day);
 if(!hunt.weeklyV55||hunt.weeklyV55.week!==week){
  hunt.weeklyV55={week,kills:0,elites:0,bosses:0,claimed:{}};
 }
 const p=hunt.weeklyV55;
 for(const key of ['kills','elites','bosses'])p[key]=safeCount(p[key]);
 if(!p.claimed||typeof p.claimed!=='object'||Array.isArray(p.claimed))p.claimed={};
 return p;
}
export function registerHuntWeekV55(hunt,day,{boss=false,elite=false}={}){
 const week=huntWeekV55(hunt,day);
 week.kills++;
 if(boss)week.bosses++;
 if(elite)week.elites++;
 return week;
}
export function weeklyHuntChallengesV55(hunt,day){
 const week=huntWeekV55(hunt,day);
 return HUNT_WEEKLY_OBJECTIVES_V55.map(q=>({
  ...q,progress:Math.min(q.target,week[q.key]),claimed:Boolean(week.claimed[q.id]),
  ready:week[q.key]>=q.target&&!week.claimed[q.id]
 }));
}
export function claimHuntWeekV55(hunt,day,id){
 const current=weeklyHuntChallengesV55(hunt,day).find(x=>x.id===id);
 if(!current?.ready)return {ok:false,error:'완료하지 못했거나 이미 수령한 의뢰'};
 const w=huntWeekV55(hunt,day);
 w.claimed[id]=true;
 return {ok:true,reward:current.reward};
}
