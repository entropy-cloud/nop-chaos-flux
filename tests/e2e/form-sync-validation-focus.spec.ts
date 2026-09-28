import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 2026-09-28-4 U2 — synchronous validation failure must move focus to the
// first invalid control. jsdom masks the rAF-vs-DOM-commit race, so this is
// the binding browser-level proof (see plan Phase 1 / Phase 3).
test.describe('plan 2026-09-28-4 U2 sync-validation submit focus', () => {
  test('failed submit leaves focus on the first invalid control (username-control)', async ({
    page,
  }) => {
    await page.goto('/#/lab/form', { waitUntil: 'commit' });

    // The lab stacks every scenario on one page; scope to the first form.
    const stage = page.getByTestId('scenario-stage-basic-form-with-select-field');
    const username = stage.locator('#username-control');
    await expect(username).toBeVisible({ timeout: 15_000 });

    const submit = stage.getByRole('button', { name: 'Submit', exact: true });
    // Widen the rAF-vs-commit race window so the pre-fix early-return loses it
    // deterministically (post-fix the bounded retry wins regardless).
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });
    await submit.click();

    const errorAlert = stage
      .locator('[data-slot="field-error"][role="alert"]')
      .filter({ hasText: /username/i })
      .first();
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });

    const focus = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const firstInvalid = document.querySelector('[aria-invalid="true"]');
      return {
        activeId: active?.id ?? null,
        activeIsInvalidOrInside:
          active?.getAttribute('aria-invalid') === 'true' ||
          (active != null && firstInvalid != null && firstInvalid.contains(active)),
      };
    });
    expect(focus.activeIsInvalidOrInside).toBe(true);
    expect(focus.activeId).toBe('username-control');

    await assertTrackedPageErrors(page);
  });
});
