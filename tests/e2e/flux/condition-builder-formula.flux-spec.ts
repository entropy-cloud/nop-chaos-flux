import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * E3 condition-builder formula integration: formula value slot rendering,
 * expression write-back, group-if formula marker, and the literal fallback
 * for builders without formulas.enabled.
 *
 * Migrated from tests/e2e/condition-builder-formula.spec.ts (E3 batch 3,
 * engine swap + gated hash-route bounce isolation replacing fresh-page
 * fixtures, with named per-case kernel error markers).
 *
 * TODO(migrate-debt): evaluate fallback (nth(i).locator(sub) loses the index
 * in the flux driver, so the literal-builder slot count is read via
 * querySelectorAll on the second .nop-condition-builder).
 */

async function openFormulaPage(ft: FtGlobal): Promise<void> {
  // Bounce through the home route so the page remounts between cases
  // (fresh-page isolation parity; ft.reload() destroys the CDP context).
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/condition-builder-formula');
  await ft.expectWeb(
    ft.getByRole('heading', { name: '条件构建器 Formula 集成', level: 1 }),
  ).toBeVisible({ timeoutMs: 15_000 });
  // Lazy route chunk settles after the heading paints; let it settle before interacting.
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
}

async function addConditionAndRevealFormulaSlot(ft: FtGlobal): Promise<void> {
  // Add a condition first — the formula value slot renders per condition item.
  // TODO(migrate-debt): evaluate fallback (real CDP coordinate click on this
  // button lands on playground chrome and navigates home; programmatic
  // element.click() is the working equivalent).
  await ft.evaluate('(()=>{const b=Array.from(document.querySelectorAll("button")).find((b)=>b.textContent.trim()==="添加条件"); if(!b) throw new Error("添加条件 button not found"); b.click();})()');
  await ft.expectWeb(ft.locator('[data-slot="condition-formula-value"]').first()).toBeVisible({ timeoutMs: 10_000 });
}

export default async function conditionBuilderFormula(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: renders formula value slot when formulas.enabled=true
  await openFormulaPage(ft);
  await addConditionAndRevealFormulaSlot(ft);
  await expectNoPageErrors(ft, 'condition-builder-formula:slot-render');

  // Case 2: formula value slot writes expression string back to form value
  await openFormulaPage(ft);
  await addConditionAndRevealFormulaSlot(ft);
  const formulaSlot = ft.locator('[data-slot="condition-formula-value"]').first();
  await formulaSlot.fill('myTestExpression');
  await ft.expectWeb(formulaSlot).toHaveValue('myTestExpression');
  await expectNoPageErrors(ft, 'condition-builder-formula:write-back');

  // Case 3: group if input has formula marker when formulaForIf.enabled=true
  await openFormulaPage(ft);
  await ft.expectWeb(ft.locator('[data-slot="condition-group-if-formula"]').first()).toBeVisible({ timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'condition-builder-formula:group-if-marker');

  // Case 4: literal value slot renders for condition-builder without formulas.enabled
  await openFormulaPage(ft);
  const literalBuilder = ft.locator('.nop-condition-builder').nth(1);
  await ft.expectWeb(literalBuilder).toBeVisible({ timeoutMs: 10_000 });
  // TODO(migrate-debt): evaluate fallback (nth index lost by locator composition)
  const literalFormulaSlots = await ft.evaluate(
    'document.querySelectorAll(".nop-condition-builder")[1].querySelectorAll(\'[data-slot="condition-formula-value"]\').length',
  );
  if (literalFormulaSlots !== 0) {
    throw new Error(`literal builder should have 0 formula slots, got ${literalFormulaSlots}`);
  }
  await expectNoPageErrors(ft, 'condition-builder-formula:literal-fallback');

  return { cases: 4 };
}
