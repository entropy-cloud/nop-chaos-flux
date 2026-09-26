import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

function readoutFor(stage: ReturnType<Page['getByTestId']>) {
  return stage
    .getByText(/^Code:/)
    .evaluate((el) => (el instanceof HTMLElement ? el.innerText : ''));
}

async function openVerificationLab(page: Page): Promise<void> {
  await page.goto('/#/lab/verification-code', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('form — verification-code (missing-components L2.4)', () => {
  test('typing distributes across cells and commits only at full length', async ({ page }) => {
    await openVerificationLab(page);

    const stage = page.getByTestId('scenario-stage-six-digit-code-with-live-readout');
    const input = stage.locator('[data-input-otp]');
    await input.click();

    const readout = () => readoutFor(stage);

    // Type 4 digits (< length): the live readout must stay empty.
    await page.keyboard.type('1234', { delay: 40 });
    await expect
      .poll(async () => (await readout()).trim())
      .toBe('Code:');

    // Complete all 6: the value commits.
    await page.keyboard.type('56', { delay: 40 });
    await expect(stage.getByText('Code: 123456')).toBeVisible();

    // Backspace twice → 4 digits → value falls back to empty (值语义不变式).
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await expect.poll(async () => (await readout()).trim()).toBe('Code:');

    await assertTrackedPageErrors(page);
  });

  test('masked variant renders transparent slot characters', async ({ page }) => {
    await openVerificationLab(page);

    const stage = page.getByTestId('scenario-stage-masked-four-digit-code');
    const otp = stage.locator('[data-slot="input-otp"]');
    await expect(otp).toBeVisible();
    await expect(otp).toHaveAttribute('data-masked', /true/);
    await stage.locator('[data-input-otp]').click();
    await page.keyboard.type('99', { delay: 40 });
    // Masked slot text is transparent (no visible chars), but value commits at
    // full length — 2 of 4 digits stay uncommitted.
    await expect(stage.locator('[data-slot="input-otp-slot"]').first()).toHaveCSS('color', 'rgba(0, 0, 0, 0)');

    await assertTrackedPageErrors(page);
  });

  test('backspace beyond committed code resets to empty and stays editable', async ({ page }) => {
    await openVerificationLab(page);

    const stage = page.getByTestId('scenario-stage-six-digit-code-with-live-readout');
    const readout = () => readoutFor(stage);
    const input = stage.locator('[data-input-otp]');
    await input.click();
    await page.keyboard.type('654321', { delay: 30 });
    await expect(stage.getByText('Code: 654321')).toBeVisible();

    // Backspace past empty: control stays editable (no crash / no stale value).
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Backspace');
    }
    await expect.poll(async () => (await readout()).trim()).toBe('Code:');
    await page.keyboard.type('9', { delay: 30 });
    await expect.poll(async () => (await readout()).trim()).toBe('Code:');

    await assertTrackedPageErrors(page);
  });
});
