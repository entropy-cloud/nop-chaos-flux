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

  test('assistant bubble avatar renders 32×32 circle with a lucide svg (D3)', async ({ page }) => {
    await openWidgetsPage(page);

    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toBeVisible();
    await input.fill('avatar geometry');
    await page.locator('[data-slot="ai-sender-submit"]').click();

    const assistantBubble = page.locator('[data-slot="ai-bubble"][data-role="assistant"]').first();
    await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });

    const avatar = assistantBubble.locator('[data-slot="ai-bubble-avatar"]');
    await expect(avatar).toBeVisible();
    await expect(avatar.locator('svg')).toHaveCount(1);

    const box = await avatar.evaluate((el) => el.getBoundingClientRect());
    expect(box.width).toBe(32);
    expect(box.height).toBe(32);

    const radius = await avatar.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe('9999px');

    await assertTrackedPageErrors(page);
  });

  test('welcome icon renders the Bot lucide preset instead of the literal "bot" text (D3)', async ({ page }) => {
    await openWidgetsPage(page);

    const icon = page.locator('[data-slot="ai-welcome-icon"]');
    await expect(icon).toBeVisible();
    await expect(icon.locator('svg')).toHaveCount(1);
    expect((await icon.textContent()) ?? '').not.toBe('bot');

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

test.describe('AI widgets — D6 LaTeX rendering + code highlight', () => {
  const ASSISTANT_MD = '[data-slot="ai-bubble"][data-role="assistant"] [data-slot="ai-bubble-markdown"]';

  async function sendUserMessage(page: import('@playwright/test').Page, text: string) {
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toBeVisible();
    await input.fill(text);
    await page.locator('[data-slot="ai-sender-submit"]').click();
  }

  test('formula keyword renders KaTeX spans for block and inline math (G5)', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Explain the formula for mass energy equivalence');

    const md = page.locator(ASSISTANT_MD);
    const katex = md.locator('span.katex');
    await expect(katex.first()).toBeVisible({ timeout: 30_000 });
    // The formula preset carries one $$...$$ block form plus several $...$
    // inline forms; both must render through KaTeX.
    expect(await katex.count()).toBeGreaterThanOrEqual(2);
    await expect(md.locator('.katex-display')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('code keyword renders lowlight token spans in the fenced block (G6)', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Help me debug this code');

    const md = page.locator(ASSISTANT_MD);
    const code = md.locator('[data-slot="ai-bubble-code"]');
    await expect(code).toBeVisible({ timeout: 30_000 });
    const tokens = code.locator('[class*="tok-"]');
    await expect(tokens.first()).toBeVisible({ timeout: 30_000 });
    expect(await tokens.count()).toBeGreaterThanOrEqual(1);

    await assertTrackedPageErrors(page);
  });
});

test.describe('AI widgets — DV computed-style typography + streaming cadence', () => {
  const ASSISTANT_MD = '[data-slot="ai-bubble"][data-role="assistant"] [data-slot="ai-bubble-markdown"]';

  async function sendUserMessage(page: import('@playwright/test').Page, text: string) {
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toBeVisible();
    await input.fill(text);
    await page.locator('[data-slot="ai-sender-submit"]').click();
  }

  test('citation fixture typography computes styled h2/blockquote/link (light, product-spec §7 row 1)', async ({ page }) => {
    await openWidgetsPage(page);
    // `citation` is the only preset covering all three assertion targets at
    // once (h2 + links + blockquote; default/weather carry no blockquote).
    await sendUserMessage(page, 'Give me a citation summary of the papers');

    const md = page.locator(ASSISTANT_MD);
    const h2 = md.locator('h2').first();
    const blockquote = md.locator('blockquote').first();
    const link = md.locator('a').first();
    await expect(h2).toBeVisible({ timeout: 30_000 });
    await expect(blockquote).toBeVisible({ timeout: 30_000 });
    await expect(link).toBeVisible({ timeout: 30_000 });

    // h2 computed fontSize = 20px (1.25rem) — the D2 rule, not the browser
    // default 1.5em = 24px.
    expect(await h2.evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px');

    // blockquote computed backgroundColor non-transparent (muted token applies).
    expect(await blockquote.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );

    // a computed color is the primary token, not the browser default blue.
    expect(await link.evaluate((el) => getComputedStyle(el).color)).not.toBe('rgb(0, 0, 238)');

    await assertTrackedPageErrors(page);
  });

  test('dark-mode typography computes a dark fenced-code background (product-spec §7 row 2)', async ({ page }) => {
    await openWidgetsPage(page);
    // D2 dual-track dark injection. The host-attribute track is the operative
    // one in the playground (theme-tokens resolve --muted at :root, so the
    // media track's literal fallback never fires here); emulateMedia keeps
    // the §7 wording's prefers-color-scheme simulation active as well.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));

    await sendUserMessage(page, 'Help me debug this code');

    const pre = page.locator(`${ASSISTANT_MD} [data-slot="ai-bubble-pre"]`).first();
    await expect(pre).toBeVisible({ timeout: 30_000 });

    const bg = await pre.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg, 'fenced code must have a painted (non-transparent) background').not.toBe(
      'rgba(0, 0, 0, 0)',
    );
    const channels = (bg.match(/\d+(\.\d+)?/g) ?? []).map(Number).slice(0, 3);
    expect(channels, `expected rgb() channels from ${bg}`).toHaveLength(3);
    // Dark fallback values: theme classic-dark --muted hsl(217 33% 18%) ≈
    // rgb(31, 42, 61); package literal hsl(222 47% 11%) is darker still.
    // Light muted hsl(210 40% 96%) ≈ rgb(240, 245, 250) must fail this.
    expect(Math.max(...channels), `expected a dark fenced-code background, got ${bg}`).toBeLessThan(100);

    await assertTrackedPageErrors(page);
  });

  test('streaming cadence: full widgets-demo stream spans seconds, not milliseconds (product-spec §7 last row)', async ({ page }) => {
    await openWidgetsPage(page);

    const root = page.locator('[data-slot="ai-chat-root"]');
    const input = page.locator('[data-slot="ai-sender-input"] textarea');
    await expect(input).toBeVisible();
    await input.fill('plain greeting');

    // Indirect evidence of the §5 cadence: 200ms/word × >= 10 words means the
    // default preset's full stream must last seconds. The legacy 15ms/word
    // cadence finished in ~120ms, far below this bound. Exact duration is
    // deliberately NOT asserted.
    const startedAt = Date.now();
    await page.locator('[data-slot="ai-sender-submit"]').click();
    await expect(root).toHaveAttribute('data-state', 'completed', { timeout: 20_000 });
    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeGreaterThanOrEqual(2000);

    await assertTrackedPageErrors(page);
  });
});
