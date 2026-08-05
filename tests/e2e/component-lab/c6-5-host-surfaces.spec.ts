import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C6.5 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-diff-dialog (bug 73 pattern): diff-view inside an openDialog surface —
 *    the split view renders inside the dialog and a real line click dispatches
 *    onLineClick with the action args resolving ${lineNumber}|${side}|${type}
 *    from the event payload (P1-10 evaluationBindings proof in a real browser).
 * 2. host-diff-crosfile: cross-file mode file-list navigation drives content
 *    switching; out-of-range activeFileIndex values (99 / -5) clamp to the
 *    last/first file at mount (P1-5 proof).
 * 3. host-diff-reaction: CX-9 reaction wiring — schema-declared toggleViewType
 *    reaction (dependsOn: [toggle]) fires on scope change and flips data-view;
 *    setViewType reaction (dependsOn: [viewMode]) drives explicit view types
 *    (P1-4 + P1-8 proof).
 * 4. host-diff-expand: component:expandAll/collapseAll handles drive the
 *    data-expanded state of folded hunks.
 * 5. host-diff-empty: identical old/new content renders the noChanges empty
 *    state.
 */

test('diff-host: dialog-rendered diff-view + line click payload (host-diff-dialog, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('diff-view');

  const slug = scenarioSlug('Host diff in dialog + line click (C6.5 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c6c5-dialog-open"]').click();
  const dialogDiff = page.locator('[data-testid="c6c5-dialog-diff"]');
  await expect(dialogDiff).toBeVisible({ timeout: 10_000 });
  await expect(dialogDiff).toHaveAttribute('data-view', 'split');

  const addLine = dialogDiff.locator(
    '.nop-diff-split-new [data-diff-type="add"].nop-diff-line-clickable',
  );
  await expect(addLine.first()).toBeVisible({ timeout: 10_000 });
  await addLine.first().click();

  const lineClickProbe = await page.evaluate(
    () => (window as unknown as { __c6c5LineClick?: string }).__c6c5LineClick,
  );
  // P1-10: ${lineNumber}|${side}|${type} resolve from the onLineClick payload
  // (evaluationBindings) — side must be the new pane.
  expect(lineClickProbe).toMatch(/^\d+\|new\|add$/);

  await assertTrackedPageErrors(page);
});

test('diff-host: cross-file nav + out-of-range clamp (host-diff-crosfile)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('diff-view');

  const slug = scenarioSlug('Host cross-file nav + out-of-range clamp (C6.5)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const cross = stage.locator('[data-testid="c6c5-cross"]');
  await expect(cross).toBeVisible({ timeout: 10_000 });

  const getFileName = (testid: string) =>
    stage.locator(`[data-testid="${testid}"] .nop-diff-file-name`).textContent();

  // P1-5: activeFileIndex 99 clamps to the last file, -5 clamps to the first.
  await expect.poll(async () => getFileName('c6c5-cross-high'), { timeout: 10_000 }).toBe(
    'src/legacy/utils.js',
  );
  await expect.poll(async () => getFileName('c6c5-cross-low'), { timeout: 10_000 }).toBe(
    'src/user/profile.ts',
  );

  // File-list navigation drives the active file content locally.
  const fileItems = cross.locator('[data-slot="diff-file-list"] [role="button"]');
  await expect(fileItems.nth(1)).toBeVisible();
  await fileItems.nth(1).click();
  await expect
    .poll(async () => getFileName('c6c5-cross'), { timeout: 10_000 })
    .toBe('src/user/constants.ts');

  await assertTrackedPageErrors(page);
});

test('diff-host: CX-9 reaction wiring flips the view (host-diff-reaction)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('diff-view');

  const slug = scenarioSlug('Host diff reaction wiring + component handles (C6.5)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const diff = stage.locator('[data-testid="c6c5-reaction-diff"]');
  await expect(diff).toBeVisible({ timeout: 10_000 });
  await expect(diff).toHaveAttribute('data-view', 'split');

  // toggleViewType reaction: scope toggle change → component:toggleViewType
  // → registered handle flips data-view (P1-4 + P1-8 real-browser proof).
  await stage.locator('[data-testid="c6c5-reaction-toggle"]').click();
  await expect(diff).toHaveAttribute('data-view', 'unified', { timeout: 10_000 });
  await stage.locator('[data-testid="c6c5-reaction-toggle"]').click();
  await expect(diff).toHaveAttribute('data-view', 'split', { timeout: 10_000 });

  // setViewType reaction: viewMode scope change → component:setViewType with
  // args {viewType: ${viewMode}} → handle switches.
  await stage.locator('[data-testid="c6c5-reaction-unified"]').click();
  await expect(diff).toHaveAttribute('data-view', 'unified', { timeout: 10_000 });
  await stage.locator('[data-testid="c6c5-reaction-split"]').click();
  await expect(diff).toHaveAttribute('data-view', 'split', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('diff-host: component:expandAll/collapseAll drive hunk state (host-diff-expand)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('diff-view');

  const slug = scenarioSlug('Host diff expandAll/collapseAll (C6.5)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const diff = stage.locator('[data-testid="c6c5-expand-diff"]');
  await expect(diff).toBeVisible({ timeout: 10_000 });

  const collapsedCount = () =>
    diff.locator('[data-slot="diff-hunk-header"][data-expanded="false"]').count();
  const expandedCount = () =>
    diff.locator('[data-slot="diff-hunk-header"][data-expanded="true"]').count();

  await expect.poll(async () => collapsedCount(), { timeout: 10_000 }).toBeGreaterThan(0);

  await stage.locator('[data-testid="c6c5-expand-all"]').click();
  await expect.poll(async () => collapsedCount(), { timeout: 10_000 }).toBe(0);
  await expect.poll(async () => expandedCount(), { timeout: 10_000 }).toBeGreaterThan(0);

  await stage.locator('[data-testid="c6c5-collapse-all"]').click();
  await expect.poll(async () => collapsedCount(), { timeout: 10_000 }).toBeGreaterThan(0);

  await assertTrackedPageErrors(page);
});

test('diff-host: identical content renders the empty state (host-diff-empty)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('diff-view');

  const slug = scenarioSlug('Host diff empty state (C6.5)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const empty = stage.locator('[data-testid="c6c5-empty"]');
  await expect(empty).toBeVisible({ timeout: 10_000 });
  await expect(empty).toHaveClass(/nop-diff-view-empty/);
  await expect(empty.locator('.nop-diff-empty-state')).toHaveText('无变化');

  await assertTrackedPageErrors(page);
});
