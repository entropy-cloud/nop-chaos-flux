import { expect, test, type Page } from '@playwright/test';
import { COMPONENT_LAB_COVERAGE_MANIFEST, scenarioSlug } from '../component-lab/helpers';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('WebSocket connection'),
  );
}

async function openLabRenderer(page: Page, rendererId: string) {
  await page.goto(`/#/lab/${rendererId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('component-lab')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId(`component-lab-renderer-${rendererId}`)).toBeVisible({ timeout: 30_000 });
}

test.describe('Exploratory: component lab batch zero-error smoke', () => {
  for (const entry of COMPONENT_LAB_COVERAGE_MANIFEST) {
    test(`lab zero-error: ${entry.id}`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await openLabRenderer(page, entry.id);

      const primarySlug = scenarioSlug(entry.primaryScenario);
      const primaryBlock = page.getByTestId(`scenario-${primarySlug}`);
      await expect(primaryBlock).toBeVisible({ timeout: 10_000 });

      expect(filterKnownNoise(errors)).toEqual([]);

      const debuggerErrors = await page.evaluate(() => {
        const api = (window as any).__NOP_DEBUGGER_API__;
        return api ? api.queryEvents({ kind: 'error' }) : [];
      });
      expect(debuggerErrors).toHaveLength(0);
    });
  }
});
