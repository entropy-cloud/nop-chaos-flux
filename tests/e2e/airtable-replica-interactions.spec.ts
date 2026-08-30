/**
 * 网格任务跟踪复刻页交互接线测试（plan 2026-08-30-0953-1 P6b Phase 2/3）。
 *
 * 承载分析篇 §4 交互清单处置表（A1–A16）的接线/锁定用例（初屏结构见
 * airtable-replica-visual.spec.ts）。pass/fail 全部为程序化断言（testid
 * 可见性、mock 会话态可观察变化、端点计数、getComputedStyle）；截图仅作
 * 视觉证据附件。
 *
 * 显式裁决不模拟项（处置表落字，无对应用例或以锁定断言承载）：A2 单元格
 * 原位编辑与同格双态（G-D）、A3 附件/协作人/关联/按钮字段编辑器（原语缺口）、
 * A4 ⇧Space 大编辑浮层（G-B2）、A7 动态列模型 + 拖拽三处（G-D）、A13 Space
 * 展开记录（通道实测存在但不接线，用例 06 锁定裁决不回归）、A14 Hide
 * fields 搜索与批量键（G-D）、A15 键盘导航全表（G-B2）、A16 选区/填充/
 * 剪贴板/撤销（G-B3）。
 */
import { expect, test } from './fixtures.js';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTIFACTS_DIR = 'tests/e2e/artifacts/airtable-replica';

async function snap(page: import('@playwright/test').Page, file: string) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS_DIR, file), fullPage: false });
}

async function openPage(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1680, height: 900 });
  await page.goto('#/complex-pages/airtable-grid', { waitUntil: 'commit' });
  await expect(page.getByTestId('complex-page-title')).toContainText('网格任务跟踪 · 电子表格网格', {
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Opt-in mock observation: mirrors the notion endpoint-counter hook pattern. */
async function trackEndpointCalls(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    (window as unknown as { __airtableEndpointCalls: Record<string, number> }).__airtableEndpointCalls = {};
    (window as unknown as { __airtableTestHooks: Record<string, unknown> }).__airtableTestHooks = {};
  });
}

async function readEndpointCalls(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(
    () => (window as unknown as { __airtableEndpointCalls?: Record<string, number> }).__airtableEndpointCalls ?? {},
  );
}

function parseAmount(label: string): number {
  return Number(label.replace(/[¥,]/g, ''));
}

