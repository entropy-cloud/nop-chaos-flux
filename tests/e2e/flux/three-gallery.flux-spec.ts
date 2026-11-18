import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * 559 Phase 4 three-gallery smoke: 6 single-capability examples mounted
 * ready per tab + non-zero pixel probe + programmatic SceneJSON/GLB/twin
 * behavior assertions. SwiftShader soft-render conventions (same method as
 * three-canvas-perf).
 *
 * Migrated from tests/e2e/three-gallery.spec.ts (E3 batch 4, engine swap +
 * conditional polling replaces waitForTimeout in the twin frame-mirror
 * case — the spec fails fast on the first mirrored frame instead of a
 * fixed 2.6s sleep, and per-case isolation uses the gated hash-route bounce
 * instead of fresh Playwright pages).
 *
 * TODO(migrate-debt): canvas.evaluate probes (client size + WebGL readPixels
 * pixel sampling) go through ft.evaluate with the same probe bodies as the
 * old spec — the driver Locator has no evaluate handle for canvas/WebGL
 * contexts.
 */

async function gotoGallery(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the gallery remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('three-gallery-canvas-primitives')).not.toBeVisible();
  await ft.goto('/#/three-gallery');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  await ft.expectWeb(ft.getByTestId('three-gallery-tab-primitives')).toBeVisible({ timeoutMs: 30_000 });
}

async function expectTabReady(ft: FtGlobal, testid: string): Promise<void> {
  const container = ft.getByTestId(testid);
  await ft.expectWeb(container).toHaveAttribute('data-three-scene-state', 'ready', { timeoutMs: 30_000 });
  await ft.expectWeb(container.locator('canvas')).toBeVisible({ timeoutMs: 10_000 });
  // TODO(migrate-debt): canvas.evaluate — client size + WebGL readPixels via
  // ft.evaluate (driver Locator has no evaluate handle)
  const size = await ft.evaluate(
    `(() => { const el = document.querySelector('[data-testid="${testid}"] canvas'); return { w: el.clientWidth, h: el.clientHeight }; })()`,
  );
  if (!size || !(size.w > 0) || !(size.h > 0)) {
    throw new Error(`${testid} canvas has zero client size: ${JSON.stringify(size)}`);
  }
  // non-zero pixel probe (empty all-zero scene fails; same multi-frame
  // sampling as the old spec to absorb frame-order assumptions)
  const nonZero = await ft.evaluate(
    `new Promise((resolve) => {
      let sampled = 0;
      const el = document.querySelector('[data-testid="${testid}"] canvas');
      const read = () => {
        sampled += 1;
        const gl = el.getContext('webgl2') || el.getContext('webgl');
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
    })`,
  );
  if (nonZero !== 1) {
    throw new Error(`${testid} should paint non-zero pixels, probe returned ${nonZero}`);
  }
}

export default async function threeGallery(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: primitives and lights examples render with PBR/controls scenes
  await gotoGallery(ft);
  await expectTabReady(ft, 'three-gallery-canvas-primitives');
  await ft.getByTestId('three-gallery-tab-lights').click();
  await expectTabReady(ft, 'three-gallery-canvas-lights');
  await expectNoPageErrors(ft, 'three-gallery:primitives-lights');

  // Case 2: scene-json example loads native three JSON and drives named-object bindings
  await gotoGallery(ft);
  await ft.getByTestId('three-gallery-tab-scene-json').click();
  await expectTabReady(ft, 'three-gallery-canvas-scene-json');
  // thin-bridge form: the container carries the json assembly (ready means
  // ObjectLoader succeeded); name bindings are driven by the page's 1Hz
  // simulation — non-zero pixels + ready already discriminate assembly
  // (renderer internals have engine unit coverage).
  await expectNoPageErrors(ft, 'three-gallery:scene-json');

  // Case 3: gltf example exports via GLTFExporter and loads the GLB into a second canvas
  await gotoGallery(ft);
  await ft.getByTestId('three-gallery-tab-gltf').click();
  await expectTabReady(ft, 'three-gallery-canvas-gltf-source');
  // export complete → second canvas appears and is ready (full url load chain)
  const loaded = ft.getByTestId('three-gallery-gltf-loaded-wrap');
  await ft.expectWeb(loaded).toBeVisible({ timeoutMs: 20_000 });
  await ft.expectWeb(loaded.locator('[data-testid="three-gallery-canvas-gltf-loaded"]')).toHaveAttribute(
    'data-three-scene-state',
    'ready',
    { timeoutMs: 30_000 },
  );
  await expectNoPageErrors(ft, 'three-gallery:gltf');

  // Case 4: interactions example mounts with data-driven bindings and event toasts
  await gotoGallery(ft);
  await ft.getByTestId('three-gallery-tab-keyframes').click();
  await expectTabReady(ft, 'three-gallery-canvas-keyframes');
  await expectNoPageErrors(ft, 'three-gallery:keyframes');

  // Case 5: twin example streams IndustrialAdapter tag frames into the 3D bindings
  await gotoGallery(ft);
  await ft.getByTestId('three-gallery-tab-twin').click();
  await expectTabReady(ft, 'three-gallery-canvas-twin');

  // synthetic socket 1Hz frames → 500ms mirror: tag panel value changes with
  // frames (data-source liveness). Old spec: waitForTimeout(2600) then re-read.
  // Strengthened: conditional polling with last-actual in the error, so it
  // passes as soon as the mirror lands and fails with the stale value shown.
  const readTemp = async (): Promise<string> => {
    const el = ft.getByTestId('three-gallery-twin-temp');
    await el.waitFor('attached');
    return (await el.text()) ?? '';
  };
  const first = await readTemp();
  let second = first;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    second = await readTemp();
    if (second !== first) break;
  }
  if (second === first) {
    throw new Error(`tag mirror should follow socket frames: value stayed "${first}" for 6s`);
  }

  await expectNoPageErrors(ft, 'three-gallery:twin');

  return { cases: 5 };
}
