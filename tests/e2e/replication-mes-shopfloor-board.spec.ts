import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 809 — M1 MES 车间大屏页 focused e2e (D3 §5.4 M1 断言清单 + focus ①-③).
// Pillar one (programmatic interactions, __replMesCalls evidence) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — desktop page, pure JSON SchemaPage).
//
// Mock seed math (mock-backend-repl-mes.ts deterministic fixtures — 调用计数
// 相位推进, 评审 MIN-1: the Nth dashboardKpi call returns phase-N data):
//   phase 1 (initFetch 首帧): planned 1,200 / completed 1,020 / scrapped 30 /
//                             completionRate 85.0 (decimals 1)
//   phase 2 (第 2 次调用):    completed 1,056 / scrapped 36 / completionRate 88.0
//   trend: 48 half-hour labels; per-point output +4 per phase
//   abnormalities: 4 unclosed (2 share hour '08:00' → drill dialog 2 rows)
//   abnormalityTexts: every carousel entry carries the count summary
//   '未关闭异常 4 条（严重 2 条）' — the marquee renders one entry at a time,
//   so the §5.4 count assertion must not depend on the rotation window.
//   downtimes: 注塑机 IM-02 / 模具更换 / 45 min (首行) — in-progress sum 63
//   error branch: __replMesTestHooks.failNextMutation → KPI_UNAVAILABLE
//
// 轮询口径（§5.4 + W3 勘误）：interval=15s 只断首帧；第二态经页面 手动刷新
// 按钮（refreshSource）驱动 mock 相位推进后 **直接断数据面**（KPI 文本 +
// echarts getOption series 数据），不等第二帧（防 flake）。interval 定时器
// 语义由 flux-runtime request-runtime-polling 单测覆盖，e2e 不重复证明。
//
// echarts 下钻与 C3 同款实例级 seam：pixel hit-test on line series does not
// reach the instance click handler (echarts 6.1 line polyline carries only
// seriesIndex — C3 spec header live-gap note); the spec drives the SAME
// action chain through `chart.trigger('click', params)` — the exact seam the
// echarts→flux events bridge consumes. Renderer exposes the live instance
// under `__flux_echarts_<componentId>` (W1 勘误 5 观察锚).
//
// scada 断言走 `window.__flux_scada_<cid>` 测试句柄（恒开 exposeTestHandle）：
// engine.getSymbols() 工位组态叶子 ≥10、类型集含 scada-group 子树四族图元；
// setPointValues 注入后 getPointValue 生效（§5.4）。

const COUNTERS_KEY = '__replMesCalls';
const HOOKS_KEY = '__replMesTestHooks';
const GRID = '[data-testid="mes-shopfloor-board-grid"]';
const TREND_INSTANCE_KEY = '__flux_echarts_mes-shopfloor-board-trend';

/** stat-tile numeric slot (prefix/suffix render in sibling slots). */
function kpiValue(page: Page, testid: string) {
  return page.getByTestId(testid).locator('[data-slot="stat-tile-value"]');
}

async function openM1(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'mes-shopfloor-board', {
    title: 'MES 车间大屏页',
  });
  await expect(page.locator(GRID)).toHaveAttribute('data-panel-count', '8', {
    timeout: 30_000,
  });
  // echarts 趋势实例挂载（canvas 渲染 = 非 empty 态）+ 观察锚点就绪——下钻
  // seam（交互/ focus ②）依赖该实例句柄。
  await expect(
    page.locator('[data-testid="mes-shopfloor-board-trend"] [data-slot="echarts-canvas"]'),
  ).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () =>
      page.evaluate((key) => Boolean((window as unknown as Record<string, unknown>)[key]), TREND_INSTANCE_KEY),
    )
    .toBe(true);
}

/** scada 画布就绪（lazy chunk 装载 + 引擎构建完成）→ 返回测试句柄 key。
 * canvas 节点本体即 panel props.testid 节点（data-slot 与 data-testid 同节点）。 */