test.describe('Airtable grid — A1 搜索参数化', () => {
  test('01 A1 keyword filters live from the search dialog; empty state and restore', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    expect(await page.getByTestId('airtable-cell-title').count()).toBe(10);

    await page.getByTestId('airtable-search-entry').click();
    const dialog = page.getByTestId('airtable-search-dialog');
    await expect(dialog).toBeVisible();
    const input = page.getByTestId('airtable-search-input').locator('input');

    // 输入即过滤（form submitOnChange + setValue 页面 scope → url 物化 → dependsOn 刷新）
    await input.fill('会员结算页');
    await expect(page.getByTestId('airtable-cell-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText('会员结算页金额精度对齐');

    // 属性值命中（标签「性能」属属性值域）
    await input.fill('性能');
    await expect(page.getByTestId('airtable-cell-title')).not.toHaveCount(0, { timeout: 10_000 });

    // at-search-empty：零命中 → 空态文案不报错
    await input.fill('zzz绝不存在的关键词');
    await expect(page.getByText('当前筛选条件下没有记录')).toBeVisible({ timeout: 10_000 });

    // 清空恢复全量
    await input.fill('');
    await expect(page.getByTestId('airtable-cell-title')).toHaveCount(10, { timeout: 10_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect((await readEndpointCalls(page)).Airtable__records).toBeGreaterThanOrEqual(4);
    await snap(page, 'i01-search.png');
  });
});

test.describe('Airtable grid — A5 列头菜单排序', () => {
  test('02 A5 column-menu sort Z→A reorders the grid by amount desc; sort state persists', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    const firstTitleBefore = await page.getByTestId('airtable-cell-title').first().innerText();

    await page.getByTestId('airtable-colhead-amount').click();
    const menu = page.getByTestId('airtable-column-menu');
    await expect(menu).toBeVisible();
    // 排序条目为 mini-form 载体（form submitScope surface + submitAction setValue 跨 dialog 子 scope）
    await page.getByTestId('airtable-menu-sort-amount-desc').click();

    // 首页 10 行金额降序单调（perPage=100 全量取回 + 客户端分页）
    await expect(page.getByTestId('airtable-column-menu')).not.toBeVisible({ timeout: 10_000 });
    const amounts = await page.getByTestId('airtable-cell-amount').allInnerTexts();
    expect(amounts).toHaveLength(10);
    const parsed = amounts.map(parseAmount);
    for (let i = 1; i < parsed.length; i += 1) {
      expect(parsed[i - 1]).toBeGreaterThanOrEqual(parsed[i]);
    }
    expect(await page.getByTestId('airtable-cell-title').first().innerText()).not.toBe(firstTitleBefore);

    // 排序状态随会话保持（Esc 后行序不回退），A→Z 翻转恢复
    await page.getByTestId('airtable-colhead-amount').click();
    await page.getByTestId('airtable-menu-sort-amount-asc').click();
    await expect(page.getByTestId('airtable-column-menu')).not.toBeVisible({ timeout: 10_000 });
    const ascAmounts = (await page.getByTestId('airtable-cell-amount').allInnerTexts()).map(parseAmount);
    for (let i = 1; i < ascAmounts.length; i += 1) {
      expect(ascAmounts[i - 1]).toBeLessThanOrEqual(ascAmounts[i]);
    }
    expect((await readEndpointCalls(page)).Airtable__records).toBeGreaterThanOrEqual(2);
    await snap(page, 'i02-sort.png');
  });
});

test.describe('Airtable grid — A8 分组切换', () => {
  test('03 A8 group switch rebuilds group heads; counts follow the session', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    // 初态 = 按阶段 4 组（category 默认）
    await expect(page.getByTestId('airtable-group-head')).toHaveCount(4);
    await expect(page.getByTestId('airtable-group-by-category')).toHaveClass(/at-seg-item-active/);

    // 切到按负责人：组头集合 = 协作者名单
    await page.getByTestId('airtable-group-by-owner').click();
    await expect(page.getByTestId('airtable-group-head')).toHaveCount(5, { timeout: 10_000 });
    await expect(page.getByTestId('airtable-group-chip').first()).toContainText('文清鹤');

    // 切到按交付：2 组（已交付/未交付），组内计数合计 = 33
    await page.getByTestId('airtable-group-by-done').click();
    await expect(page.getByTestId('airtable-group-head')).toHaveCount(2, { timeout: 10_000 });
    const counts = page.getByTestId('airtable-group-count');
    let total = 0;
    for (let i = 0; i < 2; i += 1) {
      total += parseInt((await counts.nth(i).innerText()).replace(/\D/g, ''), 10);
    }
    expect(total).toBe(33);
    await expect(page.getByTestId('airtable-group-by-done')).toHaveClass(/at-seg-item-active/);
    expect((await readEndpointCalls(page)).Airtable__records).toBeGreaterThanOrEqual(3);
    await snap(page, 'i03-group.png');
  });
});

test.describe('Airtable grid — A9 行高四档', () => {
  test('04 A9 density switch resizes grid rows live (className expression state drive)', async ({ page }) => {
    await openPage(page);
    const firstRow = page.locator('[data-testid="airtable-grid"] tbody [data-slot="table-row"]').first();

    // 初态 Short ≈32px
    await expect(firstRow).toBeVisible();
    const shortHeight = parseInt(await firstRow.evaluate((el) => getComputedStyle(el).height), 10);
    expect(Math.abs(shortHeight - 32)).toBeLessThanOrEqual(2);
    await expect(page.getByTestId('airtable-rowheight-short')).toHaveClass(/at-seg-item-active/);

    // 切「中」→ 行高 ≈48px + 选中态类随动（表达式 className 响应 scope 变量）
    await page.getByTestId('airtable-rowheight-medium').click();
    await expect(page.getByTestId('airtable-rowheight-medium')).toHaveClass(/at-seg-item-active/, { timeout: 5000 });
    await expect(page.getByTestId('airtable-rowheight-short')).not.toHaveClass(/at-seg-item-active/);
    await expect
      .poll(async () => parseInt(await firstRow.evaluate((el) => getComputedStyle(el).height), 10), {
        timeout: 5000,
      })
      .toBeLessThanOrEqual(52);
    const mediumHeight = parseInt(await firstRow.evaluate((el) => getComputedStyle(el).height), 10);
    expect(Math.abs(mediumHeight - 48)).toBeLessThanOrEqual(2);

    // 切「超高」→ ≈160px
    await page.getByTestId('airtable-rowheight-extra').click();
    await expect
      .poll(async () => parseInt(await firstRow.evaluate((el) => getComputedStyle(el).height), 10), {
        timeout: 5000,
      })
      .toBeGreaterThanOrEqual(158);
    await snap(page, 'i04-density.png');
  });
});

test.describe('Airtable grid — A10 底部插行', () => {
  test('05 A10 empty title is blocked by required validation without a write', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 已登记已知噪声：空提交触发校验失败，宿主 onActionError 记一条 action error。
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page);

    await page.getByTestId('airtable-grid-new-row').click();
    const dialog = page.getByTestId('airtable-new-record-dialog');
    await expect(dialog).toBeVisible();

    await page.getByTestId('airtable-new-record-submit').click();
    const titleField = page.getByTestId('airtable-new-record-input-title');
    await expect(titleField).toHaveAttribute('data-field-invalid', '');
    await expect(titleField.locator('[data-slot="field-error"]')).toBeVisible();
    await expect(dialog).toBeVisible();
    expect((await readEndpointCalls(page)).Airtable__createRecord ?? 0).toBe(0);
  });

  test('06 A10 valid submit posts createRecord; tail insert is reachable via search + summary +1', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);
    await expect(page.getByTestId('airtable-summary-count')).toHaveText('共 33 条记录');

    await page.getByTestId('airtable-grid-new-row').click();
    const dialog = page.getByTestId('airtable-new-record-dialog');
    await expect(dialog).toBeVisible();
    // 品牌边界：打开的浮层子树同样零 "Airtable" 字样
    expect(await dialog.innerText()).not.toContain('Airtable');
    await page.getByTestId('airtable-new-record-input-title').locator('input').fill('链路验证插行记录样本');
    await page.getByTestId('airtable-new-record-select-category').locator('[data-slot="combobox-trigger"]').click();
    await page.locator('[data-slot="combobox-item"]', { hasText: '开发进行' }).click();
    await page.getByTestId('airtable-new-record-submit').click();

    await expect(page.getByText('记录已创建')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('airtable-new-record-dialog')).not.toBeVisible();
    expect((await readEndpointCalls(page)).Airtable__createRecord).toBe(1);

    // 会话态随动：summary 计数 +1、分组源组内计数随刷新、新行 keyword 检索可达（表尾插行）
    await expect(page.getByTestId('airtable-summary-count')).toHaveText('共 34 条记录', { timeout: 10_000 });
    await page.getByTestId('airtable-search-entry').click();
    await page.getByTestId('airtable-search-input').locator('input').fill('链路验证插行');
    await expect(page.getByTestId('airtable-cell-title')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText('链路验证插行记录样本');
    // 默认值（预算 1000 → ¥1,000.00）随创建落库
    await expect(page.getByTestId('airtable-cell-amount').first()).toContainText('1,000.00');
  });
});

