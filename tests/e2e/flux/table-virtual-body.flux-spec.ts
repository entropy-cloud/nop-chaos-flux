import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 2026-09-28-7 — VirtualBody zero-rows live defect regression. The
 * defect only reproduces under the React Compiler build (happy-dom masks
 * it), so this browser-level spec is the binding guard: the virtualized
 * mode must mount windowed data rows (no empty-state row) and update the
 * window on scroll.
 *
 * Migrated from tests/e2e/table-virtual-body.spec.ts (E3 batch 4, engine swap +
 * waitForTimeout(700) upgraded to an explicit scroll-position poll loop, and
 * assertTrackedPageErrors upgraded to kernel white-box expectNoPageErrors).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * openVirtualizedMode() bounces through '/#/' with a stability gate so the
 * route remounts (ft.reload() is unusable mid-spec).
 * TODO(migrate-debt): evaluate fallback (VirtualBody DOM state probes + scroll
 * container scrollTop manipulation via ft.evaluate querySelector — no driver
 * element-evaluate / scroll APIs).
 */

async function openVirtualizedMode(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/performance-table');
  await ft.expectWeb(ft.getByRole('heading', { name: 'Table Performance Playground' })).toBeVisible({
    timeoutMs: 30_000,
  });
  await ft.getByRole('button', { name: 'Virtualized' }).click();
  // the FIRST tbody tr is the aria-hidden top spacer (0-height at scrollTop 0) —
  // wait for a real data row instead
  await ft.expectWeb(ft.locator('tbody tr:not([aria-hidden="true"])').first()).toBeVisible({
    timeoutMs: 15_000,
  });
}

interface VirtualState {
  total: number;
  dataRowCount: number;
  emptyRow: boolean;
  scrollTop: number;
  firstData: string;
  topSpacerHeight: string;
}

async function probeState(ft: FtGlobal): Promise<VirtualState> {
  return (await ft.evaluate(
    `(() => { const container = Array.from(document.querySelectorAll('[data-slot="table-container"]')).find((el) => el.clientHeight < el.scrollHeight); const tbody = container ? container.querySelector('tbody') : document.querySelector('tbody'); const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : []; const dataRows = rows.filter((tr) => tr.getAttribute('aria-hidden') !== 'true'); const topSpacer = rows.find((tr) => tr.getAttribute('aria-hidden') === 'true'); return { total: rows.length, dataRowCount: dataRows.length, emptyRow: rows.some((tr) => tr.getAttribute('data-slot') === 'table-empty-row'), scrollTop: container ? container.scrollTop : 0, firstData: dataRows[0] ? dataRows[0].textContent : '', topSpacerHeight: topSpacer ? topSpacer.style.height : '' }; })()`,
  )) as VirtualState;
}

export default async function tableVirtualBody(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: renders windowed data rows (no empty-state) under the compiled build
  await openVirtualizedMode(ft);
  const mounted = await probeState(ft);
  if (!(mounted.dataRowCount > 0)) {
    throw new Error(`virtualized mode should mount data rows, got ${JSON.stringify(mounted)}`);
  }
  if (mounted.emptyRow) {
    throw new Error('virtualized mode must not render the table-empty-row empty state');
  }
  await expectNoPageErrors(ft, 'table-virtual:mounted');

  // Case 2: scroll updates the virtual window — the harness rows are rich
  // mixed renderers (~190px measured), so scroll deep to the bottom and
  // compare the rendered row identity (row 0 stays in the overscan window).
  await openVirtualizedMode(ft);
  // TODO(migrate-debt): evaluate fallback (scrollTop manipulation on the
  // overflowing table container — no driver-level scroll API)
  await ft.evaluate(
    `(() => { const container = Array.from(document.querySelectorAll('[data-slot="table-container"]')).find((el) => el.clientHeight < el.scrollHeight); if (container) { container.scrollTop = container.scrollHeight; container.dispatchEvent(new Event('scroll', { bubbles: true })); } })()`,
  );
  let last: VirtualState | null = null;
  let scrolled = false;
  for (let i = 0; i < 50; i++) {
    last = await probeState(ft);
    if (last.scrollTop > 10_000) {
      scrolled = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!last || !scrolled) {
    throw new Error(`container scrollTop never exceeded 10_000 after deep scroll, last ${JSON.stringify(last)}`);
  }
  if (last.emptyRow) throw new Error('empty-state row appeared after scrolling');
  // the window followed the scroll: real content above (top spacer) and a
  // row beyond user_1 rendered first
  if (last.topSpacerHeight === '' || parseFloat(last.topSpacerHeight) <= 10_000) {
    throw new Error(`top spacer should hold >10_000px of scrolled-over content, got "${last.topSpacerHeight}"`);
  }
  if (last.firstData.includes('user_1 <')) {
    throw new Error(`virtual window did not follow the scroll — first data row is still user_1: ${last.firstData.slice(0, 80)}`);
  }
  await expectNoPageErrors(ft, 'table-virtual:scroll');

  return { cases: 2 };
}
