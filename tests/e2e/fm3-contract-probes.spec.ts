import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { scenarioSlug } from './component-lab/helpers';

/**
 * FM-3 exploratory interaction-contract probes (plan 644, bounded e2e batch).
 *
 * Six discriminating contract points chosen after auditing the existing
 * interaction coverage (c4-1/c4-2 host surfaces, c1a visual parity,
 * crud-editing specs) — each probe targets a contract those suites do NOT pin:
 *
 *   FM3-P1  nested dialog open/close cycle: Esc closes only the topmost
 *           surface, the outer dialog survives and stays interactive, overlay
 *           stack grows/shrinks with the surface stack (dialog-host.tsx
 *           "Stacked-dialog fix" shouldClose guard). c1a pins stacked
 *           geometry only — never the close/reopen cycle.
 *   FM3-P2  table pagination WITHOUT keepOnPageChange: the render-time pruner
 *           keeps the new page's view clean (no cross-page leak, select-all
 *           unchecked) and restores a still-existing selection when its row
 *           becomes visible again (documented T10 semantic — not the AMIS
 *           one-way clear). c4-2 covers only the keepOnPageChange=true
 *           inverse on crud.
 *   FM3-P3  tree-table lazy children: collapse removes the loaded children,
 *           re-expand restores them without resurfacing the error/retry state
 *           (use-table-tree-data collapse keeps the cache). c4-1 covers only
 *           fail→retry→load. Harness limitation: this fixture's in-page
 *           fetcher cannot count dispatches, so "no re-request" is pinned
 *           indirectly (cached success state survives the cycle).
 *   FM3-P4  quick-edit cancel: the save-bar 取消 button restores the original
 *           value and never dispatches quickSaveItemAction (cancelEditing
 *           writes savedRecordRef back; no Esc handler exists — source
 *           audited, button-only contract).
 *   FM3-P5  inline column settings: hiding a column removes it from the
 *           thead and the hidden state survives a panel close/reopen within
 *           the session (ordered/visible-columns state channel).
 *   FM3-P6  standalone pagination normalization: out-of-range currentPage
 *           clamps to the last page (design §7) and a page-size change resets
 *           currentPage to 1. No e2e covers the clamp/reset contract.
 *
 * Error monitoring: the fixtures.js auto errorMonitor would fail every one of
 * these pages — `#/lab/*` currently emits pre-existing `[flux] schema ...`
 * diagnostics at mount (RM metamodel prop-contract red, ledger FM-005,
 * external to this plan; see docs/audits/final-maturity-audit/ledger.md).
 * Per the FM-3 plan these are filtered into their own bucket and attributed
 * externally; the probes still hard-assert (a) zero pageerror, (b) zero
 * NON-schema console errors, and (c) no NEW schema diagnostics beyond the
 * page-load baseline, so interaction-triggered diagnostics cannot hide.
 */

interface ErrorTaps {
  /** Schema-diagnostic channel (`[flux] schema ...`) — FM-005 external red. */
  schemaDiagnostics: string[];
  markBaseline(): void;
  assertClean(): Promise<void>;
}

function installErrorTaps(page: Page): ErrorTaps {
  const nonSchemaErrors: string[] = [];
  const pageErrors: string[] = [];
  const schemaDiagnostics: string[] = [];
  let baseline = 0;

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // FM-005 external attribution: RM metamodel prop-contract diagnostics use
    // the flux schema-diagnostic reporter channel (schema-diagnostics-reporter.ts).
    if (text.startsWith('[flux] schema ')) {
      schemaDiagnostics.push(text);
      return;
    }
    nonSchemaErrors.push(text);
  });
  page.on('pageerror', (err: Error) => {
    pageErrors.push(`[pageerror] ${err.message}`);
  });

  return {
    schemaDiagnostics,
    markBaseline() {
      baseline = schemaDiagnostics.length;
    },
    async assertClean() {
      expect(
        nonSchemaErrors,
        `Expected zero non-schema console errors on ${page.url()}\n${nonSchemaErrors.join('\n')}`,
      ).toEqual([]);
      expect(
        pageErrors,
        `Expected zero pageerror entries on ${page.url()}\n${pageErrors.join('\n')}`,
      ).toEqual([]);
      expect(
        schemaDiagnostics.length,
        `Expected no NEW schema diagnostics beyond the ${baseline} at page load on ${page.url()}\n${schemaDiagnostics.join('\n')}`,
      ).toBe(baseline);
    },
  };
}

