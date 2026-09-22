import { expect, test } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

// plan 490 Phase 4 proof: double-theme computed-style assertions for the
// overlay size ladder and the shared footer anatomy. Pagination block-gap
// coverage lives in surface-rhythm-pagination.spec.ts; Sheet/AlertDialog
// ladder binding is unit-pinned (overlay-size-ladder.test.tsx) — no
// playground route mounts Sheet, and the AlertDialog default-tier width is
// exercised here through the dialog lab's shared tokens.

async function setTheme(page: import('@playwright/test').Page, mode: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: mode === 'dark' ? 'dark' : 'light' });
  await page.goto('#/home', { waitUntil: 'commit' });
  await page.evaluate((themeMode) => {
    document.documentElement.setAttribute('data-mode', themeMode);
  }, mode);
}

test.describe('overlay ladder + anatomy double theme (plan 490)', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`dialog default tier + footer anatomy + drawer sm tier (${mode})`, async ({ page }) => {
      await setTheme(page, mode);

      // 1+2. Dialog with actions via the dialog lab: default tier width
      // (base = 560px) plus the shared footer anatomy.
      const lab = new ComponentLabHelper(page);
      await lab.openRenderer('dialog');
      const stage = lab.scenarioStage(scenarioSlug('Informational dialog'));
      await expect(stage).toBeVisible();
      await stage.getByRole('button', { name: 'Open Dialog' }).click();
      const surface = page.locator('[data-slot="dialog-surface"]').last();
      await expect(surface).toBeVisible();
      const width = await surface.evaluate((el) => Math.round(el.getBoundingClientRect().width));
      expect(width).toBe(560);

      // Footer anatomy: right-aligned buttons, token gap, token min-width.
      const footer = surface.locator('[data-slot="dialog-footer"]');
      const footerStyle = await footer.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          justify: computed.justifyContent,
          gap: computed.columnGap || computed.gap,
          buttonMinWidth: getComputedStyle(el.querySelector('button') ?? el).minWidth,
        };
      });
      expect(footerStyle.justify).toBe('flex-end');
      expect(parseInt(footerStyle.gap, 10)).toBe(8);
      expect(parseInt(footerStyle.buttonMinWidth, 10)).toBe(72);
      await surface.locator('[data-slot="dialog-close"]').click();
      await expect(surface).not.toBeVisible();

      // 3. Drawer sm tier (480px cap at desktop viewport) via the drawer lab.
      const drawerLab = new ComponentLabHelper(page);
      await drawerLab.openRenderer('drawer');
      const drawerStage = drawerLab.scenarioStage(scenarioSlug('Right drawer with form and writeback'));
      await expect(drawerStage).toBeVisible();
      await drawerStage.getByRole('button', { name: 'Open Right Drawer' }).click();
      const popup = page.locator('[data-slot="drawer-popup"]').last();
      await expect(popup).toBeVisible();
      const drawerWidth = await popup.evaluate((el) => Math.round(el.getBoundingClientRect().width));
      expect(drawerWidth).toBe(480);
      await page.keyboard.press('Escape');
    });
  }
});
