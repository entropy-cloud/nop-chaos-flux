import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 813 — S2 商城分销后台页 focused e2e (D4 §5 S2 断言清单 前置 + ①-⑥ +
// focus ①②). Pillar one (programmatic interactions, __replMallCalls evidence)
// + pillar three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts
// (branch A desktop registration).
//
// Live-completed assertion faces (D4 §5 S2 勘误已就地落档):
// - 交互③ pivot 下钻: the cell-click payload carries cellHeaderPaths (NOT
//   event.value — the W3 已证面), so drillDistributor reads
//   rowHeaderPaths[1].value (distributorName is the leaf row dimension) and
//   the drill dialog filters commissionAll client-side via ARRAYFILTER.
// - 交互⑤ 空原因: the UI required rule blocks submitForm before any request
//   (payoutAudit count unchanged, K3 口径); the server-side
//   REPL_MALL_PAYOUT_REJECTED_REQUIRED fallback is hit via whitespace-only
//   input.

const COUNTERS_KEY = '__replMallCalls';
const HOOKS_KEY = '__replMallTestHooks';
const PIVOT_INSTANCE_KEY = '__flux_pivot_mall-distribution-pivot';

/* Fixture math mirrors mock-backend-repl-mall.ts buildCommissionRows. */
const TOTAL_ROWS = 27;
const DISTRIBUTORS = [
  { name: '星辉传媒', level: 1 },
  { name: '蓝海优选', level: 1 },
  { name: '橙意供应链', level: 2 },
  { name: '云集市', level: 2 },
  { name: '快马分销', level: 2 },
  { name: '优选家', level: 3 },
  { name: '汇客来', level: 3 },
  { name: '小鹿严选', level: 3 },
] as const;
const LEVEL_RATE: Record<number, number> = { 1: 0.05, 2: 0.03, 3: 0.02 };

interface CommissionRow {
  orderNo: string;
  payoutId: string;
  distributorName: string;
  level: number;
  rate: number;
  commissionAmount: number;
  status: 'pending' | 'settled' | 'rejected';
}

function commissionRow(n: number): CommissionRow {
  const dist = DISTRIBUTORS[(n * 3) % DISTRIBUTORS.length];
  const status: CommissionRow['status'] =
    n === 1 ? 'pending' : n % 7 === 0 ? 'rejected' : n % 2 === 0 ? 'settled' : 'pending';
  return {
    orderNo: `ORD-2026-${String(1000 + n)}`,
    payoutId: `payout-${String(n).padStart(3, '0')}`,
    distributorName: dist.name,
    level: dist.level,
    rate: LEVEL_RATE[dist.level],
    commissionAmount: 50 + ((n * 37) % 400),
    status,
  };
}

const ALL_ROWS: CommissionRow[] = Array.from({ length: TOTAL_ROWS }, (_, i) => commissionRow(i + 1));
const ROW1 = ALL_ROWS[0];
const PENDING_COUNT = ALL_ROWS.filter((r) => r.status === 'pending').length;
const TOTAL_COMMISSION = ALL_ROWS.reduce((sum, r) => sum + r.commissionAmount, 0);
const TOTAL_GMV = ALL_ROWS.reduce((sum, r) => sum + Math.round(r.commissionAmount / r.rate), 0);
const DISTRIBUTOR_COUNT = new Set(DISTRIBUTORS.map((d) => d.name)).size;
/** 云集市 rows: (n*3)%8 === 3 → n ≡ 1 (mod 8) → n ∈ {1,9,17,25}. */
const YUNJI_ROWS = ALL_ROWS.filter((r) => r.distributorName === '云集市');

const EXPECTED_KPI: Array<[string, string]> = [
  ['mall-distribution-kpi-gmv', TOTAL_GMV.toLocaleString('en-US')],
  ['mall-distribution-kpi-commission', TOTAL_COMMISSION.toLocaleString('en-US')],
  ['mall-distribution-kpi-distributors', String(DISTRIBUTOR_COUNT)],
  ['mall-distribution-kpi-pending', String(PENDING_COUNT)],
];

interface PivotHeaderPath {
  dimensionKey?: string;
  value?: string | number;
  indicatorKey?: string;
}

async function probePivot(page: Page): Promise<{
  colCount: number;
  layoutRows: number;
  firstLeafDistributor: string | number | null;
  grandRow: number;
}> {
  return page.evaluate((instanceKey) => {
    const instance = (window as unknown as Record<string, { instance?: {
      colCount: number;
      rowCount: number;
      getLayoutRowTreeCount: () => number;
      getCellValue: (col: number, row: number) => string | number | null;
    } | undefined }>)[instanceKey]?.instance;
    if (!instance) throw new Error('pivot instance not exposed');
    let firstLeafDistributor: string | number | null = null;
    let grandRow = -1;
    // No column dimensions → a single indicator header row; scan every
    // absolute row (instance.rowCount includes the header rows).
    for (let row = 0; row < instance.rowCount; row += 1) {
      const dist = instance.getCellValue(1, row);
      if (
        firstLeafDistributor === null &&
        row > 0 &&
        dist !== null &&
        String(dist).length > 0 &&
        String(dist) !== '总计'
      ) {
        firstLeafDistributor = dist;
      }
      if (grandRow === -1 && instance.getCellValue(0, row) === '总计') {
        grandRow = row;
      }
    }
    return {
      colCount: instance.colCount,
      layoutRows: instance.getLayoutRowTreeCount(),
      firstLeafDistributor,
      grandRow,
    };
  }, PIVOT_INSTANCE_KEY);
}

/** Locate the commissionAmount SUM cell of `distributor`'s leaf row and real-mouse-click it. */
async function clickPivotDistributorCell(page: Page, distributor: string): Promise<void> {
  await page.locator('[data-testid="mall-distribution-pivot"]').scrollIntoViewIfNeeded();
  const point = await page.evaluate(
    ({ instanceKey, target }) => {
      const instance = (window as unknown as Record<string, { instance?: {
        colCount: number;
        rowCount: number;
        getCellValue: (col: number, row: number) => string | number | null;
        getCellHeaderPaths: (col: number, row: number) => {
          colHeaderPaths?: PivotHeaderPath[];
        };
        getCellRect: (col: number, row: number) => { left: number; top: number; width: number; height: number };
      } | undefined }>)[instanceKey]?.instance;
      if (!instance) throw new Error('pivot instance not exposed');
      for (let row = 0; row < instance.rowCount; row += 1) {
        if (String(instance.getCellValue(1, row)) !== target) continue;
        for (let col = 2; col < instance.colCount; col += 1) {
          // Without column dimensions the indicator is the only column header
          // level — match it anywhere in the path.
          const paths = instance.getCellHeaderPaths(col, row).colHeaderPaths ?? [];
          if (!paths.some((p) => p.indicatorKey === 'commissionAmount')) continue;
          const canvas = document.querySelector('[data-testid="mall-distribution-pivot"] canvas');
          if (!canvas) throw new Error('pivot canvas not found');
          const box = canvas.getBoundingClientRect();
          const rect = instance.getCellRect(col, row);
          return { x: box.left + rect.left + rect.width / 2, y: box.top + rect.top + rect.height / 2 };
        }
      }
      return null;
    },
    { instanceKey: PIVOT_INSTANCE_KEY, target: distributor },
  );
  expect(point, `pivot leaf row for ${distributor} with a commissionAmount column must exist`).toBeTruthy();
  await page.mouse.click(point!.x, point!.y);
  await page.waitForTimeout(300);
}

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replMallTestHooks ?? {},
  );
}

