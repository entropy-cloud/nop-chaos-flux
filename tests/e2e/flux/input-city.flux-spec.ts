import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * org select — input-city (missing-components L2.2).
 * Desktop lazy cascade drill, preselected echo through extra.path, and the
 * mobile wheel-sheet branch.
 *
 * Migrated from tests/e2e/input-city.spec.ts (E3 batch 1, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling with
 * the same timeouts; raw getAttribute/text equality kept as explicit checks).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab remounts
 * (ft.reload() is unusable — it destroys the CDP evaluation context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
}

async function openRegionLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/input-city');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

export default async function inputCity(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: desktop cascade drills province → city → district and commits the path label
  await ft.setViewportSize(1280, 800);
  await openRegionLab(ft);

  const stage = ft.getByTestId('scenario-stage-lazy-cascade-three-levels');
  await stage.locator('[data-slot="region-trigger"]').click();
  const panel = stage.locator('[data-slot="region-panel"]');
  await ft.expectWeb(panel).toBeVisible();

  // Drill: Guangdong → Guangzhou → Tianhe (lazy columns).
  const province = panel.locator('[data-slot="region-node"][data-node-id="gd"]');
  await ft.expectWeb(province).toBeVisible();
  await province.locator('[data-slot="region-node-expand"]').click();
  const city = panel.locator('[data-slot="region-node"][data-node-id="gd-gz"]');
  await ft.expectWeb(city).toBeVisible();
  await city.locator('[data-slot="region-node-expand"]').click();
  const district = panel.locator('[data-slot="region-node"][data-node-id="gd-gz-tianhe"]');
  await ft.expectWeb(district).toBeVisible();

  // Commit at the district level → trigger shows the full path text.
  await district.locator('[data-slot="region-node-name"]').click();
  await ft.expectWeb(stage.locator('[data-slot="region-value"]')).toHaveText('Guangdong / Guangzhou / Tianhe');
  // locator.getByText is not in the driver API; stage-level containText is equivalent
  await ft.expectWeb(stage).toContainText('Region: gd-gz-tianhe');

  await expectNoPageErrors(ft, 'input-city:desktop-cascade');

  // Case 2: preselected id echoes as a 省市区 path through extra.path
  await openRegionLab(ft);

  const echoStage = ft.getByTestId('scenario-stage-preselected-echo-via-extra-path');
  await ft.expectWeb(echoStage.locator('[data-slot="region-value"]')).toHaveText(
    'Guangdong / Guangzhou / Tianhe',
    { timeoutMs: 15_000 },
  );

  await expectNoPageErrors(ft, 'input-city:preselected-echo');

  // Case 3: mobile viewport switches to the wheel sheet branch and commits via confirm
  await ft.setViewportSize(390, 844);
  await openRegionLab(ft);

  const mobileStage = ft.getByTestId('scenario-stage-lazy-cascade-three-levels');
  await mobileStage.locator('[data-slot="region-trigger"]').click();
  const sheet = ft.locator('[data-slot="region-wheel-sheet"]');
  await ft.expectWeb(sheet).toBeVisible();

  // Wheel columns: pick province → city loads → pick → confirm commits deepest.
  const provinceOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd"]');
  await ft.expectWeb(provinceOption).toBeVisible();
  await provinceOption.click();
  const cityOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd-gz"]');
  await ft.expectWeb(cityOption).toBeVisible({ timeoutMs: 10_000 });
  await cityOption.click();
  const districtOption = sheet.locator('[data-slot="region-wheel-column"] [data-node-id="gd-gz-tianhe"]');
  await ft.expectWeb(districtOption).toBeVisible({ timeoutMs: 10_000 });
  await districtOption.click();

  await sheet.locator('[data-slot="region-wheel-confirm"]').click();
  await ft.expectWeb(mobileStage.locator('[data-slot="region-value"]')).toHaveText(
    'Guangdong / Guangzhou / Tianhe',
  );

  await expectNoPageErrors(ft, 'input-city:mobile-wheel');

  // restore desktop viewport for any subsequent spec sharing conventions
  await ft.setViewportSize(1280, 800);

  return { cases: 3 };
}
