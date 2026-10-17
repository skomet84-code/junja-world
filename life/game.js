import {createWorld} from './world3d.js';
'use strict';
(()=>{
const cv=document.getElementById('game'),c=null,mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const els=Object.fromEntries(['name','level','xp','coins','questText','questCount','questProgress','toast','hint','modal','panelBody','fishing','fishTitle','fishDesc','fishAction','gauge','needle','welcome'].map(k=>[k,document.getElementById(k)]));
let world3D=null;
const W=3600,H=2400; let CW=innerWidth,CH=innerHeight,dpr=1,scale=1,camera={x:1000,y:900},t=0,last=performance.now();
const A={};
const seedData={x:1050,y:955,dir:0,coins:800,xp:0,fish:0,hat:'none',coat:'mint',collection:[],harvest:0};
let saved={};try{saved=JSON.parse(localStorage.getItem('junja-harbor-v1')||'{}')}catch{}
const state={...seedData,...saved};state.x=Math.max(180,Math.min(W-85,state.x||1050));state.y=Math.max(180,Math.min(H-85,state.y||955));if(!Array.isArray(state.collection))state.collection=[];
if(!['spring','summer','autumn','winter'].includes(state.season))state.season='spring';
const seasonLabels={spring:'🌸 봄',summer:'🌿 여름',autumn:'🍂 가을',winter:'❄️ 겨울'};
const nowDay=()=>new Date().toLocaleDateString('en-CA');
const crops={carrot:{name:'당근',icon:'🥕',seconds:65,price:54,cost:12,color:'#df8644'},strawberry:{name:'딸기',icon:'🍓',seconds:120,price:106,cost:25,color:'#d74c61'},pumpkin:{name:'호박',icon:'🎃',seconds:220,price:210,cost:47,color:'#ebba52'},lily:{name:'별꽃',icon:'🌼',seconds:300,price:290,cost:68,color:'#f8de9a'}};
const bedCenters=[];for(let i=0;i<14;i++)bedCenters.push({x:816+i%7*79,y:1171+Math.floor(i/7)*79});
if(!Array.isArray(state.beds)||state.beds.length!==14)state.beds=bedCenters.map((_,i)=>i<3?{crop:'carrot',at:Date.now()-90000}:{crop:null,at:0});
if(!state.seeds||typeof state.seeds!=='object')state.seeds={carrot:6,strawberry:2,pumpkin:1,lily:0};
if(!Array.isArray(state.decorations))state.decorations=[];
if(!state.home)state.home={wall:'cream',floor:'oak',furniture:['sofa']};
if(!state.friends||typeof state.friends!=='object')state.friends={};
if(!state.questDay||state.questDay!==nowDay()){state.questDay=nowDay();state.dailyFish=0;state.dailyHarvest=0;state.dailyTalk=0;state.dailyReward=false;}
const decorCatalog=[{id:'flower',label:'꽃 화분',emoji:'🌷',cost:75,sz:22},{id:'lantern',label:'로맨틱 가로등',emoji:'🏮',cost:195,sz:30},{id:'bench',label:'정원 벤치',emoji:'🪑',cost:220,sz:43},{id:'birdbath',label:'새들이 오는 분수',emoji:'🕊️',cost:260,sz:34},{id:'picnic',label:'피크닉 매트',emoji:'🧺',cost:160,sz:55},{id:'topiary',label:'하트 토피어리',emoji:'🌳',cost:130,sz:38}];
const achievements=[{id:'fish1',title:'첫 낚시',condition:()=>state.fish>=1,bonus:65},{id:'fish10',title:'바다의 친구',condition:()=>state.fish>=10,bonus:250},{id:'harvest5',title:'농장의 새싹',condition:()=>state.harvest>=5,bonus:180},{id:'decorate3',title:'마을 디자이너',condition:()=>state.decorations.length>=3,bonus:260},{id:'fashion3',title:'패션 리더',condition:()=>owned.length>=5,bonus:240}];
if(!Array.isArray(state.achieved))state.achieved=[];
let selectedSeed='carrot',placeDecor=null,chatSeen=0,lastClock=-1,wetFx=0;
function checkAchievements(){let won=[];for(const a of achievements){if(!state.achieved.includes(a.id)&&a.condition()){state.achieved.push(a.id);state.coins+=a.bonus;won.push(a.title+' +'+a.bonus+'G')}}if(won.length){toast('🏅 '+won.join(' / '));save()}hud()}
function cropStage(b){if(!b?.crop)return -1;return Math.min(3,Math.floor((Date.now()-b.at)/1000/crops[b.crop].seconds*3))}
function dailyTask(){return [{title:'물고기 3마리 낚기',done:Math.min(3,state.dailyFish),target:3},{title:'작물 4번 수확하기',done:Math.min(4,state.dailyHarvest),target:4},{title:'주민과 두 번 대화하기',done:Math.min(2,state.dailyTalk),target:2}]}
function completeDaily(){if(state.dailyReward)return;const ok=dailyTask().every(q=>q.done>=q.target);if(ok){state.dailyReward=true;state.coins+=550;state.xp+=150;toast('🎉 오늘의 의뢰 완료! +550G');party(player.x,player.y-55,32);save()}hud()}
function addXp(n){state.xp+=n;hud()}

let player={x:state.x,y:state.y,vx:0,vy:0,dir:state.dir||0},path=[],goal=null,fx=[],popup=null,bite=0,fishPhase='idle',fishAttempts=0,gaugePos=0,gaugeDir=1,castUntil=0,castX=1470,castY=1290,castMode=false;
const trees=[];let rngSeed=20261;function rnd(){rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296}const rand=(a,b)=>a+rnd()*(b-a);
for(let i=0;i<115;i++){let x=rand(70,1930),y=rand(120,1580);let near=(x>420&&x<1620&&y>260&&y<1100)||(!walkable(x,y));if(near)continue;trees.push({x,y,s:rand(.72,1.26),pink:rnd()<.31,kind:rnd()<.2?'pine':'tree',phase:rnd()*6.28})}
const props=[{type:'shop',x:515,y:470,w:365,h:366,label:'🐟 바다상점'},{type:'home',x:1430,y:465,w:340,h:347,label:'🏡 우리집'},{type:'fountain',x:1010,y:695,w:276,h:270,label:'⛲ 중앙광장'},{type:'market',x:1585,y:837,w:315,h:329,label:'🎪 교역소'}];

// Animals belong to world coordinates and are independently animated and depth-sorted.
const animalFriends=[
 {id:'sora',name:'소라',species:'rabbit',x:1210,y:880,homeX:1210,homeY:880,dx:1210,dy:880,coat:'#f7f0df',shirt:'#b7a4da',mood:'오늘은 꽃향기가 정말 좋네요!',offset:0},
 {id:'choco',name:'초코',species:'bear',x:870,y:1035,homeX:870,homeY:1035,dx:870,dy:1035,coat:'#bb895f',shirt:'#79af9d',mood:'같이 딸기를 키워볼까요?',offset:1.8},
 {id:'dodo',name:'도도',species:'fox',x:1260,y:1010,homeX:1260,homeY:1010,dx:1260,dy:1010,coat:'#e7a768',shirt:'#e9c28c',mood:'바닷가에서 반짝이는 조개를 찾았어요.',offset:3.2},
 {id:'wani',name:'와니',species:'cat',x:860,y:840,homeX:860,homeY:840,dx:860,dy:840,coat:'#c8cfda',shirt:'#e6a9b7',mood:'같이 산책하자! 좋은 풍경을 알아요.',offset:4.7}
];
if(!state.animalBonds || typeof state.animalBonds!=='object')state.animalBonds={};
const companion={x:player.x-35,y:player.y+35,dir:1};
const petals=Array.from({length:46},(_,i)=>({x:(i*307+91)%W,y:(i*149+97)%H,phase:i*2.399,speed:13+(i%7)*3,sz:1.5+(i%4)*.5}));
const butterflies=Array.from({length:12},(_,i)=>({x:560+(i*137)%930,y:670+(i*113)%480,phase:i*1.9,sz:2+i%3}));
function updateAmbient(dt){
 const follow={x:player.x-48*(player.dir===1?1:player.dir===3?-1:0),y:player.y+45};
 const dist=Math.hypot(follow.x-companion.x,follow.y-companion.y);
 if(dist>500){companion.x=follow.x;companion.y=follow.y}
 else if(dist>15){const a=Math.min(dist,Math.max(0,dt*178));companion.x+=(follow.x-companion.x)/dist*a;companion.y+=(follow.y-companion.y)/dist*a;companion.dir=(follow.x>companion.x)?1:3;}
 for(const a of animalFriends){a.offset+=dt; const d=Math.hypot(a.dx-a.x,a.dy-a.y);
  if(d>3){const v=Math.min(d,dt*(22+(a.id==='dodo'?11:0)));a.x+=(a.dx-a.x)/d*v;a.y+=(a.dy-a.y)/d*v;a.travel=(a.travel||0)+v;a.moving=true}
  else {a.moving=false;if(Math.sin(a.offset*.57+a.homeX)<-.992){const nx=a.homeX+Math.cos(a.offset*4.1)*80,ny=a.homeY+Math.sin(a.offset*2.8)*65;if(walkable(nx,ny)){a.dx=nx;a.dy=ny}}}
 }
}

// v1.3: original illustrated residents are individual transparent sprites, not placeholder circles.
const VILLAGER_SPRITES={};
const VILLAGER_IMAGES={};for(const [kind,url] of Object.entries(VILLAGER_SPRITES)){const img=new Image();img.src=url;VILLAGER_IMAGES[kind]=img;}

function openSeasons(){
 const buttons=Object.entries(seasonLabels).map(([key,label])=>`<button class="pill-btn ${state.season===key?'':'ghost'}" data-season="${key}">${label}${state.season===key?' ✓':''}</button>`).join('');
 openModal(`<span class="titlebadge">LIVING SEASONS</span><h2>🌿 마을의 네 계절</h2><p>계절마다 꽃잎과 낙엽, 눈의 움직임과 햇빛이 달라져요.</p><div class="pill-row">${buttons}</div><p>마을은 그대로 유지되고 꾸미기와 농사 진행 상황도 사라지지 않아요.</p>`);
 els.panelBody.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>{state.season=b.dataset.season;save();toast(seasonLabels[state.season]+' 풍경으로 바뀌었어요');openSeasons()});
}
function openAnimal(a){const v=state.animalBonds[a.id]||{love:0,day:''};const repeat=v.day===nowDay();const heart='💗'.repeat(Math.min(5,Math.floor(v.love/2)+1));
 openModal(`<span class="titlebadge">VILLAGE NEIGHBORS</span><h2>🐾 ${a.name}와 이야기</h2><p style="font-size:14px;line-height:1.8">${a.mood}</p><h3>친밀도 ${heart}</h3><p>${repeat?'오늘 이미 인사했어요. 내일 또 만나요!':'처음 인사하면 친밀도가 오르고 작은 선물도 받아요.'}</p><button class="pill-btn" id="greetAnimal" ${repeat?'disabled':''}>🌷 ${repeat?'오늘 인사 완료':'인사하고 선물 받기'}</button>`);
 const btn=document.getElementById('greetAnimal');if(btn)btn.onclick=()=>{if(repeat)return;state.dailyTalk++;completeDaily();v.love++;v.day=nowDay();state.animalBonds[a.id]=v;state.coins+=25;addXp(8);party(a.x,a.y-60,13);toast('💗 '+a.name+'와 친해졌어요! +25G');save();hud();openAnimal(a)};
}

const npcs=[{x:1370,y:945,color:'#ffd9ba',hat:'none',coat:'rose',name:'리나',text:'어서 와요! 옷가게에서 예쁜 모자를 골라봐요.'},{x:730,y:1000,color:'#deb5a6',hat:'straw',coat:'amber',name:'토비',text:'해변으로 가면 물고기가 많이 잡혀요!'},{x:1130,y:1030,color:'#ead0af',hat:'none',coat:'blue',name:'유니',text:'준자하버의 봄날은 언제나 따뜻해요.'}];
const clickable=[{x:530,y:600,r:115,kind:'shop'},{x:1400,y:650,r:120,kind:'home'},{x:1580,y:990,r:120,kind:'market'},{x:1458,y:1165,r:150,kind:'fish'},{x:1005,y:775,r:95,kind:'fountain'}];
const outfits=[{id:'mint',name:'민트 피크닉룩',cost:0,emoji:'🌿',col:'#55b9a4',type:'coat'},{id:'blue',name:'바다 마린룩',cost:180,emoji:'🌊',col:'#54a0db',type:'coat'},{id:'rose',name:'벚꽃 산책룩',cost:260,emoji:'🌸',col:'#ed95a6',type:'coat'},{id:'amber',name:'따뜻한 가을룩',cost:320,emoji:'🍯',col:'#e3ad5f',type:'coat'},{id:'none',name:'모자 벗기',cost:0,emoji:'🧑🏻',type:'hat'},{id:'straw',name:'낚시꾼 밀짚모자',cost:150,emoji:'👒',type:'hat'},{id:'beret',name:'봄날 베레모',cost:210,emoji:'🧢',type:'hat'},{id:'crown',name:'작은 금빛 왕관',cost:450,emoji:'👑',type:'hat'}];
outfits.push(...[{id:'lavender',name:'라벤더 원피스',cost:380,emoji:'💜',col:'#a897dc',type:'coat'},{id:'coral',name:'산호빛 데이트룩',cost:450,emoji:'🧡',col:'#f0a07a',type:'coat'},{id:'navy',name:'밤바다 정장',cost:540,emoji:'🌙',col:'#375d83',type:'coat'},{id:'cream',name:'크림 니트',cost:240,emoji:'🤍',col:'#e6d5b5',type:'coat'},{id:'forest',name:'숲속 탐험룩',cost:410,emoji:'🍃',col:'#568a60',type:'coat'},{id:'pink',name:'벚꽃 드레스',cost:610,emoji:'🎀',col:'#ee9ac7',type:'coat'},{id:'flower',name:'봄꽃 밀짚모자',cost:340,emoji:'🌸',type:'hat'},{id:'navycap',name:'청량 선장 모자',cost:480,emoji:'⚓',type:'hat'},{id:'beanie',name:'카페 비니',cost:190,emoji:'🧶',type:'hat'},{id:'cat',name:'고양이 귀',cost:600,emoji:'🐈',type:'hat'},{id:'ribbon',name:'왕리본 머리띠',cost:280,emoji:'🎀',type:'hat'},{id:'captain',name:'바다의 선장 모자',cost:420,emoji:'🧢',type:'hat'}]);

outfits.push({id:'linen',name:'공방 린넨 셔츠',cost:0,emoji:'🧵',col:'#d8c7a6',type:'coat',craftOnly:true});
let owned=['mint','none'];try{const o=JSON.parse(localStorage.getItem('junja-harbor-owned')||'[]');if(Array.isArray(o))owned=[...new Set([...owned,...o])]}catch{}
function save(){state.x=player.x;state.y=player.y;state.dir=player.dir;state.savedAt=Date.now();try{localStorage.setItem('junja-harbor-v1',JSON.stringify(state));localStorage.setItem('junja-harbor-owned',JSON.stringify(owned))}catch(e){/* storage denied inside some preview browsers: keep playing */}}window.addEventListener('beforeunload',save);
// LIFE 1.5: an explorable east district and persistent, finite progression.
const expansionProps=[{type:'workshop',asset:'shop',x:2500,y:640,w:320,h:320},{type:'boutique',asset:'market',x:3100,y:740,w:320,h:335},{type:'lodge',asset:'home',x:2910,y:1740,w:340,h:347}];
const stations=[
 {id:'village',name:'중앙광장',icon:'⛲',x:1110,y:900,desc:'주민과 인사하고 생활 수첩 확인'},
 {id:'farm',name:'햇살 텃밭',icon:'🌱',x:1030,y:1350,desc:'씨앗을 심고 수확해 첫 수입 만들기'},
 {id:'pier',name:'바다 낚시터',icon:'🎣',x:1464,y:1168,desc:'입질을 기다려 타이밍 낚시'},
 {id:'home',name:'우리집',icon:'🏠',x:1390,y:645,desc:'벽지와 가구로 내 공간 꾸미기'},
 {id:'forest',name:'도토리 숲',icon:'🌳',x:2370,y:1180,desc:'나무와 들꽃 채집 · 45초 뒤 재생'},
 {id:'workshop',name:'나무결 공방',icon:'🪵',x:2500,y:800,desc:'재료를 모아 가구·납품 상자 제작'},
 {id:'boutique',name:'달빛 의상실',icon:'👒',x:3100,y:920,desc:'벌어들인 돈으로 의상·모자 구매'},
 {id:'quarry',name:'반짝 광산',icon:'⛏️',x:3200,y:1430,desc:'돌 채집 · 제작 재료 확보'},
 {id:'lodge',name:'숲속 교역소',icon:'📦',x:2910,y:1900,desc:'제작 상자 납품으로 수입 얻기'},
 {id:'garden',name:'별빛 정원',icon:'🌼',x:2470,y:2040,desc:'꽃 채집 · 원하는 곳에 장식 배치'}
];
const resourceNodes=[
 ...Array.from({length:9},(_,i)=>({id:'wood'+i,kind:'wood',x:2200+(i%3)*150,y:1100+Math.floor(i/3)*180})),
 ...Array.from({length:7},(_,i)=>({id:'stone'+i,kind:'stone',x:3020+(i%3)*155,y:1230+Math.floor(i/3)*160})),
 ...Array.from({length:8},(_,i)=>({id:'petal'+i,kind:'petal',x:2220+(i%4)*130,y:1870+Math.floor(i/4)*180}))
];
state.materials={wood:0,stone:0,petal:0,...state.materials};state.nodeReady=state.nodeReady||{};state.crafted=state.crafted||{};
state.chapter=Math.max(0,Math.min(8,Number(state.chapter)||0));state.gathered=state.gathered||0;state.craftCount=state.craftCount||0;state.deliveries=state.deliveries||0;state.visits=state.visits||{};
const recipes=[
 {id:'linen',name:'공방 린넨 셔츠',icon:'🧵',needs:{petal:12,wood:4},desc:'옷장에 추가되는 직접 만든 의상',xp:65,outfit:'linen'},
 {id:'parcel',name:'숲의 선물 상자',icon:'📦',needs:{wood:3,petal:2},desc:'교역소 납품 시 180G',xp:20},
 {id:'bench',name:'원목 벤치',icon:'🪑',needs:{wood:8,stone:2},desc:'꾸미기에서 무료 배치',xp:40},
 {id:'lantern',name:'숲길 가로등',icon:'🏮',needs:{wood:5,stone:5},desc:'꾸미기에서 무료 배치',xp:45},
 {id:'flower',name:'들꽃 화분',icon:'🌷',needs:{petal:5,stone:2},desc:'꾸미기에서 무료 배치',xp:30}
];
const materialNames={wood:'목재',stone:'돌',petal:'꽃잎'};
const chapters=[
 {title:'첫 수확의 기쁨',desc:'농사 버튼으로 텃밭에 가서 작물을 1번 수확해요.',done:()=>Math.min(1,state.harvest),total:1,station:'farm',reward:100},
 {title:'숲으로 떠나는 산책',desc:'지도로 도토리 숲에 이동하고 나무·돌·꽃을 5번 채집해요.',done:()=>Math.min(5,state.gathered),total:5,station:'forest',reward:140},
 {title:'나의 첫 제작',desc:'나무결 공방에서 목재 3개와 꽃잎 2개로 선물 상자를 만들어요.',done:()=>Math.min(1,state.craftCount),total:1,station:'workshop',reward:180},
 {title:'손으로 번 첫 수입',desc:'숲속 교역소에 만든 선물 상자 1개를 납품해요.',done:()=>Math.min(1,state.deliveries),total:1,station:'lodge',reward:200},
 {title:'나만의 스타일',desc:'달빛 의상실에서 마음에 드는 옷이나 모자를 구매해요.',done:()=>Math.min(1,owned.filter(x=>!['mint','none'].includes(x)).length),total:1,station:'boutique',reward:150},
 {title:'머물고 싶은 마을',desc:'제작하거나 구매한 장식을 마을에 3개 배치해요.',done:()=>Math.min(3,state.decorations.length),total:3,station:'garden',reward:300},
 {title:'바다의 수집가',desc:'부두에서 서로 다른 물고기를 3종 발견해요.',done:()=>Math.min(3,new Set(state.collection).size),total:3,station:'pier',reward:350},
 {title:'마을의 생활 장인',desc:'누적 5개 상자를 납품하고 집에 가구 3개를 모아봐요.',done:()=>Math.min(5,state.deliveries)+Math.min(3,state.home.furniture.length),total:8,station:'lodge',reward:600}
];
let lastJourneyUpdate=-1;
function lifeLevel(){return 1+Math.floor(state.xp/160)}
function lifeBonus(kind){
 const lv=lifeLevel();
 return kind==='gather'&&lv>=3?1:kind==='harvest'&&lv>=4?12:kind==='delivery'&&lv>=6?25:kind==='fish'&&lv>=8?15:0;
}
function lifePerkGuide(){
 const lv=lifeLevel();
 return [['Lv.3','채집 재료 +1개',3],['Lv.4','수확 수입 +12G',4],['Lv.6','교역 납품 +25G',6],['Lv.8','낚시 수입 +15G',8]].map(([label,name,need])=>'<p>'+(lv>=need?'✅':'🔒')+' '+label+' · '+name+'</p>').join('');
}
function initJourney(){
 if(!walkable(player.x,player.y)){player.x=1050;player.y=955}camera.x=player.x;camera.y=player.y;
 els.welcome.textContent='준자마을 · 작고 다정한 하루';
 els.hint.textContent='터치: 목적지 이동 · 꾹 누르고 드래그: 방향 변경';
 document.querySelector('.eyebrow').textContent='✦ 나의 생활 목표';
 const quest=document.querySelector('.quest');quest.style.cursor='pointer';quest.setAttribute('role','button');quest.tabIndex=0;quest.setAttribute('aria-label','현재 생활 목표와 이동 안내 열기');quest.onclick=openJourney;quest.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openJourney()}};
 document.getElementById('guideBtn').onclick=openJourney;document.getElementById('guideBtn').querySelector('small').textContent='성장 수첩';
 document.getElementById('mapButton').onclick=openWorldMap;document.getElementById('mapButton').onkeydown=e=>{if(e.key==='Enter')openWorldMap()};
 document.getElementById('craftBtn').onclick=()=>goStation('workshop');
 updateJourney(true);
}
function updateJourney(force=false){
 if(!force&&t-lastJourneyUpdate<.25)return;lastJourneyUpdate=t;
 const q=chapters[state.chapter];els.questText.textContent=q?(q.done()>=q.total?'🎁 보상 받기 · '+q.title:q.title):'마을 생활 장인 · 자유롭게 꾸며봐요';
 const next=document.getElementById('questNext');if(next)next.textContent=q?(q.done()>=q.total?'수첩에서 '+q.reward+'G 보상을 받아요':q.desc):'낚시·제작·꾸미기로 나만의 마을을 만들어요';
 els.questCount.textContent=q?`${q.done()} / ${q.total} · 눌러서 안내`:'8장 완료 · 일일 의뢰 도전';els.questProgress.style.width=q?`${q.done()/q.total*100}%`:'100%';
 for(const s of stations)if(distance(player,s)<140)state.visits[s.id]=true;
}
function openJourney(){
 const q=chapters[state.chapter];
 openModal(`<span class="titlebadge">MY LIFE · ${Math.min(8,state.chapter+1)} / 8</span><h2>나의 마을 생활</h2><p>수확과 채집 → 제작과 납품 → 의상과 집 꾸미기</p>${q?`<div class="mini-card"><strong>${q.title}</strong><p>${q.desc}</p><div class="mini-progress"><i style="width:${q.done()/q.total*100}%"></i></div><p>${q.done()} / ${q.total} · 보상 ${q.reward}G + 경험치 60</p><button id="journeyGo">${stations.find(s=>s.id===q.station).icon} 목적지까지 걷기</button><button id="journeyClaim" ${q.done()<q.total?'disabled':''}>보상 받고 다음 목표</button></div>`:'<div class="mini-card"><strong>🎉 생활 장인 달성!</strong><p>자유롭게 채집·제작·꾸미기를 즐기고 일일 의뢰도 도전해요.</p></div>'}<h3>나의 성장 혜택 · Lv.${lifeLevel()}</h3>${lifePerkGuide()}<h3>걸어온 길</h3>${chapters.map((c,i)=>`<p>${i<state.chapter?'✅':i===state.chapter?'▶':'▫️'} ${i+1}. ${c.title}</p>`).join('')}<div class="pill-row"><button class="pill-btn" id="journeyMap">마을 지도</button><button class="pill-btn ghost" id="journeyDaily">일일 의뢰 / 업적</button><button class="pill-btn ghost" id="journeyHelp">조작법</button></div>`);
 if(q){document.getElementById('journeyGo').onclick=()=>goStation(q.station);document.getElementById('journeyClaim').onclick=()=>{if(chapters[state.chapter]!==q||q.done()<q.total)return;state.chapter++;state.coins+=q.reward;state.xp+=60;save();hud();updateJourney(true);toast('생활 목표 완료! +'+q.reward+'G');openJourney()}}
 document.getElementById('journeyMap').onclick=openWorldMap;document.getElementById('journeyDaily').onclick=openJournal;document.getElementById('journeyHelp').onclick=guide;
}
function openWorldMap(){
 openModal(`<span class="titlebadge">JUNJA ISLAND · 3,600 × 2,400</span><h2>길 따라 만나는 마을</h2><p>장소를 누르면 길을 찾아 걸어가요. 이동 중 바닥을 누르면 목적지가 바뀝니다.</p><div class="map-overview"><span>서쪽 · 마을과 바다</span><span>동쪽 · 숲과 공방</span><div>🏠 ⛲ 🌱 🎣</div><div>🌲 🪵 👒 ⛏️ 📦</div></div><div class="card-grid">${stations.map(s=>`<div class="mini-card"><span class="emoji">${s.icon}</span><strong>${s.name}</strong><p>${s.desc}</p><button data-station="${s.id}">${state.visits[s.id]?'방문한 장소':'새로운 장소'} · 이동</button></div>`).join('')}</div>`);
 els.panelBody.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>goStation(b.dataset.station));
}
function goStation(id){const s=stations.find(s=>s.id===id);if(!s)return;closeModal();if(distance(player,s)<90){openStation(id);return}if(moveTo(s.x,s.y,{type:'station',id}))toast(s.icon+' '+s.name+'까지 걸어가요')}
function openStation(id){
 const s=stations.find(s=>s.id===id);if(!s)return;
 if(distance(player,s)>155){goStation(id);return}
 state.visits[id]=true;save();
 if(id==='workshop')return openCraft();if(id==='boutique')return openShop();if(id==='lodge')return openDelivery();if(id==='home')return openHome();if(id==='farm')return farmAll();if(id==='pier')return beginFishing();if(id==='village')return openJourney();
 toast(s.icon+' 주변 '+(id==='forest'?'나무':id==='quarry'?'바위':'꽃')+'를 터치해서 채집하세요');
}