async function openS2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'mall-distribution', {
    title: '商城分销后台页',
  });
  await expect(
    page.locator('[data-testid="mall-distribution-pivot"] [data-slot="pivot-canvas"] canvas').first(),
  ).toBeAttached({ timeout: 30_000 });
  await expect
    .poll(async () => await page.evaluate((key) => !!(window as unknown as Record<string, unknown>)[key], PIVOT_INSTANCE_KEY))
    .toBe(true);
}

test.describe('S2 商城分销后台页 (#/complex-pages/mall-distribution)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：dashboard 四卡 = 佣金明细聚合值 + crud 行集 + pivot/tree/qrcode 可见 + S2 端点计数', async ({ page }) => {
    await openS2(page);

    for (const [testid, text] of EXPECTED_KPI) {
      await expect(page.getByTestId(testid).locator('[data-slot="stat-tile-value"]')).toHaveText(text, {
        timeout: 15_000,
      });
    }

    const probe = await probePivot(page);
    // 2 row dimensions + 2 indicators = 4 columns; leaf×indicator rows + 1
    // grand total (level×distributor pairs are already unique leaves).
    expect(probe.colCount).toBe(4);
    expect(probe.layoutRows).toBe(DISTRIBUTOR_COUNT + 1);
    expect(probe.firstLeafDistributor).not.toBeNull();
    expect(probe.grandRow).toBeGreaterThan(0);

    // Tree renders the three-level distributor forest (level-1 roots).
    const tree = page.getByTestId('mall-distribution-tree');
    await expect(tree).toBeVisible({ timeout: 15_000 });
    for (const root of ['星辉传媒', '蓝海优选']) {
      await expect(tree).toContainText(root);
    }
    await expect(page.getByTestId('mall-distribution-qrcode')).toBeVisible();
    // Merchant permission zone (G17) renders its invite content.
    await expect(page.getByTestId('mall-distribution-merchant-zone')).toBeVisible();

    // Crud first page renders ROW1 (n=1, 云集市, 待结算).
    const crud = page.getByTestId('mall-distribution-crud');
    await expect(crud.locator('tbody tr').first()).toContainText(ROW1.orderNo, { timeout: 15_000 });
    await expect(crud).toContainText('云集市');

    const calls = await readEndpointCalls(page, COUNTERS_KEY);
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionPage', { atLeast: 2 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__distPivot', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__distTree', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionRules', { atLeast: 1 });
    expect((calls['ReplMall__commissionExport'] ?? 0) + (calls['ReplMall__payoutAudit'] ?? 0)).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① query-filter 筛选分销商 → commissionPage 重取 +1、crud 行集收缩、请求参数命中', async ({ page }) => {
    await openS2(page);

    const before = (await readEndpointCalls(page, COUNTERS_KEY))['ReplMall__commissionPage'] ?? 0;
    await page.getByTestId('mall-distribution-filter-distributor').locator('input').fill('云集市');
    await page.getByTestId('mall-distribution-filter').getByRole('button', { name: '查询' }).click();

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionPage', { atLeast: before + 1 });
    expect(await hooksData(page)).toMatchObject({
      lastCommissionPageParams: { distributor: '云集市' },
    });
    await expect(page.getByTestId('mall-distribution-crud').locator('tbody tr')).toHaveCount(YUNJI_ROWS.length, {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互② 导出佣金明细 → commissionExport +1 + download 触发 + CSV data-url 形状（G6）', async ({ page }) => {
    await openS2(page);

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
    await page.getByTestId('mall-distribution-export-btn').click();

    await expect(page.getByText('佣金明细已生成并开始下载')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionExport', { atLeast: 1 });

    const exported = (await hooksData(page)).lastCommissionExportData as
      | { url?: string; downloadUrl?: string; filename?: string; rowCount?: number }
      | undefined;
    expect(String(exported?.url ?? '')).toMatch(/^data:text\/csv/);
    expect(exported?.downloadUrl).toBe(exported?.url);
    expect(exported?.filename).toBe('佣金明细.csv');
    expect(exported?.rowCount).toBe(TOTAL_ROWS);

    // 附加断言（非验收本体）：宿主 <a download>.click() 真实触发了浏览器下载。
    const download = await downloadPromise;
    expect(download, 'browser download event must fire').toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('交互②b 空集导出 → REPL_MALL_EXPORT_EMPTY 拒绝 toast', async ({ page, allowConsoleErrors }) => {
    // Expected rejection noise: the failed ajax reports through onActionError.
    allowConsoleErrors(1);
    await openS2(page);

    // The consume-once hook empties the NEXT export's row set (server branch).
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, Record<string, unknown>>).__replMallTestHooks;
      if (hooks) hooks.forceExportEmpty = true;
    });
    await page.getByTestId('mall-distribution-export-btn').click();
    await expect(page.getByText('导出失败（REPL_MALL_EXPORT_EMPTY）')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionExport', { atLeast: 1 });
    expect((await hooksData(page)).lastCommissionExportData).toBeUndefined();
  });

  test('交互③ pivot cell click → drillDistributor 写回 + 下钻 dialog 按点击维值过滤', async ({ page }) => {
    await openS2(page);

    const target = YUNJI_ROWS[0].distributorName;
    await clickPivotDistributorCell(page, target);

    const dialog = page.getByTestId('mall-distribution-drill-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText(`分销商下钻 · ${target}`);

    // Dialog table rows are exactly the clicked distributor's commission rows.
    const drillTable = page.getByTestId('mall-distribution-drill-table');
    await expect(drillTable.locator('tbody tr')).toHaveCount(YUNJI_ROWS.length, { timeout: 10_000 });
    for (const row of YUNJI_ROWS) {
      await expect(drillTable).toContainText(row.orderNo);
    }
    // No foreign distributor leaks into the drill face.
    await expect(drillTable).not.toContainText('星辉传媒');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互④ 佣金规则：合计≠100% → RULE_INVALID toast；修正后提交 payload 断言', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Expected rejection noise: the RULE_INVALID submit reports through onActionError.
    allowConsoleErrors(1);
    await openS2(page);

    const l2 = page.getByTestId('mall-distribution-rules-l2rate');
    await expect(l2).toHaveCount(3, { timeout: 15_000 });

    // Row 0: 50/30/20 → bump L2Rate to 32 (sum 102) → server rejects.
    await l2.nth(0).locator('input').fill('32');
    await page.getByTestId('mall-distribution-rules-submit').click();
    await expect(page.getByText(/规则被拒绝（REPL_MALL_RULE_INVALID）/)).toBeVisible({ timeout: 15_000 });
    expect((await hooksData(page)).lastCommissionRulesBody).toBeDefined();

    // Fix back to a valid 100% split → success + payload mirror assertion.
    await l2.nth(0).locator('input').fill('30');
    await page.getByTestId('mall-distribution-rules-submit').click();
    await expect(page.getByText('佣金规则已保存')).toBeVisible({ timeout: 15_000 });
    const body = (await hooksData(page)).lastCommissionRulesBody as
      | { rules?: Array<{ category: string; minAmount: number; L1Rate: number; L2Rate: number; L3Rate: number }> }
      | undefined;
    expect(Array.isArray(body?.rules)).toBe(true);
    expect(body!.rules!.length).toBe(3);
    expect(body!.rules![0]).toMatchObject({ category: '数码家电', minAmount: 0, L1Rate: 50, L2Rate: 30, L3Rate: 20 });
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // RULE_INVALID rejection's expected console entry.
  });

  test('交互⑤ 提现审核：空意见前端拦截（payoutAudit 计数不变）→ 填写后驳回成功 + payload 断言', async ({
    page,
    allowConsoleErrors,
  }) => {
    // Expected rejection noise: the whitespace-only fallback branch reports
    // its REPL_MALL_PAYOUT_REJECTED_REQUIRED failure through onActionError.
    allowConsoleErrors(1);
    await openS2(page);

    await page.getByTestId('mall-distribution-audit-open').first().click();
    const dialog = page.getByTestId('mall-distribution-audit-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText(ROW1.distributorName);

    // Empty reason: the required rule blocks component:submit before any
    // request — payoutAudit count stays 0 and the dialog stays open (K3 口径).
    await page.getByTestId('mall-distribution-audit-reject').click();
    await page.waitForTimeout(600);
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplMall__payoutAudit'] ?? 0).toBe(0);
    await expect(dialog).toBeVisible();

    // Whitespace-only bypasses the required rule → server-side fallback
    // REPL_MALL_PAYOUT_REJECTED_REQUIRED (兜底分支).
    await page.getByTestId('mall-distribution-audit-reason').locator('textarea').fill('   ');
    await page.getByTestId('mall-distribution-audit-reject').click();
    await expect(page.getByText('审核被拒绝（REPL_MALL_PAYOUT_REJECTED_REQUIRED）')).toBeVisible({ timeout: 15_000 });

    // Filled reason → rejected audit lands with the full payload.
    await page.getByTestId('mall-distribution-audit-reason').locator('textarea').fill('收款凭证不符');
    await page.getByTestId('mall-distribution-audit-reject').click();
    await expect(page.getByText('审核已提交')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__payoutAudit', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastPayoutAuditBody: { payoutId: ROW1.payoutId, auditResult: 'rejected', reason: '收款凭证不符' },
    });
    await expect(dialog).toHaveCount(0);
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // fallback branch's expected console entry.
  });

  test('交互⑥（G17）权限层裁剪：merchant 区块渲染、platform 区块不渲染', async ({ page }) => {
    await openS2(page);

    await expect(page.getByTestId('mall-distribution-merchant-zone')).toBeVisible();
    await expect(page.getByTestId('mall-distribution-platform-zone')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互⑦（G17）batch-bar 结算入口：勾 2 行 → countTemplate「已选 2 条」→ 发起结算 toast 携带条数', async ({ page }) => {
    await openS2(page);

    const crud = page.getByTestId('mall-distribution-crud');
    const bar = page.getByTestId('mall-distribution-batch-bar');
    await expect(bar).toBeHidden();
    const checkboxes = crud.locator('tbody [role="checkbox"]');
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();
    await expect(bar).toHaveAttribute('data-count', '2');
    await expect(bar).toContainText('已选 2 条佣金记录');

    await page.getByTestId('mall-distribution-batch-settle').click();
    await expect(page.getByText('结算批次已提交（2 条进入结算队列）')).toBeVisible({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('focus ① 审核 dialog 焦点落入、Esc 关闭返回', async ({ page }) => {
    await openS2(page);

    await page.getByTestId('mall-distribution-audit-open').first().click();
    const dialog = page.getByTestId('mall-distribution-audit-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const surfaces = document.querySelectorAll('[data-slot="dialog-surface"]');
          const top = surfaces[surfaces.length - 1];
          const active = document.activeElement;
          return !!top && !!active && (active === top || top.contains(active));
        }),
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const focusBackInDocument = await page.evaluate(
      () => !!document.activeElement && document.activeElement !== document.body,
    );
    expect(focusBackInDocument).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ② 导出按钮键盘可达，Enter 触发导出', async ({ page }) => {
    await openS2(page);

    const exportButton = page.getByTestId('mall-distribution-export-btn');
    await exportButton.scrollIntoViewIfNeeded();
    await exportButton.focus();
    await expect(exportButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByText('佣金明细已生成并开始下载')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMall__commissionExport', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });
});
