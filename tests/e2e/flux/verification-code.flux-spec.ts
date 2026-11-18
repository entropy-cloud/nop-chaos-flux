import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * form — verification-code (missing-components L2.4): typing distributes across
 * cells, value commits only at full length, masked slots render transparent
 * characters, backspace-past-empty stays editable (值语义不变式).
 *
 * Migrated from tests/e2e/verification-code.spec.ts (E3 batch 3, engine swap +
 * strengthening: the live-readout emptiness contract is additionally re-checked
 * with a poll after the Backspace resets, and expectNoPageErrors kernel checks
 * replace assertTrackedPageErrors).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the lab remounts
 * (ft.reload() destroys the CDP evaluation context mid-spec).
 *
 * TODO(migrate-debt): evaluate fallback (locator.getByText is not in the driver
 * API and locator.evaluate is unavailable, so the live readout "Code:" line is
 * located and read via page-level text-node scan; masked-slot computed color
 * also has no driver matcher).
 *
 * TODO(migrate-debt): keyboard-typing fallback — the driver cannot deliver
 * faithful per-character typing into the OTP control: ft.keyboard.type's
 * synthetic input events are swallowed by React's value tracker (no onChange),
 * and real CDP printable presses double-insert on the OTP input (text emitted
 * on both keyDown and char, verified against the live playground). Digits are
 * therefore committed via locator.fill on the [data-input-otp] input (same
 * value-semantics contract: partial fill stays uncommitted, full-length fill
 * commits), while Backspace keeps real CDP presses (deletes exactly one cell
 * per press).
 */

const SIX_DIGIT_SEL = '[data-testid="scenario-stage-six-digit-code-with-live-readout"]';
const MASKED_SEL = '[data-testid="scenario-stage-masked-four-digit-code"]';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
}

async function openVerificationLab(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/lab/verification-code');
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

// old readoutFor(): stage.getByText(/^Code:/).evaluate(innerText) — the readout
// is the only text starting with "Code:" inside the stage
async function readoutText(ft: FtGlobal, stageSelector: string): Promise<string> {
  const raw = await ft.evaluate(`
    (function () {
      var stage = document.querySelector('${stageSelector}');
      if (!stage) return '';
      var walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        var text = String(node.textContent).trim();
        if (text.indexOf('Code:') === 0) return text;
      }
      return '';
    })()
  `);
  return String(raw).trim();
}

async function expectReadout(ft: FtGlobal, stageSelector: string, expected: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const text = await readoutText(ft, stageSelector);
    if (text === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`verification-code: readout never became "${expected}", last "${await readoutText(ft, stageSelector)}"`);
}

export default async function verificationCode(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: typing distributes across cells and commits only at full length
  await openVerificationLab(ft);

  await ft.expectWeb(ft.getByTestId('scenario-stage-six-digit-code-with-live-readout')).toBeVisible({ timeoutMs: 15_000 });
  const otp1 = ft.locator(`${SIX_DIGIT_SEL} [data-input-otp]`);
  await otp1.click();

  // Type 4 digits (< length): the live readout must stay "Code:" (empty).
  await otp1.fill('1234');
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code:');

  // Complete all 6: the value commits.
  await otp1.fill('123456');
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code: 123456');
  await ft.expectWeb(ft.locator(SIX_DIGIT_SEL)).toContainText('Code: 123456');

  // Backspace twice → 4 digits → value falls back to empty (值语义不变式).
  await ft.keyboard.press('Backspace');
  await ft.keyboard.press('Backspace');
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code:');

  await expectNoPageErrors(ft, 'verification-code:commit-at-full-length');

  // Case 2: masked variant renders transparent slot characters
  await openVerificationLab(ft);

  await ft.expectWeb(ft.getByTestId('scenario-stage-masked-four-digit-code')).toBeVisible({ timeoutMs: 15_000 });
  const otp = ft.locator(`${MASKED_SEL} [data-slot="input-otp"]`);
  await ft.expectWeb(otp).toBeVisible();
  // old toHaveAttribute('data-masked', /true/) — full-value equality is the
  // actual contract here (masked variant flag)
  await ft.expectWeb(otp).toHaveAttribute('data-masked', 'true');
  await ft.locator(`${MASKED_SEL} [data-input-otp]`).click();
  await ft.locator(`${MASKED_SEL} [data-input-otp]`).fill('99');
  // Masked slot text is transparent (no visible chars), but value commits at
  // full length — 2 of 4 digits stay uncommitted.
  let slotColor = '';
  for (let i = 0; i < 20; i++) {
    slotColor = String(
      await ft.evaluate(
        `(function () { var slot = document.querySelector('${MASKED_SEL} [data-slot="input-otp-slot"]'); return slot ? getComputedStyle(slot).color : ''; })()`,
      ),
    );
    if (slotColor === 'rgba(0, 0, 0, 0)') break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (slotColor !== 'rgba(0, 0, 0, 0)') {
    throw new Error(`verification-code: masked slot color "${slotColor}" is not transparent`);
  }

  await expectNoPageErrors(ft, 'verification-code:masked');

  // Case 3: backspace beyond committed code resets to empty and stays editable
  await openVerificationLab(ft);

  await ft.expectWeb(ft.getByTestId('scenario-stage-six-digit-code-with-live-readout')).toBeVisible({ timeoutMs: 15_000 });
  const otp3 = ft.locator(`${SIX_DIGIT_SEL} [data-input-otp]`);
  await otp3.click();
  await otp3.fill('654321');
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code: 654321');

  // Backspace past empty: control stays editable (no crash / no stale value).
  for (let i = 0; i < 8; i++) {
    await ft.keyboard.press('Backspace');
  }
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code:');
  await otp3.fill('9');
  await expectReadout(ft, SIX_DIGIT_SEL, 'Code:');

  await expectNoPageErrors(ft, 'verification-code:backspace-past-empty');

  return { cases: 3 };
}
