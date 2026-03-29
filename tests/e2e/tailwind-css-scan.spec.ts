import { expect, test } from '@playwright/test';

async function gotoFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await page.waitForTimeout(2000);
}

async function collectGeneratedCSS(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const selectors = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule) {
            selectors.add(rule.selectorText);
          }
        }
      } catch {}
    }
    return Array.from(selectors);
  });
}

async function checkClassHasCSS(
  page: import('@playwright/test').Page,
  className: string,
  property: string
): Promise<{ found: boolean; value: string }> {
  return page.evaluate(([cls, prop]) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    const value = window.getComputedStyle(el)[prop as any];
    document.body.removeChild(el);

    const defaultEl = document.createElement('div');
    defaultEl.style.position = 'fixed';
    defaultEl.style.top = '-9999px';
    document.body.appendChild(defaultEl);
    const defaultValue = window.getComputedStyle(defaultEl)[prop as any];
    document.body.removeChild(defaultEl);

    const trivialDefaults = new Set(['none', 'auto', 'normal', '0s', 'static', 'visible', 'transparent', 'rgba(0, 0, 0, 0)', '']);
    const isTrivial = trivialDefaults.has(value);
    const matchesDefault = value === defaultValue && isTrivial;
    return { found: !matchesDefault, value };
  }, [className, property]);
}

test('verifies basic Tailwind utilities are generated', async ({ page }) => {
  await gotoFlowDesigner(page);

  const checks: Record<string, { found: boolean; value: string }> = {};
  const cases: [string, string][] = [
    ['flex', 'display'],
    ['grid', 'display'],
    ['relative', 'position'],
    ['absolute', 'position'],
    ['rounded-xl', 'borderRadius'],
    ['gap-3', 'gap'],
    ['p-6', 'padding'],
    ['overflow-hidden', 'overflow'],
    ['border', 'borderWidth'],
    ['shadow-sm', 'boxShadow'],
    ['text-sm', 'fontSize'],
    ['font-semibold', 'fontWeight'],
    ['items-center', 'alignItems'],
    ['h-full', 'height'],
    ['w-full', 'width'],
    ['inset-0', 'top'],
    ['min-h-0', 'minHeight'],
    ['text-foreground', 'color'],
    ['border-border', 'borderColor'],
  ];

  for (const [cls, prop] of cases) {
    checks[cls] = await checkClassHasCSS(page, cls, prop);
  }

  console.log('\n=== BASIC UTILITY CHECK ===');
  const missing: string[] = [];
  for (const [cls, result] of Object.entries(checks)) {
    const status = result.found ? 'OK' : 'MISSING';
    console.log(`  [${status}] .${cls} -> value=${result.value}`);
    if (!result.found) missing.push(cls);
  }

  expect(missing, `These basic Tailwind utilities have no CSS: ${missing.join(', ')}`).toHaveLength(0);
});

test('verifies grid-template-rows utilities are generated', async ({ page }) => {
  await gotoFlowDesigner(page);

  const checks: Record<string, { found: boolean; value: string }> = {};
  const cases: [string, string][] = [
    ['grid-rows-1', 'gridTemplateRows'],
    ['grid-rows-[auto_minmax(0,1fr)]', 'gridTemplateRows'],
  ];

  for (const [cls, prop] of cases) {
    checks[cls] = await checkClassHasCSS(page, cls, prop);
  }

  console.log('\n=== GRID-ROWS UTILITY CHECK ===');
  const missing: string[] = [];
  for (const [cls, result] of Object.entries(checks)) {
    const status = result.found ? 'OK' : 'MISSING';
    console.log(`  [${status}] .${cls} -> gridTemplateRows=${result.value}`);
    if (!result.found) missing.push(cls);
  }

  expect(missing, `These grid-rows utilities have no CSS: ${missing.join(', ')}`).toHaveLength(0);
});

test('verifies grid-template-columns utilities are generated', async ({ page }) => {
  await gotoFlowDesigner(page);

  const checks: Record<string, { found: boolean; value: string }> = {};
  const cases: [string, string][] = [
    ['grid-cols-[15rem_minmax(0,1fr)_22rem]', 'gridTemplateColumns'],
    ['grid-cols-1', 'gridTemplateColumns'],
  ];

  for (const [cls, prop] of cases) {
    checks[cls] = await checkClassHasCSS(page, cls, prop);
  }

  console.log('\n=== GRID-COLS UTILITY CHECK ===');
  const missing: string[] = [];
  for (const [cls, result] of Object.entries(checks)) {
    const status = result.found ? 'OK' : 'MISSING';
    console.log(`  [${status}] .${cls} -> gridTemplateColumns=${result.value}`);
    if (!result.found) missing.push(cls);
  }

  expect(missing, `These grid-cols utilities have no CSS: ${missing.join(', ')}`).toHaveLength(0);
});

test('searches stylesheets for specific rules', async ({ page }) => {
  await gotoFlowDesigner(page);

  const selectors = await collectGeneratedCSS(page);

  const searchTerms = [
    'grid-rows-1',
    'grid-cols-',
    'inset-0',
    'h-full',
    'absolute',
    'min-h-0',
    'overflow-hidden',
  ];

  console.log('\n=== STYLESHEET RULE SEARCH ===');
  for (const term of searchTerms) {
    const matching = selectors.filter(s => s.includes(term));
    console.log(`  "${term}": ${matching.length} rules -> ${matching.slice(0, 3).join(', ') || 'NONE'}`);
  }

  const totalRules = selectors.length;
  console.log(`\n  Total CSS selectors found: ${totalRules}`);
  expect(totalRules).toBeGreaterThan(100);
});
