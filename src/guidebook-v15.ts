import './guidebook-v15.css';

const SAVE_KEY='junja-world-v01';
const SEEN_KEY='junja-world-guidebook-v15-seen';
type GuideAction='field'|'mine'|'forest'|'inventory'|'workshop'|'auto'|'quest'|'dungeon'|'none';

type Recommend={title:string;desc:string;action:GuideAction;label:string};

function readSave():any{try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{return null;}}
function gameActive(){const ui=document.querySelector<HTMLElement>('#game-ui');return !!ui&&!ui.classList.contains('hidden');}
function level(s:any){return Math.max(1,Number(s?.level||1));}
function chapter3Done(s:any){return Number(s?.chapter3?.state||0)>=5;}
function chapter4State(s:any){return Number(s?.chapter4?.state||0);}
function gear(s:any){return {weapon:Number(s?.weaponLevel||0),armor:Number(s?.armorLevel||0)};}
function resources(s:any){return s?.resources||{};}
function isTyping(target:EventTarget|null){return target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable="true"]');}

function recommendation(s:any):Recommend{
 if(!s)return {title:'모험가를 만들어주세요',desc:'직업을 고르고 백운성에 입장하면 가이드가 현재 진행 상황을 자동으로 읽어 다음 목표를 알려줍니다.',action:'none',label:'캐릭터 생성 후 확인'};
 const lv=level(s),g=gear(s),ch4=chapter4State(s);
 if(Number(s.potions||0)<=0)return {title:'회복약부터 확보하세요',desc:'물약이 없는 상태에서 자동사냥을 오래 돌리면 위험합니다. 백운 제작소에서 청심초로 회복약을 제작해두세요.',action:'workshop',label:'제작소 열기'};
 if(g.weapon<Math.min(5,Math.floor(lv/3))||g.armor<Math.min(5,Math.floor(lv/3)))return {title:'장비 강화가 먼저입니다',desc:`현재 Lv.${lv}. 무기 +${g.weapon}, 방어구 +${g.armor}입니다. 재료를 모아 장비를 강화하면 사냥 속도와 생존력이 크게 좋아집니다.`,action:'workshop',label:'장비 제작·강화'};
 if(lv<5)return {title:'청운들판에서 기본 전투 익히기',desc:'퀘스트를 따라가며 요괴를 잡고 Lv.5를 목표로 하세요. 자동사냥을 켜도 됩니다.',action:'field',label:'청운들판 이동'};
 if(lv<10)return {title:'흑철광산에서 흑철광석 모으기',desc:'Lv.5부터 흑철광산이 핵심 성장 구간입니다. 광석을 모아 무기와 방어구를 함께 강화하세요.',action:'mine',label:'흑철광산 이동'};
 if(!chapter3Done(s))return {title:'월영숲과 메인퀘스트 3장 진행',desc:'Lv.10 이후에는 월영숲에서 월광결정을 모으고 3장 보스까지 완료하는 것이 다음 목표입니다.',action:'forest',label:'월영숲 이동'};
 if(lv<15)return {title:'Lv.15까지 월영숲에서 성장',desc:'4장과 봉인동굴은 Lv.15부터 열립니다. 정예몹, 월드보스, 전리품 재련을 활용하세요.',action:'forest',label:'월영숲 사냥'};
 if(ch4===0)return {title:'메인퀘스트 4장 시작',desc:'촌장 백운의 밀명을 받아 봉인동굴 콘텐츠를 해금하세요.',action:'quest',label:'4장 퀘스트 열기'};
 if(ch4>=1&&ch4<=3)return {title:'봉인동굴 공략 중',desc:'봉인수하 12마리를 처치한 뒤 봉인파괴자를 격파하세요. 던전 안에서도 자동사냥을 사용할 수 있습니다.',action:'dungeon',label:'봉인동굴 입장'};
 if(ch4===4)return {title:'백운에게 4장 결과 보고',desc:'봉인동굴 정화 결과를 보고하면 반복 던전과 봉인수호 세트 성장이 본격적으로 시작됩니다.',action:'quest',label:'퀘스트 이동'};
 return {title:'봉인동굴 반복 정화와 특성 성장',desc:'봉인의 핵을 모아 세트 축복을 해금하고, 레벨·클리어 보상으로 받은 특성 포인트를 투자하세요.',action:'dungeon',label:'봉인동굴 재도전'};
}

