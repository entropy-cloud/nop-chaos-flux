import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Composite editor component handles (X1-successor: addItem/removeItem/moveItem)
 * on the component:* Capability Handles Playground.
 *
 * Migrated from tests/e2e/composite-editor-handles.spec.ts (E3 batch 3,
 * engine swap + desktop viewport pinned and named per-case kernel error
 * markers).
 *
 * Isolation deviation: the demo's flux store is created once at module level
 * (apps/playground/src/pages/component-handles-demo.tsx `createSchemaRenderer()`),
 * so form state persists across hash-route remounts and the old fresh-page
 * isolation cannot be reproduced. The cases are therefore run as one
 * deterministic sequence over the persistent store, ordered so each case sees
 * exactly the reviewer counts the old spec asserted (2→3 via addItem, 3→2
 * restore removal, 2→1 removal, floor at 1; moveItem runs first while values
 * are still alice/bob).
 *
 * Strengthening upgrade: the moveItem case re-asserts the swapped values a
 * second time after a stability gate, catching late reorder commits that the
 * old single-pass expect could have raced past.
 *
 * Note: driver has no getByPlaceholder — reviewer inputs are targeted with
 * exact placeholder attribute selectors instead.
 */

export default async function compositeEditorHandles(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/component-handles');
  await ft.expectWeb(
    ft.getByRole('heading', { name: 'component:* Capability Handles Playground', level: 1 }),
  ).toBeVisible({ timeoutMs: 15_000 });

  const reviewerCount = ft.getByTestId('composite-handles-reviewer-count');
  const metadataCount = ft.getByTestId('composite-handles-metadata-count');
  const reviewer1 = ft.locator('input[placeholder="Reviewer 1"]');
  const reviewer2 = ft.locator('input[placeholder="Reviewer 2"]');

  // Case 1: component:moveItem reorders reviewers (swap order via moveValue).
  // Runs first: reviewer values are still the pristine alice/bob.
  await ft.expectWeb(reviewer1).toHaveValue('alice');
  await ft.expectWeb(reviewer2).toHaveValue('bob');

  await ft.getByRole('button', { name: 'Move Reviewer 0→1 (component:moveItem)' }).click();
  await ft.expectWeb(reviewer1).toHaveValue('bob');
  await ft.expectWeb(reviewer2).toHaveValue('alice');
  // Strengthening: re-read after a stability gate to catch late reorder commits.
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  if ((await reviewer1.inputValue()) !== 'bob') throw new Error('moveItem: reviewer 1 no longer "bob" after settle');
  if ((await reviewer2.inputValue()) !== 'alice') throw new Error('moveItem: reviewer 2 no longer "alice" after settle');
  await expectNoPageErrors(ft, 'composite-handles:moveItem');

  // Case 2: component:addItem appends a reviewer (form value length +1): 2 → 3.
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 2');
  await ft.getByRole('button', { name: 'Add Reviewer (component:addItem)' }).click();
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 3');
  await expectNoPageErrors(ft, 'composite-handles:addItem');

  // Case 3: component:removeItem removes a reviewer (form value length -1):
  // restore pass 3 → 2, bringing the sequence back to the old spec's baseline.
  await ft.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 2');
  await expectNoPageErrors(ft, 'composite-handles:removeItem-restore');

  // Case 4: component:removeItem removes a reviewer from the 2-reviewer
  // baseline (the old spec's exact 2 → 1 assertion).
  await ft.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 1');
  await expectNoPageErrors(ft, 'composite-handles:removeItem');

  // Case 5: component:addItem on key-value appends an entry (metadata 2 → 3).
  await ft.expectWeb(metadataCount).toContainText('metadata entries = 2');
  await ft.getByRole('button', { name: 'Add Entry (component:addItem)' }).click();
  await ft.expectWeb(metadataCount).toContainText('metadata entries = 3');
  await expectNoPageErrors(ft, 'composite-handles:addItem-kv');

  // Case 6: component:removeItem is skipped at minItems (no removal below floor).
  // array-editor default minItems is 1; reviewer count is already at the floor.
  await ft.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 1');

  // Further remove must be skipped (minItems constraint), length stays at 1.
  await ft.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
  await ft.expectWeb(reviewerCount).toContainText('reviewer inputs = 1');
  await expectNoPageErrors(ft, 'composite-handles:minItems-floor');

  return { cases: 6 };
}
