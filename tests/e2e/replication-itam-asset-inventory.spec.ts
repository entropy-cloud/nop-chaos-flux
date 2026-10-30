import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 804 — I1 ITAM 资产台账与盘点页 focused e2e (D2 §5 I1 断言清单 ①-⑤ 逐条
// + 本计划补充断言〔台账筛选 / diff-view 渲染 / 报修 drawer 提交 + 焦点往返 /
// 扫描落行表——均非 §5 原文，如实标注〕 + focus 三项). Pillar one (programmatic
// interactions, __replItamCalls 计数证据) + pillar three (focus). Pillar two
// (axe) lives in a11y-axe-baseline.spec.ts (branch A single registration —
// desktop page).
//
// Live-shape contracts (plan 804 pre-declared):
// - §5 ② "队列项 status=duplicate" is the barcode-input batch queue INSIDE the
//   camera scanner overlay — the overlay only opens when a camera is present
//   (checkCameraAvailability), so it is unreachable in headless Chromium (W1
//   勘误 5 同源). The duplicate face is asserted through the SAME action chain
//   (模拟扫码 → stockTakeScan → `duplicate scan` toast) per the plan's
//   barcode-headless failure path; the queue-item face is registered as an
//   a11y/e2e follow-up observation.
// - focus① "barcode-input 首站" 退守 W1 勘误 7 同源口径：barcode-input 组合
//   不可 Tab 直达，断言退守「tab 必达页根内容且驻留」。
// - The D2 §2.7 tree's page-level drawer node is realized live via the
//   openDrawer action on the 盘点中报修 entry (C2 precedent).
//
// Seed math (mock-backend-repl-itam deterministic fixtures, fresh session per
// test): 28 assets IT-2026-0001..0028; take ST-2026-001 DRAFT covering 27
// lines (asset 9 NOT listed → the 账外 盘盈 candidate), bookQty 1, four lines
// pre-scanned (assets 2/7/12/20, scannedCount 4).
//   startTake → scan asset 9 → complete ⇒ diff rows 28 =
//     4 even (2/7/12/20) + 1 surplus (9, bookQty 0 vs actualQty 1)
//     + 23 loss (unscanned) ; differences (non-zero) = 24.

const COUNTERS_KEY = '__replItamCalls';
const HOOKS_KEY = '__replItamTestHooks';

const TAKE_ID = 'ST-2026-001';
const LEDGER_ASSET = 'IT-2026-0003';
const UNLISTED_ASSET = 'IT-2026-0009';

function tabTrigger(tabValue: string) {
  return `[data-slot="tabs-trigger"][data-tab-value="${tabValue}"]`;
}

async function openI1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'itam-asset-inventory', {
    title: 'ITAM 资产台账与盘点页',
  });
  // Ledger tab is the default-active one; its crud fetches on mount.
  await expect(page.getByTestId('itam-asset-inventory-crud').locator('tbody tr').first()).toBeVisible({
    timeout: 30_000,
  });
}

/** Open the 盘点作业 tab (mountOnEnter) and wait for the take header. */
async function openTakeTab(page: Page): Promise<void> {
  await page.locator(tabTrigger('take')).click();
  await expect(page.getByTestId('itam-asset-inventory-take-status')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId('itam-asset-inventory-take-status')).toContainText('草稿');
}

