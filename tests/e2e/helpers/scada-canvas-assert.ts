import { expect, type Page } from '@playwright/test';

/**
 * TE-3 canvas 存在性断言（plan 2026-08-04-1558-3 Phase 2）：
 * e2e 此前主要经 `window.__flux_scada_<cid>` 读场景树属性，整画布黑屏仍可能全过——
 * 本 helper 为每个 scada spec 家族补 canvas 存在性/帧计数/像素探测兜底。
 *
 * 断言分层（F2 触发面裁定）：
 * - 硬门禁（必失败）：DOM `<canvas>` 元素存在 + 尺寸非 0 + render 帧计数 > 0。
 *   帧计数经 `handle.forceRender()` → tree render 事件采样（真实 leafer 可靠发射）。
 * - 程序化像素探测（best-effort，不视为失败的 fallback 触发面）：
 *   `toDataURL`/`getImageData` 在跨源图片污染（SecurityError）或全零像素（合法空场景
 *   `symbols: []`、headless 渲染时机）下进入 fallback——两种情况均回落到帧计数门禁。
 *   像素探测命中非零像素时记录「pixel-confirmed」强化证据；其余记录 fallback 原因。
 *   非预期的探测异常仍判失败（指示测试本身缺陷）。
 */

export interface CanvasAssertionOptions {
  /** 当 toDataURL/getImageData 命中 SecurityError 时的预期原因标记（诊断用）。 */
  notes?: string;
}

export interface CanvasAssertionResult {
  canvasTag: string;
  width: number;
  height: number;
  renderFrames: number;
  pixelProbe: 'confirmed' | 'fallback-security-error' | 'fallback-all-zero' | 'skipped';
}

/**
 * 断言 scada 画布已真实渲染（TE-3）。
 * 硬门禁：canvas 元素存在 + 非零尺寸 + render 帧计数 > 0；
 * 像素探测：best-effort，SecurityError/全零回落到帧计数（F2）。
 */
export async function assertScadaCanvasRendered(
  page: Page,
  cid: string,
  options: CanvasAssertionOptions = {},
): Promise<CanvasAssertionResult> {
  // ① DOM canvas 元素存在（Phase 1 已把 data-slot 落到真实 leafer <canvas>）+ 尺寸非 0
  const canvas = page.locator('[data-slot="scada-canvas-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  const tagName = await canvas.evaluate((el) => el.tagName);
  expect(tagName, 'scada-canvas-canvas slot 必须落在真实 <canvas> DOM 元素上').toBe('CANVAS');
  const box = await canvas.boundingBox();
  expect(box, 'scada canvas element must have a bounding box').toBeTruthy();
  expect(box!.width, 'scada canvas must have non-zero width').toBeGreaterThan(0);
  expect(box!.height, 'scada canvas must have non-zero height').toBeGreaterThan(0);

  // ② 帧计数保证：forceRender 驱动一帧 → tree render 事件计数 > 0（真实绘制证据）
  const renderFrames = await page.evaluate(async (key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as {
      tree: { on(event: string, fn: () => void): void; off(event: string, fn: () => void): void };
      forceRender?: () => void;
    };
    let count = 0;
    const listener = (): void => {
      count += 1;
    };
    handle.tree.on('render', listener);
    handle.forceRender?.();
    await new Promise((resolve) => {
      let raf = 0;
      const tick = (): void => {
        if (count > 0) {
          cancelAnimationFrame(raf);
          resolve(undefined);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      // 上限兜底：800ms 内未收到 render 事件即放行（count 仍为 0 → 帧计数断言失败）
      setTimeout(() => {
        cancelAnimationFrame(raf);
        resolve(undefined);
      }, 800);
    });
    handle.tree.off('render', listener);
    return count;
  }, `__flux_scada_${cid}`);
  expect(renderFrames, 'scada tree must render at least one frame after forceRender').toBeGreaterThan(0);

  // ③ 程序化像素探测（best-effort）：SecurityError/全零 → fallback（不判失败，F2）
  const pixelProbe = await canvas.evaluate((el) => {
    const canvasEl = el as HTMLCanvasElement;
    try {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return 'fallback-all-zero' as const;
      const { width, height } = canvasEl;
      if (width === 0 || height === 0) return 'fallback-all-zero' as const;
      // 采样：读取整画布像素，检查是否存在任一非零像素（rgb 或 alpha）
      let nonZero = false;
      const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
      for (let y = 0; y < height && !nonZero; y += step) {
        for (let x = 0; x < width && !nonZero; x += step) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0 || pixel[3] !== 0) {
            nonZero = true;
          }
        }
      }
      return nonZero ? ('confirmed' as const) : ('fallback-all-zero' as const);
    } catch (error) {
      // 跨源图片污染（SecurityError）→ fallback 触发面，不视为失败
      const name = (error as { name?: string })?.name ?? '';
      if (name === 'SecurityError' || name === 'InvalidStateError') {
        return 'fallback-security-error' as const;
      }
      throw error;
    }
  });

  const result: CanvasAssertionResult = {
    canvasTag: tagName,
    width: box!.width,
    height: box!.height,
    renderFrames,
    pixelProbe,
  };
  // 像素探测结果仅诊断记录（confirmed 强化证据；fallback 不判失败，F2）
   
  console.log(
    `[TE-3] scada canvas assertion: tag=${result.canvasTag}, size=${result.width}x${result.height}, ` +
      `renderFrames=${result.renderFrames}, pixelProbe=${result.pixelProbe}${options.notes ? `, notes=${options.notes}` : ''}`,
  );
  return result;
}
