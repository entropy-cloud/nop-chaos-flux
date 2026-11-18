import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI HITL approval — P3 (A-14) end-to-end.
 * approve/reject transitions the tool card to a decided badge + log entry.
 *
 * Migrated from tests/e2e/ai-hitl.spec.ts (E3 batch 1, engine swap +
 * assertTrackedPageErrors → kernel expectNoPageErrors; the two Playwright
 * test cases become sequential cases in one flux-spec run).
 */

async function openHitlDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-hitl');
  // ft.goto is fire-and-forget hash navigation; gate on the page heading so we
  // never match a stale card from the previous route.
  const heading = ft.getByRole('heading', { name: 'AI HITL Approval — P3 (A-14)' });
  await heading.waitFor('visible', { timeoutMs: 15_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-tool-call"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiHitlSpec(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: approve transitions the tool to an approved badge.
  await openHitlDemo(ft);

  // The card starts in the pending approval state.
  const card = ft.locator('[data-slot="ai-tool-call"]');
  await card.waitFor('attached');
  const pendingAttr = await card.attr('data-requires-approval');
  if (pendingAttr === null) throw new Error('hitl approve: card should start pending (data-requires-approval absent)');
  await ft.expectWeb(ft.locator('[data-slot="ai-tool-call-approve"]')).toBeVisible({ timeoutMs: 5_000 });

  await ft.locator('[data-slot="ai-tool-call-approve"]').click();

  // No longer pending; a decided badge is shown.
  const approvedAttr = await card.attr('data-requires-approval');
  if (approvedAttr !== null && approvedAttr !== '') {
    throw new Error(`hitl approve: expected data-requires-approval cleared, got "${approvedAttr}"`);
  }
  await ft.expectWeb(ft.locator('[data-approval-decision="approved"]')).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(ft.locator('[data-testid="hitl-log"]')).toContainText('Approved', { timeoutMs: 5_000 });

  await expectNoPageErrors(ft, 'ai-hitl:approve');

  // Case 2: reject transitions the tool to a rejected badge.
  // ft.goto to the identical URL is a no-op (and ft.reload tears down the CDP
  // inspection), so route away and back to remount the demo fresh.
  await ft.goto('/#/lab/kanban');
  await ft.expectWeb(ft.locator('[data-testid="kanban-card-template"]')).toBeVisible({ timeoutMs: 15_000 });
  await openHitlDemo(ft);
  const card2 = ft.locator('[data-slot="ai-tool-call"]');

  const rejectBtn = ft.locator('[data-slot="ai-tool-call-reject"]');
  await rejectBtn.waitFor('visible', { timeoutMs: 15_000 });
  await rejectBtn.click();
  await ft.expectWeb(ft.locator('[data-approval-decision="rejected"]')).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(ft.locator('[data-testid="hitl-log"]')).toContainText('Rejected', { timeoutMs: 5_000 });

  // Card no longer requires approval after the decision.
  const rejectedAttr = await card2.attr('data-requires-approval');
  if (rejectedAttr !== null && rejectedAttr !== '') {
    throw new Error(`hitl reject: expected data-requires-approval cleared, got "${rejectedAttr}"`);
  }

  await expectNoPageErrors(ft, 'ai-hitl');

  return { cases: 2 };
}