async function scanAsset(page: Page, assetCode: string): Promise<void> {
  await page.getByTestId('itam-asset-inventory-scan').locator('input').fill(assetCode);
  await page.getByTestId('itam-asset-inventory-simulate-scan').click();
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

/**
 * Walk a fresh take DRAFT → CONFIRMED → scanned asset 9 → DONE. After it
 * returns: badge 已完成, diff rows 28 (4 even / 1 surplus / 23 loss),
 * differencesCount 24.
 */
async function runTakeToDone(page: Page): Promise<void> {
  await openTakeTab(page);
  await page.getByTestId('itam-asset-inventory-start-take').click();
  await expect(page.getByTestId('itam-asset-inventory-take-status')).toContainText('盘点中', {
    timeout: 10_000,
  });
  await scanAsset(page, UNLISTED_ASSET);
  await expect(page.getByText('扫码登记成功')).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('itam-asset-inventory-complete-take').click();
  const dialog = page.getByTestId('itam-asset-inventory-complete-dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await dialog.getByTestId('itam-asset-inventory-confirm-complete').click();

  await expect(page.getByText('盘点已完成')).toBeVisible({ timeout: 10_000 });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('itam-asset-inventory-take-status')).toContainText('已完成', {
    timeout: 15_000,
  });
  // stockTakeDiff refetched on submit success — the diff table settles.
  await expect(page.getByTestId('itam-asset-inventory-diff-table').locator('tbody tr').first()).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('I1 ITAM 资产台账与盘点页 (#/complex-pages/itam-asset-inventory)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：台账 crud 渲染 28 行资产（IT 字段面 9 列 + 状态标色）+ 盘点 tab 骨架 + assetFindPage 计数', async ({
    page,
  }) => {
    await openI1(page);

    const crud = page.getByTestId('itam-asset-inventory-crud');
    // Page 1 window (perPage 10) of the 28-row IT asset face.
    await expect(crud.locator('thead th')).toHaveCount(10); // 9 columns + selection
    await expect(crud.locator('thead th').nth(1)).toContainText('资产编码');
    await expect(crud.locator('thead th').nth(4)).toContainText('序列号');
    await expect(crud.locator('thead th').nth(8)).toContainText('租约到期');
    await expect(crud.locator('tbody tr')).toHaveCount(10);
    await expect(crud.locator('tbody tr').first()).toContainText('IT-2026-0001');
    await expect(crud).toContainText('共');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__assetFindPage', { atLeast: 1 });

    // 状态列三态以上标色（status cell + labelMap/levelMap）。
    const statusBadges = crud.locator('tbody [data-slot="status-badge"]');
    await expect(statusBadges.first()).toBeVisible();
    expect(await statusBadges.count()).toBe(10);

    // 盘点 tab 骨架（mountOnEnter：未激活不挂载）。
    await expect(page.locator(tabTrigger('ledger'))).toHaveText('资产台账');
    await expect(page.locator(tabTrigger('take'))).toHaveText('盘点作业');
    expect(await callCount(page, 'ReplItam__stockTakeGet')).toBeGreaterThanOrEqual(1);
    await assertTrackedPageErrors(page);
  });

  test('交互① 手输资产码 → 模拟扫码走同一 stockTakeScan 链：计数+1 + scannedCount 4→5 + 扫描落行表更新（补充：落行表展示）', async ({
    page,
  }) => {
    await openI1(page);
    await openTakeTab(page);

    await expect(page.getByTestId('itam-asset-inventory-scanned-count')).toContainText('已扫描 4 件');
    const scanBefore = await callCount(page, 'ReplItam__stockTakeScan');

    await scanAsset(page, LEDGER_ASSET);

    await expect(page.getByText('扫码登记成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeScan', {
      atLeast: scanBefore + 1,
    });
    // scannedCount 更新（refreshSource stockTakeGet → take-header 文本）。
    await expect(page.getByTestId('itam-asset-inventory-scanned-count')).toContainText('已扫描 5 件', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('itam-asset-inventory-scan-feedback')).toContainText(
      `${LEDGER_ASSET} · 网络交换机`,
    );
    // 扫描落行表（本计划补充断言）：asset-0003 行实盘数 0→1 且扫码时间落位。
    const lineRow = page
      .getByTestId('itam-asset-inventory-take-lines')
      .locator('tbody tr', { hasText: LEDGER_ASSET });
    await expect(lineRow).toBeVisible({ timeout: 10_000 });
    await expect(lineRow).toContainText('2026-10-30 10:00');
    // The refresh hit the take source.
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeGet', { atLeast: 2 });
    await assertTrackedPageErrors(page);
  });

  test('交互② duplicateScan 钩子 → 重复扫码 toast（natural 重复 + 钩子强扫 + scanMiss 错误分支）', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Each rejected scan reports through onActionError (console.error) —
    // expected noise (W1 ②b / C2 ③ precedent): 3 rejections below.
    allowConsoleErrors(3);
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await page.addInitScript(
      (hooksKey) => {
        const seed = (window as unknown as Record<string, unknown>)[hooksKey] as Record<
          string,
          unknown
        >;
        if (seed) seed.duplicateScan = true;
      },
      HOOKS_KEY,
    );
    await openReplicationPage(page, 'itam-asset-inventory', { title: 'ITAM 资产台账与盘点页' });
    await expect(
      page.getByTestId('itam-asset-inventory-crud').locator('tbody tr').first(),
    ).toBeVisible({ timeout: 30_000 });
    await openTakeTab(page);

    // natural duplicate: asset-0002 is pre-scanned → re-scan rejects.
    await scanAsset(page, 'IT-2026-0002');
    await expect(page.getByText('duplicate scan')).toBeVisible({ timeout: 10_000 });
    const afterNatural = await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeScan', {
      atLeast: 1,
    });
    // scannedCount unchanged (rejected scan mutates nothing).
    await expect(page.getByTestId('itam-asset-inventory-scanned-count')).toContainText('已扫描 4 件');

    // 钩子强扫（§5 ② duplicateScan 钩子）: a fresh code still rejects.
    await scanAsset(page, 'IT-2026-0004');
    await expect(page.getByText('duplicate scan').last()).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeScan', {
      atLeast: afterNatural + 1,
    });
    await expect(page.getByTestId('itam-asset-inventory-scanned-count')).toContainText('已扫描 4 件');
    // scanFeedback keeps its empty face (rejected scans write nothing; the
    // '' seed is not nullish so the ?? '-' fallback does not fire).
    await expect(page.getByTestId('itam-asset-inventory-scan-feedback')).toHaveText('最近扫码：');

    // scanMiss 错误分支：未登记资产码。
    await page.getByTestId('itam-asset-inventory-scan').locator('input').fill('IT-2026-9999');
    await page.getByTestId('itam-asset-inventory-simulate-scan').click();
    await expect(page.getByText('asset barcode not found')).toBeVisible({ timeout: 10_000 });
    // §5 ② 载体证据：lastScanBody 镜像逐字段（takeId ↔ 盘点单，assetBarcode ↔ 手输码）。
    const lastBody = await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replItamTestHooks;
      return hooks?.lastScanBody ?? {};
    });
    expect(lastBody).toEqual({ takeId: TAKE_ID, assetBarcode: 'IT-2026-9999' });
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejections' console entries (W1 ②b pattern).
  });

  test('交互③ 三阶段流转：startTake 徽章 DRAFT→CONFIRMED + completeTake 二次确认 dialog → stockTakeComplete +1 + 差异行数 24 + DONE 后扫码守卫', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The DONE-state scan guard rejection reports through onActionError —
    // expected noise (1 rejection below).
    allowConsoleErrors(1);
    await openI1(page);

    await expect(page.getByTestId('itam-asset-inventory-take-status')).toBeHidden();
    await openTakeTab(page);

    // 阶段一：startTake → 徽章 DRAFT → CONFIRMED。
    const startBefore = await callCount(page, 'ReplItam__stockTakeStart');
    await page.getByTestId('itam-asset-inventory-start-take').click();
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeStart', {
      atLeast: startBefore + 1,
    });
    await expect(page.getByTestId('itam-asset-inventory-take-status')).toContainText('盘点中', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('itam-asset-inventory-start-take')).toBeHidden();
    await expect(page.getByTestId('itam-asset-inventory-complete-take')).toBeVisible();

    // 扫盘外资产 9（账外盘盈）。
    await scanAsset(page, UNLISTED_ASSET);
    await expect(page.getByTestId('itam-asset-inventory-scanned-count')).toContainText('已扫描 5 件', {
      timeout: 10_000,
    });

    // 阶段二：completeTake 二次确认 dialog → stockTakeComplete +1。
    const completeBefore = await callCount(page, 'ReplItam__stockTakeComplete');
    await page.getByTestId('itam-asset-inventory-complete-take').click();
    const dialog = page.getByTestId('itam-asset-inventory-complete-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByTestId('itam-asset-inventory-confirm-complete').click();

    await expect(page.getByText('盘点已完成')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeComplete', {
      atLeast: completeBefore + 1,
    });
    await expect(dialog).toHaveCount(0);

    // 阶段三：徽章 → DONE，差异行数＝differences.length（24，mock 确定性种子）。
    await expect(page.getByTestId('itam-asset-inventory-take-status')).toContainText('已完成', {
      timeout: 15_000,
    });
    await expect(page.getByTestId('itam-asset-inventory-complete-take')).toBeHidden();
    await expect(page.getByTestId('itam-asset-inventory-diff-count')).toContainText('本次盘差 24 条', {
      timeout: 15_000,
    });
    const diffRows = page.getByTestId('itam-asset-inventory-diff-table').locator('tbody tr');
    await expect(diffRows).toHaveCount(28, { timeout: 15_000 });

    // 盘点单状态守卫：DONE 后扫码 → invalid state transition。
    const guardedBefore = await callCount(page, 'ReplItam__stockTakeScan');
    await scanAsset(page, 'IT-2026-0004');
    await expect(page.getByText('invalid state transition')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__stockTakeScan', {
      atLeast: guardedBefore + 1,
    });
    // No trailing assertTrackedPageErrors: allowance covers the expected
    // rejection's console entry (W1 ②b pattern).
  });

  test('交互④ 差异列三态标色 getComputedStyle：盘盈 success / 盘亏 error / 平 neutral', async ({
    page,
  }) => {
    await openI1(page);
    await runTakeToDone(page);

    const diffTable = page.getByTestId('itam-asset-inventory-diff-table');
    const badgeOfRow = (assetCode: string) =>
      diffTable.locator('tbody tr', { hasText: assetCode }).locator('[data-slot="status-badge"]');

    // asset 9 → 盘盈（success）；asset 1 → 盘亏（error）；asset 2 → 平（neutral）。
    const surplus = badgeOfRow(UNLISTED_ASSET);
    const loss = badgeOfRow('IT-2026-0001');
    const even = badgeOfRow('IT-2026-0002');
    await expect(surplus).toHaveText('盘盈');
    await expect(loss).toHaveText('盘亏');
    await expect(even).toHaveText('平');
    await expect(surplus).toHaveAttribute('data-level', 'success');
    await expect(loss).toHaveAttribute('data-level', 'error');
    await expect(even).toHaveAttribute('data-level', 'neutral');

    const readColor = (locator: ReturnType<typeof badgeOfRow>) =>
      locator.evaluate((el) => getComputedStyle(el).color);
    const surplusColor = await readColor(surplus);
    const lossColor = await readColor(loss);
    const evenColor = await readColor(even);

    const channel = (rgb: string) => {
      const [, r, g, b] = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) ?? [];
      return { r: Number(r), g: Number(g), b: Number(b) };
    };
    const surplusRgb = channel(surplusColor);
    const lossRgb = channel(lossColor);
    // success: green channel dominates; destructive: red dominates; the
    // neutral secondary badge is distinct from both.
    expect(surplusRgb.g).toBeGreaterThan(surplusRgb.r);
    expect(surplusRgb.g).toBeGreaterThan(surplusRgb.b);
    expect(lossRgb.r).toBeGreaterThan(lossRgb.g);
    expect(lossRgb.r).toBeGreaterThan(lossRgb.b);
    expect(new Set([surplusColor, lossColor, evenColor]).size).toBe(3);

    // diff-view（本计划补充断言，flux 侧预期增强）: split 账面 vs 实盘对照渲染。
    const diffView = page.getByTestId('itam-asset-inventory-diff-view');
    await expect(diffView).toBeVisible({ timeout: 15_000 });
    await expect(diffView).toHaveAttribute('data-view', 'split');
    await expect(diffView).toContainText('账面 1');
    await expect(diffView).toContainText('实盘 1');
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ batch-bar 选 2 行 → countTemplate 文本 + data-count + 批量打印 toast + 清空生效', async ({
    page,
  }) => {
    await openI1(page);

    const crud = page.getByTestId('itam-asset-inventory-crud');
    const batchBar = page.getByTestId('itam-asset-inventory-batch-bar');
    // Empty selection renders null (antdpro precedent).
    await expect(batchBar).toBeHidden();

    const rowCheckboxes = crud.locator('tbody [role="checkbox"]');
    await rowCheckboxes.nth(0).click();
    await rowCheckboxes.nth(1).click();

    await expect(batchBar).toBeVisible();
    await expect(batchBar).toHaveAttribute('data-count', '2');
    await expect(batchBar).toContainText('已选 2 台设备');

    // Batch action fires with a live selection.
    await page.getByTestId('itam-asset-inventory-batch-print').click();
    await expect(page.getByText('打印任务已生成')).toBeVisible({ timeout: 10_000 });

    // 清空生效：bar collapses back to null and the checkboxes clear.
    await page.getByTestId('itam-asset-inventory-batch-bar-clear').click();
    await expect(batchBar).toBeHidden();
    await expect(crud.locator('tbody [role="checkbox"][data-state="checked"]')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('补充：台账筛选 keyword 笔记本 → 搜索 → assetFindPage +1 + 行收缩为 3 行（1/11/21）', async ({
    page,
  }) => {
    await openI1(page);

    const before = await callCount(page, 'ReplItam__assetFindPage');
    const crud = page.getByTestId('itam-asset-inventory-crud');
    await page.getByTestId('itam-asset-inventory-query-keyword').locator('input').fill('笔记本');
    await crud.locator('[data-slot="crud-query-search"]').click();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__assetFindPage', { atLeast: before + 1 });
    await expect(crud.locator('tbody tr')).toHaveCount(3, { timeout: 15_000 });
    const codes = await crud.locator('tbody tr td:nth-child(2)').allTextContents();
    expect(codes).toEqual([
      'IT-2026-0001',
      'IT-2026-0011',
      'IT-2026-0021',
    ]);
    await assertTrackedPageErrors(page);
  });

  test('补充：报修 drawer 空 content 命中 content required → 补内容提交 repairCreate +1 + lastRepairBody 逐字段', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected submit reports through onActionError 4× per rejected
    // submit (ajax retry wrapper + action-error observer) — C2 ③ precedent.
    allowConsoleErrors(4);
    await openI1(page);
    await openTakeTab(page);

    await expect(page.getByTestId('itam-asset-inventory-take-lines').locator('tbody tr').first()).toBeVisible();
    const repairBefore = await callCount(page, 'ReplItam__repairCreate');

    await page.getByTestId('itam-asset-inventory-repair-open').click();
    const drawer = page.locator('[data-slot="drawer-surface"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    // 错误分支：blank content → mock status:1 `content required` → error toast
    // + drawer stays open (closeOnSubmit binds to success).
    await page.getByTestId('itam-asset-inventory-repair-submit').click();
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__repairCreate', {
      atLeast: repairBefore + 1,
    });
    await expect(page.getByText('报修提交被拒绝：内容缺失（content required）')).toBeVisible({
      timeout: 10_000,
    });
    await expect(drawer).toBeVisible();

    // 成功提交 → repairCreate 再 +1 → lastRepairBody 逐字段。
    await page.getByTestId('itam-asset-inventory-repair-asset').locator('input').fill(LEDGER_ASSET);
    await page
      .getByTestId('itam-asset-inventory-repair-content')
      .locator('textarea')
      .fill('盘点中发现屏幕碎裂，无法开机');
    await page.getByTestId('itam-asset-inventory-repair-submit').click();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplItam__repairCreate', {
      atLeast: repairBefore + 2,
    });
    const lastBody = await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replItamTestHooks;
      return hooks?.lastRepairBody ?? {};
    });
    expect(lastBody).toEqual({
      takeId: TAKE_ID,
      assetCode: LEDGER_ASSET,
      content: '盘点中发现屏幕碎裂，无法开机',
    });

    await expect(page.getByText('报修已受理')).toBeVisible({ timeout: 10_000 });
    await expect(drawer).toHaveCount(0, { timeout: 10_000 });
    // No trailing assertTrackedPageErrors: allowance covers the expected
    // rejection's console entries (C2 ③ pattern).
  });

  test('focus ① Tab 必达页根内容且驻留（barcode-input 不可 Tab 直达——W1 勘误 7 同源退守口径预登记）', async ({
    page,
  }) => {
    await openI1(page);
    await openTakeTab(page);

    const insideRoot = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        const root = document.querySelector('[data-testid="itam-asset-inventory-root"]');
        return !!active && !!root && root.contains(active)
          ? (active.getAttribute('data-testid') ?? active.tagName)
          : null;
      });

    // 退守口径：barcode-input 组合在页内不可 Tab 直达（D2 §5 focus① 原文
    // 「barcode-input 首站」不成立），断言 tab 必达页根内容且下一站驻留；
    // barcode-input 可达性登记 a11y 后续观察（W1 勘误 7 同源）。
    let landed: string | null = null;
    for (let i = 0; i < 120 && !landed; i += 1) {
      await page.keyboard.press('Tab');
      landed = await insideRoot();
    }
    expect(landed, 'tab must reach the page root content').toBeTruthy();

    await page.keyboard.press('Tab');
    expect(await insideRoot(), 'subsequent tab keeps focus inside the page').toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('focus ② batch-bar 首按钮可达（选 2 行后 Shift+Tab 链路落入批量打印标签）', async ({
    page,
  }) => {
    await openI1(page);

    const crud = page.getByTestId('itam-asset-inventory-crud');
    const rowCheckboxes = crud.locator('tbody [role="checkbox"]');
    await rowCheckboxes.nth(0).click();
    await rowCheckboxes.nth(1).click();
    const batchBar = page.getByTestId('itam-asset-inventory-batch-bar');
    await expect(batchBar).toBeVisible();

    // Walk back from the second row checkbox until the first batch-bar action
    // takes focus (§5 focus②: batch-bar 首按钮可达). Coming from below, the
    // first stop inside the bar is its LAST tabbable (the clear button, DOM
    // order: count → actions → clear), so keep walking backward until the
    // 批量打印标签 button itself takes focus.
    await rowCheckboxes.nth(1).focus();
    const focusedInsideBar = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        const bar = document.querySelector('[data-testid="itam-asset-inventory-batch-bar"]');
        return !!active && !!bar && bar.contains(active)
          ? (active.getAttribute('data-testid') ?? active.tagName)
          : null;
      });

    let landed: string | null = null;
    for (let i = 0; i < 80 && landed === null; i += 1) {
      await page.keyboard.press('Shift+Tab');
      const inside = await focusedInsideBar();
      landed = inside === 'itam-asset-inventory-batch-print' ? inside : null;
    }
    expect(landed, 'Shift+Tab must reach the batch-bar first action').toBe(
      'itam-asset-inventory-batch-print',
    );
    await expect(page.getByTestId('itam-asset-inventory-batch-print')).toBeFocused();
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 完成盘点二次确认 dialog 焦点入面板、Esc 返回触发按钮', async ({ page }) => {
    await openI1(page);
    await openTakeTab(page);

    await page.getByTestId('itam-asset-inventory-start-take').click();
    await expect(page.getByTestId('itam-asset-inventory-complete-take')).toBeVisible({
      timeout: 10_000,
    });

    const trigger = page.getByTestId('itam-asset-inventory-complete-take');
    await assertDialogFocusRoundTrip(page, trigger);
    await assertTrackedPageErrors(page);
  });
});
