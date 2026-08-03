import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C4.2 Phase 3 crud host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-crud-row (bug 73 pattern re-verify): CRUD inline quick edit writes
 *    back to the row scope and quickSaveItemAction receives the EDITED record
 *    — the 08-02 row-scope pollution fix re-verified in a real browser.
 * 2. host-crud-load: queryForm → loadAction full chain — query values enter
 *    the CRUD scope and the loadAction re-dispatches with them.
 * 3. host-crud-include: loadAction `includeScope: "*"` injects the flat CRUD
 *    scope variables into the request data (no $_crud wrapper, no internal
 *    detail leak).
 * 4. host-crud-fail: loadAction failure keeps data + the refresh action
 *    retries and recovers rows.
 * 5. host-crud-paging: pagination/sort/selection interact across pages.
 *
 * The lab runs zh-CN by default, so i18n chrome labels are matched with
 * locale-agnostic patterns where possible.
 */

interface C4C2LoadProbeEntry {
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

test('crud-host: inline quick edit submits the EDITED value (bug 73 pattern re-verify)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');

  const slug = scenarioSlug('Host CRUD row quick-edit submit probe (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const quickEditInput = stage.locator('[data-slot="table-quick-edit"] input').first();
  await expect(quickEditInput).toBeVisible({ timeout: 10_000 });
  await expect(quickEditInput).toHaveValue('Alpha');

  await quickEditInput.fill('Alpha-edited');

  const saveBar = stage.locator('[data-slot="table-row-save-bar"]');
  await expect(saveBar).toBeVisible({ timeout: 5_000 });
  await saveBar.getByRole('button', { name: /保存|Save/ }).click();

  // The probe fetcher records the submitted payload: the EDITED name must be
  // present, not the original row value.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __c4c2QuickEditProbe?: { name?: string; id?: unknown } })
              .__c4c2QuickEditProbe,
        ),
      { timeout: 10_000 },
    )
    .toEqual({ name: 'Alpha-edited', id: 1 });

  await assertTrackedPageErrors(page);
});

test('crud-host: queryForm → loadAction chain carries query values into the fetch (host-crud-load)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');

  const slug = scenarioSlug('Host CRUD query form → loadAction chain');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Initial load renders the no-keyword rows.
  await expect(stage.getByText('AllRows')).toBeVisible({ timeout: 10_000 });

  const keywordInput = stage.locator('input');
  await expect(keywordInput.first()).toBeVisible({ timeout: 10_000 });
  await keywordInput.first().fill('report');

  await stage.getByRole('button', { name: /搜索|Search/ }).click();

  // The loadAction re-dispatches with the query binding and rows render from
  // the fetched result.
  await expect(stage.getByText('Found-report')).toBeVisible({ timeout: 10_000 });
  await expect(stage.getByText('Query: report')).toBeVisible({ timeout: 5_000 });

  // The recorded fetch carried the query value in the request data.
  const entries = await page.evaluate(() => {
    const probe = (window as unknown as { __c4c2LoadProbe?: C4C2LoadProbeEntry[] })
      .__c4c2LoadProbe;
    return probe ?? [];
  });
  const last = entries[entries.length - 1];
  expect(last).toBeTruthy();
  expect(last?.data).toMatchObject({ keyword: 'report' });

  await assertTrackedPageErrors(page);
});

test('crud-host: includeScope "*" injects flat CRUD scope variables (host-crud-include)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');

  const slug = scenarioSlug('Host CRUD includeScope injection');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });
  await expect(stage.getByText('IncludeItem')).toBeVisible({ timeout: 10_000 });

  const probe = await page.evaluate(
    () =>
      (window as unknown as { __c4c2IncludeScopeProbe?: Record<string, unknown> })
        .__c4c2IncludeScopeProbe,
  );
  expect(probe).toBeTruthy();
  // CONTEXT.md: "*" = all CRUD scope variables, flat, no internal detail.
  expect(probe).toMatchObject({
    pagination: { currentPage: 1, pageSize: 10 },
    query: {},
    sort: {},
    filters: {},
    selection: [],
  });
  expect(JSON.stringify(probe)).not.toContain('$_crud');
  expect(JSON.stringify(probe)).not.toContain('__crudLoadRevision');

  await assertTrackedPageErrors(page);
});

test('crud-host: load failure keeps data and refresh retries to recovery (host-crud-fail)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');

  const slug = scenarioSlug('Host CRUD load failure keeps data + retry');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // The first two load attempts fail (mock fetcher); the third succeeds.
  const refreshButton = stage.getByRole('button', { name: 'Refresh list' });
  await expect(refreshButton).toBeVisible({ timeout: 10_000 });

  // Attempt 1 already failed on mount. Retry twice more.
  await refreshButton.click();
  await refreshButton.click();

  await expect(stage.getByText('RecoveredRow')).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('crud-host: paging/sort/selection echo and cross-page selection (host-crud-paging)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');

  const slug = scenarioSlug('Host CRUD paging/sort/selection echo');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await expect(stage.getByText('Page: 1; Sort: none; Sel: 0')).toBeVisible({
    timeout: 10_000,
  });

  // Select the first row on page 1.
  const rowCheckboxes = stage.getByRole('checkbox', { name: '选择行' });
  await expect(rowCheckboxes.first()).toBeVisible({ timeout: 10_000 });
  await rowCheckboxes.first().click();
  await expect(stage.getByText(/Sel: 1/)).toBeVisible({ timeout: 5_000 });

  // Page 2 first (before sorting) → page 2 rows render and selection survives
  // (keepOnPageChange).
  await stage.getByRole('button', { name: /下一页|Next page/ }).click();
  await expect(stage.getByText(/Page: 2.*Sel: 1/)).toBeVisible({ timeout: 10_000 });
  await expect(stage.getByText('Item 11', { exact: true })).toBeVisible({ timeout: 5_000 });

  // Back to page 1 → sort by name header → sort state echoes.
  await stage.getByRole('button', { name: /上一页|Previous page/ }).click();
  await expect(stage.getByText(/Page: 1.*Sel: 1/)).toBeVisible({ timeout: 10_000 });
  await stage.getByRole('button', { name: /Name/ }).click();
  await expect(stage.getByText(/Sort: name/)).toBeVisible({ timeout: 5_000 });

  await assertTrackedPageErrors(page);
});
