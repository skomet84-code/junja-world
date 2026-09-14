type ResourceKey = 'wood' | 'herb' | 'ore' | 'crystal';
type HeroClass = 'warrior' | 'mage' | 'ranger';
type SaveData = {
  name: string; heroClass: HeroClass; level: number; gold: number; potions: number;
  weaponLevel: number; armorLevel: number; resources: Record<ResourceKey, number>;
};
type Recipe = {
  id: string; category: 'weapon' | 'armor' | 'potion'; tier: number; minLevel: number; gold: number;
  materials: Partial<Record<ResourceKey, number>>; name: (heroClass: HeroClass) => string;
  subtitle: string; stat: string; icon: string;
};

const SAVE_KEY = 'junja-world-v01';
const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const RESOURCE_NAMES: Record<ResourceKey, string> = { wood: '참나무 목재', herb: '청심초', ore: '흑철광석', crystal: '월광결정' };
const CLASS_WEAPONS: Record<HeroClass, string[]> = {
  warrior: ['수련 철검', '청운 장검', '흑철 장검', '월영도', '백운 수호검'],
  mage: ['수련 지팡이', '청운 법장', '흑철 영장', '월영 신장', '백운 천령장'],
  ranger: ['수련 활', '청운 장궁', '흑철 강궁', '월영궁', '백운 신궁']
};
const ARMOR_NAMES = ['수련 가죽갑', '청운 철갑', '흑철 중갑', '월영 갑주', '백운 수호갑'];
const LEVEL_REQ = [1, 3, 5, 8, 12];
const WEAPON_GOLD = [40, 80, 160, 300, 500];
const ARMOR_GOLD = [50, 100, 180, 320, 550];

const recipes: Recipe[] = [
  ...Array.from({ length: 5 }, (_, i): Recipe => ({
    id: `weapon-${i + 1}`, category: 'weapon', tier: i + 1, minLevel: LEVEL_REQ[i], gold: WEAPON_GOLD[i],
    materials: { ore: 2 + i * 2, wood: 2, crystal: i >= 3 ? i - 2 : 0 },
    name: heroClass => CLASS_WEAPONS[heroClass][i], subtitle: `무기 등급 ${i + 1}단계`, stat: `공격력 누적 +${(i + 1) * 5}`, icon: '⚔'
  })),
  ...Array.from({ length: 5 }, (_, i): Recipe => ({
    id: `armor-${i + 1}`, category: 'armor', tier: i + 1, minLevel: LEVEL_REQ[i], gold: ARMOR_GOLD[i],
    materials: { ore: 3 + i * 2, crystal: i >= 2 ? 1 : 0 },
    name: () => ARMOR_NAMES[i], subtitle: `방어구 등급 ${i + 1}단계`, stat: `체력 +${(i + 1) * 16} · 피해감소 +${(i + 1) * 4}%`, icon: '盾'
  })),
  { id: 'potion-basic', category: 'potion', tier: 0, minLevel: 1, gold: 20, materials: { herb: 3 }, name: () => '초급 회복약 ×2', subtitle: '소모품', stat: '사용 시 체력 +65', icon: '藥' }
];

const panel = $('#workshop-panel');
const openButton = $('#workshop-enter');
const closeButton = $('#workshop-close');
const list = $('#workshop-list');
const detail = $('#workshop-detail');
const materialSummary = $('#workshop-material-summary');
const tabButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-workshop-tab]')];
let activeTab: 'weapon' | 'armor' | 'potion' = 'weapon';
let selectedId = 'weapon-1';

