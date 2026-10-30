import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  dragReplicationCard,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';
import { getComputedStyleValue } from './helpers/visual-assert.js';

// Plan 801 — C1 CRM 商机漏斗看板页 focused e2e (D2 §5 C1 断言清单 ①-⑥ + D2
// §3.3 义务①②③ C1 侧). Pillar one (programmatic interactions, __replCrmCalls
// evidence) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A single registration — desktop page).
//
// 义务① (moveStage 绑定): drag → counter +1 + lastMoveStageBody field-by-field.
// 义务② (footer 统计带三处各断言): kanban columnAggregate 列头带 + footer
// stat-tile×3 差值 + table affixRow 刷新.
// 义务③ (G2 请求体): lastMoveStageBody 逐字段 (契约层载体 =
// scheduling 包 kanban-dnd-integration 单测).
//
// Seed math (mock-backend-repl-crm deterministic fixtures, 26 leads / 6 stages):
//   revenue(i) = 30 + ((i*7) % 10) * 10  → cycle 100,70,40,110,80,50,120,90,60,30
//   stage ranges: s1 1-6, s2 7-11, s3 12-16, s4 17-20, s5 21-23, s6(won) 24-26
//   column sums: 450 / 400 / 350 / 300 / 210 / 240; totalAmount 1950.

const COUNTERS_KEY = '__replCrmCalls';
const HOOKS_KEY = '__replCrmTestHooks';

const BOARD = '[data-testid="crm-opportunity-kanban-board"]';
const COLUMN = (stageId: string) =>
  `${BOARD} [data-slot="kanban-column"][data-column-id="${stageId}"]`;
const CARD = (leadId: string) => `${BOARD} [data-card-id="${leadId}"]`;
const AGGREGATE = (stageId: string) =>
  `${COLUMN(stageId)} [data-slot="kanban-column-aggregate"]`;
const LIST = '[data-testid="crm-opportunity-kanban-list"]';

function affixCells(page: Page) {
  return page.locator(`${LIST} [data-slot="table-summary-row-affix"] [data-slot="table-summary-cell"]`);
}

/** stat-tile numeric slot (the ￥ prefix renders in a sibling slot). */
function kpiValue(page: Page, testid: string) {
  return page.getByTestId(testid).locator('[data-slot="stat-tile-value"]');
}

/** Column aggregates of the seed (see header math). */
const SEED_COLUMN_SUMS: Record<string, number> = {
  'stage-0001': 450,
  'stage-0002': 400,
  'stage-0003': 350,
  'stage-0004': 300,
  'stage-0005': 210,
  'stage-0006': 240,
};
const SEED_TOTAL_AMOUNT = 1950;
const SEED_WON_AMOUNT = 240;
const SEED_TOTAL_LEADS = 26;

// Affix cells are indexed by column position: customerName(0)/stageName(1)/
// probability(2)/ownerName(3)/expectedRevenue(4) — the wonAmount cell binds to
// stageName, the totalAmount cell to expectedRevenue.
const AFFIX_WON_CELL = 1;
const AFFIX_TOTAL_CELL = 4;

