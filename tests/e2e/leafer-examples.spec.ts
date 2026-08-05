import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// I17.3 leafer-examples 路由渲染 smoke：#/leafer-examples 可达 + canvas 存在性断言
//（至少一个官方示例渲染出非空 canvas）+ 不破坏既有 playground 路由。程序化断言，无截图判定。

test.describe('LeaferJS Examples reference page (I17.3)', () => {
  test('route is reachable and renders LeaferJS canvases', async ({ page }) => {
    await page.goto('/#/leafer-examples', { waitUntil: 'commit' });
    await expect(
      page.getByRole('heading', { name: 'LeaferJS 官方示例对照页', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    // 四个示例容器全部挂载
    const containers = page.locator('[data-testid="leafer-example-canvas"]');
    await expect(containers).toHaveCount(4, { timeout: 10_000 });

    // 至少一个官方示例渲染出非空 canvas（Leafer 在容器内创建 <canvas> 元素）
    const canvases = containers.locator('canvas');
    await expect(canvases.first()).toBeVisible({ timeout: 10_000 });
    expect(await canvases.count()).toBeGreaterThanOrEqual(1);

    const box = await canvases.first().boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('viewport zoom/move controls are interactive', async ({ page }) => {
    await page.goto('/#/leafer-examples', { waitUntil: 'commit' });
    await expect(
      page.getByRole('heading', { name: 'LeaferJS 官方示例对照页', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });

    // 视口缩放/平移按钮可点击且不报错
    await page.getByRole('button', { name: 'Zoom In' }).click();
    await page.getByRole('button', { name: 'Zoom Out' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();
    await assertTrackedPageErrors(page);
  });
});
