import { expect, type Locator, type Page } from './fixtures.js';

export async function selectComboboxOptionByLabel(
  page: Page,
  labelText: string,
  optionText: string,
): Promise<void> {
  const trigger = page.getByRole('combobox', { name: labelText });
  await selectComboboxOption(trigger, page, optionText);
}

export async function selectComboboxOption(
  trigger: Locator,
  page: Page,
  optionText: string,
): Promise<void> {
  await expect(trigger).toBeVisible({ timeout: 5_000 });
  await trigger.click();

  const option = page.getByRole('option', { name: optionText }).last();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false', { timeout: 5_000 });
}
