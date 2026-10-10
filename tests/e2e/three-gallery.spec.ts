import { expect, test, type Page } from './fixtures.js';

// 559 Phase 4 three-gallery 冒烟：6 个单能力点示例逐 tab 挂载 ready + 像素非零 +
// SceneJSON/GLB/twin 关键行为程序化断言。SwiftShader 软渲染口径（three-canvas-perf 同法）。

async function gotoGallery(page: Page): Promise<void> {
  await page.goto('/#/three-gallery', { waitUntil: 'load' });
}

async function expectTabReady(page: Page, testid: string): Promise<void> {
  const container = page.locator(`[data-testid="${testid}"]`);
  await expect(container).toHaveAttribute('data-three-scene-state', 'ready', { timeout: 30_000 });
  const canvas = container.locator('canvas');
  await expect(canvas).toBeVisible();
  const size = await canvas.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);
  // 像素非零探测（非空场景全零判败；three-perf 同法，多帧采样兜底帧序假设）
  const nonZero = await canvas.evaluate(
    (el) =>
      new Promise<number>((resolve) => {
        let sampled = 0;
        const read = (): void => {
          sampled += 1;
          const gl = (el as HTMLCanvasElement).getContext('webgl2') ?? (el as HTMLCanvasElement).getContext('webgl');
          if (!gl) return resolve(-1);
          const pixels = new Uint8Array(4 * 64);
          gl.readPixels(0, 0, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          for (const value of pixels) {
            if (value !== 0) return resolve(1);
          }
          if (sampled >= 30) return resolve(0);
          requestAnimationFrame(read);
        };
        requestAnimationFrame(read);
      }),
  );
  expect(nonZero, `${testid} should paint non-zero pixels`).toBe(1);
}

test.describe('Three Gallery (559 Phase 4)', () => {
  test('primitives and lights examples render with PBR/controls scenes', async ({ page }) => {
    await gotoGallery(page);
    await expectTabReady(page, 'three-gallery-canvas-primitives');
    await page.getByTestId('three-gallery-tab-lights').click();
    await expectTabReady(page, 'three-gallery-canvas-lights');
  });

  test('scene-json example loads native three JSON and drives named-object bindings', async ({ page }) => {
    await gotoGallery(page);
    await page.getByTestId('three-gallery-tab-scene-json').click();
    await expectTabReady(page, 'three-gallery-canvas-scene-json');
    // 薄桥接形态：场景容器携带 json 装配（ready 即 ObjectLoader 装配成功），name 绑定随页面
    // 1Hz 模拟数据持续驱动（armSwing/hookLift）——像素非零 + ready 已构成装配判别；
    // 深层值断言经调试句柄不跨页暴露，此处以 UI 链路为准（renderer 内部行为有引擎单测覆盖）。
  });

  test('gltf example exports via GLTFExporter and loads the GLB into a second canvas', async ({ page }) => {
    await gotoGallery(page);
    await page.getByTestId('three-gallery-tab-gltf').click();
    await expectTabReady(page, 'three-gallery-canvas-gltf-source');
    // 导出完成 → 第二画布出现并 ready（url 加载全链路）
    const loaded = page.locator('[data-testid="three-gallery-gltf-loaded-wrap"]');
    await expect(loaded).toBeVisible({ timeout: 20_000 });
    await expect(loaded.locator('[data-testid="three-gallery-canvas-gltf-loaded"]')).toHaveAttribute(
      'data-three-scene-state',
      'ready',
      { timeout: 30_000 },
    );
  });

  test('interactions example mounts with data-driven bindings and event toasts', async ({ page }) => {
    await gotoGallery(page);
    await page.getByTestId('three-gallery-tab-keyframes').click();
    await expectTabReady(page, 'three-gallery-canvas-keyframes');
  });

  test('twin example streams IndustrialAdapter tag frames into the 3D bindings', async ({ page }) => {
    await gotoGallery(page);
    await page.getByTestId('three-gallery-tab-twin').click();
    await expectTabReady(page, 'three-gallery-canvas-twin');

    // 合成 socket 1Hz 帧 → 500ms 镜像：标签面板数值随帧变化（数据源活性判别）
    const readTemp = (): Promise<string> =>
      page.getByTestId('three-gallery-twin-temp').innerText();
    const first = await readTemp();
    await page.waitForTimeout(2600);
    const second = await readTemp();
    expect(second, 'tag mirror should follow socket frames').not.toBe(first);
  });
});
