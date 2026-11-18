import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * form atoms — rating (missing-components L1).
 *
 * Migrated from tests/e2e/form-atoms-rating.spec.ts (E3 batch 1, engine swap +
 * offset star clicks via real CDP mouse coordinates (locator click has no
 * `position` option) and kernel white-box error check in place of
 * assertTrackedPageErrors).
 */

async function openRatingLab(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/lab/rating');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

/** Click at an offset inside an element (Playwright click({ position }) equivalent). */
async function clickAtOffset(ft: FtGlobal, locator: ReturnType<FtGlobal['locator']>, x: number, y: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('clickAtOffset: bounding box missing');
  await ft.mouse.click(box.x + x, box.y + y);
}

export default async function ratingSpec(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: bound value renders checked stars and a live summary
  await openRatingLab(ft);

  const stage = ft.getByTestId('scenario-stage-rating-with-in-form-live-summary');
  await ft.expectWeb(stage).toBeVisible({ timeoutMs: 15_000 });

  const stars = stage.locator('[data-slot="rating-star"]');
  await ft.expectWeb(stars).toHaveCount(5);
  const checked = stage.locator('[data-slot="rating-star"][aria-checked="true"]');
  await ft.expectWeb(checked).toHaveCount(3);
  await ft.expectWeb(stage.locator('[data-slot="rating-value"]')).toHaveText('3');
  // pushDefaultValue 首帧 gap：`${satisfaction}` 摘要断言移至点击用例（交互后实时更新）。

  // Case 2: clicking a star commits the value into the form
  await openRatingLab(ft);

  const stage2 = ft.getByTestId('scenario-stage-rating-with-in-form-live-summary');
  await stage2.locator('[data-slot="rating-star"]').nth(4).click();

  await ft.expectWeb(stage2.locator('[data-slot="rating-value"]')).toHaveText('5');
  await ft.expectWeb(stage2).toContainText('You rated: 5');

  await expectNoPageErrors(ft, 'rating-click');

  // Case 3: half-star granularity renders and commits 0.5 steps
  await openRatingLab(ft);

  const halfStage = ft.getByTestId('scenario-stage-half-stars-ten-star-scale-and-read-only');
  // Driver gap: nth(i).locator(sub) composes `sel sub` and loses the index
  // (it matches descendants of every rating group), so disambiguate the three
  // groups with attribute selectors instead of positional nth().
  const halfGroup = halfStage.locator('[data-slot="rating"][data-allow-half="true"]');
  await ft.expectWeb(halfGroup).toHaveAttribute('data-allow-half', 'true');

  // Keyboard half-step: focus the group, then click the left half of the first star.
  await halfGroup.click();
  const firstStar = halfGroup.locator('[data-slot="rating-star"]').first();
  await clickAtOffset(ft, firstStar, 2, 8); // left half of the first star
  await ft.expectWeb(halfGroup.locator('[data-level="half"]').first()).toBeVisible();

  // Ten-star scale bound to 7.
  const tenStarGroup = halfStage.locator('[data-slot="rating"]:not([data-allow-half]):not([aria-label*="Read-only"])');
  await ft.expectWeb(tenStarGroup.locator('[data-slot="rating-star"]')).toHaveCount(10);
  await ft.expectWeb(tenStarGroup.locator('[aria-checked="true"]')).toHaveCount(7);

  // Read-only rating: stars render disabled and the bound value stays checked.
  const readOnlyGroup = halfStage.locator('[data-slot="rating"][aria-label="Read-only rating (bound to 4)"]');
  await ft.expectWeb(readOnlyGroup).toHaveAttribute('aria-label', 'Read-only rating (bound to 4)');
  await ft.expectWeb(readOnlyGroup.locator('[data-slot="rating-star"]').first()).toBeDisabled();
  await ft.expectWeb(readOnlyGroup.locator('[data-slot="rating-star"][aria-checked="true"]')).toHaveCount(4);

  await expectNoPageErrors(ft, 'rating-half');

  return { cases: 3 };
}
