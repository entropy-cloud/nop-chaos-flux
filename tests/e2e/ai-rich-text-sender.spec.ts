import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openRichTextDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-rich-text', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="ai-rich-text-chat"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI Rich Text Sender — P6 (A6) end-to-end', () => {
  test('renders the Tiptap editor surface (not the Textarea fallback)', async ({ page }) => {
    await openRichTextDemo(page);
    // The ai-sender root carries data-extension when an extension component is bound.
    const sender = page.locator('[data-slot="ai-sender"]');
    await expect(sender).toBeVisible();
    await expect(sender).toHaveAttribute('data-extension', '');
    // The Tiptap contenteditable is present.
    const tiptapContent = page.locator('.nop-ai-sender-tiptap-content');
    await expect(tiptapContent).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('template bar renders and clicking a template inserts text', async ({ page }) => {
    await openRichTextDemo(page);
    const templateBar = page.locator('[data-slot="ai-sender-tiptap-templates"]');
    await expect(templateBar).toBeVisible();
    await expect(templateBar.locator('button').first()).toBeVisible();

    // Click the "Greeting" template button.
    await page.locator('[data-testid="ai-sender-template-Greeting"]').click();
    // The editor content now includes the template text.
    const content = page.locator('.nop-ai-sender-tiptap-content');
    await expect(content).toContainText('Hello! How can I help?');
    await assertTrackedPageErrors(page);
  });

  test('typing @ opens the mention popup and selecting inserts @label', async ({ page }) => {
    await openRichTextDemo(page);
    const content = page.locator('.nop-ai-sender-tiptap-content');
    await content.click();
    await page.keyboard.type('@al');

    const popup = page.locator('[data-slot="ai-sender-tiptap-popup"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });
    await expect(popup).toHaveAttribute('data-popup-kind', 'mention');

    // Select the first match (alice or alex).
    const firstItem = popup.locator('button[role="option"]').first();
    await firstItem.click();

    // The editor now contains @alice or @alex as plain text.
    await expect(content).toContainText('@al');
    await assertTrackedPageErrors(page);
  });

  test('typing / opens the slash command popup', async ({ page }) => {
    await openRichTextDemo(page);
    const content = page.locator('.nop-ai-sender-tiptap-content');
    await content.click();
    await page.keyboard.type(' /sum');

    const popup = page.locator('[data-slot="ai-sender-tiptap-popup"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });
    await expect(popup).toHaveAttribute('data-popup-kind', 'slash');
    await assertTrackedPageErrors(page);
  });

  test('submitting rich-text content sends plain text to the message list', async ({ page }) => {
    await openRichTextDemo(page);
    const content = page.locator('.nop-ai-sender-tiptap-content');
    await content.click();
    await page.keyboard.type('hello from tiptap');

    // Submit via the Send button.
    await page.locator('[data-slot="ai-sender-submit"]').click();

    // A user bubble with the plain text appears in the message list.
    const userBubble = page.locator('.nop-ai-bubble[data-role="user"]').first();
    await expect(userBubble).toBeVisible({ timeout: 10_000 });
    await expect(userBubble).toContainText('hello from tiptap');
    await assertTrackedPageErrors(page);
  });
});
