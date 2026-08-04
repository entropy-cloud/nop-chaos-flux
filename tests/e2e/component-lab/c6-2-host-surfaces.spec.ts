import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C6.2 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-cards-select: cards local-only selection — single (mutual exclusion +
 *    onSelectionChange report), multiple (accumulation), none (no highlight, no
 *    report). No value/valueOwnership anywhere in the contract.
 * 2. host-cards-action (bug 73 pattern): cards item embedded button submits the
 *    CLICKED row's item-scope value through a probe namespace (row pollution
 *    re-verification); onItemClick reports the clicked row via setValue.
 * 3. host-card-click: whole-card onClick dispatch + inner actions button action.
 * 4. host-empty-cta: empty actions CTA dispatches its action.
 * 5. host-progress-clamp: value over max / negative values clamp; scope updates
 *    flow through (aria-valuenow + value display).
 * 6. host-spinner-visible: meta.visible scope toggle removes the node.
 * 7. host-separator: horizontal/vertical/labelled/decorative contracts.
 */

test('cards-host: local-only selection single/multiple/none (host-cards-select)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('cards');

  const slug = scenarioSlug('Host cards selection modes + item action (C6.2 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // --- single: mutual exclusion + report ---
  const single = stage.locator('[data-testid="c6c2-cards-single"]');
  await expect(single).toBeVisible({ timeout: 10_000 });
  const singleItems = single.locator('[data-slot="cards-item"]');
  await expect(singleItems).toHaveCount(3);

  await singleItems.nth(1).click();
  await expect(singleItems.nth(1)).toHaveAttribute('data-selected', 'true');
  await expect(singleItems.nth(0)).not.toHaveAttribute('data-selected', 'true');
  await expect(stage.locator('[data-testid="c6c2-single-report"]')).toHaveText('single-report:2');

  await singleItems.nth(0).click();
  await expect(singleItems.nth(0)).toHaveAttribute('data-selected', 'true');
  await expect(singleItems.nth(1)).not.toHaveAttribute('data-selected', 'true');
  await expect(stage.locator('[data-testid="c6c2-single-report"]')).toHaveText('single-report:1');

  // --- multiple: accumulation ---
  const multiple = stage.locator('[data-testid="c6c2-cards-multiple"]');
  const multiItems = multiple.locator('[data-slot="cards-item"]');
  await multiItems.nth(0).click();
  await multiItems.nth(2).click();
  await expect(multiItems.nth(0)).toHaveAttribute('data-selected', 'true');
  await expect(multiItems.nth(2)).toHaveAttribute('data-selected', 'true');
  await expect(multiItems.nth(1)).not.toHaveAttribute('data-selected', 'true');

  // --- none: no highlight, no report ---
  const none = stage.locator('[data-testid="c6c2-cards-none"]');
  const noneItems = none.locator('[data-slot="cards-item"]');
  await noneItems.nth(0).click();
  await expect(noneItems.nth(0)).not.toHaveAttribute('data-selected', 'true');
  await expect(stage.locator('[data-testid="c6c2-none-report"]')).toHaveText(
    'none-report:pending',
  );

  await assertTrackedPageErrors(page);
});

test('cards-host: item embedded action submits the CLICKED row scope (host-cards-action, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('cards');

  const slug = scenarioSlug('Host cards embedded item action (C6.2 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const cards = stage.locator('[data-testid="c6c2-cards-action"]');
  await expect(cards).toBeVisible({ timeout: 10_000 });
  const items = cards.locator('[data-slot="cards-item"]');
  await expect(items).toHaveCount(3);

  // Click the SECOND card's embedded Pick button → the pick probe must receive
  // Beta (row 2's label). A stale/row-1 scope would deliver Alpha. (The click
  // also bubbles to the card's onItemClick — see the probe assertions below.)
  await items.nth(1).getByRole('button', { name: 'Pick' }).click();
  const pick = await page.evaluate(
    () => (window as unknown as { __c6c2CardsPick?: string }).__c6c2CardsPick,
  );
  expect(pick).toBe('Beta');

  // Click the THIRD card's Pick → pick probe switches to Gamma (row isolation).
  await items.nth(2).getByRole('button', { name: 'Pick' }).click();
  const pick2 = await page.evaluate(
    () => (window as unknown as { __c6c2CardsPick?: string }).__c6c2CardsPick,
  );
  expect(pick2).toBe('Gamma');

  // onItemClick: `${item.label}` from the per-row scope + `${key}` from the
  // event payload (evaluationBindings contract, C6.2 P1 fix) resolve against
  // the CLICKED row in the real browser.
  await items.nth(1).click();
  const probe3 = await page.evaluate(
    () => (window as unknown as { __c6c2CardsProbe?: string }).__c6c2CardsProbe,
  );
  expect(probe3).toBe('Beta|2');

  await items.nth(0).click();
  const probe4 = await page.evaluate(
    () => (window as unknown as { __c6c2CardsProbe?: string }).__c6c2CardsProbe,
  );
  expect(probe4).toBe('Alpha|1');

  await assertTrackedPageErrors(page);
});

