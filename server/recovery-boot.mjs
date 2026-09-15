import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const originalDatabaseUrl=String(process.env.DATABASE_URL||'').trim();

async function preflightDatabase(){
  if(!originalDatabaseUrl)return;
  let client;
  try{
    const {Client}=await import('pg');
    client=new Client({
      connectionString:originalDatabaseUrl,
      ssl:/sslmode=require|neon\.tech/i.test(originalDatabaseUrl)?{rejectUnauthorized:false}:undefined,
      connectionTimeoutMillis:4500,
      query_timeout:5000
    });
    await client.connect();
    await client.query('SELECT 1');
    console.log('[RECOVERY BOOT] Neon/PostgreSQL preflight OK.');
  }catch(error){
    console.error('[RECOVERY BOOT] Neon preflight failed; booting with local fallback:',error?.message||error);
    delete process.env.DATABASE_URL;
  }finally{
    try{await client?.end();}catch{}
  }
}

await preflightDatabase();

try {
  await import('./index.mjs');
} catch (error) {
  console.error('[RECOVERY BOOT] primary server failed to start:', error?.stack || error);

  const app = express();
  const port = process.env.PORT || 10000;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, game: 'JUNJA WORLD', version: '2.9.1', degraded: true, recovery: 'static' });
  });
  app.use(express.static(path.join(root, 'dist'), { maxAge: '0', etag: false }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(root, 'dist', 'index.html'));
  });
  app.listen(port, '0.0.0.0', () => console.log(`[RECOVERY BOOT] JUNJA WORLD static recovery server is running on port ${port}`));
}