function gather(id){const n=resourceNodes.find(n=>n.id===id);if(!n||distance(player,n)>110)return;
 const remaining=(state.nodeReady[id]||0)-Date.now();if(remaining>0){toast('다시 채집까지 '+Math.ceil(remaining/1000)+'초');return}
 state.nodeReady[id]=Date.now()+45000;const amount=2+lifeBonus('gather');state.materials[n.kind]+=amount;state.gathered++;state.xp+=8;save();hud();updateJourney(true);party(n.x,n.y-30,9);toast(materialNames[n.kind]+' +'+amount+' · 가방에 보관했어요');
}

function openDelivery(){
 openModal(`<span class="titlebadge">FOREST EXCHANGE</span><h2>숲속 교역소</h2><p>공방에서 만든 선물 상자를 납품하고 꾸미기 비용을 마련해요.</p><div class="mini-card"><span class="emoji">📦</span><strong>숲의 선물 상자 · 개당 180G</strong><p>보유 ${state.crafted.parcel||0}개 · 누적 납품 ${state.deliveries}개</p><button id="deliverParcel" ${!(state.crafted.parcel>0)?'disabled':''}>1개 납품 · 180G 받기</button></div><button class="pill-btn ghost" id="deliveryCraft">공방으로 이동</button>`);
 document.getElementById('deliverParcel').onclick=()=>{if(!(state.crafted.parcel>0))return;state.crafted.parcel--;state.deliveries++;const income=180+lifeBonus('delivery');state.coins+=income;state.xp+=25;save();hud();updateJourney(true);toast('납품 완료! +'+income+'G');openDelivery()};document.getElementById('deliveryCraft').onclick=()=>goStation('workshop');
}

