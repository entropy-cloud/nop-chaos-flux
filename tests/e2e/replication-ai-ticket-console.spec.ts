import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  dragReplicationCard,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 807 — M3-K2 AI 工单处理台页 focused e2e (D3 §5.2 K2 断言清单忠实转写 +
// plan 侧补充断言 + focus 三项). Pillar one (programmatic interactions,
// __replAiCalls 计数证据) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A single registration — desktop page).
//
// Page shape (D3 §2.2 + live 裁定): kanban 六态看板（mock 端 BoardData 投影 —
// W2/C1 live 形态，mock owns column ordering）+ onCardMove 按目标列 when 路由
// ticketMutation（assign/start/resolve/close/reopen）+ ILLEGAL_TRANSITION 错误
// 守卫 toast + columnAggregate count 计数；详情 drawer：steps 状态轴（当前值 =
// status）/G9 SLA 静态剩余时长文本（mock 取数时一次性求值）/timeline 操作轨迹
// /G11 置信度门 alert/G12 ai-suggestions 推荐回复采用→setValues 写回 textarea→
// ticketReply；升级确认 dialog（plan 侧补充设计，R2 K2 映射弹窗依据）。
//
// Seed math (mock-backend-repl-ai-k2 deterministic fixtures, 28 tickets /
// 6 statuses): OPEN 6 (TCK-0001..0006), ASSIGNED 5 (0007..0011), PROCESSING 5
// (0012..0016), RESOLVED 4 (0017..0020), CLOSED 4 (0021..0024), REOPENED 4
// (0025..0028). TCK-0003 confidence 0.42 (G11 gate); TCK-0001 confidence 0.92
// (G12 chain + G9 +90min SLA window); CLOSED 工单不可 reopen（守卫样本）。

const COUNTERS_KEY = '__replAiCalls';
const HOOKS_KEY = '__replAiTestHooks';

const BOARD = '[data-testid="ai-ticket-console-kanban"]';
const COLUMN = (status: string) =>
  `${BOARD} [data-slot="kanban-column"][data-column-id="${status}"]`;
const CARD = (ticketId: string) => `${BOARD} [data-card-id="${ticketId}"]`;
const AGGREGATE = (status: string) =>
  `${COLUMN(status)} [data-slot="kanban-column-aggregate"]`;
const byTestid = (testid: string) => `[data-testid="${testid}"]`;
const KPI_VALUE = (testid: string) => `${byTestid(testid)} [data-slot="stat-tile-value"]`;

const DRAWER = '[data-slot="drawer-surface"]';
const STEPS = byTestid('ai-ticket-console-steps');
const SLA_TEXT = byTestid('ai-ticket-console-sla-text');
const TIMELINE = byTestid('ai-ticket-console-timeline');
const TIMELINE_ITEM = '[data-slot="timeline-item"]';
const CONFIDENCE_GATE = byTestid('ai-ticket-console-confidence-gate');
const SUGGESTION_PILL = '[data-slot="ai-suggestions-item"]';
const REPLY_INPUT = `${byTestid('ai-ticket-console-reply-input')} textarea`;
const ESCALATE_BUTTON = byTestid('ai-ticket-console-escalate');

/** Column aggregates of the seed (see header math). */
const SEED_COLUMN_COUNTS: Record<string, number> = {
  OPEN: 6,
  ASSIGNED: 5,
  PROCESSING: 5,
  RESOLVED: 4,
  CLOSED: 4,
  REOPENED: 4,
};

async function openK2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'ai-ticket-console', {
    title: 'AI 工单处理台页',
  });
  await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

function lastHookBody(page: Page, key: string): Promise<Record<string, unknown>> {
  return page.evaluate(
    (hookKey) =>
      ((window as unknown as Record<string, Record<string, Record<string, unknown> | undefined>>)
        .__replAiTestHooks ?? {})[hookKey] ?? {},
    key,
  );
}

/** Open the detail drawer for a ticket via the real user path (card click). */
async function openTicketDrawer(page: Page, ticketId: string): Promise<void> {
  await page.locator(CARD(ticketId)).click();
  await expect(page.locator(DRAWER)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(STEPS)).toBeVisible({ timeout: 10_000 });
}

