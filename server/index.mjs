import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JUNJA_LAND_BASE = String(process.env.JUNJA_LAND_BASE_URL || 'https://junja-game-club.onrender.com').replace(/\/$/, '');
const LINK_WINDOW_MS = 60_000;
const LINK_MAX_ATTEMPTS = 8;
const linkAttempts = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    try { out[key] = decodeURIComponent(value); } catch { out[key] = value; }
  }
  return out;
}
function secureRequest(req) {
  return String(req.headers['x-forwarded-proto'] || '').includes('https') || req.secure;
}
function jcoinCookie(req, sid, maxAge = 60 * 60 * 24 * 14) {
  const secure = secureRequest(req) ? '; Secure' : '';
  return `jw_jcoin=${encodeURIComponent(sid || '')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}
function allowLinkAttempt(req) {
  const key = clientIp(req), now = Date.now();
  const prev = linkAttempts.get(key);
  if (!prev || now - prev.startedAt > LINK_WINDOW_MS) {
    linkAttempts.set(key, { startedAt: now, count: 1 });
    return true;
  }
  prev.count += 1;
  return prev.count <= LINK_MAX_ATTEMPTS;
}
async function landFetch(pathname, options = {}) {
  return fetch(`${JUNJA_LAND_BASE}${pathname}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
    ...options
  });
}
async function readJson(response) {
  try { return await response.json(); } catch { return {}; }
}
function extractSid(setCookie) {
  const match = String(setCookie || '').match(/(?:^|[,;]\s*)sid=([^;]+)/i);
  return match ? match[1].trim() : '';
}

app.get('/api/health', (_req, res) => res.json({ ok: true, game: 'JUNJA WORLD', version: '2.4.0', jcoinBridge: 'read-only' }));

app.post('/api/jcoin/link', async (req, res) => {
  if (!allowLinkAttempt(req)) return res.status(429).json({ error: '연결 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 20);
  const password = String(req.body?.password || '').slice(0, 72);
  if (!username || !password) return res.status(400).json({ error: '준자랜드 아이디와 비밀번호를 입력해주세요.' });
  try {
    const response = await landFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await readJson(response);
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 403 ? 403 : 401;
      return res.status(status).json({ error: data?.error || '준자랜드 계정을 확인할 수 없습니다.' });
    }
    const sid = extractSid(response.headers.get('set-cookie'));
    if (!sid) return res.status(502).json({ error: '준자랜드 연결 세션을 만들지 못했습니다.' });
    res.setHeader('Set-Cookie', jcoinCookie(req, sid));
    return res.json({ linked: true, jcoin: Number(data?.user?.balance || 0), nickname: String(data?.user?.nickname || '') });
  } catch (error) {
    console.error('[JCOIN LINK] JUNJA Land login bridge unavailable:', error?.message || error);
    return res.status(503).json({ error: '준자랜드 연결 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.get('/api/jcoin/wallet', async (req, res) => {
  const sid = readCookies(req).jw_jcoin;
  if (!sid) return res.json({ linked: false, jcoin: 0 });
  try {
    const response = await landFetch('/api/me', { headers: { Cookie: `sid=${sid}` } });
    const data = await readJson(response);
    if (response.status === 401 || response.status === 403) {
      res.setHeader('Set-Cookie', jcoinCookie(req, '', 0));
      return res.json({ linked: false, jcoin: 0, status: 'expired' });
    }
    if (!response.ok) return res.status(502).json({ error: '준자랜드 J-Coin 조회에 실패했습니다.' });
    return res.json({ linked: true, jcoin: Number(data?.user?.balance || 0), nickname: String(data?.user?.nickname || '') });
  } catch (error) {
    console.error('[JCOIN WALLET] JUNJA Land wallet lookup unavailable:', error?.message || error);
    return res.status(503).json({ error: '준자랜드 J-Coin 조회가 일시적으로 지연되고 있습니다.' });
  }
});

app.post('/api/jcoin/unlink', async (req, res) => {
  const sid = readCookies(req).jw_jcoin;
  res.setHeader('Set-Cookie', jcoinCookie(req, '', 0));
  if (sid) {
    try {
      await landFetch('/api/logout', { method: 'POST', headers: { Cookie: `sid=${sid}` } });
    } catch (error) {
      console.warn('[JCOIN UNLINK] remote session cleanup delayed:', error?.message || error);
    }
  }
  return res.json({ ok: true, linked: false });
});

app.use(express.static(path.join(root, 'dist'), { maxAge: '1h' }));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));

app.listen(port, () => console.log(`JUNJA WORLD is running on port ${port}`));
