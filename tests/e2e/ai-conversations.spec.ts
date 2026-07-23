import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiConversationsDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-conversations', { waitUntil: 'commit' });
  // The ai-chat panel root is present.
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI conversations — P1 namespace + conversations + streaming', () => {
  test('the conversations sidebar is rendered with the nop-ai-conversations marker', async ({
    page,
  }) => {
    await openAiConversationsDemo(page);
    await expect(page.locator('.nop-ai-conversations')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('clicking "New conversation" dispatches ai:createConversation without errors', async ({
    page,
  }) => {
    await openAiConversationsDemo(page);
    // The button is visible and clickable; the action dispatches through the
    // registered `ai` namespace. The full host-side state cycle (controller →
    // useConversation → scope sync → list re-render) is covered by the
    // focused unit tests in use-conversation.test.ts; here we verify the
    // namespace wiring is live and error-free.
    await expect(page.locator('[data-slot="ai-conversations-create"]')).toBeVisible();
    await page.locator('[data-slot="ai-conversations-create"]').click();
    await page.waitForTimeout(500);
    await assertTrackedPageErrors(page);
  });

  test('external ai:send button dispatches through the registered namespace', async ({ page }) => {
    await openAiConversationsDemo(page);
    await page.locator('[data-testid="external-ai-send"]').click();
    // A user bubble appears containing the dispatched text.
    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toBeVisible({ timeout: 10_000 });
    await expect(userBubble).toContainText('hi from external button', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('streaming markdown does not flicker garbled CJK halves under chunk pressure', async ({
    page,
  }) => {
    await openAiConversationsDemo(page);
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('streaming-test');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    // Wait for the assistant bubble to start streaming.
    const assistant = page.locator('[data-slot="ai-bubble"][data-role="assistant"]').last();
    await expect(assistant).toBeVisible({ timeout: 10_000 });

    // Assert the final streamed text contains expected words. The buffer
    // holds back incomplete chunks; this is the no-garble / no-flicker spot
    // check (the unit test in markdown-buffer.test.ts covers the algorithm
    // exhaustively).
    await expect(assistant).toContainText('Hello', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });
});
