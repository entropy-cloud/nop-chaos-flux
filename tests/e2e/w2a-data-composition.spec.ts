import { expect, test } from './fixtures.js';

async function openW2a(page: import('@playwright/test').Page) {
  await page.goto('#/w2a-data-composition', { waitUntil: 'commit' });
  await expect(
    page.getByRole('heading', {
      name: '数据组合组 — pagination / cards / alert / wizard',
      level: 1,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('W2a data composition family — pagination/cards/alert/wizard', () => {
  test('pagination switches pages via Next and reports onChange', async ({ page }) => {
    await openW2a(page);

    const pagination = page.locator('[data-testid="demo-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination).toHaveAttribute('data-current-page', '1');
    await expect(pagination).toHaveAttribute('data-total-pages', '10');

    // Click page 2
    await pagination.locator('[data-page="2"]').click();
    await expect(pagination).toHaveAttribute('data-current-page', '2');
    await expect(page.locator('[data-testid="pagination-report"]')).toHaveText('pagination:touched');

    // Next button advances
    await page.locator('[data-testid="pagination-next"]').click();
    await expect(pagination).toHaveAttribute('data-current-page', '3');
  });

  test('cards renders N cards from items and toggles single-selection highlight', async ({ page }) => {
    await openW2a(page);

    const cards = page.locator('[data-testid="demo-cards"]');
    await expect(cards).toBeVisible();
    const cardItems = cards.locator('[data-slot="cards-item"]');
    await expect(cardItems).toHaveCount(3);

    // Single-selection: click card 1, expect highlight + onSelectionChange report
    await cardItems.nth(0).click();
    await expect(cardItems.nth(0)).toHaveAttribute('data-selected', 'true');
    await expect(cardItems.nth(1)).not.toHaveAttribute('data-selected', 'true');
    await expect(page.locator('[data-testid="card-selection-report"]')).toHaveText('card:selected');

    // Click card 2 — mutual exclusion
    await cardItems.nth(1).click();
    await expect(cardItems.nth(1)).toHaveAttribute('data-selected', 'true');
    await expect(cardItems.nth(0)).not.toHaveAttribute('data-selected', 'true');
  });

  test('alert hides and fires onClose when the close button is clicked', async ({ page }) => {
    await openW2a(page);

    const alert = page.locator('[data-testid="demo-alert"]');
    await expect(alert).toBeVisible();
    await expect(page.locator('[data-testid="alert-report"]')).toHaveText('alert:open');

    await alert.locator('[data-testid="alert-close"]').click();
    await expect(alert).toHaveCount(0);
    await expect(page.locator('[data-testid="alert-report"]')).toHaveText('alert:closed');
  });

  test('wizard advances via Next, separates interaction (stepIndex) from lifecycle (commit status)', async ({
    page,
  }) => {
    await openW2a(page);

    const wizard = page.locator('[data-testid="demo-wizard"]');
    await expect(wizard).toBeVisible();
    await expect(wizard).toHaveAttribute('data-current-step-index', '0');
    await expect(wizard).toHaveAttribute('data-last-commit-status', 'idle');

    // Step 1 body visible
    await expect(page.locator('[data-testid="wizard-step-1"]')).toBeVisible();

    // Click Next → onStepCommit fires (lifecycle → success) and advances (interaction)
    await page.locator('[data-testid="wizard-next"]').click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '1');
    await expect(wizard).toHaveAttribute('data-last-commit-status', 'success');
    await expect(page.locator('[data-testid="wizard-step-2"]')).toBeVisible();

    // Status path publication reflects both layers
    const report = page.locator('[data-testid="wizard-report"]');
    await expect(report).toContainText('wizard:step=1');
    await expect(report).toContainText('commit:success');
  });

  test('wizard linear mode blocks jumping past the next reachable step', async ({ page }) => {
    await openW2a(page);

    const wizard = page.locator('[data-testid="demo-wizard"]');
    // On step 0; step nav button for step 2 (index 2) must be unreachable
    const step2Nav = wizard.locator(
      '[data-slot="wizard-step-nav-button"][data-step-index="2"]',
    );
    await expect(step2Nav).toBeDisabled();
    await expect(step2Nav).not.toHaveAttribute('data-reachable');

    // Clicking disabled nav button does nothing
    await step2Nav.click({ force: true });
    await expect(wizard).toHaveAttribute('data-current-step-index', '0');
  });

  test('wizard onComplete fires when the final step is committed', async ({ page }) => {
    await openW2a(page);

    const wizard = page.locator('[data-testid="demo-wizard"]');
    // Advance through all 3 steps: 0 → 1 → 2 (final)
    await page.locator('[data-testid="wizard-next"]').click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '1');
    await page.locator('[data-testid="wizard-next"]').click();
    await expect(wizard).toHaveAttribute('data-current-step-index', '2');

    // Final commit fires onComplete
    await page.locator('[data-testid="wizard-next"]').click();
    await expect(page.locator('[data-testid="wizard-report"]')).toContainText('complete:yes');
    // Stays on final step
    await expect(wizard).toHaveAttribute('data-current-step-index', '2');
  });
});
