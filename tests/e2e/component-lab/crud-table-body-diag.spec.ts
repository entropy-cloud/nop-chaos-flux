import { test, expect, filterNoise as _filterNoise } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test.describe.skip('crud table body diagnostic', () => {
  test('diagnoses basic CRUD shell table body rendering', async ({ page, consoleErrors, pageErrors }) => {

    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('crud');

    const slug = scenarioSlug('Basic CRUD shell');
    const stage = lab.scenarioStage(slug);

    await expect(stage).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(2000);

    const scopeCheck = await stage.evaluate((el) => {
      const nopTable = el.querySelector('.nop-table');
      if (!nopTable) return { error: 'no .nop-table found' };

      const cidAttr = nopTable.getAttribute('data-cid');
      const runtimeId = el.closest('[data-runtime-id]')?.getAttribute('data-runtime-id');

      const allReactFiber = Object.keys(nopTable).find((k) =>
        k.startsWith('__reactFiber$'),
      );

      return {
        cid: cidAttr,
        runtimeId,
        hasFiber: !!allReactFiber,
        fiberKey: allReactFiber || null,
      };
    });

    console.log('=== SCOPE CHECK ===');
    console.log(JSON.stringify(scopeCheck, null, 2));

    await page.waitForTimeout(3000);

    const diagnosis = await stage.evaluate((el) => {
      const result = {
        stageHTMLLength: el.innerHTML?.length ?? 0,
        stageText: el.textContent?.substring(0, 500) ?? '',

        crudTableCount: el.querySelectorAll('[data-slot="crud-table"]').length,
        nopCrudCount: el.querySelectorAll('.nop-crud').length,
        tableCount: el.querySelectorAll('[data-slot="table"]').length,
        nopTableCount: el.querySelectorAll('.nop-table').length,

        theadCount: el.querySelectorAll('thead').length,
        tbodyCount: el.querySelectorAll('tbody').length,
        headerRowCount: el.querySelectorAll('thead [data-slot="table-row"]').length,
        bodyRowCount: el.querySelectorAll('tbody [data-slot="table-row"]').length,
        emptyRowCount: el.querySelectorAll('[data-slot="table-empty-row"]').length,

        toolbarCount: el.querySelectorAll('[data-slot="crud-toolbar"]').length,
        paginationCount: el.querySelectorAll('[data-slot="table-pagination"]').length,
        schemaErrorCount: el.querySelectorAll('[data-slot="schema-root-error"]').length,
      };

      if (result.schemaErrorCount > 0) {
        result.schemaErrors = Array.from(
          el.querySelectorAll('[data-slot="schema-root-error"]'),
        ).map((e) => e.textContent?.trim());
      }

      if (result.headerRowCount > 0) {
        const ths = el.querySelectorAll('thead th');
        result.headerThCount = ths.length;
        result.headerTexts = Array.from(ths).map((th) => th.textContent?.trim());
      }

      if (result.nopTableCount > 0) {
        const table = el.querySelector('.nop-table');
        result.tableInnerHTML = table?.innerHTML?.substring(0, 3000) ?? '';
      }

      const tbody = el.querySelector('tbody');
      if (tbody) {
        result.tbodyInnerHTML = tbody.innerHTML?.substring(0, 1000) ?? '';
      }

      return result;
    });

    console.log('=== CRUD TABLE BODY DIAGNOSIS ===');
    console.log(JSON.stringify(diagnosis, null, 2));

    if (consoleErrors.length > 0) {
      console.log('=== CONSOLE MESSAGES ===');
      consoleErrors.forEach((e) => console.log(e));
    }
    if (pageErrors.length > 0) {
      console.log('=== PAGE ERRORS ===');
      pageErrors.forEach((e) => console.log(e));
    }

    expect(diagnosis.schemaErrorCount, 'no schema errors').toBe(0);
    expect(diagnosis.crudTableCount, 'crud-table exists').toBeGreaterThanOrEqual(1);
    expect(diagnosis.nopTableCount, 'nop-table exists').toBeGreaterThanOrEqual(1);
    expect(diagnosis.bodyRowCount, 'table body has 3 rows').toBe(3);
  });
});
