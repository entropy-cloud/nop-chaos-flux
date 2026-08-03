import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C4.3 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-ds-list: a data-source fetches remote users through the env IO
 *    boundary into scope; the list renders the published value, statistics
 *    echoes the count, and component:refresh re-fetches a new batch.
 * 2. host-ds-fail (bug 73 pattern — unit-green but real-browser failure risk):
 *    the first two fetches fail; statusPath reports hasError, initialData rows
 *    are retained (old data kept on failure), and component:refresh retries to
 *    recovery.
 * 3. host-tree-search: searchable tree filters nodes, auto-expands matching
 *    ancestors, highlights matches, and restores the expand state on clear.
 * 4. host-pagination: the standalone pagination publishes state through
 *    statusPath; the controlled list re-slices as the page changes.
 * 5. host-chart: chart renders scope data, swaps data in-place (no remount),
 *    and clears to the explicit empty state.
 *
 * The lab runs zh-CN by default, so i18n chrome labels are matched with
 * locale-agnostic patterns where possible.
 */

test('data-source-host: remote load drives a list and refresh re-fetches (host-ds-list)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('data-source');

  const slug = scenarioSlug('Host data-source loads remote users into list (C4.3 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // The dev playground runs under React.StrictMode, so the source may mount
  // twice and land on a later batch; assert the pattern, not a fixed batch.
  const list = stage.locator('[data-testid="c4c3-ds-list"]');
  await expect(list).toBeVisible({ timeout: 10_000 });
  await expect(list.locator('[data-slot="list-item"]')).toHaveCount(2);
  await expect(list.getByText(/User\d+-A/)).toBeVisible({ timeout: 10_000 });
  await expect(list.getByText(/User\d+-B/)).toBeVisible({ timeout: 5_000 });
  await expect(stage.locator('[data-testid="c4c3-ds-statistics"]')).toHaveAttribute(
    'data-total',
    '2',
  );

  // The fetcher was reached through the env IO boundary (window probe).
  const fetchCountBefore = await page.evaluate(
    () => (window as unknown as { __c4c3UsersProbe?: number }).__c4c3UsersProbe ?? 0,
  );
  expect(fetchCountBefore).toBeGreaterThan(0);

  // component:refresh re-fetches another batch (probe count increments).
  await stage.getByRole('button', { name: 'Refresh users' }).click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __c4c3UsersProbe?: number }).__c4c3UsersProbe,
        ),
      { timeout: 10_000 },
    )
    .toBe(fetchCountBefore + 1);
  await expect(stage.locator('[data-testid="c4c3-ds-statistics"]')).toHaveAttribute(
    'data-total',
    '2',
  );

  await assertTrackedPageErrors(page);
});

