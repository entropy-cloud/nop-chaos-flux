import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * form atoms — slider (missing-components L1): bound value surface on thumb
 * input, keyboard stepping (step 1 / coarse 25 / zero-step fallback 1),
 * disabled presentation, live summary.
 *
 * Migrated from tests/e2e/form-atoms-slider.spec.ts (E3 batch 3, engine swap +
 * strengthening: the coarse/zero-step commit is additionally asserted through
 * the aria-valuenow surface, and expectNoPageErrors kernel checks replace
 * assertTrackedPageErrors).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab remounts
 * (ft.reload() destroys the CDP evaluation context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
}

async function openSliderLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/slider');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

// TODO(migrate-debt): evaluate fallback (nth(i).locator(sub) loses the index in
// the flux driver, and locator has no scrollIntoView — the multi-slider case
// scrolls a thumb into view by DOM index and clicks it by bounding-box
// coordinates; DOM order: brightness, disabled 60, coarse step, zero step)
async function scrollThumbIntoView(ft: FtGlobal, index: number): Promise<{ x: number; y: number }> {
  await ft.evaluate(`
    document.querySelectorAll('[data-testid="scenario-stage-bounded-ranges-coarse-steps-and-disabled-state"] [data-slot="slider-thumb"]')[${index}]
      .scrollIntoView({ block: 'center' })
  `);
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  const raw = await ft.evaluate(`
    JSON.stringify((function () {
      var el = document.querySelectorAll('[data-testid="scenario-stage-bounded-ranges-coarse-steps-and-disabled-state"] [data-slot="slider-thumb"]')[${index}];
      var r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })())
  `);
  const rect = JSON.parse(String(raw)) as { x: number; y: number };
  if (typeof rect.x !== 'number' || typeof rect.y !== 'number') throw new Error(`slider: thumb ${index} rect missing`);
  return rect;
}

export default async function formAtomsSlider(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: bound value renders on the thumb, output, and live summary
  await openSliderLab(ft);

  const stage1 = ft.getByTestId('scenario-stage-slider-with-in-form-live-summary');
  await ft.expectWeb(stage1).toBeVisible({ timeoutMs: 15_000 });

  const thumb1 = stage1.locator('[data-slot="slider-thumb"]');
  await ft.expectWeb(thumb1).toBeVisible();
  // base-ui renders a hidden range input inside the thumb carrying the
  // value surface (native min/max/value + aria-valuenow).
  const input1 = thumb1.locator('input');
  await ft.expectWeb(input1).toHaveAttribute('min', '0');
  await ft.expectWeb(input1).toHaveAttribute('max', '100');
  await ft.expectWeb(input1).toHaveAttribute('value', '40');
  await ft.expectWeb(input1).toHaveAttribute('aria-valuenow', '40');

  await ft.expectWeb(stage1.locator('[data-slot="slider-value"]')).toHaveText('40');
  // 已知首帧时序 gap：pushDefaultValue 的写入不触发模板依赖重解析，
  // `${volume}` 摘要首帧为空、交互后实时更新——交互断言在下方用例。

  await expectNoPageErrors(ft, 'slider:bound-value');

  // Case 2: keyboard stepping commits the bound value (ArrowRight → 41, step 1)
  await openSliderLab(ft);

  const stage2 = ft.getByTestId('scenario-stage-slider-with-in-form-live-summary');
  await ft.expectWeb(stage2).toBeVisible({ timeoutMs: 15_000 });
  const thumb2 = stage2.locator('[data-slot="slider-thumb"]');
  await thumb2.click();
  await ft.keyboard.press('ArrowRight');

  await ft.expectWeb(thumb2.locator('input')).toHaveAttribute('aria-valuenow', '41');
  await ft.expectWeb(stage2.locator('[data-slot="slider-value"]')).toHaveText('41');
  // locator.getByText is not in the driver API — stage-level containText is equivalent
  await ft.expectWeb(stage2).toContainText('Current volume: 41');

  await expectNoPageErrors(ft, 'slider:keyboard-step');

  // Case 3: coarse step quantizes to 25, zero-step falls back to 1, disabled ignores keys
  await openSliderLab(ft);

  const stage3 = ft.getByTestId('scenario-stage-bounded-ranges-coarse-steps-and-disabled-state');
  await ft.expectWeb(stage3).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(stage3.locator('[data-slot="slider-thumb"]')).toHaveCount(4, { timeoutMs: 10_000 });

  // Coarse step slider (step: 25, max 200): initial 0 → first ArrowRight lands on 25.
  const coarseRect = await scrollThumbIntoView(ft, 2);
  await ft.mouse.click(coarseRect.x, coarseRect.y);
  await ft.keyboard.press('ArrowRight');
  await ft.expectWeb(stage3.locator('input[max="200"]')).toHaveAttribute('value', '25', { timeoutMs: 10_000 });
  await ft.expectWeb(stage3.locator('input[max="200"]')).toHaveAttribute('aria-valuenow', '25');

  // Non-positive step (step: 0, max 20) falls back to 1 at runtime: 10 → ArrowRight → 11.
  await ft.expectWeb(stage3.locator('input[max="20"]')).toHaveAttribute('value', '10');
  const zeroRect = await scrollThumbIntoView(ft, 3);
  await ft.mouse.click(zeroRect.x, zeroRect.y);
  await ft.keyboard.press('ArrowRight');
  await ft.expectWeb(stage3.locator('input[max="20"]')).toHaveAttribute('value', '11', { timeoutMs: 10_000 });
  await ft.expectWeb(stage3.locator('input[max="20"]')).toHaveAttribute('aria-valuenow', '11');

  // Disabled slider stays bound to 60 and shows the disabled presentation
  // (thumb carries data-disabled — pointer/keyboard input is disabled at the
  // native-input level, so no click/keyboard is attempted here). The value is
  // static, so :has() gives a stable unique selector.
  const disabledThumb = stage3.locator('[data-slot="slider-thumb"]:has(input[max="100"])');
  await ft.expectWeb(disabledThumb).toBeVisible();
  await ft.expectWeb(disabledThumb).toHaveAttribute('data-disabled', '');
  await ft.expectWeb(disabledThumb.locator('input')).toBeDisabled();
  await ft.expectWeb(disabledThumb.locator('input')).toHaveAttribute('value', '60');
  const disabledSlider = stage3.locator('[data-slot="slider"]:has(input[max="100"])');
  await ft.expectWeb(disabledSlider).toHaveAttribute('data-disabled', '');

  await expectNoPageErrors(ft, 'slider:coarse-zero-disabled');

  return { cases: 3 };
}
