import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 2026-09-28-7 — VirtualBody zero-rows live defect regression. The
// defect only reproduces under the React Compiler build (happy-dom masks
// it), so this browser-level spec is the binding guard: the virtualized
// mode must mount windowed data rows (no empty-state row) and update the
// window on scroll.
async function openVirtualizedMode(page: import('@playwright/test').Page) {
  await page.goto('/#/performance-table', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Table Performance Playground' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Virtualized' }).click();
  // the FIRST tbody tr is the aria-hidden top spacer (0-height at scrollTop 0,
  // Playwright-hidden by construction) — wait for a real data row instead.
  await expect(page.locator('tbody tr:not([aria-hidden="true"])').first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('plan 2026-09-28-7 VirtualBody virtualized rows', () => {
  test('renders windowed data rows (no empty-state) under the compiled build', async ({
    page,
  }) => {
    await openVirtualizedMode(page);

    const state = await page.evaluate(() => {
      const tbody = document.querySelector('tbody');
      const rows = tbody ? [...tbody.querySelectorAll('tr')] : [];
      const dataRows = rows.filter((tr) => tr.getAttribute('aria-hidden') !== 'true');
      return {
        total: rows.length,
        dataRowCount: dataRows.length,
        emptyRow: rows.some((tr) => tr.getAttribute('data-slot') === 'table-empty-row'),
      };
    });
    expect(state.dataRowCount).toBeGreaterThan(0);
    expect(state.emptyRow).toBe(false);

    await assertTrackedPageErrors(page);
  });

  test('scroll updates the virtual window', async ({ page }) => {
    await openVirtualizedMode(page);

    // The harness rows are rich mixed renderers (~190px measured), so a short
    // scroll keeps row 0 inside the overscan window — scroll deep instead and
    // compare the rendered row identity.
    await page.evaluate(() => {
      const container = [...document.querySelectorAll('[data-slot="table-container"]')].find(
        (el) => el.clientHeight < el.scrollHeight,
      );
      if (container) container.scrollTop = container.scrollHeight;
    });
    await page.waitForTimeout(700);

    const state = await page.evaluate(() => {
      const container = [...document.querySelectorAll('[data-slot="table-container"]')].find(
        (el) => el.clientHeight < el.scrollHeight,
      );
      const tbody = container?.querySelector('tbody');
      const rows = [...(tbody?.querySelectorAll('tr') ?? [])];
      const dataRows = rows.filter((tr) => tr.getAttribute('aria-hidden') !== 'true');
      const topSpacer = rows.find((tr) => tr.getAttribute('aria-hidden') === 'true');
      return {
        scrollTop: container?.scrollTop ?? 0,
        firstData: dataRows[0]?.textContent ?? '',
        topSpacerHeight: topSpacer?.style.height ?? '',
        emptyRow: rows.some((tr) => tr.getAttribute('data-slot') === 'table-empty-row'),
      };
    });
    expect(state.scrollTop).toBeGreaterThan(10_000);
    expect(state.emptyRow).toBe(false);
    // the window followed the scroll: real content above (top spacer) and a
    // row beyond user_1 rendered first
    expect(state.topSpacerHeight).not.toBe('');
    expect(parseFloat(state.topSpacerHeight)).toBeGreaterThan(10_000);
    expect(state.firstData).not.toContain('user_1 <');
  });
});
