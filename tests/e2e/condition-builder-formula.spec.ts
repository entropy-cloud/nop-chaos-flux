import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openConditionBuilderFormulaPage(page: import('@playwright/test').Page) {
  await page.goto('/#/condition-builder-formula', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '条件构建器 Formula 集成',
      level: 1,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('E3 condition-builder formula integration', () => {
  test('renders formula value slot when formulas.enabled=true', async ({ page }) => {
    await openConditionBuilderFormulaPage(page);

    const formulaSlot = page.locator('[data-slot="condition-formula-value"]').first();
    await expect(formulaSlot).toBeVisible({ timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('formula value slot writes expression string back to form value', async ({ page }) => {
    await openConditionBuilderFormulaPage(page);

    const formulaSlot = page.locator('[data-slot="condition-formula-value"]').first();
    await expect(formulaSlot).toBeVisible({ timeout: 10_000 });

    await formulaSlot.fill('myTestExpression');

    await expect(formulaSlot).toHaveValue('myTestExpression');

    await assertTrackedPageErrors(page);
  });

  test('group if input has formula marker when formulaForIf.enabled=true', async ({ page }) => {
    await openConditionBuilderFormulaPage(page);

    const ifFormulaInput = page.locator('[data-slot="condition-group-if-formula"]').first();
    await expect(ifFormulaInput).toBeVisible({ timeout: 10_000 });

    await assertTrackedPageErrors(page);
  });

  test('literal value slot renders for condition-builder without formulas.enabled', async ({ page }) => {
    await openConditionBuilderFormulaPage(page);

    const literalBuilder = page
      .locator('.nop-condition-builder')
      .nth(1);
    await expect(literalBuilder).toBeVisible({ timeout: 10_000 });

    await expect(
      literalBuilder.locator('[data-slot="condition-formula-value"]'),
    ).toHaveCount(0);

    await assertTrackedPageErrors(page);
  });
});