function hud(){els.coins.textContent=Math.floor(state.coins).toLocaleString('ko-KR');const lv=lifeLevel();els.level.textContent='Lv.'+lv+' · '+(lv>9?'마을의 별':lv>3?'하버 주민':'새싹 주민');els.xp.style.width=((state.xp%160)/160*100)+'%';updateJourney(true)}
hud();setInterval(save,5500);
let toastTimer;function toast(s){els.toast.textContent=s;els.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200)}
function resize(){CW=innerWidth;CH=innerHeight;scale=Math.max(.62,Math.min(1,CW/620));}window.addEventListener('resize',resize);resize();

const lamps=[[650,780],[1340,780],[990,1035],[760,1100],[1450,1020],[1215,605],[740,610]];

// v1.2 integrated four-facing illustrated character sprites. Every frame uses real authored character artwork,
// not background-overlay cutouts or flat canvas circles. Source includes coat variants and transparent alpha.
const AVATAR_SPRITES={};
const AVATAR_IMAGES={};
for(const coat of Object.keys(AVATAR_SPRITES)) AVATAR_IMAGES[coat]=AVATAR_SPRITES[coat].map(b64=>{
  const img=new Image();img.src='data:image/webp;base64,'+b64;return img;
});
const AVATAR_PREVIEWS={};
for(const [coat,urls] of Object.entries(AVATAR_SPRITES)) AVATAR_PREVIEWS[coat]='data:image/webp;base64,'+urls[0];

