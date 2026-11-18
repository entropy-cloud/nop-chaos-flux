import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Plan 2026-08-09-1140-1 Phase 1 proof (host fixture:
 * apps/playground/src/pages/table-column-width-demo.tsx, route #/table-column-width).
 * Real-browser host assertions — jsdom cannot execute CSS table layout, so the
 * P1-01/P1-02 regressions must be pinned in a browser host (AGENTS.md:
 * programmatic width assertions only, no screenshots).
 *
 * Live-browser discovery (recorded in plan Phase 1): Chromium's auto table
 * layout IGNORES `max-width` on table cells, so the WIP's 120px header cap did
 * not freeze column widths — the pixel sum below is green on both WIP and the
 * fix and pins the END STATE. The discriminating RED assertions are the inline
 * style check (the WIP emits width/minWidth/maxWidth=120 on every no-width
 * header cell; the fix emits nothing so the column can auto-stretch) and the
 * non-sticky selection column pixel width (WIP renders ~65px vs 40px declared).
 *
 * Migrated from tests/e2e/table-column-width-layout.spec.ts (E3 batch 2, engine swap +
 * locator.evaluateAll/evaluate probes mapped onto ft.evaluate document.querySelectorAll
 * probes, plus a resetRoute remount gate replacing Playwright per-test fresh pages —
 * strengthening: each case now explicitly gates on the fixture heading before asserting).
 */

function tableSelector(testid: string): string {
  return `[data-testid="${testid}"] table[data-slot="table"]`;
}

// TODO(migrate-debt): evaluate fallback (batch width read over all header cells has no
// driver locator.evaluateAll equivalent; keep the probe as a single string eval)
async function readCellWidths(ft: FtGlobal, testid: string): Promise<number[]> {
  const raw = await ft.evaluate(
    `JSON.stringify(Array.from(document.querySelectorAll('${tableSelector(testid)} thead th')).map(function (c) { return c.getBoundingClientRect().width; }))`,
  );
  return JSON.parse(String(raw)) as number[];
}

// TODO(migrate-debt): evaluate fallback (inline style read per header cell)
async function readHeaderInlineWidthStyles(
  ft: FtGlobal,
  testid: string,
): Promise<Array<{ width: string; minWidth: string; maxWidth: string }>> {
  const raw = await ft.evaluate(
    `JSON.stringify(Array.from(document.querySelectorAll('${tableSelector(testid)} thead [data-slot="table-head"]')).map(function (c) { return { width: c.style.width, minWidth: c.style.minWidth, maxWidth: c.style.maxWidth }; }))`,
  );
  return JSON.parse(String(raw)) as Array<{ width: string; minWidth: string; maxWidth: string }>;
}

async function readRectWidth(ft: FtGlobal, selector: string): Promise<number> {
  const raw = await ft.evaluate(
    `(function () { var el = document.querySelector('${selector}'); return el ? el.getBoundingClientRect().width : null; })()`,
  );
  if (raw === null || raw === undefined) throw new Error(`element not found: ${selector}`);
  return Number(raw);
}

async function readComputedStyle(ft: FtGlobal, selector: string, prop: string): Promise<string> {
  const raw = await ft.evaluate(
    `(function () { var el = document.querySelector('${selector}'); return el ? getComputedStyle(el).getPropertyValue('${prop}') : null; })()`,
  );
  return String(raw ?? '');
}

async function openFixture(ft: FtGlobal): Promise<void> {
  // goto to the same hash url is a no-op — bounce through '/#/' so the fixture remounts
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/table-column-width');
  // heading text carries a trailing "（…）" suffix — RegExp (partial) name match
  await ft
    .expectWeb(ft.getByRole('heading', { name: /Table 列宽策略宿主 fixture/, level: 1 }))
    .toBeVisible({ timeoutMs: 15_000 });
}

export default async function tableColumnWidthLayout(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: default table with no explicit widths fills the container and pins no header cell width
  await openFixture(ft);

  const tableSel = tableSelector('width-default-auto');
  await ft.expectWeb(ft.locator(tableSel)).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(`${tableSel} tbody tr`)).toHaveCount(4);

  // RED on WIP: the maxWidth fix emitted width/minWidth/maxWidth=120 on every
  // no-width header cell. The fix must not pin them (auto layout may stretch).
  const styles = await readHeaderInlineWidthStyles(ft, 'width-default-auto');
  if (styles.length < 3) throw new Error(`width-default-auto: expected >=3 header cells, got ${styles.length}`);
  for (const style of styles) {
    if (style.width !== '') throw new Error(`width-default-auto: header style.width = "${style.width}"`);
    if (style.minWidth !== '') throw new Error(`width-default-auto: header style.minWidth = "${style.minWidth}"`);
    if (style.maxWidth !== '') throw new Error(`width-default-auto: header style.maxWidth = "${style.maxWidth}"`);
  }

  // End-state goal: the w-full table fills its container — sum of the data
  // column widths equals the table width (no right-hand gap).
  const widths = await readCellWidths(ft, 'width-default-auto');
  const tableWidth = await readRectWidth(ft, tableSel);
  const sum = widths.reduce((acc, w) => acc + w, 0);
  if (Math.abs(sum - tableWidth) > 1) {
    throw new Error(`width-default-auto: header width sum ${sum} vs table width ${tableWidth} (dev >1px)`);
  }
  await expectNoPageErrors(ft, 'table-column-width:default-auto');

  // Case 2: rowSelection without fixed columns keeps the selection column pinned at 40px
  await openFixture(ft);

  const selTableSel = tableSelector('width-selection-pinned');
  await ft.expectWeb(ft.locator(selTableSel)).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(`${selTableSel} tbody tr`)).toHaveCount(4);

  // RED on WIP (P1-02): the non-sticky selection column is stretched by the
  // auto-layout table beyond its declared 40px (measured ~65px).
  const selectionSel = `${selTableSel} thead [data-slot="table-select-column"]`;
  await ft.expectWeb(ft.locator(selectionSel)).toHaveCount(1);
  const selectionWidth = await readRectWidth(ft, selectionSel);
  if (Math.abs(selectionWidth - 40) > 1) {
    throw new Error(`width-selection-pinned: selection column ${selectionWidth}px, expected 40px (±1)`);
  }
  // The control column must not be sticky in this configuration.
  const selectionPosition = await readComputedStyle(ft, selectionSel, 'position');
  if (selectionPosition === 'sticky') {
    throw new Error('width-selection-pinned: selection column must not be sticky');
  }

  const allWidths = await readCellWidths(ft, 'width-selection-pinned');
  const sumAll = allWidths.reduce((acc, w) => acc + w, 0);
  const selTableWidth = await readRectWidth(ft, selTableSel);
  if (Math.abs(sumAll - selTableWidth) > 1) {
    throw new Error(`width-selection-pinned: header width sum ${sumAll} vs table width ${selTableWidth} (dev >1px)`);
  }
  await expectNoPageErrors(ft, 'table-column-width:selection-pinned');

  return { cases: 2 };
}
