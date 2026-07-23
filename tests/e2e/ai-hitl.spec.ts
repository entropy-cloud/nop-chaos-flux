import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openHitlDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-hitl', { waitUntil: 'commit' });
  await expect(page.locator('[data-slot="ai-tool-call"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI HITL approval — P3 (A-14) end-to-end', () => {
  test('approve transitions the tool to an approved badge', async ({ page }) => {
    await openHitlDemo(page);

    // The card starts in the pending approval state.
    const card = page.locator('[data-slot="ai-tool-call"]');
    await expect(card).toHaveAttribute('data-requires-approval', '');
    await expect(page.locator('[data-slot="ai-tool-call-approve"]')).toBeVisible();

    await page.locator('[data-slot="ai-tool-call-approve"]').click();

    // No longer pending; a decided badge is shown.
    await expect(card).not.toHaveAttribute('data-requires-approval', '');
    await expect(page.locator('[data-approval-decision="approved"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="hitl-log"]')).toContainText('Approved');

    await assertTrackedPageErrors(page);
  });

  test('reject transitions the tool to a rejected badge', async ({ page }) => {
    await openHitlDemo(page);
    const card = page.locator('[data-slot="ai-tool-call"]');

    await page.locator('[data-slot="ai-tool-call-reject"]').click();
    await expect(page.locator('[data-approval-decision="rejected"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="hitl-log"]')).toContainText('Rejected');

    // Card no longer requires approval after the decision.
    await expect(card).not.toHaveAttribute('data-requires-approval', '');

    await assertTrackedPageErrors(page);
  });
});
