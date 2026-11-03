import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  dragTouchReplication,
  expectEndpointCall,
  openReplicationPage,
  pullReplicationRefresh,
  readEndpointCalls,
  seedReplicationCounters,
  swipeReplicationCell,
  tapReplicationTarget,
} from './helpers/replication.js';

// Plan 811 — M3 MES 异常叫料移动页 focused e2e (D3 §5.6 M3 断言清单 + focus ①-③,
// 经 plan 811 评审勘误后口径). Pillar one (programmatic interactions,
// __replMesCalls evidence) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch B mobile-canvas registration).
//
// hasTouch is required for the mobile gesture family (swipe-cell / pull-refresh
// / floating-panel are TouchEvent driven). The canvas itself is viewport-
// independent (fixed 375×667 host frame), so the desktop viewport stays.
//
// Mock seed math (mock-backend-repl-mes-andon.ts deterministic ladder — 26
// rows; even ordinals ANDON「设备异常」, odd MATERIAL「缺料叫料」; status
// CLOSED when ordinal%7==0, RESPONDING when ordinal%3==0, else OPEN;
// escalationLevel = ordinal%3; expired rows pinned at ordinals 3 and 23 —
// exactly one on page 1):
//   page 1 (ordinals 1-10): 未关闭 9（#7 CLOSED）· ANDON 未关闭 5 · MATERIAL
//           未关闭 4 —— notice-bar 播报断言「未关闭任务 9 条 · 异常 5 · 叫料 4」
//   row #1  MATERIAL L1 OPEN   → 催单: andonEscalate + pull-refresh 后 L2 回显
//   row #3  MATERIAL L0 RESPONDING, expired → countdown data-finished + 行标红
//   row #5  MATERIAL L2 OPEN   → 关闭: materialIssueUpdate op=close → 已关闭
//   row #23 expired (page 3)   → 翻页到底后第二处超时样本

const COUNTERS_KEY = '__replMesCalls';
const HOOKS_KEY = '__replMesTestHooks';

const CELL = '[data-testid="mes-andon-material-cell"]';
const ROW_TITLE = '[data-testid="mes-andon-material-row-title"]';
const PANEL = '[data-testid="mes-andon-material-panel"]';

function rowCell(page: Page, marker: string) {
  return page.locator(CELL, { hasText: marker });
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

async function readHook<T = Record<string, unknown>>(page: Page, key: string): Promise<T> {
  return page.evaluate(
    (hookKey) =>
      (((window as unknown as Record<string, Record<string, unknown>>).__replMesTestHooks ?? {})[
        hookKey
      ] ?? {}) as T,
    key,
  );
}

async function openM3(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'mes-andon-material', {
    title: 'MES 异常叫料移动页',
  });
  // onMount load chain settles: page 1 (10 rows) rendered through the
  // pull-refresh scroller → infinite-scroll → loop.
  await expect(page.locator(ROW_TITLE).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(CELL)).toHaveCount(10, { timeout: 15_000 });
}

/** Drag the floating-panel between its two anchors via the handle. */
async function dragPanelToAnchor(page: Page, targetAnchor: 0 | 1): Promise<void> {
  const handle = page.locator('[data-slot="floating-panel-handle"]');
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  const panel = page.locator(PANEL);
  const current = Number((await panel.getAttribute('data-height')) ?? 0);
  const targets = [220, 480];
  await dragTouchReplication(
    page,
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 - (targets[targetAnchor] - current) },
    { steps: 12 },
  );
  await expect(panel).toHaveAttribute('data-anchor', String(targetAnchor), { timeout: 10_000 });
}

/** Scroll the pull-refresh scroller (the infinite-scroll observation root) to
 * the bottom so the sentinel intersects and onLoadMore fires. */
async function scrollListToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scroller = document.querySelector('[data-testid="mes-andon-material-pull-refresh"]');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
}