async function openScadaHandle(page: Page): Promise<string> {
  const canvas = page.locator('[data-panel-id="scada"] [data-slot="scada-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  const cid = await canvas.getAttribute('data-cid');
  expect(cid, 'scada-canvas should expose data-cid for the test handle').toBeTruthy();
  return `__flux_scada_${cid}`;
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

/** Read the trend series data snapshot (phase evidence at the data face). */
async function readTrendSeries(page: Page): Promise<number[]> {
  return page.evaluate((instanceKey) => {
    const chart = (
      window as unknown as Record<
        string,
        {
          chart?: {
            getOption: () => { series: Array<{ data: number[] }> };
          };
        }
      >
    )[instanceKey]?.chart;
    return chart ? [...chart.getOption().series[0]!.data] : [];
  }, TREND_INSTANCE_KEY);
}

test.describe('M1 MES 车间大屏页 (#/complex-pages/mes-shopfloor-board)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：八面板渲染 + KPI 四 tile 首帧值（千分位/decimals）+ notice-bar 播报 + 停机面 + dashboardKpi ≥1', async ({
    page,
  }) => {
    await openM1(page);

    // KPI 阵列 ← dashboardKpi 相位 1（1,200 / 1,020 / 30 / 85.0）。
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-planned')).toHaveText('1,200', {
      timeout: 15_000,
    });
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-completed')).toHaveText('1,020');
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-scrapped')).toHaveText('30');
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-rate')).toHaveText('85.0');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__dashboardKpi', { atLeast: 1 });

    // G10 临时口径（§6.2）：数值/delta 方向色 + sparkline 存在，无 flip 动效断言。
    await expect(
      page.getByTestId('mes-shopfloor-board-kpi-completed').locator('[data-slot="stat-tile-delta"]'),
    ).toHaveAttribute('data-direction', 'up');
    await expect(
      page.getByTestId('mes-shopfloor-board-kpi-scrapped').locator('[data-slot="stat-tile-delta"]'),
    ).toHaveAttribute('data-direction', 'down');
    await expect(
      page.getByTestId('mes-shopfloor-board-kpi-planned').locator('[data-slot="stat-tile-sparkline"]'),
    ).toBeVisible();

    // 播报：notice-bar 文本含未关闭异常条数（§5.4；条数摘要在每条轮播文本上
    // 重复，断言不依赖轮转相位）。
    await expect(page.getByTestId('mes-shopfloor-board-notice')).toContainText(
      '未关闭异常 4 条（严重 2 条）',
      { timeout: 15_000 },
    );

    // 停机状态：stat-tile 聚合 + 明细表首行设备/时长（§5.4）。
    await expect(kpiValue(page, 'mes-shopfloor-board-downtime-tile')).toHaveText('63');
    const downtimeTable = page.getByTestId('mes-shopfloor-board-downtime-table');
    await expect(downtimeTable.locator('tbody tr')).toHaveCount(3, { timeout: 15_000 });
    await expect(downtimeTable.locator('tbody tr').first()).toContainText('注塑机 IM-02');
    await expect(downtimeTable.locator('tbody tr').first()).toContainText('45');

    // 趋势数据面：echarts series 已灌入相位 1 序列（48 点）。
    const series = await readTrendSeries(page);
    expect(series).toHaveLength(48);

    await assertTrackedPageErrors(page);
  });

  test('交互① 轮询第二态：手动刷新 → dashboardKpi 计数 +1 → mock 相位推进 → KPI 文本 + echarts series 数据面变化', async ({
    page,
  }) => {
    await openM1(page);

    const before = await callCount(page, 'ReplMes__dashboardKpi');
    const seriesBefore = await readTrendSeries(page);
    expect(seriesBefore).toHaveLength(48);

    // refreshSource → 第 2 次调用 → mock 返回相位 2 数据（调用计数相位推进）。
    await page.getByTestId('mes-shopfloor-board-refresh').click();
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__dashboardKpi', {
      atLeast: before + 1,
    });

    // 直接断数据面（W3 勘误轮询口径）：KPI 1,020→1,056、30→36、85.0→88.0。
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-completed')).toHaveText('1,056', {
      timeout: 15_000,
    });
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-scrapped')).toHaveText('36');
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-rate')).toHaveText('88.0');
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-planned')).toHaveText('1,200');

    // echarts series 整体相位右移（每点 +4）——数据面而非像素面证据。
    await expect
      .poll(async () => readTrendSeries(page), { timeout: 15_000 })
      .not.toEqual(seriesBefore);
    const seriesAfter = await readTrendSeries(page);
    expect(seriesAfter[0]).toBe(seriesBefore[0]! + 4);
    await assertTrackedPageErrors(page);
  });

  test('交互② echarts 点击 08:00 序列点 → 预警明细 dialog：drillHour 参数命中 + 行数匹配该时段异常数（2）', async ({
    page,
  }) => {
    await openM1(page);

    // 实例级 seam 驱动点击（live gap 见文件头注）：params.name = '08:00' —
    // renderer 桥接（events raw schema → dispatch evaluationBindings
    // `${event.name}`）由此全链验证；行数由 ARRAYFILTER 按小时过滤出 2 条。
    const clicked = await page.evaluate((instanceKey) => {
      const chart = (
        window as unknown as Record<
          string,
          {
            chart?: {
              getOption: () => { xAxis: Array<{ data: string[] }>; series: Array<{ data: number[] }> };
              trigger: (name: string, params: Record<string, unknown>) => void;
            };
          }
        >
      )[instanceKey]?.chart;
      if (!chart) return null;
      const option = chart.getOption();
      const hour = option.xAxis[0].data.find((label) => label === '08:00');
      if (!hour) return null;
      chart.trigger('click', {
        type: 'click',
        componentType: 'series',
        componentSubType: 'line',
        seriesType: 'line',
        seriesIndex: 0,
        name: hour,
        value: option.series[0].data[option.xAxis[0].data.indexOf(hour)],
      });
      return hour;
    }, TREND_INSTANCE_KEY);
    expect(clicked, 'trend instance must expose the 08:00 category point').toBe('08:00');

    const dialog = page.getByTestId('mes-shopfloor-board-drill-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText('08:00 时段预警明细');
    const drillTable = page.getByTestId('mes-shopfloor-board-drill-table');
    await expect(drillTable.locator('tbody tr')).toHaveCount(2, { timeout: 10_000 });
    await expect(drillTable.locator('tbody tr').first()).toContainText('SMT-01 贴片线');
    await expect(drillTable.locator('tbody tr').nth(1)).toContainText('AOI-02 检测站');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互③ scada 工位组态渲染：engine.getSymbols() 工位子树 + setPointValues 注入 getPointValue 生效', async ({
    page,
  }) => {
    await openM1(page);
    const handleKey = await openScadaHandle(page);

    interface ScadaHandleShape {
      engine: {
        getSymbols(): Array<{ id: string; definition?: { type?: string } }>;
      };
      getPointValue(pointId: string): number | undefined;
      setPointValues?: (values: Record<string, number>) => void;
    }

    // 工位组态叶子图元（scada-group 子树 9 图元 + 顶层标题 = 10 leaves），
    // 类型集覆盖 D3 §2.4 符号清单四族（rect/text/motor/indicator）。
    const scene = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, ScadaHandleShape | undefined>)[key];
      if (!handle) return null;
      const leaves = handle.engine.getSymbols();
      return {
        count: leaves.length,
        types: [...new Set(leaves.map((leaf) => leaf.definition?.type).filter(Boolean))],
        ids: leaves.map((leaf) => leaf.id),
      };
    }, handleKey);
    expect(scene, 'scada test handle must expose the scene tree').not.toBeNull();
    expect(scene!.count).toBeGreaterThanOrEqual(10);
    for (const expected of [
      'scada-rect',
      'scada-text',
      'scada-device-motor',
      'scada-sensor-control-indicator',
    ]) {
      expect(scene!.types, `scene tree should contain ${expected}`).toContain(expected);
    }
    // 叶子 id = 组态节点 id（scada-demo getSymbol('pump-1') 先例）；scada-group
    // 作为容器图元同入 getSymbols（live 探针 2026-10-30：11 leaves 含
    // shopfloor-line-a + 10 子图元）。
    for (const leafId of [
      'shopfloor-line-a',
      'zone-a-bg',
      'station-a-motor',
      'station-b-motor',
      'board-title',
    ]) {
      expect(scene!.ids, `scene leaves should contain ${leafId}`).toContain(leafId);
    }

    // §5.4：setPointValues 注入后 getPointValue 生效（dev/test 批量注入通道）。
    const pointValue = await page.evaluate((key) => {
      const handle = (window as unknown as Record<string, ScadaHandleShape | undefined>)[key];
      if (!handle?.setPointValues) return null;
      handle.setPointValues({ stationAlarm: 1 });
      return handle.getPointValue('stationAlarm');
    }, handleKey);
    expect(pointValue, 'setPointValues injection must be readable').toBe(1);
    await assertTrackedPageErrors(page);
  });

  test('交互④ 错误分支：failNextMutation → KPI_UNAVAILABLE 拒绝 toast + 刷新计数 +1 + 数据面保持相位 1', async ({
    page,
    allowPageErrors,
    allowConsoleErrors,
  }) => {
    // The failed refresh surfaces a runtime Api-response error rejection
    // (createApiResponseError) on BOTH error channels in addition to the
    // handled onError toast — expected noise for the failure-face exercise
    // (C3 ④b allowConsoleErrors precedent).
    allowPageErrors(1);
    allowConsoleErrors(1);
    await openM1(page);

    // 先让首帧正常落地（相位 1），再 mid-session 翻钩子（W3 forceReconDrift
    // 同款：readOptInHooks 在请求时读取，运行中改写即生效）。
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-completed')).toHaveText('1,020', {
      timeout: 15_000,
    });
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, { failNextMutation?: boolean }>)
        .__replMesTestHooks;
      if (hooks) hooks.failNextMutation = true;
    });
    const before = await callCount(page, 'ReplMes__dashboardKpi');

    await page.getByTestId('mes-shopfloor-board-refresh').click();
    await expect(page.getByText('KPI 数据暂不可用（KPI_UNAVAILABLE）')).toBeVisible({
      timeout: 10_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__dashboardKpi', {
      atLeast: before + 1,
    });

    // 静默轮询语义：失败帧不覆盖数据面（相位 1 数据保持）。
    await expect(kpiValue(page, 'mes-shopfloor-board-kpi-completed')).toHaveText('1,020');
    // 无 assertTrackedPageErrors——本测的运行时错误噪声已按上方 allowance 登记，
    // 测试收尾由 errorMonitor 的 within-allowance 校验兜底（C3 ④b 同款）。
  });

  test('focus ① Tab 首站落入页内首交互元素（手动刷新；live 缺口如实登记：stat-tile 无 tabindex 不可聚焦）', async ({
    page,
  }) => {
    // D3 §5.4 focus ① 「tab 首站达第一个 stat-tile」：live stat-tile 渲染为纯
    // div 组合（stat-tile-renderer.tsx 无 tabindex/role），KPI tile 本体不可
    // Tab 聚焦——按 C3 focus ② 同族纪律退守为「Tab 链在页面根内命中下一个
    // 交互元素（手动刷新按钮）」，缺口登记组件 owner a11y 观察项。
    await openM1(page);

    const activeInside = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const root = document.querySelector('[data-testid="mes-shopfloor-board-root"]');
        if (!active || !root || !root.contains(active)) return null;
        if (active.closest('[data-testid="mes-shopfloor-board-refresh"]')) return 'refresh-button';
        return active.getAttribute('data-testid') ?? active.tagName;
      });

    let landed: string | null = null;
    for (let i = 0; i < 120 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeInside();
    }
    expect(landed).toBe('refresh-button');
    await assertTrackedPageErrors(page);
  });

  test('focus ② 下钻 dialog 焦点入面板、Esc 关闭、焦点回文档（钻取触发非可焦 trigger 退守口径）', async ({
    page,
  }) => {
    await openM1(page);

    // 与交互② 同一实例级 seam 驱动下钻（live gap 见文件头注）。
    await page.evaluate((instanceKey) => {
      const chart = (
        window as unknown as Record<
          string,
          {
            chart?: {
              getOption: () => { xAxis: Array<{ data: string[] }>; series: Array<{ data: number[] }> };
              trigger: (name: string, params: Record<string, unknown>) => void;
            };
          }
        >
      )[instanceKey]?.chart;
      if (!chart) return;
      const option = chart.getOption();
      const index = option.xAxis[0].data.indexOf('08:00');
      chart.trigger('click', {
        type: 'click',
        componentType: 'series',
        componentSubType: 'line',
        seriesType: 'line',
        seriesIndex: 0,
        name: option.xAxis[0].data[index],
        value: option.series[0].data[index],
      });
    }, TREND_INSTANCE_KEY);

    const dialog = page.getByTestId('mes-shopfloor-board-drill-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 焦点入面（Base UI 聚焦 popup 或首个可焦元素）；画布点击的钻取触发非可焦
    // trigger，Esc 回腿退守「焦点回文档内」（C3 focus ③ 同族退守）。
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
    const focusSettledInDocument = await page.evaluate(() => {
      const active = document.activeElement;
      return !!active && (active === document.body || document.contains(active));
    });
    expect(focusSettledInDocument).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ notice-bar closable 关闭钮 Tab 可达', async ({ page }) => {
    await openM1(page);

    await expect(page.getByTestId('mes-shopfloor-board-notice')).toBeVisible();
    // 关闭钮本体存在性先行（closable 路由证据），再走 Tab 链。
    await expect(
      page.getByTestId('mes-shopfloor-board-notice').locator('[data-slot="notice-bar-close"]'),
    ).toBeVisible();

    const reachedClose = await (async () => {
      for (let i = 0; i < 200; i += 1) {
        await page.keyboard.press('Tab');
        const on = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          return active?.closest('[data-slot="notice-bar-close"]') != null;
        });
        if (on) return true;
      }
      return false;
    })();
    expect(reachedClose, 'tab chain must reach the notice-bar close button').toBe(true);
    await assertTrackedPageErrors(page);
  });
});
