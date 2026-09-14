import './v08.css';

function q<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function createWorldFx() {
  if (document.querySelector('.jw-world-fx')) return;
  const fx = document.createElement('div');
  fx.className = 'jw-world-fx';

  const hour = new Date().getHours();
  if (hour >= 19 || hour < 5) fx.classList.add('night');
  else if (hour < 8 || hour >= 17) fx.classList.add('dawn');

  for (let i = 0; i < 18; i += 1) {
    const mote = document.createElement('i');
    mote.className = 'mote';
    mote.style.left = `${Math.random() * 100}%`;
    mote.style.top = `${30 + Math.random() * 70}%`;
    mote.style.animationDuration = `${6 + Math.random() * 8}s`;
    mote.style.animationDelay = `${-Math.random() * 12}s`;
    mote.style.opacity = `${0.25 + Math.random() * 0.55}`;
    fx.appendChild(mote);
  }
  document.body.appendChild(fx);
}

function addPaperDoll() {
  const inventory = q<HTMLElement>('#inventory-panel');
  const summary = q<HTMLElement>('#resource-text');
  if (!inventory || !summary || inventory.querySelector('.jw-paperdoll')) return;

  const wrap = document.createElement('div');
  wrap.className = 'jw-paperdoll';
  wrap.setAttribute('aria-label', '장비 미리보기');
  wrap.innerHTML = `
    <div class="slot s1">兜<small>머리</small></div>
    <div class="slot s2">衣<small>갑옷</small></div>
    <div class="slot s3">劍<small>무기</small></div>
    <div class="slot s4">符<small>장신구</small></div>
    <div class="jw-avatar">
      <span class="hair"></span><span class="head"></span><span class="body"></span>
      <span class="armor"></span><span class="belt"></span><span class="leg l"></span>
      <span class="leg r"></span><span class="weapon"></span>
    </div>`;
  summary.insertAdjacentElement('afterend', wrap);
}

const zoneNames: Record<string, string> = {
  village: '백운성',
  field: '청운들판',
  mine: '흑철광산',
  forest: '월영숲'
};

function createZoneTitle() {
  if (document.querySelector('.jw-zone-title')) return;
  const title = document.createElement('div');
  title.className = 'jw-zone-title';
  title.innerHTML = '<b>백운성</b><small>JUNJA WORLD</small>';
  document.body.appendChild(title);

  let hideTimer = 0;
  const show = (label: string) => {
    const b = title.querySelector('b');
    if (b) b.textContent = label;
    title.classList.add('show');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => title.classList.remove('show'), 2200);
  };

  document.querySelectorAll<HTMLButtonElement>('[data-zone]').forEach((button) => {
    button.addEventListener('click', () => {
      const zone = button.dataset.zone || 'village';
      window.setTimeout(() => show(zoneNames[zone] || zone), 120);
    });
  });

  window.setTimeout(() => show('백운성'), 900);
}

function improveQuestFeedback() {
  const panel = q<HTMLElement>('#quest-panel');
  if (!panel || panel.dataset.v08Bound === '1') return;
  panel.dataset.v08Bound = '1';
  panel.addEventListener('pointerdown', () => panel.classList.add('pressed'));
  const clear = () => panel.classList.remove('pressed');
  panel.addEventListener('pointerup', clear);
  panel.addEventListener('pointerleave', clear);
}

function setVersionLabels() {
  document.querySelectorAll<HTMLElement>('.login-footer span').forEach((node) => {
    if (node.textContent?.includes('JUNJA WORLD')) node.textContent = 'JUNJA WORLD v0.8.0';
  });
}

function bootVisualRebuild() {
  createWorldFx();
  addPaperDoll();
  createZoneTitle();
  improveQuestFeedback();
  setVersionLabels();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootVisualRebuild, { once: true });
} else {
  bootVisualRebuild();
}
