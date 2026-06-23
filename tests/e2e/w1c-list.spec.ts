import { expect, test } from './fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './component-lab/helpers.js';

async function openListLab(page: import('@playwright/test').Page) {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('list');
  await expect(lab.multiScenarioLab).toBeVisible({ timeout: 20_000 });
  return lab;
}

test.describe('W1c list collection renderer — flux-renderers-data', () => {
  test('instantiates the item region once per collection entry (N items)', async ({ page }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Collection with item template');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-items');
    await expect(list).toBeVisible();
    await expect(list).toHaveAttribute('data-slot', 'list-root');

    const items = list.locator('[data-slot="list-item"]');
    await expect(items).toHaveCount(3);
    await expect(list.getByText('Design schema contract')).toBeVisible();
    await expect(list.getByText('Wire playground demo')).toBeVisible();
  });

  test('renders the empty region/value when items is empty', async ({ page }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Empty state');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-empty');
    await expect(list).toBeVisible();
    await expect(list).toHaveAttribute('data-empty', 'true');
    await expect(list.locator('[data-slot="list-empty"]')).toContainText('No tasks yet');
    await expect(list.locator('[data-slot="list-item"]')).toHaveCount(0);
  });

  test('dispatches onItemClick against the per-item scope and toggles single-selection highlight', async ({
    page,
  }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Single selection + onItemClick');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-single');
    const items = list.locator('[data-slot="list-item"]');
    await expect(items).toHaveCount(3);

    await items.nth(0).click();
    await expect(items.nth(0)).toHaveAttribute('data-selected', 'true');
    await expect(items.nth(0)).toHaveAttribute('aria-selected', 'true');
    // onItemClick fires against the per-item scope (context-carry verified in focused unit tests)
    await expect(page.getByRole('dialog', { name: 'Item click' })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /Close|关闭|Cancel|取消/ }).click();
    await expect(page.getByRole('dialog', { name: 'Item click' })).toHaveCount(0, { timeout: 5_000 });

    await items.nth(2).click();
    await expect(items.nth(2)).toHaveAttribute('data-selected', 'true');
    await expect(items.nth(0)).not.toHaveAttribute('data-selected', 'true');
  });

  test('accumulates multiple-selection highlight across items', async ({ page }) => {
    const lab = await openListLab(page);
    const slug = scenarioSlug('Multiple selection');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();

    const list = stage.getByTestId('demo-list-multiple');
    const items = list.locator('[data-slot="list-item"]');
    await expect(items).toHaveCount(3);

    await items.nth(0).click();
    await items.nth(2).click();

    await expect(items.nth(0)).toHaveAttribute('data-selected', 'true');
    await expect(items.nth(2)).toHaveAttribute('data-selected', 'true');
    await expect(items.nth(1)).not.toHaveAttribute('data-selected', 'true');
    await expect(list.locator('[data-slot="list-item"][data-selected="true"]')).toHaveCount(2);
  });
});
