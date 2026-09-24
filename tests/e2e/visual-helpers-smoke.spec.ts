import { expect, test, type Page } from '@playwright/test';
import { expectLocatorContrast, sampleLocatorContrast } from './helpers/visual-contrast';
import { expectTheme, setTheme } from './helpers/visual-theme';
import {
  assertFormActionsAlignment,
  FORM_ACTIONS_SELECTOR,
} from './helpers/form-actions-alignment';
import {
  assertAlignment,
  collectAlignmentSnapshot,
} from './helpers/overlay-actions-alignment';

/**
 * Smoke pass for the plan 501 Phase 1 promoted helpers on real lab pages:
 * ① visual-theme switches true playground dark (B5-34 data-mode attribute);
 * ② form-actions-alignment asserts the plan 499 desktop contract on lab-tabs
 *    (2 form-actions containers);
 * ③ visual-contrast samples page text on a viewport screenshot (finite
 *    ratio, theme flip provable at the pixel level);
 * ④ overlay-actions-alignment probes dropdown-menu actions while the menu is
 *    still open — BEFORE Escape (the plan 499 handover capability the R2-3b
 *    recheck mechanically could not exercise on lab-dropdown-button).
 */

async function openLab(page: Page, labId: string): Promise<void> {
  await page.goto(`/#/lab/${labId}`, { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('visual helpers smoke (plan 501 Phase 1)', () => {
  test('theme switch + form-actions alignment + pixel contrast on lab-tabs', async ({ page }) => {
    await openLab(page, 'tabs');

    await setTheme(page, 'dark');
    await expectTheme(page, 'dark');

    const snapshots = await assertFormActionsAlignment(page, {
      minCount: 2,
      note: 'lab-tabs dark desktop contract',
    });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);

    const title = page.getByTestId('component-lab-renderer-title');
    const darkRegion = await expectLocatorContrast(page, title, { minRatio: 1, note: 'lab-tabs title dark' });
    expect(Number.isFinite(darkRegion.textRatio)).toBe(true);
    expect(darkRegion.textRatio).toBeGreaterThan(1);

    await setTheme(page, 'light');
    const lightRegion = await sampleLocatorContrast(page, title);
    expect(lightRegion).not.toBeNull();
    expect(Number.isFinite(lightRegion!.textRatio)).toBe(true);
    expect(
      lightRegion!.background,
      'pixel background must flip when data-mode flips (dark/light are distinct palettes)',
    ).not.toEqual(darkRegion.background);
  });

  test('dropdown menu actions are probeable before Escape (plan 499 handover capability)', async ({ page }) => {
    await openLab(page, 'dropdown-button');
    await setTheme(page, 'dark');

    // Scenario 1's trigger is the first dropdown-button-trigger in the DOM
    // (same selector the R2-2b probes used); a name-based lookup here is
    // fragile — the sidebar also exposes an "Actions 1" nav button.
    const trigger = page.locator("[data-slot='dropdown-button-trigger']").first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const menu = page.locator("[data-slot='dropdown-menu-content']");
    await expect(menu).toBeVisible({ timeout: 8_000 });

    // The capability under test: snapshot while the overlay is open.
    const menuSnapshot = await collectAlignmentSnapshot(page, "[data-slot='dropdown-menu-content']");
    expect(menuSnapshot).toHaveLength(1);
    expect(menuSnapshot[0].visible).toBe(true);
    await assertAlignment(
      page,
      "[data-slot='dropdown-menu-content']",
      { requireVisible: true },
      { note: 'open dropdown menu is probeable before Escape' },
    );

    const itemTexts = (await menu.locator("[data-slot='dropdown-menu-item']").allTextContents()).map((t) => t.trim());
    expect(itemTexts).toEqual(expect.arrayContaining(['Set Flag', 'View Details', 'Delete']));

    // The measurement the R2-3b recheck mechanically missed: form-actions
    // inside the open menu, counted BEFORE Escape — a real 0, not an
    // artifact of the registry's Escape step closing the menu first.
    const formActions = await collectAlignmentSnapshot(page, FORM_ACTIONS_SELECTOR);
    expect(formActions, 'lab-dropdown-button hosts no form-actions with its menu open (measured live)').toHaveLength(0);

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });
});
