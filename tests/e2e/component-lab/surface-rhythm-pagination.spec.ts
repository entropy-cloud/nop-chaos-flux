import { expect, test } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

// plan 490 Phase 3 red anchor: the three pagination bars share one vertical
// block-gap contract — `margin-block-start: var(--space-block-gap)` (12px) on
// each bar root. TablePaginationBar and the standalone pagination renderer
// previously mounted with zero top gap (the "paginator glued to the table"
// defect family); CrudListPagination carried a bare mt-3 with the same value
// but off-system. Computed-style assertions double as the plan 490 Phase 4
// surface-rhythm proof (light theme here; dark re-run below).

async function openScenario(page: import('@playwright/test').Page, renderer: string, title: string) {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer(renderer);
  return lab.scenarioStage(scenarioSlug(title));
}

test.describe('surface rhythm — pagination block gap (plan 490)', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`pagination bars keep the --space-block-gap top rhythm (${mode})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode === 'dark' ? 'dark' : 'light' });
      await page.goto('#/home', { waitUntil: 'commit' });
      await page.evaluate((themeMode) => {
        document.documentElement.setAttribute('data-mode', themeMode);
      }, mode);

      const expected = '12px';

      // 1. TablePaginationBar (table renderer lab, paginated scenario).
      const tableStage = await openScenario(page, 'table', 'Host selection + pagination echo');
      const tablePagination = tableStage.locator('[data-slot="table-pagination"]');
      await expect(tablePagination).toBeVisible();
      await expect(tablePagination).toHaveCSS('margin-top', expected);
      const tableScroll = tableStage.locator('[data-slot="table-container"]').first();
      if (await tableScroll.count()) {
        const gap = await tablePagination.evaluate(
          (bar, siblingSelector) => {
            const sibling = document.querySelector(siblingSelector);
            const barRect = (bar as HTMLElement).getBoundingClientRect();
            const siblingRect = (sibling as HTMLElement).getBoundingClientRect();
            return Math.round(barRect.top - siblingRect.bottom);
          },
          '[data-slot="table-container"]',
        );
        expect(gap).toBeGreaterThanOrEqual(8);
      }

      // 2. CrudListPagination (crud renderer lab, cards mode scenario).
      const crudStage = await openScenario(page, 'crud', 'CRUD cards mode');
      const crudPagination = crudStage.locator('[data-slot="crud-list-pagination"]');
      await expect(crudPagination).toBeVisible();
      await expect(crudPagination).toHaveCSS('margin-top', expected);

      // 3. Standalone pagination renderer root (pagination lab).
      const paginationStage = await openScenario(page, 'pagination', 'Simple pagination');
      const paginationRoot = paginationStage.locator('[data-slot="pagination-root"]').first();
      await expect(paginationRoot).toBeVisible();
      await expect(paginationRoot).toHaveCSS('margin-top', expected);
    });
  }
});
