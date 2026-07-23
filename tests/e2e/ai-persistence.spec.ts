import { expect, test, assertTrackedPageErrors } from './fixtures.js';

const STORAGE_KEY = 'nop-chaos-flux:ai-persistence-demo';

async function openPersistenceDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-persistence', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI persistence — P3 localStorage end-to-end', () => {
  test('a sent message survives a page refresh', async ({ page }) => {
    await openPersistenceDemo(page);
    // Start from a clean slate.
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });

    // Create a conversation and send a message.
    await page.locator('[data-testid="ai-persistence-create"]').click();
    await expect(page.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('persist-me');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    // The user bubble renders in the message list.
    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('persist-me', { timeout: 10_000 });

    // Wait for the turn to fully complete (the mock reply's tail + a small
    // buffer) so autoSaveMessages has flushed the snapshot to storage before
    // we reload. The stream ends with "...Streaming works." then finish_reason.
    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toContainText('Streaming works', { timeout: 10_000 });
    await page.waitForTimeout(500);

    // Refresh — the conversation list + messages must recover from storage.
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });

    // The conversation survived in the sidebar.
    await expect(page.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    // The active conversation auto-rehydrates from storage (mount bootstrap →
    // switchConversation → engine.setMessages). The persisted user message
    // reappears in the message list.
    const recovered = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(recovered).toContainText('persist-me', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });
});
