import { expect, test, assertTrackedPageErrors } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

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
    // The Tiptap contenteditable is present (surface carries the tiptap marker).
    const tiptapContent = page.locator('[data-slot="ai-sender-tiptap"]');
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
    const content = page.locator('[data-slot="ai-sender-tiptap"]');
    await expect(content).toContainText('Hello! How can I help?');
    await assertTrackedPageErrors(page);
  });

  test('typing @ opens the mention popup and selecting inserts @label', async ({ page }) => {
    await openRichTextDemo(page);
    const content = page.locator('[data-slot="ai-sender-tiptap"]');
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
    const content = page.locator('[data-slot="ai-sender-tiptap"]');
    await content.click();
    await page.keyboard.type(' /sum');

    const popup = page.locator('[data-slot="ai-sender-tiptap-popup"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });
    await expect(popup).toHaveAttribute('data-popup-kind', 'slash');
    await assertTrackedPageErrors(page);
  });

  test('submitting rich-text content sends plain text to the message list', async ({ page }) => {
    await openRichTextDemo(page);
    const content = page.locator('[data-slot="ai-sender-tiptap"]');
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

// ---------------------------------------------------------------------------
// Plan 480 (visual quality V10, A5/A6/A7): computed-style contract for the
// tiptap sender face — toolbar geometry, placeholder visibility, dark flip.
// ---------------------------------------------------------------------------
test.describe('AI Rich Text Sender — plan 480 computed-style contract', () => {
  test('template bar buttons carry the unified ghost geometry (h-7)', async ({ page }) => {
    await openRichTextDemo(page);

    const templateButton = page.locator('[data-testid="ai-sender-template-Greeting"]');
    await expect(templateButton).toBeVisible();
    await expectComputedHeight(templateButton, 28);
    await assertTrackedPageErrors(page);
  });

  test('placeholder is visible on the empty tiptap surface (decorated ::before)', async ({
    page,
  }) => {
    await openRichTextDemo(page);

    const content = page.locator('[data-slot="ai-sender-tiptap-content"]');
    await expect(content).toBeVisible();

    const pseudo = await content.evaluate((root) => {
      const p = root.querySelector('p.is-editor-empty');
      if (!p) {
        return null;
      }
      const style = getComputedStyle(p, '::before');
      return { content: style.getPropertyValue('content'), color: style.getPropertyValue('color') };
    });
    // The Placeholder extension decorates the empty paragraph; the package CSS
    // renders the label through attr(data-placeholder).
    expect(pseudo).not.toBeNull();
    expect(pseudo?.content).toContain('Type a message');
    expect(pseudo?.color).not.toBe('rgba(0, 0, 0, 0)');
    await assertTrackedPageErrors(page);
  });

  test('light↔dark flip re-resolves the content token color (dual-track)', async ({ page }) => {
    await openRichTextDemo(page);

    const content = page.locator('[data-slot="ai-sender-tiptap-content"]');
    await expect(content).toBeVisible();

    const readColor = () => getComputedStyleValue(content, 'color');
    const lightColor = await readColor();

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
    const darkColor = await readColor();
    expect(darkColor).not.toBe(lightColor);

    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'light'));
    expect(await readColor()).toBe(lightColor);
    await assertTrackedPageErrors(page);
  });
});

async function expectComputedHeight(locator: import('@playwright/test').Locator, px: number) {
  const height = await locator.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBe(px);
}
