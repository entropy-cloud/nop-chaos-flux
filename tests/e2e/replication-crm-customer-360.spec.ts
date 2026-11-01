import type { Page } from '@playwright/test';
import { assertTrackedPageErrors, expect, test } from './fixtures.js';
import {
  assertDialogFocusRoundTrip,
  expectEndpointCall,
  openReplicationPage,
  readEndpointCalls,
  seedReplicationCounters,
} from './helpers/replication.js';

// Plan 802 — C2 CRM 客户 360 详情页 focused e2e (D2 §5 C2 断言清单 ①-④ 逐条 +
// filterForm 联动〔来源 R1 §2 C2 要素③，非 §5 条目——如实标注〕 + focus 三项).
// Pillar one (programmatic interactions, __replCrmCalls 计数证据) + pillar
// three (focus). Pillar two (axe) lives in a11y-axe-baseline.spec.ts (branch A
// single registration — desktop page).
//
// Live shape contracts (plan 802 pre-declared, live > D2 §4.2 shapes):
// - timeline items carry TimelineItemSchema fields (value/time/title/detail/
//   level; level drives the marker color) — mock projects ASC by activityDate
//   and the page schema renders newest-first via `reverse: true`.
// - calendar events carry CalendarEvent id/title/start/end (no `date` field),
//   dates clamped into the current month so the default month view renders
//   them; one event spans two days (跨日).
//
// Seed math (mock-backend-repl-crm deterministic C2 fixtures):
//   partner-0001: 3 related leads (plead-0001-1/2/3), 4 activities
//                 (VISIT/CALL/DEMO/NOTE — 9/6/3/1 days ago, ASC), 4 calendar
//                 events (one spans two days).
//   partner-0002: 2 related leads → the ① partner switch changes BOTH the row
//                 count (3 → 2) and the first-row value.
//   activityCreate appends to the ASC log → renders at the TOP of the
//   reversed timeline (③ 置顶); blank content → `content required`.

const COUNTERS_KEY = '__replCrmCalls';
const HOOKS_KEY = '__replCrmTestHooks';

const TIMELINE = '[data-testid="crm-customer-360-timeline"]';
const TIMELINE_ITEM = '[data-slot="timeline-item"]';
const LEAD_TABLE = '[data-testid="crm-customer-360-lead-table"]';
const CALENDAR = '[data-testid="crm-customer-360-calendar"]';

function tabTrigger(tabValue: string) {
  return `[data-slot="tabs-trigger"][data-tab-value="${tabValue}"]`;
}

async function openC2(page: Page): Promise<void> {
  await seedReplicationCounters(page, COUNTERS_KEY, HOOKS_KEY);
  await openReplicationPage(page, 'crm-customer-360', {
    title: 'CRM 客户 360 详情页',
  });
  // The activity tab is the default-active one; its timeline fetches on mount.
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function callCount(page: Page, endpoint: string): Promise<number> {
  return (await readEndpointCalls(page, COUNTERS_KEY))[endpoint] ?? 0;
}

function lastActivityCreateBody(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    (): Record<string, unknown> =>
      (
        (window as unknown as Record<string, Partial<Record<string, Record<string, unknown>>>>)
          .__replCrmTestHooks ?? {}
      ).lastActivityCreateBody ?? {},
  );
}

/** Pick a partner row inside the picker popup (party-search 范式, row index is
 * 0-based over the popup crud rows — row 1 = partner-0002). */
