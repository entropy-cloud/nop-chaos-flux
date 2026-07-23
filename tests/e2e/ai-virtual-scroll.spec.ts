import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiVirtualScrollDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-virtual-scroll', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI virtual scroll — A-8 windowed rendering (1000 messages)', () => {
  test('only the viewport window is mounted in the DOM', async ({ page }) => {
    await openAiVirtualScrollDemo(page);

    const list = page.locator('[data-slot="ai-message-list"]');
    await expect(list).toBeVisible({ timeout: 15_000 });

    // Virtualization is enabled (crosses the 200-message threshold).
    await expect(list).toHaveAttribute('data-virtual');

    // 1000 messages are seeded, but only the visible window (+overscan) is
    // mounted as bubble DOM nodes — far fewer than 1000.
    const bubbleCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-slot="ai-bubble"]').length;
    });
    expect(bubbleCount).toBeLessThan(100);
    expect(bubbleCount).toBeGreaterThan(0);

    await assertTrackedPageErrors(page);
  });
});
