import type { FtGlobal } from '@nop-chaos/flux-test-driver';

/**
 * T0 interaction pilot (E2): migrated from tests/e2e/boolean-control-value-contract.spec.ts.
 *
 * Engine swap (Playwright → flux-test) with assertion strength upgrades:
 * - `expect.poll(text)` replaced by kernel `ft.waitFor({type:'stability'})`
 *   gating after each click (counter includes the scope write);
 * - `assertTrackedPageErrors` replaced by kernel `getLatestError` white-box
 *   check (stricter: sees runtime-level failures, not just console errors).
 */

async function readValue(ft: FtGlobal, testid: string): Promise<string> {
  const text = await ft.getByTestId(testid).text();
  return text ?? '';
}

async function expectNoKernelError(ft: FtGlobal, marker: string): Promise<void> {
  // kernel white-box: the debugger automation surface tracks the latest error
  const latest = await ft.evaluate(
    `window.__NOP_DEBUGGER_API__ && window.__NOP_DEBUGGER_API__.getLatestError ? window.__NOP_DEBUGGER_API__.getLatestError() : null`,
  );
  if (latest) {
    throw new Error(`kernel error detected (${marker}): ${JSON.stringify(latest).slice(0, 300)}`);
  }
}

async function toggleAndExpect(
  ft: FtGlobal,
  selector: string,
  nth: number,
  testid: string,
  expectedOn: string,
  expectedOff: string,
  marker: string,
): Promise<void> {
  const control = ft.locator(selector).nth(nth);
  await control.waitFor('visible', { timeoutMs: 10_000 });

  if (!(await readValue(ft, testid)).includes(expectedOff)) {
    throw new Error(`${marker}: initial value should contain "${expectedOff}", got "${await readValue(ft, testid)}"`);
  }

  await control.click();
  const stableOn = await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  if (!stableOn.ok) throw new Error(`${marker}: page did not stabilize after toggling on`);
  if (!(await readValue(ft, testid)).includes(expectedOn)) {
    throw new Error(`${marker}: after on expected "${expectedOn}", got "${await readValue(ft, testid)}"`);
  }

  await control.click();
  const stableOff = await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  if (!stableOff.ok) throw new Error(`${marker}: page did not stabilize after toggling off`);
  if (!(await readValue(ft, testid)).includes(expectedOff)) {
    throw new Error(`${marker}: after off expected "${expectedOff}", got "${await readValue(ft, testid)}"`);
  }

  await expectNoKernelError(ft, marker);
}

export default async function booleanContractSpec(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.goto('/#/boolean-control-value-contract');
  const stable = await ft.waitFor({ type: 'stability' }, { timeoutMs: 30_000 });
  if (!stable.ok) throw new Error('page never stabilized');

  // hash route swap renders lazily; poll until the target page's h1 shows up
  let heading = '';
  for (let i = 0; i < 50; i++) {
    heading = (await ft.locator('h1').text()) ?? '';
    if (heading.includes('布尔控件值契约')) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!heading.includes('布尔控件值契约')) {
    throw new Error(`wrong page: heading = ${heading.slice(0, 60)}`);
  }
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });

  // checkbox stores trueValue(1)/falseValue(0); switch stores yes/no;
  // fallback pairs store raw booleans. checkbox #0=Enabled, #1=Agree; switch #0=Notify, #1=Featured.
  await toggleAndExpect(ft, '[role="checkbox"]', 0, 'boolean-contract-value-enabled', 'enabled = 1', 'enabled = 0', 'enabled');
  await toggleAndExpect(ft, '[role="switch"]', 0, 'boolean-contract-value-notify', 'notify = yes', 'notify = no', 'notify');
  await toggleAndExpect(ft, '[role="checkbox"]', 1, 'boolean-contract-value-agree', 'agree = true', 'agree = false', 'agree');
  await toggleAndExpect(ft, '[role="switch"]', 1, 'boolean-contract-value-featured', 'featured = true', 'featured = false', 'featured');

  return { cases: 4 };
}
