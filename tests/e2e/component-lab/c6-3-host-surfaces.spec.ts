import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C6.3 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-alert-close + host-alert-action: closable close hides the node AND
 *    the onClose action args read `${level}` from the event payload
 *    (evaluationBindings contract — alert P1-1 fix); the actions-region
 *    embedded button dispatches its own action independently.
 * 2. host-mapping-row (bug 73 pattern): mapping inside repeated card rows
 *    resolves each row's OWN scope value (row pollution re-verification);
 *    the embedded Pick button submits the CLICKED row's values.
 * 3. host-mapping-region: item region template renders on hit with an
 *    embedded action; miss renders no region.
 * 4. host-status-dialog: status inside an openDialog surface evaluates the
 *    opened row's `$slot.record.*` scope values and projects the levelMap
 *    semantic color.
 */

test('alert-host: close hides + onClose {level} payload + inner action (host-alert-close/host-alert-action)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('alert');

  const slug = scenarioSlug('Host alert close + embedded actions (C6.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const closable = stage.locator('[data-testid="c6c3-alert-close"]');
  await expect(closable).toBeVisible({ timeout: 10_000 });
  await expect(closable).toHaveAttribute('data-slot', 'alert');
  await expect(closable).toHaveAttribute('data-level', 'warning');
  const cls = await closable.evaluate((el) => el.className);
  expect(cls).toContain('nop-alert');

  // --- host-alert-action: actions-region embedded button dispatches its own action ---
  const actionsAlert = stage.locator('[data-testid="c6c3-alert-actions"]');
  await expect(actionsAlert).toBeVisible({ timeout: 10_000 });
  await stage.locator('[data-testid="c6c3-alert-inner-action"]').click();
  const actionProbe = await page.evaluate(
    () => (window as unknown as { __c6c3AlertAction?: string }).__c6c3AlertAction,
  );
  expect(actionProbe).toBe('inner-fired');

  // --- host-alert-close: close hides the node + onClose payload {level} ---
  await closable.locator('[data-testid="alert-close"]').click();
  await expect(closable).toHaveCount(0);
  const closeProbe = await page.evaluate(
    () => (window as unknown as { __c6c3AlertClose?: string }).__c6c3AlertClose,
  );
  // `${level}` resolved from the event payload (evaluationBindings), not scope.
  expect(closeProbe).toBe('warning|closed');

  await assertTrackedPageErrors(page);
});

test('mapping-host: per-row scope values + embedded pick (host-mapping-row, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('mapping');

  const slug = scenarioSlug('Host mapping rows + item region (C6.3 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const cards = stage.locator('[data-testid="c6c3-cards-rows"]');
  await expect(cards).toBeVisible({ timeout: 10_000 });
  const items = cards.locator('[data-slot="cards-item"]');
  await expect(items).toHaveCount(3);

  // Each row's mapping resolves its OWN row value — a row-scope pollution would
  // repeat the first row's result for every row.
  const maps = cards.locator('[data-slot="mapping-root"]');
  await expect(maps).toHaveCount(3);
  await expect(maps.nth(0)).toHaveAttribute('data-state', 'hit');
  await expect(maps.nth(0).locator('[data-slot="mapping-item"]')).toHaveText('Active');
  await expect(maps.nth(1)).toHaveAttribute('data-state', 'hit');
  await expect(maps.nth(1).locator('[data-slot="mapping-item"]')).toHaveText('Idle');
  await expect(maps.nth(2)).toHaveAttribute('data-state', 'miss');
  await expect(maps.nth(2).locator('[data-slot="mapping-item"]')).toHaveText('Unknown');

  // Embedded Pick button submits the CLICKED row's values (row isolation).
  await items.nth(1).getByRole('button', { name: 'Pick' }).click();
  const pick1 = await page.evaluate(
    () => (window as unknown as { __c6c3MappingPick?: string }).__c6c3MappingPick,
  );
  expect(pick1).toBe('Beta|idle');

  await items.nth(2).getByRole('button', { name: 'Pick' }).click();
  const pick2 = await page.evaluate(
    () => (window as unknown as { __c6c3MappingPick?: string }).__c6c3MappingPick,
  );
  expect(pick2).toBe('Gamma|pending');

  await assertTrackedPageErrors(page);
});

test('mapping-host: item region template + embedded action on hit (host-mapping-region)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('mapping');

  const slug = scenarioSlug('Host mapping item region (C6.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const region = stage.locator('[data-testid="c6c3-mapping-region"]');
  await expect(region).toBeVisible({ timeout: 10_000 });
  await expect(region).toHaveAttribute('data-state', 'hit');
  await expect(region.locator('[data-slot="mapping-item"]')).toContainText('Custom hit template');

  // Embedded button inside the item region dispatches its own action.
  await stage.locator('[data-testid="c6c3-region-action"]').click();
  const regionProbe = await page.evaluate(
    () => (window as unknown as { __c6c3MappingRegion?: string }).__c6c3MappingRegion,
  );
  expect(regionProbe).toBe('region-fired');

  // Miss renders NO region content (template stays hidden).
  const miss = stage.locator('[data-testid="c6c3-mapping-region-miss"]');
  await expect(miss).toHaveAttribute('data-state', 'miss');
  expect(await miss.locator('[data-slot="mapping-item"]').count()).toBe(0);

  await assertTrackedPageErrors(page);
});

test('status-host: dialog scope eval + levelMap projection (host-status-dialog)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('status');

  const slug = scenarioSlug('Host status in dialog scope (C6.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const crud = stage.locator('[data-testid="c6c3-status-crud"]');
  await expect(crud).toBeVisible({ timeout: 10_000 });
  const detailButtons = stage.getByRole('button', { name: 'Details' });
  await expect(detailButtons).toHaveCount(3, { timeout: 10_000 });

  // Open the THIRD row (Gamma, status pending → warning/amber projection).
  await detailButtons.nth(2).click();
  const dialogStatus = page.locator('[data-testid="c6c3-dialog-status"]');
  await expect(dialogStatus).toBeVisible({ timeout: 10_000 });
  await expect(dialogStatus).toHaveAttribute('data-state', 'hit');
  await expect(dialogStatus).toHaveAttribute('data-level', 'warning');
  await expect(dialogStatus.locator('[data-slot="status-badge"]')).toHaveText('Pending');
  const badgeClass = await dialogStatus
    .locator('[data-slot="status-badge"]')
    .evaluate((el) => el.className);
  expect(badgeClass).toContain('amber');

  // Close the dialog and open the SECOND row (Beta, status idle → info/secondary).
  await page.locator('[data-slot="dialog-close"]').click();
  await expect(dialogStatus).toHaveCount(0);
  await detailButtons.nth(1).click();
  await expect(dialogStatus).toBeVisible({ timeout: 10_000 });
  await expect(dialogStatus).toHaveAttribute('data-state', 'hit');
  await expect(dialogStatus).toHaveAttribute('data-level', 'info');
  await expect(dialogStatus.locator('[data-slot="status-badge"]')).toHaveText('Idle');

  await assertTrackedPageErrors(page);
});