async function pickPartner(page: Page, rowIndex: number): Promise<void> {
  await page.locator('[data-slot="picker-trigger"]').first().click();
  const popup = page.locator('[data-slot="picker-dialog-content"][data-open]');
  await expect(popup).toBeVisible({ timeout: 10_000 });
  await expect(popup.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
  await popup.locator('tbody tr').nth(rowIndex).locator('[role="radio"]').click();
  await popup.locator('[data-slot="picker-confirm"]').click();
  await expect(popup).not.toBeVisible();
}

test('前置：头部 detail-view（首个复刻面消费）+ picker + 四 tab 骨架 + timeline 初始 4 条（live 形状）', async ({
  page,
}) => {
  await openC2(page);

  // 头部 detail-view viewer rows bind partnerGet.partner (MAJ-12 content+data
  // contract: the schema declares content detail-fields; the viewer is the
  // inline face of the display-only header).
  await expect(page.getByTestId('crm-customer-360-partner-detail')).toBeVisible();
  await expect(page.getByTestId('crm-customer-360-partner-name')).toHaveText('华东智造·P0001');
  await expect(page.getByTestId('crm-customer-360-partner-meta')).toContainText('编码：P0001');
  await expect(page.getByTestId('crm-customer-360-partner-meta')).toContainText('负责人：韩梅');
  await expect(page.getByTestId('crm-customer-360-partner-address')).toContainText('高新大道 8 号');
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__partnerGet', { atLeast: 1 });

  // picker 客户切换 trigger renders (party-search 范式).
  await expect(page.locator('[data-slot="picker-trigger"]').first()).toBeVisible();

  // 四 tab 骨架（D2 §2.5 树：跟进时间线/关联线索/联系人/活动日历）。
  for (const [tabValue, title] of [
    ['activity', '跟进时间线'],
    ['leads', '关联线索'],
    ['contacts', '联系人'],
    ['calendar', '活动日历'],
  ] as const) {
    await expect(page.locator(tabTrigger(tabValue))).toHaveText(title);
  }

  // timeline 初始 4 条（partner-0001 种子），reverse: true → 首条为最新
  // （NOTE 跟进纪要，1 天前）。level 驱动着色：四种 level 各一条。
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(4);
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`).first()).toContainText('跟进纪要·P0001');
  for (const level of ['success', 'info', 'warning', 'default']) {
    await expect(
      page.locator(`${TIMELINE} [data-slot="timeline-dot"][data-level="${level}"]`),
    ).toHaveCount(1);
  }
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__activityTimeline', { atLeast: 1 });
  await assertTrackedPageErrors(page);
});

test('交互① partner 行点击（picker）→ leadByPartner 计数+1 + 关联列表行数/首行值变化；线索行点击 → 主从联动 caption 更新', async ({
  page,
}) => {
  await openC2(page);

  // mountOnEnter: the leads source must NOT have fetched before the tab is
  // activated — the +1 evidence below is attributable to the partner switch.
  expect(await callCount(page, 'ReplCrm__leadByPartner')).toBe(0);
  await page.locator(tabTrigger('leads')).click();
  await expect(page.locator(`${LEAD_TABLE} tbody tr`).first()).toBeVisible({ timeout: 15_000 });
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__leadByPartner', { atLeast: 1 });

  // Seed face: partner-0001 → 3 rows, first row = 扩容采购.
  await expect(page.locator(`${LEAD_TABLE} tbody tr`)).toHaveCount(3);
  await expect(page.locator(`${LEAD_TABLE} tbody tr`).first()).toContainText('plead-0001-1');
  await expect(page.locator(`${LEAD_TABLE} tbody tr`).first()).toContainText('华东智造·P0001·扩容采购');

  const before = await callCount(page, 'ReplCrm__leadByPartner');

  // 交互①: partner 行点击（picker popup 第 2 行 = partner-0002）→ confirm。
  await pickPartner(page, 1);

  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__leadByPartner', {
    atLeast: before + 1,
  });

  // 关联列表变化: 3 rows → 2 rows, first row hits the partner-0002 projection.
  await expect(page.locator(`${LEAD_TABLE} tbody tr`)).toHaveCount(2, { timeout: 15_000 });
  await expect(page.locator(`${LEAD_TABLE} tbody tr`).first()).toContainText('plead-0002-1');
  await expect(page.locator(`${LEAD_TABLE} tbody tr`).first()).toContainText(
    '南方电网科技·P0002·扩容采购',
  );

  // 主从联动（D2 §2.5 onRowClick 片段）: lead 行点击 → setValue selectedLeadId
  // → refreshSource leadByPartner → caption 更新 + 计数再 +1。
  const rowClickBefore = await callCount(page, 'ReplCrm__leadByPartner');
  await page.locator(`${LEAD_TABLE} tbody tr`).first().click();
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__leadByPartner', {
    atLeast: rowClickBefore + 1,
  });
  await expect(page.getByTestId('crm-customer-360-selected-lead')).toContainText(
    '当前线索：plead-0002-1',
    { timeout: 10_000 },
  );
  await assertTrackedPageErrors(page);
});

test('交互② 切日历 tab → activityCalendar 计数+1 + calendar 月视图网格与事件渲染（含跨日）+ console/pageerror 零命中', async ({
  page,
}) => {
  await openC2(page);

  // mountOnEnter: the calendar source fetches ON the tab switch (D2 §5 ②
  // 计数+1 attribution).
  expect(await callCount(page, 'ReplCrm__activityCalendar')).toBe(0);
  const before = await callCount(page, 'ReplCrm__activityCalendar');
  await page.locator(tabTrigger('calendar')).click();

  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__activityCalendar', {
    atLeast: before + 1,
  });

  // calendar 渲染（上游降级项回归）: month view grid DOM + event blocks.
  const calendar = page.locator(CALENDAR);
  await expect(calendar).toBeVisible({ timeout: 15_000 });
  await expect(calendar).toHaveAttribute('data-view', 'month');
  expect(
    await calendar.locator('[data-slot="calendar-cell"]').count(),
    'month grid must render its day cells',
  ).toBeGreaterThanOrEqual(28);

  // 4 seed events; the 跨日 one positions on two cells → ≥5 event blocks.
  const eventBlocks = calendar.locator('[data-slot="calendar-event"]');
  await expect(eventBlocks.first()).toBeVisible({ timeout: 15_000 });
  expect(await eventBlocks.count()).toBeGreaterThanOrEqual(5);
  for (const title of ['客户现场回访', '方案评审会', '续约谈判（跨日）', '高管拜访']) {
    await expect(calendar.locator(`[data-slot="calendar-event"][title="${title}"]`).first()).toBeVisible();
  }

  // onEventClick（D2 §2.5 片段）→ 活动详情 dialog 命中事件载荷。
  await eventBlocks.first().click();
  const dialog = page.locator('[data-testid="crm-customer-360-event-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('crm-customer-360-event-detail')).toContainText('开始：');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // 回归口径：console/pageerror 零命中。
  await assertTrackedPageErrors(page);
});

test('交互③ 新增跟进 drawer：空内容命中 content required 错误分支 → 补内容提交 activityCreate +1 → timeline 行数+1 且置顶（含请求体逐字段）', async ({
  page,
  allowConsoleErrors,
}) => {
  // The rejected submit reports through onActionError (console.error) —
  // expected noise; the retry/reporting layer logs the failure face 4× per
  // rejected submit (ajax retry wrapper + action-error observer).
  allowConsoleErrors(4);
  await openC2(page);

  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(4);
  const createBefore = await callCount(page, 'ReplCrm__activityCreate');

  await page.getByTestId('crm-customer-360-activity-add').click();
  const drawer = page.locator('[data-slot="drawer-surface"]');
  await expect(drawer).toBeVisible({ timeout: 5_000 });

  // 错误分支（D2 §4.2）: blank content → mock status:1 `content required` →
  // error toast + drawer stays open (closeOnSubmit binds to success).
  await page.getByTestId('crm-customer-360-activity-submit').click();
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__activityCreate', {
    atLeast: createBefore + 1,
  });
  await expect(
    page.getByText('跟进提交被拒绝：内容缺失（content required）'),
  ).toBeVisible({ timeout: 10_000 });
  await expect(drawer).toBeVisible();

  // 成功提交 → activityCreate 再 +1 → onSubmitSuccess refreshSource
  // activityTimeline → timeline 行数 +1 且新条目置顶（reverse: true）。
  await page.getByTestId('crm-customer-360-activity-title').locator('input').fill('突袭回访');
  await page
    .getByTestId('crm-customer-360-activity-content')
    .locator('textarea')
    .fill('客户临时到访，现场演示新版本并确认续约意向');
  await page.getByTestId('crm-customer-360-activity-submit').click();

  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__activityCreate', {
    atLeast: createBefore + 2,
  });
  expect(await lastActivityCreateBody(page)).toEqual({
    partnerId: 'partner-0001',
    activityType: 'VISIT',
    title: '突袭回访',
    content: '客户临时到访，现场演示新版本并确认续约意向',
  });

  await expect(page.getByText('跟进已登记')).toBeVisible({ timeout: 10_000 });
  await expect(drawer).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(5, { timeout: 15_000 });
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`).first()).toContainText('突袭回访', {
    timeout: 15_000,
  });
  // No trailing assertTrackedPageErrors: the allowance above covers the
  // expected rejection's console entries (C1 ② precedent); the fixture
  // teardown enforces the bound via assertCountsWithinAllowance.
});

