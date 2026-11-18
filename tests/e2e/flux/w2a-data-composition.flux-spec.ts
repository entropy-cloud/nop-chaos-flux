import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W2a data composition family — pagination / cards / alert / wizard.
 *
 * Migrated from tests/e2e/w2a-data-composition.spec.ts (E3 batch 2, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling, plus a
 * kernel white-box expectNoPageErrors check covering the whole suite and
 * stability gating after state-changing clicks).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openW2a() bounces through '/#/' with a stability gate so the route remounts
 * (ft.reload() is unusable — it destroys the CDP evaluation context mid-spec).
 */

async function openW2a(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/w2a-data-composition');
  await ft.expectWeb(
    ft.getByRole('heading', { name: '数据组合组 — pagination / cards / alert / wizard', level: 1 }),
  ).toBeVisible({ timeoutMs: 20_000 });
}

export default async function w2aDataComposition(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: pagination switches pages via Next and reports onChange
  await openW2a(ft);

  const pagination = ft.locator('[data-testid="demo-pagination"]');
  await ft.expectWeb(pagination).toBeVisible();
  await ft.expectWeb(pagination).toHaveAttribute('data-current-page', '1');
  await ft.expectWeb(pagination).toHaveAttribute('data-total-pages', '10');

  // Click page 2
  await pagination.locator('[data-page="2"]').click();
  await ft.expectWeb(pagination).toHaveAttribute('data-current-page', '2');
  await ft.expectWeb(ft.locator('[data-testid="pagination-report"]')).toHaveText('pagination:touched');

  // Next button advances
  await ft.locator('[data-testid="pagination-next"]').click();
  await ft.expectWeb(pagination).toHaveAttribute('data-current-page', '3');

  await expectNoPageErrors(ft, 'w2a:pagination');

  // Case 2: cards renders N cards from items and toggles single-selection highlight
  await openW2a(ft);

  const cards = ft.locator('[data-testid="demo-cards"]');
  await ft.expectWeb(cards).toBeVisible();
  const cardItems = cards.locator('[data-slot="cards-item"]');
  await ft.expectWeb(cardItems).toHaveCount(3);

  // Single-selection: click card 1, expect highlight + onSelectionChange report
  await cardItems.nth(0).click();
  await ft.expectWeb(cardItems.nth(0)).toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(cardItems.nth(1)).not.toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(ft.locator('[data-testid="card-selection-report"]')).toHaveText('card:selected');

  // Click card 2 — mutual exclusion
  await cardItems.nth(1).click();
  await ft.expectWeb(cardItems.nth(1)).toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(cardItems.nth(0)).not.toHaveAttribute('data-selected', 'true');

  await expectNoPageErrors(ft, 'w2a:cards');

  // Case 3: alert hides and fires onClose when the close button is clicked
  await openW2a(ft);

  const alert = ft.locator('[data-testid="demo-alert"]');
  await ft.expectWeb(alert).toBeVisible();
  await ft.expectWeb(ft.locator('[data-testid="alert-report"]')).toHaveText('alert:open');

  await alert.locator('[data-testid="alert-close"]').click();
  await ft.expectWeb(alert).toHaveCount(0);
  await ft.expectWeb(ft.locator('[data-testid="alert-report"]')).toHaveText('alert:closed');

  await expectNoPageErrors(ft, 'w2a:alert');

  // Case 4: wizard linear mode blocks jumping past the next reachable step
  // (must run before any navigation so the wizard is still on step 0)
  await openW2a(ft);

  const wizard = ft.locator('[data-testid="demo-wizard"]');
  await ft.expectWeb(wizard).toBeVisible();
  // On step 0; step nav button for step 2 (index 2) must be unreachable
  const step2Nav = wizard.locator('[data-slot="wizard-step-nav-button"][data-step-index="2"]');
  await ft.expectWeb(step2Nav).toBeDisabled();
  await ft.expectWeb(step2Nav).not.toHaveAttribute('data-reachable');

  // Clicking disabled nav button does nothing (real CDP click on a disabled control)
  await step2Nav.click();
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 5_000 });
  await ft.expectWeb(wizard).toHaveAttribute('data-current-step-index', '0');

  await expectNoPageErrors(ft, 'w2a:wizard-linear-block');

  // Case 5: wizard advances via Next, separates interaction (stepIndex) from
  // lifecycle (commit status) — continues from step 0 on the same mount
  await ft.expectWeb(wizard).toHaveAttribute('data-last-commit-status', 'idle');

  // Step 1 body visible
  await ft.expectWeb(ft.locator('[data-testid="wizard-step-1"]')).toBeVisible();

  // Click Next → onStepCommit fires (lifecycle → success) and advances (interaction)
  await ft.locator('[data-testid="wizard-next"]').click();
  await ft.expectWeb(wizard).toHaveAttribute('data-current-step-index', '1');
  await ft.expectWeb(wizard).toHaveAttribute('data-last-commit-status', 'success');
  await ft.expectWeb(ft.locator('[data-testid="wizard-step-2"]')).toBeVisible();

  // Status path publication reflects both layers
  const report = ft.locator('[data-testid="wizard-report"]');
  await ft.expectWeb(report).toContainText('wizard:step=1');
  await ft.expectWeb(report).toContainText('commit:success');

  await expectNoPageErrors(ft, 'w2a:wizard-advance');

  // Case 6: wizard onComplete fires when the final step is committed
  // (wizard is on step 1 after case 5; remaining old-spec sub-assertions preserved)
  await ft.locator('[data-testid="wizard-next"]').click();
  await ft.expectWeb(wizard).toHaveAttribute('data-current-step-index', '2');

  // Final commit fires onComplete
  await ft.locator('[data-testid="wizard-next"]').click();
  await ft.expectWeb(ft.locator('[data-testid="wizard-report"]')).toContainText('complete:yes');
  // Stays on final step
  await ft.expectWeb(wizard).toHaveAttribute('data-current-step-index', '2');

  await expectNoPageErrors(ft, 'w2a:wizard-complete');

  return { cases: 6 };
}
