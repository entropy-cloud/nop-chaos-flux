import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI P4 advanced — message branches + platform linkage.
 *
 * Migrated from tests/e2e/ai-branches-linkage.spec.ts (E3 batch 1, engine swap +
 * assertTrackedPageErrors replaced by kernel expectNoPageErrors; Playwright
 * auto-retry expect() mapped onto ft.expectWeb retry-polling with the same
 * timeouts, and the `.or()` locator fallback collapsed to the canonical
 * ai-sender textarea selector).
 */

async function openLinkage(ft: FtGlobal): Promise<void> {
  // Bounce through another hash route first: same-document navigation remounts
  // the demo (fresh per case, like the old per-test Playwright page) without
  // destroying the CDP execution context the way ft.reload() does.
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-testid="p4-branches"]')).not.toBeVisible();
  await ft.goto('/#/ai-linkage');
  await ft.expectWeb(ft.locator('[data-testid="p4-branches"]')).toBeVisible({ timeoutMs: 15_000 });
}

async function sendAndComplete(ft: FtGlobal, text: string): Promise<void> {
  const sender = ft.locator('[data-slot="ai-sender"] textarea');
  await sender.fill(text);
  await sender.press('Enter');
  // Wait for the assistant message (engine completes the mock turn).
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toBeVisible({ timeoutMs: 10_000 });
}

export default async function aiBranchesLinkage(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: Regenerate stamps a new branchId (engine.regenerate)
  await openLinkage(ft);
  await sendAndComplete(ft, 'hello');

  // Before regenerate, no branchId is shown.
  await ft.expectWeb(ft.locator('[data-testid="p4-last-branch-id"]')).toHaveCount(0);

  await ft.locator('[data-testid="p4-regenerate"]').click();
  // After regenerate the host records the stamped branchId.
  await ft.expectWeb(ft.locator('[data-testid="p4-last-branch-id"]')).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-testid="p4-last-branch-id"]')).toContainText('branch-1');

  // The branch picker renders on the regenerated assistant message.
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-branches"]')).toBeVisible();
  await expectNoPageErrors(ft, 'ai-branches-linkage:regenerate');

  // Case 2: branch picker prev/next switches the active branch
  await openLinkage(ft);
  await sendAndComplete(ft, 'hi');
  await ft.locator('[data-testid="p4-regenerate"]').click();
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-branches"]')).toBeVisible({ timeoutMs: 10_000 });
  // After regenerate the engine shows the new branch (2nd of 2).
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-branch-counter"]')).toContainText('2/2');

  // Prev → loads the original branch via engine.setMessages.
  await ft.locator('[data-slot="ai-bubble-branch-prev"]').click();
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble-branch-counter"]')).toContainText('1/2');
  await expectNoPageErrors(ft, 'ai-branches-linkage:prev-next');

  // Case 3: Decision-A + B linkage: completed turn updates the form field + data-source reload
  await openLinkage(ft);
  await sendAndComplete(ft, 'linkage test');

  // Decision-A: messages serialized into the form-field view.
  await ft.expectWeb(ft.locator('[data-testid="p4-form-field"]')).toContainText('linkage test');
  // Decision-B: data-source reload counter advanced to >= 1.
  await ft.expectWeb(ft.locator('[data-testid="p4-reload-count"]')).not.toContainText('0');
  await expectNoPageErrors(ft, 'ai-branches-linkage:linkage');

  return { cases: 3 };
}
