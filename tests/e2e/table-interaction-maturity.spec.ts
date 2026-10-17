import { expect, test } from '@playwright/test';

/**
 * FM-0 table interaction maturity probes (plan 642, host fixture:
 * apps/playground/src/pages/table-column-width-demo.tsx, table 3
 * `width-fixed-resize` = fixed-left column + rowSelection + stripe + resize).
 *
 * Real-browser discrimination — jsdom cannot execute CSS table layout, and the
 * two reported defects (column-width drag fighting content pressure, fixed
 * cells hiding row-state backgrounds) only exist in a real layout engine
 * (AGENTS.md: programmatic assertions only, screenshots are diagnostic).
 *
 * RED on the pre-fix implementation:
 * - handle is 4px (`w-1`), flush inside the column edge, no z-index, no drag
 *   state;
 * - auto table layout lets content minimum width beat the dragged width, so a
 *   shrink drag does not track the pointer mid-drag nor hold after pointerup;
 * - fixed cells paint the static opaque `--table-fixed-bg` and never pick up
 *   row hover/selected/striped states (no overlay at all).
 */

async function openFixture(page: import('@playwright/test').Page) {
  await page.goto('/#/table-column-width', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'Table 列宽策略宿主 fixture', level: 1 }),
  ).toBeVisible({ timeout: 30_000 });
}

function fixedResizeTable(page: import('@playwright/test').Page) {
  return page.getByTestId('width-fixed-resize').locator('table[data-slot="table"]');
}

const descriptionTh = 'thead th[data-column-width-key^="description"]';

test.describe('FM-0 column resize (plan 642)', () => {
  test('handle is a 7px overhanging target stacked above sticky cells', async ({ page }) => {
    await openFixture(page);
    const table = fixedResizeTable(page);
    const th = table.locator(descriptionTh);
    const handle = th.locator('[data-slot="table-column-resize-handle"]');
    await expect(handle).toBeVisible();

    const handleBox = await handle.boundingBox();
    const thBox = await th.boundingBox();
    expect(handleBox).toBeTruthy();
    expect(thBox).toBeTruthy();
    // AMIS colDragLine parity: 7px wide, 4px of it overhanging the column edge.
    expect(handleBox!.width).toBeGreaterThanOrEqual(7);
    expect(handleBox!.x + handleBox!.width).toBeGreaterThan(thBox!.x + thBox!.width);

    // Must stack above the neighbouring sticky cells (old: `auto`).
    const zIndex = await handle.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(zIndex)).toBeGreaterThanOrEqual(10);
  });

  test('drag-shrinking a long-content column tracks the pointer and holds', async ({ page }) => {
    await openFixture(page);
    const table = fixedResizeTable(page);
    const th = table.locator(descriptionTh);
    const handle = th.locator('[data-slot="table-column-resize-handle"]');
    await expect(th).toBeVisible();
    // The long-content column inflates the table past the container, so the
    // handle may sit in the clipped overflow region until scrolled into view.
    await th.scrollIntoViewIfNeeded();

    const startWidth = (await th.boundingBox())!.width;
    expect(startWidth).toBeGreaterThan(200);

    const handleBox = (await handle.boundingBox())!;
    // Aim at the handle's inner edge (it overhangs 4px past the column, and the
    // clipped outer part must not be load-bearing for hit-testing).
    const grabX = handleBox.x + 1;
    await page.mouse.move(grabX, handleBox.y + handleBox.height / 2);
    await page.mouse.down();

    const target = startWidth - 80;
    for (let step = 1; step <= 8; step += 1) {
      await page.mouse.move(grabX - (80 * step) / 8, handleBox.y + handleBox.height / 2, {
        steps: 2,
      });
    }

    // Mid-drag the rendered width must already follow the pointer (rAF-coalesced
    // updates — poll instead of a single read to avoid frame-alignment races).
    await expect
      .poll(async () => (await th.boundingBox())!.width)
      .toBeLessThanOrEqual(startWidth - 60);

    await page.mouse.up();

    await expect
      .poll(async () => (await th.boundingBox())!.width)
      .toBeLessThanOrEqual(startWidth - 70);
    const finalWidth = (await th.boundingBox())!.width;
    expect(Math.abs(finalWidth - target)).toBeLessThanOrEqual(2);
  });

  test('table enters the deterministic fixed layout after a committed resize', async ({ page }) => {
    await openFixture(page);
    const table = fixedResizeTable(page);
    await expect(table).toBeVisible();

    // A table whose user never resized stays auto layout (zero-regression face).
    expect(await table.getAttribute('data-layout-fixed')).toBeNull();

    const handle = table.locator(descriptionTh).locator('[data-slot="table-column-resize-handle"]');
    await table.locator(descriptionTh).scrollIntoViewIfNeeded();
    const handleBox = (await handle.boundingBox())!;
    await page.mouse.move(handleBox.x + 1, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 41, handleBox.y + handleBox.height / 2, {
      steps: 4,
    });
    // Session marker while the drag is live.
    await expect.poll(async () => table.getAttribute('data-col-resizing')).not.toBeNull();
    await page.mouse.up();

    await expect.poll(async () => table.getAttribute('data-col-resizing')).toBeNull();
    await expect.poll(async () => table.getAttribute('data-layout-fixed')).not.toBeNull();
    // Every colgroup col is pinned once the deterministic layout is active.
    const colWidths = await table.locator('colgroup col').evaluateAll((cols) =>
      cols.map((col) => (col as HTMLElement).style.width),
    );
    for (const width of colWidths) {
      expect(width).not.toBe('');
    }
  });
});

