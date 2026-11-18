import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

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
 *
 * Migrated from tests/e2e/ai-widgets-showcase.spec.ts (E3 batch 2, engine swap +
 * kernel white-box expectNoPageErrors in place of assertTrackedPageErrors;
 * per-case isolation via gated hash-route bounce — ft.reload() destroys the
 * CDP evaluation context, so the old fresh-page-per-test pattern is replaced
 * with a bounce through '/#/' gated on the lab marker unmounting).
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

async function openWidgetsPage(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the lab remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).not.toBeVisible();
  await ft.goto('/#/ai-widgets');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 15_000 });
}

async function sendUserMessage(ft: FtGlobal, text: string): Promise<void> {
  const input = ft.locator('[data-slot="ai-sender-input"] textarea');
  await ft.expectWeb(input).toBeVisible();
  // submit via Enter on the focused textarea: the page's fixed bottom-right
  // playground overlay covers the submit button center, so a real CDP click
  // on it would land on the overlay instead
  await input.fill(text);
  await ft.keyboard.press('Enter');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
}

async function firstVisible(ft: FtGlobal, selector: string): Promise<boolean> {
  return await ft.locator(selector).first().isVisible();
}

async function expectCardsBetweenWelcomeAndPrompts(ft: FtGlobal): Promise<void> {
  // TODO(migrate-debt): evaluate fallback (document-order check needs
  // compareDocumentPosition across five separate nodes — not expressible with
  // locators; the selector set mirrors the old page.evaluate body exactly)
  const placement = await ft.evaluate(
    `(() => {
      const before = document.querySelector('[data-slot="ai-chat-before"]');
      const welcome = before && before.querySelector('[data-slot="ai-welcome"]');
      const prompts = before && before.querySelector('[data-slot="ai-prompts"]');
      const tools = document.querySelector('a[href="#/ai-tools"]');
      const citations = document.querySelector('a[href="#/ai-citations"]');
      if (!before || !welcome || !prompts || !tools || !citations) return false;
      const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;
      return (
        ((welcome.compareDocumentPosition(tools) & FOLLOWS) !== 0) &&
        ((tools.compareDocumentPosition(prompts) & FOLLOWS) !== 0) &&
        ((welcome.compareDocumentPosition(citations) & FOLLOWS) !== 0) &&
        ((citations.compareDocumentPosition(prompts) & FOLLOWS) !== 0)
      );
    })()`,
  );
  if (placement !== true) {
    throw new Error('cards are not between welcome and prompts in beforeMessages');
  }
}

export default async function aiWidgetsShowcase(ft: FtGlobal): Promise<{ cases: number }> {
  // Case (a): first screen shows >= 8 visible widgets (whitelist count)
  await openWidgetsPage(ft);
  // The whitelist slots are all part of the initial schema render; wait for
  // the first one so the isVisible() count loop cannot race the initial mount.
  await ft.expectWeb(ft.locator('[data-slot="ai-welcome"]')).toBeVisible();

  const counted: string[] = [];
  for (const slot of SHOWCASE_WIDGET_SLOTS) {
    if (await firstVisible(ft, `[data-slot="${slot}"]`)) counted.push(slot);
  }
  for (const href of SHOWCASE_CARD_HREFS) {
    if (await firstVisible(ft, `a[href="${href}"]`)) counted.push(`card:${href}`);
  }
  if (counted.length < 8) {
    throw new Error(`visible showcase widget count ${counted.length} < 8 (found: ${counted.join(', ')})`);
  }

  await expectNoPageErrors(ft, 'ai-widgets-showcase:a');

  // Case (b): thumbnail cards link to the full demo routes between welcome and prompts
  await openWidgetsPage(ft);

  const toolCard = ft.locator('a[href="#/ai-tools"]');
  await ft.expectWeb(toolCard).toBeVisible();
  await ft.expectWeb(toolCard).toContainText('Tool Call');

  const citationCard = ft.locator('a[href="#/ai-citations"]');
  await ft.expectWeb(citationCard).toBeVisible();
  await ft.expectWeb(citationCard).toContainText('Citations');

  // product-spec §6.2 placement: both cards sit in beforeMessages, between
  // welcome and prompts (document order assertion).
  await expectCardsBetweenWelcomeAndPrompts(ft);

  await expectNoPageErrors(ft, 'ai-widgets-showcase:b');

  // Case (c): reasoning keyword reveals the reasoning collapse panel
  await openWidgetsPage(ft);
  await sendUserMessage(ft, 'Show me your reasoning for the routing failure');

  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-reasoning"]').first()).toBeVisible({
    timeoutMs: 30_000,
  });

  await expectNoPageErrors(ft, 'ai-widgets-showcase:c');

  // Case (d): weather keyword reveals the tool-call card then the forecast table
  await openWidgetsPage(ft);
  await sendUserMessage(ft, 'What is the weather outlook this week?');

  const toolsCard = ft.locator('[data-slot="ai-bubble-tools"]');
  await ft.expectWeb(toolsCard.first()).toBeVisible({ timeoutMs: 60_000 });
  await ft.expectWeb(toolsCard.locator('[data-slot="ai-tool-call"]').first()).toBeVisible();

  // The follow-up round streams the original weather content — the forecast
  // table still lands in a later assistant bubble.
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-markdown"] table').first()).toBeVisible({
    timeoutMs: 60_000,
  });

  await expectNoPageErrors(ft, 'ai-widgets-showcase:d');

  // Case (e): citations widget shows [N] sup markers bound to the static demo message
  await openWidgetsPage(ft);

  // D-a static binding (plan Decision D-a): the ai-citations instance is
  // bound to pageData message + explicit sources, so the markers are present
  // on first screen — the assertion pins the in-widget marker structure,
  // not a trigger timeline.
  const citations = ft.locator('[data-slot="ai-citations"][data-mode="inline"]');
  await ft.expectWeb(citations.first()).toBeVisible();

  const markers = citations.locator('sup [data-citation-index]');
  await ft.expectWeb(markers.first()).toBeVisible();
  await ft.expectWeb(markers).toHaveCount(2, { timeoutMs: 10_000 });
  await ft.expectWeb(citations.locator('sup [data-citation-index="1"]').first()).toBeVisible();
  await ft.expectWeb(citations.locator('sup [data-citation-index="2"]').first()).toBeVisible();

  await expectNoPageErrors(ft, 'ai-widgets-showcase:e');

  return { cases: 5 };
}
