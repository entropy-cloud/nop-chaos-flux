import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// arc-component-gap G1I: input-password showStrength meter e2e. Programmatic
// assertions only (no screenshots as proof): meter presence per value state,
// aria level trio, segment fill count, and hide-on-empty.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('arc-gap G1I input-password showStrength meter', () => {
  test('meter renders per level and hides when the value is empty', async ({ page }) => {
    await gotoPage(page, '/#/lab/input-password');
    const stage = page.locator('[data-testid="scenario-stage-password-strength-meter"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const input = stage.locator('input[type="password"]');
    await expect(input).toHaveCount(1);

    const meter = stage.locator('[data-slot="input-password-strength"]');
    await expect(meter).toHaveCount(0);

    // too short → level 0, single destructive fill, word "Too short"
    await input.fill('abc');
    await expect(meter).toHaveCount(1);
    await expect(meter).toHaveAttribute('aria-valuenow', '0');
    // playground runs zh-CN; level words are pinned in input-password/design.md §10
    await expect(meter).toHaveAttribute('aria-valuetext', '太短');
    expect(await filledSegments(meter)).toBe(1);

    // four criteria met → level 4, all four segments filled
    await input.fill('Abcdef1!');
    await expect(meter).toHaveAttribute('aria-valuenow', '4');
    await expect(meter).toHaveAttribute('aria-valuetext', '强');
    expect(await filledSegments(meter)).toBe(4);

    // two criteria (length ≥ 8 not met, mixed case + digit) → level 2
    await input.fill('Abcdef1');
    await expect(meter).toHaveAttribute('aria-valuenow', '2');
    await expect(meter).toHaveAttribute('aria-valuetext', '一般');
    expect(await filledSegments(meter)).toBe(2);

    // clear → meter unmounts entirely
    await input.fill('');
    await expect(meter).toHaveCount(0);

    await assertTrackedPageErrors(page);
  });
});

async function filledSegments(meter: ReturnType<import('@playwright/test').Page['locator']>) {
  return meter
    .locator('[data-slot="input-password-strength-segment"]:not([class*="bg-muted"])')
    .count();
}
