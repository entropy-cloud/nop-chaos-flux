/**
 * Cal.com 复刻页交互接线测试（plan 2026-08-29-1819-1 P3b）。
 *
 * 承载分析篇 §4 交互清单（I1–I15）的接线/锁定用例（初屏结构见
 * cal-replica-visual.spec.ts）。pass/fail 全部为程序化断言（testid 可见性、
 * mock db 可观察变化、输入值、getComputedStyle）；截图仅作视觉证据附件。
 *
 * 日期类断言在 Node 侧复算 mock 的确定性算法（calDateHash/calDateText/
 * addMonths），与运行时同源，故不依赖固定"今天"。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/cal-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Mirrors calendar-date-utils addMonths (UTC-based, day-of-month clamped). */
function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== day) result.setUTCDate(0);
  return result;
}

function toUtcDateText(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日 ${weekdays[parsed.getUTCDay()]}`;
}

function calDateHash(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i += 1) hash = (hash * 31 + date.charCodeAt(i)) % 997;
  return hash;
}

test.describe('Cal booking — I2 选日刷新 + I4 月份导航', () => {
  test('01 I2 month navigation rewrites the scope date and refetches slots', async ({ page }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');

    const selectedDate = page.getByTestId('cal-booking-selected-date');
    await expect(selectedDate).toContainText('2026年9月3日 周四');

    const calendar = page.getByTestId('cal-booking-calendar');
    const headerButtons = calendar.locator('[data-slot="calendar-header"] button');
    const monthHeader = calendar.locator('[data-slot="calendar-header"] h2');
    const nextAnchor = addMonthsUtc(new Date(), 1).toISOString().slice(0, 10);
    const anchorText = toUtcDateText(nextAnchor);
    const anchorEmpty = calDateHash(nextAnchor) % 7 === 3;

    await headerButtons.nth(2).click();
    await expect(monthHeader).not.toContainText(
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    );
    // scope.calDate → slots 模板物化 → refetch：选中日标签随 payload 更新
    await expect(selectedDate).toContainText(anchorText, { timeout: 10_000 });
    if (anchorEmpty) {
      await expect(page.getByTestId('cal-booking-group-empty').first()).toContainText('该时段暂无可用预约', {
        timeout: 10_000,
      });
    } else {
      await expect(page.getByTestId('cal-booking-slot').first()).toBeVisible({ timeout: 10_000 });
    }

    // Today 回当月并携带当日日期（cal-book-expired 空日样本随日期而异，标签断言为主）
    const todayAnchor = new Date().toISOString().slice(0, 10);
    await headerButtons.nth(1).click();
    await expect(monthHeader).toContainText(
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    );
    await expect(selectedDate).toContainText(toUtcDateText(todayAnchor), { timeout: 10_000 });

    await snap(page, 'i2-date-refresh.png');
  });

  test('02 I4 built-in month navigation and Today restore', async ({ page }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');
    const calendar = page.getByTestId('cal-booking-calendar');
    const headerButtons = calendar.locator('[data-slot="calendar-header"] button');
    const monthHeader = calendar.locator('[data-slot="calendar-header"] h2');
    const currentMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    await expect(monthHeader).toContainText(currentMonth);

    await headerButtons.nth(0).click();
    const prevMonth = addMonthsUtc(new Date(), -1);
    await expect(monthHeader).toContainText(
      prevMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    );

    await headerButtons.nth(2).click();
    await expect(monthHeader).toContainText(currentMonth);

    await headerButtons.nth(1).click();
    await expect(monthHeader).toContainText(currentMonth);
    await expect(
      calendar.locator('[data-slot="calendar-cell"][data-today="true"]'),
    ).toHaveCount(1);
  });
});

test.describe('Cal booking — I1 时长切换 + I3 时区与时间制式', () => {
  test('03 I1 duration tab refetches slots for the new tier (selected sample only exists at 30)', async ({
    page,
  }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');
    const duration = page.getByTestId('cal-booking-duration');
    const durationLabel = page.getByTestId('cal-booking-slot-duration');

    await expect(duration.locator('[role="tab"][data-active]')).toContainText('30 分钟');
    await expect(durationLabel).toContainText('30 分钟');
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(1);

    await duration.getByRole('tab', { name: '45 分钟' }).click();
    await expect(duration.locator('[role="tab"][data-active]')).toContainText('45 分钟');
    await expect(durationLabel).toContainText('45 分钟', { timeout: 10_000 });
    // 45min 档无静态选中样本 → refetch 后选中槽位清零；槽位窗随档位收缩（失效样本前移到 10:00）
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId('cal-booking-slot-expired')).toContainText('10:00');

    await duration.getByRole('tab', { name: '30 分钟' }).click();
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('cal-booking-slot-selected')).toContainText('10:00');

    await snap(page, 'i1-duration-refresh.png');
  });

  test('04 I3 timezone switch refetches slots with the new zone label; 12h/24h toggles slot time format', async ({
    page,
  }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');
    const timezone = page.getByTestId('cal-booking-timezone').first();

    await expect(page.getByTestId('cal-booking-slot-timezone')).toContainText('上海');
    await timezone.locator('input').first().click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '东京 (GMT+9)' }).click();
    await expect(page.getByTestId('cal-booking-slot-timezone')).toContainText('东京', {
      timeout: 10_000,
    });

    // 12h/24h：默认 24 小时制（PAGE_DATA cal24h: true），切换后槽位时间带上午/下午前缀
    const slotButton = page.getByTestId('cal-booking-slot').first();
    await expect(slotButton).toContainText(/\d{2}:\d{2}/);
    await page.getByTestId('cal-booking-clock-format').locator('[role="switch"]').click();
    await expect(slotButton).toContainText(/上午|下午/, { timeout: 10_000 });
    await page.getByTestId('cal-booking-clock-format').locator('[role="switch"]').click();
    await expect(slotButton).toContainText(/\d{2}:\d{2}/, { timeout: 10_000 });

    await snap(page, 'i3-timezone-format.png');
  });
});

test.describe('Cal booking — I5 选槽位进确认', () => {
  test('05 clicking an available slot records the pointer and lands on confirm with the picked data', async ({
    page,
  }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');

    const firstSlot = page.getByTestId('cal-booking-slot').first();
    await expect(firstSlot).toContainText('09:00');
    await firstSlot.click();

    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 确认信息', {
      timeout: 10_000,
    });
    // 会话指针机制：确认页无参读取 Cal__selectedSlot，摘要与所点槽位一致
    await expect(page.getByTestId('cal-confirm-summary-time')).toContainText('2026年9月3日 周四', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('cal-confirm-summary-time')).toContainText('09:00 – 09:30');
    await expect(page.getByTestId('cal-confirm-summary-duration')).toContainText('30 分钟');

    await snap(page, 'i5-slot-to-confirm.png');
  });
});

test.describe('Cal booking — I14 移动端 day sheet', () => {
  test('06 narrow viewport opens the bottom day sheet with single-column slots; desktop keeps the panel', async ({
    page,
  }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');

    // 桌面双栏形态：右栏槽位面板在，day sheet 触发器不在
    await expect(page.getByTestId('cal-booking-right')).toBeVisible();
    await expect(page.getByTestId('cal-booking-day-sheet-trigger')).toHaveCount(0);

    await page.setViewportSize({ width: 375, height: 720 });
    await page.waitForTimeout(400);
    const trigger = page.getByTestId('cal-booking-day-sheet-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('9月3日');
    await trigger.click();

    const sheet = page.getByTestId('cal-booking-day-sheet');
    await expect(sheet).toBeVisible({ timeout: 5_000 });
    await expect(sheet).toContainText('上午');
    await expect(sheet).toContainText('下午');
    await expect(sheet).toContainText('晚上');
    const sheetButtons = sheet.getByTestId('cal-booking-sheet-slot');
    expect(await sheetButtons.count()).toBeGreaterThanOrEqual(3);
    // 单列形态：sheet 内槽位按钮首个与第二个不共享同一行
    const firstBox = await sheetButtons.nth(0).boundingBox();
    const secondBox = await sheetButtons.nth(1).boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height / 2);

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden({ timeout: 5_000 });

    // 回桌面：day sheet 触发器消失，右栏面板零回归
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('cal-booking-day-sheet-trigger')).toHaveCount(0);
    await expect(page.getByTestId('cal-booking-right')).toBeVisible();
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(1);

    await snap(page, 'i14-day-sheet.png');
  });
});

/** Opt-in mock observation: mirrors the antdpro endpoint-counter hook pattern. */
async function trackEndpointCalls(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __calEndpointCalls: Record<string, number> }).__calEndpointCalls = {};
  });
}

async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __calEndpointCalls?: Record<string, number> }).__calEndpointCalls ?? {},
  );
}

async function hashNavigate(page: import('@playwright/test').Page, pageId: string) {
  await page.evaluate((id) => {
    window.location.hash = `#/complex-pages/${id}`;
  }, pageId);
}

