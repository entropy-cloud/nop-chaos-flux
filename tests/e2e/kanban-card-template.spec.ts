import { expect, test } from '@playwright/test';

/**
 * L4.8 kanban cardTemplate per-card params (plan 513 Phase 5): the card
 * template region renders with the bindings channel, so template expressions
 * resolve `$slot.card.*` / `$slot.index` per card.
 */

test.describe('kanban cardTemplate bindings (L4.8)', () => {
  test('card template expressions read per-card bindings', async ({ page }) => {
    await page.goto('/#/lab/kanban');
    const board = page.locator('[data-testid="kanban-card-template"]');
    await expect(board).toBeVisible();

    await expect(board.getByText('FACE Alpha · idx 0')).toBeVisible();
    await expect(board.getByText('FACE Beta · idx 1')).toBeVisible();
  });
});
