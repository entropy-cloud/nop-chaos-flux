/**
 * Cal.com 复刻页初屏结构测试（plan 2026-08-29-1413-2 P3a）。
 *
 * 覆盖 cal-booking / cal-confirm / cal-success 三张复刻页的初屏结构断言：
 * 入口区/月历/时区栏/槽位分组、确认表单/摘要卡/校验样本、成功态图形/外链。
 * pass/fail 全部为程序化断言（testid 可见性、关键文案、mock 端点数据、
 * getComputedStyle 令牌解析）；截图仅作视觉证据。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/cal-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({
    path: join(ARTIFACTS_DIR, file),
    fullPage: false,
  });
}

async function openPage(page: import('@playwright/test').Page, pageId: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`#/complex-pages/${pageId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText(label, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

test.describe('Cal replica — initial-screen structure', () => {
  test('01 booking — entry header + duration tabs + month calendar + grouped slot grid from mock', async ({
    page,
  }) => {
    await openPage(page, 'cal-booking', 'Cal 预约 · 选时段');

    // 入口区：头像 + 用户名徽章 + 活动标题 + meta 行 + 描述（数据来自 Cal__event）
    await expect(page.getByTestId('cal-booking-avatar')).toContainText('沈');
    await expect(page.getByTestId('cal-booking-username')).toContainText('yiran.shen');
    await expect(page.getByTestId('cal-booking-title')).toContainText('产品发现深聊');
    const meta = page.getByTestId('cal-booking-meta');
    await expect(meta).toContainText('30 分钟');
    await expect(meta).toContainText('线上视频');
    await expect(meta).toContainText('上海 (GMT+8)');
    await expect(page.getByTestId('cal-booking-description')).toContainText('业务目标');

    // 时长 tabs：4 档分段，默认选中 30 分钟（tabs 内建选中）
    const duration = page.getByTestId('cal-booking-duration');
    await expect(duration).toBeVisible();
    for (const label of ['15 分钟', '30 分钟', '45 分钟', '60 分钟']) {
      await expect(duration).toContainText(label);
    }
    await expect(duration.locator('[role="tab"][data-active]')).toContainText('30 分钟');

    // 左栏：月历网格存在（calendar renderer 月视图）+ 今日强调 + 时区选择器 + 12h/24h 开关
    const calendar = page.getByTestId('cal-booking-calendar');
    await expect(calendar).toBeVisible();
    const cells = calendar.locator('[data-slot="calendar-cell"]');
    await expect(cells.first()).toBeVisible();
    expect(await cells.count()).toBeGreaterThanOrEqual(28);
    await expect(calendar.locator('[data-slot="calendar-cell"][data-today="true"]')).toHaveCount(1);
    const timezone = page.getByTestId('cal-booking-timezone').first();
    await expect(timezone).toBeVisible();
    await expect(timezone.locator('input').first()).toHaveValue('上海 (GMT+8)');
    await expect(page.getByTestId('cal-booking-clock-format')).toBeVisible();

    // 右栏：选中日 + 分组标签（上午/下午/晚上，来自 Cal__slots）
    await expect(page.getByTestId('cal-booking-selected-date')).toContainText('2026年9月3日 周四');
    await expect(page.getByTestId('cal-booking-slot-timezone')).toContainText('上海');
    const groupLabels = page.getByTestId('cal-booking-group-label');
    await expect(groupLabels).toHaveCount(3);
    await expect(groupLabels.nth(0)).toContainText('上午');
    await expect(groupLabels.nth(1)).toContainText('下午');
    await expect(groupLabels.nth(2)).toContainText('晚上');

    // 槽位按钮：数量与状态样本均来自 mock 数据集（7 可点 + 1 选中 + 1 失效）
    await expect(page.getByTestId('cal-booking-slot')).toHaveCount(7);
    await expect(page.getByTestId('cal-booking-slot-selected')).toHaveCount(1);
    const selected = page.getByTestId('cal-booking-slot-selected');
    await expect(selected).toContainText('10:00');
    await expect(page.getByTestId('cal-booking-slot-expired')).toHaveCount(1);
    await expect(page.getByTestId('cal-booking-slot-expired')).toBeDisabled();
    await expect(page.getByTestId('cal-booking-slot-expired')).toContainText('10:30');
    await expect(page.getByTestId('cal-booking-slot-attention')).toContainText('名额将满');
    await expect(page.getByTestId('cal-booking-slot-expired-badge')).toContainText('已失效');

    // 骨架屏加载样本静态可见
    await expect(page.getByTestId('cal-booking-skeleton')).toBeVisible();

    // 令牌解析证明（Phase 1 @import 生效）：--cal-* 在 .cal-root 子树可解析
    const action = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-testid="cal-booking-page"]')!)
        .getPropertyValue('--cal-action')
        .trim(),
    );
    expect(action).toBe('#111827');
    const radius = await page.evaluate(() =>
      getComputedStyle(document.querySelector('[data-testid="cal-booking-page"]')!)
        .getPropertyValue('--cal-radius')
        .trim(),
    );
    expect(radius).toBe('10px');

    // 三态 CSS 抽查：选中黑底白字 / 失效灰字禁用 / 默认描边白底
    expect(await selected.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /17, 24, 39/,
    );
    const expiredBtn = page.getByTestId('cal-booking-slot-expired');
    expect(await expiredBtn.evaluate((el) => getComputedStyle(el).color)).toMatch(/156, 163, 175/);
    const plainSlot = page.getByTestId('cal-booking-slot').first();
    expect(await plainSlot.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /255, 255, 255/,
    );

    await snap(page, '01-booking.png');
  });

  test('02 confirm — reschedule bar + summary card from mock + form field family + error sample + black confirm', async ({
    page,
  }) => {
    await openPage(page, 'cal-confirm', 'Cal 预约 · 确认信息');

    // reschedule 提示条（回排场景样本）
    await expect(page.getByTestId('cal-confirm-reschedule')).toBeVisible();
    await expect(page.getByTestId('cal-confirm-reschedule')).toContainText('重新安排');

    // 左摘要卡：字段值全部来自 Cal__event mock
    await expect(page.getByTestId('cal-confirm-avatar')).toContainText('沈');
    await expect(page.getByTestId('cal-confirm-summary-title')).toContainText('产品发现深聊');
    await expect(page.getByTestId('cal-confirm-summary-duration')).toContainText('30 分钟');
    await expect(page.getByTestId('cal-confirm-summary-location')).toContainText('线上视频');
    await expect(page.getByTestId('cal-confirm-summary-timezone')).toContainText('上海 (GMT+8)');
    await expect(page.getByTestId('cal-confirm-summary-time')).toContainText('2026年9月3日 周四');
    await expect(page.getByTestId('cal-confirm-summary-time')).toContainText('10:00 – 10:30');

    // 右表单区：基础字段 + 电话（input-text 承载，注册型别无 input-phone）
    await expect(page.getByTestId('cal-confirm-form')).toBeVisible();
    await expect(page.getByTestId('cal-confirm-name')).toBeVisible();
    await expect(page.getByTestId('cal-confirm-email')).toBeVisible();
    await expect(page.getByTestId('cal-confirm-phone').locator('[data-field="phone"]')).toHaveCount(0);
    expect(
      await page
        .getByTestId('cal-confirm-phone')
        .evaluate((el) => el.querySelector('input')?.getAttribute('type')),
    ).toBe('text');
    await expect(page.getByTestId('cal-confirm-notes')).toBeVisible();

    // 嘉宾增删静态形态：一行嘉宾 chip + 删除钮
    await expect(page.getByTestId('cal-confirm-guest-add')).toContainText('添加嘉宾');
    await expect(page.getByTestId('cal-confirm-guest-chip')).toContainText('lin.zhiqing@flux.demo');
    await expect(page.getByTestId('cal-confirm-guest-remove')).toBeVisible();

    // 自定义问题字段族：select / radio-group / checkbox-group 各 ≥1
    const qSelect = page.getByTestId('cal-confirm-q-select').first();
    await expect(qSelect).toBeVisible();
    await expect(qSelect.locator('input').first()).toHaveValue('');
    await expect(
      page.getByTestId('cal-confirm-q-radio').first().locator('[role="radio"]'),
    ).toHaveCount(4);
    await expect(page.getByTestId('cal-confirm-q-radio')).toContainText('预约流程提效');
    await expect(
      page.getByTestId('cal-confirm-q-checkbox').first().locator('[role="checkbox"]'),
    ).toHaveCount(3);
    await expect(page.getByTestId('cal-confirm-q-checkbox')).toContainText('技术社区');

    // 校验错误形态样本：红环 + 错误文案（error 令牌）
    await expect(page.getByTestId('cal-confirm-error-field')).toContainText('未填写');
    expect(
      await page
        .getByTestId('cal-confirm-error-field')
        .evaluate((el) => getComputedStyle(el).borderColor),
    ).toMatch(/252, 165, 165/);
    await expect(page.getByTestId('cal-confirm-error-text')).toContainText('请输入联系电话');
    expect(
      await page.getByTestId('cal-confirm-error-text').evaluate((el) => getComputedStyle(el).color),
    ).toMatch(/220, 38, 38/);

    // Confirm 黑按钮（--cal-action 品牌黑令牌抽查）
    const submit = page.getByTestId('cal-confirm-submit');
    await expect(submit).toContainText('确认预约');
    expect(await submit.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/17, 24, 39/);
    await expect(page.getByTestId('cal-confirm-back')).toContainText('返回上一步');

    await snap(page, '02-confirm.png');
  });

  test('03 success — check circle + summary from mock + four calendar links + pending badge + reschedule/cancel', async ({
    page,
  }) => {
    await openPage(page, 'cal-success', 'Cal 预约 · 预约成功');

    // 成功图形：绿圆 ✓（success 令牌）
    await expect(page.getByTestId('cal-success-check')).toBeVisible();
    const checkColor = await page
      .getByTestId('cal-success-check')
      .evaluate((el) => getComputedStyle(el).color);
    expect(checkColor).toMatch(/5, 150, 105/);
    await expect(page.getByTestId('cal-success-title')).toContainText('预约已确认');
    await expect(page.getByTestId('cal-success-description')).toContainText('确认邮件');

    // pending 徽章变体（待确认）
    const pending = page.getByTestId('cal-success-pending-badge');
    await expect(pending).toBeVisible();
    await expect(pending).toContainText('待确认');
    expect(await pending.evaluate((el) => getComputedStyle(el).color)).toMatch(/217, 119, 6/);

    // 摘要卡（数据来自 Cal__event mock）
    await expect(page.getByTestId('cal-success-summary-title')).toContainText('产品发现深聊');
    await expect(page.getByTestId('cal-success-summary-duration')).toContainText('30 分钟');
    await expect(page.getByTestId('cal-success-summary-time')).toContainText('2026年9月3日 周四');
    await expect(page.getByTestId('cal-success-summary-time')).toContainText('10:00 – 10:30');

    // Add to calendar 四外链（占位 href，不指向真实日历端点）
    for (const id of [
      'cal-success-link-google',
      'cal-success-link-outlook',
      'cal-success-link-office365',
      'cal-success-link-ics',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await expect(page.getByTestId('cal-success-calendar-links')).toContainText('Google 日历');
    await expect(page.getByTestId('cal-success-calendar-links')).toContainText('下载 ICS 文件');
    for (const id of [
      'cal-success-link-google',
      'cal-success-link-outlook',
      'cal-success-link-office365',
      'cal-success-link-ics',
    ]) {
      const href = await page.getByTestId(id).getAttribute('href');
      expect(href ?? '').not.toContain('calendar.google');
      expect(href ?? '').not.toContain('outlook.live');
      expect(href ?? '').not.toContain('office365');
    }

    // Copy link 静态按钮 + Reschedule/Cancel 链接形态
    await expect(page.getByTestId('cal-success-copy-link')).toContainText('复制链接');
    await expect(page.getByTestId('cal-success-reschedule')).toContainText('重新安排');
    await expect(page.getByTestId('cal-success-cancel')).toContainText('取消预约');

    // 零品牌资产：复刻页子树不含 cal.com 品牌字样/Cal Sans 引用（showcase 头部的应用名说明不在其列）
    const replicaText = await page.getByTestId('cal-success-main').innerText();
    expect(replicaText).not.toContain('Cal Sans');
    expect(replicaText.toLowerCase()).not.toContain('cal.com');

    await snap(page, '03-success.png');
  });
});
