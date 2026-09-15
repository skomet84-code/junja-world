export type LegacySave = {
  name?: string;
  level?: number;
  gold?: number;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  classId?: string;
  map?: string;
  weaponLevel?: number;
  armorLevel?: number;
  [key: string]: unknown;
};

const LEGACY_SAVE_KEY = 'junja-world-v01';

export function readLegacySave(): LegacySave | null {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    return raw ? JSON.parse(raw) as LegacySave : null;
  } catch {
    return null;
  }
}

export function legacyProfile() {
  const s = readLegacySave();
  return {
    name: String(s?.name || '준자'),
    level: Math.max(1, Number(s?.level || 10)),
    gold: Math.max(0, Number(s?.gold || 0)),
    classId: String(s?.classId || 'swordsman'),
    map: String(s?.map || '백운성'),
    hp: Math.max(1, Number(s?.hp || 126)),
    maxHp: Math.max(1, Number(s?.maxHp || 246)),
    mp: Math.max(0, Number(s?.mp || 544)),
    maxMp: Math.max(1, Number(s?.maxMp || 1000))
  };
}

export async function worldApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? {'Content-Type': 'application/json'} : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as any)?.error || '서버 요청에 실패했습니다.');
  return body as T;
}
