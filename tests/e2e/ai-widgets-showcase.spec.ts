import { expect, test, assertTrackedPageErrors } from './fixtures.js';

/**
 * D5 showcase completeness (`docs/plans/2026-08-24-2237-2-d5-showcase-completeness.md`).
 *
 * Contract: `docs/components/flux-renderers-ai/product-spec.md` §6 —
 * first-screen visible widget count >= 8 and, after fixture triggers, the
 * conversation area shows the three previously-absent widget capabilities:
 * tool-call card, citations marker, reasoning collapse panel.
 *
 * Counting whitelist (§6.1 operationalization, plan review finding ①): only
 * showcase entry root slots + card anchors count. A bare `[data-slot^="ai-"]`
 * match would also count nested slots (bubble markdown/avatar/sender parts)
 * and make the pre-D5 baseline already >= 8, so the red lock would never hold.
 */

const SHOWCASE_WIDGET_SLOTS = [
  'ai-welcome',
  'ai-prompts',
  'ai-token-usage',
  'ai-feedback',
  'ai-suggestions',
  'ai-voice-input',
  'ai-citations',
] as const;

const SHOWCASE_CARD_HREFS = ['#/ai-tools', '#/ai-citations'] as const;

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

test.describe('AI widgets showcase — D5 completeness (G7)', () => {
  test('(a) first screen shows >= 8 visible widgets (whitelist count)', async ({ page }) => {
    await openWidgetsPage(page);
    // The whitelist slots are all part of the initial schema render; wait for
    // the first one so the non-retrying isVisible() count loop cannot race
    // the initial mount.
    await expect(page.locator('[data-slot="ai-welcome"]')).toBeVisible();

    const counted: string[] = [];
    for (const slot of SHOWCASE_WIDGET_SLOTS) {
      if (await page.locator(`[data-slot="${slot}"]`).first().isVisible()) {
        counted.push(slot);
      }
    }
    for (const href of SHOWCASE_CARD_HREFS) {
      if (await page.locator(`a[href="${href}"]`).first().isVisible()) {
        counted.push(`card:${href}`);
      }
    }
    expect(
      counted.length,
      `visible showcase widget count (found: ${counted.join(', ')})`,
    ).toBeGreaterThanOrEqual(8);

    await assertTrackedPageErrors(page);
  });

  test('(b) thumbnail cards link to the full demo routes between welcome and prompts', async ({ page }) => {
    await openWidgetsPage(page);

    const toolCard = page.locator('a[href="#/ai-tools"]');
    await expect(toolCard).toBeVisible();
    await expect(toolCard).toContainText('Tool Call');

    const citationCard = page.locator('a[href="#/ai-citations"]');
    await expect(citationCard).toBeVisible();
    await expect(citationCard).toContainText('Citations');

    // product-spec §6.2 placement: both cards sit in beforeMessages, between
    // welcome and prompts (document order assertion).
    const placement = await page.evaluate(() => {
      const before = document.querySelector('[data-slot="ai-chat-before"]');
      const welcome = before?.querySelector('[data-slot="ai-welcome"]');
      const prompts = before?.querySelector('[data-slot="ai-prompts"]');
      const tools = document.querySelector('a[href="#/ai-tools"]');
      const citations = document.querySelector('a[href="#/ai-citations"]');
      if (!before || !welcome || !prompts || !tools || !citations) return false;
      const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;
      return (
        (welcome.compareDocumentPosition(tools) & FOLLOWS) !== 0 &&
        (tools.compareDocumentPosition(prompts) & FOLLOWS) !== 0 &&
        (welcome.compareDocumentPosition(citations) & FOLLOWS) !== 0 &&
        (citations.compareDocumentPosition(prompts) & FOLLOWS) !== 0
      );
    });
    expect(placement, 'cards are between welcome and prompts in beforeMessages').toBe(true);

    await assertTrackedPageErrors(page);
  });

  test('(c) reasoning keyword reveals the reasoning collapse panel', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'Show me your reasoning for the routing failure');

    await expect(page.locator('[data-slot="ai-bubble-reasoning"]').first()).toBeVisible({
      timeout: 30_000,
    });

    await assertTrackedPageErrors(page);
  });

  test('(d) weather keyword reveals the tool-call card then the forecast table', async ({ page }) => {
    await openWidgetsPage(page);
    await sendUserMessage(page, 'What is the weather outlook this week?');

    const toolsCard = page.locator('[data-slot="ai-bubble-tools"]');
    await expect(toolsCard.first()).toBeVisible({ timeout: 30_000 });
    await expect(toolsCard.locator('[data-slot="ai-tool-call"]').first()).toBeVisible();

    // The follow-up round streams the original weather content — the forecast
    // table still lands in a later assistant bubble.
    await expect(page.locator('[data-slot="ai-bubble-markdown"] table').first()).toBeVisible({
      timeout: 30_000,
    });

    await assertTrackedPageErrors(page);
  });

  test('(e) citations widget shows [N] sup markers bound to the static demo message', async ({ page }) => {
    await openWidgetsPage(page);

    // D-a static binding (plan Decision D-a): the ai-citations instance is
    // bound to pageData message + explicit sources, so the markers are present
    // on first screen — the assertion pins the in-widget marker structure,
    // not a trigger timeline.
    const citations = page.locator('[data-slot="ai-citations"][data-mode="inline"]');
    await expect(citations.first()).toBeVisible();

    const markers = citations.locator('sup [data-citation-index]');
    await expect(markers.first()).toBeVisible();
    await expect(markers).toHaveCount(2, { timeout: 10_000 });
    await expect(citations.locator('sup [data-citation-index="1"]').first()).toBeVisible();
    await expect(citations.locator('sup [data-citation-index="2"]').first()).toBeVisible();

    await assertTrackedPageErrors(page);
  });
});
