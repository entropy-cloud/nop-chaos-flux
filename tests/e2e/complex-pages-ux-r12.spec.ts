import { expect, test } from './fixtures.js';

/**
 * ux-r12 Phase 2 复杂页面程序化断言（cp1-cp7，源自 26 页 sweep + 复审）。
 * 全部 DOM/boundingBox 判据；截图仅旁证。
 */

async function openComplexPage(page: import('@playwright/test').Page, id: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/#/complex-pages/${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
}

test('cp1-linear-fill: linear content panes fill the flex row (6 pages)', async ({ page }) => {
  for (const id of ['linear-board', 'linear-inbox', 'linear-projects', 'linear-detail', 'linear-issues', 'linear-settings']) {
    await page.goto('about:blank');
    await openComplexPage(page, id);
    const probe = await page.evaluate(() => {
      // 主行 = min-h-screen 的 nop-container。分母锚定行宽（修复后 container-body
      // 即 flex 行；塌缩态下行宽远大于内容，ratio 必然 < 0.9 → 不会假绿）
      const row = [...document.querySelectorAll('.nop-container')].find((el) =>
        /min-h-screen/.test(el.className ?? ''),
      );
      if (!row) return { err: 'row missing' };
      const rowW = row.getBoundingClientRect().width;
      const body = row.querySelector('[data-slot="container-body"]') ?? row;
      const kids = [...body.children];
      const flexible = kids.find((el) => /flex-1/.test(el.className ?? ''));
      const fixedW = kids
        .filter((el) => el !== flexible)
        .reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
      const contentW = flexible ? flexible.getBoundingClientRect().width : 0;
      const remaining = rowW - fixedW;
      const hit = document.elementFromPoint(
        Math.min(1360, Math.round((flexible?.getBoundingClientRect().right ?? 800) - 60)),
        400,
      );
      return {
        rowW: Math.round(rowW),
        fixedW: Math.round(fixedW),
        contentW: Math.round(contentW),
        flexibleFound: Boolean(flexible),
        ratio: remaining > 0 ? Number((contentW / remaining).toFixed(2)) : 0,
        hitIsShell: (hit?.className ?? '').toString().includes('min-h-screen'),
      };
    });
    expect(probe.err, `${id}: row present`).toBeUndefined();
    expect(probe.flexibleFound, `${id}: a flex-1 content pane must be a direct flex child`).toBe(true);
    expect(
      probe.ratio,
      `${id}: content width ${probe.contentW}px vs row remaining ${probe.rowW - probe.fixedW}px (ratio ${probe.ratio})`,
    ).toBeGreaterThanOrEqual(0.9);
    expect(probe.hitIsShell, `${id}: elementFromPoint should hit pane content, not the shell`).toBe(false);
  }
});

test('cp2-launcher-clear: debugger launcher does not overlap showcase sidebar items', async ({
  page,
}) => {
  await openComplexPage(page, 'antdpro-list');
  const boxes = await page.evaluate(() => {
    const launcher = document.querySelector('.ndbg-launcher-icon, .ndbg-launcher-label');
    const nav = document.querySelector('[data-testid="complex-pages-nav"]');
    const navRect = nav?.getBoundingClientRect();
    const navButtons = [...document.querySelectorAll('aside button, nav button')].filter(
      (el) => (el.className + '').includes('justify-start') || el.textContent?.includes('AntD Pro'),
    );
    const lr = launcher?.getBoundingClientRect();
    return {
      launcher: lr ? { x: lr.x, y: lr.y, w: lr.width, h: lr.height } : null,
      overlaps: navButtons.filter((el) => {
        if (!lr || !navRect) return false;
        const r = el.getBoundingClientRect();
        // 条目 rect 先裁到 nav 可视窗（overflow 裁剪后的可见部分），
        // 再判是否进入 launcher 带——部分滚出可视窗的条目不构成视觉碰撞
        const visibleTop = Math.max(r.y, navRect.top);
        const visibleBottom = Math.min(r.y + r.height, navRect.bottom);
        if (visibleBottom <= visibleTop) return false;
        return !(visibleBottom <= lr.y || lr.y + lr.height <= visibleTop);
      }).length,
    };
  });
  expect(boxes.launcher).toBeTruthy();
  expect(boxes.overlaps, 'no sidebar item shares a vertical band with the launcher').toBe(0);
});

