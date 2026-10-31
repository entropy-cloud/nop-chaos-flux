import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 808 — M3-K3 AI 审批轨迹页 focused e2e (D3 §5.3 K3 断言清单忠实转写 +
// focus 三项). Pillar one (programmatic interactions, __replAiCalls 计数证据)
// + pillar three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts
// (branch A single registration — desktop page).
//
// Page shape (D3 §2.3 + live 裁定): crud 待办列表（approvalTaskFindPage 四值
// approveStatus fixture，行点击 openDrawer）+ drawer 详情：steps 状态轴（mock
// 投影 wait/process/finish/error 权威映射——live steps renderer 无 error 推导，
// REJECTED 步进项 status 需数据侧显式携带）+ timeline 审批轨迹（approvalTrailFind，
// reject 节点 level=error）+ ai-tool-call HITL 卡（onApproval → hitlDecision
// 持久化 + setValue 写回卡状态——engine 不自改 approval，宿主 action 链 owns
// the workflow，ai-tool-call.tsx L24-27）+ 动作区 approve→approvalAct / 驳回
// 意见必填 dialog / 转办 user-select+原因 dialog（G13）。
//
// Seed math (mock-backend-repl-ai-k3 deterministic fixtures, 12 tasks / 4
// statuses, crud default pageSize 10 → 全部被测行在第一页):
//   APT-0001 生产环境发布窗口      SUBMITTED  hitl pending（HITL approve + steps SUBMITTED）
//   APT-0002 服务器扩容采购申请    UNSUBMITTED（steps UNSUBMITTED）
//   APT-0003 供应商合同续签        SUBMITTED（驳回必填 target）
//   APT-0004 差旅报销单 TRV-2093   SUBMITTED（转办 target）
//   APT-0005 办公区门禁权限变更    APPROVED   hitl approved（steps APPROVED）
//   APT-0006 对外接口密钥申请      REJECTED   hitl rejected（steps REJECTED）
//   APT-0007 数据导出权限开通      SUBMITTED  hitl pending（审批动作区 + APPROVAL_CONFLICT）
//   APT-0008..0009 APPROVED/REJECTED（页 1 余量）；0010-0012 页 2 余量。

const COUNTERS_KEY = '__replAiCalls';
const HOOKS_KEY = '__replAiTestHooks';

const byTestid = (testid: string) => `[data-testid="${testid}"]`;
const TODO_ROW = `${byTestid('ai-approval-trail-todos')} [data-slot="table-row"][data-interactive]`;
const DRAWER = '[data-slot="drawer-surface"]';
const DIALOG = '[data-slot="dialog-surface"]';
const STEPS = byTestid('ai-approval-trail-steps');
const STEP_ITEM = (key: string) => `${STEPS} [data-slot="steps-item"][data-item-key="${key}"]`;
const TIMELINE = byTestid('ai-approval-trail-timeline');
const TIMELINE_ITEM = '[data-slot="timeline-item"]';
const HITL_CARD = byTestid('ai-approval-trail-hitl-card');

const SEED_TOTAL = 12;
const SEED_PAGE1_ROWS = 10;

async function openK3(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'ai-approval-trail', {
    title: 'AI 审批轨迹页',
  });
  await expect(page.locator(`${TODO_ROW}`).first()).toBeVisible({ timeout: 30_000 });
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

/** Open the detail drawer for a task via the real user path (row click). */
async function openTaskDrawer(page: Page, taskId: string): Promise<void> {
  await page.locator(TODO_ROW).filter({ hasText: taskId }).click();
  await expect(page.locator(DRAWER)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(STEPS)).toBeVisible({ timeout: 10_000 });
}

async function closeDrawer(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
}

test.describe('K3 AI 审批轨迹页 (#/complex-pages/ai-approval-trail)', () => {
  test('前置：待办列表渲染（12 fixture / 第一页 10 行 / 四值状态分布）+ approvalTaskFindPage 计数', async ({
    page,
  }) => {
    await openK3(page);

    // crud 第一页 10 行（分页承载余量 2 行）。
    await expect(page.locator(TODO_ROW)).toHaveCount(SEED_PAGE1_ROWS);

    // caption 统计 ← approvalTaskSource.total。
    await expect(page.locator(byTestid('ai-approval-trail-caption'))).toContainText(
      `${SEED_TOTAL} 条`,
    );

    // 四值 approveStatus fixture 在第一页各至少一次（labelMap 投影列）。
    for (const label of ['未提交', '待审批', '已通过', '已驳回']) {
      await expect(page.locator(byTestid('ai-approval-trail-todos')).getByText(label).first())
        .toBeVisible();
    }

    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__approvalTaskFindPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('HITL approve：pending 态 data-requires-approval → 点 approve → hitlDecision +1（decision=approve 逐字段）→ 卡片转 decided', async ({
    page,
  }) => {
    await openK3(page);
    await openTaskDrawer(page, 'APT-0001');

    // pending 态在位：presence-only 标记 + 审批按钮组可见。
    const card = page.locator(HITL_CARD);
    await expect(card).toHaveAttribute('data-requires-approval', '');
    await expect(card).toHaveAttribute('data-approval', 'pending');
    await expect(page.locator('[data-slot="ai-tool-call-approve"]')).toBeVisible();
    await expect(page.locator('[data-slot="ai-tool-call-reject"]')).toBeVisible();

    // 点 approve → onApproval 链 → hitlDecision +1，请求体逐字段（toolCallId
    // 来自事件 payload，decision=approve）。
    const before = await callCount(page, 'ReplAi__hitlDecision');
    await page.locator('[data-slot="ai-tool-call-approve"]').click();

    await expect(page.getByText('HITL 决定已持久化（approve）')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__hitlDecision', { atLeast: before + 1 });
    expect(await lastHookBody(page, 'lastHitlDecisionBody')).toEqual({
      callId: 'call-apt-0001',
      decision: 'approve',
    });

    // 卡片转 decided：pending 标记消失 + approved 徽章渲染（engine 不自改
    // 状态——setValue 写回的宿主 action 链 owns the workflow）。
    await expect(card).not.toHaveAttribute('data-requires-approval', '');
    await expect(card).toHaveAttribute('data-approval', 'approved');
    await expect(page.locator('[data-approval-decision="approved"]')).toBeVisible({
      timeout: 10_000,
    });

    await closeDrawer(page);
    await assertTrackedPageErrors(page);
  });

  test('reject 必填：意见空提交被 required 拦截（端点零调用）→ 填写后成功 → timeline 新增 reject 节点（level=error 配色）', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 空意见提交被前端 required 拦截（不发请求）；填写后成功。二次驳回
    // 会被 mock APPROVAL_CONFLICT 拒绝（console 报错为预期噪声）。
    allowConsoleErrors(1);
    await openK3(page);
    await openTaskDrawer(page, 'APT-0003');

    // 种子轨迹 2 条（create + submit），无 reject 节点。
    await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(2, { timeout: 15_000 });

    // 驳回 dialog：空意见直接提交 → required 拦截（approvalAct 计数不变）。
    await page.getByTestId('ai-approval-trail-reject').click();
    await expect(page.locator(DIALOG).last()).toBeVisible({ timeout: 10_000 });
    const actBefore = await callCount(page, 'ReplAi__approvalAct');
    await page.getByTestId('ai-approval-trail-reject-confirm').click();
    await expect(page.locator(DIALOG).last()).toBeVisible();
    expect(await callCount(page, 'ReplAi__approvalAct')).toBe(actBefore);

    // 填写意见 → 确认驳回 → approvalAct +1 + 请求体逐字段。
    await page.getByTestId('ai-approval-trail-reject-comment').fill('依据不充分，需要补充材料');
    await page.getByTestId('ai-approval-trail-reject-confirm').click();
    await expect(page.getByText('审批完成：已驳回')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__approvalAct', { atLeast: actBefore + 1 });
    expect(await lastHookBody(page, 'lastApprovalActBody')).toEqual({
      taskId: 'APT-0003',
      decision: 'reject',
      comment: '依据不充分，需要补充材料',
    });

    // then 链刷新轨迹：timeline 新增 reject 节点，level=error（配色 = 点位
    // bg-destructive 语义色，A-12 palette）。
    const items = page.locator(`${TIMELINE} ${TIMELINE_ITEM}`);
    await expect(items).toHaveCount(3, { timeout: 15_000 });
    const rejectNode = items.filter({ hasText: '审批驳回（reject）' });
    await expect(rejectNode).toHaveCount(1);
    await expect(rejectNode).toHaveAttribute('data-level', 'error');
    await expect(rejectNode.locator('[data-slot="timeline-dot"]')).toHaveAttribute(
      'data-level',
      'error',
    );
    await expect
      .poll(async () => rejectNode.locator('[data-slot="timeline-dot"]').evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe('rgba(0, 0, 0, 0)');

    // 弹窗 closeOnSubmit 关闭，drawer 保留。
    await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(DRAWER)).toBeVisible();
    await closeDrawer(page);
  });

  test('状态轴：approveStatus 四值 fixture 各断言一次 steps 映射（wait/process/finish/error + data-current）', async ({
    page,
  }) => {
    await openK3(page);

    const cases: Array<{
      taskId: string;
      current: string;
      statusByKey: Record<string, string>;
    }> = [
      {
        taskId: 'APT-0002',
        current: 'UNSUBMITTED',
        statusByKey: { UNSUBMITTED: 'process', SUBMITTED: 'wait', APPROVED: 'wait', REJECTED: 'wait' },
      },
      {
        taskId: 'APT-0001',
        current: 'SUBMITTED',
        statusByKey: { UNSUBMITTED: 'finish', SUBMITTED: 'process', APPROVED: 'wait', REJECTED: 'wait' },
      },
      {
        taskId: 'APT-0005',
        current: 'APPROVED',
        statusByKey: { UNSUBMITTED: 'finish', SUBMITTED: 'finish', APPROVED: 'finish', REJECTED: 'wait' },
      },
      {
        taskId: 'APT-0006',
        current: 'REJECTED',
        statusByKey: { UNSUBMITTED: 'finish', SUBMITTED: 'finish', APPROVED: 'wait', REJECTED: 'error' },
      },
    ];

    for (const { taskId, current, statusByKey } of cases) {
      await openTaskDrawer(page, taskId);
      for (const [key, status] of Object.entries(statusByKey)) {
        await expect(page.locator(STEP_ITEM(key))).toHaveAttribute('data-status', status);
        if (key === current) {
          await expect(page.locator(STEP_ITEM(key))).toHaveAttribute('data-current', 'true');
        } else {
          await expect(page.locator(STEP_ITEM(key))).not.toHaveAttribute('data-current');
        }
      }
      await closeDrawer(page);
    }
    await assertTrackedPageErrors(page);
  });

  test('转办 G13：user-select 选人 + 原因 → 提交 approvalTransfer +1（逐字段）→ timeline 增「转办」节点', async ({
    page,
  }) => {
    await openK3(page);
    await openTaskDrawer(page, 'APT-0004');

    await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(2, { timeout: 15_000 });

    const transferBefore = await callCount(page, 'ReplAi__approvalTransfer');
    await page.getByTestId('ai-approval-trail-transfer').click();
    await expect(page.locator(DIALOG).last()).toBeVisible({ timeout: 10_000 });

    // user-select：展开面板 → 进入研发部 → 选张三（G13 组合口径）。
    const trigger = page.locator('[data-slot="org-select-trigger"][data-testid="ai-approval-trail-transfer-user"]');
    await trigger.click();
    const panel = page.locator('[data-slot="org-select-panel"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.locator('[data-slot="org-select-node-name"]', { hasText: '研发部' }).click();
    await panel.locator('[data-slot="org-select-node"]', { hasText: '张三' })
      .locator('[data-slot="org-select-node-name"]')
      .click();
    await expect(page.locator('[data-slot="org-select-value"]')).toHaveAttribute(
      'data-value',
      'user-zhangsan',
    );

    await page.getByTestId('ai-approval-trail-transfer-reason').fill('当前处理人休假，转办跟进');
    await page.getByTestId('ai-approval-trail-transfer-confirm').click();

    await expect(page.getByText('转办成功')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__approvalTransfer', {
      atLeast: transferBefore + 1,
    });
    expect(await lastHookBody(page, 'lastApprovalTransferBody')).toEqual({
      taskId: 'APT-0004',
      targetUserId: 'user-zhangsan',
      reason: '当前处理人休假，转办跟进',
    });

    // then 链刷新轨迹：timeline 增「转办」节点（operator = 目标人）。
    const items = page.locator(`${TIMELINE} ${TIMELINE_ITEM}`);
    await expect(items).toHaveCount(3, { timeout: 15_000 });
    const transferNode = items.filter({ hasText: '转办（transfer）' });
    await expect(transferNode).toHaveCount(1);
    await expect(transferNode).toContainText('张三');
    await expect(transferNode).toContainText('当前处理人休假，转办跟进');

    await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 10_000 });
    await closeDrawer(page);
    await assertTrackedPageErrors(page);
  });

  test('审批动作区：approve → approvalAct +1 → 列表状态翻转；重复审批 → APPROVAL_CONFLICT 拦截', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 二次审批被 mock 守卫拒绝（onActionError console 报错为预期噪声）。
    allowConsoleErrors(1);
    await openK3(page);
    await openTaskDrawer(page, 'APT-0007');

    const actBefore = await callCount(page, 'ReplAi__approvalAct');
    await page.getByTestId('ai-approval-trail-approve').click();
    await expect(page.getByText('审批完成：已通过')).toBeVisible({ timeout: 10_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__approvalAct', { atLeast: actBefore + 1 });
    expect(await lastHookBody(page, 'lastApprovalActBody')).toEqual({
      taskId: 'APT-0007',
      decision: 'approve',
    });

    // then 链刷新待办源：列表行 APT-0007 状态翻转为 已通过（服务端真值回种）。
    const row = page.locator(TODO_ROW).filter({ hasText: 'APT-0007' });
    await expect(row).toContainText('已通过', { timeout: 15_000 });

    // 轨迹刷新：timeline 追加 approve 节点（level=success）。
    const approveNode = page
      .locator(`${TIMELINE} ${TIMELINE_ITEM}`)
      .filter({ hasText: '审批通过（approve）' });
    await expect(approveNode).toHaveCount(1, { timeout: 15_000 });
    await expect(approveNode).toHaveAttribute('data-level', 'success');

    // 重复审批：mock 端点守卫 APPROVAL_CONFLICT → toast 关键词。
    await page.getByTestId('ai-approval-trail-approve').click();
    await expect(page.getByText('审批被拒绝（APPROVAL_CONFLICT）')).toBeVisible({
      timeout: 10_000,
    });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplAi__approvalAct', {
      atLeast: actBefore + 2,
    });

    await closeDrawer(page);
  });

  test('focus ① HITL 卡 pending 焦点圈：入面即聚焦 approve、Tab 圈内循环、Esc 还原入面前焦点', async ({
    page,
  }) => {
    await openK3(page);
    await openTaskDrawer(page, 'APT-0001');

    // ai-tool-call.tsx L73-98 focus trap：pending 挂载即聚焦 approve 钮。
    const approveBtn = page.locator('[data-slot="ai-tool-call-approve"]');
    const rejectBtn = page.locator('[data-slot="ai-tool-call-reject"]');
    await expect(approveBtn).toBeFocused({ timeout: 10_000 });

    // Tab 在审批动作组内循环（approve → reject → approve）。
    await page.keyboard.press('Tab');
    await expect(rejectBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(approveBtn).toBeFocused();

    // Esc：焦点圈退出。事件冒泡至 drawer 同时关闭（live 行为——ai-tool-call
    // 的 Esc 处理不阻断冒泡，surface 关闭时卡片 pending 卸载，AI-11 卸载还原
    // 契约生效）→ drawer 关闭 + 焦点回到触发行（surface 关闭还原契约）。
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(TODO_ROW).filter({ hasText: 'APT-0001' })).toBeFocused({
      timeout: 10_000,
    });
    await assertTrackedPageErrors(page);
  });

  test('focus ② 转办 dialog 焦点往返（assertDialogFocusRoundTrip）+ user-select 面板焦点入/出返回触发钮', async ({
    page,
  }) => {
    await openK3(page);
    await openTaskDrawer(page, 'APT-0004');

    // dialog 焦点入面 + Esc 返回转办触发钮（replication.ts helper 契约）。
    const transferTrigger = page.getByTestId('ai-approval-trail-transfer');
    await assertDialogFocusRoundTrip(page, transferTrigger, { surfaceSlot: 'dialog-surface' });

    // 再开：user-select 面板焦点入（search 输入为面板首控件）/出（关闭返回触发钮）。
    await transferTrigger.click();
    await expect(page.locator(DIALOG).last()).toBeVisible({ timeout: 10_000 });
    const trigger = page.locator(
      '[data-slot="org-select-trigger"][data-testid="ai-approval-trail-transfer-user"]',
    );
    await trigger.click();
    const panel = page.locator('[data-slot="org-select-panel"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const surface = document.querySelector('[data-slot="org-select-panel"]');
          const active = document.activeElement;
          return !!surface && !!active && (surface === active || surface.contains(active));
        }),
      )
      .toBe(true);

    // 面板关闭（Esc）→ 焦点回到 user-select 触发钮；dialog 关闭（Esc）→
    // 焦点回到转办触发钮（关闭返回触发按钮）。
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 10_000 });
    await expect(transferTrigger).toBeFocused();

    await closeDrawer(page);
    await assertTrackedPageErrors(page);
  });

  test('focus ③ 首控件可达：Tab 链路落入待办列表首行 + 行 Enter 键盘开启 drawer 焦点入/出', async ({
    page,
  }) => {
    await openK3(page);

    // 起点 = 工具条刷新钮（DOM 序紧邻列表之前），Tab 链路落入 crud 首个
    // 可交互控件（首行 data-interactive tabIndex=0）。
    await page.getByTestId('ai-approval-trail-refresh').focus();
    let landed = false;
    for (let step = 0; step < 20 && !landed; step += 1) {
      await page.keyboard.press('Tab');
      landed = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        const crud = document.querySelector('[data-testid="ai-approval-trail-todos"]');
        return !!active && !!crud && (active === crud || crud.contains(active));
      });
    }
    expect(landed, 'Tab walk must land focus inside the todo crud').toBe(true);

    // 行 Enter 键盘开启 drawer（键盘平价）：焦点落首行（Tab walk 的落点可能
    // 是分页/列头控件）→ Enter 触发 onRowClick + 焦点入面 + Esc 返回触发行。
    const firstRow = page.locator(TODO_ROW).first();
    await firstRow.focus();
    await page.keyboard.press('Enter');
    const drawer = page.locator(DRAWER);
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const surface = document.querySelector('[data-slot="drawer-surface"]');
          const active = document.activeElement;
          return !!surface && !!active && (surface === active || surface.contains(active));
        }),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator(DRAWER)).toHaveCount(0, { timeout: 10_000 });
    await assertTrackedPageErrors(page);
  });
});
