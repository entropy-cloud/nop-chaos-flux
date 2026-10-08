import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-8b (plan 553) P1 red→green specs for the renderer-lab batch.
// Each case reproduces a finding from the plan-553 four-group live audit;
// convictions cite programmatic readings, never screenshots.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('IS-8b renderer-lab interaction state (plan 553)', () => {
  // IS-lab-wizard-001: in linear mode the nav click on the next unvisited
  // step (furthestReached + 1) bypassed the step-commit gate entirely — an
  // empty required field jumped straight to Review with zero errors. Green:
  // that nav button is disabled; only the 下一步 commit path advances.
  test('wizard: nav click on the next unvisited step is gated by commit', async ({ page }) => {
    await gotoPage(page, '/#/lab/wizard');
    const stage = page.locator('[data-testid^="scenario-stage-host-wizard-step-validation"]').first();
    await expect(stage).toBeVisible({ timeout: 15_000 });
    // the first-step required field stays empty — the commit gate must hold
    const navButtons = stage.locator('[data-slot="wizard-step-nav-button"]');
    const navCount = await navButtons.count();
    expect(navCount, 'the validation wizard renders its step nav').toBeGreaterThanOrEqual(2);
    await expect(
      navButtons.nth(1),
      'the next-unvisited-step nav item must be disabled (pre-fix: clickable and jumped to Review)',
    ).toBeDisabled();
    await page.waitForTimeout(400);
    const activeIdx = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[data-slot="wizard-step-nav-button"]')];
      return btns.findIndex((b) => b.dataset.active === 'true');
    });
    expect(activeIdx, 'the wizard must stay on step 0').toBe(0);
    await assertTrackedPageErrors(page);
  });

  // IS-lab-wizard-002: mountOnEnter defaulted to false — leaving a step
  // unmounted its embedded form store, so 上一步 always returned to a blank
  // step. Green (default flipped to keep visited steps mounted): the typed
  // value survives the round trip.
  test('wizard: going back preserves typed values', async ({ page }) => {
    await gotoPage(page, '/#/lab/wizard');
    const stage = page.locator('[data-testid^="scenario-stage-host-wizard-step-validation"]').first();
    await expect(stage).toBeVisible({ timeout: 15_000 });
    const input = stage.locator('input').first();
    await input.fill('Acme Corp');
    await stage.locator('[data-testid="wizard-next"]').click();
    await page.waitForTimeout(500);
    await stage.locator('[data-testid="wizard-prev"]').click();
    await page.waitForTimeout(500);
    await expect(input, 'back must preserve typed values (mountOnEnter default flip)').toHaveValue('Acme Corp');
    await assertTrackedPageErrors(page);
  });
});