test('cp3-pie-legend: antdpro pie legend names the channels, not the series', async ({ page }) => {
  await openComplexPage(page, 'antdpro-dashboard');
  const legendTexts = await page.evaluate(() => {
    // 渠道占比卡片（testid 圈定，防匹配到含双图的外层包装）内的文本节点；
    // legend 为 svg text 渲染，body.innerText 不可达
    const card = document.querySelector('[data-testid="antdpro-dashboard-channel-card"]');
    if (!card) return { err: 'pie card missing' };
    const texts = [...card.querySelectorAll('svg text, span')]
      .map((t) => (t.textContent ?? '').trim())
      .filter(Boolean);
    return { texts };
  });
  expect(legendTexts.err).toBeUndefined();
  const joined = (legendTexts.texts ?? []).join('|');
  expect(joined, `pie legend texts: ${joined}`).toContain('官网');
  expect(joined).toContain('小程序');
  expect(joined).toContain('门店');
  expect(joined).toContain('App');
  expect(joined, 'legend must not repeat the series name per slice').not.toMatch(/订单数.*订单数/);
});

test('cp4-list-columns: order-time column does not collide with the actions column', async ({
  page,
}) => {
  await openComplexPage(page, 'antdpro-list');
  const collision = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr')].slice(0, 8);
    let hits = 0;
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td, th')];
      for (let i = 0; i < cells.length - 1; i += 1) {
        const a = cells[i].getBoundingClientRect();
        const b = cells[i + 1].getBoundingClientRect();
        if (a.width > 0 && b.width > 0 && a.right > b.left + 1) hits += 1;
      }
    }
    return hits;
  });
  expect(collision, 'no adjacent-cell box collisions in the list table').toBe(0);
});

test('cp5-result-banner: icon badge is a compact circle and the title renders beside the flow', async ({
  page,
}) => {
  await openComplexPage(page, 'antdpro-result');
  const state = await page.evaluate(() => {
    // 绿底元素（#f6ffed 系）必须为紧凑圆形徽标（≤140px），不得拉满卡片宽成空绿条
    const greens = [...document.querySelectorAll('div')]
      .filter((el) => getComputedStyle(el).backgroundColor === 'rgb(246, 255, 237)')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
    const titleVisible = [
      ...document.querySelectorAll('[data-testid="antdpro-result-success-title"]'),
    ].some((el) => (el.textContent ?? '').includes('订单提交成功') && el.getBoundingClientRect().height > 0);
    return { greens, titleVisible };
  });
  expect(
    state.greens.every((g) => g.w <= 140),
    `green badge must be compact, got ${JSON.stringify(state.greens)}`,
  ).toBe(true);
  expect(state.greens.length, 'icon badge present').toBeGreaterThanOrEqual(1);
  expect(state.titleVisible, 'success title visible').toBe(true);
});

test('cp6-cal-booking: month grid renders full weeks for the displayed month', async ({ page }) => {
  await openComplexPage(page, 'cal-booking');
  const state = await page.evaluate(() => {
    // 网格以 role=gridcell + data-date 呈现（组件行结构为 display:contents，role=row 仅表头一条）
    const dayCells = document.querySelectorAll('[role="gridcell"][data-date], [data-slot="calendar-cell"][data-date]').length;
    const septemberCells = document.querySelectorAll('[data-date^="2026-09"]').length;
    const skeletons = document.querySelectorAll('.cal-skeleton').length;
    const selectedDate = [...document.querySelectorAll('[data-testid="cal-booking-selected-date"]')]
      .map((el) => (el.textContent ?? '').trim())
      .join('');
    return { dayCells, septemberCells, skeletons, selectedDate };
  });
  expect(state.dayCells, `month grid cells=${state.dayCells} should render ≥28 day cells`).toBeGreaterThanOrEqual(28);
  expect(state.septemberCells, 'displayed month must contain the selected date month (September)').toBeGreaterThanOrEqual(28);
  expect(state.skeletons, 'loading skeleton must hide after slots arrive').toBe(0);
  expect(state.selectedDate, 'selected date panel shows the anchored slot date').toContain('9月3日');
});

test('cp7-notion-table: page-size select has options and table fits its container', async ({
  page,
}) => {
  await openComplexPage(page, 'notion-database');
  const state = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')].map((el) => ({
      value: el.value,
      options: el.options.length,
    }));
    // 宽表合法形态 = 横向可滚（overflow-x:auto 容器）；不可滚的越界裁切才算缺陷
    const scrollWrap = [...document.querySelectorAll('div')].find((el) => {
      const cs = getComputedStyle(el);
      return cs.overflowX === 'auto' && el.querySelector('table') && el.scrollWidth >= el.clientWidth;
    });
    return {
      pageSizeSelects: selects.filter((s2) => s2.options > 0).length,
      emptySelects: selects.filter((s2) => s2.options === 0).length,
      scrollable: Boolean(scrollWrap),
    };
  });
  expect(state.emptySelects, 'no empty option-less selects').toBe(0);
  expect(state.pageSizeSelects, 'page-size select present with options').toBeGreaterThanOrEqual(1);
  expect(state.scrollable, 'wide table has a horizontal scroll affordance').toBe(true);
});
