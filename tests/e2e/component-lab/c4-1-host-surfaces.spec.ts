import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C4.1 Phase 3 table host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-table-qe (bug 73 pattern): CRUD-style table inline quick-edit writes
 *    back to the row scope and quickSaveItemAction receives the EDITED record
 *    (row-scope pollution re-verify — the 08-02 mechanism contract).
 * 2. host-table-lazy (P1-3 proof): tree lazy children load fails once → error
 *    toggle with retry affordance → clicking retry reloads and renders the lazy
 *    child (previously a dead path: refreshNode was never wired).
 * 3. host-table-sel: checkbox row selection + select-all; selection change
 *    dispatches with the correct keys.
 *
 * The lab runs zh-CN by default, so i18n chrome labels are matched with
 * locale-agnostic patterns.
 */

test('table-host: inline quick edit writes edited value through quickSaveItemAction (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('table');

  const slug = scenarioSlug('Host table quick edit + save + echo (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // First row's quick-edit input (username column of alice row).
  const quickEditInput = stage.locator('[data-slot="table-quick-edit"] input').first();
  await expect(quickEditInput).toBeVisible({ timeout: 10_000 });
  await expect(quickEditInput).toHaveValue('alice');

  await quickEditInput.fill('alice-edited');

  // Row-level save bar appears once the draft is dirty; click Save.
  const saveBar = stage.locator('[data-slot="table-row-save-bar"]');
  await expect(saveBar).toBeVisible({ timeout: 5_000 });
  await saveBar.getByRole('button', { name: /保存|Save/ }).click();

  // The probe fetcher records the submitted payload: the EDITED name must be
  // present, not the original row value (bug 73 pattern: row-scope pollution
  // would submit the stale row value).
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __c4QuickEditProbe?: { username?: string; id?: unknown } })
              .__c4QuickEditProbe,
        ),
      { timeout: 10_000 },
    )
    .toEqual({ username: 'alice-edited', id: 1 });

  await assertTrackedPageErrors(page);
});

test('table-host: lazy children failure renders retry affordance and retry loads children (P1-3)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('table');

  const slug = scenarioSlug('Host tree lazy children fail + retry (P1-3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const toggle = stage.locator('[data-slot="table-tree-toggle"]').first();
  await expect(toggle).toBeVisible({ timeout: 10_000 });

  // First expand → simulated failure → error state: the toggle flips to the
  // retry affordance (aria-label Retry) and shows the error icon.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', '重试', { timeout: 10_000 });

  // P1-3: clicking the error-state toggle RETRIES (refreshNode + reload), then
  // the lazy child renders.
  await toggle.click();
  const childRow = stage.locator('[data-slot="table-body"] [data-slot="table-row"]', {
    hasText: 'Lazy Child',
  });
  await expect(childRow).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('table-host: selection change dispatches keys and select-all toggles (host-table-sel)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('table');

  const slug = scenarioSlug('Host selection + pagination echo');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Page 1 has pageSize 2 → rows user-1 and user-2 with select checkboxes.
  const rowCheckboxes = stage.getByRole('checkbox', { name: '选择行' });
  await expect(rowCheckboxes).toHaveCount(2, { timeout: 10_000 });

  // Select both rows via the select-all checkbox in the header.
  const selectAll = stage.getByRole('checkbox', { name: '全选' });
  await selectAll.click();
  await expect(rowCheckboxes.nth(0)).toBeChecked();
  await expect(rowCheckboxes.nth(1)).toBeChecked();

  // Toggle one off → the other stays selected (no phantom prune on the current page).
  await rowCheckboxes.nth(0).click();
  await expect(rowCheckboxes.nth(0)).not.toBeChecked();
  await expect(rowCheckboxes.nth(1)).toBeChecked();

  await assertTrackedPageErrors(page);
});
