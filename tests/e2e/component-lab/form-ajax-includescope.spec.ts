import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test.describe('form ajax submit with includeScope', () => {
  test('typing fields and submitting flows form values through submit lifecycle', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('form');

    const slug = scenarioSlug('Form with ajax submit and includeScope');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    await stage.getByLabel('Full Name').fill('Alice');
    await stage.getByLabel('Nick Name').fill('Ali');

    await expect(stage.getByLabel('Full Name')).toHaveValue('Alice');
    await expect(stage.getByLabel('Nick Name')).toHaveValue('Ali');

    await stage.getByRole('button', { name: 'Save' }).click();

    await expect(stage.getByText('Saved! Name: Alice')).toBeVisible({ timeout: 10_000 });

    const scopeText = await stage.getByText(/fullName.*Alice/).textContent();
    expect(scopeText).toContain('fullName');
    expect(scopeText).toContain('Alice');
    expect(scopeText).toContain('nickName');
    expect(scopeText).toContain('Ali');
  });
});