function drawWorld(dt){if(world3D)world3D.render({state,actor:player,npcs,animals:animalFriends,time:t,dt,goal,path});}
function party(x,y,n=12){for(let i=0;i<n;i++){fx.push({x,y,v:rand(22,64),vx:rand(-56,56),life:rand(.7,1.3),total:1.3,r:rand(2,5),col:['#fff7b5','#ffe1f1','#f3f7fb','#8de3dc'][Math.floor(rand(0,4))]})}}
function walkable(x,y){
 if(world3D?.blocked(x,y))return false;
 if(x<80||x>W-80||y<120||y>H-80)return false;
 // Original harbor coast stays at its authored size; the east trail exits at y=720..1060.
 if(x<2000){
  if(y>1220&&x<455)return false;
  if(y>1140&&x>1575)return false;
  if(y>1390&&x>1365)return false;
  if(y>1460&&x<580)return false;
  if(y>1570)return false;
 }
 if(x>=1920&&x<=2080&&(y<720||y>1060))return false;
 for(const b of [[515,470,178,118],[1430,465,168,123],[1585,837,148,93],[1010,695,95,88],[2500,640,165,108],[3100,740,170,110],[2910,1740,185,105]]){
  if(Math.abs(x-b[0])<b[2]&&Math.abs(y-b[1])<b[3])return false;
 }
 return true;
}
const navigation=JunjaNavigation({width:W,height:H,walkable});
function pathfind(from,to){return navigation.route(from,to)}
function stopWalking(){path=[];goal=null;popup=null;player.vx=player.vy=0;}
function moveTo(x,y,arrival,quiet=false){
 if(fishPhase!=='idle')fishFailure('이동하여 낚시를 마쳤어요');
 const way=pathfind(player,{x,y});if(!way.length){stopWalking();if(!quiet)toast('길이 막혀 있어요. 가까운 길을 선택해주세요');return false}
 path=way;goal={...way[way.length-1]};popup=arrival||null;els.hint.classList.add('hidden');return true;
}
function arrive(){const p=popup;popup=null;goal=null;player.vx=player.vy=0;if(!p)return;
 if(p.type==='action')interaction(p.kind);
 if(p.type==='farm')farmAt(p.idx);
 if(p.type==='npc')openNpc(p.npc);
 if(p.type==='animal'){const a=animalFriends.find(v=>v.id===p.animalId);if(a)openAnimal(a)}
 if(p.type==='station')openStation(p.id);
 if(p.type==='gather')gather(p.id);
}
// Optional LAN / server-hosted friends. The static downloadable preview remains a real offline game.
const peers={},chatHistory=[];
let socialSocket=null,socialRoom='SPRING',socialId=null,lastPositionSent=0,retryCount=0;
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function socialSend(o){if(socialSocket?.readyState===1)socialSocket.send(JSON.stringify(o))}
function updateSocialBadge(){const b=document.getElementById('socialStatus');if(!b)return;b.textContent=socialSocket?.readyState===1&&socialId?'🟢 친구 '+(Object.keys(peers).length+1)+'명 · '+socialRoom:'👫 친구 · 오프라인';}
function openSocial(){const connected=socialSocket?.readyState===1&&socialId;const url=(location.origin==='null'?null:location.origin)+'/?room='+encodeURIComponent(socialRoom);
 const chats=chatHistory.slice(-15).map(c=>`<p style="border-bottom:1px solid #e4dccb;padding:7px 0"><b>${esc(c.nick)}:</b> ${esc(c.text)}</p>`).join('');
 openModal(`<span class="titlebadge">VILLAGE FRIENDS</span><h2>👫 친구들과 함께</h2><p>${connected?'🟢 실시간 접속 중 · '+socialRoom+' 방':'⚪ 오프라인 체험 모드'}</p>${connected?`<div class="mini-card"><strong>초대 링크</strong><p style="overflow-wrap:anywhere">${esc(url)}</p><button id="copyInvite">🔗 초대 링크 복사</button></div>`:'<p>온라인 친구 방문은 멀티플레이 서버에서 접속했을 때 사용 가능해요. 지금은 혼자 플레이하는 미리보기입니다.</p>'}<h3>💬 마을 채팅</h3><div id="chatLog" style="min-height:90px;max-height:170px;overflow:auto">${chats||'<p>친구와 만나면 이곳에 메시지가 보여요.</p>'}</div>${connected?`<div style="display:flex;gap:6px"><input id="chatInput" maxlength="120" placeholder="친구에게 인사하기" style="min-width:0;flex:1;border-radius:12px;padding:10px;border:1px solid #d8c7a7"><button class="pill-btn" id="chatSend">보내기</button></div>`:''}<div class="pill-row"><button class="pill-btn ghost" id="roomPlayers">접속자 ${Object.keys(peers).length+Number(Boolean(connected))}명</button></div>`);
 const copy=document.getElementById('copyInvite');if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('🔗 초대 링크 복사 완료')}catch{toast('주소창 링크를 친구에게 보내주세요')}};
 const sendBtn=document.getElementById('chatSend');if(sendBtn)sendBtn.onclick=()=>{const input=document.getElementById('chatInput'),text=input?.value.trim();if(!text)return;socialSend({type:'chat',text});chatHistory.push({nick:'나',text});input.value='';openSocial()};const inp=document.getElementById('chatInput');if(inp)inp.addEventListener('keydown',e=>{if(e.key==='Enter')sendBtn.click()});
 document.getElementById('roomPlayers').onclick=()=>{toast(connected?'👫 같은 마을 친구 '+(Object.keys(peers).length+1)+'명':'🌿 서버 연결 전에는 혼자 플레이합니다')};
}
function connectSocial(){if(!document.querySelector('meta[name="junja-relay"][content="yes"]')){updateSocialBadge();return}
 socialRoom=(new URLSearchParams(location.search).get('room')||'SPRING').toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,12)||'SPRING';
 try{socialSocket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');socialSocket.addEventListener('open',()=>{socialId=null;retryCount=0;socialSend({type:'join',room:socialRoom,nick:'갓준자',x:player.x,y:player.y,coat:state.coat,hat:state.hat,dir:player.dir});updateSocialBadge()});
 socialSocket.addEventListener('message',e=>{let msg;try{msg=JSON.parse(e.data)}catch{return}if(msg.type==='welcome'){socialId=msg.id;for(const id of Object.keys(peers))delete peers[id];for(const o of msg.players||[])peers[o.id]={...o,targetX:o.x,targetY:o.y};toast('👫 '+socialRoom+' 마을에 접속했어요');updateSocialBadge()}else if(msg.type==='join'){const o=msg.player;if(o&&o.id!==socialId){peers[o.id]={...o,targetX:o.x,targetY:o.y};toast('🌸 '+o.nick+'님이 놀러왔어요!');updateSocialBadge()}}else if(msg.type==='pos'&&peers[msg.id]){Object.assign(peers[msg.id],{targetX:msg.x,targetY:msg.y,dir:msg.dir,coat:msg.coat,hat:msg.hat})}else if(msg.type==='leave'){delete peers[msg.id];updateSocialBadge()}else if(msg.type==='chat'){chatHistory.push({nick:msg.nick,text:msg.text});if(chatHistory.length>40)chatHistory.shift();toast('💬 '+msg.nick+': '+msg.text.slice(0,25));if(document.getElementById('chatLog'))openSocial()}else if(msg.type==='error'){toast('⚠️ '+msg.message)}});
 socialSocket.addEventListener('close',()=>{socialId=null;for(const id of Object.keys(peers))delete peers[id];updateSocialBadge();if(retryCount++<6)setTimeout(connectSocial,Math.min(16000,2000*retryCount))});
 socialSocket.addEventListener('error',()=>{updateSocialBadge()});
 }catch{updateSocialBadge()}}

