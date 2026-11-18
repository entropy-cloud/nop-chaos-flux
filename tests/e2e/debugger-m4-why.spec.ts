import { expect, test } from '@playwright/test';

// M4 (plan 2026-11-18-m4): Why attribution, dependency graph, selector suggestion.
// Programmatic assertions only. Uses the flux-basic playground fixtures.

async function openFluxBasicPage(page: import('@playwright/test').Page) {
  await page.goto('/#/flux-basic');
  await page
    .getByRole('heading', { name: 'Renderer Playground', level: 1 })
    .waitFor({ state: 'visible', timeout: 15000 });
}

interface V4Api {
  why?: (cid: number) => Promise<{
    verdict: string;
    confidence: string;
    parts: Array<{ category: string; verdict: string }>;
    evidence: Array<{ type: string; target: string; label: string }>;
    screenshotTag?: string;
  }>;
  queryDependencyImpact?: (path: string) => Promise<{ cids: string[]; paths: string[]; degradedToPathQuery: boolean }>;
  suggestSelector?: (cid: string) => Promise<{ selector: string; tier: string; unique: boolean } | null>;
}

function readUsernameCid(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    Number(
      (document.querySelector('[aria-label="Username"]') as HTMLElement | null)
        ?.closest('[data-cid]')
        ?.getAttribute('data-cid'),
    ),
  );
}

test('M4: why(cid) returns attribution with reachable evidence and screenshot tag', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(800);
  const cid = await readUsernameCid(page);
  expect(cid).toBeGreaterThan(0);

  const report = await page.evaluate(async (cid) => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V4Api }).__NOP_DEBUGGER_API__;
    if (!api?.why) return { wired: false };
    return { wired: true, ...(await api.why(cid)) };
  }, cid);

  expect(report.wired).toBe(true);
  const typed = report as { wired: boolean; verdict: string; parts: Array<{ category: string }>; evidence: Array<{ type: string; target: string }>; screenshotTag?: string };
  expect(typed.verdict).toBeTruthy();
  expect(typed.parts.length).toBeGreaterThan(0);
  expect(typed.screenshotTag?.startsWith('why:')).toBe(true);

  // evidence links must be reachable
  const reachable = await page.evaluate(async ({ cid, evidence }) => {
    const api = (window as unknown as {
      __NOP_DEBUGGER_API__?: V4Api & {
        getSnapshotAt?: (epoch: number) => unknown | null;
        inspectByCid?: (cid: number) => unknown;
      };
    }).__NOP_DEBUGGER_API__;
    const results: boolean[] = [];
    for (const link of evidence) {
      if (link.type === 'epoch') results.push(api?.getSnapshotAt?.(Number(link.target)) !== null);
      else if (link.type === 'cid') results.push(api?.inspectByCid?.(cid) !== undefined);
      else results.push(true);
    }
    return results;
  }, { cid, evidence: typed.evidence });
  expect(reachable.every((entry) => entry === true)).toBe(true);
});

test('M4: suggestSelector returns a selector that resolves in the DOM', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(800);
  const cid = await readUsernameCid(page);
  expect(cid).toBeGreaterThan(0);

  const suggestion = await page.evaluate(async (cid) => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V4Api }).__NOP_DEBUGGER_API__;
    if (!api?.suggestSelector) return { wired: false };
    return { wired: true, ...(await api.suggestSelector(String(cid))) };
  }, cid);

  expect(suggestion.wired).toBe(true);
  const typed = suggestion as { wired: boolean; selector: string; unique: boolean };
  expect(typed.selector).toBeTruthy();
  expect(typed.unique).toBe(true);
  const resolved = await page.evaluate((selector) => document.querySelector(selector) !== null, typed.selector);
  expect(resolved).toBe(true);
});

test('M4: queryDependencyImpact answers without degradation for modest graphs', async ({ page }) => {
  await openFluxBasicPage(page);
  await page.waitForTimeout(800);
  const impact = await page.evaluate(async () => {
    const api = (window as unknown as { __NOP_DEBUGGER_API__?: V4Api }).__NOP_DEBUGGER_API__;
    if (!api?.queryDependencyImpact) return { wired: false };
    return { wired: true, ...(await api.queryDependencyImpact('root')) };
  });
  expect(impact.wired).toBe(true);
  expect((impact as { degradedToPathQuery?: boolean }).degradedToPathQuery).toBe(false);
});
