import { expect, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Programmatic computed-style assertion helpers (plan 470, visual-quality V0).
 *
 * Layer-3 of the visual assertion stack: pass/fail criteria are always
 * computed styles — screenshots stay diagnostic-only under
 * tests/e2e/artifacts/ (AGENTS.md 2026-08-28 snapshot policy). Dark-theme
 * work items use `expectCssVarResolves` (token still defined) and
 * `expectComputedStyleNot` (literal color gone) as their primary probes.
 */

export async function getComputedStyleValue(locator: Locator, propertyName: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
    propertyName,
  );
}

export async function expectComputedStyle(
  locator: Locator,
  propertyName: string,
  expected: string,
): Promise<void> {
  const value = await getComputedStyleValue(locator, propertyName);
  expect(value, `computed ${propertyName} should be "${expected}"`).toBe(expected);
}

/**
 * Asserts a design-token custom property is defined on the page (non-empty
 * declared value on `:root`/host theme block). Returns the declared value for
 * further assertions. Catches "token removed/renamed" regressions after
 * dark-mode or theme-switch refactors.
 */
export async function expectCssVarResolves(page: Page, varName: string): Promise<string> {
  const value = await page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    varName,
  );
  expect(value, `CSS variable ${varName} must be declared by the active theme`).not.toBe('');
  return value;
}

/**
 * Asserts a color-valued computed style differs from `bannedColor` after
 * canonicalizing both through a probe element (hex/named/rgb inputs all land
 * in the browser's canonical color string, so `#ffffff` vs
 * `rgb(255, 255, 255)` comparisons behave). Color properties only.
 */
export async function expectComputedStyleNot(
  locator: Locator,
  propertyName: string,
  bannedColor: string,
): Promise<void> {
  const [actualCanonical, bannedCanonical] = await locator.evaluate(
    (el, { prop, banned }) => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      probe.style.color = banned;
      const bannedCanon = getComputedStyle(probe).color;
      probe.style.color = getComputedStyle(el).getPropertyValue(prop);
      const actualCanon = getComputedStyle(probe).color;
      probe.remove();
      return [actualCanon, bannedCanon];
    },
    { prop: propertyName, banned: bannedColor },
  );
  expect(
    actualCanonical,
    `computed ${propertyName} must not equal banned color ${bannedColor}`,
  ).not.toBe(bannedCanonical);
}

/**
 * Diagnostic-evidence screenshot: writes to tests/e2e/artifacts/<dir>/<name>.png
 * (gitignored, regenerated on every run). Never a pass/fail criterion —
 * callers must still assert programmatically.
 */
export async function captureVisualEvidence(
  page: Page,
  dir: string,
  name: string,
): Promise<string> {
  const path = join('tests', 'e2e', 'artifacts', dir, `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: false });
  return path;
}
