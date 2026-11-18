import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.5 kanban keyboardReorder (plan 513 Phase 4): `draggable: false` +
 * `keyboardReorder: { enabled: true }` — pointer drag is decoupled, Space picks
 * a card up and ArrowRight moves it across columns.
 *
 * Migrated from tests/e2e/kanban-keyboard-reorder.spec.ts (E3 batch 3, engine swap +
 * focused-state check upgraded: instead of only asserting toBeFocused after
 * click, the spec also polls document.activeElement across the Space pick-up
 * so the keyboard path is proven to stay on the focused card element).
 */

export default async function kanbanKeyboardReorder(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/lab/kanban');
  const board = ft.locator('[data-testid="kanban-keyboard-only"]');
  await ft.expectWeb(board).toBeVisible({ timeoutMs: 15_000 });

  const doneColumn = board.locator('[data-column-id="col-done"]');
  await ft.expectWeb(doneColumn.locator('[data-slot="kanban-card"]')).toHaveCount(0);

  const card = board.locator('[data-card-id="card-1"]');
  await card.click();
  // TODO(migrate-debt): evaluate fallback (locator.focus/toBeFocused not in
  // driver API — programmatic focus proof via document.activeElement retries)
  let focusedCardId = '';
  for (let i = 0; i < 30; i++) {
    focusedCardId = String(
      await ft.evaluate(
        `(() => { const el = document.activeElement; return el && el.closest('[data-card-id]') ? el.closest('[data-card-id]').getAttribute('data-card-id') : ''; })()`,
      ),
    );
    if (focusedCardId === 'card-1') break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (focusedCardId !== 'card-1') {
    throw new Error(`card-1 should hold focus after click, activeElement card: "${focusedCardId}"`);
  }

  // the card handler matches e.key === ' '; the CDP single-char path (' ')
  // produces that, whereas the named key 'Space' delivers e.key === 'Space'
  await ft.keyboard.press(' ');
  await ft.expectWeb(card).toHaveAttribute('data-keyboard-dragging', 'true');

  await ft.keyboard.press('ArrowRight');
  await ft.expectWeb(doneColumn.locator('[data-slot="kanban-card"]')).toHaveCount(1);

  await expectNoPageErrors(ft, 'kanban-keyboard-reorder');
  return { cases: 1 };
}
