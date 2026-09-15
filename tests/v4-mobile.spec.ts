import { expect, test } from '@playwright/test';

test('v4 boots a visible playable canvas world on mobile', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/v4.html');
  await expect(page.locator('.jw4-shell')).toBeVisible();
  await expect(page.locator('#jw4-game canvas')).toBeVisible();
  await expect(page.locator('.jw4-character-card')).toContainText('준자');
  await expect(page.locator('.jw4-location')).toContainText('백운성');

  const canvas = page.locator('#jw4-game canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(300);

  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#jw4-game canvas');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width < 2 || canvas.height < 2) return false;
    const sample = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return sample[3] > 0;
  })).toBe(true);

  await page.locator('#jw4-quest').click();
  await page.waitForTimeout(400);
  expect(pageErrors).toEqual([]);
});
