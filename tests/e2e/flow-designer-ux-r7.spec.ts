import { expect, test } from './fixtures.js';

/**
 * ux-r7 Phase 1 程序化断言（FD-1/FD-2）：
 * - fd1-minimap-fill：浅色主题 minimap 节点 computed style.fill 为可读非近黑值；
 * - fd2-selected-highlight：点击选中后节点卡片（nop-glass-card）出现可辨识描边/光晕。
 * 断言面 = computed style（截图仅旁证，不入判据）。
 */

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/#/flow-designer');
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15_000 });
}

test('fd1-minimap-fill: minimap node fill is readable (not near-black) in light mode', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const fills = await page.evaluate(() => {
    const minimap = document.querySelector('.react-flow__minimap');
    if (!minimap) return { error: 'minimap missing' };
    const rects = [...minimap.querySelectorAll('svg rect')];
    // 断言面 = computed fill（内联可能为 var() 原始串，须取解析值）
    const nodeRects = rects
      .map((rect) => getComputedStyle(rect).fill)
      .filter((fill) => fill && fill !== 'none');
    return { count: nodeRects.length, fills: nodeRects.slice(0, 6) };
  });

  expect(nodeCountOk(fills)).toBe(true);
  const list = (fills as { fills: string[] }).fills;
  expect(list.length).toBeGreaterThan(0);
  for (const fill of list) {
    // 近黑判定：解析 rgb 通道，亮度阈值排除 rgba(15,23,42,*) 系近黑块
    const channels = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    expect(channels, `fill=${fill}`).toBeTruthy();
    const [, r, g, b] = channels!;
    const luminance = 0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b);
    expect(luminance, `fill=${fill} too dark`).toBeGreaterThan(60);
  }
});

function nodeCountOk(fills: unknown): boolean {
  return typeof fills === 'object' && fills !== null && 'count' in fills;
}

test('fd2-selected-highlight: clicking a node gives the glass card a visible selected outline', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const node = page.locator('.react-flow__node').first();
  await node.click();

  const state = await page.evaluate(() => {
    const selectedCard = document.querySelector<HTMLElement>(
      '.nop-designer-node[data-selected] [data-slot="designer-node-body"] .nop-glass-card',
    );
    if (!selectedCard) return { error: 'selected glass card not found' } as Record<string, string>;
    const unselectedCard = document.querySelector<HTMLElement>(
      '.nop-designer-node:not([data-selected]) [data-slot="designer-node-body"] .nop-glass-card',
    );
    const cs = getComputedStyle(selectedCard);
    const baseline = unselectedCard ? getComputedStyle(unselectedCard) : null;
    return {
      borderColor: cs.borderColor,
      boxShadow: cs.boxShadow,
      baselineBorderColor: baseline?.borderColor ?? '',
      baselineBoxShadow: baseline?.boxShadow ?? '',
    };
  });

  expect('error' in state ? state.error : '').toBe('');
  const card = state as {
    borderColor: string;
    boxShadow: string;
    baselineBorderColor: string;
    baselineBoxShadow: string;
  };
  // 选中卡的描边或光晕必须与未选中基线有可观测差异（死选择器时两者相同）
  const borderDiffers = card.borderColor !== card.baselineBorderColor;
  const shadowDiffers =
    card.boxShadow !== card.baselineBoxShadow && card.boxShadow !== 'none' && card.boxShadow.length > 8;
  expect(borderDiffers || shadowDiffers, JSON.stringify(card)).toBe(true);
});

test('fd3-tabs-no-overlay: example tabs sit in the header flow, no pixel overlap with the toolbar', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const overlap = await page.evaluate(() => {
    const tabs = document.querySelector('[role="tablist"]')?.closest('.flex');
    const toolbar = document.querySelector('[data-testid="designer-toolbar"]');
    if (!tabs || !toolbar) return { error: 'tabs or toolbar missing' };
    const a = tabs.getBoundingClientRect();
    const b = toolbar.getBoundingClientRect();
    const intersects =
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return { intersects, tabsTop: a.top, toolbarTop: b.top };
  });

  expect('error' in overlap ? overlap.error : '').toBe('');
  expect(
    (overlap as { intersects: boolean }).intersects,
    JSON.stringify(overlap),
  ).toBe(false);
});