test('card-host: onClick + inner actions button (host-card-click)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('card');

  const slug = scenarioSlug('Host card onClick + inner button action (C6.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const card = stage.locator('[data-testid="c6c2-card"]');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('[data-testid="c6c2-card-click-report"]')).toHaveText(
    'card-clicked:pending',
  );
  await expect(stage.locator('[data-testid="c6c2-inner-report"]')).toHaveText('inner:0');

  // Whole-card click → card onClick dispatches.
  await card.click();
  await expect(stage.locator('[data-testid="c6c2-card-click-report"]')).toHaveText(
    'card-clicked:true',
    { timeout: 10_000 },
  );
  await expect(stage.locator('[data-testid="c6c2-inner-report"]')).toHaveText('inner:0');

  // Inner actions button → its own action dispatches (DOM bubbling also reaches
  // the card onClick — native semantics, frozen here).
  await stage.locator('[data-testid="c6c2-inner-action"]').click();
  await expect(stage.locator('[data-testid="c6c2-inner-report"]')).toHaveText('inner:1', {
    timeout: 10_000,
  });
  await expect(stage.locator('[data-testid="c6c2-card-click-report"]')).toHaveText(
    'card-clicked:true',
  );

  await assertTrackedPageErrors(page);
});

test('empty-host: actions CTA dispatches (host-empty-cta)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('empty');

  const slug = scenarioSlug('Host empty actions CTA (C6.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const empty = stage.locator('[data-testid="c6c2-empty"]');
  await expect(empty).toBeVisible({ timeout: 10_000 });
  await expect(empty.locator('[data-slot="empty-title"]')).toHaveText('No results');
  await expect(empty.locator('[data-slot="empty-description"]')).toHaveText(
    'Try a different query.',
  );
  await expect(stage.locator('[data-testid="c6c2-empty-report"]')).toHaveText('cta:pending');

  await stage.locator('[data-testid="c6c2-empty-cta"]').click();
  await expect(stage.locator('[data-testid="c6c2-empty-report"]')).toHaveText('cta:fired', {
    timeout: 10_000,
  });

  await assertTrackedPageErrors(page);
});

test('progress-host: clamp over max / negative + scope updates (host-progress-clamp)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('progress');

  const slug = scenarioSlug('Host progress clamp on scope update (C6.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const progress = stage.locator('[data-testid="c6c2-progress"]');
  await expect(progress).toBeVisible({ timeout: 10_000 });

  // initial scope value = 250, max = 100 → clamped to 100, full bar
  await expect(progress).toHaveAttribute('aria-valuenow', '100', { timeout: 10_000 });
  await expect(progress.locator('[data-slot="progress-value"]')).toHaveText('100');

  // negative → clamped to 0
  await stage.getByRole('button', { name: 'Set -10' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '0', { timeout: 10_000 });
  await expect(progress.locator('[data-slot="progress-value"]')).toHaveText('0');

  // in-range → passes through
  await stage.getByRole('button', { name: 'Set 42' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '42', { timeout: 10_000 });
  await expect(progress.locator('[data-slot="progress-value"]')).toHaveText('42');

  // back to overflow → clamped again
  await stage.getByRole('button', { name: 'Set 250' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '100', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('spinner-host: meta.visible toggle removes the node (host-spinner-visible)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('spinner');

  const slug = scenarioSlug('Host spinner visible toggle (C6.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const spinner = stage.locator('[data-testid="c6c2-spinner"]');
  await expect(spinner).toBeVisible({ timeout: 10_000 });
  await expect(spinner.locator('svg')).toHaveAttribute('role', 'status');

  await stage.locator('[data-testid="c6c2-toggle-spinner"]').click();
  await expect(spinner).toHaveCount(0);

  await assertTrackedPageErrors(page);
});

test('separator-host: orientations + labelled + decorative (host-separator)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('separator');

  const slug = scenarioSlug('Host separator orientations + decorative (C6.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const h = stage.locator('[data-testid="c6c2-sep-h"]');
  await expect(h).toBeVisible({ timeout: 10_000 });
  expect(await h.getAttribute('aria-orientation')).toBe('horizontal');
  await expect(h).toHaveAttribute('data-slot', 'separator');

  const v = stage.locator('[data-testid="c6c2-sep-v"]');
  await expect(v).toBeVisible({ timeout: 10_000 });
  expect(await v.getAttribute('aria-orientation')).toBe('vertical');

  const labelled = stage.locator('[data-testid="c6c2-sep-label"]');
  await expect(labelled).toBeVisible({ timeout: 10_000 });
  expect(await labelled.getAttribute('data-orientation')).toBe('horizontal');
  await expect(labelled.locator('[data-slot="separator-label"]')).toHaveText('Section');

  const decorative = stage.locator('[data-testid="c6c2-sep-decorative"]');
  await expect(decorative).toBeVisible({ timeout: 10_000 });
  await expect(decorative).toHaveAttribute('aria-hidden', 'true');
  await expect(decorative).toHaveAttribute('role', 'none');

  await assertTrackedPageErrors(page);
});