async function openLab(page: Page, rendererId: string, taps: ErrorTaps) {
  await page.goto(`/#/lab/${rendererId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('component-lab')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId(`component-lab-renderer-${rendererId}`)).toBeVisible({
    timeout: 30_000,
  });
  taps.markBaseline();
}

function stageOf(page: Page, rendererTitle: string) {
  return page.getByTestId(`scenario-stage-${scenarioSlug(rendererTitle)}`);
}

test.describe('FM-3 interaction contract probes', () => {
  // The dialog lab page compiles six scenarios (including the verbatim
  // real-schema edit dialog) — the first cold hit per worker needs more than
  // the 45s global test timeout.
  test.setTimeout(90_000);

  test('P1 nested dialog: Esc closes only the topmost surface and the outer stays interactive', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'dialog', taps);
    const stage = stageOf(page, 'C1a dialog size matrix');
    await expect(stage).toBeVisible();

    await stage.getByRole('button', { name: 'Open default' }).click();
    const outer = page.locator('[data-slot="dialog-surface"]', { hasText: 'default dialog' });
    await expect(outer).toBeVisible();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(1);

    await outer.getByRole('button', { name: 'Open stacked sm' }).click();
    const inner = page.locator('[data-slot="dialog-surface"]', {
      hasText: 'sm dialog (stacked)',
    });
    await expect(inner).toBeVisible();
    // Overlay stack mirrors the surface stack: one backdrop per open dialog.
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(2);

    // One Esc: the topmost (inner) closes; the outer must NOT close with it
    // (non-topmost outside-press/escape suppression).
    await page.keyboard.press('Escape');
    await expect(inner).toHaveCount(0, { timeout: 5_000 });
    await expect(outer).toBeVisible();

    // The outer is still interactive: the nested open button re-opens the stack.
    await outer.getByRole('button', { name: 'Open stacked sm' }).click();
    await expect(inner).toBeVisible({ timeout: 5_000 });

    // Close the inner via its own close affordance, then the outer via Esc.
    await inner.locator('[data-slot="dialog-close"]').click();
    await expect(inner).toHaveCount(0, { timeout: 5_000 });
    await expect(outer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(outer).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator('[data-slot="dialog-surface"]')).toHaveCount(0);

    await taps.assertClean();
  });

  test('P2 table pagination default keeps the new page view clean and restores selection on return', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'table', taps);
    const stage = stageOf(page, 'Host selection + pagination echo');
    await expect(stage).toBeVisible();

    const rowCheckboxes = stage.getByRole('checkbox', { name: '选择行' });
    await expect(rowCheckboxes).toHaveCount(2, { timeout: 10_000 });

    await rowCheckboxes.nth(0).click();
    await expect(rowCheckboxes.nth(0)).toBeChecked();

    // Page 2 renders two fresh rows and NOTHING may leak into the new page's
    // view (default = render-time pruner, table/design.md T10).
    await stage.getByRole('button', { name: '下一页' }).click();
    await expect(stage.getByText('user-3', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(rowCheckboxes).toHaveCount(2);
    await expect(rowCheckboxes.nth(0)).not.toBeChecked();
    await expect(rowCheckboxes.nth(1)).not.toBeChecked();
    await expect(stage.getByRole('checkbox', { name: '全选' })).not.toBeChecked();

    // Back to page 1: the documented default semantic is a render-time pruner
    // keyed on the VISIBLE row set (table/design.md T10 — deliberately not the
    // AMIS one-way clear), so the still-existing user-1 selection is restored
    // once its row is visible again. keepOnPageChange:true only differs while
    // the row is on a non-visible page (crud keepOnPageChange inverse covered
    // by c4-2 host-crud-paging).
    await stage.getByRole('button', { name: '上一页' }).click();
    await expect(stage.getByText('user-1', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(rowCheckboxes.nth(0)).toBeChecked();
    await expect(rowCheckboxes.nth(1)).not.toBeChecked();

    await taps.assertClean();
  });

  test('P3 tree-table lazy children: collapse removes them and re-expand restores from cache', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'table', taps);
    const stage = stageOf(page, 'Host tree lazy children fail + retry (P1-3)');
    await expect(stage).toBeVisible();

    const toggle = stage.locator('[data-slot="table-tree-toggle"]').first();
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    const childRow = stage
      .locator('[data-slot="table-body"] [data-slot="table-row"]')
      .filter({ hasText: 'Lazy Child' });

    // First expand fails (fixture fetcher) → retry affordance; retry loads.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', '重试', { timeout: 10_000 });
    await toggle.click();
    await expect(childRow).toBeVisible({ timeout: 10_000 });
    await expect(toggle).toHaveAttribute('aria-label', '收起');

    // Collapse unmounts the loaded children; the toggle flips back to 展开.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', '展开', { timeout: 10_000 });
    await expect(childRow).not.toBeVisible();

    // Re-expand: cached success state — children return and the toggle never
    // resurfaces the error/retry affordance (collapse keeps the lazy cache).
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', '收起', { timeout: 10_000 });
    await expect(toggle).not.toHaveAttribute('aria-label', '重试');
    await expect(childRow).toBeVisible({ timeout: 10_000 });

    await taps.assertClean();
  });

  test('P4 quick-edit cancel restores the original value without dispatching quickSaveItemAction', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'crud', taps);
    const stage = stageOf(page, 'Host CRUD row quick-edit submit probe (bug 73 pattern)');
    await expect(stage).toBeVisible();

    const quickEditInput = stage.locator('[data-slot="table-quick-edit"] input').first();
    await expect(quickEditInput).toBeVisible({ timeout: 10_000 });
    await expect(quickEditInput).toHaveValue('Alpha');

    await quickEditInput.fill('Alpha-edited');
    const saveBar = stage.locator('[data-slot="table-row-save-bar"]');
    await expect(saveBar).toBeVisible({ timeout: 5_000 });
    await saveBar.getByRole('button', { name: /取消|Cancel/ }).click();

    // Cancel contract: original value restored, save bar dismissed, and the
    // quick-save action was never dispatched.
    await expect(quickEditInput).toHaveValue('Alpha');
    await expect(saveBar).not.toBeVisible();
    const probeAfterCancel = await page.evaluate(() => {
      return (window as unknown as { __c4c2QuickEditProbe?: unknown }).__c4c2QuickEditProbe;
    });
    expect(probeAfterCancel).toBeUndefined();

    // Control: the probe channel itself works — a real save dispatches the
    // EDITED value, proving the earlier "no dispatch" was the cancel path and
    // not a dead probe.
    await quickEditInput.fill('Alpha-v2');
    await expect(saveBar).toBeVisible({ timeout: 5_000 });
    await saveBar.getByRole('button', { name: /保存|Save/ }).click();
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
      .toEqual({ name: 'Alpha-v2', id: 1 });

    await taps.assertClean();
  });

  test('P5 inline column settings: hidden column state survives a panel close/reopen', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'table', taps);
    const stage = stageOf(page, 'Column drag reorder (L4.11a)');
    await expect(stage).toBeVisible();

    const table = stage.locator('table[data-slot="table"]');
    const emailHeader = table.locator('thead th').filter({ hasText: 'Email' });
    await expect(emailHeader).toBeVisible({ timeout: 10_000 });

    const columnsButton = stage.getByRole('button', { name: '列设置' });
    await expect(columnsButton).toBeVisible();
    await columnsButton.click();
    const panel = stage.locator('[data-slot="table-column-settings-inline"]');
    await expect(panel).toBeVisible();
    const emailItem = panel
      .locator('[data-slot="table-column-settings-item"]')
      .filter({ hasText: 'Email' });
    await emailItem.getByRole('checkbox').click();

    // Hiding a column removes it from the rendered header immediately.
    await expect(emailHeader).toHaveCount(0, { timeout: 5_000 });

    // Session-internal state channel: close and reopen the disclosure — the
    // hidden state must survive (no reset on panel remount).
    await columnsButton.click();
    await expect(panel).toHaveCount(0);
    await columnsButton.click();
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(
      panel
        .locator('[data-slot="table-column-settings-item"]')
        .filter({ hasText: 'Email' })
        .getByRole('checkbox'),
    ).not.toBeChecked();
    await expect(table.locator('thead th').filter({ hasText: 'Email' })).toHaveCount(0);

    // Rechecking restores the column.
    await panel
      .locator('[data-slot="table-column-settings-item"]')
      .filter({ hasText: 'Email' })
      .getByRole('checkbox')
      .click();
    await expect(table.locator('thead th').filter({ hasText: 'Email' })).toBeVisible({
      timeout: 5_000,
    });

    await taps.assertClean();
  });

  test('P6 standalone pagination: out-of-range page clamps to last and page-size change resets to 1', async ({
    page,
  }) => {
    const taps = installErrorTaps(page);
    await openLab(page, 'pagination', taps);

    // Boundary clamp: currentPage=999 with total=25/pageSize=10 → last page (3).
    const clamp = page.getByTestId('demo-pagination-clamp');
    await expect(clamp).toBeVisible({ timeout: 10_000 });
    await expect(clamp).toHaveAttribute('data-current-page', '3');
    await expect(clamp).toHaveAttribute('data-total-pages', '3');
    await expect(clamp.locator('[data-page="3"]')).toHaveAttribute('aria-current', 'page');
    // React stringifies boolean data-* values: the disabled next control pins
    // the last-page boundary.
    await expect(clamp.getByTestId('pagination-next')).toHaveAttribute('data-disabled', 'true');
    await expect(clamp.getByTestId('pagination-next')).toHaveAttribute('aria-disabled', 'true');

    // Page-size change resets currentPage to 1 (empty-page avoidance contract).
    const withSize = page.getByTestId('demo-pagination-with-size');
    await expect(withSize).toBeVisible({ timeout: 10_000 });
    await expect(withSize).toHaveAttribute('data-current-page', '2');
    await withSize.locator('[data-page="4"]').click();
    await expect(withSize).toHaveAttribute('data-current-page', '4');
    await withSize.getByTestId('pagination-page-size').selectOption('100');
    await expect(withSize).toHaveAttribute('data-current-page', '1');
    await expect(withSize).toHaveAttribute('data-page-size', '100');
    await expect(withSize).toHaveAttribute('data-total-pages', '2');

    await taps.assertClean();
  });
});
