import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test.describe('select renderer — virtualized long list', () => {
  test('keyboard navigation past the first rendered window keeps the highlighted option in view', async ({ page }) => {
    test.setTimeout(90_000);
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('select');

    const stage = lab.scenarioStage(scenarioSlug('Virtualized long list keyboard navigation'));
    await expect(stage).toBeVisible();
    const input = stage.getByRole('combobox', { name: 'SKU (500 options)' });
    await input.click();
    const listbox = page.getByRole('listbox');
    await expect(listbox.getByRole('option').first()).toBeVisible();

    const renderedBefore = await listbox.getByRole('option').count();
    expect(renderedBefore).toBeLessThan(500);
    const steps = renderedBefore + 10;
    for (let step = 0; step < steps; step += 1) {
      await input.press('ArrowDown');
    }

    const highlighted = listbox.locator('[role="option"][data-highlighted]');
    await expect(highlighted).toHaveCount(1);
    const label = await highlighted.textContent();
    expect(Number(label?.replace(/\D+/g, ''))).toBeGreaterThanOrEqual(renderedBefore);

    const inView = await highlighted.evaluate((option) => {
      const scroller = option.closest('[data-slot="combobox-list"]') as HTMLElement | null;
      if (!scroller) return false;
      const box = option.getBoundingClientRect();
      const frame = scroller.getBoundingClientRect();
      return box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1;
    });
    expect(inView).toBe(true);
  });
});
