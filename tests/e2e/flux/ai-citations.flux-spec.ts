import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI citations — P3 (A-13) end-to-end.
 * [N] markers render as hoverable sup triggers and open a source card;
 * list mode renders a bottom sources list.
 *
 * Migrated from tests/e2e/ai-citations.spec.ts (E3 batch 1, engine swap +
 * assertTrackedPageErrors → kernel expectNoPageErrors; the two Playwright
 * test cases become sequential cases in one flux-spec run).
 */

async function openCitationsDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-citations');
  await ft.expectWeb(ft.locator('[data-testid="ai-citations-widget"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiCitationsSpec(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: [N] triggers render and clicking one opens a source card.
  await openCitationsDemo(ft);

  // Citation triggers are present (the sample content has [1], [2], [1,2]).
  const triggers = ft.locator('[data-testid="ai-citations-widget"] [data-citation-index]');
  await ft.expectWeb(triggers).toHaveCount(4, { timeoutMs: 10_000 }); // [1]→1, [2]→2, [1,2]→1,2

  // Clicking a citation opens a source card with the source title.
  await triggers.first().click();
  const card = ft.locator('[data-slot="ai-citation-card"]');
  await ft.expectWeb(card).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(card).toContainText('flux-renderers-ai design.md', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'ai-citations:trigger-card');

  // Case 2: list mode renders a bottom sources list.
  const list = ft.locator('[data-testid="ai-citations-list"]');
  await ft.expectWeb(list).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(list.locator('[data-slot="ai-citation-item"]')).toHaveCount(2, { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'ai-citations');

  return { cases: 2 };
}
