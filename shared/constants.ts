export const GAME_TITLE = 'JUNJA WORLD';
export const GAME_VERSION = '2.8.6';
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1350;
export const PLAYER_SPEED = 230;

export type HeroClass = 'warrior' | 'mage' | 'ranger';

export const HERO_CLASSES: Record<HeroClass, { label: string; weapon: string; color: number; maxHp: number; attack: number }> = {
  warrior: { label: '검객', weapon: '수련용 목검', color: 0x4ea1ff, maxHp: 120, attack: 24 },
  mage: { label: '도사', weapon: '단풍 지팡이', color: 0xb46cff, maxHp: 92, attack: 31 },
  ranger: { label: '궁사', weapon: '초심자의 활', color: 0x49c987, maxHp: 104, attack: 27 }
};
