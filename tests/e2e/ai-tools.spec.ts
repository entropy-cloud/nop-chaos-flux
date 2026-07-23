import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiToolsDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-tools', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI tools — P2 agentic tool loop end-to-end', () => {
  test('send → tool_calls → executor → tool result → follow-up reply', async ({ page }) => {
    await openAiToolsDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('what is the weather?');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    // Round 1: the model emitted a tool_call → a tool card renders.
    const toolCard = page.locator('[data-slot="ai-tool-call"]').first();
    await expect(toolCard).toBeVisible({ timeout: 15_000 });

    // The host toolExecutor resolved it → status reaches success.
    await expect(toolCard).toHaveAttribute('data-tool-status', 'success', { timeout: 15_000 });

    // Round 2: the follow-up content reply references the tool result.
    const assistant = page.locator('[data-slot="ai-bubble"][data-role="assistant"]').last();
    await expect(assistant).toContainText('weather tool returned', { timeout: 15_000 });

    await assertTrackedPageErrors(page);
  });
});
