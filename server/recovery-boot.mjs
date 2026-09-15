import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// EMERGENCY STARTUP MODE
// The production server currently waits for the external DB before binding a port.
// If that DB is unreachable, Render sees no listening port and the whole site stays down.
// Force the existing server onto its local SQLite fallback so the web service can boot.
const configuredDatabaseUrl = process.env.DATABASE_URL;
if (configuredDatabaseUrl) {
  console.warn('[RECOVERY BOOT] External DATABASE_URL temporarily bypassed to guarantee startup.');
  delete process.env.DATABASE_URL;
}

try {
  await import('./index.mjs');
} catch (error) {
  console.error('[RECOVERY BOOT] primary server failed to start:', error?.stack || error);

  const app = express();
  const port = process.env.PORT || 3000;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, game: 'JUNJA WORLD', version: '2.8.0', degraded: true, recovery: 'static' });
  });
  app.use(express.static(path.join(root, 'dist'), { maxAge: '0', etag: false }));
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(root, 'dist', 'index.html'));
  });
  app.listen(port, '0.0.0.0', () => console.log(`[RECOVERY BOOT] JUNJA WORLD static recovery server is running on port ${port}`));
}
