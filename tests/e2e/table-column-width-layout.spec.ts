import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// Plan 2026-08-09-1140-1 Phase 1 proof (host fixture:
// apps/playground/src/pages/table-column-width-demo.tsx, route #/table-column-width).
// Real-browser host assertions — jsdom cannot execute CSS table layout, so the
// P1-01/P1-02 regressions must be pinned in a browser host (AGENTS.md:
// programmatic width assertions only, no screenshots).
//
// Live-browser discovery (recorded in plan Phase 1): Chromium's auto table
// layout IGNORES `max-width` on table cells, so the WIP's 120px header cap did
// not freeze column widths — the pixel sum below is green on both WIP and the
// fix and pins the END STATE. The discriminating RED assertions are the inline
// style check (the WIP emits width/minWidth/maxWidth=120 on every no-width
// header cell; the fix emits nothing so the column can auto-stretch) and the
// non-sticky selection column pixel width (WIP renders ~65px vs 40px declared).

async function openFixture(page: import('@playwright/test').Page) {
  await page.goto('/#/table-column-width', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'Table 列宽策略宿主 fixture', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

function tableRoot(page: import('@playwright/test').Page, testid: string) {
  return page.getByTestId(testid).locator('table[data-slot="table"]');
}

async function readCellWidths(table: ReturnType<typeof tableRoot>) {
  // All header cells (data columns + selection/expand control columns) — the
  // control columns carry their own data-slot markers, so target every `th`.
  return table
    .locator('thead th')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
}

async function readHeaderInlineWidthStyles(table: ReturnType<typeof tableRoot>) {
  return table
    .locator('thead [data-slot="table-head"]')
    .evaluateAll((cells) =>
      cells.map((cell) => ({
        width: (cell as HTMLElement).style.width,
        minWidth: (cell as HTMLElement).style.minWidth,
        maxWidth: (cell as HTMLElement).style.maxWidth,
      })),
    );
}

test.describe('Table column-width strategy (#/table-column-width)', () => {
  test('default table with no explicit widths fills the container and pins no header cell width', async ({
    page,
  }) => {
    await openFixture(page);

    const table = tableRoot(page, 'width-default-auto');
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.locator('tbody tr')).toHaveCount(4);

    // RED on WIP: the maxWidth fix emitted width/minWidth/maxWidth=120 on every
    // no-width header cell. The fix must not pin them (auto layout may stretch).
    const styles = await readHeaderInlineWidthStyles(table);
    expect(styles.length).toBeGreaterThanOrEqual(3);
    for (const style of styles) {
      expect(style.width).toBe('');
      expect(style.minWidth).toBe('');
      expect(style.maxWidth).toBe('');
    }

    // End-state goal: the w-full table fills its container — sum of the data
    // column widths equals the table width (no right-hand gap).
    const widths = await readCellWidths(table);
    const tableWidth = await table.evaluate((el) => el.getBoundingClientRect().width);
    const sum = widths.reduce((acc, w) => acc + w, 0);
    expect(Math.abs(sum - tableWidth)).toBeLessThanOrEqual(1);
    await assertTrackedPageErrors(page);
  });

  test('rowSelection without fixed columns keeps the selection column pinned at 40px', async ({
    page,
  }) => {
    await openFixture(page);

    const table = tableRoot(page, 'width-selection-pinned');
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.locator('tbody tr')).toHaveCount(4);

    // RED on WIP (P1-02): the non-sticky selection column is stretched by the
    // auto-layout table beyond its declared 40px (measured ~65px).
    const selectionCell = table.locator('thead [data-slot="table-select-column"]');
    await expect(selectionCell).toHaveCount(1);
    const selectionWidth = await selectionCell.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(selectionWidth - 40)).toBeLessThanOrEqual(1);
    // The control column must not be sticky in this configuration.
    const selectionPosition = await selectionCell.evaluate((el) => getComputedStyle(el).position);
    expect(selectionPosition).not.toBe('sticky');

    const allWidths = await readCellWidths(table);
    const sum = allWidths.reduce((acc, w) => acc + w, 0);
    const tableWidth = await table.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(sum - tableWidth)).toBeLessThanOrEqual(1);
    await assertTrackedPageErrors(page);
  });
});
