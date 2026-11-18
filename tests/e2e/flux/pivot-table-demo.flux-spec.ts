import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Pivot Table Demo (VTable pivot wrapper): non-empty cards mount pivot
 * canvases, schema-exposed instances resolve detail cells after the
 * leaf-subtotal guard (ux-r2), the empty card renders the empty slot without
 * an instance, and the theme toggle keeps instances alive (canvas re-render).
 *
 * Migrated from tests/e2e/pivot-table-demo.spec.ts (E3 batch 4, engine swap +
 * the empty-card locator filter({hasText}) replaced with the canonical
 * [data-slot="pivot-empty"] slot locator asserting its own text — a stronger,
 * non-div-based anchor; the theme combobox getByRole chain replaced with the
 * aria-label attribute selector).
 *
 * TODO(migrate-debt): window.__flux_pivot_* instance probes go through
 * ft.evaluate with the same scan bodies as the old spec (the schema-exposed
 * VTable instances are only reachable via the page window).
 */

async function openPivotDemo(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the demo remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="pivot-table"]').first()).not.toBeVisible();
  await ft.goto('/#/pivot-table-demo');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  // heading text is 'Pivot Table Demo（VTable PivotTable）' — RegExp partial
  // match (driver string names are FULL matches)
  await ft.expectWeb(ft.getByRole('heading', { name: /Pivot Table Demo/ })).toBeVisible({
    timeoutMs: 40_000,
  });
}

