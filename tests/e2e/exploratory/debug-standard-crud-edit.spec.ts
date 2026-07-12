import { test, expect } from '../fixtures.js';

test('debug: compare openDialog on flux-basic vs complex-pages', async ({ page }) => {
  await page.goto('/#/flux-basic', { waitUntil: 'load' });
  await page.getByRole('heading', { name: 'Renderer Playground', level: 1 }).waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);

  const inspectBtn = page.getByRole('button', { name: 'Inspect' }).first();
  const btnExists = await inspectBtn.count();
  console.log('FLUX_BASIC_INSPECT_BTN:', btnExists);

  if (btnExists > 0) {
    await inspectBtn.click();
    await page.waitForTimeout(2000);
    const dialogCount = await page.locator('[data-slot="dialog-surface"], [role="dialog"]').count();
    console.log('FLUX_BASIC_DIALOG_AFTER_INSPECT:', dialogCount);

    if (dialogCount > 0) {
      const closeBtn = page.locator('[data-slot="dialog-surface"], [role="dialog"]').getByRole('button', { name: /close/i }).first();
      if (await closeBtn.count()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }
  }

  const fiberInfo = await page.evaluate(() => {
    const btn = document.querySelector('button');
    if (!btn) return { error: 'no button on page' };
    const fiberKey = Object.keys(btn).find((k) => k.startsWith('__reactFiber'));
    if (!fiberKey) return { error: 'no fiber' };
    const fiber = (btn as Record<string, unknown>)[fiberKey] as Record<string, unknown>;
    let cursor: Record<string, unknown> | null = fiber;
    let depth = 0;
    while (cursor && depth < 15) {
      const memo = cursor.memoizedProps as Record<string, unknown> | undefined;
      if (memo && typeof memo.actionScope === 'object' && memo.actionScope !== null) {
        const as = memo.actionScope as Record<string, unknown>;
        return {
          depth,
          actionScopeKeys: Object.keys(as),
          hasInvoke: typeof (as as Record<string, unknown>).invoke,
        };
      }
      cursor = cursor.return as Record<string, unknown> | null;
      depth++;
    }
    return { depth, found: false };
  });
  console.log('FLUX_BASIC_ACTION_SCOPE:', JSON.stringify(fiberInfo, null, 2));
});

test('debug: check complex-pages action scope', async ({ page }) => {
  await page.goto('/#/complex-pages/standard-crud', { waitUntil: 'load' });
  await expect(page.getByTestId('user-crud')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2000);

  const fiberInfo = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="btn-edit"]') as HTMLElement;
    if (!btn) return { error: 'no btn' };
    const fiberKey = Object.keys(btn).find((k) => k.startsWith('__reactFiber'));
    if (!fiberKey) return { error: 'no fiber' };
    const fiber = (btn as Record<string, unknown>)[fiberKey] as Record<string, unknown>;
    let cursor: Record<string, unknown> | null = fiber;
    let depth = 0;
    while (cursor && depth < 20) {
      const memo = cursor.memoizedProps as Record<string, unknown> | undefined;
      if (memo && typeof memo.actionScope === 'object' && memo.actionScope !== null) {
        const as = memo.actionScope as Record<string, unknown>;
        return {
          depth,
          actionScopeKeys: Object.keys(as),
          hasInvoke: typeof (as as Record<string, unknown>).invoke,
        };
      }
      cursor = cursor.return as Record<string, unknown> | null;
      depth++;
    }
    return { depth, found: false };
  });
  console.log('COMPLEX_PAGES_ACTION_SCOPE:', JSON.stringify(fiberInfo, null, 2));
});
