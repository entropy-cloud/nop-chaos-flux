import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Gantt Performance Baseline: idle / scroll / drag FPS on the gantt-perf-scale
 * route (thresholds unchanged: idle >30, scroll >50, drag >50 avg FPS).
 *
 * Run with an extended runner budget: `pnpm test:flux --spec
 * tests/e2e/flux/gantt-perf.flux-spec.ts --timeout 200000` (the old spec used
 * Playwright's per-describe 180s timeout; the flux runner defaults to 30s).
 *
 * Migrated from tests/e2e/gantt-perf.spec.ts (E3 batch 3, engine swap +
 * perf helpers re-implemented inline with ft.evaluate + requestAnimationFrame —
 * the old tests/e2e/helpers/measure-perf.ts took a Playwright Page with typed
 * args which the flux driver cannot inject).
 *
 * TODO(migrate-debt): evaluate fallback (fps measurement and scroll-target
 * probing need page-level script execution; the driver has no locator.evaluate
 * and no typed-arg evaluate, so measureFps/waitForRenderFrames/scrollTop are
 * inlined as JS strings below with the same rAF math and thresholds).
 */

interface FpsResult {
  avgFps: number;
  minFps: number;
  totalFrames: number;
  durationMs: number;
}

// Same math as tests/e2e/helpers/measure-perf.ts measureFps (engine-agnostic:
// page.evaluate + requestAnimationFrame). Returns 0-avg when rAF is starved.
const MEASURE_FPS_JS = `
  new Promise(function (resolve) {
    var timestamps = [];
    var rafId;
    var frame = function (now) {
      timestamps.push(now);
      if (now - timestamps[0] >= 2000) {
        cancelAnimationFrame(rafId);
        var deltas = [];
        for (var i = 1; i < timestamps.length; i++) deltas.push(timestamps[i] - timestamps[i - 1]);
        var totalMs = timestamps[timestamps.length - 1] - timestamps[0];
        var avgFps = deltas.length > 0 ? (deltas.length / totalMs) * 1000 : 0;
        var minFps = 0;
        if (deltas.length > 0) {
          minFps = Infinity;
          for (var j = 0; j < deltas.length; j++) {
            var fps = deltas[j] > 0 ? 1000 / deltas[j] : Infinity;
            if (fps < minFps) minFps = fps;
          }
        }
        resolve({
          avgFps: Math.round(avgFps * 10) / 10,
          minFps: Math.round(minFps * 10) / 10,
          totalFrames: timestamps.length,
          durationMs: Math.round(totalMs * 10) / 10,
        });
        return;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  })
`;

// Same frame-count settle as waitForRenderFrames in measure-perf.ts.
function waitForRenderFramesJs(frames: number): string {
  return `
    new Promise(function (resolve) {
      var remaining = ${frames};
      var tick = function () {
        remaining -= 1;
        if (remaining <= 0) resolve(true);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    })
  `;
}

async function openGanttPerfScale(ft: FtGlobal): Promise<void> {
  // goto to the same hash url is a no-op — bounce through '/#/' gated on the
  // perf heading disappearing so the route remounts per case
  // (ft.reload() destroys the CDP evaluation context mid-spec).
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="gantt-bar"]').first()).not.toBeVisible({ timeoutMs: 15_000 });
  await ft.goto('/#/gantt-perf-scale');
  await ft.expectWeb(ft.locator('body')).toContainText('Gantt Performance Scale', { timeoutMs: 120_000 });
  await ft.expectWeb(ft.locator('[data-slot="gantt-bar"]').first()).toBeVisible({ timeoutMs: 120_000 });
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
}

async function measureFps(ft: FtGlobal): Promise<FpsResult> {
  const raw = await ft.evaluate(MEASURE_FPS_JS);
  return raw as FpsResult;
}

async function settleFrames(ft: FtGlobal, frames: number): Promise<void> {
  await ft.evaluate(waitForRenderFramesJs(frames));
}

export default async function ganttPerf(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: idle FPS at scale
  await openGanttPerfScale(ft);
  await settleFrames(ft, 120);

  const idle = await measureFps(ft);
  console.log(`[PERF] Gantt scale idle FPS: avg=${idle.avgFps}, min=${idle.minFps}, frames=${idle.totalFrames}, duration=${idle.durationMs}ms`);
  if (!(idle.avgFps > 30)) throw new Error(`gantt-perf: idle avgFps ${idle.avgFps} not > 30`);

  await expectNoPageErrors(ft, 'gantt-perf:idle');

  // Case 2: scroll FPS on synchronized grid+timeline
  await openGanttPerfScale(ft);
  await settleFrames(ft, 120);

  // locator.evaluate is not in the driver API — probe the scrollable ancestor
  // of [data-slot="gantt-bars"] and set scrollTop via page-level script.
  await ft.evaluate(`
    (function () {
      var bars = document.querySelector('[data-slot="gantt-bars"]');
      if (!bars) throw new Error('gantt-perf: gantt-bars not found for scroll');
      var scrollable = bars.closest('[style*="overflow"]') || bars.parentElement;
      if (scrollable) scrollable.scrollTop = 500;
    })()
  `);
  await settleFrames(ft, 60);

  const scroll = await measureFps(ft);
  console.log(`[PERF] Gantt scale scroll FPS: avg=${scroll.avgFps}, min=${scroll.minFps}, frames=${scroll.totalFrames}, duration=${scroll.durationMs}ms`);
  if (!(scroll.avgFps > 50)) throw new Error(`gantt-perf: scroll avgFps ${scroll.avgFps} not > 50`);

  await expectNoPageErrors(ft, 'gantt-perf:scroll');

  // Case 3: drag FPS — drag a task bar 200px
  await openGanttPerfScale(ft);
  await settleFrames(ft, 120);

  const taskBar = ft.locator('[data-slot="gantt-bar"]').first();
  await ft.expectWeb(taskBar).toBeVisible({ timeoutMs: 10_000 });

  const box = await taskBar.boundingBox();
  if (!box) {
    console.log('[PERF] Gantt drag FPS: cannot locate task bar, skipping');
    await expectNoPageErrors(ft, 'gantt-perf:drag-skip');
    return { cases: 3 };
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  await ft.mouse.move(centerX, centerY);
  await ft.mouse.down();
  // driver mouse.move has no {steps} — emit 2 fine-grained moves per 10px leg
  // to approximate the old smooth drag while fps is measured afterwards
  for (let i = 0; i < 20; i++) {
    const targetX = centerX + i * 10;
    await ft.mouse.move(centerX + (targetX - centerX) / 2, centerY);
    await ft.mouse.move(targetX, centerY);
  }

  const drag = await measureFps(ft);
  await ft.mouse.up();

  console.log(`[PERF] Gantt scale drag FPS: avg=${drag.avgFps}, min=${drag.minFps}, frames=${drag.totalFrames}, duration=${drag.durationMs}ms`);
  if (!(drag.avgFps > 50)) throw new Error(`gantt-perf: drag avgFps ${drag.avgFps} not > 50`);

  await expectNoPageErrors(ft, 'gantt-perf:drag');

  return { cases: 3 };
}
