import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C1.2 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-loop-row-scope (bug 73 / row-pollution pattern): loop rows each host
 *    an Edit button that opens a dialog. Dialog title + submitAction args are
 *    evaluated in the ROW scope; each row's submit must carry ITS OWN rowId +
 *    typed value (nested action args must not leak across loop rows — the
 *    loop-row sibling of the 08-02 plan-1 dropdown-button fix).
 * 2. host-dynamic-autoload error path: a failing loadAction must surface the
 *    renderer-owned error state (`[data-error]`) inside the nop-dynamic-renderer
 *    shell, not crash the render boundary.
 * 3. host-recurse-deep: a 6-level recursive structure renders end-to-end in a
 *    real browser (no stack overflow), and maxDepth: 2 truncates beyond depth 1.
 */

test('loop-host: each row dialog submits ITS OWN row payload (row-scope, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('loop');

  const slug = scenarioSlug('Loop rows edit through a dialog (row-scope submit)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // ---- Row A (Alice) ----
  await stage.getByRole('button', { name: 'Edit' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Dialog title is evaluated in the row scope: must be "Edit Alice", not "Edit Bob".
  await expect(dialog.getByText('Edit Alice')).toBeVisible({ timeout: 10_000 });

  const nickInput = page.getByLabel('Nick');
  await expect(nickInput).toBeVisible();
  await nickInput.fill('N1-Alice');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden({ timeout: 10_000 });

  const payloadA = await page.evaluate(
    () => (window as unknown as { __loopRowEditProbe?: unknown }).__loopRowEditProbe,
  );
  expect(payloadA).toEqual({ rowId: 'row-a', rowName: 'Alice', nick: 'N1-Alice' });

  // ---- Row B (Bob) ----
  await stage.getByRole('button', { name: 'Edit' }).nth(1).click();

  await expect(dialog).toBeVisible();
  // Row B dialog must NOT inherit row A's scope: title must be "Edit Bob".
  await expect(dialog.getByText('Edit Bob')).toBeVisible({ timeout: 10_000 });

  await nickInput.fill('N2-Bob');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden({ timeout: 10_000 });

  const payloadB = await page.evaluate(
    () => (window as unknown as { __loopRowEditProbe?: unknown }).__loopRowEditProbe,
  );
  expect(payloadB).toEqual({ rowId: 'row-b', rowName: 'Bob', nick: 'N2-Bob' });
});

test('dynamic-host: failing loadAction surfaces the renderer-owned error state', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dynamic-renderer');

  const slug = scenarioSlug('Failing loadAction surfaces the error state');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const errorShell = stage.locator('[data-error]');
  await expect(errorShell).toBeVisible({ timeout: 5_000 });
  // Locale-independent part of the renderer-owned error diagnostic.
  await expect(errorShell).toContainText('Request failed (status=500)');

  // The surrounding page stays healthy (no render-boundary crash).
  await expect(stage.getByText('A failing loadAction surfaces the error state.')).toBeVisible();
});

test('recurse-host: deep tree renders all levels and maxDepth truncates (no stack overflow)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('recurse');

  const deepSlug = scenarioSlug('Deep tree renders all 6 levels without stack overflow');
  const deepStage = lab.scenarioStage(deepSlug);
  await expect(deepStage).toBeVisible();
  for (let level = 0; level < 6; level += 1) {
    // Scope-debug JSON inside the stage also contains the label text, so scope
    // to .nop-text nodes only.
    await expect(
      deepStage.locator('.nop-text', { hasText: `Level ${level}` }),
    ).toBeVisible({ timeout: 5_000 });
  }

  const truncSlug = scenarioSlug('maxDepth 2 truncates recursion beyond depth 2');
  const truncStage = lab.scenarioStage(truncSlug);
  await expect(truncStage).toBeVisible();
  await expect(truncStage.locator('.nop-text', { hasText: 'Level 0' })).toBeVisible();
  await expect(truncStage.locator('.nop-text', { hasText: 'Level 1' })).toBeVisible();
  // Recursion stops at depth 1 (loop=0, recurse#1=1, recurse#2 gated).
  await expect(truncStage.locator('.nop-text', { hasText: 'Level 2' })).toHaveCount(0);
});
