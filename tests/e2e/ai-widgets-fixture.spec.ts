import { expect, test, assertTrackedPageErrors } from './fixtures.js';

/**
 * D1 rich markdown fixtures (`docs/plans/2026-08-24-1045-2-d1-rich-markdown-fixture.md`).
 *
 * Each test sends one keyword on `# /ai-widgets` (whose mock env is created with
 * `{ delayMs: 200, fixtures: true }`) and asserts the representative markdown
 * element from the D0 product-spec §4.2 coverage outline — not fixture text
 * details. `formula` asserts the KaTeX output (D6 landed: remark-math +
 * rehype-katex consume the `$`/`$$` source delimiters; the `$$` text
 * assertion was migrated per the D6 plan); `reasoning` asserts markdown-level
 * elements, not a collapse panel (structured fields are D5 scope).
 */

const ASSISTANT_MD = '[data-slot="ai-bubble"][data-role="assistant"] [data-slot="ai-bubble-markdown"]';

async function openWidgetsPage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-widgets', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeout: 15_000 });
}

async function sendUserMessage(page: import('@playwright/test').Page, text: string) {
  const input = page.locator('[data-slot="ai-sender-input"] textarea');
  await expect(input).toBeVisible();
  await input.fill(text);
  await page.locator('[data-slot="ai-sender-submit"]').click();
}

test.describe('AI widgets — rich markdown fixtures (D1)', () => {
  test('weather keyword renders a forecast table', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'What is the weather outlook this week?');

    const md = page.locator(ASSISTANT_MD);
    await expect(md.locator('table')).toBeVisible({ timeout: 30_000 });
    await expect(md.locator('table tbody tr').first()).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('code keyword renders a fenced code block', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Help me debug this code');

    const md = page.locator(ASSISTANT_MD);
    await expect(md.locator('[data-slot="ai-bubble-pre"]')).toBeVisible({ timeout: 30_000 });

    await assertTrackedPageErrors(page);
  });

  test('formula keyword renders blockquote and KaTeX math', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Explain the formula for mass energy equivalence');

    const md = page.locator(ASSISTANT_MD);
    await expect(md.locator('blockquote')).toBeVisible({ timeout: 30_000 });
    // D6 (planned migration pre-embedded by the D1 plan): the formula preset
    // now renders through remark-math + rehype-katex, so the LaTeX SOURCE
    // delimiters ($$) are consumed — assert the rendered KaTeX output instead.
    await expect(md.locator('span.katex').first()).toBeVisible({ timeout: 30_000 });
    await expect(md.locator('.katex-display')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('reasoning keyword renders a task-list checklist', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Show me your reasoning for the routing failure');

    const md = page.locator(ASSISTANT_MD);
    await expect(md.locator('li input[type="checkbox"]').first()).toBeVisible({ timeout: 30_000 });

    await assertTrackedPageErrors(page);
  });

  test('citation keyword renders a numbered reference list with links', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Give me a citation summary of the papers');

    const md = page.locator(ASSISTANT_MD);
    await expect(md.locator('ol li a').first()).toBeVisible({ timeout: 30_000 });

    await assertTrackedPageErrors(page);
  });

  test('no keyword falls back to the rich default preset', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'nice to meet you');

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]');
    await expect(assistantBubble).toContainText('Hello', { timeout: 30_000 });

    const md = assistantBubble.locator('[data-slot="ai-bubble-markdown"]');
    await expect(md.locator('h2')).toBeVisible({ timeout: 30_000 });
    await expect(md.locator('ul > li').first()).toBeVisible({ timeout: 30_000 });

    await assertTrackedPageErrors(page);
  });
});
