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
// 70 distinct species. Each bite is rolled *before* reeling, so hard fish require harder gameplay.
// Early fish remain obtainable and saved collections retain legacy fish names.
export const FISH=Object.freeze([
 {
  "name": "송사리",
  "base": 36,
  "rarity": "일반",
  "color": "#90b8a3",
  "dark": "#558579",
  "shape": "minnow",
  "size": 0.75,
  "tier": "common",
  "minLevel": 1,
  "weight": 20
 },
 {
  "name": "붕어",
  "base": 55,
  "rarity": "일반",
  "color": "#c7ac70",
  "dark": "#8c7b4d",
  "shape": "carp",
  "size": 1,
  "tier": "common",
  "minLevel": 1,
  "weight": 15
 },
 {
  "name": "금붕어",
  "base": 88,
  "rarity": "고급",
  "color": "#f0a557",
  "dark": "#be7040",
  "shape": "gold",
  "size": 1,
  "tier": "fine",
  "minLevel": 3,
  "weight": 7
 },
 {
  "name": "비단 송어",
  "base": 120,
  "rarity": "희귀",
  "color": "#a5b5dc",
  "dark": "#6a7ab5",
  "shape": "trout",
  "size": 1.2,
  "tier": "rare",
  "minLevel": 6,
  "weight": 2
 },
 {
  "name": "은빛 농어",
  "base": 185,
  "rarity": "영웅",
  "color": "#bdd4db",
  "dark": "#6a919e",
  "shape": "bass",
  "size": 1.35,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.45
 },
 {
  "name": "황금 잉어",
  "base": 600,
  "rarity": "전설",
  "color": "#e8c34a",
  "dark": "#b28335",
  "shape": "goldcarp",
  "size": 1.5,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.09
 },
 {
  "name": "미꾸라지",
  "base": 48,
  "rarity": "일반",
  "color": "#96c7b2",
  "dark": "#4a9481",
  "shape": "minnow",
  "size": 0.65,
  "tier": "common",
  "minLevel": 1,
  "weight": 10
 },
 {
  "name": "피라미",
  "base": 56,
  "rarity": "일반",
  "color": "#d0c095",
  "dark": "#8f9875",
  "shape": "trout",
  "size": 0.78,
  "tier": "common",
  "minLevel": 1,
  "weight": 9.82
 },
 {
  "name": "돌고기",
  "base": 63,
  "rarity": "일반",
  "color": "#82b9ce",
  "dark": "#49819a",
  "shape": "bass",
  "size": 0.91,
  "tier": "common",
  "minLevel": 1,
  "weight": 9.64
 },
 {
  "name": "모래무지",
  "base": 71,
  "rarity": "일반",
  "color": "#96c7b2",
  "dark": "#4a9481",
  "shape": "carp",
  "size": 1.04,
  "tier": "common",
  "minLevel": 1,
  "weight": 9.46
 },
 {
  "name": "망둑어",
  "base": 79,
  "rarity": "일반",
  "color": "#d0c095",
  "dark": "#8f9875",
  "shape": "gold",
  "size": 1.17,
  "tier": "common",
  "minLevel": 1,
  "weight": 9.28
 },
 {
  "name": "전갱이",
  "base": 86,
  "rarity": "일반",
  "color": "#82b9ce",
  "dark": "#49819a",
  "shape": "goldcarp",
  "size": 1.3,
  "tier": "common",
  "minLevel": 2,
  "weight": 9.1
 },
 {
  "name": "청어",
  "base": 94,
  "rarity": "일반",
  "color": "#96c7b2",
  "dark": "#4a9481",
  "shape": "minnow",
  "size": 0.65,
  "tier": "common",
  "minLevel": 2,
  "weight": 8.92
 },
 {
  "name": "멸치",
  "base": 102,
  "rarity": "일반",
  "color": "#d0c095",
  "dark": "#8f9875",
  "shape": "trout",
  "size": 0.78,
  "tier": "common",
  "minLevel": 2,
  "weight": 8.74
 },
 {
  "name": "볼락",
  "base": 150,
  "rarity": "고급",
  "color": "#dfbc77",
  "dark": "#a88051",
  "shape": "trout",
  "size": 0.8,
  "tier": "fine",
  "minLevel": 3,
  "weight": 5
 },
 {
  "name": "도미",
  "base": 174,
  "rarity": "고급",
  "color": "#e6a3b5",
  "dark": "#a55f84",
  "shape": "bass",
  "size": 0.93,
  "tier": "fine",
  "minLevel": 3,
  "weight": 4.91
 },
 {
  "name": "고등어",
  "base": 198,
  "rarity": "고급",
  "color": "#a4c8b9",
  "dark": "#508b7f",
  "shape": "carp",
  "size": 1.06,
  "tier": "fine",
  "minLevel": 3,
  "weight": 4.82
 },
 {
  "name": "숭어",
  "base": 222,
  "rarity": "고급",
  "color": "#dfbc77",
  "dark": "#a88051",
  "shape": "gold",
  "size": 1.19,
  "tier": "fine",
  "minLevel": 3,
  "weight": 4.73
 },
 {
  "name": "우럭",
  "base": 246,
  "rarity": "고급",
  "color": "#e6a3b5",
  "dark": "#a55f84",
  "shape": "goldcarp",
  "size": 1.32,
  "tier": "fine",
  "minLevel": 3,
  "weight": 4.64
 },
 {
  "name": "복어",
  "base": 270,
  "rarity": "고급",
  "color": "#a4c8b9",
  "dark": "#508b7f",
  "shape": "minnow",
  "size": 1.45,
  "tier": "fine",
  "minLevel": 4,
  "weight": 4.55
 },
 {
  "name": "꺽지",
  "base": 294,
  "rarity": "고급",
  "color": "#dfbc77",
  "dark": "#a88051",
  "shape": "trout",
  "size": 0.8,
  "tier": "fine",
  "minLevel": 4,
  "weight": 4.46
 },
 {
  "name": "메기",
  "base": 318,
  "rarity": "고급",
  "color": "#e6a3b5",
  "dark": "#a55f84",
  "shape": "bass",
  "size": 0.93,
  "tier": "fine",
  "minLevel": 4,
  "weight": 4.37
 },
 {
  "name": "참붕어",
  "base": 342,
  "rarity": "고급",
  "color": "#a4c8b9",
  "dark": "#508b7f",
  "shape": "carp",
  "size": 1.06,
  "tier": "fine",
  "minLevel": 4,
  "weight": 4.28
 },
 {
  "name": "전어",
  "base": 366,
  "rarity": "고급",
  "color": "#dfbc77",
  "dark": "#a88051",
  "shape": "gold",
  "size": 1.19,
  "tier": "fine",
  "minLevel": 4,
  "weight": 4.19
 },
 {
  "name": "놀래미",
  "base": 390,
  "rarity": "고급",
  "color": "#e6a3b5",
  "dark": "#a55f84",
  "shape": "goldcarp",
  "size": 1.32,
  "tier": "fine",
  "minLevel": 5,
  "weight": 4.1
 },
 {
  "name": "무지개 송어",
  "base": 500,
  "rarity": "희귀",
  "color": "#89c2d9",
  "dark": "#567db8",
  "shape": "bass",
  "size": 1.1,
  "tier": "rare",
  "minLevel": 6,
  "weight": 1.2
 },
 {
  "name": "산천어",
  "base": 580,
  "rarity": "희귀",
  "color": "#e9b4d4",
  "dark": "#ad6fa8",
  "shape": "carp",
  "size": 1.23,
  "tier": "rare",
  "minLevel": 6,
  "weight": 1.1784
 },
 {
  "name": "연어",
  "base": 660,
  "rarity": "희귀",
  "color": "#a6d3bc",
  "dark": "#548f96",
  "shape": "gold",
  "size": 1.36,
  "tier": "rare",
  "minLevel": 6,
  "weight": 1.1568
 },
 {
  "name": "광어",
  "base": 740,
  "rarity": "희귀",
  "color": "#89c2d9",
  "dark": "#567db8",
  "shape": "goldcarp",
  "size": 1.49,
  "tier": "rare",
  "minLevel": 6,
  "weight": 1.1352
 },
 {
  "name": "가자미",
  "base": 820,
  "rarity": "희귀",
  "color": "#e9b4d4",
  "dark": "#ad6fa8",
  "shape": "minnow",
  "size": 1.62,
  "tier": "rare",
  "minLevel": 6,
  "weight": 1.1136
 },
 {
  "name": "다금바리",
  "base": 900,
  "rarity": "희귀",
  "color": "#a6d3bc",
  "dark": "#548f96",
  "shape": "trout",
  "size": 1.75,
  "tier": "rare",
  "minLevel": 7,
  "weight": 1.092
 },
 {
  "name": "쏘가리",
  "base": 980,
  "rarity": "희귀",
  "color": "#89c2d9",
  "dark": "#567db8",
  "shape": "bass",
  "size": 1.1,
  "tier": "rare",
  "minLevel": 7,
  "weight": 1.0704
 },
 {
  "name": "감성돔",
  "base": 1060,
  "rarity": "희귀",
  "color": "#e9b4d4",
  "dark": "#ad6fa8",
  "shape": "carp",
  "size": 1.23,
  "tier": "rare",
  "minLevel": 7,
  "weight": 1.0488
 },
 {
  "name": "참돔",
  "base": 1140,
  "rarity": "희귀",
  "color": "#a6d3bc",
  "dark": "#548f96",
  "shape": "gold",
  "size": 1.36,
  "tier": "rare",
  "minLevel": 7,
  "weight": 1.0272
 },
 {
  "name": "농어",
  "base": 1220,
  "rarity": "희귀",
  "color": "#89c2d9",
  "dark": "#567db8",
  "shape": "goldcarp",
  "size": 1.49,
  "tier": "rare",
  "minLevel": 7,
  "weight": 1.0056
 },
 {
  "name": "갈치",
  "base": 1300,
  "rarity": "희귀",
  "color": "#e9b4d4",
  "dark": "#ad6fa8",
  "shape": "minnow",
  "size": 1.62,
  "tier": "rare",
  "minLevel": 8,
  "weight": 0.984
 },
 {
  "name": "돌돔",
  "base": 1380,
  "rarity": "희귀",
  "color": "#a6d3bc",
  "dark": "#548f96",
  "shape": "trout",
  "size": 1.75,
  "tier": "rare",
  "minLevel": 8,
  "weight": 0.9624
 },
 {
  "name": "문어",
  "base": 1460,
  "rarity": "희귀",
  "color": "#89c2d9",
  "dark": "#567db8",
  "shape": "octopus",
  "size": 1.1,
  "tier": "rare",
  "minLevel": 8,
  "weight": 0.9408
 },
 {
  "name": "꽃게",
  "base": 1540,
  "rarity": "희귀",
  "color": "#e9b4d4",
  "dark": "#ad6fa8",
  "shape": "carp",
  "size": 1.23,
  "tier": "rare",
  "minLevel": 8,
  "weight": 0.9192
 },
 {
  "name": "황새치",
  "base": 1600,
  "rarity": "영웅",
  "color": "#8cc2ee",
  "dark": "#476baf",
  "shape": "billfish",
  "size": 1.35,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.38
 },
 {
  "name": "참치",
  "base": 1856,
  "rarity": "영웅",
  "color": "#c7b0e4",
  "dark": "#7b61af",
  "shape": "gold",
  "size": 1.48,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.3732
 },
 {
  "name": "방어",
  "base": 2112,
  "rarity": "영웅",
  "color": "#f5ac7c",
  "dark": "#b66759",
  "shape": "goldcarp",
  "size": 1.61,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.3663
 },
 {
  "name": "민어",
  "base": 2368,
  "rarity": "영웅",
  "color": "#8cc2ee",
  "dark": "#476baf",
  "shape": "minnow",
  "size": 1.74,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.3595
 },
 {
  "name": "큰입배스",
  "base": 2624,
  "rarity": "영웅",
  "color": "#c7b0e4",
  "dark": "#7b61af",
  "shape": "trout",
  "size": 1.87,
  "tier": "hero",
  "minLevel": 10,
  "weight": 0.3526
 },
 {
  "name": "청새치",
  "base": 2880,
  "rarity": "영웅",
  "color": "#f5ac7c",
  "dark": "#b66759",
  "shape": "billfish",
  "size": 2,
  "tier": "hero",
  "minLevel": 11,
  "weight": 0.3458
 },
 {
  "name": "귀상어",
  "base": 3136,
  "rarity": "영웅",
  "color": "#8cc2ee",
  "dark": "#476baf",
  "shape": "shark",
  "size": 1.35,
  "tier": "hero",
  "minLevel": 11,
  "weight": 0.339
 },
 {
  "name": "아귀",
  "base": 3392,
  "rarity": "영웅",
  "color": "#c7b0e4",
  "dark": "#7b61af",
  "shape": "gold",
  "size": 1.48,
  "tier": "hero",
  "minLevel": 11,
  "weight": 0.3321
 },
 {
  "name": "대왕 오징어",
  "base": 3648,
  "rarity": "영웅",
  "color": "#f5ac7c",
  "dark": "#b66759",
  "shape": "octopus",
  "size": 1.61,
  "tier": "hero",
  "minLevel": 11,
  "weight": 0.3253
 },
 {
  "name": "철갑상어",
  "base": 3904,
  "rarity": "영웅",
  "color": "#8cc2ee",
  "dark": "#476baf",
  "shape": "shark",
  "size": 1.74,
  "tier": "hero",
  "minLevel": 11,
  "weight": 0.3184
 },
 {
  "name": "장어",
  "base": 4160,
  "rarity": "영웅",
  "color": "#c7b0e4",
  "dark": "#7b61af",
  "shape": "eel",
  "size": 1.87,
  "tier": "hero",
  "minLevel": 12,
  "weight": 0.3116
 },
 {
  "name": "붉은바리",
  "base": 4416,
  "rarity": "영웅",
  "color": "#f5ac7c",
  "dark": "#b66759",
  "shape": "bass",
  "size": 2,
  "tier": "hero",
  "minLevel": 12,
  "weight": 0.3048
 },
 {
  "name": "무지개 비단잉어",
  "base": 4672,
  "rarity": "영웅",
  "color": "#8cc2ee",
  "dark": "#476baf",
  "shape": "carp",
  "size": 1.35,
  "tier": "hero",
  "minLevel": 12,
  "weight": 0.2979
 },
 {
  "name": "황금 참다랑어",
  "base": 6500,
  "rarity": "전설",
  "color": "#f8d680",
  "dark": "#b88a35",
  "shape": "gold",
  "size": 1.7,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.065
 },
 {
  "name": "백금 철갑상어",
  "base": 7540,
  "rarity": "전설",
  "color": "#c4d3ea",
  "dark": "#748cbb",
  "shape": "shark",
  "size": 1.83,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.0638
 },
 {
  "name": "달빛 대왕문어",
  "base": 8580,
  "rarity": "전설",
  "color": "#f2aab2",
  "dark": "#a66880",
  "shape": "octopus",
  "size": 1.96,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.0627
 },
 {
  "name": "바다의 왕 청새치",
  "base": 9620,
  "rarity": "전설",
  "color": "#f8d680",
  "dark": "#b88a35",
  "shape": "billfish",
  "size": 2.09,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.0615
 },
 {
  "name": "빙하 황새치",
  "base": 10660,
  "rarity": "전설",
  "color": "#c4d3ea",
  "dark": "#748cbb",
  "shape": "billfish",
  "size": 2.22,
  "tier": "legend",
  "minLevel": 16,
  "weight": 0.0603
 },
 {
  "name": "태양빛 잉어",
  "base": 11700,
  "rarity": "전설",
  "color": "#f2aab2",
  "dark": "#a66880",
  "shape": "carp",
  "size": 2.35,
  "tier": "legend",
  "minLevel": 17,
  "weight": 0.0592
 },
 {
  "name": "심해 유령상어",
  "base": 12740,
  "rarity": "전설",
  "color": "#f8d680",
  "dark": "#b88a35",
  "shape": "shark",
  "size": 1.7,
  "tier": "legend",
  "minLevel": 17,
  "weight": 0.058
 },
 {
  "name": "금빛 대왕가오리",
  "base": 13780,
  "rarity": "전설",
  "color": "#c4d3ea",
  "dark": "#748cbb",
  "shape": "ray",
  "size": 1.83,
  "tier": "legend",
  "minLevel": 17,
  "weight": 0.0568
 },
 {
  "name": "폭풍 대왕오징어",
  "base": 14820,
  "rarity": "전설",
  "color": "#f2aab2",
  "dark": "#a66880",
  "shape": "octopus",
  "size": 1.96,
  "tier": "legend",
  "minLevel": 17,
  "weight": 0.0556
 },
 {
  "name": "산호 황제도미",
  "base": 15860,
  "rarity": "전설",
  "color": "#f8d680",
  "dark": "#b88a35",
  "shape": "trout",
  "size": 2.09,
  "tier": "legend",
  "minLevel": 17,
  "weight": 0.0545
 },
 {
  "name": "용의 수염 잉어",
  "base": 25000,
  "rarity": "신화",
  "color": "#dabdff",
  "dark": "#835db1",
  "shape": "goldcarp",
  "size": 2.1,
  "tier": "mythic",
  "minLevel": 22,
  "weight": 0.012
 },
 {
  "name": "별무리 고래상어",
  "base": 29000,
  "rarity": "신화",
  "color": "#ffc978",
  "dark": "#b87f54",
  "shape": "shark",
  "size": 2.23,
  "tier": "mythic",
  "minLevel": 22,
  "weight": 0.0118
 },
 {
  "name": "심연의 크라켄",
  "base": 33000,
  "rarity": "신화",
  "color": "#98e6da",
  "dark": "#5594bf",
  "shape": "octopus",
  "size": 2.36,
  "tier": "mythic",
  "minLevel": 22,
  "weight": 0.0116
 },
 {
  "name": "은하수 청룡어",
  "base": 37000,
  "rarity": "신화",
  "color": "#dabdff",
  "dark": "#835db1",
  "shape": "bass",
  "size": 2.49,
  "tier": "mythic",
  "minLevel": 22,
  "weight": 0.0114
 },
 {
  "name": "영원의 황금 용어",
  "base": 41000,
  "rarity": "신화",
  "color": "#ffc978",
  "dark": "#b87f54",
  "shape": "carp",
  "size": 2.62,
  "tier": "mythic",
  "minLevel": 22,
  "weight": 0.0111
 },
 {
  "name": "시간의 바다 정령",
  "base": 45000,
  "rarity": "신화",
  "color": "#98e6da",
  "dark": "#5594bf",
  "shape": "gold",
  "size": 2.75,
  "tier": "mythic",
  "minLevel": 23,
  "weight": 0.0109
 },
 {
  "name": "태초의 바다신",
  "base": 49000,
  "rarity": "신화",
  "color": "#dabdff",
  "dark": "#835db1",
  "shape": "goldcarp",
  "size": 2.1,
  "tier": "mythic",
  "minLevel": 23,
  "weight": 0.0107
 },
 {
  "name": "준자바다 전설",
  "base": 53000,
  "rarity": "신화",
  "color": "#ffc978",
  "dark": "#b87f54",
  "shape": "minnow",
  "size": 2.23,
  "tier": "mythic",
  "minLevel": 23,
  "weight": 0.0105
 }
].map(f=>Object.freeze(f)));
export const FISH_TIER_ORDER=Object.freeze(["common","fine","rare","hero","legend","mythic"]);
export const STARTER_FISH_NAMES=Object.freeze(["송사리","붕어","미꾸라지","피라미","돌고기","모래무지"]);
export const FISH_BY_NAME=Object.freeze(Object.fromEntries(FISH.map(f=>[f.name,f])));
export const PHRASES=Object.freeze(['안녕하세요!','같이 낚시해요 🎣','도와줄까요?','축하해요! 🎉','고마워요 💚','잠깐만요!']);
export function rodById(id){return RODS.find(r=>r.id===id)||RODS[0]}
export function eligibleFish(rodId,level=1){
 const rod=rodById(rodId);
 const unlocked={common:1,fine:1,rare:4,hero:7,legend:11,mythic:18};
 const lv=Math.max(1,Math.floor(Number(level)||1));
 return FISH.filter(f=>lv>=f.minLevel&&rod.level>=unlocked[f.tier]);
}
export function fishRoll(roll,rodId,level=1){
 const rod=rodById(rodId),eligible=eligibleFish(rodId,level);
 const weights=eligible.map(f=>{
  const rareBoost=(f.tier==='common'?1:f.tier==='fine'?1+rod.rare*1.2:1+rod.rare*6);
  return f.weight*rareBoost;
 });
 const total=weights.reduce((a,b)=>a+b,0);
 let slot=Math.max(0,Math.min(.999999,Number(roll)||0))*total;
 for(let i=0;i<eligible.length;i++){slot-=weights[i];if(slot<0)return FISH.indexOf(eligible[i])}
 return FISH.indexOf(eligible.at(-1));
}
export function reelChallenge(fish,rodId){
 const tier=FISH_TIER_ORDER.indexOf(fish?.tier);
 const index=Math.max(0,tier),rod=rodById(rodId);
 const size=Math.max(.6,Math.min(3.5,fish?.size||1));
 const widths=[.38,.32,.25,.19,.14,.105];
 const hits=[2,2,3,4,5,6];
 const baseWidth=widths[index]-Math.max(0,size-1.3)*.024;
 // Better rods widen the strike zone, but never remove the difficulty of boss fish.
 const width=Math.max(.075,Math.min(.6,baseWidth+rod.window*.45));
 return {width,hits:hits[index]+(size>2.5?1:0),
  speed:1.12+index*.21+Math.max(0,size-1)*.12,
  seconds:Math.max(11,22-index*2),
  maxMisses:index>=4?2:index>=2?3:4,
  tier:index};
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
 const gradientId='fish_'+[...fish.name].reduce((h,c)=>((h*31+c.charCodeAt(0))>>>0),7);
 const longBody=['eel','billfish','shark'].includes(shape),flatBody=shape==='ray',octopus=shape==='octopus';
 const rx=longBody?68:flatBody?57:octopus?48:shape==='minnow'?50:64;
 const ry=longBody?19:flatBody?21:octopus?28:shape==='trout'?21:29;
 const extra=shape==='ray'?'<path d="M72 51 Q35 6 19 45 Q48 79 72 51" fill="'+color+'" stroke="'+dark+'"/>':shape==='shark'?'<path d="M79 31 L112 0 L107 35 Z" fill="'+dark+'"/>':shape==='billfish'?'<path d="M153 52 L173 48" stroke="'+dark+'" stroke-width="4"/>':shape==='octopus'?'<path d="M80 69 Q60 98 48 81 M90 70 Q82 96 76 83 M100 70 Q102 100 112 81" stroke="'+dark+'" stroke-width="9" fill="none"/>':shape==='goldcarp'||shape==='gold'?'<path d="M65 25 Q83 3 93 30" fill="'+dark+'"/><path d="M70 70 Q90 89 98 67" fill="'+dark+'"/>':shape==='bass'?'<path d="M50 28 L68 5 L89 27 Z" fill="'+dark+'"/>':'<path d="M75 24 L90 10 L105 27 Z" fill="'+dark+'"/>';
 return '<svg aria-label="'+fish.name+' 그림" role="img" viewBox="0 0 176 100" width="'+size+'" height="'+Math.round(size*.57)+'" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><linearGradient id="fish_'+shape+'" x1="0" x2="0" y1="0" y2="1"><stop stop-color="'+color+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs>'+
 '<path d="M43 50 L7 24 Q13 50 7 76 Z" fill="'+dark+'" stroke="#ffffff80" stroke-width="1.5"/>'+
 '<ellipse cx="95" cy="50" rx="'+(shape==='minnow'?50:64)+'" ry="'+(shape==='trout'?21:29)+'" fill="url(#'+gradientId+')" stroke="'+dark+'" stroke-width="2"/>'+
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
