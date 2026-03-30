import { test, expect } from '@playwright/test';

function collectConsoleErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

function filterFaviconErrors(errors: string[]): string[] {
  return errors.filter((e) => !e.includes('favicon'));
}

async function prepareFreshPage(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);
}

test.describe('Nop Debugger', () => {
  test('launcher renders on home page with zero console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('clicking launcher opens the full debugger panel', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.nop-debugger')).toBeVisible();

    const tabButtons = page.locator('.ndbg-tab');
    await expect(tabButtons).toHaveCount(4);

    const headerButtons = page.locator('.ndbg-header-actions button');
    await expect(headerButtons).toHaveCount(4);
    const titles = await page.evaluate(() => {
      const btns = document.querySelectorAll('.ndbg-header-actions button');
      return Array.from(btns).map((b) => b.getAttribute('title'));
    });
    expect(titles).toEqual(['Pause', 'Clear', 'Pick element', 'Minimize']);

    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('automation API (window.__NOP_DEBUGGER_API__) is available', async ({ page }) => {
    await prepareFreshPage(page);

    const apiInfo = await page.evaluate(() => {
      const api = (window as Record<string, unknown>).__NOP_DEBUGGER_API__;
      if (!api || typeof api !== 'object') return { available: false };
      const snap = (api as { getSnapshot: () => Record<string, unknown> }).getSnapshot();
      const overview = (api as { getOverview: () => Record<string, unknown> }).getOverview();
      return {
        available: true,
        snapshotEnabled: snap?.enabled,
        snapshotPanelOpen: snap?.panelOpen,
        overviewTotalEvents: typeof overview?.totalEvents
      };
    });

    expect(apiInfo.available).toBe(true);
    expect(apiInfo.snapshotEnabled).toBe(true);
    expect(typeof apiInfo.snapshotPanelOpen).toBe('boolean');
    expect(apiInfo.overviewTotalEvents).toBe('number');
  });

  test('debugger launcher renders on FluxBasicPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.getByText('Core Renderers').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('debugger launcher renders on DebuggerLabPage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    await page.getByText('DevTools').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();
    expect(filterFaviconErrors(errors)).toEqual([]);
  });

  test('DebuggerLabPage controls fire events and query diagnostics', async ({ page }) => {
    await prepareFreshPage(page);

    await page.getByText('DevTools').click();
    await page.waitForTimeout(500);

    const outputPanel = page.locator('pre').first();

    await page.getByRole('button', { name: 'Fire Render' }).click();
    await page.waitForTimeout(300);
    await expect(outputPanel).toContainText('[Render Event]');

    await page.getByRole('button', { name: 'Get Snapshot' }).click();
    await page.waitForTimeout(300);
    await expect(outputPanel).toContainText('[Snapshot]');
    await expect(outputPanel).toContainText('"enabled": true');
  });

  test('no console errors on any page', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await prepareFreshPage(page);

    const errors1 = [...errors];

    await page.getByText('Core Renderers').click();
    await page.waitForTimeout(1500);
    const errors2 = [...errors];

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
    await page.getByText('DevTools').click();
    await page.waitForTimeout(1500);
    const errors3 = [...errors];

    expect(filterFaviconErrors(errors1)).toEqual([]);
    expect(filterFaviconErrors(errors2)).toEqual([]);
    expect(filterFaviconErrors(errors3)).toEqual([]);
  });

  test('panel open/close state persists across reloads', async ({ page }) => {
    await prepareFreshPage(page);

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();

    await page.getByTitle('Minimize').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).not.toBeVisible();
    await expect(page.locator('.nop-debugger-launcher')).toBeVisible();

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).not.toBeVisible();

    await page.locator('.nop-debugger-launcher').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.nop-debugger')).toBeVisible();
  });
});