/** Picks the 45min tier and the first morning slot (09:00), landing on confirm. */
async function pickSlotOnBooking(page: import('@playwright/test').Page) {
  await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');
  await page.getByTestId('cal-booking-duration').getByRole('tab', { name: '45 分钟' }).click();
  const slot = page.getByTestId('cal-booking-slot').first();
  await expect(slot).toContainText('09:00', { timeout: 10_000 });
  await slot.click();
  await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 确认信息', {
    timeout: 10_000,
  });
}

/** Fills the required booking fields (name/email + select/radio questions). */
async function fillRequiredBookingFields(page: import('@playwright/test').Page) {
  await page.getByTestId('cal-confirm-name').locator('input').fill('沈书临');
  await page.getByTestId('cal-confirm-email').locator('input').fill('shu.shen@flux.demo');
  const qSelect = page.getByTestId('cal-confirm-q-select').first();
  await qSelect.locator('[data-slot="combobox-trigger"]').click();
  await page.locator('[data-slot="combobox-item"]', { hasText: '11-50 人' }).click();
  await page.getByTestId('cal-confirm-q-radio').first().getByText('预约流程提效').click();
}

test.describe('Cal confirm — I6 嘉宾增删 + I7 校验 + I8 提交 + I9 失效 + I13 回退', () => {
  test('07 I6 guest add appends a pool row and remove deletes rows (session list)', async ({ page }) => {
    await openPage(page, 'cal-confirm', 'Cal 预约 · 确认信息');
    const rows = page.getByTestId('cal-confirm-guest-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0).getByTestId('cal-confirm-guest-chip')).toContainText(
      'lin.zhiqing@flux.demo',
    );

    await page.getByTestId('cal-confirm-guest-add').click();
    await expect(rows).toHaveCount(2, { timeout: 10_000 });
    await expect(rows.nth(1).getByTestId('cal-confirm-guest-chip')).toContainText(
      'zhou.yutong@flux.demo',
    );

    await rows.nth(1).getByTestId('cal-confirm-guest-remove').click();
    await expect(rows).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('cal-confirm-guest-chip')).toContainText('lin.zhiqing@flux.demo');

    await rows.nth(0).getByTestId('cal-confirm-guest-remove').click();
    await expect(rows).toHaveCount(0, { timeout: 10_000 });

    // 空列表后再添加：确定性池从队首补位
    await page.getByTestId('cal-confirm-guest-add').click();
    await expect(rows).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('cal-confirm-guest-chip')).toContainText('zhou.yutong@flux.demo');

    await snap(page, 'i6-guest-rows.png');
  });

  test('08 I7 empty required submit shows field errors, stays on page, sends no write', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：故意空提交触发校验失败，playground 宿主 onActionError 会
    // 记一条 "[showcase] action error"（render-host.tsx，host 层日志通道）。
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page, 'cal-confirm', 'Cal 预约 · 确认信息');

    await page.getByTestId('cal-confirm-submit').click();

    const nameField = page.getByTestId('cal-confirm-name');
    const emailField = page.getByTestId('cal-confirm-email');
    await expect(nameField).toHaveAttribute('data-field-invalid', '');
    await expect(emailField).toHaveAttribute('data-field-invalid', '');
    await expect(nameField.locator('[data-slot="field-error"]')).toBeVisible();
    await expect(nameField.locator('[data-slot="field-error"]')).toContainText('您的姓名');
    await expect(emailField.locator('[data-slot="field-error"]')).toContainText('邮箱');
    // 红环：校验失败输入框边框走 error 色（等 150ms transition-colors 稳定后取值）
    await page.waitForTimeout(400);
    expect(
      await nameField.locator('input').evaluate((el) => getComputedStyle(el).borderColor),
    ).toMatch(/239, 67, 67|220, 38, 38|252, 165, 165/);
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 确认信息');
    expect((await readEndpointCalls(page)).Cal__book ?? 0).toBe(0);
  });

  test('09 I8 valid submit posts Cal__book once and lands on success with the booked data', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await pickSlotOnBooking(page);
    await fillRequiredBookingFields(page);

    await page.getByTestId('cal-confirm-submit').click();

    await expect(page.getByText('预约提交成功')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 预约成功', {
      timeout: 10_000,
    });
    // 成功页读取最新预约：摘要展示所点槽位（45 分钟 × 09:00 – 09:45），confirmed 态无待确认徽章
    await expect(page.getByTestId('cal-success-summary-time')).toContainText('09:00 – 09:45', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('cal-success-summary-duration')).toContainText('45 分钟');
    await expect(page.getByTestId('cal-success-summary-time')).toContainText('2026年9月3日 周四');
    await expect(page.getByTestId('cal-success-pending-badge')).toBeHidden({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Cal__book).toBe(1);

    await snap(page, 'i8-booked-success.png');
  });

  test('10 I9 forced-expired slot booking fails with a recovery toast and returns to the slot view', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：Cal__book 失败分支经宿主 onActionError 记一条 action error。
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await page.addInitScript(() => {
      (window as unknown as { __calTestHooks: Record<string, unknown> }).__calTestHooks = {};
    });
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');
    // mock 强制失效路径：经端点同路径选中默认日的 expired 样本（10:30 上午槽）
    await page.evaluate(() => {
      (
        window as unknown as { __calTestHooks: { selectSlot: (slotId: string) => void } }
      ).__calTestHooks.selectSlot('2026-09-03_30_10:30');
    });
    await hashNavigate(page, 'cal-confirm');
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 确认信息', {
      timeout: 10_000,
    });
    await fillRequiredBookingFields(page);

    await page.getByTestId('cal-confirm-submit').click();

    await expect(page.getByText('该时段已失效，请选择其他时段')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 选时段', {
      timeout: 10_000,
    });
    // 返回槽位视图：该槽维持置灰不可点
    const expired = page.getByTestId('cal-booking-slot-expired');
    await expect(expired).toBeVisible();
    await expect(expired).toBeDisabled();
    await expect(expired).toContainText('10:30');
    expect((await readEndpointCalls(page)).Cal__book).toBe(1);
  });

  test('11 I13 back returns to the booking view with picked duration/date/slot preserved', async ({
    page,
  }) => {
    await pickSlotOnBooking(page);
    await expect(page.getByTestId('cal-confirm-summary-duration')).toContainText('45 分钟');
    await expect(page.getByTestId('cal-confirm-summary-time')).toContainText('09:00 – 09:45');

    await page.getByTestId('cal-confirm-back').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 选时段', {
      timeout: 10_000,
    });
    // 会话指针回填：时长档/选中槽位/日期与回退前一致
    await expect(page.getByTestId('cal-booking-duration').locator('[role="tab"][data-active]')).toContainText(
      '45 分钟',
      { timeout: 10_000 },
    );
    await expect(page.getByTestId('cal-booking-slot-duration')).toContainText('45 分钟');
    await expect(page.getByTestId('cal-booking-selected-date')).toContainText('2026年9月3日 周四');
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('cal-booking-slot-selected')).toContainText('09:00');

    await snap(page, 'i13-back-preserved.png');
  });
});