function readSave(): SaveData | null {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as SaveData | null; } catch { return null; }
}
function currentZoneIsVillage() { return $('.zone strong').textContent?.startsWith('백운성') ?? false; }
function requiredEntries(recipe: Recipe) { return Object.entries(recipe.materials).filter(([, value]) => (value ?? 0) > 0) as [ResourceKey, number][]; }
function currentTier(save: SaveData, recipe: Recipe) { return recipe.category === 'weapon' ? save.weaponLevel : recipe.category === 'armor' ? save.armorLevel : 0; }
function isNextTier(save: SaveData, recipe: Recipe) { return recipe.category === 'potion' || recipe.tier === currentTier(save, recipe) + 1; }
function hasResources(save: SaveData, recipe: Recipe) { return requiredEntries(recipe).every(([key, amount]) => (save.resources?.[key] ?? 0) >= amount); }
function canCraft(save: SaveData, recipe: Recipe) { return save.level >= recipe.minLevel && save.gold >= recipe.gold && hasResources(save, recipe) && isNextTier(save, recipe); }
function gearStatus(save: SaveData, recipe: Recipe) {
  if (recipe.category === 'potion') return '';
  const tier = currentTier(save, recipe);
  if (tier >= recipe.tier) return '보유 완료';
  if (recipe.tier > tier + 1) return `${tier + 1}단계 장비부터 제작 필요`;
  return '';
}
function ownedMaterialText(save: SaveData, key: ResourceKey, amount: number) {
  const own = save.resources?.[key] ?? 0;
  return `<span class="material-chip ${own >= amount ? 'ok' : 'lack'}">${RESOURCE_NAMES[key]} <b>${own}/${amount}</b></span>`;
}
function render() {
  const save = readSave(); if (!save) return;
  materialSummary.innerHTML = `<b>보유 재료</b><span>목재 ${save.resources.wood}</span><span>청심초 ${save.resources.herb}</span><span>흑철광석 ${save.resources.ore}</span><span>월광결정 ${save.resources.crystal}</span><span>엽전 ${save.gold}</span>`;
  const filtered = recipes.filter(r => r.category === activeTab);
  if (!filtered.some(r => r.id === selectedId)) selectedId = filtered[0].id;
  list.innerHTML = filtered.map(recipe => {
    const owned = recipe.category !== 'potion' && currentTier(save, recipe) >= recipe.tier;
    const locked = recipe.category !== 'potion' && recipe.tier > currentTier(save, recipe) + 1;
    return `<button class="workshop-item ${selectedId === recipe.id ? 'selected' : ''} ${owned ? 'owned' : ''} ${locked ? 'sequence-lock' : ''}" data-recipe="${recipe.id}"><span class="workshop-item-icon">${recipe.icon}</span><span><b>${recipe.name(save.heroClass)}</b><small>${recipe.subtitle} · Lv.${recipe.minLevel}</small></span><em>${owned ? '보유' : recipe.gold + '냥'}</em></button>`;
  }).join('');
  list.querySelectorAll<HTMLButtonElement>('[data-recipe]').forEach(button => button.addEventListener('click', () => { selectedId = button.dataset.recipe!; render(); }));
  renderDetail(save, recipes.find(r => r.id === selectedId)!);
  tabButtons.forEach(button => button.classList.toggle('selected', button.dataset.workshopTab === activeTab));
}
function renderDetail(save: SaveData, recipe: Recipe) {
  const materials = requiredEntries(recipe).map(([key, amount]) => ownedMaterialText(save, key, amount)).join('');
  const status = gearStatus(save, recipe);
  let reason = '';
  if (status) reason = status;
  else if (save.level < recipe.minLevel) reason = `Lv.${recipe.minLevel}부터 제작 가능`;
  else if (save.gold < recipe.gold) reason = `엽전 ${recipe.gold - save.gold} 부족`;
  else if (!hasResources(save, recipe)) reason = '필요 재료가 부족합니다.';
  const buttonText = status === '보유 완료' ? '이미 보유 중' : recipe.category === 'potion' ? '재료 전달하고 조제' : '재료 전달하고 제작';
  detail.innerHTML = `<div class="workshop-preview ${recipe.category}"><div class="preview-glow"></div><strong>${recipe.icon}</strong><small>${recipe.category === 'weapon' ? 'WEAPON' : recipe.category === 'armor' ? 'ARMOR' : 'CONSUMABLE'}</small></div><div class="workshop-spec"><p class="workshop-eyebrow">백운 제작소 · ${recipe.subtitle}</p><h2>${recipe.name(save.heroClass)}</h2><p class="workshop-stat">${recipe.stat}</p><p class="workshop-desc">제작에 필요한 재료를 대장장이에게 전달하면 완성품을 받을 수 있습니다. 장비는 완성 즉시 착용 외형에 반영됩니다.</p><div class="material-requirements">${materials}</div><div class="craft-price"><span>제작비</span><b>${recipe.gold} 엽전</b></div>${reason ? `<div class="craft-reason">${reason}</div>` : ''}<button id="workshop-craft" ${canCraft(save, recipe) ? '' : 'disabled'}>${buttonText}</button></div>`;
  detail.querySelector<HTMLButtonElement>('#workshop-craft')?.addEventListener('click', () => craftRecipe(recipe));
}
function craftRecipe(recipe: Recipe) {
  const before = readSave(); if (!before || !canCraft(before, recipe)) { render(); return; }
  const backend = recipe.category === 'weapon' ? $('#craft-weapon') as HTMLButtonElement : recipe.category === 'armor' ? $('#craft-armor') as HTMLButtonElement : $('#craft-potion') as HTMLButtonElement;
  const beforeTier = currentTier(before, recipe); const beforePotions = before.potions;
  backend.click();
  window.setTimeout(() => {
    const after = readSave(); if (!after) return;
    const succeeded = recipe.category === 'potion' ? after.potions > beforePotions : currentTier(after, recipe) > beforeTier;
    if (!succeeded) { render(); return; }
    after.gold = Math.max(0, after.gold - recipe.gold);
    if (recipe.category === 'weapon' && recipe.tier >= 4) after.resources.crystal = Math.max(0, after.resources.crystal - (recipe.tier - 3));
    localStorage.setItem(SAVE_KEY, JSON.stringify(after));
    const result = $('#workshop-result');
    result.textContent = `완성! ${recipe.name(after.heroClass)} 제작 성공 · 장비를 적용합니다.`;
    result.classList.add('show');
    window.setTimeout(() => location.reload(), 650);
  }, 70);
}

openButton.addEventListener('click', () => {
  if (!currentZoneIsVillage()) {
    const toast = $('#toast'); toast.textContent = '제작소는 백운성 마을에서만 이용할 수 있습니다.'; toast.classList.remove('hidden'); window.setTimeout(() => toast.classList.add('hidden'), 2200); return;
  }
  const save = readSave();
  if (save) selectedId = `weapon-${Math.min(5, save.weaponLevel + 1)}`;
  panel.classList.remove('hidden'); render();
});
closeButton.addEventListener('click', () => panel.classList.add('hidden'));
tabButtons.forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.workshopTab as typeof activeTab; const save = readSave(); if (save) selectedId = activeTab === 'weapon' ? `weapon-${Math.min(5, save.weaponLevel + 1)}` : activeTab === 'armor' ? `armor-${Math.min(5, save.armorLevel + 1)}` : 'potion-basic'; render(); }));
panel.addEventListener('click', event => { if (event.target === panel) panel.classList.add('hidden'); });
