import { expect, test } from './fixtures.js';

/**
 * ux-r12 TaskFlow Tree 编辑交互程序化断言。
 * tft1 插入节点带类型相关默认名（画布可见）；tft2 选择条在视口内且不遮标题；
 * tft6 graph 视图初始缩放可读。
 * 基线红证据：browser-use 实机走查（空标签节点 DOM textContent=''、弹层盖标题、
 * + 偏离连线 ~25px、graph zoom ~0.5x）+ dingflow 单测红（defaults 合并 3 失败、
 * overlays 坐标钉 3 失败）——e2e 修复后落地为守护钉。
 */

async function openTaskFlowTree(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/taskflow-designer', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'TaskFlow (Tree)' }).click({ timeout: 20_000 });
  await page.waitForTimeout(2000);
}

test('tft1-insert-label: newly inserted tree nodes render a type-derived label', async ({
  page,
}) => {
  await openTaskFlowTree(page);

  const before = await page.locator('.react-flow__node').count();
  // 点第一个 +（Entry 与 initSequence 之间）
  const plus = page.locator('button[aria-label*="添加节点"], button[aria-label*="Add"]').first();
  await plus.click();
  // 选择条中点 Delay
  const delay = page
    .locator('[aria-label="Add node"] >> text=Delay')
    .or(page.getByText('Delay', { exact: true }).first());
  await delay.click({ timeout: 10_000 });
  await page.waitForTimeout(1200);

  const after = await page.locator('.react-flow__node').count();
  expect(after, 'a node was inserted').toBe(before + 1);

  // 新节点有可见标签且非硬编码 CC
  const labels = await page.locator('.react-flow__node').allTextContents();
  const newLabels = labels.filter((t) => t.trim().length > 0 && !t.includes('initSequence'));
  expect(
    newLabels.some((t) => /delay/i.test(t)),
    `inserted node should carry a delay-derived label; labels=${JSON.stringify(labels)}`,
  ).toBe(true);
  expect(newLabels.join('|'), 'no generic CC fallback label').not.toContain('CC');
});

test('tft2-menu-anchor: add-node menu opens below the + and stays inside the viewport', async ({
  page,
}) => {
  await openTaskFlowTree(page);

  const plus = page.locator('button[aria-label*="添加节点"], button[aria-label*="Add"]').first();
  const plusBox = await plus.boundingBox();
  expect(plusBox).toBeTruthy();
  await plus.click();
  await page.waitForTimeout(800);

  const menu = page.locator('[aria-label="Add node"]');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  const menuBox = await menu.boundingBox();
  expect(menuBox).toBeTruthy();
  // 弹层完整在视口内（不截断 Choose 项）
  expect(menuBox!.x, 'menu left edge inside viewport').toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width, 'menu right edge inside viewport').toBeLessThanOrEqual(1441);
  // 不遮页面标题（标题带 y < 64；弹层应从 + 下方展开）
  expect(menuBox!.y, 'menu opens below the header band').toBeGreaterThanOrEqual(64);
  // 在 + 下方（side=bottom）
  expect(menuBox!.y, 'menu below the clicked +').toBeGreaterThanOrEqual(plusBox!.y);
});

test('tft6-fitview-zoom: graph view initial zoom keeps node labels readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/taskflow-designer', { waitUntil: 'domcontentloaded' });
  // 默认即 Graph 视图
  await page.waitForSelector('.react-flow__node', { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const zoom = await page.evaluate(() => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    const transform = viewport?.style.transform ?? '';
    const match = transform.match(/scale\(([\d.]+)\)/);
    return match ? Number.parseFloat(match[1]) : 1;
  });
  // 0.6 = 布局真实 fit 底线（7 节点横向链比画布宽 ~1.6x，true-fit ≈ 0.68；
  // 修复前的竞态按布局前散布边界算出 ~0.5x）——阈值钉住"不再按错误边界缩小"。
  expect(zoom, `graph initial zoom ${zoom} should keep labels readable`).toBeGreaterThanOrEqual(0.6);
});
