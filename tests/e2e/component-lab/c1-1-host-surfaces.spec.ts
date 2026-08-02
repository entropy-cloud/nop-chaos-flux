import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C1.1 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-tabs-nesting + bug 73 pattern: a tab panel opens a dialog; the dialog
 *    form input must update the surface store and the submitted payload must
 *    carry the TYPED value (not a stale one).
 * 2. host-tabs-nesting: drawer opens and closes inside a tab panel without
 *    residual DOM.
 * 3. a11y-focus-trap: Tab cycling keeps focus inside the open dialog.
 * 4. bug 73 pattern special check for container: semantic layout props
 *    (direction/gap) must actually lay out in a real browser (computed style),
 *    not just emit attributes (docs/bugs/75). Also verifies page.data init
 *    patch in a real browser.
 */

test('tabs-host: dialog inside tab panel submits the typed value and closes (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tabs');

  const slug = scenarioSlug('Tabs hosting dialog and drawer surfaces');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByRole('tab', { name: 'Surfaces' }).click();
  await stage.getByRole('button', { name: 'Open Note Dialog' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Add Note')).toBeVisible();

  const noteInput = page.getByRole('textbox', { name: 'Note' });
  await expect(noteInput).toBeVisible();
  await noteInput.fill('TypedInsideTabDialog');
  await expect(noteInput).toHaveValue('TypedInsideTabDialog');

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });

  const submitted = await page.evaluate(() =>
    (window as unknown as { __tabsSurfaceSubmitProbe?: { note?: string } })
      .__tabsSurfaceSubmitProbe,
  );
  expect(submitted?.note).toBe('TypedInsideTabDialog');
});

test('tabs-host: drawer inside tab panel opens and closes without residual DOM', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tabs');

  const slug = scenarioSlug('Tabs hosting dialog and drawer surfaces');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByRole('tab', { name: 'Surfaces' }).click();
  await stage.getByRole('button', { name: 'Open Note Drawer' }).click();

  const drawerTitle = page.getByRole('heading', { name: 'Note Drawer' });
  await expect(drawerTitle).toBeVisible();

  await page.locator('[data-slot="drawer-close"]').click();
  await expect(drawerTitle).toBeHidden({ timeout: 10_000 });

  const residual = await page.evaluate(() =>
    Boolean(document.querySelector('[data-slot="drawer-surface"]')),
  );
  expect(residual).toBe(false);
});

test('dialog: Tab cycling keeps focus trapped inside the dialog (a11y-focus-trap)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tabs');

  const slug = scenarioSlug('Tabs hosting dialog and drawer surfaces');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.getByRole('tab', { name: 'Surfaces' }).click();
  await stage.getByRole('button', { name: 'Open Note Dialog' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Wait for the dialog content to be interactive (focus is placed inside).
  await expect(dialog.getByRole('textbox', { name: 'Note' })).toBeVisible();

  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
  }

  const focusInside = await page.evaluate(() => {
    const active = document.activeElement;
    const surface = document.querySelector('[data-slot="dialog-surface"]');
    return Boolean(active && surface?.contains(active));
  });
  expect(focusInside).toBe(true);
});

test('container: semantic direction/gap lay out in a real browser (bug 73 pattern check)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('container');

  const slug = scenarioSlug('Semantic row direction with gap');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const body = stage.locator('[data-slot="container-body"]');
  await expect(body).toBeVisible();

  const layout = await body.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      flexDirection: style.flexDirection,
      gap: style.gap,
    };
  });

  expect(layout.flexDirection).toBe('row');
  expect(['16px', '1rem']).toContain(layout.gap);

  // page.data init patch visible in the real browser (page C1.1 P1-1)
  await expect(stage.getByText('3 items')).toBeVisible();
});
