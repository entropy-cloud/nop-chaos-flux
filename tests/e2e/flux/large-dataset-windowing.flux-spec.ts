import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 2026-09-29-6 Phase 1: compiled-product proof for the list/transfer
 * windowing paths. BLOCKED (see plan 2026-09-29-6 Deferred): the playground
 * does not yet expose large-dataset list/transfer demo pages — the cases
 * below stay skipped for parity with the old suite (ready-to-unblock shape,
 * test.skip + plan pointer, 2026-09-28-2 precedent). Unit coverage:
 * list-windowing.test.tsx (real fallback render + mocked window branch) and
 * transfer-windowing.test.tsx (real below-threshold render + mocked window
 * branch).
 *
 * Migrated from tests/e2e/large-dataset-windowing.spec.ts (E3 batch 4,
 * engine swap + gated route arrival replacing waitForSelector/waitForTimeout;
 * both old cases remain skipped — playground demo pages do not exist yet, so
 * there is no runnable oracle to preserve, and the blocked shape is carried
 * forward verbatim as documentation).
 */

export default async function largeDatasetWindowing(ft: FtGlobal): Promise<{ cases: number; skipped: number }> {
  await ft.setViewportSize(1280, 800);

  // Blocked case A (ready-to-unblock shape, kept for parity — do not enable
  // until /#/performance-table?mode=virtualized-list exists):
  //   goto('/#/performance-table?mode=virtualized-list')
  //   gate arrival on '[data-slot="list-root"]'
  //   rows = '[data-slot="list-item"]'; 0 < count < 300
  //   wheel 0,3000 via ft.mouse.wheel after a stability gate; assert
  //   rows.first() attr('data-item-key') changed (explicit retry loop).
  //
  // Blocked case B (ready-to-unblock shape):
  //   goto('/#/transfer-windowing')
  //   gate arrival on '[data-slot="transfer-option-candidate"]'
  //   0 < count < 1000; click first candidate; assert >0 checked inputs.

  // Smoke proof the harness still boots against the live playground while
  // the real cases stay blocked.
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'large-dataset-windowing:smoke-blocked');

  return { cases: 0, skipped: 2 };
}
