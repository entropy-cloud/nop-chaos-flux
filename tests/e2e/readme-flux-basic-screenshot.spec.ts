import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const IMAGES_DIR = 'docs/images';

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

// This is a manual asset-generation helper, not part of the supported CI gate baseline.
test.describe.skip('README screenshots', () => {
  test('captures playground home screenshot', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(page.locator('button', { hasText: 'Flux Basic' })).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    await ensureDir(IMAGES_DIR);
    await page.screenshot({
      path: join(IMAGES_DIR, 'readme-playground-home.png'),
      fullPage: false,
    });
  });

  test('captures flux basic screenshot', async ({ page }) => {
    await page.goto('/#/flux-basic');
    await page.setViewportSize({ width: 1600, height: 1400 });
    await expect(page.getByLabel('Username')).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    await ensureDir(IMAGES_DIR);
    await page
      .locator('.nop-page')
      .first()
      .screenshot({
        path: join(IMAGES_DIR, 'readme-flux-basic.png'),
      });
  });

  test('captures flow designer screenshot', async ({ page }) => {
    await page.goto('/#/flow-designer');
    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    await ensureDir(IMAGES_DIR);
    await page.screenshot({
      path: join(IMAGES_DIR, 'readme-flow-designer.png'),
      fullPage: false,
    });
  });
});