test('交互④ timeline seek → 高亮切换（data-state/aria-current 迁移）', async ({ page }) => {
  await openC2(page);

  const items = page.locator(`${TIMELINE} ${TIMELINE_ITEM}`);
  await expect(items).toHaveCount(4);

  // 初始无选中（unmatched value 不回退首项——live 渲染裁决）。
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}[data-state="active"]`)).toHaveCount(0);

  // seek 第 2 项 → active 高亮命中。
  await items.nth(1).click();
  await expect(items.nth(1)).toHaveAttribute('data-state', 'active');
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'time');
  await expect(items.nth(0)).not.toHaveAttribute('data-state', 'active');

  // seek 第 4 项 → 高亮切换。
  await items.nth(3).click();
  await expect(items.nth(3)).toHaveAttribute('data-state', 'active');
  await expect(items.nth(3)).toHaveAttribute('aria-current', 'time');
  await expect(items.nth(1)).not.toHaveAttribute('data-state', 'active');
  await assertTrackedPageErrors(page);
});

test('filterForm 提交（活动类型过滤，来源 R1 §2 C2 要素③）→ 查询触发 refreshSource 计数+1 + timeline 按类型收缩', async ({
  page,
}) => {
  await openC2(page);

  const before = await callCount(page, 'ReplCrm__activityTimeline');
  await page
    .getByTestId('crm-customer-360-filter-type')
    .locator('[data-slot="combobox-trigger"]')
    .click();
  await page.getByRole('option', { name: '电话跟进' }).click();

  // filterForm 载体（form+valuesPath）→ 查询按钮 → refreshSource 链。
  await page.getByTestId('crm-customer-360-filter-submit').click();
  await expectEndpointCall(page, COUNTERS_KEY, 'ReplCrm__activityTimeline', {
    atLeast: before + 1,
  });

  // partner-0001 恰有 1 条 CALL 跟进 → timeline 收缩为 1 条且命中类型。
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`)).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator(`${TIMELINE} ${TIMELINE_ITEM}`).first()).toContainText('电话跟进·P0001');
  await assertTrackedPageErrors(page);
});

