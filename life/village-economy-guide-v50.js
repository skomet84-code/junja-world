// v50 economy compass: display-only guidance; never mutates game state or money.
import {marketDay, ECONOMY_POLICY} from './economy-v28.js';
import {ENERGY_MAX,ENERGY_REGEN_SECONDS,ENERGY_COSTS} from './action-energy-v47.js';
export function villageEconomyGuideV50(now=new Date()){
 const market=marketDay(now);
 return Object.freeze({
  title:'💰 오늘의 마을 경제',
  market:market.name,
  currency:ECONOMY_POLICY.stableCoin,
  hints:Object.freeze([
   '① 농장에서 재료를 수확해 창고에 보관하기',
   '② 공방에서 재료를 가공해 가치 높이기',
   '③ 주민 주문으로 납품하거나 상점에서 판매하기',
   '④ 번 골드는 장비·집·시설에 재투자하기'
  ]),
  energy:'행동력 최대 '+ENERGY_MAX+' · '+Math.floor(ENERGY_REGEN_SECONDS/60)+'분마다 1 회복 (시험 경제)',
  costs:'심기 '+ENERGY_COSTS.plant+' · 수확 '+ENERGY_COSTS.harvest+' · 제작 '+ENERGY_COSTS.craft+' (시험)',
  warning:'정식 골드와 시험 사업·행동력 골드는 별도입니다. 이 안내 화면에서 재화나 저장 데이터는 변경되지 않습니다.'
 });
}
