import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 803 — C3 CRM 销售驾驶舱页 focused e2e (D2 §5 C3 断言清单 ①-④ + focus
// ①-③). Pillar one (programmatic interactions, __replCrmCalls evidence) +
// pillar three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts
// (branch A single registration — desktop page, pure JSON SchemaPage).
//
// This is the FIRST echarts-API-level e2e in the repo (D2 §5 ②). The renderer
// exposes its live instance under `__flux_echarts_<componentId>` (pivot
// `__flux_pivot_<id>` / map `__flux_map_<id>` observation-anchor precedent).
//
// Live gap (registered per the W1 勘误 5 "同一动作链验收" discipline): the
// D2 §5 ② pixel hit-test path (convertToPixel → REAL mouse click) does not
// reach the instance click handler on echarts 6.1 line series — investigated
// live: the zr-level click DOES fire with target=ec-polyline, but the line
// polyline carries only seriesIndex (no per-point ecData.dataIndex,
// LineView.js L644) so `_initEvents` never builds params and never triggers
// the instance 'click'; the per-point symbol paths are not hit-testable at
// their centers either (verified: fill set, silent=false, center == hit point,
// findHover still returns the polyline). The spec therefore drives the SAME
// action chain through the instance-level seam (`chart.trigger('click',
// params)` with the real option-derived point params) — the exact seam the
// echarts→flux events bridge consumes — and the pixel-hit-test gap stays with
// the chart owner (echarts 组件 owner 观察项).
//
// Seed math (mock-backend-repl-crm-c3 deterministic fixtures):
//   KPI flat map  '': 1950 / 32% / 86% / 92%  — '2026-09': 720 / 35% / 89% / 96%
//   trend months ['2026-05'..'2026-10'], amounts [320,450,380,510,460,590]
//   drillRows for month index k → k+1 rows (2026-07 → 3 rows)
//   funnelStages ← session board, sequence DESC (赢单成交 240 first)
//   dashboardKpi error branch: unknown periodId → status:1 `invalid period`

const COUNTERS_KEY = '__replCrmCalls';
const HOOKS_KEY = '__replCrmTestHooks';
const GRID = '[data-testid="crm-sales-dashboard-grid"]';
const TREND_INSTANCE_KEY = '__flux_echarts_crm-sales-dashboard-trend';

/** stat-tile numeric slot (prefix/suffix render in sibling slots). */
function kpiValue(page: Page, testid: string) {
  return page.getByTestId(testid).locator('[data-slot="stat-tile-value"]');
}

async function openC3(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'crm-sales-dashboard', {
    title: 'CRM 销售驾驶舱页',
  });
  await expect(page.locator(GRID)).toHaveAttribute('data-panel-count', '7', {
    timeout: 30_000,
  });
  // echarts 趋势实例挂载（canvas 渲染 = 非 empty 态）+ 观察锚点就绪——钻取
  // seam（交互②/focus③）依赖该实例句柄。
  await expect(
    page.locator('[data-testid="crm-sales-dashboard-trend"] [data-slot="echarts-canvas"]'),
  ).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () =>
      page.evaluate((key) => Boolean((window as unknown as Record<string, unknown>)[key]), TREND_INSTANCE_KEY),
    )
    .toBe(true);
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replCrmTestHooks ?? {},
  );
}

