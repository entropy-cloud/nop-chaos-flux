import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * w3c value mapping family — mapping/status.
 *
 * Migrated from tests/e2e/w3c-value-mapping.spec.ts (E3 batch 2, engine swap +
 * locator.evaluate(className) reads upgraded to retry-polling attr/expectWeb
 * checks; console-level assertTrackedPageErrors replaced by kernel white-box
 * expectNoPageErrors).
 */

async function openW3c(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/w3c-value-mapping');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 30_000 });
  await ft.expectWeb(
    ft.getByRole('heading', { name: '值映射组 — mapping / status', level: 1 }),
  ).toBeVisible({ timeoutMs: 20_000 });
}

async function expectClassContains(ft: FtGlobal, selector: string, expected: string, marker: string): Promise<void> {
  // retry-poll on the class attribute instead of the old one-shot evaluate read
  let cls: string | null = null;
  for (let i = 0; i < 25; i++) {
    cls = await ft.locator(selector).attr('class');
    if (cls && cls.includes(expected)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${marker}: className "${cls}" does not contain "${expected}"`);
}

async function expectSvgCountAtLeast(ft: FtGlobal, selector: string, min: number, marker: string): Promise<void> {
  // TODO(migrate-debt): evaluate fallback (driver has no locator.evaluate for
  // descendant svg counting; document.querySelector on the unique testid is equivalent)
  const count = await ft.evaluate(
    `document.querySelector('${selector}') ? document.querySelectorAll('${selector} svg').length : -1`,
  );
  if (typeof count !== 'number' || count < min) {
    throw new Error(`${marker}: svg count ${count} < ${min}`);
  }
}

export default async function w3cValueMapping(ft: FtGlobal): Promise<{ cases: number }> {
  // All 10 cases are read-only assertions on the initial page state (the old
  // Playwright suite re-opened the route per test purely for isolation), so a
  // single open covers them without per-case remount.
  await openW3c(ft);

  // Case 1: mapping renders the nop-mapping marker and a hit value as text
  const mapping = ft.getByTestId('mapping-hit');
  await ft.expectWeb(mapping).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(mapping).toHaveAttribute('data-slot', 'mapping-root');
  await ft.expectWeb(mapping).toHaveAttribute('data-state', 'hit');
  await expectClassContains(ft, '[data-testid="mapping-hit"]', 'nop-mapping', 'mapping-hit');
  await ft.expectWeb(mapping.locator('[data-slot="mapping-item"]')).toHaveText('Active');

  // Case 2: mapping miss prefers defaultLabel over placeholder
  const missDefault = ft.getByTestId('mapping-miss-default');
  await ft.expectWeb(missDefault).toHaveAttribute('data-state', 'miss');
  await ft.expectWeb(missDefault.locator('[data-slot="mapping-item"]')).toHaveText('Unknown state');

  // Case 3: mapping miss falls back to placeholder when no defaultLabel
  const missPlaceholder = ft.getByTestId('mapping-miss-placeholder');
  await ft.expectWeb(missPlaceholder).toHaveAttribute('data-state', 'miss');
  await ft.expectWeb(missPlaceholder.locator('[data-slot="mapping-item"]')).toHaveText('Placeholder fallback');

  // Case 4: mapping renders placeholder for an empty (null) value (no throw)
  const empty = ft.getByTestId('mapping-empty');
  await ft.expectWeb(empty).toHaveAttribute('data-state', 'empty');
  await ft.expectWeb(empty.locator('[data-slot="mapping-item"]')).toHaveText('No value');

  // Case 5: mapping item region template renders when value hits
  const itemRegion = ft.getByTestId('mapping-item-region');
  await ft.expectWeb(itemRegion).toHaveAttribute('data-state', 'hit');
  await ft.expectWeb(itemRegion.locator('[data-slot="mapping-item"]')).toContainText('Custom hit template');

  // Case 6: mapping resolves value from a scope expression (taskStatus=doing → In Progress)
  const expr = ft.getByTestId('mapping-expr');
  await ft.expectWeb(expr).toHaveAttribute('data-state', 'hit');
  await ft.expectWeb(expr.locator('[data-slot="mapping-item"]')).toHaveText('In Progress');

  // Case 7: status renders the nop-status marker and label from labelMap
  const status = ft.getByTestId('status-success');
  await ft.expectWeb(status).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(status).toHaveAttribute('data-slot', 'status-root');
  await ft.expectWeb(status).toHaveAttribute('data-state', 'hit');
  await expectClassContains(ft, '[data-testid="status-success"]', 'nop-status', 'status-success');
  await ft.expectWeb(status.locator('[data-slot="status-badge"]')).toHaveText('Completed');

  // Case 8: status levelMap projects to Badge semantic color classes (programmatic)
  // success → text-success/bg-success/15, warning → text-warning/bg-warning/15, error → destructive
  await expectClassContains(ft, '[data-testid="status-success"] [data-slot="status-badge"]', 'text-success', 'status-success-badge');
  await expectClassContains(ft, '[data-testid="status-success"] [data-slot="status-badge"]', 'bg-success/15', 'status-success-badge');
  await expectClassContains(ft, '[data-testid="status-warning"] [data-slot="status-badge"]', 'text-warning', 'status-warning-badge');
  await expectClassContains(ft, '[data-testid="status-warning"] [data-slot="status-badge"]', 'bg-warning/15', 'status-warning-badge');
  await expectClassContains(ft, '[data-testid="status-error"] [data-slot="status-badge"]', 'destructive', 'status-error-badge');
  await ft.expectWeb(ft.getByTestId('status-success')).toHaveAttribute('data-level', 'success');
  await ft.expectWeb(ft.getByTestId('status-warning')).toHaveAttribute('data-level', 'warning');
  await ft.expectWeb(ft.getByTestId('status-error')).toHaveAttribute('data-level', 'error');

  // Case 9: status iconMap renders an icon inside the badge
  await ft.expectWeb(ft.getByTestId('status-icon').locator('[data-slot="status-badge"]')).toBeVisible();
  await expectSvgCountAtLeast(ft, '[data-testid="status-icon"] [data-slot="status-badge"]', 1, 'status-icon');

  // Case 10: status miss renders placeholder and no badge
  const miss = ft.getByTestId('status-miss');
  await ft.expectWeb(miss).toHaveAttribute('data-state', 'miss');
  await ft.expectWeb(miss).toHaveText('Unknown status');
  await ft.expectWeb(miss.locator('[data-slot="status-badge"]')).toHaveCount(0);

  // Case 11: status resolves value from a scope expression and projects its level
  // (deployState=running → Running + success level)
  const statusExpr = ft.getByTestId('status-expr');
  await ft.expectWeb(statusExpr).toHaveAttribute('data-state', 'hit');
  await ft.expectWeb(statusExpr).toHaveAttribute('data-level', 'success');
  await ft.expectWeb(statusExpr.locator('[data-slot="status-badge"]')).toHaveText('Running');

  await expectNoPageErrors(ft, 'w3c-value-mapping');

  return { cases: 11 };
}
