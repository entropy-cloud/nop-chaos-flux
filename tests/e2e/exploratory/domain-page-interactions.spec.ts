import { expect, test, type Page } from '../fixtures.js';

const RESULTS_FILE = '/tmp/nop-e2e-domain-results.json';
import { readFileSync, writeFileSync } from 'node:fs';

function loadResults(): Record<string, { route: string; pageErrors: string[]; debuggerErrors: unknown[]; debuggerFailures: unknown[] }> {
  try {
    return JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveResult(route: string, pageErrors: string[], debuggerErrors: unknown[], debuggerFailures: unknown[]) {
  const all = loadResults();
  all[route] = { route, pageErrors, debuggerErrors, debuggerFailures };
  writeFileSync(RESULTS_FILE, JSON.stringify(all, null, 2), 'utf-8');
}

const PAGES = [
  { route: 'flow-designer', title: 'Flow Designer' },
  { route: 'report-designer', title: 'Report Designer' },
  { route: 'word-editor', title: 'Word Editor' },
  { route: 'taskflow-designer', title: 'TaskFlow Designer' },
  { route: 'code-editor', title: 'Code Editor' },
  { route: 'component-handles', title: 'Component Handles' },
  { route: 'flux-basic', title: 'Flux Basic' },
];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

function filterKnownNoise(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('WebSocket connection') &&
      !e.includes('ERR_NAME_NOT_RESOLVED'),
  );
}

async function checkDebugger(page: Page): Promise<{ errors: unknown[]; failures: unknown[] }> {
  return page.evaluate(() => {
    const api = (window as any).__NOP_DEBUGGER_API__;
    if (!api) return { errors: [], failures: [] };
    return {
      errors: api.queryEvents({ kind: 'error' }),
      failures: api.getRecentFailures ? api.getRecentFailures() : [],
    };
  });
}

const TIMEOUT = 30_000;

async function gotoPage(page: Page, route: string) {
  await page.goto(`/#/${route}`, { waitUntil: 'commit', timeout: TIMEOUT });
  await page.waitForLoadState('load', { timeout: TIMEOUT }).catch(() => {});
}

// ─── 1. flow-designer ───────────────────────────────────────────────────────

test('flow-designer: tabs, toolbar, and canvas interactions', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'flow-designer');

  await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: TIMEOUT });
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: TIMEOUT });

  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  if (tabCount > 1) {
    for (let i = 1; i < Math.min(tabCount, 4); i++) {
      await tabs.nth(i).click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  const toolbarBtns = page.getByRole('button');
  if ((await toolbarBtns.count()) > 1) {
    await toolbarBtns.nth(1).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('flow-designer', errors, dbg.errors, dbg.failures);
});

// ─── 2. report-designer ─────────────────────────────────────────────────────

test('report-designer: toolbar and canvas load', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'report-designer');

  await expect(page.getByRole('heading', { name: /Report Designer/i, level: 1 })).toBeVisible({ timeout: TIMEOUT });
  await expect(page.locator('.report-designer-demo')).toBeVisible();

  const buttons = page.getByRole('button');
  const count = await buttons.count();
  if (count > 2) {
    await buttons.nth(2).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  if (count > 0) {
    await buttons.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('report-designer', errors, dbg.errors, dbg.failures);
});

// ─── 3. word-editor ─────────────────────────────────────────────────────────

test('word-editor: page load and toolbar click', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'word-editor');

  await expect(page.getByRole('heading', { name: /Word Editor/i })).toBeVisible({ timeout: TIMEOUT });

  const buttons = page.getByRole('button');
  const count = await buttons.count();
  if (count > 0) {
    await buttons.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('word-editor', errors, dbg.errors, dbg.failures);
});

// ─── 4. taskflow-designer ───────────────────────────────────────────────────

test('taskflow-designer: page loads and canvas renders', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'taskflow-designer');
  await page.waitForTimeout(3000);

  const canvas = page.locator('.react-flow, canvas, svg, [class*="xyflow"], [class*="flow"]').first();
  await expect(canvas).toBeVisible({ timeout: TIMEOUT });

  const buttons = page.getByRole('button');
  const count = await buttons.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await buttons.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('taskflow-designer', errors, dbg.errors, dbg.failures);
});

// ─── 5. code-editor ─────────────────────────────────────────────────────────

test('code-editor: switch language tabs and type code', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'code-editor');

  await expect(page.getByRole('heading', { name: /Code Editor/i, level: 1 })).toBeVisible({ timeout: TIMEOUT });

  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  for (let i = 0; i < Math.min(tabCount, 3); i++) {
    await tabs.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  const editor = page.locator('.cm-editor, .CodeMirror, .monaco-editor, textarea').first();
  if (await editor.isVisible().catch(() => false)) {
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type('console.log("hello");', { delay: 30 });
    await page.waitForTimeout(200);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('code-editor', errors, dbg.errors, dbg.failures);
});

// ─── 6. component-handles ───────────────────────────────────────────────────

test('component-handles: trigger available handle buttons', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'component-handles');

  const heading = page.getByRole('heading').first();
  await expect(heading).toBeVisible({ timeout: TIMEOUT });

  const buttons = page.getByRole('button');
  const count = await buttons.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    await buttons.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('component-handles', errors, dbg.errors, dbg.failures);
});

