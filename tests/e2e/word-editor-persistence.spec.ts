import { expect, test, assertTrackedPageErrors } from './fixtures.js';

test.setTimeout(60_000);

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 90_000 });
  await assertTrackedPageErrors(page);
}

async function readWordCount(page: import('@playwright/test').Page) {
  const text = (await page.locator('[class*="tabular-nums"]').first().textContent()) ?? '';
  const match = text.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function savedPreview(page: import('@playwright/test').Page) {
  return page.getByTestId('word-editor-saved-preview');
}

test('saves a document marker that survives a reload', async ({ page }) => {
  const marker = `Persistence marker ${Date.now()}`;
  const explicitSaveMarker = `Explicit save marker ${Date.now()}`;

  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await page.evaluate(() => {
    localStorage.removeItem('nop-word-editor-document');
    localStorage.removeItem('nop-word-editor-datasets');
  });

  await openWordEditor(page);

  const canvasElement = page.locator('canvas').first();
  await expect(canvasElement).toBeVisible({ timeout: 15_000 });
  const initialWordCount = await readWordCount(page);
  await canvasElement.click();
  // Wait for canvas editor to fully acquire focus before typing
  await page.waitForTimeout(500);
  await page.keyboard.type(marker);

  await expect(savedPreview(page)).toContainText(marker, { timeout: 10_000 });

  const saveButton = page.getByRole('button', { name: '保存' });
  await page.keyboard.type(` ${explicitSaveMarker}`);
  await saveButton.click();

  await expect(savedPreview(page)).toContainText(explicitSaveMarker, { timeout: 10_000 });
  await expect(page.getByTestId('word-editor-save-status')).toContainText('已保存', { timeout: 5_000 });

  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 90_000 });
  await assertTrackedPageErrors(page);
  await expect(savedPreview(page)).toContainText(marker, { timeout: 10_000 });
  await expect(savedPreview(page)).toContainText(explicitSaveMarker, { timeout: 10_000 });
  await expect.poll(() => readWordCount(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(initialWordCount);
});
