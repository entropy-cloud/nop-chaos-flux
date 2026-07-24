import { expect, test, assertTrackedPageErrors } from './fixtures.js';

const STORAGE_KEY = 'nop-chaos-flux:ai-persistence-demo';

async function openPersistenceDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-persistence', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI persistence — P3 localStorage end-to-end (via ai-chat)', () => {
  test('a sent message survives a page refresh and renders through ai-chat', async ({ page }) => {
    await openPersistenceDemo(page);
    // Start from a clean slate.
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });

    // The chat panel is the `ai-chat` renderer (bound to activeEngine). Before a
    // conversation is selected it renders its emptyState (engine-null-switch).
    await expect(page.locator('.nop-ai-chat')).toBeVisible({ timeout: 15_000 });

    // Create a conversation (React sidebar → conversations.createConversation).
    await page.locator('[data-testid="ai-persistence-create"]').click();
    await expect(page.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    // Send a message through the ai-chat sender.
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('persist-me');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    // The user bubble renders in the ai-chat message list.
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
    // The chat is still rendered through ai-chat after reload.
    await expect(page.locator('.nop-ai-chat')).toBeVisible({ timeout: 15_000 });

    // The conversation survived in the sidebar.
    await expect(page.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    // The active conversation auto-rehydrates from storage (mount bootstrap →
    // switchConversation → engine.setMessages). The persisted user message
    // reappears in the ai-chat message list.
    const recovered = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(recovered).toContainText('persist-me', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('switching conversations re-hydrates each engine through ai-chat', async ({ page }) => {
    await openPersistenceDemo(page);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('[data-testid="ai-persistence-panel"]')).toBeVisible({ timeout: 15_000 });

    // Conversation A.
    await page.locator('[data-testid="ai-persistence-create"]').click();
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('msg-A');
    await page.locator('[data-slot="ai-sender-submit"]').click();
    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText('msg-A', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText(
      'Streaming works',
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);

    // Conversation B (prepended → becomes the first sidebar item).
    await page.locator('[data-testid="ai-persistence-create"]').click();
    await input.fill('msg-B');
    await page.locator('[data-slot="ai-sender-submit"]').click();
    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText('msg-B', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText(
      'Streaming works',
      { timeout: 10_000 },
    );
    await page.waitForTimeout(500);

    // Switch back to A (the second sidebar item) — its messages re-hydrate
    // through ai-chat (the engine-null switch is transient; the new engine
    // binds on the next render).
    await page.locator('[data-testid="ai-persistence-item"]').nth(1).click();
    await expect(page.locator('.nop-ai-chat')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText('msg-A', {
      timeout: 10_000,
    });

    await assertTrackedPageErrors(page);
  });
});