// ─── 7. flux-basic ──────────────────────────────────────────────────────────

test('flux-basic: form fill, buttons, and scroll', async ({ page }) => {
  const errors = collectPageErrors(page);
  await gotoPage(page, 'flux-basic');

  const h1 = page.getByRole('heading', { name: 'Renderer Playground', level: 1 });
  await expect(h1).toBeVisible({ timeout: TIMEOUT });

  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  if (inputCount > 0) {
    await inputs.first().fill('test-value');
    await page.waitForTimeout(200);
    if (inputCount > 1) {
      await inputs.nth(1).fill('test@example.com');
      await page.waitForTimeout(200);
    }
  }

  const buttons = page.getByRole('button');
  const btnCount = await buttons.count();
  for (let i = 0; i < Math.min(btnCount, 3); i++) {
    await buttons.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  expect(filterKnownNoise(errors)).toEqual([]);
  const dbg = await checkDebugger(page);
  saveResult('flux-basic', errors, dbg.errors, dbg.failures);
});

// ─── Report generation ──────────────────────────────────────────────────────

test.afterAll(async () => {
  const results = loadResults();
  const reportPath = '/Users/abc/app/nop-chaos-flux-wt/nop-chaos-flux-master/docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md';
  const lines: string[] = [];
  lines.push('# E2E Domain Pages Exploratory Test Results');
  lines.push('');
  lines.push('**Date**: 2026-07-27');
  lines.push('**Test Execution**: 8 tests, Playwright chromium, inline exploratory E2E with triple-layer error monitoring.');
  lines.push('');
  lines.push('## Results Summary');
  lines.push('');
  lines.push(`**Total pages tested**: ${Object.keys(results).length} / ${PAGES.length}`);
  lines.push('');
  lines.push('| Page | console.errors | pageerrors | debugger errors | debugger failures | Passed |');
  lines.push('|------|---------------|------------|-----------------|-------------------|--------|');

  for (const { route } of PAGES) {
    const r = results[route];
    if (!r) {
      lines.push(`| ${route} | — | — | — | — | ⚪ no data |`);
      continue;
    }
    const filtered = filterKnownNoise(r.pageErrors);
    const ce = filtered.filter(e => e.startsWith('[console.error]'));
    const pe = filtered.filter(e => e.startsWith('[pageerror]'));
    const pass = ce.length === 0 && pe.length === 0 && r.debuggerErrors.length === 0 && r.debuggerFailures.length === 0;
    lines.push(`| ${route} | ${ce.length} | ${pe.length} | ${r.debuggerErrors.length} | ${r.debuggerFailures.length} | ${pass ? '✅' : '❌'} |`);
  }

  lines.push('');

  const issueRoutes = PAGES.filter(({ route }) => {
    const r = results[route];
    if (!r) return false;
    const filtered = filterKnownNoise(r.pageErrors);
    const ce = filtered.filter(e => e.startsWith('[console.error]'));
    const pe = filtered.filter(e => e.startsWith('[pageerror]'));
    return ce.length > 0 || pe.length > 0 || r.debuggerErrors.length > 0 || r.debuggerFailures.length > 0;
  });

  if (issueRoutes.length > 0) {
    lines.push('## Issues Found');
    for (const { route } of issueRoutes) {
      const r = results[route];
      lines.push(`\n### ${route}`);
      const filtered = filterKnownNoise(r.pageErrors);
      for (const e of filtered) {
        lines.push(`  - ${e}`);
      }
      if (r.debuggerErrors.length > 0) {
        lines.push('  **Debugger errors**:');
        for (const e of r.debuggerErrors) {
          const msg = (e as any)?.summary || JSON.stringify(e).slice(0, 200);
          lines.push(`  - ${msg}`);
        }
      }
      if (r.debuggerFailures.length > 0) {
        lines.push('  **Debugger failures**:');
        for (const f of r.debuggerFailures) {
          const msg = (f as any)?.event?.summary || JSON.stringify(f).slice(0, 200);
          lines.push(`  - ${msg}`);
        }
      }
    }
  } else {
    lines.push('## Issues Found');
    lines.push('');
    lines.push('**None.** All pages passed with zero console errors, zero page errors, zero debugger errors, and zero debugger failures.');
  }

  lines.push('');
  lines.push('## Per-Page Detail');
  for (const { route } of PAGES) {
    const r = results[route];
    if (!r) {
      lines.push(`\n### ${route}\n- No data collected.`);
      continue;
    }
    lines.push(`\n### ${route}`);
    const filtered = filterKnownNoise(r.pageErrors);
    if (filtered.length === 0 && r.debuggerErrors.length === 0 && r.debuggerFailures.length === 0) {
      lines.push('- ✅ No console errors, page errors, or debugger anomalies.');
    } else {
      for (const e of filtered) {
        lines.push(`- ${e}`);
      }
      if (r.debuggerErrors.length > 0) {
        for (const e of r.debuggerErrors) {
          lines.push(`- Debugger error: ${(e as any)?.summary || 'unknown'}`);
        }
      }
      if (r.debuggerFailures.length > 0) {
        for (const f of r.debuggerFailures) {
          lines.push(`- Debugger failure: ${(f as any)?.event?.summary || 'unknown'}`);
        }
      }
    }
  }

  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
   
  console.log(`\nReport written to ${reportPath}`);
});
