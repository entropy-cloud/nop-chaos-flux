import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * E3 form input enhancements: stepper long-press, array-editor reorder,
 * key-value reorder.
 *
 * Migrated from tests/e2e/form-input-enhancements.spec.ts (E3 batch 4, engine swap +
 * dispatchEvent('pointerdown'/'pointerup') long-press upgraded to REAL CDP
 * mouse down/up on the element center with a 600ms hold — stronger than the
 * old synthetic pointer events, and getByPlaceholder mapped to
 * [placeholder=...] attribute selectors).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab
 * remounts (ft.reload() is unusable mid-spec).
 */

const HEADING = '表单输入控件增强 — 长按步进 + min/max + 重排';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.goto('/#/form-input-enhancements');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING, level: 1 })).toBeVisible({ timeoutMs: 15_000 });
}

// explicit retry loop with last-actual in the error (nth()-state substitution, see debt note)
async function pollButtonStates(
  ft: FtGlobal,
  selector: string,
  check: (states: boolean[]) => boolean,
  label: string,
): Promise<void> {
  let last: boolean[] = [];
  for (let i = 0; i < 50; i++) {
    last = (await ft.evaluate(
      `(() => Array.from(document.querySelectorAll('${selector}')).map((b) => b.disabled))()`,
    )) as boolean[];
    if (check(last)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label}: button states never matched, last actual ${JSON.stringify(last)}`);
}

async function pollInputValues(
  ft: FtGlobal,
  selector: string,
  expected: string[],
  label: string,
): Promise<void> {
  let last: string[] = [];
  for (let i = 0; i < 50; i++) {
    last = (await ft.evaluate(
      `(() => Array.from(document.querySelectorAll('${selector}')).map((el) => el.value))()`,
    )) as string[];
    if (expected.every((v, idx) => last[idx] === v)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label}: input values never matched ${JSON.stringify(expected)}, last actual ${JSON.stringify(last)}`);
}

export default async function formInputEnhancements(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: input-number long-press continuously steps and clamps at max
  await resetRoute(ft);

  const increase = ft.locator('[data-slot="stepper-increase"]');
  await ft.expectWeb(increase).toBeVisible({ timeoutMs: 10_000 });
  const increaseBox = await increase.boundingBox();
  if (!increaseBox) throw new Error('stepper-increase bounding box missing');

  // real CDP long-press: hold the button down for 600ms so the repeat timer fires
  const cx = increaseBox.x + increaseBox.width / 2;
  const cy = increaseBox.y + increaseBox.height / 2;
  await ft.mouse.move(cx, cy);
  await ft.mouse.down();
  await new Promise((resolve) => setTimeout(resolve, 600));
  await ft.mouse.up();

  const countText = String(
    await ft.evaluate(`(() => (document.querySelector('[data-testid="form-input-enhancements-count"]')?.textContent) ?? '')()`),
  );
  const match = countText.match(/count = (-?\d+)/);
  const finalCount = match ? Number(match[1]) : 0;
  if (finalCount < 2) throw new Error(`long-press should step at least twice, count = ${finalCount}`);
  if (finalCount > 10) throw new Error(`stepper should clamp at max 10, count = ${finalCount}`);
  await expectNoPageErrors(ft, 'form-input:long-press');

  // Case 2: array-editor move-up reorders rows and disables move-up on the first row
  await resetRoute(ft);

  const moveUpButtons = ft.locator('[data-slot="array-editor-move-up"]');
  // TODO(migrate-debt): driver gap workaround — the indexed locator (nth/last)
  // only overrides click/text/innerHTML/attr; isEnabled/inputValue still resolve
  // the FIRST match, so per-row button state and multi-row input values are
  // asserted via explicit ft.evaluate reads (same assertions, explicit retry
  // with last-actual) while the reorder CLICK still goes through nth().click().
  await pollButtonStates(
    ft,
    '[data-slot="array-editor-move-up"]',
    (states) => states[0] === true && states[1] === false,
    'array move-up: [disabled, enabled]',
  );

  // driver has no getByPlaceholder; attribute selectors are equivalent
  const tag1 = ft.locator('[placeholder="Tag 1"]');
  const tag2 = ft.locator('[placeholder="Tag 2"]');
  await ft.expectWeb(tag1).toHaveValue('alpha');
  await ft.expectWeb(tag2).toHaveValue('beta');

  await moveUpButtons.nth(1).click();

  await ft.expectWeb(tag1).toHaveValue('beta');
  await ft.expectWeb(tag2).toHaveValue('alpha');
  await expectNoPageErrors(ft, 'form-input:array-reorder');

  // Case 3: key-value move-down reorders entries and disables move-down on the last row
  await resetRoute(ft);

  // 移动按钮的可访问名走 i18n（en 'Move entry N down' / zh '下移第 N 项'），
  // 断言改用稳定的 data-slot 定位，避免文案耦合。
  const moveDownButtons = ft.locator('[data-slot="key-value-move-down"]');
  // 移动按钮的可访问名走 i18n（en 'Move entry N down' / zh '下移第 N 项'），
  // 断言改用稳定的 data-slot 定位，避免文案耦合。
  await pollButtonStates(
    ft,
    '[data-slot="key-value-move-down"]',
    (states) => states[states.length - 1] === true && states[0] === false,
    'key-value move-down: [enabled..., disabled on last]',
  );

  // placeholder walks i18n (en 'Key' / zh '键') — one selector for either;
  // multi-row values read explicitly (see nth-debt note above)
  const keyInputSelector = 'input[placeholder="Key"], input[placeholder="键"]';
  await pollInputValues(ft, keyInputSelector, ['env', 'region'], 'key-value initial order');
  await moveDownButtons.nth(0).click();
  await pollInputValues(ft, keyInputSelector, ['region', 'env'], 'key-value after move-down');
  await expectNoPageErrors(ft, 'form-input:key-value-reorder');

  return { cases: 3 };
}
