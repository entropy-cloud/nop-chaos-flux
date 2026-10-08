import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-5 (plan 548) P1 red→green specs for the data-visualization / table domain.
// Each case reproduces a finding from the plan-548 dual-review live audit;
// convictions cite programmatic readings (toast observers, localStorage spies,
// geometry readings), never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

test.describe('IS-5 data-viz interaction state (plan 548)', () => {
  // IS-map-demo-001: region/pin clicks dispatched onClick but the showToast
  // template failed evaluation (bindings had no `event` key) and the failure
  // was swallowed — zero feedback. Green: a hit-tested region click surfaces
  // the toast with the feature name.
  test('map: region click surfaces the promised toast', async ({ page }) => {
    await gotoPage(page, '/#/map-demo');
    await page.waitForFunction(
      () => Boolean((window as Record<string, unknown>).__flux_map_demoChinaSales),
      { timeout: 20_000 },
    );
    const hit = await page.evaluate(() => {
      const holder = (window as Record<string, unknown>).__flux_map_demoChinaSales as
        | { map: { getFeaturesAtPixel: (p: number[]) => Array<{ getProperties: () => Record<string, unknown> }>; getTargetElement: () => HTMLElement; getSize: () => number[] } }
        | undefined;
      const map = holder?.map;
      if (!map) return null;
      const canvas = map.getTargetElement().querySelector('canvas');
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return null;
      const [w, h] = map.getSize();
      for (let x = 8; x < w; x += 6) {
        for (let y = 8; y < h; y += 6) {
          const feats = map.getFeaturesAtPixel([x, y]);
          if (feats && feats.length > 0) {
            const props = feats[0].getProperties();
            // cluster groups carry a `features` array — zoom-only, no dispatch
            if (!Array.isArray(props.features) && typeof props.name === 'string') {
              return { x, y, name: props.name, left: rect.left, top: rect.top };
            }
          }
        }
      }
      return null;
    });
    expect(hit, 'region map must expose a clickable named feature').not.toBeNull();
    await page.mouse.click(hit!.left + hit!.x, hit!.top + hit!.y);
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast, 'region click must surface the showToast feedback').toBeVisible({
      timeout: 5_000,
    });
    await expect(toast).toContainText(hit!.name);
    await assertTrackedPageErrors(page);
  });

  // IS-dash-001: Save was a dead control — the onSave chain evaluated
  // '${event.serialized}' against a bare {scope} ctx, failed, and the failure
  // was dropped. Green: Save persists the serialized layout to localStorage.
  test('dashboard: Save persists the layout', async ({ page }) => {
    await gotoPage(page, '/#/dashboard-demo');
    const saveBtn = page.getByTestId('editor-save');
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();
    await page.waitForTimeout(600);
    const stored = await page.evaluate(() => window.localStorage.getItem('flux-dashboard-layout:v2'));
    expect(stored, 'save must write the serialized layout for host persist').not.toBeNull();
    // serialize(doc) = JSON.stringify(doc.panels) — the layout is a panel array
    const parsed = JSON.parse(stored!) as unknown[];
    expect(Array.isArray(parsed), 'serialized layout carries the panels').toBe(true);
    expect(parsed.length, 'the demo baseline has four panels').toBeGreaterThanOrEqual(4);
    await assertTrackedPageErrors(page);
  });

  // IS-dash-003: resize handles were dead — controlled widths without change
  // handlers, so the drag preview snapped back (delta 0). Green: the release
  // commits the new width (aria-valuenow + panel width both move).
  test('dashboard: left resize handle commits the width', async ({ page }) => {
    await gotoPage(page, '/#/dashboard-demo');
    const handle = page.getByTestId('left-resize-handle');
    await expect(handle).toBeVisible({ timeout: 15_000 });
    const before = await handle.getAttribute('aria-valuenow');
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = Number(await handle.getAttribute('aria-valuenow'));
    expect(
      after,
      `left width must commit the drag delta (before ${before}, after ${after}; snap-back = the IS-dash-003 defect)`,
    ).toBeGreaterThanOrEqual(Number(before) + 60);
    const panelWidth = await page
      .getByTestId('left-panel-expanded')
      .evaluate((el) => el.getBoundingClientRect().width);
    expect(panelWidth, 'panel width follows the committed value').toBeGreaterThanOrEqual(
      Number(before) + 60,
    );
    await assertTrackedPageErrors(page);
  });

  // IS-colw-001: the first resize drag on a no-width (stretch) column anchored
  // at the 120px schema fallback instead of the rendered width — an 80px dead
  // zone where drags changed nothing. The fixture's ID column renders at
  // ~117px (≈ the fallback, non-discriminating) so the case targets the
  // ~200px rendered Name column: dragging +40px must commit ≈ rendered+40.
  test('table: first column resize anchors at the rendered width', async ({ page }) => {
    await gotoPage(page, '/#/table-column-width');
    const nameTh = page.locator('[data-slot="table"]').first().locator('th', { hasText: 'Name' }).first();
    await expect(nameTh).toBeVisible({ timeout: 15_000 });
    const startWidth = await nameTh.evaluate((el) => el.getBoundingClientRect().width);
    expect(startWidth, 'the Name column renders ~200px (well above the 120 fallback)').toBeGreaterThan(160);
    const handle = nameTh.locator('[data-slot="table-column-resize-handle"]');
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const committed = await page.evaluate(() => {
      const col = document.querySelector('[data-slot="table"] colgroup col:nth-child(2)') as HTMLElement | null;
      return col?.style.width ? parseFloat(col.style.width) : null;
    });
    expect(
      committed,
      `drag must commit rendered+delta (start ${startWidth}, committed ${committed}; committed ≈ start = the dead-zone signature of the 120px anchor defect)`,
    ).toBeGreaterThanOrEqual(startWidth + 30);
    await assertTrackedPageErrors(page);
  });

  // IS-perf-001: the schema data-mutation buttons wrote the raw unevaluated
  // template string into perfRows (formula engine cannot parse object spread)
  // — table emptied, pagination vanished, header counts lied. Green: the
  // host-owned perfDemo actions keep the dataset intact.
  test('performance-table: schema mutation keeps the dataset intact', async ({ page }) => {
    await gotoPage(page, '/#/performance-table');
    const shuffleBtn = page.getByRole('button', { name: 'Shuffle Scores' });
    await expect(shuffleBtn).toBeVisible({ timeout: 15_000 });
    await shuffleBtn.click();
    await page.waitForTimeout(1200);
    const status = await page.evaluate(() => document.body.innerText.match(/Total: [^\n|]*/)?.[0] ?? '');
    expect(status, 'header count must still report the full dataset').toContain('Total: 1000 rows');
    const emptyRows = await page.locator('[data-slot="table-empty-row"]').count();
    expect(emptyRows, 'the dataset must not be replaced by a raw string').toBe(0);
    const pagination = await page.locator('[data-slot="table-pagination"]').count();
    expect(pagination, 'pagination must survive the mutation').toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });
});
