import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openLinkage(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-linkage', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="p4-branches"]')).toBeVisible({ timeout: 15_000 });
}

async function sendAndComplete(page: import('@playwright/test').Page, text: string) {
  const sender = page.locator('[data-slot="ai-sender"] textarea').or(page.locator('textarea').first());
  await sender.fill(text);
  await sender.press('Enter');
  // Wait for the assistant message (engine completes the mock turn).
  await expect(page.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('AI P4 advanced — message branches + platform linkage', () => {
  test('Regenerate stamps a new branchId (engine.regenerate)', async ({ page }) => {
    await openLinkage(page);
    await sendAndComplete(page, 'hello');

    // Before regenerate, no branchId is shown.
    await expect(page.locator('[data-testid="p4-last-branch-id"]')).toHaveCount(0);

    await page.locator('[data-testid="p4-regenerate"]').click();
    // After regenerate the host records the stamped branchId.
    await expect(page.locator('[data-testid="p4-last-branch-id"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="p4-last-branch-id"]')).toContainText('branch-1');

    // The branch picker renders on the regenerated assistant message.
    await expect(page.locator('[data-slot="ai-bubble-branches"]')).toBeVisible();
    await assertTrackedPageErrors(page);
  });

  test('branch picker prev/next switches the active branch', async ({ page }) => {
    await openLinkage(page);
    await sendAndComplete(page, 'hi');
    await page.locator('[data-testid="p4-regenerate"]').click();
    await expect(page.locator('[data-slot="ai-bubble-branches"]')).toBeVisible({ timeout: 10_000 });
    // After regenerate the engine shows the new branch (2nd of 2).
    await expect(page.locator('[data-slot="ai-bubble-branch-counter"]')).toContainText('2/2');

    // Prev → loads the original branch via engine.setMessages.
    await page.locator('[data-slot="ai-bubble-branch-prev"]').click();
    await expect(page.locator('[data-slot="ai-bubble-branch-counter"]')).toContainText('1/2');
    await assertTrackedPageErrors(page);
  });

  test('Decision-A + B linkage: completed turn updates the form field + data-source reload', async ({ page }) => {
    await openLinkage(page);
    await sendAndComplete(page, 'linkage test');

    // Decision-A: messages serialized into the form-field view.
    const formField = page.locator('[data-testid="p4-form-field"]');
    await expect(formField).toContainText('linkage test');
    // Decision-B: data-source reload counter advanced to >= 1.
    const reload = page.locator('[data-testid="p4-reload-count"]');
    await expect(reload).not.toContainText('0');
    await assertTrackedPageErrors(page);
  });
});
