import { expect, test, assertTrackedPageErrors } from './fixtures.js';

test.setTimeout(60_000);

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
  await assertTrackedPageErrors(page);
}

async function readWordCount(page: import('@playwright/test').Page) {
  const text = (await page.locator('[class*="tabular-nums"]').first().textContent()) ?? '';
  const match = text.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

async function readSavedDocumentText(page: import('@playwright/test').Page) {
  return page.evaluate(() => localStorage.getItem('nop-word-editor-document'));
}

async function readRecoveredMainText(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const probe = window.__NOP_WORD_EDITOR_PROBE__;
    const main = probe?.getState().document?.main ?? [];
    return main
      .map((item) => (item && typeof item === 'object' && 'value' in item ? String(item.value ?? '') : ''))
      .join(' ');
  });
}

test('saves a document marker that survives a reload', async ({ page }) => {
  const marker = `Persistence marker ${Date.now()}`;

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
  await page.keyboard.type(marker);

  await expect.poll(() => readSavedDocumentText(page), { timeout: 10_000 }).toContain(marker);

  const saveButton = page.getByRole('button', { name: '保存' });
  await saveButton.click();

  await expect.poll(() => readSavedDocumentText(page), { timeout: 10_000 }).toContain(marker);

  await page.reload({ waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 45_000 });
  await assertTrackedPageErrors(page);
  await expect.poll(() => readSavedDocumentText(page), { timeout: 10_000 }).toContain(marker);
  await expect.poll(() => readRecoveredMainText(page), { timeout: 10_000 }).toContain(marker);
  await expect.poll(() => readWordCount(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(initialWordCount);

  await expect.poll(() => readSavedDocumentText(page), { timeout: 10_000 }).toContain(marker);
});
