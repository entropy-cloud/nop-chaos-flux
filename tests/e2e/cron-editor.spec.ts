import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// cron-editor L4 冒烟（cron 轨道 C5, plan 540）：编辑→值读回、非法输入报错且不提交、
// 模式切换、预览严格递增、submit 回写、零页面错误、键盘可达。

test.describe('cron-editor lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/lab/cron-editor', { waitUntil: 'commit' });
    await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
  });

  test('text mode: edit commits value; invalid input reports error and is not committed', async ({ page }) => {
    const stage = page.getByTestId('scenario-stage-text-diagnostics');
    await expect(stage).toBeVisible();

    const input = stage.locator('[data-testid="cron-editor-text"]');
    await expect(input).toHaveValue('0 0 9 ? * MON-FRI', { timeout: 15_000 });

    // 非法输入：诊断出现（locale 无关断言）、值不提交
    await input.fill('0 0 0 30 2 ?');
    await expect(stage.locator('[data-testid="cron-editor-diagnostic"]')).toBeVisible();
    await expect(stage.getByTestId('cron-editor-text-echo')).toContainText('MON-FRI');

    // 修正为合法：诊断消失、值提交
    await input.fill('0 30 9 ? * MON-FRI');
    await expect(stage.locator('[data-testid="cron-editor-diagnostic"]')).toHaveCount(0);
    await expect(stage.getByTestId('cron-editor-text-echo')).toContainText('0 30 9');

    await assertTrackedPageErrors(page);
  });

  test('visual mode: segment edit commits; passthrough keeps repeat/range; preview strictly increasing', async ({ page }) => {
    const stage = page.getByTestId('scenario-stage-visual-segments');
    await expect(stage).toBeVisible();

    // C6：visual 缺省派生档（daily → 向导）；分段编辑器在自定义档
    await stage.locator('[data-testid="cron-editor-tier-custom"]').click();
    const hour = stage.locator('[data-testid="cron-editor-segment-hour"]');
    await expect(hour).toHaveValue('9', { timeout: 15_000 });
    await hour.fill('11');

    await expect(stage.getByTestId('cron-editor-visual-echo')).toContainText('0 0 11');

    const entries = stage.locator('[data-testid="cron-editor-preview"] li');
    const count = await entries.count();
    expect(count).toBeGreaterThan(0);
    let prev = -Infinity;
    for (let i = 0; i < count; i++) {
      const t = new Date(await entries.nth(i).textContent()).getTime();
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }

    await assertTrackedPageErrors(page);
  });

  test('submit echo: committed CronScheduleValue is written back on submit', async ({ page }) => {
    const stage = page.getByTestId('scenario-stage-submit-echo');
    await expect(stage).toBeVisible();

    const input = stage.locator('[data-testid="cron-editor-text"]');
    // submit-echo 场景缺省 visual；先切 text 再编辑（同时覆盖模式切换）
    await stage.locator('[data-slot="mode-switch"] button').nth(1).click();
    await expect(input).toBeVisible();
    await input.fill('30 15 8 * * ?');

    await stage.getByRole('button', { name: 'SUBMIT' }).click();
    await expect(page.getByTestId('cron-editor-submit-echo')).toContainText('30 15 8');

    await assertTrackedPageErrors(page);
  });

  test('keyboard: segments are focusable and typeable without pointer', async ({ page }) => {
    const stage = page.getByTestId('scenario-stage-visual-segments');
    await expect(stage).toBeVisible();

    await stage.locator('[data-testid="cron-editor-tier-custom"]').click();
    const second = stage.locator('[data-testid="cron-editor-segment-second"]');
    await second.focus();
    await page.keyboard.type('30');
    await expect(second).toHaveValue('30');
    await expect(stage.getByTestId('cron-editor-visual-echo')).toContainText('30 0 9');

    await assertTrackedPageErrors(page);
  });

  // C6 v2 全量用户旅程（cron 轨道 plan 541）：向导档位编译、每周改周几、repeat/range 区块、
  // range 互斥诊断、预设应用 replace 整值 + 档位条重定位、键盘可达（radiogroup 方向键 + Tab 走查）、零页面错误。
  test('v2 wizard journey: tier compile, weekly dows, repeat/range blocks, preset apply, keyboard', async ({ page }) => {
    const stage = page.getByTestId('scenario-stage-wizard-and-blocks');
    await expect(stage).toBeVisible();

    const echo = stage.getByTestId('cron-editor-wizard-echo');
    await expect(echo).toContainText('0 0 9', { timeout: 15_000 });

    // 档位向导：daily 时间字段改 8 点 → canonical 提交，repeat 透传保留
    const hour = stage.locator('[data-testid="cron-editor-wizard-h"]');
    await expect(hour).toHaveValue('9');
    await hour.fill('8');
    await expect(echo).toContainText('"cron":"0 0 8 * * *"');
    await expect(echo).toContainText('"every":2');

    // 向导每周：切 weekly（周几未选不提交，echo 保持原值）→ 多选周几 → canonical 提交
    await stage.locator('[data-testid="cron-editor-tier-weekly"]').click();
    const dows = stage.locator('[data-testid="cron-editor-wizard-dows"]');
    await expect(dows).toBeVisible();
    await expect(echo).toContainText('"cron":"0 0 8 * * *"');
    await dows.selectOption(['1', '3', '5']);
    await expect(echo).toContainText('"cron":"0 0 8 * * 1,3,5"');

    // repeat 区块：锚点更新结构提交
    await stage.locator('[data-testid="cron-editor-repeat-anchor"]').fill('2026-02-01');
    await expect(echo).toContainText('2026-02-01');

    // range 互斥：end+count 同填 → 形状照实提交 + 诊断就近出现
    await stage.locator('[data-testid="cron-editor-range-end"]').fill('2026-06-30');
    await stage.locator('[data-testid="cron-editor-range-count"]').fill('4');
    await expect(echo).toContainText('"range":{"end":"2026-06-30","count":4}');
    await expect(stage.locator('[data-testid="cron-editor-range-diagnostic"]')).toBeVisible();

    // 预设应用（replace 整值）：repeat/range 重置 + 档位条随 deriveFrequency 重定位（裁决 4；
    // daily-9 派生 daily；hourly 星号时分落 custom 档）
    await stage.locator('#cron-editor-preset-select').selectOption({ index: 2 });
    await expect(echo).toContainText('"cron":"0 0 9 * * *"');
    await expect(echo).not.toContainText('2026-02-01');
    await expect(stage.locator('[data-testid="cron-editor-tier-daily"]')).toHaveAttribute('aria-checked', 'true');

    // 键盘可达：radiogroup 方向键换档（roving tabindex）+ Tab 走查向导字段/预设/区块
    const tierDaily = stage.locator('[data-testid="cron-editor-tier-daily"]');
    await tierDaily.focus();
    await expect(tierDaily).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const tierWeekly = stage.locator('[data-testid="cron-editor-tier-weekly"]');
    await expect(tierWeekly).toBeFocused();
    await expect(tierWeekly).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tierDaily).toBeFocused();
    await page.keyboard.press('Tab');
    // 向导时间字段按 cron 段序（s → mi → h）
    await expect(stage.locator('[data-testid="cron-editor-wizard-s"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(stage.locator('[data-testid="cron-editor-wizard-h"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(stage.locator('#cron-editor-preset-select')).toBeFocused();
    await stage.locator('[data-testid="cron-editor-repeat-every"]').focus();
    await page.keyboard.press('Tab');
    // repeat 已被预设重置：unit/anchor disabled 跳出 tab 序，下一停点为 range-start
    await expect(stage.locator('[data-testid="cron-editor-range-start"]')).toBeFocused();
    // date input 内部分段（chromium 月/日/年）会消耗 Tab：end/count 以可聚焦断言收口
    await stage.locator('[data-testid="cron-editor-range-end"]').focus();
    await expect(stage.locator('[data-testid="cron-editor-range-end"]')).toBeFocused();
    await stage.locator('[data-testid="cron-editor-range-count"]').focus();
    await expect(stage.locator('[data-testid="cron-editor-range-count"]')).toBeFocused();

    await assertTrackedPageErrors(page);
  });
});
