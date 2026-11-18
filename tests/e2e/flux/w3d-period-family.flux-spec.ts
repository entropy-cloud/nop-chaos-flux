import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W3d period family — input-month / input-quarter / input-year / month-range,
 * writing selections back to scope (live scope report echoes).
 *
 * Migrated from tests/e2e/w3d-period-family.spec.ts (E3 batch 3, engine swap +
 * gated hash-route bounce isolation replacing fresh-page fixtures).
 *
 * Strengthening upgrade: the old spec had no page-error tracking at all;
 * every case now ends with a named expectNoPageErrors kernel check.
 *
 * TODO(migrate-debt): evaluate fallback (scrollIntoViewIfNeeded missing from
 * the driver; scroll done via evaluate + scrollIntoView before fills).
 */

async function openW3d(ft: FtGlobal): Promise<void> {
  // Bounce through the home route so the page remounts between cases
  // (fresh-page isolation parity; ft.reload() destroys the CDP context).
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/w3d-advanced-input-family');
  await ft.expectWeb(
    ft.getByRole('heading', { name: '高级输入族 — period / markdown-editor / upload / editor', level: 1 }),
  ).toBeVisible({ timeoutMs: 20_000 });
}

async function scrollIntoView(ft: FtGlobal, selector: string): Promise<void> {
  // TODO(migrate-debt): evaluate fallback (no scrollIntoViewIfNeeded on Locator)
  await ft.evaluate(`document.querySelector('${selector}')?.scrollIntoView({ block: 'center' })`);
}

export default async function w3dPeriodFamily(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: input-month writes the selected value back to scope
  await openW3d(ft);
  const monthReport = ft.locator('[data-testid="month-report"]');
  await ft.expectWeb(monthReport).toContainText('month:2024-06');
  await scrollIntoView(ft, '[data-testid="demo-input-month"]');
  const monthInput = ft.locator('[data-testid="demo-input-month"] input[data-testid="period-input-month"]');
  // 2024-09 is inside the minDate(2024-01)/maxDate(2024-12) window.
  await monthInput.fill('2024-09');
  await ft.expectWeb(monthReport).toHaveText('month:2024-09', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'w3d-period:month');

  // Case 2: input-quarter renders the initial quarter and writes a new quarter selection
  await openW3d(ft);
  const quarterReport = ft.locator('[data-testid="quarter-report"]');
  await ft.expectWeb(quarterReport).toContainText('quarter:2024-Q3');
  await scrollIntoView(ft, '[data-testid="demo-input-quarter"]');
  const quarterSelect = ft.locator('[data-testid="demo-input-quarter"] [data-testid="period-input-quarter"] select');
  await quarterSelect.selectOption('1');
  await ft.expectWeb(quarterReport).toHaveText('quarter:2024-Q1', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'w3d-period:quarter');

  // Case 3: input-year writes the selected year back to scope
  await openW3d(ft);
  const yearReport = ft.locator('[data-testid="year-report"]');
  await ft.expectWeb(yearReport).toContainText('year:2024');
  await scrollIntoView(ft, '[data-testid="demo-input-year"]');
  const yearInput = ft.locator('[data-testid="demo-input-year"] input[data-testid="period-input-year"]');
  await yearInput.fill('');
  await yearInput.fill('2031');
  await ft.expectWeb(yearReport).toHaveText('year:2031', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'w3d-period:year');

  // Case 4: input-month range selectionMode joins ends with the delimiter
  await openW3d(ft);
  const rangeReport = ft.locator('[data-testid="range-report"]');
  await ft.expectWeb(rangeReport).toContainText('range:2024-01,2024-06');
  // The range field exposes its resolved selection mode for assertions.
  await ft.expectWeb(
    ft.locator('[data-testid="demo-input-month-range"] [data-selection-mode]'),
  ).toHaveAttribute('data-selection-mode', 'range');
  await expectNoPageErrors(ft, 'w3d-period:range');

  return { cases: 4 };
}
