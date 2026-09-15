import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  await import('./index.mjs');
} catch (error) {
  console.error('[RECOVERY BOOT] primary server failed to start:', error?.stack || error);

  const app = express();
  const port = process.env.PORT || 3000;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  app.disable('x-powered-by');
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, game: 'JUNJA WORLD', version: '2.8.0', degraded: true });
  });
  app.use(express.static(path.join(root, 'dist'), { maxAge: '1h' }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
  app.listen(port, () => console.log(`[RECOVERY BOOT] JUNJA WORLD static recovery server is running on port ${port}`));
}
