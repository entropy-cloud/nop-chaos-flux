import type { FtGlobal } from '@nop-chaos/flux-test-driver';

/**
 * Diff View Performance Scale — first-screen render budget on the
 * diff-perf-scale route (~14.5k rendered diff lines).
 *
 * Migrated from tests/e2e/diff-perf.spec.ts (E3 batch 3, engine swap +
 * timing measurement re-implemented inline with ft.evaluate + rAF /
 * performance.now under the same <5000ms budget and >1000 line-count floor).
 *
 * Strengthening upgrade: after measuring we assert window.location.hash
 * actually landed on '#/diff-perf-scale', hardening the measurement's
 * validity (the old spec would have "measured" 0ms if the in-page hash
 * navigation silently failed and a stale `[data-diff-type]` node matched).
 *
 * TODO(migrate-debt): evaluate fallback (perf timing/rAF measurement must run
 * in page context; the driver has no page.clock/rAF primitive).
 */

async function measureDiffScreen(ft: FtGlobal): Promise<number> {
  // Client-side hash navigation from the warmed-up home route excludes vite
  // dev-server compile time (calendar-perf pattern) so the measurement
  // reflects pure render cost.
  const js = `(async () => {
    const start = performance.now();
    window.location.hash = '#/diff-perf-scale';
    return new Promise((resolve) => {
      const check = () => {
        if (document.querySelector('[data-diff-type="add"]')) {
          resolve(Math.round((performance.now() - start) * 10) / 10);
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  })()`;
  return ft.evaluate(js);
}

export default async function diffPerf(ft: FtGlobal): Promise<void> {
  await ft.setViewportSize(1280, 800);

  // Warm the app up on the home route first.
  await ft.goto('/#/');
  await ft.expectWeb(ft.locator('[class*="nop-hero"]')).toBeVisible({ timeoutMs: 30_000 });

  const renderTime = await measureDiffScreen(ft);
  console.log(`[PERF] Diff-view scale first-screen render time: ${renderTime}ms`);

  // Upgrade guard: the in-page hash navigation must actually have happened,
  // otherwise the rAF poll could have matched a stale node instantly.
  const hash = await ft.evaluate('window.location.hash');
  if (hash !== '#/diff-perf-scale') {
    throw new Error(`expected hash '#/diff-perf-scale' after measurement, got '${hash}'`);
  }

  await ft.expectWeb(ft.locator('body')).toContainText('Diff View Performance Scale', { timeoutMs: 30_000 });

  const addLines = ft.locator('[data-diff-type="add"]');
  const deleteLines = ft.locator('[data-diff-type="delete"]');
  const contextLines = ft.locator('[data-diff-type="context"]');

  await ft.expectWeb(addLines.first()).toBeVisible({ timeoutMs: 30_000 });
  await ft.expectWeb(deleteLines.first()).toBeVisible({ timeoutMs: 30_000 });
  await ft.expectWeb(contextLines.first()).toBeVisible({ timeoutMs: 30_000 });

  const addCount = await addLines.count();
  const deleteCount = await deleteLines.count();
  const contextCount = await contextLines.count();
  const totalLines = addCount + deleteCount + contextCount;
  console.log(`[PERF] Diff-view lines rendered: add=${addCount}, delete=${deleteCount}, context=${contextCount}, total=${totalLines}`);

  if (totalLines <= 1000) throw new Error(`expected totalLines > 1000, got ${totalLines}`);
  // ~14.5k rendered diff lines: the original <200ms budget predated the
  // full-line render (hunks were collapsed by default) and was never
  // exercised. 5000ms mirrors the calendar-perf precedent (9.3k cells → 10s).
  if (renderTime >= 5000) throw new Error(`first-screen render ${renderTime}ms exceeded 5000ms budget`);
}
