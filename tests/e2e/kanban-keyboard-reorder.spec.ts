import { expect, test } from '@playwright/test';

/**
 * L4.5 kanban keyboardReorder (plan 513 Phase 4): `draggable: false` +
 * `keyboardReorder: { enabled: true }` — pointer drag is decoupled, Space picks
 * a card up and ArrowRight moves it across columns.
 */

test.describe('kanban keyboardReorder (L4.5)', () => {
  test('keyboard-only reorder moves a card with draggable disabled', async ({ page }) => {
    await page.goto('/#/lab/kanban');
    const board = page.locator('[data-testid="kanban-keyboard-only"]');
    await expect(board).toBeVisible();

    const doneColumn = board.locator('[data-column-id="col-done"]');
    await expect(doneColumn.locator('[data-slot="kanban-card"]')).toHaveCount(0);

    const card = board.locator('[data-card-id="card-1"]');
    await card.click();
    await expect(card).toBeFocused();

    await page.keyboard.press('Space');
    await expect(card).toHaveAttribute('data-keyboard-dragging', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(doneColumn.locator('[data-slot="kanban-card"]')).toHaveCount(1);
  });
});
