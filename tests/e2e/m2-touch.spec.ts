import { expect, test } from './fixtures.js';

async function openM2Touch(page: import('@playwright/test').Page) {
  await page.goto('#/m2-touch', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: /M2 表单控件触摸适配/,
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('M2 touch adaptation — mobile viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('input-email exposes inputmode="email"', async ({ page }) => {
    await openM2Touch(page);

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    const inputmode = await emailInput.getAttribute('inputmode');
    expect(inputmode).toBe('email');
  });

  test('input-number exposes inputmode="decimal"', async ({ page }) => {
    await openM2Touch(page);

    const numberInput = page.locator('input[type="number"]').first();
    await expect(numberInput).toBeVisible({ timeout: 10_000 });
    const inputmode = await numberInput.getAttribute('inputmode');
    expect(inputmode).toBe('decimal');
  });

  test('input font-size >= 16px on mobile (prevents iOS focus zoom)', async ({ page }) => {
    await openM2Touch(page);

    const textInput = page.locator('input[type="text"]').first();
    await expect(textInput).toBeVisible({ timeout: 10_000 });
    const fontSize = await textInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('checkbox hit area >= 44px on mobile (min-h-11)', async ({ page }) => {
    await openM2Touch(page);

    const checkboxWrapper = page.locator('[data-slot="checkbox-wrapper"]').first();
    await expect(checkboxWrapper).toBeVisible({ timeout: 10_000 });
    const className = await checkboxWrapper.getAttribute('class');
    expect(className ?? '').toContain('min-h-11');
    expect(className ?? '').toContain('nop-haptic');
    const height = await checkboxWrapper.evaluate((el) => {
      return Math.round(el.getBoundingClientRect().height);
    });
    expect(height).toBeGreaterThanOrEqual(44);
  });

  test('default-size button min-height >= 44px on mobile', async ({ page }) => {
    await openM2Touch(page);

    const button = page.getByTestId('m2-btn-default');
    await expect(button).toBeVisible({ timeout: 10_000 });
    const className = await button.getAttribute('class');
    expect(className ?? '').toContain('min-h-11');
    const height = await button.evaluate((el) => {
      return Math.round(el.getBoundingClientRect().height);
    });
    expect(height).toBeGreaterThanOrEqual(44);
  });

  test('checkbox-group stacks vertically (flex-col + mobile-stack marker) on mobile', async ({ page }) => {
    await openM2Touch(page);

    const group = page.locator('[data-slot="checkbox-group-wrapper"]').first();
    await expect(group).toBeVisible({ timeout: 10_000 });
    await expect(group.getAttribute('data-mobile-stack')).resolves.toBe('true');
    const className = await group.getAttribute('class');
    expect(className ?? '').toContain('flex-col');
  });

  test('schema block still applies w-full on mobile', async ({ page }) => {
    await openM2Touch(page);

    const blockButton = page.getByTestId('m2-btn-block');
    await expect(blockButton).toBeVisible({ timeout: 10_000 });
    const className = await blockButton.getAttribute('class');
    expect(className ?? '').toContain('w-full');
  });
});

test.describe('M2 touch adaptation — desktop viewport (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('default-size button does NOT get min-h-11 on desktop', async ({ page }) => {
    await openM2Touch(page);

    const button = page.getByTestId('m2-btn-default');
    await expect(button).toBeVisible({ timeout: 10_000 });
    const className = await button.getAttribute('class');
    expect(className ?? '').not.toContain('min-h-11');
  });

  test('checkbox-group does NOT apply mobile-stack on desktop', async ({ page }) => {
    await openM2Touch(page);

    const group = page.locator('[data-slot="checkbox-group-wrapper"]').first();
    await expect(group).toBeVisible({ timeout: 10_000 });
    await expect(group.getAttribute('data-mobile-stack')).resolves.toBeNull();
  });
});
