import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C5.2 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-bg-select: button-group single selection toggles data-selected with
 *    mutual exclusion; onChange payload {value, selectedKeys, selectionMode}
 *    reaches the host scope through the report text.
 * 2. host-dd-row (bug 73 pattern — 08-02 row-scope isolation re-verification):
 *    a CRUD operation column hosts a dropdown-button whose "Edit Row" item
 *    opens a per-row dialog form; editing row 2 and submitting must deliver
 *    row 2's id and the EDITED value (a stale-row submit would deliver row 1).
 * 3. host-steps-owner: steps three-way ownership — local toggles, a controlled
 *    instance driven by host scope buttons (clicks do not mutate), and a scope
 *    instance writing valueStatePath.
 * 4. host-steps-change: clicking a step switches data-current-index and reports
 *    the onChange payload {value, stepIndex, stepKey}.
 * 5. host-timeline: display-only timeline renders modes/orientation/reverse with
 *    marker-only roots and CSS-driven layout (no owner-state side effects).
 */

test('button-group-host: single selection + onChange payload (host-bg-select)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('button-group');

  const slug = scenarioSlug('Host button-group selection + onChange payload (C5.2 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const bg = stage.locator('[data-testid="c5c2-bg"]');
  await expect(bg).toBeVisible({ timeout: 10_000 });
  await expect(bg).toHaveAttribute('data-selection-mode', 'single');

  // Root carries the renderer marker + ui ButtonGroup chrome (flex is the
  // component layer's own cva base — not a renderer-authored layout class).
  const bgClasses = await bg.evaluate((el) => Array.from(el.classList));
  expect(bgClasses).toContain('nop-button-group');
  expect(bgClasses.filter((c) => c === 'grid' || c.startsWith('gap') || c.startsWith('grid-cols'))).toEqual([]);

  const items = bg.locator('[data-slot="button-group-item"]');
  await expect(items).toHaveCount(3);

  // Click item 2: selected + mutual exclusion.
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('data-selected', 'true');
  await expect(items.nth(0)).not.toHaveAttribute('data-selected');
  await expect(items.nth(2)).not.toHaveAttribute('data-selected');

  // onChange payload reported to the host scope.
  await expect(stage.locator('[data-testid="c5c2-bg-report"]')).toHaveText(
    'bg-payload:opt2|opt2|single',
    { timeout: 10_000 },
  );

  // Switching selection reports the new payload.
  await items.nth(2).click();
  await expect(items.nth(2)).toHaveAttribute('data-selected', 'true');
  await expect(items.nth(1)).not.toHaveAttribute('data-selected');
  await expect(stage.locator('[data-testid="c5c2-bg-report"]')).toHaveText(
    'bg-payload:opt3|opt3|single',
    { timeout: 10_000 },
  );

  await assertTrackedPageErrors(page);
});

test('dropdown-button-host: CRUD row menu submits current row value (host-dd-row, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dropdown-button');

  const slug = scenarioSlug('Host CRUD row dropdown-button menu (C5.2 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Two CRUD rows render; each operation column carries its own dropdown-button.
  const moreButtons = stage.getByRole('button', { name: 'More' });
  await expect(moreButtons).toHaveCount(2, { timeout: 10_000 });

  // Root is marker-only.
  const ddClasses = await stage.locator('.nop-dropdown-button').first().evaluate((el) =>
    Array.from(el.classList),
  );
  expect(ddClasses).toContain('nop-dropdown-button');
  expect(ddClasses).not.toContain('inline-block');

  // Open the SECOND row's menu (row 2 → id 2).
  await moreButtons.nth(1).click();
  await page.getByRole('menuitem', { name: 'Edit Row' }).click();

  // Dialog loads row 2's data (id=2).
  const nickInput = page.getByLabel('Nick');
  await expect(nickInput).toBeVisible({ timeout: 10_000 });
  await expect(nickInput).toHaveValue('RowTwoNick');

  // Edit and submit — the probe must receive row 2's id + the EDITED value
  // (a stale-row submit would deliver row 1 data).
  await nickInput.fill('EditedRowTwo');
  await page.getByRole('button', { name: 'OK' }).click();

  const submitted = await page.evaluate(() =>
    (window as unknown as { __c5c2RowEditProbe?: { id?: string; nickName?: string } })
      .__c5c2RowEditProbe,
  );
  expect(submitted?.id).toBe('2');
  expect(submitted?.nickName).toBe('EditedRowTwo');

  await assertTrackedPageErrors(page);
});

