import { test, expect, assertTrackedPageErrors } from './fixtures.js';

async function openCoverage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-coverage', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: /AI Coverage/i })).toBeVisible({ timeout: 25_000 });
}

test.describe('AI bubble — content renderer gallery', () => {
  test('corner shape sets data-shape', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-corner"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(bubble).toHaveAttribute('data-shape', 'corner');
    await assertTrackedPageErrors(page);
  });

  test('avatar slot and timestamp footer render', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-avatar"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    // The avatar is a host-stylable marker slot (aria-hidden, zero size by
    // default) — assert presence, not visibility.
    await expect(bubble.locator('[data-slot="ai-bubble-avatar"]')).toBeAttached();
    const time = bubble.locator('time[data-slot="ai-bubble-timestamp"]');
    await expect(time).toBeVisible();
    expect(await time.getAttribute('datetime')).toContain('2025');
    await assertTrackedPageErrors(page);
  });

  test('markdown renders headings, bold text and fenced code blocks', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(bubble.locator('[data-slot="ai-bubble-markdown"] h1')).toContainText('Coverage Heading');
    await expect(bubble.locator('[data-slot="ai-bubble-markdown"] strong')).toContainText('bold');
    await expect(bubble.locator('[data-slot="ai-bubble-code"]')).toBeVisible();
    await expect(bubble).toContainText('const answer = 42;');
    await assertTrackedPageErrors(page);
  });

  test('code block copy button flips to Copied', async ({ page }) => {
    await openCoverage(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const bubble = page.locator('[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    const copy = bubble.locator('[data-slot="ai-bubble-copy-code"]');
    await copy.click();
    await expect(copy).toContainText(/copied|已复制/i, { timeout: 5_000 });
    await assertTrackedPageErrors(page);
  });

  test('reasoning panel collapses and expands', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-reasoning"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    const panel = bubble.locator('[data-slot="ai-bubble-reasoning"]');
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveAttribute('data-open');
    await panel.locator('button').first().click();
    await expect(panel).toHaveAttribute('data-open', '', { timeout: 5_000 });
    await expect(panel).toContainText('coverage thinking trace');
    await panel.locator('button').first().click();
    await expect(panel).not.toHaveAttribute('data-open');
    await assertTrackedPageErrors(page);
  });

  test('image content renders a responsive grid of image items', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-image"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(bubble.locator('[data-slot="ai-bubble-image"]')).toBeVisible();
    await expect(bubble.locator('[data-slot="ai-bubble-image-item"]')).toHaveCount(2);
    await assertTrackedPageErrors(page);
  });

  test('data-* content part renders the JSON preview', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-datapart"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    const part = bubble.locator('[data-slot="ai-bubble-data-part"]');
    await expect(part).toBeVisible();
    await expect(part).toHaveAttribute('data-part-kind', 'chart');
    await expect(part.locator('[data-slot="ai-bubble-data-part-payload"]')).toContainText('"kind": "bar"');
    await assertTrackedPageErrors(page);
  });

  test('error message carries data-error and the error renderer', async ({ page }) => {
    await openCoverage(page);
    const bubble = page.locator('[data-testid="cov-bubble-error"][data-slot="ai-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(bubble).toHaveAttribute('data-error', '');
    await expect(bubble.locator('[data-slot="ai-bubble-error"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('user message edit: toggle → textarea → submit regenerates the reply', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-edit-chat"]');
    const userBubble = chat.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('edit this message', { timeout: 15_000 });

    await userBubble.locator('[data-slot="ai-bubble-edit-toggle"]').click();
    const editor = userBubble.locator('[data-slot="ai-bubble-edit-input"]');
    await expect(editor).toBeVisible({ timeout: 5_000 });
    await editor.fill('edited message text');
    await userBubble.locator('[data-slot="ai-bubble-edit-submit"]').click();

    await expect(chat.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText('edited message text', {
      timeout: 10_000,
    });
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]').last()).toContainText('Hello', {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('user message edit cancel via Escape restores the bubble', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-edit-chat"]');
    const userBubble = chat.locator('[data-slot="ai-bubble"][data-role="user"]');
    await expect(userBubble).toContainText('edit this message', { timeout: 15_000 });

    await userBubble.locator('[data-slot="ai-bubble-edit-toggle"]').click();
    const editor = userBubble.locator('[data-slot="ai-bubble-edit-input"]');
    await expect(editor).toBeVisible({ timeout: 5_000 });
    await editor.fill('should not persist');
    await editor.press('Escape');
    await expect(editor).toHaveCount(0, { timeout: 5_000 });
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText('edit this message');
    await assertTrackedPageErrors(page);
  });

  test('message list exposes role=log, aria-live and aria-busy while processing', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    const list = chat.locator('[data-slot="ai-message-list"]');
    await expect(list).toBeVisible({ timeout: 15_000 });
    await expect(list).toHaveAttribute('role', 'log');
    await expect(list).toHaveAttribute('aria-live', 'polite');

    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('busy check');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(list).toHaveAttribute('aria-busy', 'true', { timeout: 5_000 });
    await expect.poll(async () => list.getAttribute('aria-busy'), { timeout: 15_000 }).toBeNull();
    await assertTrackedPageErrors(page);
  });

  test('empty message list carries data-empty before the first send', async ({ page }) => {
    await openCoverage(page);
    const list = page.locator('[data-testid="cov-chat-flaky"] [data-slot="ai-message-list"]');
    await expect(list).toBeVisible({ timeout: 15_000 });
    await expect(list).toHaveAttribute('data-empty', '');
    await assertTrackedPageErrors(page);
  });

  test('auto-scroll keeps the latest message visible after a turn', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('scroll check');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    const list = chat.locator('[data-slot="ai-message-list"]');
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]').last()).toContainText('done.', {
      timeout: 20_000,
    });
    const scrolledToBottom = await list.evaluate((el) => {
      return el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    });
    expect(scrolledToBottom).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('scrolling up pauses auto-scroll for the next turn', async ({ page }) => {
    await openCoverage(page);
    const chat = page.locator('[data-testid="cov-chat-slow"]');
    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('first turn');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]').last()).toContainText('done.', {
      timeout: 20_000,
    });

    const list = chat.locator('[data-slot="ai-message-list"]');
    await list.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    await chat.locator('[data-slot="ai-sender-input"] textarea').fill('second turn');
    await chat.locator('[data-slot="ai-sender-submit"]').click();
    await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]').last()).toContainText('done.', {
      timeout: 20_000,
    });
    await expect
      .poll(async () => list.evaluate((el) => el.scrollTop), { timeout: 5_000 })
      .toBe(0);
    await assertTrackedPageErrors(page);
  });
});
