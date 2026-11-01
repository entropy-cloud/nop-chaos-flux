import type { Locator, Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import { expectEndpointCall, openReplicationPage, readEndpointCalls, seedReplicationCounters } from './helpers/replication.js';

// Plan 815 — O2 HITL 审批收件箱页 focused e2e (D4 §5 O2 断言清单 ①-⑤ +
// focus). Pillar one (programmatic interactions, __replDocCalls evidence +
// write mirrors) + pillar three (focus). Pillar two (axe) lives in
// a11y-axe-baseline.spec.ts (branch A desktop registration).
//
// Live-completed faces (D4 §2.4「O2 实现勘误」已就地落档):
// - query-filter drives the crud through component:querySubmit (S2 勘误 5);
//   crud selection keepOnPageChange keeps keys across server pages.
// - The approve button reads the opinion draft through the opinion form's
//   valuesPath (O1 勘误 4); reject goes through the form submit (required).
// - Staleness disables 批准; the 兜底演练 ghost button calls approve directly so
//   the server-side REPL_DOC_STALE_DECISION fallback is observable.

const COUNTERS_KEY = '__replDocCalls';
const HOOKS_KEY = '__replDocTestHooks';

/* Fixture mirror of mock-backend-repl-doc.ts buildInboxRows. */
const approvalNo = (n: number) => `AP-2026-${100 + n}`;
const remainingSeconds = (n: number) => 300 + n * 420;
const SOD_ROW = 5;
const HEADERS = ['审批单号', '业务对象', '业务键', '动作', '制单人', '提交时间', '剩余时限', '变更摘要', '高危'];
/** reviewDetail fixture: 3 field diffs; diffTree = root + 3 children + 1 grandchild. */
const FIELD_DIFFS = 3;
const DIFF_TREE_NODES = 5;

function hooksData(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () => (window as unknown as Record<string, Record<string, unknown>>).__replDocTestHooks ?? {},
  );
}

function crud(page: Page): Locator {
  return page.getByTestId('doc-hitl-inbox-crud');
}

async function openO2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'doc-hitl-inbox', { title: 'HITL 审批收件箱页' });
  await expect(crud(page).locator('tbody tr').first()).toContainText(approvalNo(1), { timeout: 30_000 });
}

/** Row click (outside the checkbox cell) opens the review dialog. */
async function openReview(page: Page, n: number): Promise<Locator> {
  await crud(page).locator('tbody tr', { hasText: approvalNo(n) }).locator('td').nth(2).click();
  const dialog = page.locator('[role="dialog"]', { hasText: `审批详情 ${approvalNo(n)}` });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByTestId('doc-hitl-inbox-review-meta')).toContainText('制单人', { timeout: 10_000 });
  await expect(dialog.getByTestId('doc-hitl-inbox-review-meta')).not.toContainText('制单人 -');
  return dialog;
}

