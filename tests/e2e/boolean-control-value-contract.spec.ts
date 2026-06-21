import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openBooleanControlValueContractPage(page: import('@playwright/test').Page) {
  await page.goto('/#/boolean-control-value-contract', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '布尔控件值契约 — trueValue / falseValue',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

async function readValueText(page: import('@playwright/test').Page, testid: string): Promise<string> {
  const el = page.getByTestId(testid);
  await expect(el).toBeVisible({ timeout: 10_000 });
  return (await el.textContent()) ?? '';
}

test.describe('E3 boolean control value contract (checkbox/switch trueValue-falseValue)', () => {
  test('checkbox stores trueValue (1) when checked and falseValue (0) when unchecked', async ({
    page,
  }) => {
    await openBooleanControlValueContractPage(page);

    const enabledCheckbox = page.getByRole('checkbox', { name: /Enabled/ });
    await expect(enabledCheckbox).toBeVisible({ timeout: 10_000 });

    expect(await readValueText(page, 'boolean-contract-value-enabled')).toContain('enabled = 0');

    await enabledCheckbox.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-enabled'))
      .toContain('enabled = 1');

    await enabledCheckbox.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-enabled'))
      .toContain('enabled = 0');

    await assertTrackedPageErrors(page);
  });

  test('switch stores trueValue (yes) when toggled on and falseValue (no) when toggled off', async ({
    page,
  }) => {
    await openBooleanControlValueContractPage(page);

    const notifySwitch = page.getByRole('switch', { name: /Notify/ });
    await expect(notifySwitch).toBeVisible({ timeout: 10_000 });

    expect(await readValueText(page, 'boolean-contract-value-notify')).toContain('notify = no');

    await notifySwitch.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-notify'))
      .toContain('notify = yes');

    await notifySwitch.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-notify'))
      .toContain('notify = no');

    await assertTrackedPageErrors(page);
  });

  test('checkbox without trueValue/falseValue falls back to boolean true/false', async ({
    page,
  }) => {
    await openBooleanControlValueContractPage(page);

    const agreeCheckbox = page.getByRole('checkbox', { name: /Agree/ });
    await expect(agreeCheckbox).toBeVisible({ timeout: 10_000 });

    expect(await readValueText(page, 'boolean-contract-value-agree')).toContain('agree = false');

    await agreeCheckbox.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-agree'))
      .toContain('agree = true');

    await assertTrackedPageErrors(page);
  });

  test('switch without trueValue/falseValue falls back to boolean true/false', async ({ page }) => {
    await openBooleanControlValueContractPage(page);

    const featuredSwitch = page.getByRole('switch', { name: /Featured/ });
    await expect(featuredSwitch).toBeVisible({ timeout: 10_000 });

    expect(await readValueText(page, 'boolean-contract-value-featured')).toContain(
      'featured = false',
    );

    await featuredSwitch.click();
    await expect
      .poll(async () => readValueText(page, 'boolean-contract-value-featured'))
      .toContain('featured = true');

    await assertTrackedPageErrors(page);
  });
});
