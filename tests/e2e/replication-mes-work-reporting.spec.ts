import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 810 — M2 MES 工序报工页 focused e2e (D3 §5.5 M2 断言清单 + focus ①-③).
// Pillar one (programmatic interactions, __replMesCalls evidence) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — desktop page, pure JSON SchemaPage).
//
// Mock seed math (mock-backend-repl-mes-reporting.ts deterministic fixtures —
// 26 job cards across all 8 statuses; card plannedQty = 80 + (20·n mod 60),
// lines split plannedQty/stdMins(30) in half):
//   card 1  JC-2026-0001 RELEASED → 显隐① only 开工; 工时 0 → 比值 0 冷样本
//   card 2  JC-2026-0002 RUNNING → 守恒前端半边: lines 60/60, 50+20=70>60 →
//             行内表达式守卫（警示文案 visible + 提交钮 disabled）+ reportWork
//             提交计数 0
//   card 3  JC-2026-0003 RUNNING → 工时比 (20+20)/30 ≈ 1.33 > 1 → 列表标红
//   card 4  JC-2026-0004 RUNNING → 报工链路: lines 50/50, std 15/15;
//             line1 30/5 + setup8/run8 (工时 16, 比 1.07 >1 标红 ≤1.2 守卫过)
//             + line2 20 + setup5/run5 → 合计 50/5/26; reportWork 回写完成数
//   card 5  JC-2026-0005 RUNNING → GUARD_HOUR_RATIO 端点守卫: line1 30/10
//             (40 ≤ 60 守恒) + setup20/run20 → 40/15 ≈ 2.67 > 1.2
//   card 6  JC-2026-0006 RUNNING → focus ③ 提交成功焦点回触发
//   card 7  JC-2026-0007 RUNNING → forceConservationError 复用同端点错误分支
//             (合法明细 30/10 ≤ 50 + 消耗型钩子 → GUARD_CONSERVATION toast)
//   card 8  JC-2026-0008 RUNNING → holdJob 正向迁移 (→ ON_HOLD)
//   card 9  JC-2026-0009 RUNNING → ILLEGAL_TRANSITION 同拍双击暂停 (第二拍
//             fromStatus 已推进为 ON_HOLD → 守卫拦截 + 行状态不变)
//   card 10 JC-2026-0010 RUNNING → focus ② 行内 Tab 驻留
//   card 13 JC-2026-0013 SUBMITTED → 显隐③ only 完成
//   card 14 JC-2026-0014 ON_HOLD → 显隐④ only 恢复
//
// 对话框 input-table computed/aggregate 列序（columns 7 列）：
//   合格数 | 报废数 | 准备工分 | 加工工分 | 工时 | 工时比 | 合格率
//   tfoot aggregate 落位：nth(0)=Σ合格 nth(1)=Σ报废 nth(4)=Σ工时
//   （nth(2) 首个非 aggregate 列显示「合计」标签）；
//   computed 单元格按列序出现：每行 [工时, 合格率]，行序优先。
//
// 守卫断言矩阵（D3 §5.5 双拦截口径 × live 前端半边）：
//   GUARD_CONSERVATION toast ← forceConservationError 复用同端点错误分支
//   （真实提交管线 + 真实载荷）；前端半边 ← 行级守恒表达式守卫（提交钮
//   disabled + 警示文案 visible——行字段 validate.action 对 input-table 行
//   字段不生效，B3.2 V6 同族 live 缺口，设计勘误登记）→ 提交计数 0；
//   GUARD_HOUR_RATIO ← 数量守恒通过 + 工时比超限的真实提交。

const COUNTERS_KEY = '__replMesCalls';
const HOOKS_KEY = '__replMesTestHooks';
const CARDS = '[data-testid="mes-work-reporting-cards"]';
/** Total job-card fixtures (mock-backend-repl-mes-reporting.ts ladder). */
const TOTAL_CARDS = 26;

function row(page: Page, cardNo: string) {
  return page.locator(`${CARDS} tbody tr`, { hasText: cardNo });
}

function dialogOf(page: Page) {
  return page.getByTestId('mes-work-reporting-report-dialog');
}

