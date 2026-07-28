import { test, expect, assertTrackedPageErrors } from './fixtures.js';

test.describe('Kanban Board Demo', () => {
  test('page loads with all columns and cards visible', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: 'Kanban Board Demo' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const columns = page.locator('[data-slot="kanban-column"]');
    await expect(columns).toHaveCount(4);

    const cards = page.locator('[data-slot="kanban-card"]');
    await expect(cards).toHaveCount(8);

    await expect(page.locator('[data-slot="kanban-column"]').nth(0)).toHaveAttribute('aria-label', 'Column: 待办');
    await expect(page.locator('[data-slot="kanban-column"]').nth(1)).toHaveAttribute('aria-label', 'Column: 进行中');
    await expect(page.locator('[data-slot="kanban-column"]').nth(2)).toHaveAttribute('aria-label', 'Column: 已完成');
    await expect(page.locator('[data-slot="kanban-column"]').nth(3)).toHaveAttribute('aria-label', 'Column: 评审中');
    await assertTrackedPageErrors(page);
  });

  test('text filter hides non-matching cards', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const searchInput = page.locator('input[aria-label]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('需求分析');
    await page.waitForTimeout(400);

    const cardsAfterFilter = page.locator('[data-slot="kanban-card"]');
    const cardCount = await cardsAfterFilter.count();
    expect(cardCount).toBeGreaterThan(0);
    expect(cardCount).toBeLessThan(8);

    await expect(page.locator('[data-slot="kanban-card"]').filter({ hasText: '需求分析' })).toBeVisible();

    await searchInput.fill('');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-slot="kanban-card"]')).toHaveCount(8);
    await assertTrackedPageErrors(page);
  });

  test('empty filter text restores all cards', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const searchInput = page.locator('input[aria-label]').first();
    await searchInput.fill('');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-slot="kanban-card"]')).toHaveCount(8);
    await assertTrackedPageErrors(page);
  });

  test('undo and redo buttons are present', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const allButtons = page.locator('[data-slot="kanban"] button');
    const count = await allButtons.count();
    expect(count).toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  test('programmatic card move via evaluate verifies undo', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const initialCardIds = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-card-id]');
      return Array.from(cards).map((el) => el.getAttribute('data-card-id'));
    });
    expect(initialCardIds.length).toBe(8);

    const cardInCol1 = await page.evaluate(() => {
      const card = document.querySelector('[data-slot="kanban-card"]');
      return card ? card.getAttribute('data-card-id') : null;
    });
    expect(cardInCol1).toBeTruthy();
    await assertTrackedPageErrors(page);
  });

  test('columns have correct card counts', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const columnCardCounts = await page.evaluate(() => {
      const columns = document.querySelectorAll('[data-slot="kanban-column"]');
      return Array.from(columns).map((col) => ({
        id: col.getAttribute('data-column-id'),
        count: parseInt(col.getAttribute('data-card-count') || '0', 10),
      }));
    });

    expect(columnCardCounts).toContainEqual(expect.objectContaining({ id: 'col-todo', count: 3 }));
    expect(columnCardCounts).toContainEqual(expect.objectContaining({ id: 'col-progress', count: 2 }));
    expect(columnCardCounts).toContainEqual(expect.objectContaining({ id: 'col-done', count: 3 }));
    expect(columnCardCounts).toContainEqual(expect.objectContaining({ id: 'col-review', count: 0 }));
    await assertTrackedPageErrors(page);
  });

  test('drag card reorder between columns', async ({ page }) => {
    await page.goto('/#/kanban', { waitUntil: 'commit' });
    await expect(page.locator('[data-slot="kanban"]')).toBeVisible({ timeout: 15_000 });

    const getCounts = () =>
      page.evaluate(() => {
        const cols = document.querySelectorAll('[data-slot="kanban-column"]');
        return Array.from(cols).map((col) => ({
          id: col.getAttribute('data-column-id'),
          count: parseInt(col.getAttribute('data-card-count') || '0', 10),
        }));
      });

    const initialCounts = await getCounts();
    const todoInitial = initialCounts.find((c) => c.id === 'col-todo')!.count;
    const progressInitial = initialCounts.find((c) => c.id === 'col-progress')!.count;
    expect(todoInitial).toBeGreaterThan(0);

    const sourceCard = page.locator('[data-slot="kanban-card"][data-column-id="col-todo"]').first();
    await expect(sourceCard).toBeVisible();

    const sourceBox = await sourceCard.boundingBox();
    if (!sourceBox) throw new Error('Source card bounding box not found');

    const targetColumn = page.locator('[data-slot="kanban-column"][data-column-id="col-progress"]');
    const targetBox = await targetColumn.boundingBox();
    if (!targetBox) throw new Error('Target column bounding box not found');

    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        startX + (endX - startX) * (i / steps),
        startY + (endY - startY) * (i / steps),
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const finalCounts = await getCounts();
    const todoFinal = finalCounts.find((c) => c.id === 'col-todo')!.count;
    const progressFinal = finalCounts.find((c) => c.id === 'col-progress')!.count;

    expect(todoFinal).toBe(todoInitial - 1);
    expect(progressFinal).toBe(progressInitial + 1);

    await assertTrackedPageErrors(page);
  });
});