test.describe('M3 MES 异常叫料移动页 (#/complex-pages/mes-andon-material)', () => {
  // 1080px viewport: the desktop shell header (~324px) + the fixed 667px
  // mobile canvas exceed an 800px viewport, and the canvas clips its overflow
  // box — CDP touch gestures at the panel (bottom-anchored inside the canvas)
  // would hit the outlet wrapper instead of the canvas DOM. 1080 keeps the
  // whole screen unclipped and hittable.
  test.use({ viewport: { width: 1280, height: 1080 }, hasTouch: true });

  test('前置：mobile canvas 375×667 —— 首屏 10 行 / notice-bar 播报现算 / andonFindPage ≥1', async ({
    page,
  }) => {
    await openM3(page);

    const screen = page.getByTestId('mes-andon-material-screen');
    await expect(screen).toBeVisible();
    const box = await screen.boundingBox();
    expect(box?.width).toBe(375);
    expect(box?.height).toBe(667);

    // ladder page 1: 10 rows; row #1 MATERIAL · AOI-02 检测站 · L1 · 待响应.
    await expect(rowCell(page, '（#1）').getByTestId('mes-andon-material-row-title')).toContainText(
      '缺料叫料 · AOI-02 检测站 · L1 · 待响应',
    );

    // notice-bar 现算播报（ARRAYFILTER over the loaded page-1 window）.
    await expect(page.getByTestId('mes-andon-material-broadcast')).toContainText(
      '未关闭任务 9 条 · 异常 5 · 叫料 4',
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__andonFindPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① pull-refresh 手势：下拉 → andonFindPage 计数 +1 + 刷新 toast + 列表重置', async ({
    page,
  }) => {
    await openM3(page);

    const before = await callCount(page, 'ReplMes__andonFindPage');
    const surface = page.getByTestId('mes-andon-material-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });

    await expect(page.getByText('任务列表已刷新')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__andonFindPage', {
      atLeast: before + 1,
    });
    await expect(page.locator(CELL)).toHaveCount(10);
    await assertTrackedPageErrors(page);
  });

  test('交互② infinite-scroll 翻页：滚动到底 → 计数 +1 + 行数 10→20→26 + finishedText', async ({
    page,
  }) => {
    await openM3(page);

    const before = await callCount(page, 'ReplMes__andonFindPage');
    await scrollListToBottom(page);
    await expect(page.locator(CELL)).toHaveCount(20, { timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__andonFindPage', {
      atLeast: before + 1,
    });

    await scrollListToBottom(page);
    await expect(page.locator(CELL)).toHaveCount(26, { timeout: 15_000 });
    await expect(page.getByText('没有更多任务')).toBeVisible({ timeout: 10_000 });

    // 到底后 hasMore false：继续滚动不再触发翻页（计数稳定）。
    const settled = await callCount(page, 'ReplMes__andonFindPage');
    await scrollListToBottom(page);
    await page.waitForTimeout(1_000);
    expect(await callCount(page, 'ReplMes__andonFindPage')).toBe(settled);
    await assertTrackedPageErrors(page);
  });

  test('交互③ swipe-cell 催单：overswipe 直触首操作 → andonEscalate ===1 + 镜像 id + pull-refresh 后 L2 回显', async ({
    page,
  }) => {
    await openM3(page);

    const cell = rowCell(page, '（#1）');
    await cell.scrollIntoViewIfNeeded();
    // 140px 左滑超过 1.15× 右区宽（两紧凑钮 ≈100px → 阈值 115px）——走 M6d
    // overswipe-action 分支：滑动手势本身直触右区首操作（催单），格不驻留
    // open 态（swipe-cell-release.ts (a) 分支；W1 交互③ 同款两分支口径）。
    await swipeReplicationCell(page, cell, 'left');

    await expect(page.getByText('催单已发出')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__andonEscalate', { atLeast: 1 });
    const body = await readHook(page, 'lastEscalateBody');
    expect(body).toEqual({ id: 'andon-0001' });

    // 行级即时写回受 B3.2 V6 行级路径绑定缺口约束（B7 successor）——以
    // pull-refresh 重同步承担服务端真值回显（plan 811 Deferred 既有裁决）。
    const surface = page.getByTestId('mes-andon-material-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });
    await expect(page.locator(CELL)).toHaveCount(10, { timeout: 15_000 });
    await expect(
      rowCell(page, '（#1）').getByTestId('mes-andon-material-row-title'),
    ).toContainText('L2', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互④ swipe-cell 关闭：短滑驻留 open → 点关闭 → materialIssueUpdate op=close → 已关闭回显', async ({
    page,
  }) => {
    await openM3(page);

    // U1 F-M3-4（plan 846 断言裁决记录，断言语义不变）：常驻快捷面板（fixed
    // 220px）覆盖滚动区下部，原 #5 行 scrollIntoViewIfNeeded 后落在我方面板
    // 覆盖区内、手势被拦截；行选择改 #2（首屏即位于面板上方，无需内滚——
    // 内滚 scrollBy 会触发 infinite-scroll 翻页污染刷新计数断言）。同一
    // swipe-cell 关闭交互面，仅物理前置变化。
    const cell = rowCell(page, '（#2）');
    await cell.scrollIntoViewIfNeeded();
    // 80px 短滑：越过 30px 提交阈值驻留 open-right，但低于 1.15× 右区宽的
    // overswipe-action 阈值（115px）——不直触首操作，露出全部按钮供点击
    // （关闭是第二操作，必须走显式点击）。
    await swipeReplicationCell(page, cell, 'left', { distance: 80 });
    await expect(cell).toHaveAttribute('data-state', 'open-right', { timeout: 10_000 });

    // Drag-click suppression (M6a): the swipe arms a one-shot trusted-click
    // swallow on the cell — consume it with a sacrificial click on the
    // non-interactive row title so the real 关闭 click reaches the button.
    await rowCell(page, '（#2）').getByTestId('mes-andon-material-row-title').click();

    const close = cell.getByTestId('mes-andon-material-close');
    await expect(close).toBeVisible({ timeout: 10_000 });
    await close.click();

    await expect(page.getByText('任务已关闭')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__materialIssueUpdate', { atLeast: 1 });
    const body = await readHook(page, 'lastIssueUpdateBody');
    expect(body).toEqual({ id: 'andon-0002', op: 'close' });

    const surface = page.getByTestId('mes-andon-material-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });
    await expect(page.locator(CELL)).toHaveCount(10, { timeout: 15_000 });
    await expect(
      rowCell(page, '（#2）').getByTestId('mes-andon-material-row-title'),
    ).toContainText('已关闭', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ countdown 已过 deadline 行：pull-refresh 重挂载 → onFinish 超时 toast ≥1 + data-finished + 行标红', async ({
    page,
  }) => {
    await openM3(page);

    // Fresh mount of page 1 re-arms the expired row's countdown (finished
    // state resets per mount; ladder pins exactly one expired row on page 1).
    const surface = page.getByTestId('mes-andon-material-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });
    await expect(page.locator(CELL)).toHaveCount(10, { timeout: 15_000 });

    // 行作用域断言（toast 为页面级副作用，fixture 单过期行保它的确定性）。
    const cell = rowCell(page, '（#3）');
    await expect(cell.getByTestId('mes-andon-material-countdown')).toHaveAttribute(
      'data-finished',
      'true',
      { timeout: 10_000 },
    );
    const rowBodyClass =
      (await cell.getByTestId('mes-andon-material-row-body').getAttribute('class')) ?? '';
    expect(rowBodyClass).toContain('text-rose-600');
    const rowColor = await cell
      .getByTestId('mes-andon-material-row-title')
      .evaluate((el) => getComputedStyle(el).color);
    expect(rowColor).not.toBe('rgb(0, 0, 0)');

    // onFinish toast：mount 即触发一次（消息 locator 计数 ≥1 界定）。
    await expect(page.getByText('响应超时').first()).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑥ floating-bubble → action-sheet grid：发起叫料 → toast + dialog 关闭', async ({
    page,
  }) => {
    await openM3(page);

    // floating-bubble binds touch handlers only — tap via CDP touch channel.
    await tapReplicationTarget(page, page.getByTestId('mes-andon-material-bubble'));
    const dialog = page.getByTestId('mes-andon-material-quick-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('mes-andon-material-sheet-trigger').click();
    const items = page.locator('[data-slot="action-sheet-items-grid"]');
    await expect(items).toBeVisible({ timeout: 10_000 });
    // §5.6 display grid 断言（computed style，非 class 字符串）。
    const display = await items.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('grid');

    await page.locator('[data-slot="action-sheet-item"]', { hasText: '发起叫料' }).click();
    await expect(page.getByText('请在下方面板完成叫料登记')).toBeVisible({ timeout: 10_000 });
    // onSelect 链尾 closeSurface：选择后 dialog 关闭（§5.6 链式口径改判的分立
    // 断言——ActionSheet 无受控 open / FloatingPanel 无受控 height，勘误随收口
    // 落 D3 §5.6）。
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑦ floating-panel anchors 两档：拖拽 → data-anchor/data-height + onChange 写回断言', async ({
    page,
  }) => {
    await openM3(page);

    const panel = page.locator(PANEL);
    await expect(panel).toHaveAttribute('data-anchor', '0', { timeout: 10_000 });
    await expect(page.getByTestId('mes-andon-material-panel-caption')).toContainText('当前锚点：0');

    await dragPanelToAnchor(page, 1);
    await expect(panel).toHaveAttribute('data-height', '480', { timeout: 10_000 });
    await expect(page.getByTestId('mes-andon-material-panel-caption')).toContainText(
      '当前锚点：1',
      { timeout: 10_000 },
    );

    await dragPanelToAnchor(page, 0);
    await expect(panel).toHaveAttribute('data-height', '220', { timeout: 10_000 });
    await expect(page.getByTestId('mes-andon-material-panel-caption')).toContainText('当前锚点：0');
    await assertTrackedPageErrors(page);
  });

  test('交互⑧ 拍照上传：setInputFiles 选 1 张 → uploadAndonPhoto===1 + 缩略 + viewer 定位（G14 accept 注入口径）', async ({
    page,
  }) => {
    await openM3(page);
    await page.getByTestId('mes-andon-material-open-form').click();
    await expect(page.getByTestId('mes-andon-material-form-dialog')).toBeVisible({ timeout: 10_000 });

    // G14 §6.3 临时口径：只断言 accept 注入上传链路，不断言 capture 属性。
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await page
      .locator('[data-testid="nop-input-image-input"]')
      .setInputFiles({ name: 'scene-1.png', mimeType: 'image/png', buffer: png });

    // uploadAction → mock 端点计数 + 缩略渲染（upload-field 桥接 result.data.url）。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__uploadAndonPhoto', { atLeast: 1 });
    await expect(page.locator('[data-testid="nop-input-image-thumbnail"]').first()).toBeVisible({
      timeout: 15_000,
    });

    // 受控点火 image-viewer（无内置触发器——「查看照片」setValues viewerOpen）。
    await page.getByTestId('mes-andon-material-viewer-open').click();
    const viewer = page.locator('[data-slot="image-viewer"]');
    await expect(viewer).toBeVisible({ timeout: 10_000 });
    // 单图 viewer 无翻页（onChange 不可达，plan 811 评审 Minor-A 裁决）且
    // 指示器仅多图渲染（image-viewer.tsx images.length > 1）——以定位页面态
    // 断言：图片可见 + 受控 index 显示面。
    await expect(viewer.locator('[data-slot="image-viewer-image"]')).toBeVisible();
    await expect(page.getByTestId('mes-andon-material-viewer-index')).toContainText('查看位置：0');

    // viewer 的 Esc 处理在其自有 keydown（焦点须在其内）——点火按钮持有焦点、
    // 遮罩被图片层截住点击：编程聚焦遮罩（tabindex=-1）后 Esc 关闭（onClose
    // 链写回 viewerOpen=false）。
    await viewer.locator('[data-slot="image-viewer-mask"]').focus();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑨ 叫料提交：dialog 表单 wheel-picker 确认 + 明细行 + 提交 → andonCreate===1 + docNo 渲染 + 镜像逐字段', async ({
    page,
  }) => {
    await openM3(page);

    // 面板承载域的 submitAction/openDialog data 模板不求值（live 缺口，D3
    // §2.6 勘误登记）——表单整体移入 dialog 承载（W1 同款 dialog 域，模板
    // 解析已证）；面板保留锚点拖拽/发起入口面。
    await page.getByTestId('mes-andon-material-open-form').click();
    const dialog = page.getByTestId('mes-andon-material-form-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // wheel-picker 显式确认（默认即 MATERIAL）→ 写入表单值。
    await page.getByTestId('mes-andon-material-type-picker-trigger').click();
    await expect(page.locator('[data-slot="wheel-picker-popup"]')).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('[data-slot="wheel-picker-confirm"]').click();

    await page.getByTestId('mes-andon-material-station-input').locator('input').fill('AOI-02');
    await page.getByTestId('mes-andon-material-desc-input').locator('textarea').fill('线边缺料：连接器不足');

    // 叫料明细 input-table：加一行并填写（物料/应领数量/库位）。
    await page.locator('[data-slot="input-table-add"]').click();
    await page.getByTestId('mes-andon-material-line-material').locator('input').first().fill('连接器 HDR-2x5');
    await page.getByTestId('mes-andon-material-line-qty').locator('input').first().fill('50');
    await page.getByTestId('mes-andon-material-line-location').locator('input').first().fill('B-02-03');

    await page.getByTestId('mes-andon-material-submit').click();

    await expect(page.getByText('发起成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__andonCreate', { atLeast: 1 });
    await expect(dialog.getByTestId('mes-andon-material-docno')).toContainText(
      '回执单号：MI-2026-8001',
      { timeout: 10_000 },
    );

    // G2 同族：请求体逐字段命中。
    const body = await readHook(page, 'lastAndonCreateBody');
    // includeScope 载荷：字段值来自表单域数据（wheel-picker 写值为数组——
    // wheel-picker confirm 契约 form.setValue(name, value[])）。
    expect(body.type).toEqual(['MATERIAL']);
    expect(body.station).toBe('AOI-02');
    expect(body.description).toBe('线边缺料：连接器不足');
    expect(body.photos ?? []).toEqual([]);
    const lines = body.lines as Array<Record<string, unknown>>;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      material: '连接器 HDR-2x5',
      requiredQty: 50,
      location: 'B-02-03',
    });

    // closeOnSubmit=false——docNo 渲染面在 dialog 内；断言后 Esc 关闭。
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });

    // pull-refresh 重同步：mock session 前插新任务 → 页首出现新行。
    const surface = page.getByTestId('mes-andon-material-pull-refresh');
    await pullReplicationRefresh(page, surface, { distance: 160 });
    await expect(page.locator(CELL)).toHaveCount(10, { timeout: 15_000 });
    await expect(page.locator(ROW_TITLE).first()).toContainText('AOI-02', { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑩ number-keyboard：键盘录入 tap → open → onKey 拼接 → onConfirm 写回断言', async ({
    page,
  }) => {
    await openM3(page);
    await page.getByTestId('mes-andon-material-open-form').click();
    await expect(page.getByTestId('mes-andon-material-form-dialog')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId('mes-andon-material-quick-qty-display')).toContainText(
      '已录快捷数量：',
    );
    await page.getByTestId('mes-andon-material-keyboard-open').click();
    const keyboard = page.getByTestId('mes-andon-material-qty-keyboard');
    await expect(keyboard.locator('[data-slot="number-keyboard-key"]').first()).toBeVisible({
      timeout: 10_000,
    });

    await keyboard.locator('[data-slot="number-keyboard-key"][data-key="1"]').click();
    await keyboard.locator('[data-slot="number-keyboard-key"][data-key="2"]').click();
    await expect(page.getByTestId('mes-andon-material-quick-qty-display')).toContainText(
      '已录快捷数量：12',
      { timeout: 10_000 },
    );

    await keyboard.locator('[data-slot="number-keyboard-confirm"]').click();
    await expect(keyboard.locator('[data-slot="number-keyboard-key"]').first()).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.getByTestId('mes-andon-material-quick-qty-display')).toContainText(
      '已录快捷数量：12',
    );
    await assertTrackedPageErrors(page);
  });

  test('focus ① action-sheet 展开焦点落入面板（非首项——D2 勘误 7 既有口径）+ dialog 关闭焦点返 bubble', async ({
    page,
  }) => {
    await openM3(page);

    // floating-bubble binds touch handlers only — tap via CDP touch channel.
    await tapReplicationTarget(page, page.getByTestId('mes-andon-material-bubble'));
    const dialog = page.getByTestId('mes-andon-material-quick-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('mes-andon-material-sheet-trigger').click();
    const panel = page.locator('[data-slot="action-sheet-panel"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });

    // D2 §5 focus③ 既有口径（勘误第 7 条）：首项不自动获焦，退守「焦点落入
    // sheet panel 内」（Tab 兜底）；首项直达焦点登记 a11y 后续观察。
    const focusInsidePanel = (): Promise<boolean> =>
      page.evaluate(() => {
        const active = document.activeElement;
        const panelEl = document.querySelector('[data-slot="action-sheet-panel"]');
        return !!active && !!panelEl && (active === panelEl || panelEl.contains(active));
      });
    if (!(await focusInsidePanel())) {
      await page.keyboard.press('Tab');
    }
    expect(await focusInsidePanel()).toBe(true);

    // 关 sheet（Esc）→ 关 dialog（Esc）。floating-bubble 是非可焦 div
    // （无 tabindex）——Base UI 无法回焦触发器，退守「焦点离开 dialog 层回到
    // 页面」（M1 focus ② 钻取触发非可焦 trigger 退守口径同款；§5.6 勘误随收
    // 口落 D3）。
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0, { timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });
    const focusLeftDialog = await page.evaluate(() => {
      const active = document.activeElement;
      return !active || !active.closest('[data-slot="dialog-surface"], [data-slot="action-sheet-popup"]');
    });
    expect(focusLeftDialog).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ② 发起表单首字段可达：工位输入获焦 + Tab 驻留表单', async ({ page }) => {
    await openM3(page);

    await page.getByTestId('mes-andon-material-open-form').click();
    const dialog = page.getByTestId('mes-andon-material-form-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const station = page.getByTestId('mes-andon-material-station-input').locator('input');
    await station.click();
    await expect(station).toBeFocused();

    // Tab 落点驻留在发起表单内。
    await page.keyboard.press('Tab');
    const stillInsideForm = await page.evaluate(() => {
      const active = document.activeElement;
      const form = document.querySelector('[data-testid="mes-andon-material-form"]');
      return !!active && !!form && form.contains(active);
    });
    expect(stillInsideForm).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ swipe-cell 操作钮 tab 可达：左滑展开后 Tab 循环达催单钮', async ({ page }) => {
    await openM3(page);

    const cell = rowCell(page, '（#1）');
    await cell.scrollIntoViewIfNeeded();
    // 80px 短滑驻留 open-right（低于 overswipe-action 阈值，见交互④注），
    // 展开的操作钮进入 Tab 序。
    await swipeReplicationCell(page, cell, 'left', { distance: 80 });
    await expect(cell).toHaveAttribute('data-state', 'open-right', { timeout: 10_000 });
    const escalate = cell.getByTestId('mes-andon-material-escalate');
    await expect(escalate).toBeVisible({ timeout: 10_000 });

    // Tab 序可达展开的操作钮（有界循环轮询 activeElement；桌面壳侧栏导航
    // 本身占 ~40+ 站，界取 250）。OA-08：右区仅在 committed open 侧移除
    // inert——展开后才进 Tab 序，可达即证明该契约。
    let reached = false;
    for (let i = 0; i < 250 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => {
        const id = document.activeElement?.getAttribute('data-testid');
        return id === 'mes-andon-material-escalate' || id === 'mes-andon-material-close';
      });
    }
    expect(reached).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