async function openM2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'mes-work-reporting', {
    title: 'MES 工序报工页',
  });
  await expect(row(page, 'JC-2026-0001')).toBeVisible({ timeout: 30_000 });
  // 26 张作业卡跨 8 态；crud 每页条数走 scope 态（默认 10，schema pagination
  // 仅承载 mode）——经真实工具栏 rows-per-page 控件切到 50 一页放下全部行。
  const pageSizeSelect = page.locator(`${CARDS} select`).first();
  await pageSizeSelect.selectOption('50');
  await expect(page.locator(`${CARDS} tbody tr`)).toHaveCount(TOTAL_CARDS, { timeout: 15_000 });
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

/** Open the report dialog for a card and wait for the loadAction-filled form. */
async function openReportDialog(page: Page, cardNo: string): Promise<void> {
  await row(page, cardNo).getByTestId('mes-work-reporting-report').click();
  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByTestId('mes-work-reporting-lines')).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByTestId('mes-work-reporting-report-caption')).toContainText(cardNo, {
    timeout: 15_000,
  });
}

/** The dialog input-table's row cell editors, row-scoped. */
function lineEditor(page: Page, testid: string, rowIndex: number) {
  return dialogOf(page)
    .getByTestId(testid)
    .nth(rowIndex)
    .locator('input');
}

type LineField = 'completed' | 'scrapped' | 'setup' | 'run' | 'rework';

async function fillLine(page: Page, rowIndex: number, field: LineField, value: string): Promise<void> {
  const testid = {
    completed: 'mes-work-reporting-completed-qty',
    scrapped: 'mes-work-reporting-scrapped-qty',
    rework: 'mes-work-reporting-rework-qty',
    setup: 'mes-work-reporting-setup-mins',
    run: 'mes-work-reporting-run-mins',
  }[field];
  await lineEditor(page, testid, rowIndex).fill(value);
}

function lineRatio(page: Page, rowIndex: number) {
  return dialogOf(page)
    .getByTestId('mes-work-reporting-lines')
    .getByTestId('mes-work-reporting-hour-ratio')
    .nth(rowIndex);
}

function computedCell(page: Page, index: number) {
  return dialogOf(page)
    .getByTestId('mes-work-reporting-lines')
    .locator('[data-slot="input-table-computed-cell"]')
    .nth(index);
}

function summaryCell(page: Page, index: number) {
  return dialogOf(page).locator('[data-slot="input-table-summary-cell"]').nth(index);
}

