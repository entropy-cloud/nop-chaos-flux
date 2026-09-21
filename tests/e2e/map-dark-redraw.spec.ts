import { expect, test } from '@playwright/test';
import { getComputedStyleValue } from './helpers/visual-assert.js';

/**
 * map dark 重绘响应断言（plan 482 R1/A5），宿主 map-demo：
 * - 属性态（判据主体）：data-mode 翻转 + map 子树 chrome 计算样式随主题 token 翻转。
 * - 画布存活性：pin 卡矢量画布有绘制（重绘路径无异常）。
 *
 * 像素颜色判据实测不可行（记入 daily log，plan 482 Non-Blocking Follow-ups）：
 * `resolveMapTheme` 探针以 `border: 1px solid var(--token)` 取色，而本仓主题 token 为
 * 裸 HSL 三元组（shadcn 约定，消费形如 `hsl(var(--token))`），探针计算值恒退化为
 * `rgb(0,0,0)`——OL 调色板与模式无关地恒黑，像素均值不随 data-mode 变化。该探针机制
 * 属 R7 族 watch-only（V11b Non-Goals），R1 触发器路径（MutationObserver → setTheme →
 * layer.changed）由 map 包单测三用例钉住。
 */

interface CanvasSample {
  paintedPx: number;
}

async function samplePinCanvas(page: import('@playwright/test').Page): Promise<CanvasSample> {
  return page.evaluate(() => {
    const pinMap = document.querySelectorAll('[data-slot="map"]')[1];
    if (!pinMap) return { paintedPx: 0 };
    let n = 0;
    for (const canvas of Array.from(pinMap.querySelectorAll('canvas'))) {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d');
      if (!ctx) continue;
      const { width, height } = canvas as HTMLCanvasElement;
      if (width === 0 || height === 0) continue;
      const data = ctx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 10) n++;
      }
    }
    return { paintedPx: n };
  });
}

test('map demo responds to the data-mode flip (attribute state + canvas alive)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/map-demo', { waitUntil: 'commit' });

  const regionMap = page.locator('[data-slot="map"]').first();
  await expect(regionMap).toBeVisible({ timeout: 30_000 });
  const pinMap = page.locator('[data-slot="map"]').nth(1);
  await expect(pinMap.locator('canvas').first()).toBeAttached({ timeout: 30_000 });
  await expect
    .poll(async () => (await samplePinCanvas(page)).paintedPx, {
      message: 'pin canvas should have paint before the theme flip',
    })
    .toBeGreaterThan(0);

  const borderLight = await getComputedStyleValue(regionMap, 'border-top-color');
  const backgroundLight = await getComputedStyleValue(regionMap, 'background-color');

  await page.getByLabel('模式').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

  // 属性态：map 子树 chrome 消费主题 token，dark 翻转后计算样式变化
  const borderDark = await getComputedStyleValue(regionMap, 'border-top-color');
  const backgroundDark = await getComputedStyleValue(regionMap, 'background-color');
  expect(borderDark).not.toBe(borderLight);
  expect(backgroundDark).not.toBe(backgroundLight);

  // 画布存活：主题翻转后 pin 卡画布仍有绘制（重绘路径未崩溃）
  await expect
    .poll(async () => (await samplePinCanvas(page)).paintedPx, {
      message: 'pin canvas should still have paint after the theme flip',
    })
    .toBeGreaterThan(0);
});
