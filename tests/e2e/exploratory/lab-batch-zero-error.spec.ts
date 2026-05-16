import { expect, test, type Page, assertTrackedPageErrors } from '../fixtures.js';
import { COMPONENT_LAB_COVERAGE_MANIFEST, scenarioSlug } from '../component-lab/helpers';

async function openLabRenderer(page: Page, rendererId: string) {
  await page.goto(`/#/lab/${rendererId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('component-lab')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId(`component-lab-renderer-${rendererId}`)).toBeVisible({ timeout: 30_000 });
  await assertTrackedPageErrors(page);
}

test.describe('Exploratory: component lab batch zero-error smoke', () => {
  for (const entry of COMPONENT_LAB_COVERAGE_MANIFEST) {
    test(`lab zero-error: ${entry.id}`, async ({ page }) => {
      await openLabRenderer(page, entry.id);

      const primarySlug = scenarioSlug(entry.primaryScenario);
      const primaryBlock = page.getByTestId(`scenario-${primarySlug}`);
      await expect(primaryBlock).toBeVisible({ timeout: 10_000 });

      const debuggerErrors = await page.evaluate(() => {
        const api = (window as any).__NOP_DEBUGGER_API__;
        return api ? api.queryEvents({ kind: 'error' }) : [];
      });
      expect(debuggerErrors).toHaveLength(0);
    });
  }
});
