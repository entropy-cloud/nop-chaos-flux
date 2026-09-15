import { expect, test, type Page } from './fixtures.js';

// plan 469：three-canvas 浏览器侧 fps e2e 基准（plan 465 Deferred「浏览器侧 fps e2e 基准」
// Successor 义务的兑现，演示场景 #/three-canvas-demo，纯图元无外链 GLB）。
//
// 测量口径（scada-perf 同法）：
// - headless Chromium 经 SwiftShader 软渲染提供 WebGL2（2026-09-15 探针 `_tmp/webgl-probe.mjs`
//   确认），fps 为软件渲染口径——只作「渲染循环健康」基线，不代表目标硬件吞吐。
// - fps：固定窗口 rAF 计数，3 采样取最大（headless 帧钟随机器负载波动，scada-perf 先例口径）。
//   下限阈值 5 fps 为「循环未被挂起」的宽容门禁（正常 SwiftShader 简单场景远高于此）；
//   环境固有失败按 DV watch-only 终态清单流程注册，不静默放宽阈值。
// - 像素探测（scada-canvas-assert T5 同法，非空场景全零判败）：three 渲染器未开
//   preserveDrawingBuffer，合成后读 backbuffer 得全零——但 SceneManager 帧循环为连续
//   rAF 自续（frame() 末尾 scheduleTick()），且先于探针注册，故同帧回调序恒为
//   [three render → 探针读]：探针 readPixels 读到当帧新绘制内容。仍保留多帧采样窗口
//   （任一非零即 pixel-confirmed）作为帧序假设的兜底证据。
// - 绑定负载：页面 10Hz setInterval 注入 spin/heat/heatColor → 绑定管线持续驱动
//   rotation/position/color/visible，fps 测量在绑定热路径活动状态下进行。

const DEMO_TESTID = 'three-demo-canvas';
const FPS_FLOOR = 5;
const FPS_SAMPLE_MS = 2000;
const FPS_SAMPLES = 3;
const PIXEL_PROBE_FRAMES = 40;

async function gotoReadyDemo(page: Page): Promise<void> {
  await page.goto('/#/three-canvas-demo', { waitUntil: 'load' });
  const container = page.locator(`[data-testid="${DEMO_TESTID}"]`);
  await expect(container).toHaveAttribute('data-three-scene-state', 'ready', { timeout: 30_000 });
}

test.describe('three-canvas demo fps e2e', () => {
  test('demo scene really renders (hard gates + pixel probe)', async ({ page, assertZeroPageErrors }) => {
    await gotoReadyDemo(page);

    const canvas = page.locator(`[data-testid="${DEMO_TESTID}"] canvas`);
    await expect(canvas).toBeVisible();
    const size = await canvas.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
    expect(size.w, 'canvas width must be non-zero').toBeGreaterThan(0);
    expect(size.h, 'canvas height must be non-zero').toBeGreaterThan(0);

    const rafAdvanced = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          let settled = false;
          requestAnimationFrame(() => {
            settled = true;
            resolve(true);
          });
          setTimeout(() => {
            if (!settled) resolve(false);
          }, 1000);
        }),
    );
    expect(rafAdvanced, 'rAF loop must advance').toBe(true);

    const probe = await page.evaluate(
      ({ frames, testid }) =>
        new Promise<{ ok: boolean; reason: string; sampled: number; nonZero: number }>((resolve) => {
          const canvasEl = document.querySelector(
            `[data-testid="${testid}"] canvas`,
          ) as HTMLCanvasElement | null;
          if (!canvasEl) {
            resolve({ ok: false, reason: 'no-canvas', sampled: 0, nonZero: 0 });
            return;
          }
          const gl = (canvasEl.getContext('webgl2') ||
            canvasEl.getContext('webgl')) as WebGL2RenderingContext | WebGLRenderingContext | null;
          if (!gl || gl.isContextLost()) {
            resolve({ ok: false, reason: 'no-gl', sampled: 0, nonZero: 0 });
            return;
          }
          const px = new Uint8Array(4);
          const w = gl.drawingBufferWidth;
          const h = gl.drawingBufferHeight;
          let sampled = 0;
          let nonZero = 0;
          const step = (): void => {
            const points: Array<[number, number]> = [
              [w >> 1, h >> 1],
              [w >> 2, h >> 2],
              [(3 * w) >> 2, h >> 2],
              [w >> 2, (3 * h) >> 2],
              [(3 * w) >> 2, (3 * h) >> 2],
            ];
            for (const [x, y] of points) {
              gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
              if (px[0] | px[1] | px[2] | px[3]) {
                nonZero++;
                break;
              }
            }
            sampled++;
            if (nonZero > 0 || sampled >= frames) {
              resolve({
                ok: nonZero > 0,
                reason: nonZero > 0 ? 'pixel-confirmed' : 'fallback-all-zero',
                sampled,
                nonZero,
              });
              return;
            }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
      { frames: PIXEL_PROBE_FRAMES, testid: DEMO_TESTID },
    );
    expect(probe.ok, `pixel probe result: ${JSON.stringify(probe)}`).toBe(true);
    expect(probe.reason).toBe('pixel-confirmed');

    await assertZeroPageErrors();
  });

  test('fps baseline under binding hot-path load (3 samples, max)', async ({
    page,
    assertZeroPageErrors,
  }) => {
    await gotoReadyDemo(page);

    const samples = await page.evaluate(
      ({ sampleMs, samples: count }) =>
        new Promise<number[]>((resolve) => {
          const results: number[] = [];
          const runSample = (): void => {
            let frames = 0;
            const start = performance.now();
            const cb = (): void => {
              frames++;
              const elapsed = performance.now() - start;
              if (elapsed >= sampleMs) {
                results.push((frames * 1000) / elapsed);
                if (results.length >= count) resolve(results);
                else runSample();
              } else {
                requestAnimationFrame(cb);
              }
            };
            requestAnimationFrame(cb);
          };
          runSample();
        }),
      { sampleMs: FPS_SAMPLE_MS, samples: FPS_SAMPLES },
    );

    const fpsMax = Math.max(...samples);
    console.log(
      `[three-canvas-perf] fps samples: ${samples.map((f) => f.toFixed(1)).join(' / ')} | max: ${fpsMax.toFixed(1)} (floor ${FPS_FLOOR})`,
    );
    expect(samples).toHaveLength(FPS_SAMPLES);
    expect(fpsMax, `max fps ${fpsMax.toFixed(1)} must exceed floor ${FPS_FLOOR}`).toBeGreaterThan(
      FPS_FLOOR,
    );

    await assertZeroPageErrors();
  });
});