test('data-source-host: failure keeps old data and retry recovers (host-ds-fail, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('data-source');

  const slug = scenarioSlug('Host data-source failure keeps data + retry (C4.3 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Under StrictMode the mount may consume one or both simulated failures;
  // what matters is the pattern: at least one failure occurred, the list
  // keeps the initialData rows (bug 73 pattern — failure must not wipe
  // previously shown data), and retry eventually recovers.
  await expect(stage.getByText('state:failed')).toBeVisible({ timeout: 10_000 });
  const list = stage.locator('[data-testid="c4c3-flaky-list"]');
  await expect(list.getByText('InitialUser')).toBeVisible({ timeout: 5_000 });

  // Retry until recovery (bounded loop — StrictMode consumed failures vary).
  const retry = stage.getByRole('button', { name: 'Retry load' });
  let recovered = false;
  for (let attempt = 0; attempt < 5 && !recovered; attempt += 1) {
    await retry.click();
    const ok = stage.getByText('state:ok');
    try {
      await ok.waitFor({ state: 'visible', timeout: 5_000 });
      recovered = true;
    } catch {
      // Still failing — keep the retained-data invariant in place.
      await expect(list.getByText('InitialUser')).toBeVisible({ timeout: 5_000 });
    }
  }
  expect(recovered).toBe(true);
  await expect(list.getByText('FlakyRecovered')).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('tree-host: search filters, auto-expands ancestors, highlights, and clears (host-tree-search)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tree');

  const slug = scenarioSlug('Host tree search filters and auto-expands ancestors (C4.3 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const tree = stage.locator('[data-testid="c4c3-tree"]');
  await expect(tree).toBeVisible({ timeout: 10_000 });

  // Initially collapsed: Engineering children hidden.
  await expect(tree.locator('[role="treeitem"]', { hasText: 'Engineering' })).toBeVisible();

  // Search "Backend": the node becomes visible, its ancestors auto-expand,
  // non-matching siblings stay hidden.
  const searchInput = tree.locator('[data-slot="tree-search-input"]');
  await searchInput.fill('Backend');
  await expect(tree.locator('[role="treeitem"]', { hasText: 'Backend' })).toBeVisible({
    timeout: 10_000,
  });
  await expect(tree.locator('[role="treeitem"]', { hasText: 'Frontend' })).toHaveCount(0);
  await expect(tree.locator('[data-slot="tree-search-highlight"]')).toHaveCount(1);

  // Clearing the search restores the full tree in its previous expand state.
  await searchInput.fill('');
  await expect(tree.locator('[role="treeitem"]', { hasText: 'Frontend' })).toHaveCount(0);
  await expect(tree.locator('[role="treeitem"]', { hasText: 'Engineering' })).toBeVisible();

  await assertTrackedPageErrors(page);
});

test('pagination-host: pagination drives the controlled list data flow (host-pagination)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('pagination');

  const slug = scenarioSlug('Host pagination drives a list data flow (C4.3 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const pager = stage.locator('[data-testid="c4c3-pager"]');
  await expect(pager).toBeVisible({ timeout: 10_000 });
  await expect(pager).toHaveAttribute('data-current-page', '1');

  const list = stage.locator('[data-testid="c4c3-paged-list"]');
  await expect(list).toBeVisible({ timeout: 10_000 });
  await expect(list).toHaveAttribute('data-current-page', '1');
  await expect(list.getByText('Record 1')).toBeVisible({ timeout: 5_000 });
  await expect(list.getByText('Record 2')).toBeVisible({ timeout: 5_000 });

  // Page 2 → statusPath publication re-slices the controlled list.
  await pager.locator('[data-page="2"]').click();
  await expect(pager).toHaveAttribute('data-current-page', '2');
  await expect(list).toHaveAttribute('data-current-page', '2');
  await expect(list.getByText('Record 3')).toBeVisible({ timeout: 10_000 });
  await expect(list.getByText('Record 4')).toBeVisible({ timeout: 5_000 });
  await expect(list.getByText('Record 1')).toHaveCount(0);

  // Back to page 1.
  await pager.locator('[data-page="1"]').click();
  await expect(list).toHaveAttribute('data-current-page', '1');
  await expect(list.getByText('Record 1')).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('chart-host: data flow swaps in-place and clears to the empty state (host-chart)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('chart');

  const slug = scenarioSlug('Host chart data flow and empty state (C4.3 Phase 3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const chart = stage.locator('[data-testid="c4c3-chart"]');
  await expect(chart).toBeVisible({ timeout: 10_000 });

  // sr-only data equivalent exposes the rendered series for programmatic assert.
  const dataEquivalent = chart.locator('[data-slot="chart-data-equivalent"]');
  await expect(dataEquivalent).toContainText('Alpha: Value: 1', { timeout: 10_000 });
  await expect(dataEquivalent).toContainText('Beta: Value: 2');

  // In-place data swap (no remount of the canvas host node).
  await stage.getByRole('button', { name: 'Update data' }).click();
  await expect(dataEquivalent).toContainText('Gamma: Value: 7', { timeout: 10_000 });
  await expect(dataEquivalent).toContainText('Delta: Value: 9');
  await expect(chart.locator('[data-slot="chart-canvas"]')).toHaveCount(1);

  // Clearing the data swaps to the explicit empty state.
  await stage.getByRole('button', { name: 'Clear data' }).click();
  await expect(chart.locator('[data-slot="chart-empty"]')).toBeVisible({ timeout: 10_000 });
  await expect(chart.locator('[data-slot="chart-canvas"]')).toHaveCount(0);

  await assertTrackedPageErrors(page);
});
