import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openWidgetsPage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-widgets', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI widgets — welcome, prompts, token usage, suggestions', () => {
  test('ai-welcome renders with title, description, and icon', async ({ page }) => {
    await openWidgetsPage(page);

    const welcome = page.locator('[data-slot="ai-welcome"]');
    await expect(welcome).toBeVisible();

    await expect(welcome.locator('[data-slot="ai-welcome-title"]')).toHaveText('Welcome to AI Widgets');
    await expect(welcome.locator('[data-slot="ai-welcome-description"]')).toContainText('flux-renderers-ai widgets');
    await expect(welcome.locator('[data-slot="ai-welcome-icon"]')).toBeVisible();
    await expect(welcome).toHaveAttribute('data-align', 'center');

    await assertTrackedPageErrors(page);
  });

  test('ai-prompts renders items with labels', async ({ page }) => {
    await openWidgetsPage(page);

    const prompts = page.locator('[data-slot="ai-prompts"]');
    await expect(prompts).toBeVisible();
    await expect(prompts).toHaveAttribute('data-layout', 'wrap');

    const items = prompts.locator('[data-slot="ai-prompts-item"]');
    await expect(items).toHaveCount(4);

    await expect(items.nth(0)).toContainText('What is the weather?');
    await expect(items.nth(1)).toContainText('Help me debug');
    await expect(items.nth(2)).toContainText('Summarize the docs');
    await expect(items.nth(3)).toContainText('Show me a chart');

    await assertTrackedPageErrors(page);
  });

  test('ai-prompts item has description', async ({ page }) => {
    await openWidgetsPage(page);

    const firstItem = page.locator('[data-slot="ai-prompts-item"]').first();
    await expect(firstItem).toContainText('Check current weather');

    await assertTrackedPageErrors(page);
  });

  test('ai-token-usage displays token counts and cost', async ({ page }) => {
    await openWidgetsPage(page);

    const tokenUsage = page.locator('[data-slot="ai-token-usage"]');
    await expect(tokenUsage).toBeVisible();

    await expect(tokenUsage.locator('[data-slot="ai-token-usage-total"]')).toContainText('500');
    await expect(tokenUsage.locator('[data-slot="ai-token-usage-ring"]')).toBeVisible();
    await expect(tokenUsage.locator('[data-slot="ai-token-usage-cost"]')).toContainText('0.0012');

    await assertTrackedPageErrors(page);
  });

  test('ai-token-usage prompt and completion breakdowns', async ({ page }) => {
    await openWidgetsPage(page);

    const tokenUsage = page.locator('[data-slot="ai-token-usage"]');
    await expect(tokenUsage.locator('[data-slot="ai-token-usage-prompt"]')).toContainText('320');
    await expect(tokenUsage.locator('[data-slot="ai-token-usage-completion"]')).toContainText('180');

    await assertTrackedPageErrors(page);
  });

  test('ai-suggestions items render in expand mode', async ({ page }) => {
    await openWidgetsPage(page);

    const suggestions = page.locator('[data-slot="ai-suggestions"]');
    await expect(suggestions).toBeVisible();
    await expect(suggestions).toHaveAttribute('data-overflow', 'expand');

    const items = suggestions.locator('[data-slot="ai-suggestions-item"]');
    await expect(items).toHaveCount(5);

    await expect(items.nth(0)).toContainText('Summarize');
    await expect(items.nth(1)).toContainText('Translate');

    await assertTrackedPageErrors(page);
  });

  test('ai-voice-input renders marker button', async ({ page }) => {
    await openWidgetsPage(page);

    const voice = page.locator('[data-slot="ai-voice-input"]');
    await expect(voice).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('sending a message through ai-chat with widgets', async ({ page }) => {
    await openWidgetsPage(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toBeVisible();
    await input.fill('widgets test');

    await page.locator('[data-slot="ai-sender-submit"]').click();

    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('widgets test', { timeout: 10_000 });

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('beforeMessages area renders welcome before messages', async ({ page }) => {
    await openWidgetsPage(page);

    const beforeArea = page.locator('[data-slot="ai-chat-before"]');
    await expect(beforeArea).toBeVisible();
    await expect(beforeArea.locator('[data-slot="ai-welcome"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('afterMessages area renders suggestions', async ({ page }) => {
    await openWidgetsPage(page);

    const afterArea = page.locator('[data-slot="ai-chat-after"]');
    await expect(afterArea).toBeVisible();
    await expect(afterArea.locator('[data-slot="ai-suggestions"]')).toBeVisible();

    await assertTrackedPageErrors(page);
  });
});