test('focus ① 首 tab 可达且选中态正确（Tab 链路落入「跟进时间线」触发器，data-active 命中）', async ({
  page,
}) => {
  await openC2(page);

  const focusedTabValue = () =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const trigger = active?.closest('[data-slot="tabs-trigger"]');
      return trigger ? trigger.getAttribute('data-tab-value') : null;
    });

  let landed: string | null = null;
  for (let i = 0; i < 150 && landed === null; i += 1) {
    await page.keyboard.press('Tab');
    landed = await focusedTabValue();
  }
  expect(landed, 'tab must reach a tabs trigger').toBe('activity');
  // 选中态（live 口径）：data-active 以空串占位、aria-selected 携带选中态。
  await expect(page.locator(tabTrigger('activity'))).toHaveAttribute('aria-selected', 'true');
  await assertTrackedPageErrors(page);
});

test('focus ② drawer 焦点入面、Esc 返回触发按钮（openDrawer 表面焦点往返）', async ({ page }) => {
  await openC2(page);

  const trigger = page.getByTestId('crm-customer-360-activity-add');
  await assertDialogFocusRoundTrip(page, trigger, { surfaceSlot: 'drawer-surface' });
  await assertTrackedPageErrors(page);
});

test('focus ③ seek 后 activeElement 保持文档内（命中被 seek 的 timeline 项）', async ({ page }) => {
  await openC2(page);

  const items = page.locator(`${TIMELINE} ${TIMELINE_ITEM}`);
  await expect(items).toHaveCount(4);

  await items.nth(2).click();
  await expect(items.nth(2)).toBeFocused();

  // The seek re-render (setValue + local ownership) must not throw focus out
  // of the document: activeElement stays on the seeked item.
  const focusState = await page.evaluate(() => {
    const active = document.activeElement;
    const item = document.querySelector(
      `${'[data-testid="crm-customer-360-timeline"]'} [data-slot="timeline-item"][data-state="active"]`,
    );
    return {
      inDocument: !!active && document.contains(active),
      onSeekedItem: !!active && !!item && (active === item || item.contains(active)),
    };
  });
  expect(focusState.inDocument).toBe(true);
  expect(focusState.onSeekedItem).toBe(true);
  await assertTrackedPageErrors(page);
});

// Plan 819 (P1) — month-boundary timezone regression. The scheduling calendar
// is a UTC-day model (calendar-date-utils.ts getUTCMonth; initial date = now),
// so at 2026-11-01 01:30 in UTC+8 (= 2026-10-31 17:30 UTC) it shows OCTOBER.
// The mock used to clamp event dates into the LOCAL month (November), leaving
// the October grid empty. Pinning the browser clock + timezone to that window
// makes the regression deterministic: zero events before the fix, all four
// seed events after it.
test.describe('C2 日历月初时区窗口回归（UTC+8 · 每月 1 日 08:00 前）', () => {
  test.use({ timezoneId: 'Asia/Shanghai' });

  test('2026-11-01 01:30 CST（UTC 仍为 10 月）→ 日历事件按 UTC 月渲染，四个种子事件可见', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-01T01:30:00+08:00') });
    await openC2(page);

    await page.locator(tabTrigger('calendar')).click();
    const calendar = page.locator(CALENDAR);
    await expect(calendar).toBeVisible({ timeout: 15_000 });
    const eventBlocks = calendar.locator('[data-slot="calendar-event"]');
    await expect(eventBlocks.first()).toBeVisible({ timeout: 15_000 });
    for (const title of ['客户现场回访', '方案评审会', '续约谈判（跨日）', '高管拜访']) {
      await expect(calendar.locator(`[data-slot="calendar-event"][title="${title}"]`).first()).toBeAttached();
    }
    await assertTrackedPageErrors(page);
  });
});
