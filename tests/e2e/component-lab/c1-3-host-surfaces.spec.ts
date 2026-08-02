import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C1.3 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-button-act (bug 73 pattern): button click → action writes the scope →
 *    name-bound text echoes the new value; plus countDown starts and survives a
 *    page reload via the host-injected countDownStorage adapter (P0-1 fix proof).
 * 2. host-text-bind: text `name` binding re-renders when the scope variable
 *    changes (no stale value).
 * 3. host-badge-count: badge text updates with the scope counter and the
 *    nop-badge marker is present in a real browser.
 * 4. host-icon-aria: an unknown icon name renders the fallback without crashing
 *    and icons stay decorative (aria-hidden / focusable=false).
 */

test('button-host: action writes scope and name-bound text echoes it (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('text');

  const slug = scenarioSlug('Name binding to scope value (write-through echo)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // page.data seeds the root scope: name-bound text shows the initial value.
  await expect(stage.locator('.nop-text').first()).toHaveText('Initial', { timeout: 5_000 });

  // Button action writes the scope → the bound text must re-render (no stale).
  await stage.getByRole('button', { name: 'Change Name' }).click();
  await expect(stage.locator('.nop-text').first()).toHaveText('Updated', { timeout: 5_000 });
});

test('button-host: countDown disables the button and survives reload via injected adapter', async ({
  page,
}) => {
  // Clear any leftover countdown state from previous runs.
  await page.goto('/#/lab/button', { waitUntil: 'commit' });
  await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('flux-countdown-')) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  });

  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('button');

  const slug = scenarioSlug('Countdown after action success (host-injected persistence)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const sendBtn = stage.getByTestId('lab-countdown-btn');
  await expect(sendBtn).toBeEnabled();

  await sendBtn.click();
  await expect(sendBtn).toBeDisabled({ timeout: 5_000 });
  const countdownAttr = await sendBtn.getAttribute('data-countdown');
  expect(Number(countdownAttr)).toBeGreaterThan(0);

  // Reload: the in-flight countdown must be restored from the injected
  // adapter (real-browser proof of the INV-1-compliant persistence path).
  await page.reload({ waitUntil: 'commit' });
  const labAfter = new ComponentLabHelper(page);
  const stageAfter = labAfter.scenarioStage(slug);
  await expect(stageAfter).toBeVisible({ timeout: 30_000 });
  const sendBtnAfter = stageAfter.getByTestId('lab-countdown-btn');
  await expect(sendBtnAfter).toBeDisabled({ timeout: 10_000 });
  const restored = Number(await sendBtnAfter.getAttribute('data-countdown'));
  expect(restored).toBeGreaterThan(0);
  expect(restored).toBeLessThanOrEqual(10);
});

test('badge-host: count badge updates with scope and carries the nop-badge marker', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('badge');

  const slug = scenarioSlug('Count badge updates with scope');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const badge = stage.locator('.nop-badge');
  await expect(badge).toHaveCount(1, { timeout: 5_000 });
  await expect(badge).toHaveText('0');

  await stage.getByRole('button', { name: 'Add' }).click();
  await expect(badge).toHaveText('1', { timeout: 5_000 });
  await stage.getByRole('button', { name: 'Add' }).click();
  await expect(badge).toHaveText('2', { timeout: 5_000 });
});

test('icon-host: unknown icon falls back without crashing and stays decorative', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('icon');

  const slug = scenarioSlug('Unknown icon name falls back without crashing');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Both icons render as nop-icon SVGs — the unknown name falls back to the
  // Circle icon instead of crashing the render boundary.
  await expect(stage.locator('.nop-icon')).toHaveCount(2, { timeout: 5_000 });

  const iconProps = await stage.locator('.nop-icon').first().evaluate((el) => ({
    ariaHidden: el.getAttribute('aria-hidden'),
    focusable: el.getAttribute('focusable'),
    tag: el.tagName,
  }));
  expect(iconProps.tag).toBe('svg');
  expect(iconProps.ariaHidden).toBe('true');
  expect(iconProps.focusable).toBe('false');

  // The surrounding stage stays healthy.
  await expect(stage.getByText(/Unknown icon name falls back/)).toBeVisible();
});

test('text-host: maxLine actually clamps in a real browser (P1-1 bug 73 fix proof)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('text');

  const slug = scenarioSlug('maxLine clamps in a real browser (CSS variable mechanism)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const clamped = stage.getByTestId('clamped-text');
  await expect(clamped).toBeVisible({ timeout: 5_000 });

  const computed = await clamped.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const varValue = el.style.getPropertyValue('--nop-line-count');
    // Tailwind v4 emits utilities inside @layer blocks and escapes the
    // parentheses in the compiled selector (`.line-clamp-\(--nop-line-count\)`),
    // so walk nested rule lists and match on the prefix.
    function walk(rules: CSSRuleList): CSSStyleRule[] {
      const out: CSSStyleRule[] = [];
      for (const rule of rules as unknown as CSSRule[]) {
        if (rule instanceof CSSStyleRule) {
          out.push(rule);
        } else if ('cssRules' in rule && rule.cssRules) {
          out.push(...walk(rule.cssRules));
        }
      }
      return out;
    }
    const match = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return walk(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter(
        (rule) =>
          rule.selectorText.includes('line-clamp-') &&
          rule.style.getPropertyValue('-webkit-line-clamp') !== '',
      )
      .map((rule) => rule.style.getPropertyValue('-webkit-line-clamp'));
    return {
      varValue,
      webkitLineClamp: style.webkitLineClamp,
      cssVarRuleValue: match[0] ?? null,
    };
  });

  expect(computed.varValue).toBe('5');
  expect(computed.webkitLineClamp).toBe('5');
  expect(computed.cssVarRuleValue).toContain('var(--nop-line-count)');
});
