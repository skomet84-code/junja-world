// Life systems: finite in-game progression, fishing tools and a safe virtual aquarium.
// No avatar movement modifiers, client-only saved state, no cash purchase.
export const RODS=Object.freeze([
 {id:'branch',name:'나뭇가지 낚싯대',level:1,price:0,wait:1,window:0,rare:0,coins:0,icon:'🪵'},
 {id:'bamboo',name:'대나무 낚싯대',level:2,price:650,wait:.9,window:.035,rare:.02,coins:.03,icon:'🎋'},
 {id:'carbon',name:'카본 바다 낚싯대',level:4,price:2400,wait:.82,window:.07,rare:.045,coins:.06,icon:'🎣'},
 {id:'silver',name:'은빛 명품 낚싯대',level:7,price:8700,wait:.72,window:.1,rare:.08,coins:.1,icon:'✨'},
 {id:'gold',name:'황금 낚싯대',level:11,price:35000,wait:.6,window:.13,rare:.12,coins:.16,icon:'👑'},
 {id:'mythic',name:'별빛 낚싯대',level:18,price:145000,wait:.5,window:.15,rare:.16,coins:.22,icon:'🌟'}
]);
export const FISH=Object.freeze([
 {name:'송사리',base:36,rarity:'일반',color:'#90b8a3',dark:'#558579',shape:'minnow',size:.75},
 {name:'붕어',base:55,rarity:'일반',color:'#c7ac70',dark:'#8c7b4d',shape:'carp',size:1},
 {name:'금붕어',base:88,rarity:'고급',color:'#f0a557',dark:'#be7040',shape:'gold',size:1},
 {name:'비단 송어',base:120,rarity:'희귀',color:'#a5b5dc',dark:'#6a7ab5',shape:'trout',size:1.2},
 {name:'은빛 농어',base:185,rarity:'영웅',color:'#bdd4db',dark:'#6a919e',shape:'bass',size:1.35},
 {name:'황금 잉어',base:600,rarity:'전설',color:'#e8c34a',dark:'#b28335',shape:'goldcarp',size:1.5}
]);
export const FISH_BY_NAME=Object.freeze(Object.fromEntries(FISH.map(f=>[f.name,f])));
export const PHRASES=Object.freeze(['안녕하세요!','같이 낚시해요 🎣','도와줄까요?','축하해요! 🎉','고마워요 💚','잠깐만요!']);
export function rodById(id){return RODS.find(r=>r.id===id)||RODS[0]}
export function fishRoll(roll,rodId){
 const bonus=rodById(rodId).rare;
 // Best gear expands rare-fish opportunities but cannot guarantee jackpot.
 const rareChance=.018+bonus*.35,heroChance=.14+bonus*.55,goodChance=.34+bonus*.6;
 return roll>1-rareChance?5:roll>1-heroChance?4:roll>1-goodChance?3:Math.min(2,Math.floor(roll*3));
}
export function rewardForFish(f,rodId,levelBonus=0){
 return Math.round(f.base*(1+rodById(rodId).coins))+levelBonus;
}
export function validRodSave(saved){const owned=['branch',...(Array.isArray(saved?.owned)?saved.owned.filter(x=>RODS.some(r=>r.id===x)):[])];const unique=[...new Set(owned)];
 return {owned:unique,equipped:unique.includes(saved?.equipped)?saved.equipped:'branch'};
}
export function aquariumSlots(level){return level>=12?12:level>=8?9:level>=5?6:3}
export function fishArt(fishName,size=140){
 const fish=FISH_BY_NAME[fishName];if(!fish)return '';
 const {color,dark,shape}=fish;
 const extra=shape==='goldcarp'||shape==='gold'?'<path d="M65 25 Q83 3 93 30" fill="'+dark+'"/><path d="M70 70 Q90 89 98 67" fill="'+dark+'"/>':shape==='bass'?'<path d="M50 28 L68 5 L89 27 Z" fill="'+dark+'"/>':'<path d="M75 24 L90 10 L105 27 Z" fill="'+dark+'"/>';
 return '<svg aria-label="'+fish.name+' 그림" role="img" viewBox="0 0 176 100" width="'+size+'" height="'+Math.round(size*.57)+'" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><linearGradient id="fish_'+shape+'" x1="0" x2="0" y1="0" y2="1"><stop stop-color="'+color+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs>'+
 '<path d="M43 50 L7 24 Q13 50 7 76 Z" fill="'+dark+'" stroke="#ffffff80" stroke-width="1.5"/>'+
 '<ellipse cx="95" cy="50" rx="'+(shape==='minnow'?50:64)+'" ry="'+(shape==='trout'?21:29)+'" fill="url(#fish_'+shape+')" stroke="'+dark+'" stroke-width="2"/>'+
 extra+'<path d="M119 45 Q137 54 119 62" fill="none" stroke="'+dark+'" stroke-width="1.7" opacity=".45"/>'+
 '<circle cx="137" cy="45" r="5.7" fill="#fffaf0"/><circle cx="139" cy="45" r="3.4" fill="#293f3e"/>'+
 '<circle cx="140" cy="43.8" r="1" fill="#fff"/><path d="M153 57 Q161 62 167 55" stroke="'+dark+'" fill="none" stroke-width="2"/>'+
 '</svg>';
}
export function dailyMissions(day,stats){
 const n=Number(String(day).replace(/\D/g,''))||1;
 const extra=[
  {id:'gather',title:'숲에서 재료 5번 채집',done:stats.gather,target:5},
  {id:'craft',title:'공방에서 제작품 2개 만들기',done:stats.craft,target:2},
  {id:'visit',title:'생활 지역 3곳 방문하기',done:stats.visit,target:3},
  {id:'fishVariety',title:'다양한 어종 2가지 낚기',done:stats.fishVariety,target:2},
  {id:'deliver',title:'교역소에 2번 납품하기',done:stats.deliver,target:2}
 ];
 return [
  {id:'fish',title:'물고기 3마리 낚기',done:stats.fish,target:3},
  {id:'harvest',title:'작물 4번 수확하기',done:stats.harvest,target:4},
  {id:'talk',title:'주민과 두 번 인사하기',done:stats.talk,target:2},
  extra[n%extra.length],extra[(n+2)%extra.length]
 ].map(m=>({...m,done:Math.min(m.target,Math.max(0,Number(m.done)||0))}));
}
export const HOME_LEVELS=Object.freeze([
 {level:1,minLevel:1,price:0,name:'오두막',rooms:1},
 {level:2,minLevel:5,price:2500,name:'따뜻한 목조 주택',rooms:2},
 {level:3,minLevel:10,price:17000,name:'정원이 있는 저택',rooms:3},
 {level:4,minLevel:18,price:90000,name:'로열 라이프 하우스',rooms:4}
]);
