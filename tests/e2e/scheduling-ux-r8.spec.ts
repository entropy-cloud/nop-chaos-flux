import { expect, test } from './fixtures.js';

/**
 * ux-r8 排程视口程序化断言（GT-1/GT-2/CA-1/CA-2/KB-1）。
 * 断言面 = DOM/boundingBox/computed（截图仅旁证）。
 */

test.describe.configure({ mode: 'serial' });

test('gt1-today-centered: gantt opens with the today marker inside the visible viewport', async ({
  page,
}) => {
  await page.goto('/#/gantt', { waitUntil: 'domcontentloaded' });
  const todayLine = page.locator('[data-slot="gantt-today"]');
  await expect(todayLine).toBeVisible({ timeout: 20_000 });
  // 平滑滚动就绪等待（gantt.css scroll-behavior: smooth）
  await page.waitForTimeout(900);

  const inView = await page.evaluate(() => {
    const marker = document.querySelector('[data-slot="gantt-today"]');
    const timeline = marker?.closest('.overflow-auto') as HTMLElement | null;
    if (!marker || !timeline) return { error: 'marker or timeline missing' };
    const m = marker.getBoundingClientRect();
    const t = timeline.getBoundingClientRect();
    return { inside: m.left >= t.left - 2 && m.right <= t.right + 2, markerLeft: m.left, tlLeft: t.left, tlRight: t.right };
  });
  expect('error' in inView ? inView.error : '').toBe('');
  expect((inView as { inside: boolean }).inside, JSON.stringify(inView)).toBe(true);
});

test('gt2-project-critical-exempt: project bars never carry the critical strip', async ({ page }) => {
  await page.goto('/#/gantt', { waitUntil: 'domcontentloaded' });
  const projectBars = page.locator('[data-bar-type="project"]');
  await expect(projectBars.first()).toBeVisible({ timeout: 20_000 });

  const criticalProjects = await page.locator('[data-bar-type="project"][data-critical]').count();
  expect(criticalProjects, 'baseline Beta carried data-critical (red strip on summary)').toBe(0);

  // 关键路径语义保留在 CPM 锚点上（本 demo 拓扑中唯一零浮动节点为 Beta project，
  // 子任务链有正浮动）——渲染豁免仅作用于 project 条的条带绘制，CPM 语义由
  // gantt-cpm-exemption 单测钉住（e2e 无法触达 store）。
  const totalCritical = await page.locator('[data-critical]').count();
  expect(totalCritical, 'exempted demo shows no critical strip anywhere').toBe(0);
});

test('ca1-current-month: calendar opens on the current month with Chinese weekday headers', async ({
  page,
}) => {
  await page.goto('/#/scheduling-calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const state = await page.evaluate(() => {
    const now = new Date();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const expectMonth = `${now.getFullYear()}年${monthNames[now.getMonth()]}`;
    const bodyAll = document.body.textContent ?? '';
    const zhHeaders = ['周一', '周二', '周三', '周四', '周五', '周六'].filter((d) => bodyAll.includes(d));
    return { expectMonth, hasCurrentMonth: bodyAll.includes(expectMonth), zhHeaderCount: zhHeaders.length };
  });

  expect(state.hasCurrentMonth, `expected month ${state.expectMonth}`).toBe(true);
  expect(state.zhHeaderCount).toBeGreaterThanOrEqual(4);

  // ca2-grid-fill：日历根底部抵达视口底部（高度链闭合）
  const gridFill = await page.evaluate(() => {
    const grid = document.querySelector('.nop-calendar') as HTMLElement | null;
    return {
      bottom: grid ? Math.round(grid.getBoundingClientRect().bottom) : null,
      viewportH: window.innerHeight,
    };
  });
  expect(gridFill.bottom).not.toBeNull();
  expect(Math.abs((gridFill.bottom ?? 0) - gridFill.viewportH)).toBeLessThanOrEqual(6);
});

test('kb1-board-fills-viewport: kanban board bottom reaches the viewport bottom', async ({
  page,
}) => {
  await page.goto('/#/kanban', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const metrics = await page.evaluate(() => {
    const board = document.querySelector('.nop-kanban');
    const card = document.querySelector('[data-slot*="kanban-card"], .nop-kanban-card');
    return {
      boardBottom: board ? Math.round(board.getBoundingClientRect().bottom) : null,
      viewportH: window.innerHeight,
      hasCards: Boolean(card),
      cardText: card?.textContent?.slice(0, 80),
    };
  });

  expect(metrics.boardBottom).not.toBeNull();
  expect(Math.abs((metrics.boardBottom ?? 0) - metrics.viewportH)).toBeLessThanOrEqual(2);
  expect(metrics.hasCards).toBe(true);
});
