import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * form atoms — input-color (missing-components L1).
 *
 * Migrated from tests/e2e/form-atoms-input-color.spec.ts (E3 batch 1, engine
 * swap + toHaveCSS upgraded to a retry-polling computed-style probe and
 * kernel white-box error check in place of assertTrackedPageErrors).
 */

async function openColorLab(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/lab/input-color');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

/**
 * Driver gap: expectWeb has no toHaveCSS — poll the computed style via
 * ft.evaluate until it matches (retry-polling like Playwright).
 */
// TODO(migrate-debt): evaluate fallback (driver has no CSS-value web assertion)
async function expectComputedStyle(ft: FtGlobal, selector: string, property: string, expected: string, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  const expression =
    `(() => { const el = document.querySelector(${JSON.stringify(selector)});` +
    ` return el ? getComputedStyle(el).${property} : null; })()`;
  while (Date.now() < deadline) {
    last = String((await ft.evaluate(expression)) ?? '');
    if (last === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`computed ${property} of ${selector}: expected ${expected}, last ${last}`);
}

export default async function inputColor(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: bound value renders on the swatch and the live summary
  await openColorLab(ft);

  const stage = ft.getByTestId('scenario-stage-color-picker-with-in-form-live-summary');
  await ft.expectWeb(stage).toBeVisible({ timeoutMs: 15_000 });

  const swatch = stage.locator('[data-slot="color-picker-swatch"]');
  await ft.expectWeb(swatch).toBeVisible();
  await expectComputedStyle(
    ft,
    '[data-testid="scenario-stage-color-picker-with-in-form-live-summary"] [data-slot="color-picker-swatch"]',
    'backgroundColor',
    'rgb(37, 99, 235)',
  );
  // pushDefaultValue 首帧 gap：`${accent}` 摘要断言移至 preset 点击用例。

  // Case 2: picking a preset swatch commits the normalized hex value
  await openColorLab(ft);

  await stage.locator('[data-slot="color-picker"] button').first().click();

  const panel = ft.locator('[data-slot="color-picker-panel"]');
  await ft.expectWeb(panel).toBeVisible();
  await panel.locator('[data-slot="color-picker-preset"][data-color="#dc2626"]').click();

  await ft.expectWeb(stage).toContainText('Current accent: #dc2626');

  await expectNoPageErrors(ft, 'input-color-preset');

  // Case 3: rgba valueFormat preserves alpha and free-form input commits
  await openColorLab(ft);

  const rgbaStage = ft.getByTestId('scenario-stage-rgba-format-custom-swatches-and-read-only');
  await ft.expectWeb(rgbaStage).toBeVisible({ timeoutMs: 15_000 });

  // Bound rgba value keeps alpha on the swatch.
  await expectComputedStyle(
    ft,
    '[data-testid="scenario-stage-rgba-format-custom-swatches-and-read-only"] [data-slot="color-picker-swatch"]',
    'backgroundColor',
    'rgba(12, 34, 56, 0.8)',
  );

  // Type a free-form value into the second picker (custom swatches) and commit.
  const trigger = rgbaStage.locator('[data-slot="color-picker"] button').nth(1);
  await trigger.click();
  const panel2 = ft.locator('[data-slot="color-picker-panel"]').last();
  const input = panel2.locator('input');
  await input.fill('#00ff00');
  await input.press('Enter');
  await ft.expectWeb(input).toHaveValue('#00ff00');

  await expectNoPageErrors(ft, 'input-color-rgba');

  return { cases: 3 };
}