test.describe('M2 MES 工序报工页 (#/complex-pages/mes-work-reporting)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：作业卡列表渲染 —— 26 行 / 8 态分布 / 状态映射配色 / 工时比>1 标红 / jobCardFindPage ≥1', async ({
    page,
  }) => {
    await openM2(page);

    // 26 rows total; one cardNo fixture per ordinal.
    await expect(page.locator(`${CARDS} tbody tr`)).toHaveCount(TOTAL_CARDS);
    await expect(row(page, 'JC-2026-0001')).toContainText('已下发');
    await expect(row(page, 'JC-2026-0002')).toContainText('加工中');
    await expect(row(page, 'JC-2026-0013')).toContainText('已报工待完');
    await expect(row(page, 'JC-2026-0014')).toContainText('已暂停');
    await expect(row(page, 'JC-2026-0019')).toContainText('已完工');
    await expect(row(page, 'JC-2026-0023')).toContainText('已关闭');

    // 状态映射配色（R2 ①): the RUNNING badge carries its mapping face.
    const runningStatusClass = await row(page, 'JC-2026-0002')
      .getByTestId('mes-work-reporting-card-status')
      .getAttribute('class');
    expect(runningStatusClass).toContain('text-emerald-700');

    // 工时比>1 标红（列表面样本: card 3 → 40/30 ≈ 1.33）。
    const hotRatio = row(page, 'JC-2026-0003').getByTestId('mes-work-reporting-card-hour-ratio');
    await expect(hotRatio).toHaveText('1.33');
    expect(await hotRatio.getAttribute('class')).toContain('text-rose-600');
    const ratioColor = await hotRatio.evaluate((el) => getComputedStyle(el).color);
    expect(ratioColor).not.toBe('rgb(0, 0, 0)');

    // 冷样本（card 1 无工时 → 0 不标红）。
    const coldRatio = row(page, 'JC-2026-0001').getByTestId('mes-work-reporting-card-hour-ratio');
    await expect(coldRatio).toHaveText('0');
    expect((await coldRatio.getAttribute('class')) ?? '').not.toContain('text-rose-600');

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__jobCardFindPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('状态动作按钮 visible 显隐：RELEASED 只见开工 / RUNNING 见暂停+报工提交 / SUBMITTED 只见完成 / ON_HOLD 只见恢复', async ({
    page,
  }) => {
    await openM2(page);

    // §5.5 抽 3 态 + resume（D3 §2.5 片段 2 五按钮平铺 + visible 表达式）。
    const released = row(page, 'JC-2026-0001');
    await expect(released.getByTestId('mes-work-reporting-start')).toBeVisible();
    await expect(released.getByTestId('mes-work-reporting-hold')).toHaveCount(0);
    await expect(released.getByTestId('mes-work-reporting-resume')).toHaveCount(0);
    await expect(released.getByTestId('mes-work-reporting-submit')).toHaveCount(0);
    await expect(released.getByTestId('mes-work-reporting-complete')).toHaveCount(0);

    const running = row(page, 'JC-2026-0002');
    await expect(running.getByTestId('mes-work-reporting-hold')).toBeVisible();
    await expect(running.getByTestId('mes-work-reporting-submit')).toBeVisible();
    await expect(running.getByTestId('mes-work-reporting-start')).toHaveCount(0);
    await expect(running.getByTestId('mes-work-reporting-resume')).toHaveCount(0);
    await expect(running.getByTestId('mes-work-reporting-complete')).toHaveCount(0);

    const submitted = row(page, 'JC-2026-0013');
    await expect(submitted.getByTestId('mes-work-reporting-complete')).toBeVisible();
    await expect(submitted.getByTestId('mes-work-reporting-start')).toHaveCount(0);
    await expect(submitted.getByTestId('mes-work-reporting-hold')).toHaveCount(0);
    await expect(submitted.getByTestId('mes-work-reporting-submit')).toHaveCount(0);

    const onHold = row(page, 'JC-2026-0014');
    await expect(onHold.getByTestId('mes-work-reporting-resume')).toBeVisible();
    await expect(onHold.getByTestId('mes-work-reporting-start')).toHaveCount(0);
    await expect(onHold.getByTestId('mes-work-reporting-hold')).toHaveCount(0);

    // 报工入口各态常驻（行操作）。
    await expect(released.getByTestId('mes-work-reporting-report')).toBeVisible();
    await expect(onHold.getByTestId('mes-work-reporting-report')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('交互① holdJob 正向迁移：RUNNING 行点暂停 → jobCardMutation +1 + lastJobCardMutationBody 逐字段 + 行转已暂停', async ({
    page,
  }) => {
    await openM2(page);

    const before = await callCount(page, 'ReplMes__jobCardMutation');
    await row(page, 'JC-2026-0008').getByTestId('mes-work-reporting-hold').click();

    await expect(page.getByText('作业卡已暂停')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__jobCardMutation', {
      atLeast: before + 1,
    });

    // G2 同族：请求体逐字段命中（行作用域 id + 平铺按钮固定 mutation 名）。
    const body = await readHook(page, 'lastJobCardMutationBody');
    expect(body).toEqual({ id: 'job-card-0008', mutation: 'holdJob' });

    // then → component:refresh 以服务端真值回种：行状态迁移为已暂停，按钮组
    // 随 visible 表达式切换为 恢复。
    const migrated = row(page, 'JC-2026-0008');
    await expect(migrated.getByTestId('mes-work-reporting-card-status')).toContainText('已暂停', {
      timeout: 15_000,
    });
    await expect(migrated.getByTestId('mes-work-reporting-resume')).toBeVisible({
      timeout: 15_000,
    });
    await expect(migrated.getByTestId('mes-work-reporting-hold')).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互② ILLEGAL_TRANSITION 非法迁移拦截：同拍双击暂停 → 第二拍 fromStatus 已推进 → 守卫 toast + 行状态不变', async ({
    page,
    allowConsoleErrors,
  }) => {
    // The rejected second dispatch reports its ActionResult through
    // onActionError (console.error) — expected noise (K2 ② / W2 ② precedent).
    allowConsoleErrors(1);
    await openM2(page);

    const before = await callCount(page, 'ReplMes__jobCardMutation');
    const holdButton = row(page, 'JC-2026-0009').getByTestId('mes-work-reporting-hold');

    // Same-tick double dispatch through the REAL UI pipeline: both clicks run
    // before any response resolves; the mock branch is synchronous, so
    // dispatch order = processing order. First holdJob RUNNING→ON_HOLD (合法),
    // second holdJob from ON_HOLD → ILLEGAL_TRANSITION.
    await holdButton.evaluate((el) => {
      el.click();
      el.click();
    });

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__jobCardMutation', {
      atLeast: before + 2,
    });

    // 守卫 toast（schema onError 静态文案）。
    await expect(
      page.getByText('状态迁移被拒绝（ILLEGAL_TRANSITION）：当前状态不允许该操作'),
    ).toBeVisible({ timeout: 10_000 });

    // 行状态不变：第二拍未推进状态 —— 行停留在第一次合法迁移的 ON_HOLD，
    // onError refresh 以服务端真值回种。
    const target = row(page, 'JC-2026-0009');
    await expect(target.getByTestId('mes-work-reporting-card-status')).toContainText('已暂停', {
      timeout: 15_000,
    });
    await expect(target.getByTestId('mes-work-reporting-resume')).toBeVisible({
      timeout: 15_000,
    });
    const result = await readHook(page, 'lastMutationResult');
    expect(result).toBe('ILLEGAL_TRANSITION');
    // No trailing assertTrackedPageErrors: the allowance above covers the
    // expected rejection's console entry.
  });

  test('交互③ 报工 dialog 行内编辑 → computed 即时派生 + hourRatio>1 标红 + 合计行 aggregate + summaryBinding 回写主单 totalCompletedQty', async ({
    page,
  }) => {
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0004');
    const dialog = dialogOf(page);

    // 卡片 fixture: card 4 planned 100 → lines 50/50, std 15/15；初始行值为 0。
    await expect(dialog.getByTestId('mes-work-reporting-total-completed')).toContainText(
      '合计回写（totalCompletedQty）：0',
    );

    // 行内编辑 → computed 派生即时更新：line1 setup8+run8 → 工时 16、
    // 工时比 16/15 ≈ 1.07（>1 标红）；line2 setup5+run5 → 工时 10、比 0.67。
    await fillLine(page, 0, 'setup', '8');
    await fillLine(page, 0, 'run', '8');
    await expect(computedCell(page, 0)).toHaveText('16', { timeout: 10_000 });
    await expect(lineRatio(page, 0)).toHaveText('1.07');

    // hourRatio>1 标红 class 断言（getComputedStyle 值）。
    expect(await lineRatio(page, 0).getAttribute('class')).toContain('text-rose-600');
    const hotColor = await lineRatio(page, 0).evaluate((el) => getComputedStyle(el).color);
    expect(hotColor).not.toBe('rgb(0, 0, 0)');

    await fillLine(page, 1, 'setup', '5');
    await fillLine(page, 1, 'run', '5');
    await expect(lineRatio(page, 1)).toHaveText('0.67');
    expect((await lineRatio(page, 1).getAttribute('class')) ?? '').not.toContain('text-rose-600');

    // 数量编辑 → 合格率 computed 派生（30/(30+5) ≈ 0.86）。
    await fillLine(page, 0, 'completed', '30');
    await fillLine(page, 0, 'scrapped', '5');
    await expect(computedCell(page, 1)).toHaveText('0.86', { timeout: 10_000 });

    await fillLine(page, 1, 'completed', '20');

    // 合计行 aggregate 三列 = sum（合格数/报废数/工时）：50 / 5 / 26。
    await expect(summaryCell(page, 0)).toHaveText('50', { timeout: 10_000 });
    await expect(summaryCell(page, 1)).toHaveText('5');
    // Column 2 is reworkQty (plan 819 P1 F2-1); totalMins sits at index 5.
    await expect(summaryCell(page, 2)).toHaveText('0');
    await expect(summaryCell(page, 5)).toHaveText('26');

    // summaryBinding 单对象回写主单 totalCompletedQty（plan-785 验收核心）。
    await expect(dialog.getByTestId('mes-work-reporting-total-completed')).toContainText(
      '合计回写（totalCompletedQty）：50',
      { timeout: 10_000 },
    );

    // onRowChange → 编辑联动提示记录最后编辑字段名。
    await expect(dialog.getByTestId('mes-work-reporting-row-change-hint')).toContainText(
      'completedQty',
      { timeout: 10_000 },
    );
    await assertTrackedPageErrors(page);
  });

  test('交互④ 报工提交成功 → reportWork +1 + lastReportWorkBody 命中 + 成功回写作业卡完成数 + refreshNearest 列表联动', async ({
    page,
  }) => {
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0004');
    const dialog = dialogOf(page);

    await fillLine(page, 0, 'completed', '30');
    await fillLine(page, 0, 'scrapped', '5');
    await fillLine(page, 0, 'rework', '2');
    await fillLine(page, 0, 'setup', '8');
    await fillLine(page, 0, 'run', '8');
    await fillLine(page, 1, 'completed', '20');
    await fillLine(page, 1, 'setup', '5');
    await fillLine(page, 1, 'run', '5');
    await expect(summaryCell(page, 0)).toHaveText('50', { timeout: 10_000 });

    await dialog.getByTestId('mes-work-reporting-report-submit').click();

    await expect(page.getByText('报工提交成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__reportWork', { atLeast: 1 });

    // 请求体逐字段命中：cardId + 两行明细 + 主单回写合计。
    const body = await readHook(page, 'lastReportWorkBody');
    expect(body.cardId).toBe('job-card-0004');
    expect(body.totalCompletedQty).toBe(50);
    const lines = body.lines as Array<Record<string, unknown>>;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      lineNo: 1, completedQty: 30, scrappedQty: 5, reworkQty: 2, setupMins: 8, runMins: 8,
    });
    expect(lines[1]).toMatchObject({ lineNo: 2, completedQty: 20, setupMins: 5, runMins: 5 });

    // closeOnSubmit 绑定成功 → dialog 关闭；onSubmitSuccess refreshNearest
    // 回种列表 —— mock 已把 Σ 报工量写回作业卡（completedQty 30 → 50）。
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });
    await expect(row(page, 'JC-2026-0004').locator('td').nth(4)).toHaveText('50', {
      timeout: 15_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ GUARD_HOUR_RATIO 端点守卫：数量守恒通过 + 工时比超限 → toast 含 GUARD_HOUR_RATIO', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0005');
    const dialog = dialogOf(page);

    // card 5 lines planned 60/60、std 15/15：line1 数量守恒（40 ≤ 60）但
    // (20+20)/15 ≈ 2.67 > 1.2 → GUARD_HOUR_RATIO（D3 §4.4 错误分支 2）。
    await fillLine(page, 0, 'completed', '30');
    await fillLine(page, 0, 'scrapped', '10');
    await fillLine(page, 0, 'setup', '20');
    await fillLine(page, 0, 'run', '20');
    await expect(lineRatio(page, 0)).toHaveText('2.67');

    await dialog.getByTestId('mes-work-reporting-report-submit').click();
    await expect(page.getByText('报工被拒绝：GUARD_HOUR_RATIO')).toBeVisible({
      timeout: 10_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__reportWork', { atLeast: 1 });

    // 错误面：close 绑定成功 → dialog 保持打开（W2 释放 dialog 同口径）。
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // No trailing assertTrackedPageErrors: covered by the allowance above.
  });

  test('交互⑥ forceConservationError 复用同端点错误分支：合法明细提交 → GUARD_CONSERVATION toast + 不回写', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0007');
    const dialog = dialogOf(page);

    // 合法明细（守恒 + 工时比均通过），mid-session 翻钩子强制端点错误分支
    // （D3 §5.5：forceConservationError 复用同端点错误分支断言 toast）。
    await fillLine(page, 0, 'completed', '30');
    await fillLine(page, 0, 'scrapped', '10');
    await page.evaluate(() => {
      const hooks = (window as unknown as Record<string, { forceConservationError?: boolean }>)
        .__replMesTestHooks;
      if (hooks) hooks.forceConservationError = true;
    });

    await dialog.getByTestId('mes-work-reporting-report-submit').click();
    await expect(page.getByText('报工被拒绝：GUARD_CONSERVATION')).toBeVisible({
      timeout: 10_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplMes__reportWork', { atLeast: 1 });
    const result = await readHook(page, 'lastMutationResult');
    expect(result).toBe('GUARD_CONSERVATION');

    // 拒绝面不落账：dialog 保持打开，列表完成数不被回写。
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(row(page, 'JC-2026-0007').locator('td').nth(4)).not.toHaveText('40');
    // No trailing assertTrackedPageErrors: covered by the allowance above.
  });

  test('交互⑦ 守恒拦截前端半边：行级守恒表达式守卫 → 警示文案可见 + 提交钮禁用 + 提交计数 0', async ({
    page,
  }) => {
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0002');
    const dialog = dialogOf(page);
    const warning = dialog.getByTestId('mes-work-reporting-conservation-warning');
    const submit = dialog.getByTestId('mes-work-reporting-report-submit');

    // 初态：数量未超计划 → 无警示、提交可用。
    await expect(warning).toHaveCount(0);
    await expect(submit).toBeEnabled();

    // card 2 lines planned 60/60：line1 50+20=70 > 60 → 行级守恒表达式守卫生效
    // （D3 §5.5 前端半边；设计勘误：行字段 validate.action 对 input-table 行
    // 字段不生效——B3.2 V6 同族缺口，live 以 disabled/visible 表达式承担，
    // 提交计数 0 语义保留在守卫路径）。
    await fillLine(page, 0, 'completed', '50');
    await fillLine(page, 0, 'scrapped', '20');

    await expect(warning).toBeVisible({ timeout: 10_000 });
    await expect(warning).toContainText('数量守恒校验未通过（GUARD_CONSERVATION）');
    await expect(submit).toBeDisabled({ timeout: 10_000 });

    // 提交钮禁用 = 提交动作不可达：reportWork 计数保持 0（不回写、无 toast）。
    const reportBefore = await callCount(page, 'ReplMes__reportWork');
    await page.waitForTimeout(1_000);
    expect(await callCount(page, 'ReplMes__reportWork')).toBe(reportBefore);
    await expect(page.getByText('报工提交成功')).toHaveCount(0);
    await expect(page.getByText('报工被拒绝：GUARD_CONSERVATION')).toHaveCount(0);

    // 修正数量后守卫释放：警示隐藏、提交钮恢复可用。
    await fillLine(page, 0, 'scrapped', '5');
    await expect(warning).toHaveCount(0, { timeout: 10_000 });
    await expect(submit).toBeEnabled({ timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('focus ① 报工 dialog 焦点入面板、Esc 返回触发按钮', async ({ page }) => {
    await openM2(page);
    const trigger = row(page, 'JC-2026-0001').getByTestId('mes-work-reporting-report');
    await assertDialogFocusRoundTrip(page, trigger);
    await assertTrackedPageErrors(page);
  });

  test('focus ② input-table 行内编辑器获焦且编辑后 Tab 序驻留表内', async ({ page }) => {
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0010');

    const firstCompleted = lineEditor(page, 'mes-work-reporting-completed-qty', 0);
    await firstCompleted.click();
    await expect(firstCompleted).toBeFocused();
    await firstCompleted.fill('12');
    await expect(firstCompleted).toBeFocused();
    await expect(firstCompleted).toHaveValue('12');

    // Tab 落点驻留在 input-table 内（下一行编辑器）。
    await page.keyboard.press('Tab');
    const stillInsideTable = await page.evaluate(() => {
      const active = document.activeElement;
      const table = document.querySelector('[data-testid="mes-work-reporting-lines"]');
      return !!active && !!table && table.contains(active);
    });
    expect(stillInsideTable).toBe(true);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 提交成功后 dialog 关闭、焦点落回触发行报工按钮', async ({ page }) => {
    await openM2(page);
    await openReportDialog(page, 'JC-2026-0006');
    const dialog = dialogOf(page);
    const trigger = row(page, 'JC-2026-0006').getByTestId('mes-work-reporting-report');

    await fillLine(page, 0, 'completed', '10');
    await dialog.getByTestId('mes-work-reporting-report-submit').click();
    await expect(page.getByText('报工提交成功')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });
    await expect(trigger).toBeFocused({ timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });
});
