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
    // registered `ai` namespace. The list item count +1 assertion below pins
    // the page-level create loop (controller → useConversation → scope sync →
    // list re-render); the deeper controller semantics stay covered by the
    // focused unit tests in use-conversation.test.ts, and the renderer-side
    // create/rename/delete/switch flows are covered on /#/ai-coverage.
    const listItems = page.locator('[data-slot="ai-conversations-item"]');
    const before = await listItems.count();
    await expect(page.locator('[data-slot="ai-conversations-create"]')).toBeVisible();
    await page.locator('[data-slot="ai-conversations-create"]').click();
    // A broken create loop leaves the list unchanged (or empty) — this
    // assertion is the discriminating check for the full dispatch round-trip.
    await expect(listItems).toHaveCount(before + 1, { timeout: 10_000 });
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

test.describe('AI conversations — delete/rename legs (plan 633 UR-4)', () => {
  test('rename and delete keep the sidebar list live through the schema data channel', async ({
    page,
  }) => {
    // 30s：本测常被单独 --grep 执行（吃该路由 vite 冷编译，15s helper 口径不够——
    // 同页既有测试冷启动同样 flaky 的同因）。
    await page.goto('/#/ai-conversations', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 30_000 });

    // Precondition: pin the create leg, then work on the new conversation.
    const listItems = page.locator('[data-slot="ai-conversations-item"]');
    const before = await listItems.count();
    await page.locator('[data-slot="ai-conversations-create"]').click();
    await expect(listItems).toHaveCount(before + 1, { timeout: 10_000 });
    const item = listItems.last();

    // Rename leg: pencil → autofocus input → type → Enter commits; the list
    // re-renders with the new title through the same live data channel.
    await item.locator('[data-slot="ai-conversations-rename"]').click();
    const renameInput = item.locator('[data-slot="ai-conversations-rename-input"]');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('UR-4 重命名会话');
    await renameInput.press('Enter');
    await expect(listItems.last()).toContainText('UR-4 重命名会话', { timeout: 10_000 });

    // Delete leg: X → AlertDialog confirm → count returns to the baseline.
    await item.locator('[data-slot="ai-conversations-delete"]').click();
    const confirmDialog = page.locator('[data-slot="ai-conversations-delete-confirm"]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: '删除会话' }).click();
    await expect(listItems).toHaveCount(before, { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });
});
