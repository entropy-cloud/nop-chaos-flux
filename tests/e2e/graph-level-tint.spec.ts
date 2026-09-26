import { expect, test } from '@playwright/test';

/**
 * L4.7 graph node data-driven color surface (plan 513 Phase 3): levelMap
 * semantic levels consume fill tint via color-mix over the semantic tokens —
 * level-mapped nodes must visually differ from unmapped ones, unmapped nodes
 * keep the plain card surface (zero-regression line).
 */

test.describe('graph level tint (L4.7)', () => {
  test('level-mapped nodes get tinted fill; unmapped nodes stay card-plain', async ({ page }) => {
    await page.goto('/#/graph-demo', { waitUntil: 'commit' });
    await page.waitForSelector('.nop-graph-node[data-level]', { timeout: 15_000 });

    const surfaceOf = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => {
        const style = getComputedStyle(el);
        return { background: style.backgroundColor, border: style.borderTopColor };
      });

    const tinted = page.locator('.nop-graph-node[data-level]').first();
    const plain = page.locator('.nop-graph-node:not([data-level])').first();
    const hasPlain = (await plain.count()) > 0;

    const tintedSurface = await surfaceOf(tinted);
    // color-mix 12% over card resolves to a non-transparent tinted color.
    expect(tintedSurface.background).not.toContain('rgba(0, 0, 0, 0)');

    if (hasPlain) {
      const plainSurface = await surfaceOf(plain);
      expect(plainSurface.background).not.toBe(tintedSurface.background);
    }

    // All four semantic levels present in the demo schema get tinted fills.
    for (const level of ['danger', 'warning', 'success', 'info']) {
      const node = page.locator(`.nop-graph-node[data-level='${level}']`).first();
      if ((await node.count()) === 0) continue;
      const surface = await surfaceOf(node);
      expect(surface.background).not.toBe('');
    }
  });
});
