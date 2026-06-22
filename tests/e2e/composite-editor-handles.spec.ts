import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openComponentHandlesDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/component-handles', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', { name: 'component:* Capability Handles Playground', level: 1 }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe('composite editor component handles (X1-successor: addItem/removeItem/moveItem)', () => {
  test('component:addItem appends a reviewer (form value length +1)', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const reviewerCount = page.getByTestId('composite-handles-reviewer-count');
    await expect(reviewerCount).toContainText('reviewer inputs = 2');

    await page.getByRole('button', { name: 'Add Reviewer (component:addItem)' }).click();
    await expect(reviewerCount).toContainText('reviewer inputs = 3');
    await assertTrackedPageErrors(page);
  });

  test('component:moveItem reorders reviewers (swap order via moveValue)', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const reviewer1 = page.getByPlaceholder('Reviewer 1', { exact: true });
    const reviewer2 = page.getByPlaceholder('Reviewer 2', { exact: true });
    await expect(reviewer1).toHaveValue('alice');
    await expect(reviewer2).toHaveValue('bob');

    await page.getByRole('button', { name: 'Move Reviewer 0→1 (component:moveItem)' }).click();
    await expect(reviewer1).toHaveValue('bob');
    await expect(reviewer2).toHaveValue('alice');
    await assertTrackedPageErrors(page);
  });

  test('component:removeItem removes a reviewer (form value length -1)', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const reviewerCount = page.getByTestId('composite-handles-reviewer-count');
    await expect(reviewerCount).toContainText('reviewer inputs = 2');

    await page.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
    await expect(reviewerCount).toContainText('reviewer inputs = 1');
    await assertTrackedPageErrors(page);
  });

  test('component:addItem on key-value appends an entry', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const metadataCount = page.getByTestId('composite-handles-metadata-count');
    await expect(metadataCount).toContainText('metadata entries = 2');

    await page.getByRole('button', { name: 'Add Entry (component:addItem)' }).click();
    await expect(metadataCount).toContainText('metadata entries = 3');
    await assertTrackedPageErrors(page);
  });

  test('component:removeItem is skipped at minItems (no removal below floor)', async ({ page }) => {
    await openComponentHandlesDemo(page);

    const reviewerCount = page.getByTestId('composite-handles-reviewer-count');
    // array-editor default minItems is 1; remove down to the floor.
    await page.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
    await expect(reviewerCount).toContainText('reviewer inputs = 1');

    // Further remove must be skipped (minItems constraint), length stays at 1.
    await page.getByRole('button', { name: 'Remove Reviewer #0 (component:removeItem)' }).click();
    await expect(reviewerCount).toContainText('reviewer inputs = 1');
    await assertTrackedPageErrors(page);
  });
});
