import { expect, test } from './fixtures.js';

// plan 633 UR-6: fetch-failure visibility pin for the linear-issues replica.
// Forensics (2026-10-17, _tmp/plan633 record in daily log): a single-shot
// issues-read failure self-heals via the dependsOn initialization refresh,
// but 3 consecutive failures land the page on a misleading "当前筛选条件下
// 没有问题" empty state with no error hint and no retry affordance. The
// statusPath + error-aware empty slot + retry button turn the failure into a
// visible, recoverable state. The injection hook is opt-in (production
// never sets window.__linearTestHooks) — mock-backend-linear.ts.
test('issues fetch failure surfaces an error empty state with a working retry', async ({
  page,
  allowConsoleErrors,
}) => {
  test.setTimeout(120_000);
  // 注入的读失败会让「耗尽额度那一次重试」在 showcase 通道留下 1-4 条预期内的
  // action error 日志（数据源自身的失败走 error 态、不落 console）；本测主题是
  // 失败可见性与重试恢复，不做零 console 断言。
  allowConsoleErrors(4);
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__linearTestHooks = { failNextIssuesReads: 3 };
  });
  await page.goto('about:blank');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/complex-pages/linear-issues', { waitUntil: 'domcontentloaded' });

  // Failure lands on the error-aware empty state — not the misleading
  // "no issues under current filters" copy.
  const emptySlot = page.locator('.ln-empty');
  await expect(emptySlot).toBeVisible({ timeout: 30_000 });
  await expect(emptySlot).toContainText('数据加载失败', { timeout: 10_000 });
  await expect(emptySlot).not.toContainText('当前筛选条件下没有问题');

  // Retry recovers the rows. The injection holds up to 3 failure credits
  // while the page's natural mount performs ~2 reads (init + dependsOn
  // initialization refresh), so the first retry may consume the last credit —
  // a second retry then deterministically passes (credits exhausted).
  const retry = emptySlot.getByRole('button', { name: '重试' });
  const rowKeys = page.locator('[data-testid="linear-issues-row-key"]');
  await expect(retry).toBeVisible();
  await retry.click();
  const recovered = await rowKeys
    .first()
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!recovered) {
    await retry.click();
    await expect(rowKeys.first()).toBeVisible({ timeout: 30_000 });
  }

});
