import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// FM-8 J2 (plan 652; FM-036 regression pin at the page level): switching the
// crud-views-export view tabs must hide the previously active tabpanel
// immediately. The discriminator is the assertion WINDOW — without the
// FM-036 render-time hidden, base-ui only flips the attribute after its
// animations-finished callback, which measured >=2.6s on this page (FM-1a);
// with the fix the attribute lands within the first commit. The hidden
// attribute is therefore polled with a 400ms cap: far below the pre-fix
// delay, tolerant of the one-frame commit race right after click().

test.describe('FM-8 J2: crud-views-export view tab visibility', () => {
  test('switching views hides the previously active tabpanel immediately', async ({ page }) => {
    await page.goto('/#/complex-pages/crud-views-export', { waitUntil: 'commit' });

    const triggers = page.locator('[data-slot="tabs-trigger"]');
    await expect(triggers.first()).toBeVisible({ timeout: 15_000 });
    await expect(triggers).toHaveCount(2);

// NOTE (FM-8 plan 652 adjudication): a planned animation-amplifier variant
// (planting a pending animation to force the pre-fix stall) was probed and
// REMOVED — under a pending animation the render-time hidden prop does not
// reach the DOM in a real browser (base-ui transition state keeps the panel
// visible; probe evidence in the plan/ledger), so the amplified variant fails
// even with the FM-036 fix. The page-level pin therefore guards the
// no-animation contract (hidden within 400ms); the discriminating red-green
// lives in the RTL test with a polyfilled never-finishing getAnimations
// (basic-tabs-behavior.test.tsx FM-036 describe). The animation-fragility of
// the prop approach is registered as an FM-036 refinement candidate.

    // 表格视图 active by default; switch to 卡片视图.
    await triggers.nth(1).click();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const panel = document.querySelectorAll('[data-slot="tabs-content"]')[0];
            return panel?.hasAttribute('hidden') ?? null;
          }),
        { timeout: 400, intervals: [50] },
      )
      .toBe(true);

    // And back: switching again hides the card panel within the same window.
    await triggers.nth(0).click();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const panel = document.querySelectorAll('[data-slot="tabs-content"]')[1];
            return panel?.hasAttribute('hidden') ?? null;
          }),
        { timeout: 400, intervals: [50] },
      )
      .toBe(true);

    await assertTrackedPageErrors(page);
  });
});