test.describe('Cal success — I10 外链 + I11 复制链接 + I12 重排/取消', () => {
  test('12 I10 four calendar links keep placeholder hrefs and stay clickable', async ({ page }) => {
    await openPage(page, 'cal-success', 'Cal 预约 · 预约成功');
    for (const id of [
      'cal-success-link-google',
      'cal-success-link-outlook',
      'cal-success-link-office365',
      'cal-success-link-ics',
    ]) {
      const link = page.getByTestId(id);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '#/complex-pages/cal-success');
      await expect(link).toBeEnabled();
    }
  });

  test('13 I11 copy link fires the share-link endpoint with copied feedback', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page, 'cal-success', 'Cal 预约 · 预约成功');

    await page.getByTestId('cal-success-copy-link').click();
    await expect(page.getByText('链接已复制')).toBeVisible({ timeout: 10_000 });
    expect((await readEndpointCalls(page)).Cal__shareLink).toBe(1);
  });

  test('14 I12 reschedule returns to the booking view prefilled with the booked slot', async ({
    page,
  }) => {
    await trackEndpointCalls(page);
    await pickSlotOnBooking(page);
    await fillRequiredBookingFields(page);
    await page.getByTestId('cal-confirm-submit').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 预约成功', {
      timeout: 10_000,
    });

    await page.getByTestId('cal-success-reschedule').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 选时段', {
      timeout: 10_000,
    });
    // 重排 = 槽位视图按已预约槽位预填（I13 同语义）
    await expect(page.getByTestId('cal-booking-duration').locator('[role="tab"][data-active]')).toContainText(
      '45 分钟',
      { timeout: 10_000 },
    );
    await expect(page.getByTestId('cal-booking-slot-selected')).toContainText('09:00', {
      timeout: 10_000,
    });
    expect((await readEndpointCalls(page)).Cal__book).toBe(1);
  });

  test('15 I12 cancel dialog keeps on dismiss, then flips the booking to cancelled db-observably', async ({
    page,
  }) => {
    await pickSlotOnBooking(page);
    await fillRequiredBookingFields(page);
    await page.getByTestId('cal-confirm-submit').click();
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 预约成功', {
      timeout: 10_000,
    });

    await page.getByTestId('cal-success-cancel').click();
    const dialog = page.getByTestId('cal-cancel-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toContainText('取消预约');

    // 保留预约：关闭弹窗，状态不翻转
    await page.getByTestId('cal-cancel-dialog-cancel').click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    await expect(page.getByTestId('cal-success-pending-badge')).toBeHidden();

    await page.getByTestId('cal-success-cancel').click();
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('cal-cancel-reason').locator('textarea').fill('行程冲突，换个时间');
    await page.getByTestId('cal-cancel-dialog-confirm').click();

    await expect(page.getByText('预约已取消')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 选时段', {
      timeout: 10_000,
    });
    // 状态翻转会话内可观察：回到成功页徽章显示已取消
    await hashNavigate(page, 'cal-success');
    await expect(page.getByTestId('cal-success-pending-badge')).toContainText('已取消', {
      timeout: 10_000,
    });

    await snap(page, 'i12-cancelled.png');
  });

  test('16 cal-cancel-miss: cancelling with no booking in session fails without navigation', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：Cal__cancelBooking 失败分支经宿主 onActionError 记一条 action error。
    allowConsoleErrors(1);
    await openPage(page, 'cal-success', 'Cal 预约 · 预约成功');

    await page.getByTestId('cal-success-cancel').click();
    const dialog = page.getByTestId('cal-cancel-dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('cal-cancel-reason').locator('textarea').fill('误点');
    await page.getByTestId('cal-cancel-dialog-confirm').click();

    await expect(page.getByText('没有可取消的预约')).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('complex-page-title')).toContainText('Cal 预约 · 预约成功');
  });
});
