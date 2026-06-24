import { expect, test } from './fixtures.js';

async function openW3d(page: import('@playwright/test').Page) {
  await page.goto('#/w3d-advanced-input-family', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '高级输入族 — period / markdown-editor / upload / editor',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W3d upload family — input-file / input-image', () => {
  test('input-file dispatches uploadAction and writes back the url on success', async ({
    page,
  }) => {
    await openW3d(page);

    const report = page.locator('[data-testid="file-report"]');
    await expect(report).toContainText('file:—');

    // Playwright cannot synthesize a real file selection via the OS dialog, so
    // we dispatch a File directly onto the hidden <input type="file"> via the
    // page's input element (programmatic bridge — mirrors the renderer contract).
    const input = page.locator('input[data-testid="nop-input-file-input"]').first();
    await input.scrollIntoViewIfNeeded();
    await input.setInputFiles({
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-bytes'),
    });

    // Upload resolves → a done item appears in the file list.
    await expect(
      page.locator('[data-testid="nop-input-file-item"][data-item-status="done"]').first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(report).toHaveText('file:https://cdn.example.com/contract.pdf', { timeout: 10_000 });
  });

  test('input-image renders a thumbnail preview after upload', async ({ page }) => {
    await openW3d(page);

    const input = page.locator('input[data-testid="nop-input-image-input"]').first();
    await input.scrollIntoViewIfNeeded();
    await input.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-png-bytes'),
    });

    const thumb = page.locator('[data-testid="nop-input-image-thumbnail"]').first();
    await expect(thumb).toBeVisible({ timeout: 10_000 });
    await expect(thumb).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');

    const report = page.locator('[data-testid="image-report"]');
    await expect(report).toHaveText('image:https://cdn.example.com/avatar.png', { timeout: 10_000 });
  });
});
