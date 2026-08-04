import { expect, type Page } from '@playwright/test';

/**
 * TE-3 canvas 存在性断言（plan 2026-08-04-1558-3 Phase 2）：
 * e2e 此前主要经 `window.__flux_scada_<cid>` 读场景树属性，整画布黑屏仍可能全过——
 * 本 helper 为每个 scada spec 家族补 canvas 存在性/帧计数/像素探测兜底。
 *
 * 断言分层（F2 触发面裁定）：
 * - 硬门禁（必失败）：DOM `<canvas>` 元素存在 + 尺寸非 0 + render 帧计数 > 0。
 *   帧计数经 `handle.forceRender()` → tree render 事件采样（真实 leafer 可靠发射）。
 * - 程序化像素探测（T5 严格化，plan 2026-08-04-2243-3）：
 *   `toDataURL`/`getImageData` 在跨源图片污染（SecurityError）或全零像素下进入 fallback。
 *   SecurityError 始终为非失败 fallback（跨源图片污染，F2）。
 *   **非空场景**（symbols > 0）的 `fallback-all-zero` 视为**失败**（指示 visible:false/opacity:0 回归，
 *   旧 best-effort 门禁掩蔽该失败模式）；**空场景**（symbols: []）允许 fallback-all-zero（合法空屏）。
 *   像素探测命中非零像素时记录「pixel-confirmed」强化证据；非预期的探测异常仍判失败（指示测试本身缺陷）。
 */

export interface CanvasAssertionOptions {
  /** 当 toDataURL/getImageData 命中 SecurityError 时的预期原因标记（诊断用）。 */
  notes?: string;
  /**
   * 允许非空场景的全零像素 fallback（T5 例外通道，plan 2026-08-04-2243-3）。
   * 仅用于**已知视口被移出内容区**的合法全零场景（如性能平移测试的 throughput 循环把视口
   * 移到内容外）——此时 canvas 合法空白，非 visible:false/opacity:0 缺陷。默认 false（严格）。
   */
  allowZeroPixels?: boolean;
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
 * 像素探测：SecurityError 始终 fallback（F2）；非空场景 fallback-all-zero 视为失败（T5），
 * 空场景允许 fallback-all-zero。
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

  // T5（plan 2026-08-04-2243-3）：非空场景下像素全零视为失败。读场景图元数判定场景是否为空——
  // 仅空场景（symbols: []）允许 fallback-all-zero（合法空屏）；非空场景 fallback-all-zero 指示
  // visible:false/opacity:0 等回归（renderFrames>0 满足但画布实空，旧 best-effort 掩蔽该失败模式）。
  const symbolCount = await page.evaluate((key) => {
    const handle = (window as unknown as Record<string, unknown>)[key] as {
      engine?: { getSymbols?: () => unknown[] };
    };
    const symbols = handle?.engine?.getSymbols?.();
    return Array.isArray(symbols) ? symbols.length : -1;
  }, `__flux_scada_${cid}`);

  // ③ 程序化像素探测（T5 严格化，plan 2026-08-04-2243-3）：
  // leafer App 三层模型（ground/tree/sky）各持独立 <canvas>——`data-slot` 落在 `querySelector('canvas')`
  // 返回的首个 canvas（ground 背景层，常透明）。仅探测单一 canvas 会把透明背景层判为全零、漏掉 tree 层
  // 已绘内容。故扫描 `[data-slot="scada-canvas"]` 容器内**全部** canvas，任一命中非零像素即「confirmed」。
  const pixelProbe = await page.locator('[data-slot="scada-canvas"]').evaluate((root) => {
    const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas'));
    if (canvases.length === 0) return 'fallback-all-zero' as const;
    let sawSecurityError = false;
    for (const canvasEl of canvases) {
      try {
        const ctx = canvasEl.getContext('2d');
        if (!ctx) continue;
        const { width, height } = canvasEl;
        if (width === 0 || height === 0) continue;
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
        if (nonZero) return 'confirmed' as const;
      } catch (error) {
        // 跨源图片污染（SecurityError）→ 记录，继续探测其它 canvas
        const name = (error as { name?: string })?.name ?? '';
        if (name === 'SecurityError' || name === 'InvalidStateError') {
          sawSecurityError = true;
          continue;
        }
        throw error;
      }
    }
    // 全部 canvas 都无非零像素：若有 SecurityError 命中 → 退化 fallback；否则真全零
    return sawSecurityError ? ('fallback-security-error' as const) : ('fallback-all-zero' as const);
  });

  const result: CanvasAssertionResult = {
    canvasTag: tagName,
    width: box!.width,
    height: box!.height,
    renderFrames,
    pixelProbe,
  };
  // 像素探测结果仅诊断记录（confirmed 强化证据；fallback 不判失败，F2）
  // T5：非空场景下 fallback-all-zero 视为失败（visible:false/opacity:0 回归会过旧 best-effort 门禁）。
  // SecurityError 始终为 fallback（跨源图片污染，F2）；空场景（symbolCount===0）允许 fallback-all-zero。
  // allowZeroPixels 例外通道：已知视口移出内容区（如 perf throughput 循环）的合法全零。
  if (pixelProbe === 'fallback-all-zero' && symbolCount > 0 && !options.allowZeroPixels) {
    expect(
      pixelProbe,
      `non-empty scada scene (symbols=${symbolCount}) produced all-zero canvas pixels — likely a visible:false/opacity:0 regression masked by renderFrames>0`,
    ).not.toBe('fallback-all-zero');
  }

  console.log(
    `[TE-3] scada canvas assertion: tag=${result.canvasTag}, size=${result.width}x${result.height}, ` +
      `renderFrames=${result.renderFrames}, pixelProbe=${result.pixelProbe}${options.notes ? `, notes=${options.notes}` : ''}`,
  );
  return result;
}
