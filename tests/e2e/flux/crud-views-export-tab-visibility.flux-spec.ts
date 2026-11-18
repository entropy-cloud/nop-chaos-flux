import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * FM-8 J2 (plan 652; FM-036 regression pin at the page level): switching the
 * crud-views-export view tabs must hide the previously active tabpanel
 * immediately. The discriminator is the assertion WINDOW — without the
 * FM-036 render-time hidden, base-ui only flips the attribute after its
 * animations-finished callback, which measured >=2.6s on this page (FM-1a);
 * with the fix the attribute lands within the first commit. The hidden
 * attribute is therefore polled with a 400ms cap: far below the pre-fix
 * delay, tolerant of the one-frame commit race right after click().
 *
 * NOTE (FM-8 plan 652 adjudication): a planned animation-amplifier variant
 * (planting a pending animation to force the pre-fix stall) was probed and
 * REMOVED — under a pending animation the render-time hidden prop does not
 * reach the DOM in a real browser (base-ui transition state keeps the panel
 * visible; probe evidence in the plan/ledger), so the amplified variant fails
 * even with the FM-036 fix. The page-level pin therefore guards the
 * no-animation contract (hidden within 400ms); the discriminating red-green
 * lives in the RTL test with a polyfilled never-finishing getAnimations
 * (basic-tabs-behavior.test.tsx FM-036 describe). The animation-fragility of
 * the prop approach is registered as an FM-036 refinement candidate.
 *
 * Migrated from tests/e2e/crud-views-export-tab-visibility.spec.ts (E3 batch 3,
 * engine swap + kernel white-box expectNoPageErrors at spec end; expect.poll
 * with a 400ms cap re-implemented as a tight inline ft.evaluate poll loop with
 * the same 400ms deadline and 25ms interval — preserving the discriminating
 * assertion window).
 *
 * TODO(migrate-debt): evaluate fallback — panel[0].hasAttribute('hidden') polled
 * against a sub-second deadline cannot reuse the coarser expectWeb retry
 * polling; the read goes through ft.evaluate, mirroring the old page.evaluate
 * expect.poll bodies.
 */

const HIDDEN_WINDOW_MS = 400;
const POLL_INTERVAL_MS = 25;

async function pollHiddenWithinWindow(
  ft: FtGlobal,
  panelIndex: number,
  marker: string,
): Promise<void> {
  // FM-036 discriminator: the hidden attribute must land within 400ms of the click.
  const deadline = Date.now() + HIDDEN_WINDOW_MS;
  let last = 'null';
  for (;;) {
    last = String(
      await ft.evaluate(
        `(() => {
          const panel = document.querySelectorAll('[data-slot="tabs-content"]')[${panelIndex}];
          return panel ? String(panel.hasAttribute('hidden')) : 'null';
        })()`,
      ),
    );
    if (last === 'true') return;
    if (Date.now() > deadline) {
      throw new Error(`${marker}: tabpanel[${panelIndex}] hidden attribute not set within ${HIDDEN_WINDOW_MS}ms (last=${last})`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export default async function crudViewsExportTabVisibility(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/complex-pages/crud-views-export');

  const triggers = ft.locator('[data-slot="tabs-trigger"]');
  await ft.expectWeb(triggers.first()).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(triggers).toHaveCount(2);

  // 表格视图 active by default; switch to 卡片视图.
  await triggers.nth(1).click();
  await pollHiddenWithinWindow(ft, 0, 'switch-to-card-view');

  // And back: switching again hides the card panel within the same window.
  await triggers.nth(0).click();
  await pollHiddenWithinWindow(ft, 1, 'switch-back-to-table-view');

  await expectNoPageErrors(ft, 'crud-views-export-tab-visibility');

  return { cases: 1 };
}