test.describe('C1 CRM 商机漏斗看板页 (#/complex-pages/crm-opportunity-kanban)', () => {
  // Six kanban columns must sit beside the 240px showcase sidebar at once: the
  // board CSS clamps columns to min-width 280px (columnWidth < 280 is
  // unreachable), so 6×280 + gaps + padding needs a ~2124px content width.
  test.use({ viewport: { width: 2160, height: 1050 } });

  async function openC1(page: Page): Promise<void> {
    await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
    await openReplicationPage(page, 'crm-opportunity-kanban', {
      title: 'CRM 商机漏斗看板页',
    });
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  function lastMoveStageBody(page: Page): Promise<Record<string, unknown>> {
    return page.evaluate(
      () =>
        ((window as unknown as Record<string, Record<string, unknown>>).__replCrmTestHooks ?? {})
          .lastMoveStageBody ?? {},
    );
  }

  function lastUpdateRevenueBody(page: Page): Promise<Record<string, unknown>> {
    return page.evaluate(
      () =>
        ((window as unknown as Record<string, Record<string, unknown>>).__replCrmTestHooks ?? {})
          .lastUpdateRevenueBody ?? {},
    );
  }

  async function callCount(page: Page, endpoint: string): Promise<number> {
    return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
  }

  test('交互断言前置：六阶段动态列渲染（stageFindPage sequence 序）、26 卡分布、列头金额合计、统计带初始值', async ({
    page,
  }) => {
    await openC1(page);

    // stageFindPage feeds the stage caption; its sequence order is the column order.
    await expect(page.getByTestId('crm-opportunity-kanban-stage-caption')).toContainText(
      '销售阶段（stageFindPage）：6 个',
    );
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__stageFindPage', { atLeast: 1 });

    const columns = page.locator(`${BOARD} [data-slot="kanban-column"]`);
    await expect(columns).toHaveCount(6);
    const columnIds = await columns.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-column-id')),
    );
    expect(columnIds).toEqual([
      'stage-0001',
      'stage-0002',
      'stage-0003',
      'stage-0004',
      'stage-0005',
      'stage-0006',
    ]);

    // 26 leads across the board: 6/5/5/4/3/3 per stage; the won column is
    // titled with the 赢单 marker (mock isWonStage).
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`)).toHaveCount(SEED_TOTAL_LEADS);
    const expectedCounts = [6, 5, 5, 4, 3, 3];
    for (const [index, stageId] of columnIds.entries()) {
      await expect(page.locator(`${COLUMN(stageId)} [data-slot="kanban-card"]`)).toHaveCount(
        expectedCounts[index],
      );
    }
    await expect(page.locator(COLUMN('stage-0006'))).toContainText('赢单成交（赢单）');

    // 义务② 第一处 — kanban columnAggregate 列头带：sum(expectedRevenue) 逐列命中
    // 种子金额和（D2 §5 交互⑤）。
    for (const [stageId, sum] of Object.entries(SEED_COLUMN_SUMS)) {
      await expect(page.locator(AGGREGATE(stageId))).toContainText('金额');
      await expect(page.locator(AGGREGATE(stageId))).toContainText(String(sum));
    }

    // 义务② 第二处 — footer stat-tile×3 ← funnelSummary 初始值。
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-total')).toHaveText('1,950');
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-won')).toHaveText('240');
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-leads')).toHaveText('26');

    // 义务② 第三处 — table affixRow 统计行初始值（totalAmount / wonAmount）。
    await expect(page.locator(`${LIST} tbody tr`)).toHaveCount(SEED_TOTAL_LEADS);
    await expect(affixCells(page).nth(AFFIX_TOTAL_CELL)).toHaveText(String(SEED_TOTAL_AMOUNT));
    await expect(affixCells(page).nth(AFFIX_WON_CELL)).toHaveText(String(SEED_WON_AMOUNT));

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__opportunityBoard', { atLeast: 1 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__funnelSummary', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① 拖卡 lead-0001 至赢单列 → moveStage +1 + lastMoveStageBody 逐字段 + 列迁移 + 统计带三处差值（义务①②③）', async ({
    page,
  }) => {
    await openC1(page);

    const moveBefore = await callCount(page, 'ReplCrm__moveStage');

    // Real pointer drag (replication.ts helper): first 线索录入 card → won
    // column. Forward move INTO the won stage is the sanctioned path; moves
    // OUT of it are the read-only rejection branch (交互⑥).
    await dragReplicationCard(
      page,
      page.locator(CARD('lead-0001')),
      page.locator(COLUMN('stage-0006')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__moveStage', {
      atLeast: moveBefore + 1,
    });

    // 义务③ (G2) — request body asserted FIELD BY FIELD: leadId = dragged
    // card id; fromStageId = source column; toStageId = target column.
    expect(await lastMoveStageBody(page)).toEqual({
      leadId: 'lead-0001',
      fromStageId: 'stage-0001',
      toStageId: 'stage-0006',
    });

    // 列迁移: the ajax `then` refreshed oppBoard, the mock mutated session
    // state → the card re-renders inside the won column.
    await expect(page.locator(CARD('lead-0001'))).toHaveAttribute('data-column-id', 'stage-0006', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('stage-0001')} [data-slot="kanban-card"]`)).toHaveCount(5, {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('stage-0006')} [data-slot="kanban-card"]`)).toHaveCount(4, {
      timeout: 15_000,
    });

    // 义务② 列头带差值: source column 450 → 350, won column 240 → 340
    // (Δ = lead-0001's ￥100 万).
    await expect(page.locator(AGGREGATE('stage-0001'))).toContainText('350', { timeout: 15_000 });
    await expect(page.locator(AGGREGATE('stage-0006'))).toContainText('340', { timeout: 15_000 });

    // 义务② stat-tile×3 差值: won +100, total/leads unchanged.
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-won')).toHaveText('340', {
      timeout: 15_000,
    });
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-total')).toHaveText('1,950');
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-leads')).toHaveText('26');

    // 义务② affixRow 刷新: won cell 240 → 340, total cell unchanged.
    await expect(affixCells(page).nth(AFFIX_WON_CELL)).toHaveText('340', { timeout: 15_000 });
    await expect(affixCells(page).nth(AFFIX_TOTAL_CELL)).toHaveText(String(SEED_TOTAL_AMOUNT));
    await assertTrackedPageErrors(page);
  });

  test('交互② 非法回退拖卡 → mock 守卫 status:1 拒绝 + 错误 toast 可见 + 卡片不迁移', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected move reports its ActionResult through onActionError
    // (console.error) — expected noise, W2 ② precedent.
    allowConsoleErrors(1);
    await openC1(page);

    const moveBefore = await callCount(page, 'ReplCrm__moveStage');

    // lead-0007 sits in stage-0002 (￥120 万); dragging it BACK to 线索录入
    // hits the one-way (sequence-increase) guard.
    await dragReplicationCard(
      page,
      page.locator(CARD('lead-0007')),
      page.locator(COLUMN('stage-0001')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__moveStage', {
      atLeast: moveBefore + 1,
    });
    expect(await lastMoveStageBody(page)).toEqual({
      leadId: 'lead-0007',
      fromStageId: 'stage-0002',
      toStageId: 'stage-0001',
    });

    // 错误 toast 可见 (schema onCardMove onError static message).
    await expect(
      page.getByText('商机阶段流转被拒绝（不允许回退或赢单列只读）'),
    ).toBeVisible({ timeout: 10_000 });

    // 卡片不迁移: the onError refreshSource re-seeds the board from server
    // truth — lead-0007 stays in stage-0002 and the column sums are unchanged.
    await expect(page.locator(CARD('lead-0007'))).toHaveAttribute('data-column-id', 'stage-0002', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('stage-0002')} [data-slot="kanban-card"]`)).toHaveCount(5);
    await expect(page.locator(AGGREGATE('stage-0002'))).toContainText('400');
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejection's console entry.
  });

  test('交互③ quick-edit 金额 → updateRevenue +1 + 单元格新值 + affixRow/stat-tile/列头带同步刷新', async ({
    page,
  }) => {
    await openC1(page);

    const revenueBefore = await callCount(page, 'ReplCrm__updateRevenue');

    // First table row = lead-0001 (￥100 万). Table-level quickSaveAction puts
    // the row in row-draft mode: the inline cell renders an always-mounted
    // input, and the per-row save bar appears in the trailing cell once dirty.
    const firstRow = page.locator(`${LIST} tbody tr`).first();
    await expect(firstRow).toContainText('南方电网科技·01');
    const revenueInput = firstRow.locator('[data-slot="table-quick-edit"] input');
    await expect(revenueInput).toHaveValue('100');
    await revenueInput.fill('180');

    const saveBar = firstRow.locator('[data-slot="table-row-save-bar"]');
    await expect(saveBar).toBeVisible({ timeout: 5_000 });
    await saveBar.locator('button').last().click();

    await expect(page.getByText('预期金额已更新')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__updateRevenue', {
      atLeast: revenueBefore + 1,
    });
    expect(await lastUpdateRevenueBody(page)).toEqual({
      leadId: 'lead-0001',
      expectedRevenue: '180',
    });

    // The then-chain refreshed oppBoard: the cell re-syncs to the committed
    // value and the board column aggregate picks up +80.
    await expect(revenueInput).toHaveValue('180', { timeout: 15_000 });
    await expect(page.locator(AGGREGATE('stage-0001'))).toContainText('530', { timeout: 15_000 });

    // 义务② affixRow 刷新: total 1950 → 2030, won unchanged 240.
    await expect(affixCells(page).nth(AFFIX_TOTAL_CELL)).toHaveText('2030', { timeout: 15_000 });
    await expect(affixCells(page).nth(AFFIX_WON_CELL)).toHaveText(String(SEED_WON_AMOUNT));

    // footer stat-tile delta: 1,950 → 2,030 (千分位 formatter).
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-total')).toHaveText('2,030', {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互④ 概率徽章三色 —— success/warning/neutral 徽章标签与计算背景色两两不同', async ({
    page,
  }) => {
    await openC1(page);

    const badge = (level: string) =>
      page.locator(`${BOARD} [data-slot="status-badge"][data-level="${level}"]`).first();
    await expect(badge('success')).toHaveText('概率高');
    await expect(badge('warning')).toHaveText('概率中等');
    await expect(badge('neutral')).toHaveText('概率低');

    // Programmatic color proof: the three semantic levels resolve to three
    // distinct computed background colors (getComputedStyle, D2 §5 交互④).
    const successColor = await getComputedStyleValue(badge('success'), 'background-color');
    const warningColor = await getComputedStyleValue(badge('warning'), 'background-color');
    const neutralColor = await getComputedStyleValue(badge('neutral'), 'background-color');
    expect(successColor).not.toBe(warningColor);
    expect(successColor).not.toBe(neutralColor);
    expect(warningColor).not.toBe(neutralColor);
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ 阶段金额漏斗（chart bar 近似）渲染 —— 6 根 bar 与 funnelSummary stages 对齐', async ({
    page,
  }) => {
    await openC1(page);

    const chart = page.getByTestId('crm-opportunity-kanban-funnel-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
    await expect(chart).toContainText('阶段金额漏斗');

    // recharts bar surfaces: one rectangle per stage amount (6 stages, funnel
    // order = sequence DESC per the G1 approximation), each carrying a filled
    // path — the programmatic "bar 渲染" proof.
    await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(6);
    const barPaths = chart.locator('.recharts-bar-rectangle path');
    for (let i = 0; i < 6; i += 1) {
      await expect(barPaths.nth(i)).toHaveAttribute('fill', /.+/);
    }
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__funnelSummary', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互⑥ 赢单列只读 —— 赢单卡外拖被守卫拒绝 + 错误 toast + 卡片不迁移', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openC1(page);

    const moveBefore = await callCount(page, 'ReplCrm__moveStage');

    // lead-0024 sits in the won column; ANY move out of it hits the
    // `won stage read-only` guard (D2 §4.2 赢单禁迁).
    await dragReplicationCard(
      page,
      page.locator(CARD('lead-0024')),
      page.locator(COLUMN('stage-0005')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__moveStage', {
      atLeast: moveBefore + 1,
    });
    await expect(
      page.getByText('商机阶段流转被拒绝（不允许回退或赢单列只读）'),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator(CARD('lead-0024'))).toHaveAttribute('data-column-id', 'stage-0006', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('stage-0006')} [data-slot="kanban-card"]`)).toHaveCount(3);
    await expect(kpiValue(page, 'crm-opportunity-kanban-kpi-won')).toHaveText('240');
  });

  test('focus ① 板首站 —— Tab 可达看板首卡片', async ({ page }) => {
    await openC1(page);

    const activeCardId = () =>
      page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const board = document.querySelector('[data-testid="crm-opportunity-kanban-board"]');
        if (!active || !board || !board.contains(active)) return null;
        return active.getAttribute('data-card-id');
      });

    let landed: string | null = null;
    for (let i = 0; i < 150 && landed === null; i += 1) {
      await page.keyboard.press('Tab');
      landed = await activeCardId();
    }
    expect(landed, 'tab must reach a kanban card on the board').toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('focus ② quick-edit 焦点入输入框、行保存条提交触发保存、单元格保持可再聚焦', async ({
    page,
  }) => {
    await openC1(page);

    const firstRow = page.locator(`${LIST} tbody tr`).first();
    const revenueInput = firstRow.locator('[data-slot="table-quick-edit"] input');
    await expect(revenueInput).toBeVisible({ timeout: 15_000 });

    // Focus enters the editor and stays through typing (dirty state).
    await revenueInput.click();
    await expect(revenueInput).toBeFocused();
    await revenueInput.fill('160');
    await expect(revenueInput).toBeFocused();

    const revenueBefore = await callCount(page, 'ReplCrm__updateRevenue');
    const saveBar = firstRow.locator('[data-slot="table-row-save-bar"]');
    await expect(saveBar).toBeVisible({ timeout: 5_000 });
    await saveBar.locator('button').last().click();
    await expect(page.getByText('预期金额已更新')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__updateRevenue', {
      atLeast: revenueBefore + 1,
    });

    // 提交后返回: the inline quick-edit has no dialog surface — after the save
    // the (now clean) row save bar unmounts and focus falls back to body; the
    // editor must remain reachable and re-focusable (live退守, same family as
    // W2 focus③; dialog-focus-return stays with the dialog family helper).
    await expect(revenueInput).toHaveValue('160', { timeout: 15_000 });
    await revenueInput.click();
    await expect(revenueInput).toBeFocused();
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 拖拽把手 keyboard 可达 —— Space 拾起 + ArrowRight 键序移动（live 缺口如实登记：async 数据看板键盘层未挂载）', async ({
    page,
  }) => {
    // Live gap (recorded per the "如组件支持否则如实记录" clause): the kanban
    // card IS tab-reachable and focusable, but the Space/Arrow keyboard-reorder
    // layer never engages on async-data boards — boardRef captures null on the
    // empty first render (columns=0 before the data-source resolves, the kanban
    // empty-state early-return renders no ref'd root) and the board-effects
    // keydown listener never re-attaches when data arrives (stable effect deps).
    // The static-data demo board (#/kanban) works, which isolates the gap to
    // the async-data mounting path. Sibling of the kanban Ctrl+Z ratchet in
    // kanban-demo.spec.ts (R3.4/5.2-002 family) — component-owner surface.
    // Ratchet: while the gap is live this body fails as expected (suite stays
    // green); when the fix lands the body passes and the inversion turns red
    // until this annotation is removed.
    test.fail(true, 'kanban board-effects keyboard layer not engaged on async-data boards (see annotation)');
    await openC1(page);

    const card = page.locator(CARD('lead-0001'));
    await card.click();
    await expect(card).toBeFocused();

    await page.keyboard.press(' ');
    await expect(card).toHaveAttribute('data-keyboard-dragging', 'true');

    const moveBefore = await callCount(page, 'ReplCrm__moveStage');
    await page.keyboard.press('ArrowRight');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__moveStage', {
      atLeast: moveBefore + 1,
    });
    expect(await lastMoveStageBody(page)).toEqual({
      leadId: 'lead-0001',
      fromStageId: 'stage-0001',
      toStageId: 'stage-0002',
    });

    await page.keyboard.press('Escape');
    // The move persisted server-side: after the refresh the card settles in
    // stage-0002 (keyboard reorder drives the same onCardMove binding).
    await expect(page.locator(CARD('lead-0001'))).toHaveAttribute('data-column-id', 'stage-0002', {
      timeout: 15_000,
    });
  });
});
