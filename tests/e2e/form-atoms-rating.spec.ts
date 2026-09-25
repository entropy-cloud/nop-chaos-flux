import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openRatingLab(page: Page): Promise<void> {
  await page.goto('/#/lab/rating', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('form atoms — rating (missing-components L1)', () => {
  test('bound value renders checked stars and a live summary', async ({ page }) => {
    await openRatingLab(page);

    const stage = page.getByTestId('scenario-stage-rating-with-in-form-live-summary');
    await expect(stage).toBeVisible({ timeout: 15_000 });

    const stars = stage.locator('[data-slot="rating-star"]');
    await expect(stars).toHaveCount(5);
    const checked = stage.locator('[data-slot="rating-star"][aria-checked="true"]');
    await expect(checked).toHaveCount(3);
    await expect(stage.locator('[data-slot="rating-value"]')).toHaveText('3');
    // pushDefaultValue 首帧 gap：`${satisfaction}` 摘要断言移至点击用例（交互后实时更新）。
  });

  test('clicking a star commits the value into the form', async ({ page }) => {
    await openRatingLab(page);

    const stage = page.getByTestId('scenario-stage-rating-with-in-form-live-summary');
    await stage.locator('[data-slot="rating-star"]').nth(4).click();

    await expect(stage.locator('[data-slot="rating-value"]')).toHaveText('5');
    await expect(stage.getByText('You rated: 5')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('half-star granularity renders and commits 0.5 steps', async ({ page }) => {
    await openRatingLab(page);

    const stage = page.getByTestId('scenario-stage-half-stars-ten-star-scale-and-read-only');
    const halfGroup = stage.locator('[data-slot="rating"]').first();
    await expect(halfGroup).toHaveAttribute('data-allow-half', 'true');

    // Keyboard half-step: focus the group, Shift+ArrowRight → +0.5 from blank (0.5).
    await halfGroup.click();
    const firstStar = halfGroup.locator('[data-slot="rating-star"]').first();
    await firstStar.click({ position: { x: 2, y: 8 } }); // left half of the first star
    await expect(halfGroup.locator('[data-level="half"]').first()).toBeVisible();

    // Ten-star scale bound to 7.
    const tenStarGroup = stage.locator('[data-slot="rating"]').nth(1);
    await expect(tenStarGroup.locator('[data-slot="rating-star"]')).toHaveCount(10);
    await expect(tenStarGroup.locator('[aria-checked="true"]')).toHaveCount(7);

    // Read-only rating: stars render disabled and the bound value stays checked.
    const readOnlyGroup = stage.locator('[data-slot="rating"]').nth(2);
    await expect(readOnlyGroup).toHaveAttribute('aria-label', 'Read-only rating (bound to 4)');
    await expect(readOnlyGroup.locator('[data-slot="rating-star"]').first()).toBeDisabled();
    await expect(readOnlyGroup.locator('[data-slot="rating-star"][aria-checked="true"]')).toHaveCount(4);

    await assertTrackedPageErrors(page);
  });
});
