import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiChatDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-chat', { waitUntil: 'commit' });
  // The ai-chat panel root is present.
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI chat — P0 mock streaming loop', () => {
  test('send → mock streams → bubble renders the streamed reply', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('ping');

    await page.locator('[data-slot="ai-sender-submit"]').click();

    // The assistant bubble appears and accumulates the canned streamed text.
    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toBeVisible({ timeout: 10_000 });
    await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });
    await expect(assistantBubble).toContainText('mock', { timeout: 10_000 });

    // The user bubble echoes the sent text.
    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('ping');

    await assertTrackedPageErrors(page);
  });

  test('multiple sends accumulate separate bubbles (loop integrity)', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    const submit = page.locator('[data-slot="ai-sender-submit"]');

    await input.fill('first');
    await submit.click();
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText(
      'Hello',
      { timeout: 10_000 },
    );

    await input.fill('second');
    await submit.click();

    // Two user + two assistant bubbles after the second turn completes.
    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toHaveCount(2, {
      timeout: 10_000,
    });
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toHaveCount(2, {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });
});
