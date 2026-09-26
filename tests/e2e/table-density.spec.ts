import { expect, test } from '@playwright/test';

/**
 * L4.1 table density tiers (plan 513 Phase 2): compact 32 / default 40 /
 * relaxed 48 row ladder, programmatic assertions (±2px per the stripe P7a
 * measured-ladder precedent).
 */

const TIERS = [
  { id: 'density-compact', attr: 'compact', height: 32 },
  { id: 'density-default', attr: null, height: 40 },
  { id: 'density-relaxed', attr: 'relaxed', height: 48 },
];

test.describe('table density tiers', () => {
  test('density ladder renders 32/40/48 rows with per-tier attributes', async ({ page }) => {
    await page.goto('/#/lab/table');
    await expect(page.locator('[data-testid="density-compact"]')).toBeVisible();

    for (const tier of TIERS) {
      const root = page.locator(`[data-testid="${tier.id}"]`);
      if (tier.attr === null) {
        await expect(root).not.toHaveAttribute('data-density');
      } else {
        await expect(root).toHaveAttribute('data-density', tier.attr);
      }
      const bodyCell = root.locator('tbody td').first();
      const box = await bodyCell.boundingBox();
      expect(box, `${tier.id} body cell bounding box`).not.toBeNull();
      expect(Math.abs(box!.height - tier.height)).toBeLessThanOrEqual(2);
    }
  });
});