function perform(action:GuideAction){
 closeGuide();
 if(action==='none')return;
 if(action==='inventory'){document.querySelector<HTMLButtonElement>('#inventory-button')?.click();return;}
 if(action==='workshop'){document.querySelector<HTMLButtonElement>('#workshop-enter')?.click();return;}
 if(action==='auto'){document.querySelector<HTMLButtonElement>('#jw-auto-hunt')?.click();return;}
 if(action==='quest'){const q=document.querySelector<HTMLButtonElement>('.jw14-quest-button');if(q&&!q.classList.contains('hidden'))q.click();else document.querySelector<HTMLElement>('#quest-panel')?.click();return;}
 if(action==='dungeon'){document.querySelector<HTMLButtonElement>('.jw14-dungeon-button')?.click();return;}
 const btn=document.querySelector<HTMLButtonElement>(`[data-zone="${action}"]`);btn?.click();
}

function checklist(s:any){
 const lv=level(s),g=gear(s),r=resources(s),kills=Number(s?.kills||0),ch3=chapter3Done(s),ch4=chapter4State(s);
 const rows=[
  [!!s,'백운성 입장','캐릭터 생성 후 첫 접속'],
  [kills>=1,'첫 요괴 처치','공격 또는 자동사냥으로 몬스터 1마리 처치'],
  [lv>=5,'Lv.5 달성','흑철광산 입장 조건'],
  [g.weapon>=1,'첫 무기 제작','흑철광석과 목재로 제작'],
  [g.armor>=1,'첫 방어구 제작','흑철광석과 월광결정으로 제작'],
  [Number(r.ore||0)>=5||g.weapon>=2,'흑철광석 활용','채집 재료를 장비 성장에 사용'],
  [lv>=10,'Lv.10 달성','월영숲 입장 조건'],
  [ch3,'메인퀘스트 3장 완료','월영 봉인수호자 격파'],
  [lv>=15,'Lv.15 달성','봉인동굴 입장 조건'],
  [ch4>=5,'메인퀘스트 4장 완료','봉인동굴 정화와 반복 성장 해금']
 ] as [boolean,string,string][];
 return `<div class="jw15-checks">${rows.map(([done,title,desc])=>`<div class="jw15-check ${done?'done':''}"><i>${done?'✓':'·'}</i><div><b>${title}</b><small>${desc}</small></div><em>${done?'완료':'진행'}</em></div>`).join('')}</div>`;
}

