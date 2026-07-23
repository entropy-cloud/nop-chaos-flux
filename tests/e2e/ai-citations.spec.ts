import { expect, test, assertTrackedPageErrors } from './fixtures.js';

async function openCitationsDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/ai-citations', { waitUntil: 'commit' });
  await expect(page.locator('[data-testid="ai-citations-widget"]')).toBeVisible({ timeout: 15_000 });
}

test.describe('AI citations — P3 (A-13) end-to-end', () => {
  test('[N] markers render as hoverable sup triggers and open a source card', async ({ page }) => {
    await openCitationsDemo(page);

    // Citation triggers are present (the sample content has [1], [2], [1,2]).
    const triggers = page.locator('[data-testid="ai-citations-widget"] [data-citation-index]');
    await expect(triggers).toHaveCount(4, { timeout: 10_000 }); // [1]→1, [2]→2, [1,2]→1,2

    // Clicking a citation opens a source card with the source title.
    await triggers.first().click();
    const card = page.locator('[data-slot="ai-citation-card"]');
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card).toContainText('flux-renderers-ai design.md');

    await assertTrackedPageErrors(page);
  });

  test('list mode renders a bottom sources list', async ({ page }) => {
    await openCitationsDemo(page);
    const list = page.locator('[data-testid="ai-citations-list"]');
    await expect(list).toBeVisible();
    await expect(list.locator('[data-slot="ai-citation-item"]')).toHaveCount(2);
  });
});
