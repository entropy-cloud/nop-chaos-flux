import { expect, type Page } from '@playwright/test';

/**
 * data-mode theme switching for the playground (plan 501 Phase 1, promoted
 * from the R2-2a/R2-2b probe libs' `setTheme`; R2-2a-B5-34 口径).
 *
 * B5-34: `emulateMedia({ colorScheme: 'dark' })` is a NO-OP for the playground
 * — true dark is the `data-mode` attribute on `document.documentElement`
 * (drives the CSS variable block). emulateMedia remains valid for standalone
 * ui-package pages, but lab/replica routes must go through here.
 *
 * Settle strategy: attribute write → attribute-verified wait → 3 animation
 * frames, so callers never rely on a wall-clock sleep for CSS variable
 * propagation.
 */

export type ThemeMode = 'light' | 'dark';

export async function setTheme(page: Page, mode: ThemeMode): Promise<void> {
  await page.evaluate((m) => {
    document.documentElement.setAttribute('data-mode', m);
  }, mode);
  await page.waitForFunction(
    (m) => document.documentElement.getAttribute('data-mode') === m,
    mode,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 0;
        const tick = () => {
          frames += 1;
          if (frames >= 3) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

export function getDataMode(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute('data-mode'));
}

export async function expectTheme(page: Page, mode: ThemeMode): Promise<void> {
  const actual = await getDataMode(page);
  expect(actual, `documentElement data-mode should be "${mode}" (B5-34: attribute, not emulateMedia)`).toBe(mode);
}
