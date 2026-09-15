import Phaser from 'phaser';
import './style.css';
import { legacyProfile } from './legacy';
import { V4WorldScene } from './world';

const profile = legacyProfile();
const app = document.querySelector<HTMLDivElement>('#v4-app');
if (!app) throw new Error('v4 app root missing');

app.innerHTML = `
<div class="jw4-shell">
  <header class="jw4-topbar">
    <div class="jw4-brand"><span>準</span><div><small>JUNJA WORLD v4</small><b>백운성</b></div></div>
    <div class="jw4-server"><i></i><span>NEW CLIENT PREVIEW</span></div>
    <button class="jw4-icon-btn" id="jw4-menu" type="button" aria-label="메뉴">☰</button>
  </header>
  <main class="jw4-stage">
    <div id="jw4-game"></div>
    <section class="jw4-character-card">
      <div class="jw4-face">準</div>
      <div class="jw4-char-main"><div><b>${profile.name}</b><span>Lv.${profile.level} 검객</span></div><div class="jw4-bars"><i class="hp"><span style="width:${Math.min(100,profile.hp/profile.maxHp*100)}%"></span><em>${profile.hp}/${profile.maxHp}</em></i><i class="mp"><span style="width:${Math.min(100,profile.mp/profile.maxMp*100)}%"></span><em>${profile.mp}/${profile.maxMp}</em></i></div></div>
    </section>
    <button class="jw4-quest-card" id="jw4-quest" type="button"><small>MAIN QUEST · 클릭 자동이동</small><strong>2장 · 그림자의 흔적</strong><span>경비 무진에게 가서 성 밖의 이상징후를 확인하자.</span><i>목표로 이동 →</i></button>
    <div class="jw4-location"><span>백운성 · 사람의 온기</span><small>경비대와 주민이 오가는 초보자 거점</small></div>
    <div class="jw4-actions"><button type="button" class="skill s1"><span>⚔</span><b>용아진 I</b><small>F</small></button><button type="button" class="skill s2"><span>✦</span><b>혈광연참 III</b><small>Q</small></button><button type="button" class="attack"><span>⚔</span><b>공격</b></button></div>
    <nav class="jw4-bottom"><button data-v4="quest"><span>◉</span>임무</button><button data-v4="map"><span>⌖</span>지도</button><button data-v4="boss"><span>♛</span>보스</button><button data-v4="bag"><span>□</span>가방</button><button data-v4="more"><span>•••</span>메뉴</button></nav>
    <div class="jw4-hint">화면을 누른 채 원하는 방향으로 드래그해서 이동</div>
  </main>
  <aside class="jw4-sheet" id="jw4-sheet" aria-hidden="true"><div class="jw4-sheet-card"><button id="jw4-sheet-close">×</button><small>JUNJA WORLD v4</small><h2>새 클라이언트 구조</h2><p>기존 캐릭터·레벨·아이템·퀘스트 규칙은 유지하고 화면과 조작만 처음부터 다시 만든다.</p><div class="jw4-sheet-grid"><div><b>기존 룰 유지</b><span>계정 / 저장 / 성장 / 제작 / 퀘스트 / 던전</span></div><div><b>새 렌더링</b><span>모바일 우선 · 단일 월드 씬 · 패치 레이어 제거</span></div><div><b>새 조작</b><span>드래그 이동 · 퀘스트 자동이동 · 터치 공격</span></div><div><b>새 디자인</b><span>한국 판타지 · 고급 2D · 장비 외형 일체화</span></div></div></div></aside>
  <div class="jw4-toast" id="jw4-toast"></div>
</div>`;

const toast = (text:string) => {
  const el = document.querySelector<HTMLElement>('#jw4-toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  window.setTimeout(()=>el.classList.remove('show'),1800);
};

const scene = new V4WorldScene({
  onTarget: label => toast(`${label}에게 도착했어.`)
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jw4-game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#13261e',
  transparent: false,
  scene: [scene],
  scale: {mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH},
  render: {antialias:true, pixelArt:false, roundPixels:true}
});

const sheet=document.querySelector<HTMLElement>('#jw4-sheet');
const openSheet=()=>{sheet?.classList.add('open');sheet?.setAttribute('aria-hidden','false')};
const closeSheet=()=>{sheet?.classList.remove('open');sheet?.setAttribute('aria-hidden','true')};
document.querySelector('#jw4-menu')?.addEventListener('click',openSheet);
document.querySelector('#jw4-sheet-close')?.addEventListener('click',closeSheet);
sheet?.addEventListener('click',e=>{if(e.target===sheet)closeSheet()});
document.querySelector('#jw4-quest')?.addEventListener('click',()=>scene.goToQuest());
document.querySelectorAll<HTMLButtonElement>('[data-v4]').forEach(btn=>btn.addEventListener('click',()=>toast(`${btn.textContent?.trim()} 기능은 기존 룰과 연결 중이야.`)));
document.querySelectorAll<HTMLButtonElement>('.jw4-actions button').forEach(btn=>btn.addEventListener('click',()=>{btn.classList.add('pressed');setTimeout(()=>btn.classList.remove('pressed'),180);toast(btn.classList.contains('attack')?'기본 공격':'스킬 사용')}));
