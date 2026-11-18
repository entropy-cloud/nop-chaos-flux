import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * m11 number keyboard — verification (mobile-native interaction): smoke render,
 * digit taps build the input, confirm closes, delete removes the last digit,
 * mask click closes, responsive downscale re-render.
 *
 * Migrated from tests/e2e/mobile-number-keyboard.spec.ts (E3 batch 3, engine
 * swap + strengthening: expectNoPageErrors kernel check after each interaction
 * case, replacing Playwright's per-test implicit page-error surface).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the route
 * remounts (ft.reload() destroys the CDP evaluation context mid-spec).
 */

const HEADING = 'M11 安全输入 — number-keyboard';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING })).not.toBeVisible();
}

async function openNumberKeyboard(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/m11-number-keyboard');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING, level: 1 })).toBeVisible({ timeoutMs: 30_000 });
}

async function openKeyboardSheet(ft: FtGlobal): Promise<FtLocatorLike> {
  await ft.getByTestId('m11-keyboard-open').click();
  const keyboard = ft.locator('[data-slot="number-keyboard"]');
  await ft.expectWeb(keyboard).toBeVisible();
  return keyboard;
}

// driver Locator type is structural; keep the helper signatures loose
type FtLocatorLike = ReturnType<FtGlobal['locator']>;

// old spec asserted /7$/ (input text ends with "7") — driver toHaveText rejects
// RegExp, so compare trimmed text equality instead
async function expectInputText(ft: FtGlobal, expected: string): Promise<void> {
  const input = ft.getByTestId('m11-keyboard-input');
  await ft.expectWeb(input).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const text = ((await input.text()) ?? '').trim();
    if (text === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`m11: input text never became "${expected}", got "${await input.text()}"`);
}

export default async function mobileNumberKeyboard(ft: FtGlobal): Promise<{ cases: number }> {
  // old test.use viewport 1280x900 + hasTouch
  await ft.setViewportSize(1280, 900);

  // Case 1: smoke — keyboard trigger and input box render
  await openNumberKeyboard(ft);
  await ft.expectWeb(ft.getByTestId('m11-phone-frame')).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('m11-keyboard-open')).toBeVisible();
  await ft.expectWeb(ft.getByTestId('m11-keyboard-input')).toBeVisible();

  await expectNoPageErrors(ft, 'm11:smoke');

  // Case 2: keyboard opens, digit taps build the input, confirm closes
  await openNumberKeyboard(ft);
  let keyboard = await openKeyboardSheet(ft);

  // tap 1 → 5 via data-key buttons
  await keyboard.locator('[data-key="1"]').click();
  await keyboard.locator('[data-key="5"]').click();
  await expectInputText(ft, '15');

  // confirm closes the keyboard; input text persists after close
  await keyboard.locator('[data-slot="number-keyboard-confirm"]').click();
  await ft.expectWeb(ft.locator('[data-slot="number-keyboard"]')).toBeHidden();
  await expectInputText(ft, '15');

  await expectNoPageErrors(ft, 'm11:taps-confirm');

  // Case 3: delete key removes the last digit
  await openNumberKeyboard(ft);
  keyboard = await openKeyboardSheet(ft);

  await keyboard.locator('[data-key="7"]').click();
  await keyboard.locator('[data-key="8"]').click();
  await expectInputText(ft, '78');
  await keyboard.locator('[data-key="delete"]').click();
  await expectInputText(ft, '7');

  await expectNoPageErrors(ft, 'm11:delete');

  // Case 4: mask click closes the keyboard
  await openNumberKeyboard(ft);
  keyboard = await openKeyboardSheet(ft);

  // old Playwright click({ force: true }) bypassed hit-target checks because
  // the mask sits behind the sheet — target an unoccluded point near the top
  // edge of the mask instead of its occluded center
  const mask = keyboard.locator('[data-slot="number-keyboard-mask"]');
  const box = await mask.boundingBox();
  if (!box) throw new Error('m11: mask bounding box missing');
  await ft.mouse.click(box.x + box.width / 2, box.y + 10);
  await ft.expectWeb(ft.locator('[data-slot="number-keyboard"]')).toBeHidden();

  await expectNoPageErrors(ft, 'm11:mask-close');

  // Case 5: responsive check — the same route renders after downscaling
  await ft.setViewportSize(390, 844);
  // viewport flips via CDP emulation mid-session; bounce the route so the
  // layout remounts at the new breakpoint (old spec resized a fresh page)
  await openNumberKeyboard(ft);
  await ft.expectWeb(ft.getByTestId('m11-phone-frame')).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('m11-keyboard-input')).toBeVisible();

  await expectNoPageErrors(ft, 'm11:responsive');

  await ft.setViewportSize(1280, 900);

  return { cases: 5 };
}
