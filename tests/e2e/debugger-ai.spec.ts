import { test, expect } from './fixtures.js';

/**
 * Debugger AI copilot demo (AD-6): enable → propose → adopt → rollback, all
 * programmatic. Zero-load is asserted at the network level: with the copilot
 * OFF, no nop-debugger-ai module is ever fetched; enabling triggers the
 * dynamic import (positive half of the discriminator).
 */

test('debugger AI copilot: default-off zero-load, then propose → adopt → rollback', async ({ page }) => {
  const aiModuleRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('nop-debugger-ai')) {
      aiModuleRequests.push(request.url());
    }
  });

  await page.goto('/#/debugger-lab', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Debugger Lab', level: 1 }).waitFor({
    state: 'visible',
    timeout: 45_000,
  });

  // Open the panel; default state = copilot off → four built-in tabs only.
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.locator('.nop-debugger')).toBeVisible();
  await expect(page.locator('.ndbg-tab')).toHaveCount(4);
  await expect(page.getByTestId('debugger-ai-state')).toHaveText('off');

  const demoLabel = page
    .getByTestId('debugger-ai-demo-form')
    .locator('label')
    .first();
  await expect(demoLabel).toHaveText(/Project name/i, { timeout: 15_000 });

  // Zero-load discriminator (negative half): nothing fetched the AI module yet.
  expect(aiModuleRequests).toHaveLength(0);

  // Enable: dynamic import fires (positive half) and the AI tab registers.
  await page.getByRole('button', { name: 'Enable AI Copilot' }).click();
  await expect(page.getByTestId('debugger-ai-state')).toHaveText('enabled', { timeout: 15_000 });
  await expect(aiModuleRequests.length).toBeGreaterThan(0);
  await expect(page.locator('.ndbg-tab')).toHaveCount(5);
  await expect(page.locator('.ndbg-tab').last()).toHaveText(/AI/i);

  // Ask the demo copilot to rename the field; it stages a patch proposal.
  const textarea = page.locator('.nop-debugger textarea').first();
  await textarea.fill('please rename the demo field');
  await textarea.press('Enter');

  const card = page.locator('[data-slot="nop-patch-card"]').first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('Archived project');

  // Adopt (the human gate): the host applier patches the demo schema.
  // Locale-agnostic: target by testid prefix (panel chrome follows the
  // playground locale, so button names are not stable).
  await card.locator('[data-testid^="ndbg-patch-adopt-"]').click();
  await expect(demoLabel).toHaveText(/Archived project/i, { timeout: 15_000 });

  // Rollback: the applier restores the pre-apply snapshot.
  await card.locator('[data-testid^="ndbg-patch-rollback-"]').click();
  await expect(demoLabel).toHaveText(/Project name/i, { timeout: 15_000 });

  // Disable: symmetric teardown (tab unregisters).
  await page.getByRole('button', { name: 'Disable AI Copilot' }).click();
  await expect(page.getByTestId('debugger-ai-state')).toHaveText('off');
  await expect(page.locator('.ndbg-tab')).toHaveCount(4);
});