const pages:{id:string;icon:string;name:string;title:string;lead:string;body:()=>string}[]=[
 {id:'start',icon:'★',name:'처음 10분',title:'처음 10분 가이드',lead:'처음 접속했다면 아래 순서만 따라가도 막히지 않습니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card wide"><h4>추천 성장 동선</h4><div class="jw15-roadmap"><div class="jw15-road"><b>Lv.1~4</b><span>백운성 → 청운들판 · 메인퀘스트와 기본 전투 익히기</span></div><div class="jw15-road"><b>Lv.5~9</b><span>흑철광산 · 흑철광석 채집 → 무기/방어구 강화</span></div><div class="jw15-road"><b>Lv.10~14</b><span>월영숲 · 월광결정, 정예몹, 메인퀘스트 3장</span></div><div class="jw15-road"><b>Lv.15+</b><span>메인퀘스트 4장 → 봉인동굴 → 특성/세트 축복 성장</span></div></div></section><section class="jw15-guide-card"><h4>퀘스트는 클릭하면 이동</h4><p>우측 퀘스트 박스를 누르면 목표 NPC나 지역으로 자동이동합니다. 퀘스트 이동을 시작하면 자동사냥은 방해하지 않도록 정리됩니다.</p></section><section class="jw15-guide-card"><h4>막히면 자동사냥</h4><p>화면 하단 <b>자동사냥</b> 또는 <span class="jw15-key">R</span>을 누르면 레벨에 맞는 사냥터로 이동해 가까운 몬스터를 자동 추적합니다.</p></section></div>`},
 {id:'controls',icon:'⌨',name:'조작',title:'조작 방법',lead:'PC와 모바일 모두 같은 캐릭터를 조작할 수 있습니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>PC</h4><p><span class="jw15-key">WASD</span> / 방향키 이동<br><span class="jw15-key">SPACE</span> 기본 공격<br><span class="jw15-key">Q</span> 주력 스킬<br><span class="jw15-key">F</span> 보조 스킬<br><span class="jw15-key">E</span> NPC/채집 행동<br><span class="jw15-key">I</span> 가방<br><span class="jw15-key">R</span> 자동사냥<br><span class="jw15-key">H</span> 가이드북</p></section><section class="jw15-guide-card"><h4>모바일</h4><p>화면을 누른 뒤 원하는 방향으로 드래그하면 이동합니다. 전투 버튼 도크에서 자동사냥과 스킬을 사용하고, 퀘스트 박스는 직접 눌러 자동이동할 수 있습니다.</p></section><section class="jw15-guide-card wide"><h4>직접 조작 우선</h4><p>자동사냥 중 캐릭터를 직접 드래그하면 자동사냥이 해제되어 손 조작이 우선됩니다. 자동이동과 수동이동이 서로 싸우지 않도록 만든 구조입니다.</p></section></div>`},
 {id:'growth',icon:'▲',name:'성장',title:'레벨과 성장',lead:'레벨만 올리는 것보다 장비·재료·퀘스트를 같이 올리는 것이 빠릅니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>레벨 구간</h4><p>Lv.5 흑철광산, Lv.10 월영숲, Lv.15 봉인동굴 순으로 콘텐츠가 열립니다. 상위 지역은 경험치와 재료 보상이 더 좋습니다.</p></section><section class="jw15-guide-card"><h4>장비 강화</h4><p>무기와 방어구를 같이 올리세요. 공격력만 높고 방어가 낮으면 자동사냥 안정성이 떨어집니다.</p></section><section class="jw15-guide-card"><h4>전리품 재련</h4><p>사냥에서 얻는 장비 파편 10개로 무기 또는 방어구를 +1 재련할 수 있습니다. 가방 안의 재련 메뉴를 확인하세요.</p></section><section class="jw15-guide-card"><h4>특성</h4><p>Lv.5 이후 일정 레벨마다, 그리고 봉인동굴 클리어로 특성 포인트를 얻습니다. 가방의 직업 성장 메뉴에서 투자합니다.</p></section></div>`},
 {id:'combat',icon:'⚔',name:'전투',title:'전투와 스킬',lead:'기본 공격만 반복하지 말고 Q/F 스킬과 자동물약을 함께 활용하세요.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>주력 스킬 Q</h4><p>검객 월광참, 도사 천뢰진, 궁사 관통시. 자동사냥 중에도 쿨타임마다 자동으로 사용됩니다.</p></section><section class="jw15-guide-card"><h4>보조 스킬 F</h4><p>Lv.8부터 사용하는 두 번째 직업 스킬입니다. Lv.14 / Lv.20에서 단계가 상승합니다.</p></section><section class="jw15-guide-card"><h4>보스 경고</h4><p>붉은 공격 예고 범위가 보이면 즉시 벗어나세요. 보스는 체력이 낮아지면 격노해 공격 주기가 빨라질 수 있습니다.</p></section><section class="jw15-guide-card"><h4>자동물약</h4><p>가방에서 자동물약 ON/OFF가 가능합니다. 기본 설정은 HP 40% 이하에서 사용하며, 물약이 완전히 떨어지기 전에 보충하는 것이 좋습니다.</p></section></div>`},
 {id:'craft',icon:'⚒',name:'제작',title:'채집과 제작',lead:'사냥만 하는 것보다 보이는 채집물을 챙겨두면 장비 성장 속도가 빨라집니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>청심초</h4><p>회복약의 핵심 재료입니다. 자동사냥 장시간 운용 전에 여유 있게 모아두세요.</p></section><section class="jw15-guide-card"><h4>목재</h4><p>초중반 무기 제작에 사용합니다. 초반에는 버리지 말고 계속 모으는 편이 좋습니다.</p></section><section class="jw15-guide-card"><h4>흑철광석</h4><p>무기·방어구 성장의 핵심 재료. Lv.5 흑철광산에서 집중적으로 확보합니다.</p></section><section class="jw15-guide-card"><h4>월광결정</h4><p>상위 방어구와 후반 콘텐츠에 사용합니다. 월영숲과 보스 보상에서 확보하세요.</p></section><section class="jw15-guide-card wide"><h4>제작소</h4><p>하단 지역 메뉴의 <b>⚒ 제작소</b>에서 단계별 장비를 제작합니다. 상위 장비는 이전 단계 제작이 선행되는 경우가 있습니다.</p></section></div>`},
 {id:'auto',icon:'◎',name:'자동사냥',title:'자동사냥 사용법',lead:'자동사냥은 편의 기능이지만 물약과 장비가 부족하면 멈출 수 있습니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>자동 사냥터 선택</h4><p>Lv.1~4 청운들판 → Lv.5~9 흑철광산 → Lv.10+ 월영숲을 우선 선택합니다. 봉인동굴에서는 던전 몬스터를 계속 추적합니다.</p></section><section class="jw15-guide-card"><h4>자동 전투</h4><p>가까운 몬스터 탐색 → 접근 → 공격 → 다음 몬스터 탐색 순서로 반복하며 Q/F 스킬도 자동 사용합니다.</p></section><section class="jw15-guide-card"><h4>안전 귀환</h4><p>HP가 위험한데 회복약이 없으면 자동사냥을 끄고 백운성으로 귀환하도록 안전장치가 작동합니다.</p></section><section class="jw15-guide-card"><h4>자동 줍기</h4><p>가방에서 자동 줍기를 켜두면 사냥 전리품을 놓치는 일이 줄어듭니다.</p></section></div>`},
 {id:'dungeon',icon:'封',name:'던전',title:'봉인동굴과 후반 성장',lead:'Lv.15 이후부터 반복 던전이 장비와 특성 성장의 중심이 됩니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card wide"><h4>봉인동굴 공략</h4><ol><li>메인퀘스트 3장 완료 + Lv.15 달성</li><li>촌장 백운에게 4장 시작</li><li>봉인수하 12마리 처치</li><li>봉인파괴자 귀령 격파</li><li>봉인의 핵 회수 후 백운에게 보고</li></ol></section><section class="jw15-guide-card"><h4>봉인의 핵</h4><p>반복 정화의 핵심 보상입니다. 1/3/6개 구간에서 봉인수호 세트 축복이 차례대로 활성화됩니다.</p></section><section class="jw15-guide-card"><h4>특성 포인트</h4><p>공격·생존·전리품 계열 중 원하는 방향으로 투자할 수 있습니다. 초기에는 생존 1단계를 먼저 찍는 것도 안정적입니다.</p></section></div>`},
 {id:'faq',icon:'?',name:'도움말',title:'자주 막히는 부분',lead:'게임이 진행되지 않을 때 가장 먼저 확인할 항목입니다.',body:()=>`<div class="jw15-guide-grid"><section class="jw15-guide-card"><h4>퀘스트를 어디서 해야 하나요?</h4><p>우측 퀘스트 박스를 눌러보세요. 가능한 목표라면 자동이동하거나 필요한 지역으로 안내합니다.</p></section><section class="jw15-guide-card"><h4>자동사냥 버튼이 안 보여요</h4><p>화면 하단 전투 도크에 있습니다. PC에서는 <span class="jw15-key">R</span>로도 바로 켤 수 있습니다.</p></section><section class="jw15-guide-card"><h4>새 지역이 잠겨 있어요</h4><p>흑철광산 Lv.5, 월영숲 Lv.10, 봉인동굴 Lv.15 조건을 확인하세요. 일부 콘텐츠는 메인퀘스트 완료도 필요합니다.</p></section><section class="jw15-guide-card"><h4>사냥이 너무 아파요</h4><p>방어구 강화, 회복약 보충, 자동물약 ON 상태를 확인하고 한 단계 낮은 사냥터에서 재료를 더 모으세요.</p></section><section class="jw15-guide-card wide"><h4>화면이 이상하게 겹쳐 보여요</h4><p>모바일 화면 회전 직후라면 세로/가로 방향을 고정한 뒤 한 번 새로고침하세요. UI는 화면 크기에 맞춰 다시 배치됩니다.</p></section></div>`}
];

function pageHtml(id:string){const p=pages.find(x=>x.id===id)||pages[0];const s=readSave(),rec=recommendation(s);const meta=s?`<div class="jw15-now-meta"><span>Lv.${level(s)}</span><span>무기 +${gear(s).weapon}</span><span>방어구 +${gear(s).armor}</span><span>회복약 ${Number(s.potions||0)}</span><span>처치 ${Number(s.kills||0)}</span></div>`:'';const now=id==='start'?`<section class="jw15-now-card"><div class="jw15-now-label">NOW · 현재 추천</div><h3>${rec.title}</h3><p>${rec.desc}</p>${meta}<button class="jw15-now-action" data-jw15-action="${rec.action}">${rec.label}</button></section>`:'';const checks=id==='start'?`<section class="jw15-guide-card wide"><h4>초보자 성장 체크리스트</h4>${checklist(s)}</section>`:'';return `<h2 class="jw15-guide-title">${p.title}</h2><p class="jw15-guide-lead">${p.lead}</p>${now}${p.body()}${checks}<div class="jw15-guide-tip">팁 · 가이드북은 게임 진행 상태를 읽어 계속 갱신됩니다. 성장 후 다시 열면 현재 추천 목표도 달라집니다.</div><div class="jw15-guide-footer">JUNJA WORLD 초보자 가이드 · H 키로 열기/닫기</div>`;}

function createGuide(){
 if(document.querySelector('.jw15-guide-layer'))return;
 const layer=document.createElement('section');layer.className='jw15-guide-layer hidden';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','JUNJA WORLD 초보자 가이드북');
 layer.innerHTML=`<div class="jw15-guide-shell"><nav class="jw15-guide-nav"><div class="jw15-guide-brand"><i>準</i><div><b>모험가 길잡이</b><small>JUNJA WORLD GUIDE</small></div></div><div class="jw15-guide-tabs">${pages.map((p,i)=>`<button class="jw15-guide-tab ${i===0?'active':''}" data-jw15-tab="${p.id}"><span>${p.icon}</span>${p.name}</button>`).join('')}</div><div class="jw15-guide-shortcut"><b>빠른 단축키</b><br>H 가이드 · I 가방 · R 자동사냥<br>Q 주력스킬 · F 보조스킬</div></nav><div class="jw15-guide-main"><header class="jw15-guide-head"><input class="jw15-guide-search" placeholder="현재 페이지에서 검색" aria-label="가이드 검색"/><button class="jw15-guide-close" aria-label="닫기">×</button></header><div class="jw15-guide-content"><article class="jw15-guide-page active" data-jw15-page="start"></article></div></div></div>`;
 document.body.appendChild(layer);
 const content=layer.querySelector<HTMLElement>('.jw15-guide-content')!;
 let current='start';
 const render=(id:string)=>{current=id;content.innerHTML=`<article class="jw15-guide-page active" data-jw15-page="${id}">${pageHtml(id)}</article>`;layer.querySelectorAll('.jw15-guide-tab').forEach(x=>x.classList.toggle('active',(x as HTMLElement).dataset.jw15Tab===id));const input=layer.querySelector<HTMLInputElement>('.jw15-guide-search');if(input)input.value='';content.scrollTop=0;};
 layer.querySelectorAll<HTMLButtonElement>('.jw15-guide-tab').forEach(b=>b.onclick=()=>render(b.dataset.jw15Tab||'start'));
 layer.querySelector<HTMLButtonElement>('.jw15-guide-close')!.onclick=closeGuide;
 layer.addEventListener('click',e=>{const t=e.target as HTMLElement;const action=t.closest<HTMLElement>('[data-jw15-action]')?.dataset.jw15Action as GuideAction|undefined;if(action)perform(action);if(t===layer)closeGuide();});
 layer.querySelector<HTMLInputElement>('.jw15-guide-search')!.addEventListener('input',e=>{const q=(e.target as HTMLInputElement).value.trim().toLowerCase();const article=content.querySelector<HTMLElement>('.jw15-guide-page');if(!article)return;article.querySelectorAll<HTMLElement>('.jw15-guide-card,.jw15-now-card,.jw15-guide-tip').forEach(card=>{card.style.display=!q||card.textContent?.toLowerCase().includes(q)?'':'none';});});
 (layer as any).__jw15Render=()=>render(current);
}

function addButton(){const top=document.querySelector<HTMLElement>('.top-bar');if(!top||top.querySelector('.jw15-guide-button'))return;const b=document.createElement('button');b.className='jw15-guide-button';b.type='button';b.innerHTML='? 가이드 <kbd>H</kbd>';b.onclick=openGuide;const reset=top.querySelector('#reset-save');reset?.before(b)??top.appendChild(b);}
function openGuide(){createGuide();const layer=document.querySelector<HTMLElement>('.jw15-guide-layer');if(!layer)return;(layer as any).__jw15Render?.();layer.classList.remove('hidden');localStorage.setItem(SEEN_KEY,'1');window.setTimeout(()=>layer.querySelector<HTMLInputElement>('.jw15-guide-search')?.focus(),80);}
function closeGuide(){document.querySelector<HTMLElement>('.jw15-guide-layer')?.classList.add('hidden');}
function toggleGuide(){const layer=document.querySelector<HTMLElement>('.jw15-guide-layer');if(!layer||layer.classList.contains('hidden'))openGuide();else closeGuide();}

let autoOpened=false;
function tick(){addButton();if(!autoOpened&&gameActive()&&!localStorage.getItem(SEEN_KEY)){autoOpened=true;window.setTimeout(()=>{if(gameActive())openGuide();},900);}}
function boot(){createGuide();tick();window.setInterval(tick,500);window.addEventListener('keydown',e=>{if(e.code==='KeyH'&&!isTyping(e.target)){e.preventDefault();toggleGuide();}else if(e.code==='Escape')closeGuide();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