test.describe('O2 HITL 审批收件箱页 (#/complex-pages/doc-hitl-inbox)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('前置：crud 首页 10 行按剩余时限升序 + 9 字段表头集合 + inboxPage 计数', async ({ page }) => {
    await openO2(page);

    const rows = crud(page).locator('tbody tr');
    await expect(rows).toHaveCount(10);
    for (let n = 1; n <= 10; n += 1) {
      await expect(rows.nth(n - 1)).toContainText(approvalNo(n));
    }
    // Ascending deadline: row n shows ROUND(remainingSeconds / 60) minutes.
    await expect(rows.nth(0)).toContainText(`${Math.round(remainingSeconds(1) / 60)} 分钟`);
    await expect(rows.nth(9)).toContainText(`${Math.round(remainingSeconds(10) / 60)} 分钟`);

    const headers = (await crud(page).locator('thead th').allTextContents()).map((text) => text.trim());
    for (const header of HEADERS) {
      expect(headers, `header ${header}`).toContain(header);
    }
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__inboxPage', { atLeast: 1 });
    await assertTrackedPageErrors(page);
  });

  test('交互① 跨页批量：页 1 勾 2 行 + 页 2 勾 1 行 → batch-bar「影响 3 行」→ batchApprove 载荷恰为所勾 3 键', async ({
    page,
  }) => {
    await openO2(page);

    const checkboxes = crud(page).locator('tbody [role="checkbox"]');
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    await crud(page).locator('[data-slot="table-pagination"]').getByRole('button', { name: '2' }).first().click();
    await expect(crud(page).locator('tbody tr').first()).toContainText(approvalNo(11), { timeout: 15_000 });
    await crud(page).locator('tbody [role="checkbox"]').nth(0).click();

    const bar = page.getByTestId('doc-hitl-inbox-batch-bar');
    await expect(bar).toHaveAttribute('data-count', '3');
    await expect(bar).toContainText('批量通过：影响 3 行');

    await page.getByTestId('doc-hitl-inbox-batch-approve').click();
    await expect(page.getByText('批量通过完成：通过 3 行，跳过 0 行')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__batchApprove', { atLeast: 1 });
    const body = (await hooksData(page)).lastBatchApproveBody as { approvalNos?: string[] };
    expect([...(body?.approvalNos ?? [])].sort()).toEqual([approvalNo(1), approvalNo(2), approvalNo(11)].sort());
    await assertTrackedPageErrors(page);
  });

  test('交互② staleness：forceApproveStale → 横幅可见 + 批准 disabled → 兜底直调 → REPL_DOC_STALE_DECISION', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openO2(page);

    await page.evaluate((key) => {
      const hooks = (window as unknown as Record<string, { forceApproveStale?: (id: string) => void }>).__replDocTestHooks;
      hooks?.forceApproveStale?.(key);
    }, approvalNo(2));
    const dialog = await openReview(page, 2);

    await expect(dialog.getByTestId('doc-hitl-inbox-staleness-alert')).toBeVisible();
    await expect(dialog.getByTestId('doc-hitl-inbox-approve-btn')).toBeDisabled();

    await dialog.getByTestId('doc-hitl-inbox-approve-bypass').click();
    await expect(page.getByText('审批被拒绝（REPL_DOC_STALE_DECISION）')).toBeVisible({ timeout: 15_000 });
    expect(await hooksData(page)).toMatchObject({ lastApproveBody: { approvalNo: approvalNo(2), source: 'bypass' } });
    await expect(dialog).toBeVisible();
  });

  test('交互③ 驳回意见必填：空意见前端拦截（reject 计数 0）→ 填写 → reject +1 + 载荷意见 + dialog 关闭', async ({
    page,
  }) => {
    await openO2(page);
    const dialog = await openReview(page, 3);

    await dialog.getByTestId('doc-hitl-inbox-reject-btn').click();
    // Required rule blocks before any request (plan 819 P1: deterministic
    // field-error evidence instead of a bare negative wait).
    await expect(dialog.getByTestId('doc-hitl-inbox-opinion').locator('[data-slot="field-error"]')).toBeVisible({
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page, COUNTERS_KEY))['ReplDoc__reject'] ?? 0).toBe(0);
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('doc-hitl-inbox-opinion').locator('textarea').fill('收款账户无开户证明，退回补件');
    await dialog.getByTestId('doc-hitl-inbox-reject-btn').click();
    await expect(page.getByText('已驳回')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__reject', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({
      lastRejectBody: { approvalNo: approvalNo(3), opinion: '收款账户无开户证明，退回补件' },
    });
    await expect(dialog).toHaveCount(0);
    await assertTrackedPageErrors(page);
  });

  test('交互④ 三视图：字段对照行数 = fieldDiffs、tree 节点数 = diffTree、json-view 含 rawRequest 键', async ({ page }) => {
    await openO2(page);
    const dialog = await openReview(page, 1);

    await expect(dialog.getByTestId('doc-hitl-inbox-diff-fields').locator('tbody tr')).toHaveCount(FIELD_DIFFS);
    await expect(dialog.getByTestId('doc-hitl-inbox-diff-fields')).toContainText('contact.phone');

    await dialog.getByRole('tab', { name: '变更树' }).click();
    const tree = dialog.getByTestId('doc-hitl-inbox-diff-tree');
    await expect(tree).toBeVisible();
    await expect(tree.locator('[role="treeitem"]')).toHaveCount(DIFF_TREE_NODES);
    await expect(tree).toContainText('phone：021-5566 7788 → 021-6677 8899');

    await dialog.getByRole('tab', { name: '原始请求' }).click();
    const json = dialog.getByTestId('doc-hitl-inbox-diff-json');
    await expect(json).toBeVisible();
    for (const key of ['method', 'path', 'bizKey', 'body']) {
      await expect(json).toContainText(key);
    }
    await assertTrackedPageErrors(page);
  });

  test('交互⑤ HITL 卡：pending data-requires-approval → approve → approve +1（source=hitl）→ 卡片转 approved', async ({
    page,
  }) => {
    await openO2(page);
    const dialog = await openReview(page, 1);

    const card = dialog.getByTestId('doc-hitl-inbox-hitl-card');
    await expect(card).toHaveAttribute('data-requires-approval', '');
    await expect(card).toHaveAttribute('data-approval', 'pending');

    await dialog.locator('[data-slot="ai-tool-call-approve"]').click();
    await expect(page.getByText('HITL 批准已提交')).toBeVisible({ timeout: 15_000 });
    await expectEndpointCall(page, COUNTERS_KEY, 'ReplDoc__approve', { atLeast: 1 });
    expect(await hooksData(page)).toMatchObject({ lastApproveBody: { approvalNo: approvalNo(1), source: 'hitl' } });
    await expect(card).toHaveAttribute('data-approval', 'approved', { timeout: 10_000 });
    await expect(card).not.toHaveAttribute('data-requires-approval', '');
    await assertTrackedPageErrors(page);
  });

  test('交互⑤b SoD：制单人 = 审核人 → 批准 → REPL_DOC_SOD_VIOLATION toast，dialog 停留', async ({
    page,
    allowConsoleErrors,
  }) => {
    allowConsoleErrors(1);
    await openO2(page);
    const dialog = await openReview(page, SOD_ROW);

    await dialog.getByTestId('doc-hitl-inbox-approve-btn').click();
    await expect(page.getByText('审批被拒绝（REPL_DOC_SOD_VIOLATION）')).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toBeVisible();
  });

  test('focus ① 审批 dialog 焦点落入、Esc 关闭后焦点回文档', async ({ page }) => {
    await openO2(page);
    const dialog = await openReview(page, 1);

    await expect
      .poll(() =>
        page.evaluate(() => {
          const surfaces = document.querySelectorAll('[role="dialog"]');
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

  test('focus ② staleness 场景：焦点落入 dialog 且不在禁用的批准按钮，Tab 链跳过批准', async ({ page }) => {
    await openO2(page);
    await page.evaluate((key) => {
      const hooks = (window as unknown as Record<string, { forceApproveStale?: (id: string) => void }>).__replDocTestHooks;
      hooks?.forceApproveStale?.(key);
    }, approvalNo(4));
    const dialog = await openReview(page, 4);
    await expect(dialog.getByTestId('doc-hitl-inbox-approve-btn')).toBeDisabled();

    const activeTestid = () =>
      page.evaluate(() => {
        const surfaces = document.querySelectorAll('[role="dialog"]');
        const top = surfaces[surfaces.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!top || !active || !top.contains(active)) return 'outside';
        return active.closest('[data-testid]')?.getAttribute('data-testid') ?? active.tagName;
      });

    expect(await activeTestid()).not.toBe('outside');
    expect(await activeTestid()).not.toBe('doc-hitl-inbox-approve-btn');
    // The pending ai-tool-call card cycles Tab within its own approve/reject
    // actions by design (a11y §7 P3, Esc releases) — walk the chain from the
    // opinion textarea, after the card: the disabled approve button is never
    // focused while the reject button is reachable.
    await dialog.getByTestId('doc-hitl-inbox-opinion').locator('textarea').focus();
    const visited = new Set<string>();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      visited.add(await activeTestid());
    }
    expect(visited.has('doc-hitl-inbox-approve-btn')).toBe(false);
    expect(visited.has('doc-hitl-inbox-reject-btn')).toBe(true);
    await assertTrackedPageErrors(page);
  });
});
