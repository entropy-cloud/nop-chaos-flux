import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.8 kanban cardTemplate per-card params (plan 513 Phase 5): the card
 * template region renders with the bindings channel, so template expressions
 * resolve `$slot.card.*` / `$slot.index` per card.
 *
 * Migrated from tests/e2e/kanban-card-template.spec.ts (E3 batch 1, engine swap +
 * kernel expectWeb retry-polling in place of Playwright auto-waiting asserts).
 */

export default async function kanbanCardTemplateSpec(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/lab/kanban');
  const board = ft.locator('[data-testid="kanban-card-template"]');
  await ft.expectWeb(board).toBeVisible({ timeoutMs: 10_000 });

  await ft.expectWeb(board).toContainText('FACE Alpha · idx 0', { timeoutMs: 10_000 });
  await ft.expectWeb(board).toContainText('FACE Beta · idx 1', { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'kanban-card-template');
}
