import { test, expect, assertTrackedPageErrors } from './fixtures.js';
import { openRendererDirect } from './component-lab/helpers.js';

test('assertTrackedPageErrors throws for untracked non-fixture pages', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await expect(async () => {
    await assertTrackedPageErrors(page);
  }).rejects.toThrow(
    'assertTrackedPageErrors(page) requires the fixture-managed `page` from tests/e2e/fixtures.ts.',
  );

  await context.close();
});

test('assertTrackedPageErrors accepts the fixture-managed page across helper boundaries', async ({ page }) => {
  await expect(async () => {
    await openRendererDirect(page, 'input-tree');
  }).resolves.not.toThrow();
});

test('assertTrackedPageErrors does not suppress WebSocket connection console errors', async ({ page, allowConsoleErrors }) => {
  allowConsoleErrors(1);

  await page.goto('/');

  await page.evaluate(() => {
    console.error('WebSocket connection to ws://127.0.0.1:65535 failed');
  });

  await expect(async () => {
    await assertTrackedPageErrors(page);
  }).rejects.toThrow('Expected zero console.error entries');
});