test.describe('Airtable grid — 显式裁决锁定', () => {
  test('07 A13 Space-expand stays adjudicated; grid rows expose no click-interactive channel', async ({ page }) => {
    await openPage(page);

    // 裁决注记在库（通道实测存在但不接线的完整证据链）
    await expect(page.getByTestId('airtable-grid-note')).toContainText('Space 展开记录为显式裁决');

    // 行无 data-interactive（onRowClick 未声明 → renderer keydown 中继未激活）
    const rowInteractive = await page
      .locator('[data-testid="airtable-grid"] tbody [data-slot="table-row"]')
      .first()
      .getAttribute('data-interactive');
    expect(rowInteractive).toBeNull();

    // 聚焦行按 Space 不打开 record modal（裁决不回归）
    await page.locator('[data-testid="airtable-grid"] tbody [data-slot="table-row"]').first().focus();
    await page.keyboard.press(' ');
    await page.waitForTimeout(400);
    await expect(page.getByTestId('airtable-record-modal')).not.toBeVisible();
  });
});

test.describe('Airtable grid — A11a record modal 编辑保存', () => {
  test('08 A11a modal edit saves via updateRecord; grid row and summary follow the session', async ({ page }) => {
    await trackEndpointCalls(page);
    await openPage(page);

    // 打开首行记录 modal（编辑前载入值回显）
    await page.getByTestId('airtable-cell-title').first().hover();
    await page.getByTestId('airtable-row-expand').first().click();
    const modal = page.getByTestId('airtable-record-modal');
    await expect(modal).toBeVisible();
    // 品牌边界：modal 子树零 "Airtable" 字样（含编辑区注记）
    expect(await modal.innerText()).not.toContain('Airtable');
    const editTitle = page.getByTestId('airtable-record-edit-title').locator('input');
    await expect(editTitle).toHaveValue('首页信息流卡片双列布局切换');

    // 编辑 + 保存（atEdit* 规范键 → updateRecord → 会话库）
    await editTitle.fill('编辑保存后的首行标题样本');
    await page.getByTestId('airtable-record-edit-amount').locator('input').fill('7777');
    await page.getByTestId('airtable-record-save').click();

    await expect(page.getByText('记录已保存')).toBeVisible({ timeout: 10_000 });
    await expect(modal).not.toBeVisible();
    expect((await readEndpointCalls(page)).Airtable__updateRecord).toBe(1);

    // 网格行随动 + summary 随会话重算（A12）
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText('编辑保存后的首行标题样本', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('airtable-cell-amount').first()).toContainText('7,777.00', { timeout: 10_000 });
    await expect(page.getByTestId('airtable-summary-count')).toHaveText('共 33 条记录');
    // 跨源一致：分组源刷新后组内计数合计不变（33 = 组头计数之和）
    const counts = page.getByTestId('airtable-group-count');
    let total = 0;
    for (let i = 0; i < 4; i += 1) {
      total += parseInt((await counts.nth(i).innerText()).replace(/\D/g, ''), 10);
    }
    expect(total).toBe(33);
  });

  test('09 A11a at-update-miss keeps the modal and the grid unchanged (forced miss via mock hook)', async ({
    page,
    allowConsoleErrors,
  }) => {
    // 失败分支走真实端点（updateMiss 钩子），宿主记录一条 action error 噪声
    allowConsoleErrors(1);
    await trackEndpointCalls(page);
    await openPage(page);

    await page.evaluate(() => {
      (window as unknown as { __airtableTestHooks: { updateMiss: boolean } }).__airtableTestHooks.updateMiss = true;
    });

    await page.getByTestId('airtable-cell-title').first().hover();
    await page.getByTestId('airtable-row-expand').first().click();
    const modal = page.getByTestId('airtable-record-modal');
    await expect(modal).toBeVisible();

    await page.getByTestId('airtable-record-edit-title').locator('input').fill('不应落库的标题');
    await page.getByTestId('airtable-record-save').click();

    // 失败 toast + modal 不关闭（closeOnSubmit 只绑定提交成功）
    await expect(page.getByText('记录保存失败')).toBeVisible({ timeout: 10_000 });
    await expect(modal).toBeVisible();
    expect((await readEndpointCalls(page)).Airtable__updateRecord).toBe(1);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('airtable-cell-title').first()).toContainText('首页信息流卡片双列布局切换', {
      timeout: 10_000,
    });

    await page.evaluate(() => {
      (window as unknown as { __airtableTestHooks: { updateMiss: boolean } }).__airtableTestHooks.updateMiss = false;
    });
  });
});

