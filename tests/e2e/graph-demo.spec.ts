import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

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

  test('semantic-level border tokens: danger/warning/success computed styles in light and dark (plan 482 R2/A5)', async ({
    page,
  }) => {
    await openGraphDemo(page);
    const graph = traceGraph(page);
    await expect(graph.locator('[data-slot="graph-node"]')).toHaveCount(6, { timeout: 15_000 });

    // 探针元素按 R2 契约表达式取色：节点边框必须与 `hsl(var(--token) / 0.55)` 解析值一致
    // （token 通道身份；旧字面 hsl(32 95% 44%) / hsl(142 71% 45%) 与 token 值不同，会被此断言钉住）
    const probeTokenColor = (token: string) =>
      page.evaluate((tok) => {
        const el = document.createElement('span');
        document.body.appendChild(el);
        el.style.color = `hsl(var(${tok}) / 0.55)`;
        const resolved = getComputedStyle(el).color;
        el.remove();
        return resolved;
      }, token);
    const tokenOf = { danger: '--destructive', warning: '--warning', success: '--success' } as const;
    const levels = ['danger', 'warning', 'success'] as const;

    const borderOf = (level: string) =>
      getComputedStyleValue(
        graph.locator(`[data-slot="graph-node"][data-level="${level}"]`),
        'border-top-color',
      );

    for (const level of levels) {
      expect(await borderOf(level)).toBe(await probeTokenColor(tokenOf[level]));
    }
    // 三态语义边框色彼此不同
    const lightBorders: string[] = [];
    for (const level of levels) lightBorders.push(await borderOf(level));
    expect(new Set(lightBorders).size).toBe(3);

    // light → dark 双态：token 通道在 dark 下仍按当班主题块解析。
    // 注意 .nop-graph-node 带 border-color .15s transition——断言前等待过渡收敛。
    await page.getByLabel('模式').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    for (const level of levels) {
      await expect
        .poll(() => borderOf(level), { message: `${level} border settles on the dark token` })
        .toBe(await probeTokenColor(tokenOf[level]));
    }

    // classic 的 dark 块与 light 同族不同值（token 数据事实）；glass 主题块三 token 值不同，
    // 切主题后边框计算样式必须真实变化（主题跟随性，非烘焙色）
    await page.getByLabel('主题').selectOption('glass');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'glass');
    let warningGlass = '';
    await expect
      .poll(async () => {
        warningGlass = await borderOf('warning');
        return warningGlass;
      }, { message: 'warning border settles on the glass token' })
      .toBe(await probeTokenColor('--warning'));
    expect(warningGlass).not.toBe(lightBorders[1]);

    await assertTrackedPageErrors(page);
  });
});
