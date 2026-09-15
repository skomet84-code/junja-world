import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

async function enterLocalGame(page) {
  await page.addInitScript(() => sessionStorage.setItem('jw286-local-mode', '1'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await expect(page.locator('#auth-layer')).toBeVisible();
  await page.locator('#hero-name').fill('smokehero');
  await page.locator('[data-class="ranger"]').click();
  await page.locator('#enter-game').click();
  await expect(page.locator('#game-ui')).toBeVisible();
  await page.waitForTimeout(4500);
}

function imageStats(buffer) {
  const png = PNG.sync.read(buffer);
  const unique = new Set();
  let sum = 0, sumSq = 0, count = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    if (a < 32) continue;
    unique.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    sum += lum; sumSq += lum * lum; count++;
  }
  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, sumSq / count - mean * mean) : 0;
  return { unique: unique.size, variance: Math.round(variance * 100) / 100, width: png.width, height: png.height };
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game-container canvas');
    const host = document.querySelector('#game-container');
    const ui = document.querySelector('#game-ui');
    const auth = document.querySelector('#auth-layer');
    return {
      canvas: !!canvas,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasRect: canvas ? { width: Math.round(canvas.getBoundingClientRect().width), height: Math.round(canvas.getBoundingClientRect().height) } : null,
      hostChildren: host?.children.length || 0,
      gameUiVisible: !!ui && !ui.classList.contains('hidden'),
      authVisible: !!auth && !auth.classList.contains('hidden'),
      bodyClasses: document.body.className,
      userAgent: navigator.userAgent
    };
  });
}

test('mobile world visibly renders', async ({ page }, testInfo) => {
  await enterLocalGame(page);
  const diag = await diagnostics(page);
  console.log('JW_DIAG', JSON.stringify(diag));

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('missing viewport');
  const clip = {
    x: Math.round(viewport.width * 0.2),
    y: Math.round(viewport.height * 0.22),
    width: Math.round(viewport.width * 0.6),
    height: Math.round(viewport.height * 0.48)
  };
  const shot = await page.screenshot({ path: testInfo.outputPath('mobile-world.png'), clip });
  const stats = imageStats(shot);
  console.log('JW_PIXELS', JSON.stringify(stats));

  expect(diag.canvas, 'Phaser canvas must exist after entering the game').toBeTruthy();
  expect(diag.canvasWidth, 'canvas backing width').toBeGreaterThan(100);
  expect(diag.canvasHeight, 'canvas backing height').toBeGreaterThan(100);
  expect(stats.unique, `center viewport looks nearly flat: ${JSON.stringify(stats)}`).toBeGreaterThan(24);
  expect(stats.variance, `center viewport lacks world-detail variance: ${JSON.stringify(stats)}`).toBeGreaterThan(45);
});