test('steps-host: three-way ownership switching (host-steps-owner)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('steps');

  const slug = scenarioSlug('Host steps three-way ownership switching (C5.2 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Root is marker-only; layout is CSS-driven (data-orientation selectors).
  const local = stage.locator('[data-testid="c5c2-steps-local"]');
  await expect(local).toBeVisible({ timeout: 10_000 });
  const stepsClasses = await local.evaluate((el) => Array.from(el.classList));
  expect(stepsClasses).toContain('nop-steps');
  expect(stepsClasses.filter((c) => c.startsWith('flex') || c.startsWith('items-'))).toEqual([]);
  // CSS baseline still lays out the root (flex row for horizontal).
  const computed = await local.evaluate((el) => {
    const style = getComputedStyle(el);
    return { display: style.display, flexDirection: style.flexDirection };
  });
  expect(computed.display).toBe('flex');
  expect(computed.flexDirection).toBe('row');

  // Local: click switches the current step.
  await expect(local).toHaveAttribute('data-current-index', '0');
  await local.locator('[data-slot="steps-indicator"]').nth(1).click();
  await expect(local).toHaveAttribute('data-current-index', '1');

  // Controlled: host button drives the value; a step click does NOT move it.
  const controlled = stage.locator('[data-testid="c5c2-steps-controlled"]');
  await expect(controlled).toBeVisible({ timeout: 10_000 });
  await expect(controlled).toHaveAttribute('data-ownership', 'controlled');
  await expect(controlled).toHaveAttribute('data-current-index', '0');
  await stage.getByRole('button', { name: 'Set controlled = b' }).click();
  await expect(controlled).toHaveAttribute('data-current-index', '1');
  await expect(stage.locator('[data-testid="c5c2-steps-ctrl-report"]')).toContainText('value=b');

  // Controlled click dispatches onChange but does not mutate.
  await controlled.locator('[data-slot="steps-indicator"]').nth(2).click();
  await expect(controlled).toHaveAttribute('data-current-index', '1');

  // Scope: click writes valueStatePath.
  const scope = stage.locator('[data-testid="c5c2-steps-scope"]');
  await expect(scope).toBeVisible({ timeout: 10_000 });
  await expect(scope).toHaveAttribute('data-ownership', 'scope');
  await expect(scope).toHaveAttribute('data-current-index', '0');
  await scope.locator('[data-slot="steps-indicator"]').nth(1).click();
  await expect(scope).toHaveAttribute('data-current-index', '1');
  await expect(stage.locator('[data-testid="c5c2-steps-scope-report"]')).toContainText('scope:b');

  await assertTrackedPageErrors(page);
});

test('steps-host: click + onChange payload (host-steps-change)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('steps');

  const slug = scenarioSlug('Host steps click + onChange payload (C5.2 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const steps = stage.locator('[data-testid="c5c2-steps-change"]');
  await expect(steps).toBeVisible({ timeout: 10_000 });
  await expect(steps).toHaveAttribute('data-current-index', '0');

  await steps.locator('[data-slot="steps-indicator"]').nth(1).click();
  await expect(steps).toHaveAttribute('data-current-index', '1');
  await expect(stage.locator('[data-testid="c5c2-steps-change-report"]')).toHaveText(
    'steps-payload:s2|1|s2',
    { timeout: 10_000 },
  );

  await assertTrackedPageErrors(page);
});

test('timeline-host: display modes with marker-only roots (host-timeline)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('timeline');

  const slug = scenarioSlug('Host timeline display modes (C5.2 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const left = stage.locator('[data-testid="c5c2-timeline-left"]');
  await expect(left).toBeVisible({ timeout: 10_000 });
  await expect(left).toHaveAttribute('data-mode', 'left');
  await expect(left).toHaveAttribute('data-orientation', 'vertical');
  // Timeline v2 contract: data-ownership is always emitted on timeline-root
  // (display-only marker, mirrors steps; renderer-markers-and-selectors.md).
  // Host scenario declares no valueOwnership → default 'local'. CR Phase 5
  // aligned this assertion with the v2 contract (was: not.toHaveAttribute).
  await expect(left).toHaveAttribute('data-ownership', 'local');
  await expect(left.locator('[data-slot="timeline-item"]')).toHaveCount(3);
  await expect(left.locator('[data-slot="timeline-item"]').nth(1)).toHaveAttribute(
    'data-level',
    'success',
  );

  // Marker-only root + CSS-driven vertical layout.
  const tlClasses = await left.evaluate((el) => Array.from(el.classList));
  expect(tlClasses).toContain('nop-timeline');
  expect(tlClasses.filter((c) => c.startsWith('flex') || c.startsWith('items-') || c.startsWith('gap') || c === 'overflow-x-auto')).toEqual([]);
  const computed = await left.evaluate((el) => {
    const style = getComputedStyle(el);
    return { display: style.display, flexDirection: style.flexDirection };
  });
  expect(computed.display).toBe('flex');
  expect(computed.flexDirection).toBe('column');

  // Alternate mode side alternation.
  const alternate = stage.locator('[data-testid="c5c2-timeline-alternate"]');
  await expect(alternate).toHaveAttribute('data-mode', 'alternate');
  await expect(alternate.locator('[data-slot="timeline-item"]').nth(0)).toHaveAttribute(
    'data-side',
    'right',
  );
  await expect(alternate.locator('[data-slot="timeline-item"]').nth(1)).toHaveAttribute(
    'data-side',
    'left',
  );

  // Reverse reorders DOM.
  const reversed = stage.locator('[data-testid="c5c2-timeline-reverse"]');
  await expect(reversed).toHaveAttribute('data-reverse', 'true');
  const reversedTitles = await reversed
    .locator('[data-slot="timeline-title"]')
    .allTextContents();
  expect(reversedTitles).toEqual(['Third', 'Second', 'First']);

  // Horizontal orientation keeps CSS-driven row layout.
  const horizontal = stage.locator('[data-testid="c5c2-timeline-horizontal"]');
  await expect(horizontal).toHaveAttribute('data-orientation', 'horizontal');
  const hComputed = await horizontal.evaluate((el) => {
    const style = getComputedStyle(el);
    return { display: style.display, flexDirection: style.flexDirection };
  });
  expect(hComputed.display).toBe('flex');
  expect(hComputed.flexDirection).toBe('row');

  await assertTrackedPageErrors(page);
});
