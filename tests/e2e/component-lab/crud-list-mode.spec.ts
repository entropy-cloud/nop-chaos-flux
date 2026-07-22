import { expect, test } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

async function openCrudScenario(page: import('@playwright/test').Page, title: string) {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');
  return lab.scenarioStage(scenarioSlug(title));
}

test.describe('crud listMode carrier rendering', () => {
  test('cards mode renders the cards carrier, self-held selection, and CRUD-driven pagination', async ({
    page,
  }) => {
    const stage = await openCrudScenario(page, 'CRUD cards mode');

    const body = stage.locator('[data-slot="crud-list-body"]');
    await expect(body).toHaveAttribute('data-list-mode', 'cards');
    await expect(body).toBeVisible();

    // Carrier resolved by type (cards renderer from flux-renderers-content).
    await expect(stage.locator('[data-slot="cards-root"]')).toBeVisible();

    const cardItems = stage.locator('[data-slot="cards-item"]');
    // Page 1 is CRUD pre-sliced to the page size (10 of 25 records).
    await expect(cardItems).toHaveCount(10);
    await expect(cardItems.filter({ hasText: 'Record-1 ·' })).toHaveCount(1);
    await expect(cardItems.filter({ hasText: 'Record-10 ·' })).toHaveCount(1);
    await expect(cardItems.filter({ hasText: 'Record-11 ·' })).toHaveCount(0);

    // Footer pagination is rendered by CRUD and bound to its scope pagination state.
    const pagination = stage.locator('[data-slot="crud-list-pagination"]');
    await expect(pagination).toBeVisible();

    // Selection is CRUD-self-held: the template button toggles the same selectionStatePath
    // (writable via component:toggleSelection, read reactively by the template).
    await stage.getByRole('button', { name: 'Select' }).first().click();
    await expect(cardItems.filter({ hasText: '✓ Selected' })).toHaveCount(1);
    await expect(stage.getByText('Selected: 1 / Total: 25')).toBeVisible();

    // Advancing pagination re-slices carrier items to the second page.
    await pagination.getByLabel('Next page').click();
    await expect(cardItems.filter({ hasText: 'Record-11 ·' })).toHaveCount(1);
    await expect(cardItems).toHaveCount(10);
  });

  test('list mode renders the list carrier, self-held selection, and scope-owned pagination slicing', async ({
    page,
  }) => {
    const stage = await openCrudScenario(page, 'CRUD list mode');

    const body = stage.locator('[data-slot="crud-list-body"]');
    await expect(body).toHaveAttribute('data-list-mode', 'list');
    await expect(body).toBeVisible();

    const listItems = stage.locator('[data-slot="list-item"]');
    await expect(stage.locator('[data-slot="list-root"]')).toBeVisible();
    // List runtime slices via scope-owned pagination; page 1 shows the first 10 records.
    await expect(listItems).toHaveCount(10);
    await expect(listItems.filter({ hasText: 'Record-1 ·' })).toHaveCount(1);
    await expect(listItems.filter({ hasText: 'Record-10 ·' })).toHaveCount(1);
    await expect(listItems.filter({ hasText: 'Record-11 ·' })).toHaveCount(0);

    const pagination = stage.locator('[data-slot="crud-list-pagination"]');
    await expect(pagination).toBeVisible();

    await stage.getByRole('button', { name: 'Select' }).first().click();
    await expect(listItems.filter({ hasText: '✓ Selected' })).toHaveCount(1);
    await expect(stage.getByText('Selected: 1 / Total: 25')).toBeVisible();

    // Footer pagination writes to CRUD paginationStatePath; the list (scope-owned) reacts.
    await pagination.getByLabel('Next page').click();
    await expect(listItems.filter({ hasText: 'Record-11 ·' })).toHaveCount(1);
    await expect(listItems.filter({ hasText: 'Record-1 ·' })).toHaveCount(0);
  });
});
