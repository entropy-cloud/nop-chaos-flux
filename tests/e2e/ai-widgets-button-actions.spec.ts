import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// ============================================================================
// D4 (plan 2026-08-24-2317-1): real button side effects on the widgets demo.
// ① prompt click writes the sender draft; ② repeat click dedupes;
// ③ suggestion click writes the empty draft; ④ refresh regenerates the
// latest assistant message (truncate-rerun: streaming re-enters, count
// unchanged); ⑤ like toggle aria/data mirrors; ⑥ suggestion pill renders a
// lucide svg (G9); ⑦ sources opens a Popover with the source entries.
// ============================================================================

async function openWidgetsPage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-widgets', { waitUntil: 'commit' });
  // 30s first-paint budget: a cold dev server must compile the whole demo
  // module graph before ai-chat-root mounts (15s was flaky on standalone runs).
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 30_000 });
}

test.describe('AI widgets — D4 real button side effects', () => {
  test('① prompt click writes its label into the empty sender draft (single value)', async ({ page }) => {
    await openWidgetsPage(page);
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toHaveValue('');

    await page.locator('[data-slot="ai-prompts-item"]').first().click();
    await expect(input).toHaveValue('What is the weather?');

    await assertTrackedPageErrors(page);
  });

  test('② clicking the same prompt again does not duplicate the draft (dedupe)', async ({ page }) => {
    await openWidgetsPage(page);
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    const prompt = page.locator('[data-slot="ai-prompts-item"]').first();

    await prompt.click();
    await expect(input).toHaveValue('What is the weather?');
    await prompt.click();
    await expect(input).toHaveValue('What is the weather?');

    // No async duplicate lands later either.
    await page.waitForTimeout(400);
    await expect(input).toHaveValue('What is the weather?');

    await assertTrackedPageErrors(page);
  });

  test('③ suggestion click writes its text into the empty draft', async ({ page }) => {
    await openWidgetsPage(page);
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toHaveValue('');

    await page.locator('[data-slot="ai-suggestions-item"]').first().click();
    await expect(input).toHaveValue('Summarize');

    await assertTrackedPageErrors(page);
  });

  test('④ refresh regenerates the latest assistant message (streaming re-enters, count unchanged)', async ({ page }) => {
    await openWidgetsPage(page);
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    const root = page.locator('[data-slot="ai-chat-root"]');
    const assistant = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');

    await input.fill('plain greeting');
    await page.locator('[data-slot="ai-sender-submit"]').click();
    await expect(assistant).toHaveCount(1, { timeout: 20_000 });
    await expect(assistant.first()).toContainText('Hello', { timeout: 20_000 });
    await expect(root).toHaveAttribute('data-state', 'completed', { timeout: 20_000 });

    // Refresh → the engine truncates and re-runs the latest assistant turn.
    await page.locator('[data-slot="ai-feedback-refresh"]').click();
    await expect(assistant.first()).toHaveAttribute('data-streaming', '', { timeout: 10_000 });
    await expect(assistant).toHaveCount(1);

    // Truncate-rerun semantics: the assistant count stays unchanged and the
    // content is restored once the re-run completes.
    await expect(root).toHaveAttribute('data-state', 'completed', { timeout: 30_000 });
    await expect(assistant).toHaveCount(1);
    await expect(assistant.first()).toContainText('Hello');

    await assertTrackedPageErrors(page);
  });

  test('⑤ like toggle flips aria-pressed and data-active', async ({ page }) => {
    await openWidgetsPage(page);
    const like = page.locator('[data-slot="ai-feedback-like"]');

    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(like).toHaveAttribute('data-active', '');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await expect(like).not.toHaveAttribute('data-active');

    await assertTrackedPageErrors(page);
  });

  test('⑥ suggestion pill renders a lucide svg icon, not an emoji literal (G9)', async ({ page }) => {
    await openWidgetsPage(page);
    const pill = page.locator('[data-slot="ai-suggestions-item"]').first();

    await expect(pill.locator('svg')).toHaveCount(1);
    const text = (await pill.textContent()) ?? '';
    expect(text).toContain('Summarize');
    expect(text).not.toMatch(/✏️|🌐|💡|✨|➕/);

    await assertTrackedPageErrors(page);
  });

  test('⑦ sources opens a Popover listing the message sources', async ({ page }) => {
    await openWidgetsPage(page);

    await page.locator('[data-slot="ai-feedback-sources"]').click();
    const list = page.locator('[data-slot="ai-feedback-sources-list"]');
    await expect(list).toBeVisible();
    await expect(list.locator('[data-slot="ai-feedback-source-item"]')).toHaveCount(2);
    await expect(list.first()).toContainText('design.md');

    await assertTrackedPageErrors(page);
  });
});