function farmAt(i){if(i<0||i>=state.beds.length)return;const b=state.beds[i],stage=cropStage(b);if(b.crop&&stage>=3){let o=crops[b.crop];state.beds[i]={crop:null,at:0};const income=o.price+lifeBonus('harvest');state.coins+=income;state.harvest++;state.dailyHarvest++;addXp(16);party(bedCenters[i].x,bedCenters[i].y,18);toast(o.icon+' '+o.name+' 수확! +'+income+'G');save();completeDaily();checkAchievements();return}
 const cards=Object.entries(crops).map(([k,v])=>`<div class="mini-card"><span class="emoji">${v.icon}</span><strong>${v.name}</strong><p>성장 ${v.seconds}초 · 수확 ${v.price}G</p><p>보유 씨앗 ${state.seeds[k]||0}개</p><button data-seed="${k}">${state.seeds[k]>0?'씨앗 선택 · 심기':'씨앗 부족'}</button></div>`).join('');
 if(b.crop){const q=crops[b.crop];let progress=Math.min(100,Math.round((Date.now()-b.at)/(q.seconds*1000)*100));openModal(`<span class="titlebadge">FARMING</span><h2>🌿 작물이 자라고 있어요</h2><p>${q.icon} ${q.name} · 자라는 중 (${progress}%)</p><div class="mini-progress"><i style="width:${progress}%"></i></div><p>남은 시간 ${Math.max(0,Math.ceil(q.seconds-(Date.now()-b.at)/1000))}초. 게임을 종료해도 자라요.</p><button class="pill-btn" id="farmClose">확인</button>`);document.getElementById('farmClose').onclick=closeModal;return}
 openModal(`<span class="titlebadge">FARMING</span><h2>🌱 씨앗을 심을까요?</h2><p>씨앗을 선택하면 즉시 심어요.</p><div class="card-grid">${cards}</div><button class="pill-btn ghost" id="buySeedLink">씨앗 상점 열기</button>`);els.panelBody.querySelectorAll('[data-seed]').forEach(btn=>btn.onclick=()=>{const type=btn.dataset.seed;if(!(state.seeds[type]>0)){toast('씨앗이 부족해요. 상점에서 구매해요');return}state.seeds[type]--;state.beds[i]={crop:type,at:Date.now()};addXp(4);closeModal();toast('🌱 '+crops[type].name+' 심기 완료!');party(bedCenters[i].x,bedCenters[i].y,8);save()});document.getElementById('buySeedLink').onclick=openFarmShop;
}
function farmAll(){let p=bedCenters.findIndex((_,i)=>state.beds[i].crop&&cropStage(state.beds[i])===3);if(p>=0){moveTo(bedCenters[p].x,bedCenters[p].y+56,{type:'farm',idx:p});toast('🌿 수확할 밭으로 이동해요');return}const v=bedCenters.findIndex((_,i)=>!state.beds[i].crop);if(v>=0){moveTo(bedCenters[v].x,bedCenters[v].y+56,{type:'farm',idx:v});toast('🌱 빈 밭으로 이동해요');return}openFarmShop()}
function openFarmShop(){let cards=Object.entries(crops).map(([k,o])=>`<div class="mini-card"><span class="emoji">${o.icon}</span><strong>${o.name} 씨앗 3개</strong><p>${(o.cost*3)}G · 재고 ${state.seeds[k]||0}개</p><button data-buyseed="${k}">🪙 ${o.cost*3}G에 구매</button></div>`).join('');openModal(`<span class="titlebadge">SEED MARKET</span><h2>🌱 봄날 씨앗 상점</h2><p>구매한 씨앗을 밭에 직접 심을 수 있어요.</p><div class="card-grid">${cards}</div>`);els.panelBody.querySelectorAll('[data-buyseed]').forEach(btn=>btn.onclick=()=>{const o=crops[btn.dataset.buyseed],cost=o.cost*3;if(state.coins<cost){toast('코인이 부족해요');return}state.coins-=cost;state.seeds[btn.dataset.buyseed]=(state.seeds[btn.dataset.buyseed]||0)+3;hud();save();openFarmShop();toast('🌱 '+o.name+' 씨앗 3개 구매')})}
function openMarket(){const fishCount=state.collection.length,uniq=new Set(state.collection).size;openModal(`<span class="titlebadge">HARBOR EXCHANGE</span><h2>⚓ 준자 교역소</h2><p>축제 시장에서 오늘의 특별 납품을 완료해보세요.</p><div class="mini-card"><strong>🐟 물고기 수집 도감</strong><p>잡은 물고기 총 ${state.fish}마리 · 발견 어종 ${uniq}/6</p><button id="marketBag">수집 가방 열기</button></div><div class="mini-card" style="margin-top:10px"><strong>🎁 오늘의 마을 의뢰</strong>${dailyTask().map(o=>`<p>${o.done>=o.target?'✅':'▫️'} ${o.title} ${o.done}/${o.target}</p>`).join('')}<p>전부 완료하면 550G + 경험치 150 획득</p></div>`);document.getElementById('marketBag').onclick=openBag}
function openNpc(npc){state.friends[npc.name]=state.friends[npc.name]||0;state.talkDays=state.talkDays||{};state.friendBondDay=state.friendBondDay||{};if(state.talkDays[npc.name]!==nowDay()){state.talkDays[npc.name]=nowDay();state.dailyTalk++;addXp(3)}let heart=state.friends[npc.name];completeDaily();openModal(`<span class="titlebadge">VILLAGER</span><h2>💗 ${npc.name}와 대화하기</h2><p>${npc.text}</p><h3>친밀도 ${'💗'.repeat(Math.min(5,Math.floor(heart/2)+1))}</h3><p>친밀도 ${heart} · 이야기를 나누거나 선물을 줄 수 있어요.</p><div class="pill-row"><button class="pill-btn" id="friendTalk">이야기 나누기</button><button class="pill-btn alt" id="friendGift">🎁 꽃 선물하기 (50G)</button></div>`);document.getElementById('friendTalk').onclick=()=>{if(state.friendBondDay[npc.name]===nowDay()){toast(npc.name+'와 오늘의 대화는 마쳤어요. 내일 또 인사해요!');return}state.friendBondDay[npc.name]=nowDay();const texts=['마을 바람이 정말 상쾌해요!','오늘은 좋은 일이 생길 것 같은데요?','부두 근처에 희귀한 물고기가 있대요.','새로운 옷을 입고 오셨군요!'];state.friends[npc.name]++;toast('💞 '+npc.name+': '+texts[Math.floor(Math.random()*texts.length)]);save();openNpc(npc)};document.getElementById('friendGift').onclick=()=>{if(state.coins<50){toast('코인이 부족해요');return}state.coins-=50;state.friends[npc.name]+=2;hud();party(npc.x,npc.y-80,12);toast('💝 '+npc.name+'가 정말 기뻐해요!');save();openNpc(npc)}}
function openDecor(){const cards=decorCatalog.map(o=>`<div class="mini-card"><span class="emoji">${o.emoji}</span><strong>${o.label}</strong><p>${state.crafted[o.id]>0?'제작품 '+state.crafted[o.id]+'개 · 무료 배치':'🪙 '+o.cost+'G · 구매 배치'}</p><button data-decor="${o.id}">배치하기</button></div>`).join('');openModal(`<span class="titlebadge">GARDEN ATELIER</span><h2>🏡 내 마을 꾸미기</h2><p>장식을 선택하고, 마을의 원하는 빈 바닥을 터치해 배치해요.</p><div class="card-grid">${cards}</div><div class="pill-row"><button class="pill-btn ghost" id="removeDecoration">설치된 장식 회수하기</button><button class="pill-btn ghost" id="openHomeLink">내 집 꾸미기</button></div>`);els.panelBody.querySelectorAll('[data-decor]').forEach(btn=>btn.onclick=()=>{placeDecor=btn.dataset.decor;closeModal();toast('👆 비어 있는 바닥을 터치해 배치해요!');els.hint.textContent='장식 배치 모드 · 바닥 터치 / 취소는 꾸미기 버튼';els.hint.classList.remove('hidden')});document.getElementById('removeDecoration').onclick=()=>{placeDecor='remove';closeModal();toast('원래 설치한 장식을 터치하면 회수해요!')};document.getElementById('openHomeLink').onclick=openHome}
function placeAt(x,y){if(placeDecor==='remove'){const i=state.decorations.findIndex(o=>Math.hypot(o.x-x,o.y-y)<70);if(i<0){toast('회수할 장식을 터치해주세요');return}let old=state.decorations.splice(i,1)[0],v=decorCatalog.find(a=>a.id===old.id);state.coins+=Math.floor((v?.cost||0)*.4);placeDecor=null;toast('📦 장식 회수 완료 · 일부 코인 환급');hud();save();return}
 const o=decorCatalog.find(v=>v.id===placeDecor);if(!o)return; if(!walkable(x,y)||Math.hypot(player.x-x,player.y-y)<40||[...props,...expansionProps].some(p=>Math.hypot(p.x-x,p.y-y)<185)||state.decorations.some(p=>Math.hypot(p.x-x,p.y-y)<48)){toast('여기에는 배치할 수 없어요');return}if(!(state.crafted[o.id]>0)&&state.coins<o.cost){toast('코인이 부족해요');placeDecor=null;return}if(state.crafted[o.id]>0)state.crafted[o.id]--;else state.coins-=o.cost;state.decorations.push({id:o.id,x:Math.round(x),y:Math.round(y)});placeDecor=null;els.hint.classList.add('hidden');hud();save();party(x,y-10,22);checkAchievements();toast('🏡 '+o.label+' 설치 완료!')}
