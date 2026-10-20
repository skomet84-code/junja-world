// Cozy village hunt expansion — data-only module, no multiplayer server authority.
// All combat currency is provisional browser-local save data.
export const HUNT_ZONES=Object.freeze([
 {id:'meadow',name:'햇살 슬라임 숲',icon:'🌿',level:3,ground:0x9fcf94,fog:0xd5ebbe,sky:0xcbe8c9,tree:0x6a9d69,boss:'숲의 왕 도토로',mobs:[
  ['민트 슬라임',24,7,24,'slime',0x7fdbb4,'젤리 조각'],['솜사탕 슬라임',29,8,25,'slime',0xf4a9c6,'젤리 조각'],['버섯 꼬마',32,9,28,'mushroom',0xea997e,'버섯 포자'],['도토리 도깨비',36,10,29,'acorn',0xb18a5f,'숲의 조각'],['꽃잎 요정',40,11,31,'fairy',0xf2cb75,'빛나는 꽃잎']]},
 {id:'crystal',name:'반짝 수정동굴',icon:'💎',level:8,ground:0x839bba,fog:0x99bed4,sky:0xabc4da,tree:0x708bbd,boss:'수정 골렘 아르곤',mobs:[
  ['초롱 박쥐',60,18,43,'bat',0x8867bb,'수정 파편'],['파란 동굴 슬라임',67,20,47,'slime',0x6db6e6,'수정 파편'],['자수정 벌레',74,22,50,'beetle',0xa77bd2,'반짝 광석'],['바위 꼬마',82,24,54,'golem',0xaaa7ba,'반짝 광석'],['푸른 수정 정령',91,27,58,'fairy',0x9de6ec,'정령 결정']]},
 {id:'fairy',name:'달빛 마법의 숲',icon:'🌙',level:15,ground:0x829a9a,fog:0xaca7d7,sky:0xa9a6d2,tree:0x6a69a5,boss:'달빛 수호자 루미아',mobs:[
  ['별가루 요정',122,38,72,'fairy',0xffdca5,'달빛 가루'],['보랏빛 버섯',133,41,76,'mushroom',0x9d83cf,'달빛 가루'],['꿈꾸는 유령',145,45,82,'ghost',0xdcc8ff,'마법 꽃잎'],['그림자 도깨비',157,49,88,'acorn',0x615b95,'마법 꽃잎'],['숲의 작은 용',170,53,92,'dragon',0x84bfaf,'별빛 깃털']]},
 {id:'ruins',name:'황금 고대 유적',icon:'🏛️',level:25,ground:0xc2b796,fog:0xe2d3ae,sky:0xe1d1aa,tree:0xa78e63,boss:'태고의 수호룡 아스트라',mobs:[
  ['유적 모래병사',215,73,127,'golem',0xb5a37f,'태고의 석편'],['황금 풍뎅이',233,81,137,'beetle',0xd9ae4e,'황금 결정'],['유적의 가면',255,87,147,'ghost',0xe6c2a0,'태고의 석편'],['깨어난 수호석',275,93,157,'golem',0x8795a2,'황금 결정'],['작은 황금용',298,100,168,'dragon',0xe2b654,'용의 비늘']]},
 {id:'frost',name:'설원의 서리협곡',icon:'❄️',level:38,ground:0x9bbdc6,fog:0xb7d8e0,sky:0xd1e8ef,tree:0x7dabb5,boss:'빙결의 여왕 세이라',mobs:[
  ['눈송이 정령',345,116,178,'fairy',0xbbe9f1,'서리 가루'],['빙하 늑대',380,124,192,'wolf',0x8eaac1,'설원 털'],['얼음 박쥐',420,135,205,'bat',0x91cbe0,'서리 가루'],['서리 갑옷병',460,146,221,'golem',0x9ac0dd,'빙결 핵'],['눈보라 드래곤',495,155,235,'dragon',0xbde4f2,'빙결 핵']]},
 {id:'astral',name:'별빛 시간의 균열',icon:'🌌',level:52,ground:0x414879,fog:0x6865a2,sky:0x8886cc,tree:0x6a5ca8,boss:'시공의 군주 크로노스',mobs:[
  ['별무리 망령',540,168,255,'ghost',0xab9bdd,'시간 조각'],['차원 감시자',580,182,268,'golem',0x8a7cce,'시간 조각'],['은하의 사냥꾼',620,195,285,'wolf',0xc1b8f4,'별빛 정수'],['성운 비틀',670,206,304,'beetle',0x8f9fee,'별빛 정수'],['태초의 별룡',730,224,332,'dragon',0xe2baff,'차원의 파편']]}
].map(z=>Object.freeze({...z,mobs:Object.freeze(z.mobs.map((m,i)=>Object.freeze({id:z.id+'-'+i,name:m[0],hp:m[1],coins:m[2],xp:m[3],kind:m[4],color:m[5],material:m[6],boss:false})))})));
export const HUNT_BOSSES=Object.freeze([
 {id:'meadow-boss',zone:'meadow',name:'숲의 왕 도토로',hp:490,coins:520,xp:420,kind:'acorn',color:0xb18d63,material:'왕의 도토리',boss:true},
 {id:'crystal-boss',zone:'crystal',name:'수정 골렘 아르곤',hp:980,coins:1120,xp:780,kind:'golem',color:0xa7b2d9,material:'왕의 수정',boss:true},
 {id:'fairy-boss',zone:'fairy',name:'달빛 수호자 루미아',hp:1700,coins:2300,xp:1360,kind:'fairy',color:0xccadeb,material:'달빛 보석',boss:true},
 {id:'ruins-boss',zone:'ruins',name:'태고의 수호룡 아스트라',hp:3200,coins:5200,xp:2350,kind:'dragon',color:0xd7b363,material:'고대 용의 심장',boss:true},
 {id:'frost-boss',zone:'frost',name:'빙결의 여왕 세이라',hp:5200,coins:7500,xp:3200,kind:'fairy',color:0x98d7ee,material:'영원의 서리심장',boss:true},
 {id:'astral-boss',zone:'astral',name:'시공의 군주 크로노스',hp:8500,coins:9800,xp:4300,kind:'dragon',color:0x8973d5,material:'시간의 왕관석',boss:true}
].map(x=>Object.freeze(x)));
export const HUNT_SKILLS=Object.freeze([
 {id:'strike',name:'강타',icon:'⚡',cooldown:3,mp:12,multiplier:2.2,range:115,aoe:0,level:3},
 {id:'whirl',name:'회전 공격',icon:'🌀',cooldown:7,mp:25,multiplier:1.25,range:150,aoe:155,level:5},
 {id:'star',name:'별빛 폭발',icon:'✨',cooldown:20,mp:48,multiplier:3.7,range:220,aoe:135,level:12}
].map(x=>Object.freeze(x)));
export const HUNT_CRAFTS=Object.freeze([
 {id:'forest-look',name:'숲속 탐험 코디',icon:'🌲',requires:[['젤리 조각',12],['숲의 조각',9],['왕의 도토리',1]],coins:1500,gives:'fashion_outfit_19'},
 {id:'crystal-style',name:'수정동굴 코디',icon:'💎',requires:[['수정 파편',14],['반짝 광석',11],['왕의 수정',1]],coins:3500,gives:'fashion_outfit_22'},
 {id:'moonlight-style',name:'달빛 마법 코디',icon:'🌙',requires:[['달빛 가루',16],['마법 꽃잎',13],['달빛 보석',1]],coins:5500,gives:'fashion_outfit_24'},
 {id:'ancient-look',name:'황금 전설 코디',icon:'👑',requires:[['태고의 석편',18],['황금 결정',15],['고대 용의 심장',1]],coins:15000,gives:'fashion_outfit_31'}
].map(x=>Object.freeze({...x,requires:Object.freeze(x.requires.map(t=>Object.freeze(t)))})));
export const MAX_ACTIVE_ENEMIES=7; // 6 regular/elites + 1 boss per arena, mobile GPU safe
export function huntLevel(xp){return Math.max(1,1+Math.floor((Number(xp)||0)/160))}
export function zoneUnlocked(zone,level){return level>=zone.level}
export function combatStats(level){const lv=Math.max(1,Math.floor(level));return {maxHp:110+lv*13,maxMp:90+lv*5,attack:11+Math.floor(lv*2.2),defense:Math.floor(lv*.54)}}
export function enemyDamage(zoneIndex,boss,level){return Math.max(3,Math.floor((boss?13:7)*(1+zoneIndex*(boss?.35:.74))-Math.floor(level*.1)))}
export function canCraft(recipe,materials,owned,coins){return !owned.includes(recipe.gives)&&coins>=recipe.coins&&recipe.requires.every(([id,n])=>(materials[id]||0)>=n)}
export function dailyBossKey(zoneId,date){return zoneId+':'+date}
