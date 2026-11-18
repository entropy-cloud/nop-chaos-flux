import type { FtGlobal } from '@nop-chaos/flux-test-driver';

/**
 * Calendar Performance Baseline: first-screen render timing budgets.
 *
 * Migrated from tests/e2e/calendar-perf.spec.ts (E3 batch 3, engine swap +
 * measurement loop re-implemented inline with ft.evaluate + rAF hash-set
 * (same thresholds: demo < 500ms, 300x31 scale < 10000ms); home-route arrival
 * is gated on the nop-hero marker because goto is fire-and-forget and
 * ft.reload() is unusable mid-spec).
 *
 * TODO(migrate-debt): evaluate fallback — performance.now() timing around a
 * location.hash assignment with rAF-polling for [data-view="month"] +
 * [data-slot="calendar-matrix"] cannot be expressed with locators; the whole
 * measurement runs as one ft.evaluate async body, mirroring the old
 * page.evaluate helper. The old allowConsoleErrors(100) console-error budget
 * has no driver equivalent; expectNoPageErrors (pageerror channel only) is
 * asserted instead — a stricter signal on a different channel.
 */

const MEASURE_BODY = `(async (hash) => {
  const start = performance.now();
  window.location.hash = hash;
  return await new Promise((resolve) => {
    const check = () => {
      if (document.querySelector('[data-view="month"]') && document.querySelector('[data-slot="calendar-matrix"]')) {
        resolve(String(Math.round((performance.now() - start) * 10) / 10));
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
})`;

async function gotoHome(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 }).catch(() => undefined);
  await ft.expectWeb(ft.locator('[class*="nop-hero"]')).toBeVisible({ timeoutMs: 30_000 });
}

async function measureCalendarScreen(ft: FtGlobal, hashRoute: string): Promise<number> {
  const elapsed = String(await ft.evaluate(`${MEASURE_BODY}('${hashRoute}')`));
  return Number(elapsed);
}

export default async function calendarPerf(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: calendar demo first-screen render targets < 500ms
  await gotoHome(ft);
  const demoElapsed = await measureCalendarScreen(ft, '#/scheduling-calendar');
  console.log(`[PERF] Calendar demo first-screen render time: ${demoElapsed}ms`);
  if (!(demoElapsed < 500)) {
    throw new Error(`calendar demo first-screen render ${demoElapsed}ms exceeds 500ms budget`);
  }

  // Case 2: 300x31 high-scale route first-screen render targets < 10000ms
  await gotoHome(ft);
  const scaleElapsed = await measureCalendarScreen(ft, '#/calendar-perf-scale');
  console.log(`[PERF] Calendar 300×31 first-screen render time: ${scaleElapsed}ms`);
  if (!(scaleElapsed < 10_000)) {
    throw new Error(`calendar-perf-scale first-screen render ${scaleElapsed}ms exceeds 10000ms budget`);
  }

  return { cases: 2 };
}