function openHome(){const opts=[['cream','크림 벽지','🤍'],['blue','바다빛 벽지','🌊'],['pink','봄꽃 벽지','🌷'],['gold','로열 벽지','👑']];let wallColor={cream:'#f8edd5',blue:'#c5e5ee',pink:'#f6d7e1',gold:'#e2c486'}[state.home.wall]||'#f8edd5';openModal(`<span class="titlebadge">MY HOME</span><h2>🏠 나만의 작은 집</h2><p>따뜻한 공간에 벽지와 가구를 모아봐요.</p><div style="position:relative;border:9px solid #c29a6d;border-bottom:32px solid #b18757;border-radius:12px;height:175px;background:${wallColor};box-shadow:inset 0 14px 33px #0001;text-align:center;display:flex;align-items:center;justify-content:space-evenly;font-size:42px">${(state.home.furniture||[]).map(id=>({sofa:'🛋️',table:'🪑',lamp:'🪔',plant:'🪴',cat:'🐈',piano:'🎹'}[id]||'🌷')).join('')}</div><h3>🎨 벽지 선택</h3><div class="pill-row">${opts.map(([k,label,emoji])=>`<button class="pill-btn ${state.home.wall===k?'':'ghost'}" data-wall="${k}">${emoji} ${label}</button>`).join('')}</div><h3>🪑 가구 구매</h3><div class="pill-row">${[['table','식탁','🪑',150],['lamp','조명','🪔',240],['plant','화분','🪴',120],['cat','고양이 인형','🐈',380],['piano','피아노','🎹',850]].map(([id,label,emoji,price])=>`<button class="pill-btn alt" data-furn="${id}">${emoji} ${label} ${price}G</button>`).join('')}</div>`);els.panelBody.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{state.home.wall=b.dataset.wall;save();openHome()});els.panelBody.querySelectorAll('[data-furn]').forEach(b=>b.onclick=()=>{const item=b.dataset.furn,price=Number(b.textContent.match(/(\d+)G/)?.[1]||0);if(state.coins<price){toast('코인이 부족해요');return}if(state.home.furniture.includes(item)){toast('이미 가지고 있는 가구예요');return}state.coins-=price;state.home.furniture.push(item);hud();save();openHome()})}
function openCraft(){
 if(distance(player,stations.find(s=>s.id==='workshop'))>155){goStation('workshop');return}
 openModal(`<span class="titlebadge">WOODLAND WORKSHOP</span><h2>나무결 공방</h2><p>숲과 광산에서 모은 재료로 만들어보세요.</p><div class="pill-row">${Object.entries(state.materials).map(([k,v])=>`<span class="titlebadge">${materialNames[k]} ${v}</span>`).join('')}</div><div class="card-grid">${recipes.map(r=>`<div class="mini-card"><span class="emoji">${r.icon}</span><strong>${r.name}</strong><p>${r.desc}</p><p>${Object.entries(r.needs).map(([k,v])=>materialNames[k]+' '+state.materials[k]+'/'+v).join(' · ')}</p><button data-recipe="${r.id}" ${(!r.outfit||!owned.includes(r.outfit))&&Object.entries(r.needs).every(([k,v])=>state.materials[k]>=v)?'':'disabled'}>${r.outfit&&owned.includes(r.outfit)?'제작 완료 · 옷장 보유':'제작 · 경험치 '+r.xp}</button></div>`).join('')}</div><button class="pill-btn ghost" id="craftMap">재료 채집하러 가기</button>`);
 els.panelBody.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{const r=recipes.find(r=>r.id===b.dataset.recipe);if(!r||(r.outfit&&owned.includes(r.outfit))||!Object.entries(r.needs).every(([k,v])=>state.materials[k]>=v))return;for(const [k,v] of Object.entries(r.needs))state.materials[k]-=v;if(r.outfit){owned.push(r.outfit)}else state.crafted[r.id]=(state.crafted[r.id]||0)+1;state.craftCount++;state.xp+=r.xp;save();hud();updateJourney(true);toast(r.name+' 제작 완료!');openCraft()});document.getElementById('craftMap').onclick=openWorldMap;
}
function openJournal(){const tasks=dailyTask();const a=achievements.map(b=>`<p>${state.achieved.includes(b.id)?'✅':'▫️'} ${b.title} · ${b.bonus}G</p>`).join('');openModal(`<span class="titlebadge">JUNJA LIFE</span><h2>📖 마을 생활 수첩</h2><h3>오늘의 의뢰</h3>${tasks.map(o=>`<p>${o.done>=o.target?'✅':'▫️'} ${o.title} (${o.done}/${o.target})</p><div class="mini-progress"><i style="width:${o.done/o.target*100}%"></i></div>`).join('')}<p>${state.dailyReward?'✨ 오늘의 보상 수령 완료':'🎁 모두 완료하면 550G + 경험치 150'}</p><h3>🏅 업적</h3>${a}<p class="item-note">접속 기기 브라우저에 자동 저장됩니다. 온라인 계정 연동은 추후 서버 배포가 필요합니다.</p>`)}
function interaction(kind){if(kind==='seeds'){openFarmShop();return}if(kind.startsWith('farm:')){farmAt(Number(kind.split(':')[1]));return}if(kind==='shop'){openShop();return}if(kind==='fish'){beginFishing();return}if(kind==='market'){openMarket();return}if(kind==='fountain'){party(player.x,player.y-50,20);if(!state.fountainDate||state.fountainDate!==nowDay()){state.coins+=35;state.fountainDate=nowDay();toast('⛲ 오늘의 소원! +35G')}else toast('⛲ 반짝이는 행운의 분수');hud();save();return}if(kind==='home'){openHome();return}if(kind==='harvest'){farmAll();return}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function handleTap(sx,sy){
 const {x,y}=screenWorld(sx,sy);if(placeDecor){placeAt(x,y);return}
 const hit=world3D?.pick(sx,sy);
 if(hit){
  if(hit.type==='gather'){const n=resourceNodes.find(n=>n.id===hit.id);if(distance(player,n)<100)gather(n.id);else moveTo(n.x,n.y+48,{type:'gather',id:n.id});return}
  if(hit.type==='farm'){const b=bedCenters[hit.idx];if(distance(player,b)<130)farmAt(hit.idx);else moveTo(b.x,b.y+45,{type:'farm',idx:hit.idx});return}
  if(hit.type==='npc'){const n=npcs[hit.index];if(distance(player,n)<115)openNpc(n);else moveTo(n.x-55,n.y+35,{type:'npc',npc:n});return}
  if(hit.type==='animal'){const a=animalFriends.find(n=>n.id===hit.id);if(distance(player,a)<132)openAnimal(a);else moveTo(a.x,a.y+45,{type:'animal',animalId:a.id});return}
  if(hit.type==='station'){if(hit.id==='shop'){if(distance(player,{x:610,y:608})<140)openShop();else moveTo(610,608,{type:'action',kind:'shop'});return}if(hit.id==='seeds'){if(distance(player,{x:1490,y:1020})<150)openFarmShop();else moveTo(1490,1020,{type:'action',kind:'seeds'});return}goStation(hit.id);return}
  if(hit.type==='action'){if(distance(player,{x:1100,y:815})<100)interaction(hit.kind);else moveTo(1100,815,{type:'action',kind:hit.kind});return}
 }
 moveTo(x,y);
}
let pointer=null;
function screenWorld(x,y){return world3D?world3D.screenToWorld(x,y):{x:(x-CW/2)/scale+camera.x,y:(y-CH/2)/scale+camera.y}}
cv.addEventListener('pointerdown',e=>{if(pointer||e.button!==0||els.modal.classList.contains('open'))return;e.preventDefault();cv.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false,stamp:0};},{passive:false});
cv.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;
 e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;
 if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>9)pointer.drag=true;
 if(!pointer.drag)return;
 // Replan only on a real finger movement. Reprojecting a stationary finger
 // each frame against the following camera makes the destination slide away.
 const now=performance.now();
 if(now-pointer.stamp<125)return;
 const target=screenWorld(pointer.x,pointer.y);
 if(pointer.lastTarget&&Math.hypot(pointer.lastTarget.x-target.x,pointer.lastTarget.y-target.y)<22)return;
 pointer.stamp=now;pointer.lastTarget=target;pointer.projectedScreen={x:pointer.x,y:pointer.y};
 moveTo(target.x,target.y,null,true);
},{passive:false});
cv.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(cv.hasPointerCapture(e.pointerId))cv.releasePointerCapture(e.pointerId);
 if(p.drag){const sameFingerPosition=p.projectedScreen&&Math.hypot(p.projectedScreen.x-e.clientX,p.projectedScreen.y-e.clientY)<4;const w=sameFingerPosition?p.lastTarget:screenWorld(e.clientX,e.clientY);if(!p.lastTarget||Math.hypot(p.lastTarget.x-w.x,p.lastTarget.y-w.y)>2)moveTo(w.x,w.y,null,true)}else handleTap(e.clientX,e.clientY);
});
cv.addEventListener('pointercancel',()=>{pointer=null;stopWalking()});
let keys={};const movementKeys=['w','a','s','d','W','A','S','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||els.modal.classList.contains('open')){if(e.key==='Escape')closeModal();return}if(movementKeys.includes(e.key)){e.preventDefault();keys[e.key]=true}if(e.key==='Escape'){stopWalking();placeDecor=null;if(fishPhase!=='idle')fishFailure('낚시 취소')}});
window.addEventListener('keyup',e=>{delete keys[e.key]});
window.addEventListener('blur',()=>{keys={};pointer=null;stopWalking()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys={};pointer=null;stopWalking();save()}last=performance.now()});
function update(dt){t+=dt;updateAmbient(dt);for(const o of Object.values(peers)){let k=1-Math.exp(-dt*9);o.x+=(o.targetX-o.x)*k;o.y+=(o.targetY-o.y)*k}if(socialId&&t-lastPositionSent>.13){lastPositionSent=t;socialSend({type:'pos',x:player.x,y:player.y,dir:player.dir,coat:state.coat,hat:state.hat})}if(Math.floor(t)%4===0&&Math.floor(t)!==lastClock){lastClock=Math.floor(t);const clock=document.getElementById('worldClock');const hour=new Date().getHours();clock.textContent=seasonLabels[state.season]+' · '+(hour<11?'산뜻한 아침':hour<17?'따스한 낮':'노을빛 저녁')+' · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});} if(fishPhase==='wait'&&performance.now()>castUntil){fishPhase='bite';castUntil=performance.now()+2200;els.fishTitle.textContent='❗ 입질이 왔어요!';els.fishDesc.textContent='시간 안에 챔질하기를 눌러주세요';els.fishAction.textContent='🐟 지금 챔질하기!';els.gauge.style.display='none';party(1558,1353,10)}
 if(fishPhase==='bite'&&performance.now()>castUntil){fishFailure('물고기가 도망갔어요!');}
 if(fishPhase==='reel'){gaugePos+=dt*gaugeDir*1.36;if(gaugePos>1){gaugePos=1;gaugeDir=-1}if(gaugePos<0){gaugePos=0;gaugeDir=1}els.needle.style.left=`calc(${gaugePos*100}% - 2px)`}
  if(els.modal.classList.contains('open')){player.vx=player.vy=0;return}
  // Pointer paths are updated from pointermove events, not a drifting frame loop.
  const kvx=Number(!!(keys.ArrowRight||keys.d||keys.D))-Number(!!(keys.ArrowLeft||keys.a||keys.A)),kvy=Number(!!(keys.ArrowDown||keys.s||keys.S))-Number(!!(keys.ArrowUp||keys.w||keys.W));
  if(kvx||kvy){if(fishPhase!=='idle')fishFailure('이동하여 낚시를 마쳤어요');stopWalking();const len=Math.hypot(kvx,kvy),target={x:player.x+kvx/len*190*dt,y:player.y+kvy/len*190*dt};if(navigation.clear(player,target)){const moved=navigation.advance(player,[target],dt);if(moved>0){player.vx=kvx/len*190;player.vy=kvy/len*190}}}
  else if(path.length){navigation.advance(player,path,dt);if(player.blocked){stopWalking();toast('길이 막혀 멈췄어요')}else if(!path.length)arrive();}
  else player.vx=player.vy=0;
  // A fixed follow camera avoids input drift caused by a lagging view transform.
  const halfX=CW/(scale*2),halfY=CH/(scale*2);
  camera.x=Math.max(halfX,Math.min(W-halfX,player.x));camera.y=Math.max(halfY,Math.min(H-halfY,player.y));
  updateJourney();

}
function frame(now){const dt=Math.min(.038,(now-last)/1000);last=now;update(dt);drawWorld(dt);drawMini();requestAnimationFrame(frame)}requestAnimationFrame(frame);
function drawMini(){const w=mini.width,h=mini.height,sx=w/W,sy=h/H;
 mctx.fillStyle='#65aeb3';mctx.fillRect(0,0,w,h);mctx.fillStyle='#a1ca8d';mctx.fillRect(2000*sx,0,1600*sx,h);
 mctx.fillStyle='#b5cc91';mctx.fillRect(80*sx,120*sy,1840*sx,1050*sy);mctx.fillRect(455*sx,1170*sy,910*sx,400*sy);mctx.fillRect(1800*sx,720*sy,400*sx,340*sy);
 mctx.strokeStyle='#fff3c7';mctx.lineWidth=1.5;if(path.length){mctx.beginPath();mctx.moveTo(player.x*sx,player.y*sy);for(const p of path)mctx.lineTo(p.x*sx,p.y*sy);mctx.stroke()}
 for(const o of stations){mctx.fillStyle=o.x>2000?'#94623f':'#5c775a';mctx.fillRect(o.x*sx-2,o.y*sy-2,4,4)}
 mctx.strokeStyle='#fff9';mctx.lineWidth=1;mctx.strokeRect((camera.x-CW/scale/2)*sx,(camera.y-CH/scale/2)*sy,CW/scale*sx,CH/scale*sy);
 mctx.fillStyle='#ffe48f';mctx.strokeStyle='#263e3a';mctx.lineWidth=1.5;mctx.beginPath();mctx.arc(player.x*sx,player.y*sy,3.5,0,7);mctx.fill();mctx.stroke();
}
function closeModal(){els.modal.classList.remove('open');}
function openModal(html){stopWalking();keys={};pointer=null;els.panelBody.innerHTML=html;els.modal.classList.add('open')}
document.getElementById('close').onclick=closeModal;els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});
let fittingLook=null;
function openShop(){
 if(!fittingLook)fittingLook={coat:state.coat,hat:state.hat};
 const cells=outfits.map(o=>{const cur=fittingLook[o.type]===o.id,have=owned.includes(o.id);return `<div class="item"><div class="cloth-swatch" style="background:${o.col||'#dfc9a1'}">${o.emoji}</div><strong>${o.name}</strong><span>${have?'보유 중':o.craftOnly?'공방에서 제작':o.cost.toLocaleString()+' G'}</span><button data-try="${o.id}" class="${cur?'equipped':''}">${cur?'✓ 미리보기 중':'입어보기'}</button><button data-outfit="${o.id}">${state[o.type]===o.id?'착용 중':have?'착용하기':o.craftOnly?'공방으로 가기':'구매 · 착용'}</button></div>`}).join('');
 openModal(`<span class="titlebadge">JUNJA ATELIER · 3D</span><h2>나의 작은 옷장</h2><p>같은 몸, 같은 관절. 입어보고 돌아보고 골라요.</p><div id="fittingHost"></div><div class="pill-row fitting-controls"><button class="pill-btn ghost" id="turnFitting">↻ 45° 돌려보기</button><button class="pill-btn ghost" id="walkFitting">걷기 / 멈추기</button><button class="pill-btn ghost" id="resetFitting">현재 착용으로</button></div><div class="goods">${cells}</div>`);
 world3D?.fitting(document.getElementById('fittingHost'),fittingLook.coat,fittingLook.hat);
 els.panelBody.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{const o=outfits.find(x=>x.id===b.dataset.try);fittingLook[o.type]=o.id;openShop()});
 els.panelBody.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{const o=outfits.find(x=>x.id===b.dataset.outfit);if(o.craftOnly&&!owned.includes(o.id)){goStation('workshop');return}if(!owned.includes(o.id)){if(state.coins<o.cost){toast('코인이 부족해요');return}state.coins-=o.cost;owned.push(o.id)}state[o.type]=o.id;fittingLook[o.type]=o.id;save();hud();updateJourney(true);toast(o.name+' 착용했어요');openShop()});
 document.getElementById('turnFitting').onclick=()=>world3D?.turnFitting();document.getElementById('walkFitting').onclick=()=>world3D?.walkFitting();document.getElementById('resetFitting').onclick=()=>{fittingLook={coat:state.coat,hat:state.hat};openShop()};
}
function openBag(){const fishIcons={'송사리':'🐟','붕어':'🐠','금붕어':'🐡','황금 잉어':'✨','비단 송어':'🐟','은빛 농어':'🐠'};const list=state.collection.slice(-12).reverse();openModal(`<span class="titlebadge">COLLECTION BOOK</span><h2>🎒 나의 수집 가방</h2><h3>채집 재료</h3><p>${Object.entries(state.materials).map(([k,v])=>materialNames[k]+' '+v+'개').join(' · ')}</p><h3>제작품</h3><p>${recipes.map(r=>r.name+' '+(state.crafted[r.id]||0)+'개').join(' · ')}</p><p>낚은 물고기와 꾸미기 아이템을 모아보세요. (${state.collection.length}마리)</p><div class="inventory">${list.map(n=>`<div class="slot"><b>${fishIcons[n]||'🐟'}</b>${n}</div>`).join('')||'<div class="slot"><b>🎣</b>첫 물고기를 낚아보세요</div>'}</div><p style="margin-top:20px">🌸 옷: ${outfits.find(o=>o.id===state.coat)?.name||'기본 옷'} · 모자: ${outfits.find(o=>o.id===state.hat)?.name||'없음'}</p>`) }
function guide(){openModal(`<span class="titlebadge">HOW TO PLAY</span><h2>🌿 준자마을 LIFE 1.5 · 조작법</h2><p style="font-size:14px;line-height:1.9">👆 <b>바닥 터치</b> → 정확한 목적지 이동<br>👉 <b>드래그 유지</b> → 손가락 방향으로 경로 갱신<br>🛑 <b>손 떼기</b> → 마지막 지정 위치에 정지<br>🗺️ <b>지도</b> → 장소 선택 후 자동 길찾기<br>📜 <b>성장 수첩</b> → 목표·보상·다음 목적지 확인<br>🐟 <b>낚시하기</b> → 부두에 가서 낚싯대 던지기<br>🎣 <b>입질</b> → 챔질 → 초록 영역에서 타이밍 맞추기<br>👒 <b>옷가게</b> → 코인으로 새 옷과 모자 구매<br>🌱 <b>텃밭 터치</b> → 작물 수확하고 코인 얻기<br>🎒 <b>가방</b> → 내가 낚은 물고기 확인<br>💾 진행 상황은 이 브라우저에 자동 저장됩니다.<br><br><b>개발 미리보기:</b> 아직 친구 멀티플레이·서버 저장은 연결되지 않았어요.</p>`) }
function beginFishing(){closeModal();stopWalking();if(distance(player,{x:1465,y:1177})>190){moveTo(1464,1168,{type:'action',kind:'fish'});toast('🎣 부두로 이동하고 있어요');return}
 fishPhase='wait';fishAttempts=0;castMode=true;castUntil=performance.now()+1300+Math.random()*1700;els.fishTitle.textContent='🎣 낚싯대를 던졌어요';els.fishDesc.textContent='물고기가 입질할 때까지 기다려요…';els.fishAction.textContent='찌를 바라보는 중…';els.gauge.style.display='none';els.fishing.classList.add('open');}
