import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * arc-component-gap G1I: input-password showStrength meter e2e. Programmatic
 * assertions only (no screenshots as proof): meter presence per value state,
 * aria level trio, segment fill count, and hide-on-empty.
 *
 * Migrated from tests/e2e/input-password-strength.spec.ts (E3 batch 4, engine
 * swap + the gotoPage waitForTimeout(2500) settle replaced by a visibility
 * gate on the scenario stage marker, assertTrackedPageErrors replaced by
 * expectNoPageErrors kernel white-box, and filledSegments counted through a
 * unique [data-testid] scoped querySelectorAll).
 *
 * TODO(migrate-debt): evaluate fallback — the segment fill count
 * (`:not([class*="bg-muted"])` pseudo-filter) is read via ft.evaluate +
 * querySelectorAll on the stage instead of a locator chain.
 */

async function filledSegments(ft: FtGlobal): Promise<number> {
  const count = await ft.evaluate(
    'document.querySelectorAll(\'[data-testid="scenario-stage-password-strength-meter"] [data-slot="input-password-strength-segment"]:not([class*="bg-muted"])\').length',
  );
  return Number(count);
}

export default async function inputPasswordStrength(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/lab/input-password');

  const stage = ft.locator('[data-testid="scenario-stage-password-strength-meter"]');
  await ft.expectWeb(stage).toBeVisible({ timeoutMs: 15_000 });

  const input = stage.locator('input[type="password"]');
  await ft.expectWeb(input).toHaveCount(1);

  const meter = stage.locator('[data-slot="input-password-strength"]');
  await ft.expectWeb(meter).toHaveCount(0);

  // too short → level 0, single destructive fill, word "Too short"
  await input.fill('abc');
  await ft.expectWeb(meter).toHaveCount(1);
  await ft.expectWeb(meter).toHaveAttribute('aria-valuenow', '0');
  // playground runs zh-CN; level words are pinned in input-password/design.md §10
  await ft.expectWeb(meter).toHaveAttribute('aria-valuetext', '太短');
  const filled0 = await filledSegments(ft);
  if (filled0 !== 1) throw new Error(`level 0 should fill 1 segment, got ${filled0}`);

  // four criteria met → level 4, all four segments filled
  await input.fill('Abcdef1!');
  await ft.expectWeb(meter).toHaveAttribute('aria-valuenow', '4');
  await ft.expectWeb(meter).toHaveAttribute('aria-valuetext', '强');
  const filled4 = await filledSegments(ft);
  if (filled4 !== 4) throw new Error(`level 4 should fill 4 segments, got ${filled4}`);

  // two criteria (length ≥ 8 not met, mixed case + digit) → level 2
  await input.fill('Abcdef1');
  await ft.expectWeb(meter).toHaveAttribute('aria-valuenow', '2');
  await ft.expectWeb(meter).toHaveAttribute('aria-valuetext', '一般');
  const filled2 = await filledSegments(ft);
  if (filled2 !== 2) throw new Error(`level 2 should fill 2 segments, got ${filled2}`);

  // clear → meter unmounts entirely
  await input.fill('');
  await ft.expectWeb(meter).toHaveCount(0);

  await expectNoPageErrors(ft, 'input-password-strength');

  return { cases: 1 };
}
