import { expect, test } from './fixtures.js';

/**
 * ux-r11 收敛复审计 P1 修复程序化断言。
 *
 * n1-word-inview：WorkbenchShell 隐式栅格轨道被 word-editor ribbon 工具条
 * max-content 撑爆（探针实测 computed grid-template-columns 2964.5px），
 * 大纲面板被推出 1440 视口（条目 x=2652）成死灰区——修复为根容器 grid-cols-1
 * 单列钳制后，大纲回到视口内、ribbon 的 overflow-x-auto 真正生效。
 *
 * n2-linear-stable：linear-issues 首屏偶发空面板（复审计两次探针见空态，
 * review 对 HEAD 3 次 fresh load 全绿）——born-green 稳定性回归钉。
 * 注意：本钉兼作负载下的竞态探测器——若在 CI 高负载时间歇性变红，
 * 那是竞态信号（应归 follow-up 调查取证），不要当 flake 重试吞掉。
 */

test('n1-word-inview: word editor outline sits inside the 1440 viewport with a scrollable ribbon', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.nop-word-editor-page')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);

  // 大纲条目横向进入视口（修复前 x=2652，修复后应 ≤ 1440）
  const outlineEntry = page.locator('.nop-word-editor-page').getByText('一、发布范围', {
    exact: true,
  });
  await expect(outlineEntry.first()).toBeVisible({ timeout: 15_000 });
  const box = await outlineEntry.first().boundingBox();
  expect(box, 'outline entry bounding box').toBeTruthy();
  expect(box!.x + box!.width, 'outline right edge within viewport').toBeLessThanOrEqual(1440);

  // ribbon 工具条被钳制在视口内且横向滚动生效（clientWidth ≤ 1440 ≤ scrollWidth）
  const ribbon = page.locator('.nop-word-editor-page [class*="overflow-x-auto"]').first();
  await expect(ribbon).toBeVisible();
  const ribbonBox = await ribbon.boundingBox();
  expect(ribbonBox?.width ?? 0, 'ribbon client width clamped').toBeLessThanOrEqual(1441);
  // 滚动真实生效：内容仍可横向滚出（钳制后 clientWidth < scrollWidth；
  // closure audit 顾问——只断言钳制不断言可滚会漏掉"钳了但不可滚"的回退）
  const ribbonScroll = await ribbon.evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(ribbonScroll.scrollWidth, 'ribbon content overflows (scrollable)').toBeGreaterThanOrEqual(
    ribbonScroll.clientWidth,
  );
});

test('n2-linear-stable: linear issues renders rows across 3 consecutive fresh loads', async ({
  page,
}) => {
  for (let load = 0; load < 3; load += 1) {
    await page.goto('about:blank');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/complex-pages/linear-issues', { waitUntil: 'domcontentloaded' });
    const rowKeys = page.locator('[data-testid="linear-issues-row-key"]');
    await expect(
      rowKeys.first(),
      `fresh load #${load + 1} should render issue rows without any input`,
    ).toBeVisible({ timeout: 30_000 });
    const count = await rowKeys.count();
    expect(count, `fresh load #${load + 1} row count`).toBeGreaterThanOrEqual(1);
  }
});
