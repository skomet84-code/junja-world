import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep PostgreSQL/Neon, but never allow a dead DB connection to freeze the web process forever.
process.env.PGCONNECT_TIMEOUT=process.env.PGCONNECT_TIMEOUT||'6';
process.env.PGOPTIONS=process.env.PGOPTIONS||'-c statement_timeout=8000';

try {
  await import('./index.mjs');
} catch (error) {
  console.error('[RECOVERY BOOT] primary server failed to start:', error?.stack || error);

  const app = express();
  const port = process.env.PORT || 3000;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, game: 'JUNJA WORLD', version: '2.8.6', degraded: true, recovery: 'static' });
  });
  app.use(express.static(path.join(root, 'dist'), { maxAge: '0', etag: false }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(root, 'dist', 'index.html'));
  });
  app.listen(port, '0.0.0.0', () => console.log(`[RECOVERY BOOT] JUNJA WORLD static recovery server is running on port ${port}`));
}
