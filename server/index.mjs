import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 3000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

app.disable('x-powered-by');
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, game: 'JUNJA WORLD', version: '0.2.0' }));
app.use(express.static(path.join(root, 'dist'), { maxAge: '1h' }));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));

app.listen(port, () => console.log(`JUNJA WORLD is running on port ${port}`));
