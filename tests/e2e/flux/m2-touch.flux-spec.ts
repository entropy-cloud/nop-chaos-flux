import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * M2 touch adaptation — mobile viewport (390x844) and desktop viewport (1280x800).
 *
 * Migrated from tests/e2e/m2-touch.spec.ts (E3 batch 2, engine swap +
 * strengthening: the computed-style font-size and bounding-box height gates are
 * supplemented with expectNoPageErrors kernel checks per viewport group, and the
 * desktop group explicitly remounts the route after setViewportSize instead of
 * relying on Playwright's per-test fresh page).
 */

// setViewportSize applies through CDP emulation — confirm window.innerWidth AND
// the app's own mobile media query ((max-width: 767px), useIsMobile's input)
// actually flipped before remounting, or the route renders with stale breakpoint.
async function confirmViewport(ft: FtGlobal, width: number, mobile: boolean): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const state = await ft.evaluate(
      `JSON.stringify({ inner: window.innerWidth, mq: window.matchMedia('(max-width: 767px)').matches })`,
    );
    const parsed = JSON.parse(String(state)) as { inner: number; mq: boolean };
    if (parsed.inner === width && parsed.mq === mobile) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`m2-touch: viewport never reached ${width}px (mobile=${mobile})`);
}

async function openM2Touch(ft: FtGlobal): Promise<void> {
  // goto to the same hash url is a no-op — bounce through '/#/' so the page remounts
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: /M2 表单控件触摸适配/ })).not.toBeVisible();
  await ft.goto('/#/m2-touch');
  await ft
    .expectWeb(ft.getByRole('heading', { name: /M2 表单控件触摸适配/, level: 1 }))
    .toBeVisible({ timeoutMs: 15_000 });
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
}

// The mobile→desktop flip re-renders through the matchMedia subscription —
// the old Playwright not-matchers auto-retried, so poll for the desktop state
// instead of single-shot attribute reads.
async function pollUntilDesktop(ft: FtGlobal, probe: () => Promise<boolean>, label: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (await probe()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`m2-touch: desktop state never reached for ${label}`);
}

async function expectAttrContains(ft: FtGlobal, selector: string, attr: string, expected: string): Promise<void> {
  const value = (await ft.locator(selector).attr(attr)) ?? '';
  if (!value.includes(expected)) {
    throw new Error(`${selector}: ${attr}="${value}" does not contain "${expected}"`);
  }
}

async function expectAttrNotContains(ft: FtGlobal, selector: string, attr: string, banned: string): Promise<void> {
  const value = (await ft.locator(selector).attr(attr)) ?? '';
  if (value.includes(banned)) {
    throw new Error(`${selector}: ${attr}="${value}" must not contain "${banned}"`);
  }
}

// TODO(migrate-debt): evaluate fallback (computed style / bounding-rect reads
// have no driver equivalent for these one-off probes)
async function readFontSize(ft: FtGlobal, selector: string): Promise<number> {
  const raw = await ft.evaluate(
    `(function () { var el = document.querySelector('${selector}'); return el ? parseFloat(getComputedStyle(el).fontSize) : null; })()`,
  );
  return Number(raw);
}

async function readHeightPx(ft: FtGlobal, selector: string): Promise<number> {
  const raw = await ft.evaluate(
    `(function () { var el = document.querySelector('${selector}'); return el ? Math.round(el.getBoundingClientRect().height) : null; })()`,
  );
  return Number(raw);
}

