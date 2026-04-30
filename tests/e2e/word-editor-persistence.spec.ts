import { expect, test } from '@playwright/test';

async function openWordEditor(page: import('@playwright/test').Page) {
  await page.goto('/#/word-editor', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
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
  await canvasElement.click();
  await page.waitForTimeout(300);
  await page.keyboard.type(marker);

  const saveButton = page.getByRole('button', { name: '保存' });
  await saveButton.click();

  await expect
    .poll(
      async () => {
        return page.evaluate(() => localStorage.getItem('nop-word-editor-document'));
      },
      { timeout: 10_000 },
    )
    .toContain(marker);

  await page.reload({ waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 45_000 });

  await expect
    .poll(
      async () => {
        return page.evaluate(() => localStorage.getItem('nop-word-editor-document'));
      },
      { timeout: 10_000 },
    )
    .toContain(marker);
});
