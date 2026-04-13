/**
 * Component Lab smoke matrix.
 *
 * For every renderer in the coverage manifest:
 *   1. Navigates directly to #/lab/<id>
 *   2. Asserts the renderer container is visible
 *   3. Asserts the renderer title text matches the entry title
 *   4. Asserts the scenario lab or at least one scenario block is present
 *
 * A missing coverage-manifest entry or missing lab page will produce a
 * clear test failure rather than a silent skip.
 */

import { test, expect } from '@playwright/test';
import { openRendererDirect, COMPONENT_LAB_COVERAGE_MANIFEST, scenarioSlug } from './helpers';

for (const entry of COMPONENT_LAB_COVERAGE_MANIFEST) {
  test(`smoke: ${entry.id} — renders and has at least one scenario`, async ({ page }) => {
    await openRendererDirect(page, entry.id);

    const container = page.getByTestId(`component-lab-renderer-${entry.id}`);
    await expect(container).toBeVisible();

    const title = page.getByTestId('component-lab-renderer-title');
    await expect(title).toHaveText(entry.title);

    const renderId = page.getByTestId('component-lab-renderer-id');
    await expect(renderId).toHaveText(entry.id);

    const primarySlug = scenarioSlug(entry.primaryScenario);
    const primaryBlock = page.getByTestId(`scenario-${primarySlug}`);
    await expect(primaryBlock).toBeVisible({ timeout: 10_000 });
  });
}
