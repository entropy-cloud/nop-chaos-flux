import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.1 table density tiers (plan 513 Phase 2): compact 32 / default 40 /
 * relaxed 48 row ladder, programmatic assertions (±2px per the stripe P7a
 * measured-ladder precedent).
 *
 * Migrated from tests/e2e/table-density.spec.ts (E3 batch 1, engine swap +
 * kernel white-box error check in place of assertTrackedPageErrors).
 */

const TIERS = [
  { id: 'density-compact', attr: 'compact', height: 32 },
  { id: 'density-default', attr: null, height: 40 },
  { id: 'density-relaxed', attr: 'relaxed', height: 48 },
];

export default async function tableDensity(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/lab/table');
  await ft.expectWeb(ft.locator('[data-testid="density-compact"]')).toBeVisible({ timeoutMs: 10_000 });

  for (const tier of TIERS) {
    const root = ft.locator(`[data-testid="${tier.id}"]`);
    if (tier.attr === null) {
      await root.waitFor('attached');
      const missing = await root.attr('data-density');
      if (missing !== null) throw new Error(`${tier.id}: expected no data-density attr, got "${missing}"`);
    } else {
      await ft.expectWeb(root).toHaveAttribute('data-density', tier.attr);
    }
    const bodyCell = root.locator('tbody td').first();
    await bodyCell.waitFor('attached');
    const box = await bodyCell.boundingBox();
    if (!box) throw new Error(`${tier.id} body cell bounding box missing`);
    const deviation = Math.abs(box.height - tier.height);
    if (deviation > 2) throw new Error(`${tier.id} body cell height ${box.height} deviates >2px from ${tier.height}`);
  }

  await expectNoPageErrors(ft, 'table-density');
}