test('fd4-edge-label-contrast: edge label text >= 4.5 contrast on its label background', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const result = await page.evaluate(() => {
    const luminanceOf = (rgbStr: string): number => {
      const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return 255;
      return 0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]);
    };
    const contrastRatio = (l1: number, l2: number): number => {
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (hi + 0.05) / (lo + 0.05);
    };
    const labels = [...document.querySelectorAll<HTMLElement>('.fd-edge-label')];
    if (labels.length === 0) return { error: 'no edge labels rendered' };
    const label = labels[0];
    const cs = getComputedStyle(label);
    // 底色：token --fd-edge-label-bg（fallback --surface-highlight）
    const bgVar = cs.getPropertyValue('--fd-edge-label-bg').trim();
    const bgResolve = bgVar.match(/rgba?\(([^)]+)\)/);
    if (!bgResolve) return { error: `bg unparseable: ${bgVar}` };
    const bgChannels = bgResolve[1].split(',').slice(0, 3);
    const fg = cs.color;
    return {
      color: fg,
      bg: bgVar,
      contrast: contrastRatio(
        luminanceOf(fg),
        luminanceOf(`rgb(${bgChannels.join(',')})`),
      ),
    };
  });

  expect('error' in result ? result.error : '').toBe('');
  const r = result as { contrast: number; fontWeight: string };
  expect(r.contrast, `contrast=${r.contrast}`).toBeGreaterThanOrEqual(4.5);
});

test('fd2b-node-toolbar-clearance: toolbar does not intersect any other node in the reference layout', async ({
  page,
}) => {
  await openFlowDesigner(page);

  const nodes = page.locator('.react-flow__node');
  const count = await nodes.count();
  expect(count).toBeGreaterThan(2);

  const violations: Array<{ node: string; overlap: number }> = [];
  for (let i = 0; i < count; i += 1) {
    await nodes.nth(i).click({ force: true });
    await page.waitForTimeout(120);
    const result = await page.evaluate((index) => {
      const all = [...document.querySelectorAll<HTMLElement>('.react-flow__node')];
      const selected = all[index];
      if (!selected || !selected.classList.contains('selected')) return null;
      const toolbar = selected.querySelector<HTMLElement>('[data-slot="designer-node-toolbar"]');
      if (!toolbar) return { skip: true };
      const tb = toolbar.getBoundingClientRect();
      const overlaps: Array<{ id: string; px: number }> = [];
      for (const [j, other] of all.entries()) {
        if (j === index) continue;
        const r = other.getBoundingClientRect();
        const px =
          Math.min(tb.right, r.right) -
          Math.max(tb.left, r.left);
        const py = Math.min(tb.bottom, r.bottom) - Math.max(tb.top, r.top);
        if (px > 0 && py > 0) overlaps.push({ id: other.getAttribute('data-id') ?? String(j), px: Math.round(px * py) });
      }
      return { overlaps };
    }, i);
    if (result && !('skip' in result)) {
      for (const v of result.overlaps) violations.push(v);
    }
  }

  expect(violations, JSON.stringify(violations)).toEqual([]);
});

test('fd5-action-tree: terminal node renders as a card with identity color; params carry field labels', async ({
  page,
}) => {
  await page.goto('/#/flow-designer');
  await expect(page.locator('.react-flow__node')).toHaveCount(6, { timeout: 15_000 });
  await page.getByRole('tab', { name: /Action/ }).click();
  await page.waitForTimeout(2500);

  const report = await page.evaluate(() => {
    const end = document.querySelector<HTMLElement>(
      '[data-slot="af-node"][data-node-variant="end"]',
    );
    if (!end) return { error: 'end node card missing' };
    const cs = getComputedStyle(end);
    const header = end.querySelector<HTMLElement>('[data-slot="af-node-header"]');
    const metas = [...document.querySelectorAll<HTMLElement>('[data-slot="af-node-meta"]')].map(
      (el) => el.textContent ?? '',
    );
    return {
      cardBg: cs.backgroundColor,
      borderColor: cs.borderColor,
      headerBg: header ? getComputedStyle(header).backgroundColor : null,
      labeledMetas: metas.filter((text) => /^(when|timeout):/.test(text.trim())),
      bareMetas: metas.filter((text) => !/^(when|timeout):/.test(text.trim()) && text.trim().length > 0),
    };
  });

  expect('error' in report ? report.error : '').toBe('');
  const r = report as {
    cardBg: string;
    borderColor: string;
    headerBg: string | null;
    labeledMetas: string[];
    bareMetas: string[];
  };
  // 结束节点卡片化：非透明卡面 + 终结红 header
  expect(r.cardBg).not.toBe('rgba(0, 0, 0, 0)');
  expect(r.headerBg).toBe('rgb(239, 68, 68)');
  // 参数带字段名标注（无裸值）
  expect(r.labeledMetas.length).toBeGreaterThan(0);
  expect(r.bareMetas).toEqual([]);
});

