import { assertTrackedPageErrors, test, expect } from './fixtures.js';

test('flux-basic table Inspect opens the matching row dialog without browser errors', async ({
  page,
}) => {
  await page.goto('/#/flux-basic', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Renderer Playground', level: 1 }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
  await assertTrackedPageErrors(page);

  const expectedRows = [
    { username: 'alice', email: 'alice@example.com' },
    { username: 'bob', email: 'bob@example.com' },
    { username: 'carol', email: 'carol@example.com' },
  ];

  for (const [index, row] of expectedRows.entries()) {
    await page.getByRole('button', { name: 'Inspect' }).nth(index).click();

    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('User Details');
    await expect(dialog).toContainText(`User: ${row.username}`);
    await expect(dialog).toContainText(`Email: ${row.email}`);

    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }

  const debuggerSnapshot = await page.evaluate(() => {
    const api = (window as typeof window & {
      __NOP_DEBUGGER_API__?: {
        getLatestError?: () => unknown;
        getLatestFailedAction?: () => unknown;
      };
    }).__NOP_DEBUGGER_API__;

    return {
      latestError: api?.getLatestError?.() ?? null,
      latestFailedAction: api?.getLatestFailedAction?.() ?? null,
    };
  });

  expect(debuggerSnapshot).toEqual({ latestError: null, latestFailedAction: null });
});