export default async function m2Touch(ft: FtGlobal): Promise<{ cases: number }> {
  // ---- mobile viewport (390x844): 7 cases ----
  await ft.setViewportSize(390, 844);
  await confirmViewport(ft, 390, true);
  await openM2Touch(ft);

  // Case 1: input-email exposes inputmode="email"
  const emailSel = 'input[type="email"]';
  await ft.expectWeb(ft.locator(emailSel).first()).toBeVisible({ timeoutMs: 10_000 });
  const emailInputmode = await ft.locator(emailSel).first().attr('inputmode');
  if (emailInputmode !== 'email') throw new Error(`email input inputmode="${emailInputmode}", expected "email"`);

  // Case 2: input-number exposes inputmode="decimal"
  const numberSel = 'input[type="number"]';
  await ft.expectWeb(ft.locator(numberSel).first()).toBeVisible({ timeoutMs: 10_000 });
  const numberInputmode = await ft.locator(numberSel).first().attr('inputmode');
  if (numberInputmode !== 'decimal') throw new Error(`number input inputmode="${numberInputmode}", expected "decimal"`);

  // Case 3: input font-size >= 16px on mobile (prevents iOS focus zoom)
  const textSel = 'input[type="text"]';
  await ft.expectWeb(ft.locator(textSel).first()).toBeVisible({ timeoutMs: 10_000 });
  const fontSize = await readFontSize(ft, textSel);
  if (!(fontSize >= 16)) throw new Error(`text input font-size ${fontSize}px, expected >= 16px`);

  // Case 4: checkbox hit area >= 44px on mobile (min-h-11)
  const checkboxSel = '[data-slot="checkbox-wrapper"]';
  await ft.expectWeb(ft.locator(checkboxSel).first()).toBeVisible({ timeoutMs: 10_000 });
  await expectAttrContains(ft, checkboxSel, 'class', 'min-h-11');
  await expectAttrContains(ft, checkboxSel, 'class', 'nop-haptic');
  const checkboxHeight = await readHeightPx(ft, checkboxSel);
  if (!(checkboxHeight >= 44)) throw new Error(`checkbox wrapper height ${checkboxHeight}px, expected >= 44px`);

  // Case 5: default-size button min-height >= 44px on mobile
  const btnSel = '[data-testid="m2-btn-default"]';
  await ft.expectWeb(ft.locator(btnSel)).toBeVisible({ timeoutMs: 10_000 });
  await expectAttrContains(ft, btnSel, 'class', 'min-h-11');
  const btnHeight = await readHeightPx(ft, btnSel);
  if (!(btnHeight >= 44)) throw new Error(`default button height ${btnHeight}px, expected >= 44px`);

  // Case 6: checkbox-group stacks vertically (flex-col + mobile-stack marker) on mobile
  const groupSel = '[data-slot="checkbox-group-wrapper"]';
  await ft.expectWeb(ft.locator(groupSel).first()).toBeVisible({ timeoutMs: 10_000 });
  const stack = await ft.locator(groupSel).first().attr('data-mobile-stack');
  if (stack !== 'true') throw new Error(`checkbox-group data-mobile-stack="${stack}", expected "true"`);
  await expectAttrContains(ft, groupSel, 'class', 'flex-col');

  // Case 7: schema block still applies w-full on mobile
  const blockSel = '[data-testid="m2-btn-block"]';
  await ft.expectWeb(ft.locator(blockSel)).toBeVisible({ timeoutMs: 10_000 });
  await expectAttrContains(ft, blockSel, 'class', 'w-full');

  await expectNoPageErrors(ft, 'm2-touch:mobile');

  // ---- desktop viewport (1280x800): 2 negative cases ----
  // The responsive classes/attrs are render outputs — remount after resizing.
  await ft.setViewportSize(1280, 800);
  await confirmViewport(ft, 1280, false);
  await openM2Touch(ft);

  // Case 8: default-size button does NOT get min-h-11 on desktop
  await ft.expectWeb(ft.locator(btnSel)).toBeVisible({ timeoutMs: 10_000 });
  await pollUntilDesktop(
    ft,
    async () => {
      const value = (await ft.locator(btnSel).attr('class')) ?? '';
      return !value.includes('min-h-11');
    },
    'm2-btn-default without min-h-11',
  );
  await expectAttrNotContains(ft, btnSel, 'class', 'min-h-11');

  // Case 9: checkbox-group does NOT apply mobile-stack on desktop
  await ft.expectWeb(ft.locator(groupSel).first()).toBeVisible({ timeoutMs: 10_000 });
  await pollUntilDesktop(
    ft,
    async () => (await ft.locator(groupSel).first().attr('data-mobile-stack')) === null,
    'checkbox-group without data-mobile-stack',
  );

  await expectNoPageErrors(ft, 'm2-touch:desktop');

  return { cases: 9 };
}
