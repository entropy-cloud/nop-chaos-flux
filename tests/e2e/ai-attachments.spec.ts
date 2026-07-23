import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiAttachmentsDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-attachments', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

// 1x1 transparent PNG.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

test.describe('AI attachments — P2 upload + preview + remove', () => {
  test('picking an image renders a preview item then remove clears it', async ({ page }) => {
    await openAiAttachmentsDemo(page);

    const fileInput = page.locator('[data-slot="ai-attachments-input"]');
    await fileInput.setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });

    // A preview item is rendered.
    const item = page.locator('[data-slot="ai-attachments-item"]').first();
    await expect(item).toBeVisible({ timeout: 10_000 });

    // The thumbnail uses an object URL (image_url-style multimodal payload source).
    const thumbCount = await page.locator('[data-slot="ai-attachments-thumb"]').count();
    expect(thumbCount).toBeGreaterThanOrEqual(1);

    // Removing the attachment clears the list.
    await page.locator('[data-slot="ai-attachments-remove"]').first().click();
    await expect(page.locator('[data-slot="ai-attachments-item"]')).toHaveCount(0, { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('exceeding maxFiles rejects the surplus file (validation Failure Path)', async ({ page }) => {
    await openAiAttachmentsDemo(page);

    const fileInput = page.locator('[data-slot="ai-attachments-input"]');
    // maxFiles is 4; upload 5 to force a rejection.
    await fileInput.setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'b.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'c.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'd.png', mimeType: 'image/png', buffer: TINY_PNG },
      { name: 'e.png', mimeType: 'image/png', buffer: TINY_PNG },
    ]);

    // Only up to maxFiles items are kept.
    const count = await page.locator('[data-slot="ai-attachments-item"]').count();
    expect(count).toBeLessThanOrEqual(4);

    await assertTrackedPageErrors(page);
  });
});
