import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openGraphDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/graph-demo', { waitUntil: 'commit' });
  await expect(page.getByRole('heading', { name: 'Graph Viewer Demo' })).toBeVisible({
    timeout: 15_000,
  });
}

function traceGraph(page: import('@playwright/test').Page) {
  return page.locator('[data-slot="graph"]').first();
}

test.describe('Graph Viewer Demo', () => {
  test('renders the hierarchy trace graph with all nodes', async ({ page }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    await expect(graph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 15_000 });
    await expect(graph).toHaveAttribute('data-layout', 'hierarchy');
    await assertTrackedPageErrors(page);
  });

  test('single-select model: clicking a node selects only that node and pane click deselects', async ({
    page,
  }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    await expect(graph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 15_000 });

    const errorNode = graph.locator('[data-slot="graph-node"][data-level="danger"]');
    await expect(errorNode).toHaveCount(1, { timeout: 10_000 });

    await errorNode.click();
    await expect(errorNode).toHaveAttribute('data-selected', 'true');
    await expect(graph.locator('[data-slot="graph-node"][data-selected="true"]')).toHaveCount(1);

    await graph.locator('.react-flow__pane').first().click({ position: { x: 60, y: 150 } });
    await expect(graph.locator('[data-slot="graph-node"][data-selected="true"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('search input highlights matching nodes and cycles via Enter', async ({ page }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    const input = graph.locator('[data-slot="graph-search-input"]');
    await input.fill('call');
    await expect(graph).toHaveAttribute('data-state', 'searching');
    const matching = graph.locator('[data-slot="graph-node"][data-matching="true"]');
    await expect(matching).toHaveCount(5, { timeout: 10_000 });
    await expect(graph.locator('[data-slot="graph-search-result"]')).toHaveText(/\/5/);
    await input.press('Enter');
    await expect(graph.locator('[data-slot="graph-node"][data-selected="true"]')).toHaveCount(1);
    await assertTrackedPageErrors(page);
  });

  test('component:focusNode handle locates a known node and falls back to fitView for unknown', async ({
    page,
  }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    await expect(graph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 15_000 });

    await page.getByRole('button', { name: 'Focus Error Node' }).click();
    await expect(
      graph.locator('[data-slot="graph-node"][data-selected="true"]'),
    ).toHaveCount(1);
    const selectedLabel = await graph
      .locator('[data-slot="graph-node"][data-selected="true"] [data-slot="graph-node-label"], [data-slot="graph-node"][data-selected="true"] .text-sm')
      .first()
      .textContent();
    expect(selectedLabel).toContain('API Call');

    await page.getByRole('button', { name: 'Focus Missing Node' }).click();
    // node-not-found 回退 fitView 全图，不抛异常、不改写选中态（design §8.2）
    await expect(graph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 10_000 });
    await expect(graph.locator('[data-slot="graph-node"][data-selected="true"]')).toHaveCount(1);
    await assertTrackedPageErrors(page);
  });

  test('component:setLayout handle switches layout mode at runtime', async ({ page }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    await expect(graph).toHaveAttribute('data-layout', 'hierarchy', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Set Flow Layout' }).click();
    await expect(graph).toHaveAttribute('data-layout', 'flow');

    await page.getByRole('button', { name: 'Set Hierarchy Layout' }).click();
    await expect(graph).toHaveAttribute('data-layout', 'hierarchy');
    await assertTrackedPageErrors(page);
  });

  test('component:search handle highlights matches without the built-in box', async ({ page }) => {
    await openGraphDemo(page);
    const flowGraph = page.locator('[data-slot="graph"]').nth(1);
    await expect(flowGraph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 15_000 });
    // flow card has searchable:false → no built-in search box
    await expect(flowGraph.locator('[data-slot="graph-search-input"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Search "call"' }).click();
    await expect(
      traceGraph(page).locator('[data-slot="graph-node"][data-matching="true"]'),
    ).toHaveCount(5, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('malformed data: dangling edges are skipped, render never throws', async ({ page }) => {
    await openGraphDemo(page);
    const malformedGraph = page.locator('[data-slot="graph"]').nth(2);
    await expect(malformedGraph.locator('[data-slot="graph-node"]')).toHaveCount(1, {
      timeout: 15_000,
    });
    const nodeLabel = await malformedGraph
      .locator('[data-slot="graph-node-label"]')
      .first()
      .textContent();
    expect(nodeLabel).toBe('Alive');
    await assertTrackedPageErrors(page);
  });

  test('empty data renders the empty slot', async ({ page }) => {
    await openGraphDemo(page);
    const emptyGraph = page.locator('[data-slot="graph"]').nth(3);
    await expect(emptyGraph.locator('[data-slot="graph-empty"]')).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });
});