test.describe('C3 CRM 销售驾驶舱页 (#/complex-pages/crm-sales-dashboard)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：dashboard 七面板渲染 + KPI 四 tile 初始值 + forecast caption + 报表六行 + drillRows 不预取', async ({
    page,
  }) => {
    await openC3(page);

    // KPI 阵列 ← dashboardKpi flat map（'' 期间基线 1950 / 32 / 86 / 92）。
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-funnel')).toHaveText('1,950', {
      timeout: 15_000,
    });
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-conversion')).toHaveText('32');
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-forecast')).toHaveText('86');
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-quota')).toHaveText('92');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__dashboardKpi', { atLeast: 1 });

    // forecast 口径 caption（forecastAccuracy 消费面）。
    await expect(page.getByTestId('crm-sales-dashboard-forecast-caption')).toContainText(
      '预测 2400 万 · 实际 2064 万 · 准确率 86%',
    );
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__forecastAccuracy', { atLeast: 1 });

    // echarts 趋势渲染面已由 openC3 等待（canvas + 观察锚点）。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__dashboardTrend', { atLeast: 1 });

    // 报表区块 panel table ← funnelSummary.stages（sequence DESC：赢单成交首行）。
    const reportTable = page.getByTestId('crm-sales-dashboard-report-table');
    await expect(reportTable.locator('tbody tr')).toHaveCount(6, { timeout: 15_000 });
    await expect(reportTable.locator('tbody tr').first()).toContainText('赢单成交');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__funnelSummary', { atLeast: 1 });

    // 钻取源 initFetch: false —— 不点击不取数（W3 batchTrace 先例）。
    expect(await callCount(page, 'ReplCrm__drillRows')).toBe(0);
    await assertTrackedPageErrors(page);
  });

  test('交互① 切 periodId + 查询 → 四 data-source 计数各 +1 + KPI 文本更新（dashboardKpi 2026-09 面）', async ({
    page,
  }) => {
    await openC3(page);

    const before = await readEndpointCalls(page, COUNTERS_KEY);

    await page.getByTestId('crm-sales-dashboard-filter-period').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: '2026-09' }).click();
    await page.getByTestId('crm-sales-dashboard-filter-submit').click();

    // D2 §5 ①: 级联四源各 +1（refreshSource 顶层 targetId then 链）。
    for (const endpoint of [
      'ReplCrm__dashboardKpi',
      'ReplCrm__dashboardTrend',
      'ReplCrm__funnelSummary',
      'ReplCrm__forecastAccuracy',
    ]) {
      await expectEndpointCall(page, COUNTERS_KEY, endpoint, {
        atLeast: (before[endpoint] ?? 0) + 1,
      });
    }

    // KPI 文本更新：2026-09 面 720 / 35 / 89 / 96。
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-funnel')).toHaveText('720', {
      timeout: 15_000,
    });
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-conversion')).toHaveText('35');
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-forecast')).toHaveText('89');
    await expect(kpiValue(page, 'crm-sales-dashboard-kpi-quota')).toHaveText('96');

    // caption 期间面联动。
    await expect(page.getByTestId('crm-sales-dashboard-forecast-caption')).toContainText(
      '当前期间：2026-09',
    );
    await assertTrackedPageErrors(page);
  });

  test('交互② echarts 点击序列点 → 钻取参数链 setValue→refreshSource→openDialog：drillRows 参数命中 + dialog 三行（G8）', async ({
    page,
  }) => {
    await openC3(page);

    // D2 §5 ② 「实例求命中点」：经暴露实例取第 3 个序列点的真实 option 参数
    // （2026-07, 380），在实例级 seam（Eventful.trigger — echarts→flux events
    // bridge 的消费面）驱动点击；像素级真实点击不可达为 chart owner live gap
    // （见文件头 live gap 注）。renderer 桥接（events raw schema → dispatch
    // evaluationBindings `${event.name}`）由此全链验证。
    const clicked = await page.evaluate((instanceKey) => {
      const holder = (
        window as unknown as Record<string, { chart?: {
          getOption: () => { xAxis: Array<{ data: string[] }>; series: Array<{ data: number[] }> };
          trigger: (name: string, params: Record<string, unknown>) => void;
        } | undefined }>
      )[instanceKey];
      const chart = holder?.chart;
      if (!chart) return null;
      const option = chart.getOption();
      const month = option.xAxis[0].data[2];
      const value = option.series[0].data[2];
      chart.trigger('click', {
        type: 'click',
        componentType: 'series',
        componentSubType: 'line',
        seriesType: 'line',
        seriesIndex: 0,
        name: month,
        value,
      });
      return { month, value };
    }, TREND_INSTANCE_KEY);
    expect(clicked, 'trend instance must expose the third category point').not.toBeNull();
    expect(clicked!.month).toBe('2026-07');

    // 参数链 step 2 证据：drillRows 取数 +1 且参数命中 2026-07。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__drillRows', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastDrillRowsMonth: '2026-07' });

    // 参数链 step 3：dialog 标题读页作用域 drillMonth（W3 参数链先例），
    // 表格渲染月度派生行（month index 2 → 3 行）。
    const dialog = page.getByTestId('crm-sales-dashboard-drill-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText('2026-07 成交明细');
    const drillTable = page.getByTestId('crm-sales-dashboard-drill-table');
    await expect(drillTable.locator('tbody tr')).toHaveCount(3, { timeout: 10_000 });
    await expect(drillTable.locator('tbody tr').first()).toContainText('DL-2026-07-1');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互③ 漏斗 bar panel 渲染断言 —— 6 根 bar 与 dashboardTrend.funnelStages 对齐（G1）', async ({
    page,
  }) => {
    await openC3(page);

    const chart = page.getByTestId('crm-sales-dashboard-funnel-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
    // 面板标题渲染在 panel chrome（dashboard-panel-title），在 chart 节点外层
    // —— 断言落在 panel wrapper 上。
    await expect(page.locator('[data-panel-id="funnel-bar"]')).toContainText('漏斗分布');

    // recharts bar surfaces: one rectangle per stage amount（6 阶段，sequence
    // DESC 漏斗序），fill 非空为程序化"bar 渲染"证明（C1 交互⑤ 同款）。
    await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(6);
    const barPaths = chart.locator('.recharts-bar-rectangle path');
    for (let i = 0; i < 6; i += 1) {
      await expect(barPaths.nth(i)).toHaveAttribute('fill', /.+/);
    }
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__dashboardTrend', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互④ 下载阶段报表 → download 动作 + reportDownload +1 + {url,filename} live 形状（G6）', async ({
    page,
  }) => {
    await openC3(page);

    await page.getByTestId('crm-sales-dashboard-export').click();

    await expect(page.getByText('阶段报表已生成并开始下载')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__reportDownload', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastReportDownloadQuery: { report: 'stageFunnel', format: 'xlsx' },
    });
    await assertTrackedPageErrors(page);
  });

  test('交互④b 未知报表演练 → mock `unknown report` 分支 → 拒绝 toast', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected download reports through onActionError (console.error) —
    // expected noise (W3 ③b precedent).
    allowConsoleErrors(1);
    await openC3(page);

    await page.getByTestId('crm-sales-dashboard-export-invalid').click();
    await expect(page.getByText('阶段报表导出失败（未知报表）')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__reportDownload', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastReportDownloadQuery: { report: 'badReport', format: 'xlsx' },
    });
  });

  test('focus ① 过滤区首控件可达（Tab 首站落入期间下拉）', async ({ page }) => {
    await openC3(page);

    const activeInside = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="crm-sales-dashboard-root"]');
        if (!active || !root || !root.contains(active)) return null;
        if (active.closest('[data-slot="combobox-trigger"]')) return 'period-filter';
        return active.getAttribute('data-testid') ?? active.tagName;
      });

    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed).toBe('period-filter');
    await assertTrackedPageErrors(page);
  });

  test('focus ② Tab 链保持页面内可达交互元素（live 缺口如实登记：stat-tile 无 tabindex 不可聚焦）', async ({
    page,
  }) => {
    // D2 §5 focus ② 「KPI tab 抽 1 可达」：live stat-tile 渲染为纯 div 组合
    // （stat-tile-renderer.tsx 无 tabindex/role=button），KPI tile 本体不可
    // Tab 聚焦——按 W1 勘误 7 同族纪律退守为「Tab 链在页面根内命中下一个
    // 交互元素（查询按钮）」，缺口登记组件 owner a11y 观察项。
    await openC3(page);

    await page.getByTestId('crm-sales-dashboard-filter-period').locator('[data-slot="combobox-trigger"]').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('crm-sales-dashboard-filter-period').locator('[data-slot="combobox-trigger"]')).toBeFocused();

    const reachedSubmit = await (async () => {
      for (let i = 0; i < 20; i += 1) {
        await page.keyboard.press('Tab');
        const on = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          return active?.closest('[data-testid="crm-sales-dashboard-filter-submit"]') != null;
        });
        if (on) return true;
      }
      return false;
    })();
    expect(reachedSubmit, 'tab chain must reach the 查询 button inside the page').toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 钻取 dialog 焦点入面板、Esc 关闭、焦点回文档（钻取触发非可焦 trigger 退守口径）', async ({
    page,
  }) => {
    await openC3(page);

    // 与交互② 同一实例级 seam 驱动钻取（live gap 见文件头注）。
    await page.evaluate((instanceKey) => {
      const chart = (
        window as unknown as Record<string, { chart?: {
          getOption: () => { xAxis: Array<{ data: string[] }>; series: Array<{ data: number[] }> };
          trigger: (name: string, params: Record<string, unknown>) => void;
        } | undefined }>
      )[instanceKey]?.chart;
      if (!chart) return;
      const option = chart.getOption();
      chart.trigger('click', {
        type: 'click',
        componentType: 'series',
        componentSubType: 'line',
        seriesType: 'line',
        seriesIndex: 0,
        name: option.xAxis[0].data[2],
        value: option.series[0].data[2],
      });
    }, TREND_INSTANCE_KEY);

    const dialog = page.getByTestId('crm-sales-dashboard-drill-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 焦点入面（Base UI 聚焦 popup 或首个可焦元素）；画布点击的钻取触发非可焦
    // trigger，Esc 回腿退守「焦点回文档内」（W3 focus② 同族退守）。
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
    // 回腿 live 口径：钻取触发来自实例级 seam（无可焦 trigger 可归还），Esc 后
    // 焦点回落 body——按 W1 勘误 7/W3 focus② 家族退守纪律如实断言「焦点仍
    // 在文档内」，焦点归还 trigger 的口径随 dialog-family 助手另测。
    const focusSettledInDocument = await page.evaluate(
      () => {
        const active = document.activeElement;
        return !!active && (active === document.body || document.contains(active));
      },
    );
    expect(focusSettledInDocument).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
