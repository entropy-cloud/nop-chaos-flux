import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openAiChatDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-chat', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI chat — P0 mock streaming loop', () => {
  test('send → mock streams → bubble renders the streamed reply', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('ping');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toBeVisible({ timeout: 10_000 });
    await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });
    await expect(assistantBubble).toContainText('mock', { timeout: 10_000 });

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
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText('Hello', { timeout: 10_000 });

    await input.fill('second');
    await submit.click();

    await expect(page.locator('[data-slot="ai-bubble"][data-role="user"]')).toHaveCount(2, { timeout: 10_000 });
    await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toHaveCount(2, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    await openAiChatDemo(page);

    const submit = page.locator('[data-slot="ai-sender-submit"]');
    await expect(submit).toBeDisabled();

    await assertTrackedPageErrors(page);
  });

  test('placeholder text visible in textarea', async ({ page }) => {
    await openAiChatDemo(page);

    const textarea = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(textarea).toHaveAttribute('placeholder', /mock/i);

    await assertTrackedPageErrors(page);
  });

  test('header content renders', async ({ page }) => {
    await openAiChatDemo(page);

    const header = page.locator('[data-slot="ai-chat-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText('AI Chat');

    await assertTrackedPageErrors(page);
  });

  test('Enter key sends message (submitType=enter)', async ({ page }) => {
    await openAiChatDemo(page);

    const textarea = page.locator('[data-slot="ai-sender-input"] textarea');
    await textarea.fill('keyboard send');
    await textarea.press('Enter');

    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('keyboard send', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('text before and after message list is rendered', async ({ page }) => {
    await openAiChatDemo(page);

    const root = page.locator('[data-slot="ai-chat-root"]');
    await expect(root).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('ai-bubble has correct placement for user and assistant', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('placement test');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    const userBubble = page.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toBeVisible({ timeout: 10_000 });
    await expect(userBubble).toHaveAttribute('data-placement', 'end');

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toHaveAttribute('data-placement', 'start');

    await assertTrackedPageErrors(page);
  });

  test('ai-bubble renders timestamp', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('timestamp test');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    await expect(page.locator('[data-slot="ai-bubble-timestamp"]')).toBeVisible({ timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('assistant bubble content is rendered via markdown', async ({ page }) => {
    await openAiChatDemo(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await input.fill('markdown test');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toBeVisible({ timeout: 10_000 });
    await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });
});
