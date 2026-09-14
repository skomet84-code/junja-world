import './inventory-v11.css';
import { HERO_CLASSES, type HeroClass } from '../shared/constants';

const weapons:Record<HeroClass,string[]>={
  warrior:['수련 철검','청운 장검','흑철 장검','월영도','백운 수호검'],
  mage:['수련 지팡이','청운 법장','흑철 영장','월영 신장','백운 천령장'],
  ranger:['수련 활','청운 장궁','흑철 강궁','월영궁','백운 신궁']
};
const armors=['수련 가죽갑','청운 철갑','흑철 중갑','월영 갑주','백운 수호갑'];
const grades=['','일반','고급','희귀','영웅','전설'];
const rareNames:Record<string,string>={cloudCharm:'청운의 호부',blackIronBlade:'흑철귀검',moonRing:'월영 수호반지'};
function readSave():any{try{return JSON.parse(localStorage.getItem('junja-world-v01')||'null');}catch{return null;}}
function grade(tier:number){return Math.max(1,Math.min(5,tier||1));}
function slot(icon:string,name:string,sub:string,tier=1,empty=false){return `<div class="jw-item-slot grade-${grade(tier)}${empty?' empty':''}"><span class="icon">${icon}</span><b>${name}</b><small>${sub}</small></div>`;}
function createOverview(){const inventory=document.querySelector<HTMLElement>('#inventory-panel');const equip=document.querySelector<HTMLElement>('#equip-text');if(!inventory||!equip||inventory.querySelector('.jw-inventory-overview'))return;const box=document.createElement('section');box.className='jw-inventory-overview';equip.insertAdjacentElement('afterend',box);}
function render(){createOverview();const box=document.querySelector<HTMLElement>('.jw-inventory-overview');const s=readSave();if(!box||!s)return;const hero=(s.heroClass||'warrior') as HeroClass;const wt=Number(s.weaponLevel||0),at=Number(s.armorLevel||0);const weapon=wt>0?weapons[hero][Math.min(4,wt-1)]:'빈 무기 슬롯';const armor=at>0?armors[Math.min(4,at-1)]:'빈 방어구 슬롯';const rares=Array.isArray(s.rareItems)?s.rareItems:[];const accessory=rares.length?rareNames[rares[rares.length-1]]||'희귀 장신구':'빈 장신구 슬롯';const weaponGrade=grade(wt),armorGrade=grade(at);const baseAtk=HERO_CLASSES[hero]?.attack||20;const atk=baseAtk+Math.max(0,Number(s.level||1)-1)*5+wt*5+(rares.includes('blackIronBlade')?14:0)+(rares.includes('cloudCharm')?6:0)+(rares.includes('moonRing')?10:0);const hp=(HERO_CLASSES[hero]?.maxHp||100)+Math.max(0,Number(s.level||1)-1)*14+at*16+(rares.includes('cloudCharm')?20:0)+(rares.includes('moonRing')?55:0);const score=Math.round(atk*7+hp*1.6+wt*42+at*38+rares.length*120);
  box.innerHTML=`<div class="jw-loadout-head"><b>${HERO_CLASSES[hero]?.label||'모험가'} 장비 세트</b><span>전투력 ${score.toLocaleString()}</span></div><div class="jw-loadout-grid">${slot(hero==='ranger'?'弓':hero==='mage'?'杖':'劍',weapon,wt?`${grades[weaponGrade]} · +${wt}`:'장착 필요',weaponGrade,!wt)}${slot('甲',armor,at?`${grades[armorGrade]} · +${at}`:'장착 필요',armorGrade,!at)}${slot('符',accessory,rares.length?`${rares.length}종 희귀 효과`:'보스에서 획득',Math.min(5,2+rares.length),!rares.length)}${slot('藥',`회복약 ×${Number(s.potions||0)}`,'HP +65',1,Number(s.potions||0)===0)}</div><div class="jw-material-title">재료 가방</div><div class="jw-material-grid"><div class="jw-material-slot"><b>${Number(s.resources?.wood||0)}</b><small>목재</small></div><div class="jw-material-slot"><b>${Number(s.resources?.herb||0)}</b><small>청심초</small></div><div class="jw-material-slot"><b>${Number(s.resources?.ore||0)}</b><small>흑철광석</small></div><div class="jw-material-slot"><b>${Number(s.resources?.crystal||0)}</b><small>월광결정</small></div><div class="jw-material-slot"><b>${Number(s.gold||0)}</b><small>엽전</small></div></div><div class="jw-power-line"><span>공격력<b>${atk}</b></span><span>최대 체력<b>${hp}</b></span><span>희귀 장비<b>${rares.length}/3</b></span></div>${rares.length?`<div style="padding:6px 8px">${rares.map((r:string)=>`<span class="jw-rare-chip">★ ${rareNames[r]||r}</span>`).join('')}</div>`:''}`;
}
function boot(){createOverview();render();window.setInterval(render,650);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