test.describe('FM-0 fixed-cell row state (plan 642)', () => {
  test('fixed cells show row state overlays while the base stays opaque', async ({ page }) => {
    await openFixture(page);
    const table = fixedResizeTable(page);
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(4);

    const backgroundImageOf = (locator: ReturnType<typeof table.locator>) =>
      locator.evaluate((el) => getComputedStyle(el).backgroundImage);
    const backgroundColorOf = (locator: ReturnType<typeof table.locator>) =>
      locator.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Stripe layout is parity-based — detect striped rows at runtime and pick a
    // plain (non-striped, unselected) row as the no-overlay baseline.
    const stripedIndex: number[] = [];
    for (let index = 0; index < 4; index += 1) {
      if ((await rows.nth(index).getAttribute('data-striped')) !== null) {
        stripedIndex.push(index);
      }
    }
    expect(stripedIndex.length).toBeGreaterThan(0);
    const plainIndex = [0, 1, 2, 3].find((index) => !stripedIndex.includes(index))!;

    const fixedCellOf = (index: number) => rows.nth(index).locator('td[data-fixed="left"]');
    // Baseline (pre-fix regression guard): a plain row's sticky cell paints the
    // static opaque background and carries no state overlay.
    const plainOverlay = await backgroundImageOf(fixedCellOf(plainIndex));
    expect(plainOverlay).not.toContain('linear-gradient');

    // Select a striped row AND a plain row — their fixed cells must show the
    // SAME selected overlay (closure audit R1 Major-1 discriminator: the
    // striped overlay used to beat the selected one on striped+selected rows,
    // so a striped table's select-all left those fixed cells stripe-tinted —
    // exactly the user-reported scenario).
    const stripedRow = stripedIndex[0]!;
    await rows.nth(stripedRow).locator('[data-slot="checkbox"]').click();
    await rows.nth(plainIndex).locator('[data-slot="checkbox"]').click();
    await expect(rows.nth(stripedRow)).toHaveAttribute('data-state', 'selected');
    await expect(rows.nth(plainIndex)).toHaveAttribute('data-state', 'selected');
    const selectedStripedOverlay = await backgroundImageOf(fixedCellOf(stripedRow));
    const selectedPlainOverlay = await backgroundImageOf(fixedCellOf(plainIndex));
    expect(selectedStripedOverlay).toContain('linear-gradient');
    expect(selectedStripedOverlay).toBe(selectedPlainOverlay);
    expect(selectedPlainOverlay).not.toBe(plainOverlay);
    // The opaque base must survive (semi-transparent state tokens must never
    // land on background-color of a sticky cell — see-through defect).
    const selectedColor = await backgroundColorOf(fixedCellOf(stripedRow));
    expect(selectedColor).not.toBe('rgba(0, 0, 0, 0)');

    // Hover an unselected plain row — its fixed cell lights up with the hover
    // overlay.
    const hoverRow = [0, 1, 2, 3].find(
      (index) => !stripedIndex.includes(index) && index !== plainIndex,
    )!;
    await rows.nth(hoverRow).locator('td').nth(2).hover();
    const hoverOverlay = await backgroundImageOf(fixedCellOf(hoverRow));
    expect(hoverOverlay).toContain('linear-gradient');
    expect(hoverOverlay).not.toBe(plainOverlay);

    // An UNSELECTED striped row carries its striped overlay without any
    // interaction (stripedIndex[0] is selected above — use another striped row).
    const idleStripedRow = stripedIndex.find((index) => index !== stripedRow)!;
    const stripedOverlay = await backgroundImageOf(fixedCellOf(idleStripedRow));
    expect(stripedOverlay).toContain('linear-gradient');
  });

  test('header select-all checkbox reports and shows its checked state (live evidence)', async ({
    page,
  }) => {
    await openFixture(page);
    const table = fixedResizeTable(page);
    const headerCheckbox = table.locator(
      'thead [data-slot="table-select-column"] [data-slot="checkbox"]',
    );
    await expect(headerCheckbox).toBeVisible();

    await headerCheckbox.click();
    // Base UI checkbox contract: aria-checked plus the data-checked marker
    // (this repo's checkbox does not use the shadcn data-state convention).
    await expect(headerCheckbox).toHaveAttribute('aria-checked', 'true');
    await expect(headerCheckbox).toHaveAttribute('data-checked', '');

    // The checked affordance must actually paint inside the sticky header cell.
    const indicator = headerCheckbox.locator('svg').first();
    await expect(indicator).toBeVisible();
    const rows = table.locator('tbody tr');
    await expect.poll(async () =>
      rows.nth(0).getAttribute('data-state'),
    ).toBe('selected');
    await expect.poll(async () =>
      rows.nth(3).getAttribute('data-state'),
    ).toBe('selected');
  });
});
