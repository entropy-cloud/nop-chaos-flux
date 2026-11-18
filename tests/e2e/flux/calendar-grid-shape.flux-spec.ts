import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.2 calendar monthShape:'grid' (plan 514 Phase 2): six-week date-selection
 * grid renders with zero events/resources; clicking a cell marks it selected
 * (selection ≠ navigation — no date change).
 *
 * Migrated from tests/e2e/calendar-grid-shape.spec.ts (E3 batch 1, engine swap +
 * expectWeb retry-polling for cell count / selection attribute).
 */

export default async function calendarGridShapeSpec(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/lab/calendar');
  const calendar = ft.locator('[data-testid="calendar-grid-shape"]');
  await ft.expectWeb(calendar).toBeVisible({ timeoutMs: 10_000 });

  const cells = calendar.locator('[data-slot="calendar-grid-cell"]');
  await ft.expectWeb(cells).toHaveCount(42, { timeoutMs: 10_000 });

  const target = calendar.locator('[data-outside-month]').first();
  await target.waitFor('attached');
  await target.click();
  await ft.expectWeb(target).toHaveAttribute('data-selected', 'true', { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'calendar-grid-shape');
}
