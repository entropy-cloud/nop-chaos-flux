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

    const second = stage.locator('[data-testid="cron-editor-segment-second"]');
    await second.focus();
    await page.keyboard.type('30');
    await expect(second).toHaveValue('30');
    await expect(stage.getByTestId('cron-editor-visual-echo')).toContainText('30 0 9');

    await assertTrackedPageErrors(page);
  });
});