export default async function pivotTableDemo(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: renders VTable pivot instances for non-empty cards with correct option mapping
  await openPivotDemo(ft);
  const pivots = ft.locator('[data-slot="pivot-table"]');
  // Sales Pivot + Filtered — two non-empty cards (VTable instances mount a canvas)
  await ft.expectWeb(pivots.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
    timeoutMs: 20_000,
  });
  // programmatic anchor: instances exposed by schema id
  const exposedKeys = await ft.evaluate(
    `Object.keys(window).filter((key) => key.startsWith('__flux_pivot_'))`,
  );
  if (!Array.isArray(exposedKeys) || !exposedKeys.includes('__flux_pivot_demoSalesPivot')) {
    throw new Error(`__flux_pivot_demoSalesPivot not exposed, got: ${JSON.stringify(exposedKeys)}`);
  }
  if (!exposedKeys.includes('__flux_pivot_demoFilteredPivot')) {
    throw new Error(`__flux_pivot_demoFilteredPivot not exposed, got: ${JSON.stringify(exposedKeys)}`);
  }
  await expectNoPageErrors(ft, 'pivot-demo:instances');

  // Case 2: detail cells resolve values after leaf-subtotal guard (ux-r2, live VTable probe)
  await openPivotDemo(ft);
  await ft.locator('[data-slot="pivot-canvas"] canvas').first().waitFor('attached');
  const probe = await ft.evaluate(
    `(() => {
      const host = window.__flux_pivot_demoSalesPivot;
      const instance = host && host.instance;
      if (!instance) return { found: false };
      const rowCount = instance.getLayoutRowTreeCount();
      const cell = (col, row) => instance.getCellValue(col, row);
      // layout scan (coordinate semantics: col 0/1 are region/quarter row
      // headers, col 2..5 are the Electronics/Furniture sales/profit metric
      // columns; body starts at row 2)
      let northQ1Row = -1;
      let northSubtotalRow = -1;
      let westQ3Row = -1;
      for (let row = 2; row < rowCount; row += 1) {
        const dim0 = cell(0, row);
        const dim1 = cell(1, row);
        if (dim0 === 'North' && dim1 === 'Q1' && northQ1Row === -1) northQ1Row = row;
        // merged-cell render timing: '小计' may land in col 0 or col 1, take
        // the first hit inside the North segment
        if ((dim0 === '小计' || dim1 === '小计') && northSubtotalRow === -1) {
          northSubtotalRow = row;
        }
        if (dim0 === 'West' && dim1 === 'Q3' && westQ3Row === -1) westQ3Row = row;
      }
      return {
        found: true,
        rowCount,
        northQ1Row,
        northSubtotalRow,
        westQ3Row,
        // detail anchor 1: North/Q1/Electronics/sales = 1200
        northQ1ElectronicsSales: northQ1Row >= 0 ? cell(2, northQ1Row) : null,
        // detail anchor 2: West/Q3/Furniture/profit = 164 (col 5 = Furniture/profit)
        westQ3FurnitureProfit: westQ3Row >= 0 ? cell(5, westQ3Row) : null,
        // region subtotal: North subtotal row × Electronics/sales = 4050
        northSubtotalElectronicsSales:
          northSubtotalRow >= 0 ? cell(2, northSubtotalRow) : null,
      };
    })()`,
  );
  if (!probe || probe.found !== true) {
    throw new Error('__flux_pivot_demoSalesPivot instance not found on window');
  }
  if (probe.northQ1ElectronicsSales !== 1200) {
    throw new Error(
      `North/Q1/Electronics/sales expected 1200, got ${JSON.stringify(probe.northQ1ElectronicsSales)} (rows: ${JSON.stringify(probe)})`,
    );
  }
  if (probe.westQ3FurnitureProfit !== 164) {
    throw new Error(
      `West/Q3/Furniture/profit expected 164, got ${JSON.stringify(probe.westQ3FurnitureProfit)} (rows: ${JSON.stringify(probe)})`,
    );
  }
  if (probe.northSubtotalElectronicsSales !== 4050) {
    throw new Error(
      `North subtotal Electronics/sales expected 4050, got ${JSON.stringify(probe.northSubtotalElectronicsSales)} (rows: ${JSON.stringify(probe)})`,
    );
  }
  await expectNoPageErrors(ft, 'pivot-demo:detail-cells');

  // Case 3: empty card renders the empty slot without creating an instance
  await openPivotDemo(ft);
  const emptySlot = ft.locator('[data-slot="pivot-empty"]');
  await ft.expectWeb(emptySlot).toBeVisible({ timeoutMs: 10_000 });
  // slot carries the no-data copy (replaces the old div.filter({hasText}) anchor)
  await ft.expectWeb(emptySlot).toContainText('暂无销售数据');
  await ft.expectWeb(emptySlot).toHaveCount(1, { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'pivot-demo:empty-card');

  // Case 4: theme toggle keeps pivot instances alive (no crash, canvas re-renders)
  await openPivotDemo(ft);
  const pivots4 = ft.locator('[data-slot="pivot-table"]');
  await ft.expectWeb(pivots4.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
    timeoutMs: 20_000,
  });
  // mechanism migrated to the data-mode attribute trigger (plan 471 V1-F2);
  // ux-r6 G-2: the in-page toggle is gone, theme switching goes through the
  // single global ThemeSwitcher path (bottom-right dock).
  const modeSelect = ft.locator('[data-testid="theme-switcher"] select[aria-label="模式"]');
  await ft.expectWeb(ft.getByRole('button', { name: '暗色' })).toHaveCount(0);
  await ft.expectWeb(ft.getByRole('button', { name: '亮色' })).toHaveCount(0);
  await modeSelect.selectOption('dark');
  await ft.expectWeb(ft.locator("html[data-mode='dark']")).toHaveCount(1);
  await ft.expectWeb(pivots4.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
    timeoutMs: 20_000,
  });
  await modeSelect.selectOption('light');
  await ft.expectWeb(ft.locator("html[data-mode='dark']")).toHaveCount(0);
  await ft.expectWeb(pivots4.locator('[data-slot="pivot-canvas"] canvas')).toHaveCount(2, {
    timeoutMs: 20_000,
  });
  await expectNoPageErrors(ft, 'pivot-demo:theme-toggle');

  return { cases: 4 };
}