test.describe('Airtable grid — A11b prev/next 导航', () => {
  test('10 A11b in-dialog reload navigates records; boundary rows disable the nav buttons', async ({ page }) => {
    await openPage(page);

    await page.getByTestId('airtable-cell-title').first().hover();
    await page.getByTestId('airtable-row-expand').first().click();
    const modal = page.getByTestId('airtable-record-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('airtable-record-value-title')).toContainText('首页信息流卡片双列布局切换');

    // 首行：prev 禁用（prevId 缺失 → at-btn-disabled），next 可用
    await expect(page.getByTestId('airtable-record-prev')).toHaveClass(/at-btn-disabled/);
    await expect(page.getByTestId('airtable-record-next')).not.toHaveClass(/at-btn-disabled/);

    // next → AT-102（dialog 内数据重载，表单值随动）
    await page.getByTestId('airtable-record-next').click();
    await expect(page.getByTestId('airtable-record-value-title')).toContainText('会员结算页金额精度对齐', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('airtable-record-edit-title').locator('input')).toHaveValue('会员结算页金额精度对齐');
    await expect(page.getByTestId('airtable-record-prev')).not.toHaveClass(/at-btn-disabled/);

    // prev 回 AT-101 → prev 再度禁用（首尾边界往返）
    await page.getByTestId('airtable-record-prev').click();
    await expect(page.getByTestId('airtable-record-value-title')).toContainText('首页信息流卡片双列布局切换', {
      timeout: 10_000,
    });
    await expect(page.getByTestId('airtable-record-prev')).toHaveClass(/at-btn-disabled/);
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Airtable grid — A6/A14 显式裁决锁定', () => {
  test('11 A6/A14 hide-fields panel stays adjudicated (no fake toggles)', async ({ page }) => {
    await openPage(page);

    await page.getByTestId('airtable-hide-fields-trigger').click();
    const drawer = page.getByTestId('airtable-hide-fields-drawer');
    await expect(drawer).toBeVisible();

    // 裁决注记在库（机制证据 + 缺口归因），主字段锁定注记维持
    await expect(page.getByTestId('airtable-hide-fields-note')).toContainText('显式裁决');
    await expect(page.getByTestId('airtable-hide-fields-note')).toContainText('主字段不可隐藏');

    // 全部隐藏/全部显示为形态按钮（显式裁决不接线）：点击后列结构不变
    await page.getByTestId('airtable-hide-fields-hideall').click();
    await page.waitForTimeout(400);
    expect(await page.getByTestId('airtable-colhead-title').count()).toBe(1);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });
});
