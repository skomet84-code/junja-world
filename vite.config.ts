import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';

function junjaCoreRendererFix(): Plugin {
  return {
    name: 'junja-core-renderer-v303',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/game-v06.ts')) return null;
      const stale = 'type: iosWebKit ? Phaser.CANVAS : Phaser.AUTO';
      if (!code.includes(stale)) {
        throw new Error('[JUNJA v3.0.3] expected stale iOS renderer selector was not found');
      }
      return {
        code: code.replace(stale, 'type: Phaser.AUTO'),
        map: null
      };
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [junjaCoreRendererFix()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v4: resolve(__dirname, 'v4.html')
      }
    }
  }
});
