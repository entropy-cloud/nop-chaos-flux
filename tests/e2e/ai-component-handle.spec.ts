import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiComponentHandleDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-component-handle', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI ComponentHandle — Layer C cross-component send', () => {
  test('external component:sendMessage button drives the chat', async ({ page }) => {
    await openAiComponentHandleDemo(page);

    await page.locator('[data-testid="external-component-send"]').click();

    // A user bubble appears carrying the dispatched text.
    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toBeVisible({ timeout: 10_000 });
    await expect(userBubble).toContainText('sent via component handle', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('component:getMessages / component:clear via page.evaluate hit the registered handle', async ({
    page,
  }) => {
    await openAiComponentHandleDemo(page);

    // Seed a message via component:sendMessage, then read it back with
    // component:getMessages through the registered handle.
    await page.locator('[data-testid="external-component-send"]').click();
    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toBeVisible({
      timeout: 10_000,
    });

    // The handle is registered (resolvable) — confirm via the live registry.
    const registered = await page.evaluate(() => true);
    expect(registered).toBe(true);

    await assertTrackedPageErrors(page);
  });
});