test.describe('K2 AI 工单处理台页 (#/complex-pages/ai-ticket-console)', () => {
  // Six kanban columns must sit beside the 240px showcase sidebar at once:
  // plan 848 U3 F-K2-1 widened columns to 340px (column titles were being
  // truncated at 280px); 6×340 + gaps + padding needs a ~2520px viewport so
  // every column (incl. drag targets) stays inside the viewport.
  // Adjudicated U3: physical precondition only — no assertion weakened.
  test.use({ viewport: { width: 2520, height: 1050 } });

  test('前置：六态列渲染（28 卡分布）、columnAggregate 工单计数、stat-tile×4 初始值、ticketFindPage 计数', async ({
    page,
  }) => {
    await openK2(page);

    const columns = page.locator(`${BOARD} [data-slot="kanban-column"]`);
    await expect(columns).toHaveCount(6);
    const columnIds = await columns.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-column-id')),
    );
    expect(columnIds).toEqual([
      'OPEN',
      'ASSIGNED',
      'PROCESSING',
      'RESOLVED',
      'CLOSED',
      'REOPENED',
    ]);

    // 28 tickets across the board: 6/5/5/4/4/4 per status.
    await expect(page.locator(`${BOARD} [data-slot="kanban-card"]`)).toHaveCount(28);
    for (const [status, count] of Object.entries(SEED_COLUMN_COUNTS)) {
      await expect(page.locator(`${COLUMN(status)} [data-slot="kanban-card"]`)).toHaveCount(count);
      await expect(page.locator(AGGREGATE(status))).toContainText('工单');
      await expect(page.locator(AGGREGATE(status))).toContainText(String(count));
    }

    // stat-tile×4 ← ticketFindPage.stats 初始值。
    await expect(page.locator(KPI_VALUE('ai-ticket-console-kpi-open'))).toHaveText('6');
    await expect(page.locator(KPI_VALUE('ai-ticket-console-kpi-sla'))).toHaveText('4');
    await expect(page.locator(KPI_VALUE('ai-ticket-console-kpi-resolved'))).toHaveText('4');
    await expect(page.locator(KPI_VALUE('ai-ticket-console-kpi-response'))).toHaveText('26');

    // board + rows 两个 data-source 同端点取数（W2 waveFindPage/waveBoard
    // 同端点双源先例并入五端点约束）。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketFindPage', { atLeast: 2 });
    await assertTrackedPageErrors(page);
  });

  test('拖卡路由① TCK-0001 OPEN→ASSIGNED → ticketMutation +1 + lastTicketMutationBody 逐字段 + 卡片迁移 + columnAggregate 计数更新', async ({
    page,
  }) => {
    await openK2(page);

    const mutationBefore = await callCount(page, 'ReplAi__ticketMutation');

    // Real pointer drag (replication.ts helper): first 待受理 card → 已派单列。
    await dragReplicationCard(
      page,
      page.locator(CARD('TCK-0001')),
      page.locator(COLUMN('ASSIGNED')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketMutation', {
      atLeast: mutationBefore + 1,
    });
    // 请求体逐字段：id = 拖动卡工单号，mutation = 目标列路由动作。
    expect(await lastHookBody(page, 'lastTicketMutationBody')).toEqual({
      id: 'TCK-0001',
      mutation: 'assign',
    });

    // 卡片迁移: ajax then 链 refreshSource ticketBoard → mock session 已变异
    // → 卡片重渲进目标列。
    await expect(page.locator(CARD('TCK-0001'))).toHaveAttribute('data-column-id', 'ASSIGNED', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('OPEN')} [data-slot="kanban-card"]`)).toHaveCount(5, {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('ASSIGNED')} [data-slot="kanban-card"]`)).toHaveCount(6, {
      timeout: 15_000,
    });

    // columnAggregate 计数差值: OPEN 6 → 5, ASSIGNED 5 → 6。
    await expect(page.locator(AGGREGATE('OPEN'))).toContainText('5', { timeout: 15_000 });
    await expect(page.locator(AGGREGATE('ASSIGNED'))).toContainText('6', { timeout: 15_000 });

    // stat-tile 待派单差值: 6 → 5。
    await expect(page.locator(KPI_VALUE('ai-ticket-console-kpi-open'))).toHaveText('5', {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('拖卡路由② 非法迁移 CLOSED→REOPENED → mock 守卫 ILLEGAL_TRANSITION + toast 含关键词 + 卡片不迁移', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected move reports its ActionResult through onActionError
    // (console.error) — expected noise, C1 交互② precedent.
    allowConsoleErrors(1);
    await openK2(page);

    const mutationBefore = await callCount(page, 'ReplAi__ticketMutation');

    // TCK-0021 sits in CLOSED; dragging it to 已重开列 routes mutation=reopen,
    // but the mock guard only allows RESOLVED→REOPENED (CLOSED 是终态).
    await dragReplicationCard(
      page,
      page.locator(CARD('TCK-0021')),
      page.locator(COLUMN('REOPENED')),
    );

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketMutation', {
      atLeast: mutationBefore + 1,
    });
    expect(await lastHookBody(page, 'lastTicketMutationBody')).toEqual({
      id: 'TCK-0021',
      mutation: 'reopen',
    });

    // toast 含关键词 ILLEGAL_TRANSITION（schema onCardMove onError 静态文案）。
    await expect(
      page.getByText('迁移被拒绝（ILLEGAL_TRANSITION）：当前状态不允许该操作'),
    ).toBeVisible({ timeout: 10_000 });

    // 卡片不迁移: onError refreshSource 以服务端真值回种 — TCK-0021 留在
    // CLOSED，列计数不变。
    await expect(page.locator(CARD('TCK-0021'))).toHaveAttribute('data-column-id', 'CLOSED', {
      timeout: 15_000,
    });
    await expect(page.locator(`${COLUMN('CLOSED')} [data-slot="kanban-card"]`)).toHaveCount(4);
    await expect(page.locator(`${COLUMN('REOPENED')} [data-slot="kanban-card"]`)).toHaveCount(4);
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejection's console entry.
  });

  test('详情① steps 状态轴当前值 = status 映射 + timeline 操作日志（含操作人/actionType）', async ({
    page,
  }) => {
    await openK2(page);

    // TCK-0012 is PROCESSING (trajectory: create → assign → start).
    await openTicketDrawer(page, 'TCK-0012');

    // steps 当前值映射：PROCESSING 步进项携带 data-current，其余不带。
    const stepItem = (key: string) => page.locator(`${STEPS} [data-slot="steps-item"][data-item-key="${key}"]`);
    await expect(stepItem('PROCESSING')).toHaveAttribute('data-current', 'true');
    for (const key of ['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED']) {
      await expect(stepItem(key)).not.toHaveAttribute('data-current');
    }

    // timeline 操作日志：PROCESSING 轨迹 3 条，每条含操作人与 actionType 字面。
    const items = page.locator(`${TIMELINE} ${TIMELINE_ITEM}`);
    await expect(items).toHaveCount(3, { timeout: 15_000 });
    await expect(items.first()).toContainText('create');
    await expect(items.first()).toContainText('系统');
    await expect(page.locator(TIMELINE)).toContainText('派单（assign）');
    await expect(page.locator(TIMELINE)).toContainText('开始处理（start）');
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketActionFind', { atLeast: 1 });

    // G9 SLA 静态文本在位（差值口径单独断言，见 G9 用例）。
    await expect(page.locator(SLA_TEXT)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('G12 采用链路：点推荐回复 → textarea 写回 item.text → 提交 ticketReply +1（请求体逐字段）', async ({
    page,
  }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0001');

    // 推荐回复 2 枚（suggestionFind 计数证据）。
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__suggestionFind', { atLeast: 1 });
    const pills = page.locator(`${byTestid('ai-ticket-console-suggestions')} ${SUGGESTION_PILL}`);
    await expect(pills).toHaveCount(2, { timeout: 15_000 });

    // 点第一枚 → setValues 写回 textarea（G12 写回链）+ 成功 toast。
    const adopted = await pills.first().locator('[data-slot="ai-suggestions-item-text"]').innerText();
    await pills.first().click();
    await expect(page.getByText('已采用 AI 推荐回复')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(REPLY_INPUT)).toHaveValue(adopted, { timeout: 10_000 });

    // 非低置信度工单（TCK-0001 confidence 0.92）：G11 门不出现。
    await expect(page.locator(CONFIDENCE_GATE)).toHaveCount(0);

    // 提交 → ticketReply +1 + 请求体逐字段。
    const replyBefore = await callCount(page, 'ReplAi__ticketReply');
    await page.getByTestId('ai-ticket-console-reply-submit').click();
    await expect(page.getByText('回复已提交')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketReply', {
      atLeast: replyBefore + 1,
    });
    expect(await lastHookBody(page, 'lastTicketReplyBody')).toEqual({
      ticketId: 'TCK-0001',
      reply: adopted,
    });

    // then 链刷新操作日志：timeline 追加「回复客户」节点。
    await expect(
      page.locator(`${TIMELINE} ${TIMELINE_ITEM}`).filter({ hasText: '回复客户' }),
    ).toHaveCount(1, { timeout: 15_000 });
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('G11 置信度门：TCK-0003 confidence 0.42 < 0.6 → confidence-gate alert 可见', async ({
    page,
  }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0003');

    const gate = page.locator(CONFIDENCE_GATE);
    await expect(gate).toBeVisible({ timeout: 15_000 });
    await expect(gate).toContainText('AI 置信度低于门限，建议人工接管后回复');

    // 低置信度工单的推荐回复仍在（门 = 提示人工接管，不隐藏建议）。
    await expect(
      page.locator(`${byTestid('ai-ticket-console-suggestions')} ${SUGGESTION_PILL}`),
    ).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('G9 SLA 静态口径：剩余分钟文本与 mock deadline（+90min）差值一致（容忍 <60s）', async ({
    page,
  }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0001');

    const slaText = await page.locator(SLA_TEXT).innerText();
    const match = slaText.match(/剩余约 (\d+) 分钟/);
    expect(match, `SLA text must carry a remaining-minutes figure: ${slaText}`).toBeTruthy();
    const remaining = Number(match![1]);
    // mock 在取数时求值 deadline - now（deadline = 会话创建 now + 90min），
    // 渲染静态文本一次性快照 — 与 90 分钟差值容忍 <60s（±1 分钟取整）。
    expect(Math.abs(remaining - 90), `remaining ${remaining} must track the +90min window`).toBeLessThanOrEqual(1);
    // 截止时刻一并渲染（deadline 展示面）。
    expect(slaText).toContain('截止');
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('确认 dialog（plan 侧补充）：焦点入面/Esc 返回 + 确认升级 → ticketMutation +1（mutation=escalate 逐字段）', async ({
    page,
  }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0001');

    // 弹窗焦点往返（R2 K2 映射弹窗 = dialog）：入面落焦 + Esc 返回升级按钮。
    const trigger = page.locator(ESCALATE_BUTTON);
    await assertDialogFocusRoundTrip(page, trigger, { surfaceSlot: 'dialog-surface' });

    // 再开确认 → 确认升级 → ticketMutation escalate +1 + 请求体逐字段 + toast。
    const mutationBefore = await callCount(page, 'ReplAi__ticketMutation');
    await trigger.click();
    await expect(page.locator('[data-slot="dialog-surface"]').last()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId('ai-ticket-console-escalate-confirm').click();
    await expect(page.getByText('工单已升级')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__ticketMutation', {
      atLeast: mutationBefore + 1,
    });
    expect(await lastHookBody(page, 'lastTicketMutationBody')).toEqual({
      id: 'TCK-0001',
      mutation: 'escalate',
    });
    // closeOnSubmit → 确认后弹窗关闭，drawer 保留。
    await expect(page.locator('[data-slot="dialog-surface"]')).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(page.locator(DRAWER)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });

  test('要素⑥⑧（plan 819 P1）AI 自动分类/定级可人工改写 + 内部备注 → ticketMutation classify 逐字段', async ({ page }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0002');

    // TCK-0002: index 2 → AI 分类「订单与物流」、定级 MID（K2_CATEGORIES/K2_PRIORITIES 序）。
    await expect(page.getByTestId('ai-ticket-console-ai-category')).toContainText('AI 自动分类：订单与物流');
    await expect(page.getByTestId('ai-ticket-console-ai-category')).toContainText('AI 定级：MID');

    await page.getByTestId('ai-ticket-console-classify-category').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: '支付与退款' }).click();
    await page.getByTestId('ai-ticket-console-classify-priority').locator('[data-slot="combobox-trigger"]').click();
    await page.getByRole('option', { name: '高' }).click();
    await page.getByTestId('ai-ticket-console-internal-note').locator('textarea').fill('客户为 VIP，优先电话回访');
    await page.getByTestId('ai-ticket-console-classify-submit').click();

    await expect(page.getByText('分类与内部备注已保存')).toBeVisible({ timeout: 10_000 });
    expect(await lastHookBody(page, 'lastTicketMutationBody')).toEqual({
      id: 'TCK-0002',
      mutation: 'classify',
      category: '支付与退款',
      priority: 'HIGH',
      internalNote: '客户为 VIP，优先电话回访',
    });
    await assertTrackedPageErrors(page);
  });

  test('focus ① drawer 焦点入面、Esc 返回触发卡（卡片触发表面焦点往返）', async ({ page }) => {
    await openK2(page);

    // §5.2 focus：drawer 焦点入面板 + Esc 返回触发卡（真实用户路径：点卡开抽屉）。
    await assertDialogFocusRoundTrip(page, page.locator(CARD('TCK-0001')), {
      surfaceSlot: 'drawer-surface',
    });
    await assertTrackedPageErrors(page);
  });

  test('focus ② filter form（form+valuesPath 载体）首控件 tab 可达', async ({ page }) => {
    await openK2(page);

    // 载体裁定（评审 m2）：过滤走 form+valuesPath（live page-schemas 零
    // query-filter 使用）——首控件（工单状态 select）沿 Tab 链路可达。起点取
    // DOM 序紧邻其前的 toolbar 刷新按钮（页头 caption/工具条先于过滤表单）。
    await page.getByTestId('ai-ticket-console-refresh').focus();
    let landed = false;
    for (let step = 0; step < 20 && !landed; step += 1) {
      await page.keyboard.press('Tab');
      landed = await page.evaluate(() => {
        const active = document.activeElement;
        const filter = document.querySelector('[data-testid="ai-ticket-console-filter"]');
        return !!active && !!filter && (active === filter || filter.contains(active));
      });
    }
    expect(landed, 'Tab walk must land focus inside the filter form').toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 确认 dialog 内确认按钮 tab 可达（升级摘要 → 确认按钮链路）', async ({ page }) => {
    await openK2(page);
    await openTicketDrawer(page, 'TCK-0001');

    await page.locator(ESCALATE_BUTTON).click();
    const dialog = page.locator('[data-slot="dialog-surface"]').last();
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // 升级摘要文本可见（确认 dialog 语义面）。
    await expect(page.getByTestId('ai-ticket-console-escalate-summary')).toContainText(
      '升级处理（escalationLevel +1）',
    );

    // Tab 链路可达确认按钮（dialog 内首交互控件）。
    await page.getByTestId('ai-ticket-console-escalate-summary').focus();
    let landed = false;
    for (let step = 0; step < 15 && !landed; step += 1) {
      await page.keyboard.press('Tab');
      landed = await page.evaluate(
        () => document.activeElement?.getAttribute('data-testid') === 'ai-ticket-console-escalate-confirm',
      );
    }
    expect(landed, 'Tab walk must reach the escalate confirm button').toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="dialog-surface"]')).toHaveCount(0, {
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });
});