function fishFailure(s){els.fishing.classList.remove('open');fishPhase='idle';castMode=false;toast('💨 '+s)}
function fishingAction(){if(fishPhase==='bite'){fishPhase='reel';fishAttempts=0;gaugePos=0;gaugeDir=1;els.fishTitle.textContent='🐟 릴을 감아 올려요!';els.fishDesc.textContent='초록 영역에서 두 번 터치해서 성공하세요';els.fishAction.textContent='✨ 지금 릴 감기';els.gauge.style.display='block';return}if(fishPhase==='reel'){if(gaugePos>.30&&gaugePos<.70){fishAttempts++;party(player.x,player.y-30,9);if(fishAttempts>=2){const names=['송사리','붕어','금붕어','비단 송어','은빛 농어','황금 잉어'];let roll=Math.random();let idx=roll>.982?5:roll>.84?4:roll>.66?3:Math.floor(roll*3);let fish=names[idx],money=[36,55,88,120,185,600][idx]+lifeBonus('fish');state.fish++;state.dailyFish++;state.collection.push(fish);state.xp+=36;state.coins+=money;hud();save();completeDaily();checkAchievements();fishPhase='idle';castMode=false;els.fishing.classList.remove('open');toast(`🐟 ${fish} 획득! +${money}G`);party(player.x,player.y-75,26);return}els.fishDesc.textContent='좋아요! 한 번 더 맞춰보세요 ('+fishAttempts+'/2)'}else{fishAttempts=Math.max(0,fishAttempts-1);els.fishDesc.textContent='앗! 초록 영역에서 눌러주세요'}}}
els.fishAction.addEventListener('click',fishingAction);document.getElementById('worldClock').addEventListener('click',openSeasons);document.getElementById('socialStatus').onclick=openSocial;document.getElementById('shopBtn').onclick=openShop;document.getElementById('bagBtn').onclick=openBag;document.getElementById('guideBtn').onclick=openJournal;document.getElementById('farmBtn').onclick=farmAll;document.getElementById('decorBtn').onclick=()=>{if(placeDecor){placeDecor=null;toast('꾸미기 배치 취소')}openDecor()};document.getElementById('craftBtn').onclick=openCraft;document.getElementById('fishBtn').onclick=beginFishing;document.getElementById('mapButton').onclick=()=>openModal('<span class="titlebadge">WORLD MAP</span><h2>🗺️ 준자마을 안내</h2><p>🐟 바다상점은 서쪽 · 🏠 집은 북동쪽 · 🌱 농장은 남쪽 · 🎣 낚시는 동남쪽 부두</p><button class="pill-btn" id="mapGuide">조작법 확인</button>');
function showRenderError(error){
 const panel=document.getElementById('renderError');panel.hidden=false;
 const reason=document.getElementById('renderErrorReason');
 if(reason)reason.textContent=String(error?.message||error||'그래픽 컨텍스트를 사용할 수 없습니다').slice(0,220);
}
cv.addEventListener('webglcontextlost',e=>{e.preventDefault();save();showRenderError('그래픽 컨텍스트가 중단됐습니다. 다시 열기를 눌러 복구하세요.');});
cv.addEventListener('webglcontextrestored',()=>location.reload());
try{world3D=createWorld({canvas:cv,width:W,height:H,stations,resources:resourceNodes,beds:bedCenters,npcs,animals:animalFriends,walkable})}catch(error){console.error(error);showRenderError(error);}
initJourney();connectSocial();setTimeout(()=>{els.welcome.style.opacity=0},5500);window.__JUNJA_TEST__={getRenderer:()=>world3D?.stats(),getNavigation:()=>({path:path.map(p=>({...p})),goal,camera:{...camera},scale}),getJourney:()=>({chapter:state.chapter,materials:state.materials,crafted:state.crafted,stations:stations.map(s=>s.id)}),getSeason:()=>state.season,setSeason:(s)=>{if(seasonLabels[s]){state.season=s;save()}},getAnimalFriends:()=>animalFriends.map(a=>({id:a.id,x:a.x,y:a.y,friendship:state.animalBonds[a.id]?.love||0})),getState:()=>({player:{...player},coins:state.coins,fish:state.fish,phase:fishPhase,owned:[...owned],outfit:state.coat,hat:state.hat,gauge:gaugePos,pathlen:path.length,beds:state.beds,decorations:state.decorations,daily:dailyTask(),friends:state.friends}),moveTo,beginFishing,openShop,openFarmShop,farmAt,openDecor,placeAt,openHome,openNpc,openMarket,openCraft,openJournal,openSocial};
})();

