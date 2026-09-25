import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';

async function openRegionLab(page: Page): Promise<void> {
  await page.goto('/#/lab/input-city', { waitUntil: 'commit' });
  await expect(page.getByTestId('multi-scenario-lab')).toBeVisible({ timeout: 30_000 });
}

test.describe('org select — input-city (missing-components L2.2)', () => {
  test('desktop cascade drills province → city → district and commits the path label', async ({ page }) => {
    await openRegionLab(page);

    const stage = page.getByTestId('scenario-stage-lazy-cascade-three-levels');
    await stage.locator('[data-slot="region-trigger"]').click();
    const panel = stage.locator('[data-slot="region-panel"]');
    await expect(panel).toBeVisible();

    // Drill: Guangdong → Guangzhou → Tianhe (lazy columns).
    const province = panel.locator('[data-slot="region-node"][data-node-id="gd"]');
    await expect(province).toBeVisible();
    await province.locator('[data-slot="region-node-expand"]').click();
    const city = panel.locator('[data-slot="region-node"][data-node-id="gd-gz"]');
    await expect(city).toBeVisible();
    await city.locator('[data-slot="region-node-expand"]').click();
    const district = panel.locator('[data-slot="region-node"][data-node-id="gd-gz-tianhe"]');
    await expect(district).toBeVisible();

    // Commit at the district level → trigger shows the full path text.
    await district.locator('[data-slot="region-node-name"]').click();
    await expect(stage.locator('[data-slot="region-value"]')).toHaveText(
      'Guangdong / Guangzhou / Tianhe',
    );
    await expect(stage.getByText('Region: gd-gz-tianhe')).toBeVisible();

    await assertTrackedPageErrors(page);
  });

  test('preselected id echoes as a 省市区 path through extra.path', async ({ page }) => {
    await openRegionLab(page);

    const stage = page.getByTestId('scenario-stage-preselected-echo-via-extra-path');
    await expect(stage.locator('[data-slot="region-value"]')).toHaveText(
      'Guangdong / Guangzhou / Tianhe',
      { timeout: 15_000 },
    );

    await assertTrackedPageErrors(page);
  });

  test('mobile viewport switches to the wheel sheet branch and commits via confirm', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openRegionLab(page);

    const stage = page.getByTestId('scenario-stage-lazy-cascade-three-levels');
    await stage.locator('[data-slot="region-trigger"]').click();
    const sheet = page.locator('[data-slot="region-wheel-sheet"]');
    await expect(sheet).toBeVisible();

    // Wheel columns: pick province → city loads → pick → confirm commits deepest.
    const provinceOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd"]');
    await expect(provinceOption).toBeVisible();
    await provinceOption.click();
    const cityOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd-gz"]');
    await expect(cityOption).toBeVisible({ timeout: 10_000 });
    await cityOption.click();
    const districtOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd-gz-tianhe"]');
    await expect(districtOption).toBeVisible({ timeout: 10_000 });
    await districtOption.click();

    await sheet.locator('[data-slot="region-wheel-confirm"]').click();
    await expect(stage.locator('[data-slot="region-value"]')).toHaveText(
      'Guangdong / Guangzhou / Tianhe',
    );

    await assertTrackedPageErrors(page);
  });
});
