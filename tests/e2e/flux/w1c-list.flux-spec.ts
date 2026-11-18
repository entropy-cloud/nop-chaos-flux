import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W1c list collection renderer — flux-renderers-data: item-region instantiation,
 * empty state, single-selection + onItemClick dispatch, multi-selection.
 *
 * Migrated from tests/e2e/w1c-list.spec.ts (E3 batch 4, engine swap + the old
 * Playwright ComponentLabHelper openRenderer/scenarioStage inlined as hash-route
 * goto with component-lab-renderer-list / multi-scenario-lab arrival gates, and
 * kernel expectNoPageErrors run per case). getByText(child) assertions became
 * parent-level containText checks; toHaveCount kept as driver retry assertions.
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab remounts
 * and every scenario block re-initializes (ft.reload() is unusable mid-spec —
 * it destroys the CDP evaluation context).
 */

const SLUG_ITEMS = 'collection-with-item-template';
const SLUG_EMPTY = 'empty-state';
const SLUG_SINGLE = 'single-selection-onitemclick';
const SLUG_MULTIPLE = 'multiple-selection';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('component-lab')).not.toBeVisible();
}

async function openListLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/list');
  await ft.expectWeb(ft.getByTestId('component-lab-renderer-list')).toBeVisible({
    timeoutMs: 30_000,
  });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 20_000 });
}

function stage(ft: FtGlobal, slug: string) {
  return ft.getByTestId(`scenario-stage-${slug}`);
}

export default async function w1cList(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: instantiates the item region once per collection entry (N items)
  await openListLab(ft);
  const itemsStage = stage(ft, SLUG_ITEMS);
  await ft.expectWeb(itemsStage).toBeVisible({ timeoutMs: 15_000 });

  const list = itemsStage.locator('[data-testid="demo-list-items"]');
  await ft.expectWeb(list).toBeVisible();
  await ft.expectWeb(list).toHaveAttribute('data-slot', 'list-root');

  const items = list.locator('[data-slot="list-item"]');
  await ft.expectWeb(items).toHaveCount(3);
  // locator.getByText is not in the driver API; list-level containText is equivalent
  await ft.expectWeb(list).toContainText('Design schema contract');
  await ft.expectWeb(list).toContainText('Wire playground demo');
  await expectNoPageErrors(ft, 'w1c-list:item-region');

  // Case 2: renders the empty region/value when items is empty
  await openListLab(ft);
  const emptyStage = stage(ft, SLUG_EMPTY);
  await ft.expectWeb(emptyStage).toBeVisible({ timeoutMs: 15_000 });

  const emptyList = emptyStage.locator('[data-testid="demo-list-empty"]');
  await ft.expectWeb(emptyList).toBeVisible();
  await ft.expectWeb(emptyList).toHaveAttribute('data-empty', 'true');
  await ft.expectWeb(emptyList.locator('[data-slot="list-empty"]')).toContainText('No tasks yet');
  await ft.expectWeb(emptyList.locator('[data-slot="list-item"]')).toHaveCount(0);
  await expectNoPageErrors(ft, 'w1c-list:empty-state');

  // Case 3: dispatches onItemClick against the per-item scope and toggles
  // single-selection highlight
  await openListLab(ft);
  const singleStage = stage(ft, SLUG_SINGLE);
  await ft.expectWeb(singleStage).toBeVisible({ timeoutMs: 15_000 });

  const singleList = singleStage.locator('[data-testid="demo-list-single"]');
  const singleItems = singleList.locator('[data-slot="list-item"]');
  await ft.expectWeb(singleItems).toHaveCount(3);

  await singleItems.nth(0).click();
  await ft.expectWeb(singleItems.nth(0)).toHaveAttribute('data-selected', 'true');
  // 20-08 (ARIA 1.2): listitem selection is exposed via aria-current, not
  // aria-selected (unsupported on the listitem role).
  await ft.expectWeb(singleItems.nth(0)).toHaveAttribute('aria-current', 'true');
  // onItemClick fires against the per-item scope (context-carry verified in focused unit tests)
  await ft.expectWeb(ft.getByRole('dialog', { name: 'Item click' })).toBeVisible({ timeoutMs: 5_000 });
  await ft.getByRole('button', { name: /Close|关闭|Cancel|取消/ }).click();
  await ft.expectWeb(ft.getByRole('dialog', { name: 'Item click' })).toHaveCount(0, { timeoutMs: 5_000 });

  await singleItems.nth(2).click();
  await ft.expectWeb(singleItems.nth(2)).toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(singleItems.nth(0)).not.toHaveAttribute('data-selected', 'true');
  await expectNoPageErrors(ft, 'w1c-list:single-selection');

  // Case 4: accumulates multiple-selection highlight across items
  await openListLab(ft);
  const multiStage = stage(ft, SLUG_MULTIPLE);
  await ft.expectWeb(multiStage).toBeVisible({ timeoutMs: 15_000 });

  const multiList = multiStage.locator('[data-testid="demo-list-multiple"]');
  const multiItems = multiList.locator('[data-slot="list-item"]');
  await ft.expectWeb(multiItems).toHaveCount(3);

  await multiItems.nth(0).click();
  await multiItems.nth(2).click();

  await ft.expectWeb(multiItems.nth(0)).toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(multiItems.nth(2)).toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(multiItems.nth(1)).not.toHaveAttribute('data-selected', 'true');
  await ft.expectWeb(multiList.locator('[data-slot="list-item"][data-selected="true"]')).toHaveCount(2);
  await expectNoPageErrors(ft, 'w1c-list:multiple-selection');

  return { cases: 4 };
}
