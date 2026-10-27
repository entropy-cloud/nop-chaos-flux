import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Plan 781 (roadmap PH-17): axe scan over a representative route set, gated by a
// per-(route × rule) violation-count ratchet in __fixtures__/axe-baseline.json.
// New violations fail; fewer violations are a tightening hint. Existing
// violations are registered (fixing them belongs to the component owner).

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(here, '__fixtures__', 'axe-baseline.json');

const ROUTES = [
  'flux-basic',
  'component-handles',
  'ai-widgets',
  'w4a-multimedia',
  'gantt-demo',
  'crud-demo',
  'dashboard-demo',
];

// map-demo is excluded: its axe analysis exceeds a practical timeout (heavy SVG DOM,
// >120 s single-worker in the plan 781 count run). Extending the set is a baseline
// addition, not a gate change.
type Baseline = Record<string, Record<string, number>>;

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
}

for (const route of ROUTES) {
  test(`axe scan (${route}): no new WCAG 2.1 A/AA violations beyond the baseline`, async ({ page }) => {
    await page.goto(`#/${route}`);
    await page.locator('[data-slot="page-root"], main').first().waitFor({ state: 'visible', timeout: 15_000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const live: Record<string, number> = {};
    for (const violation of results.violations) {
      live[violation.id] = (live[violation.id] ?? 0) + violation.nodes.length;
    }

    const baseline = loadBaseline();
    const registered = baseline[route] ?? {};
    expect(registered, `route ${route} must be registered in axe-baseline.json`).toBeTruthy();

    const newViolations = Object.entries(live)
      .filter(([rule, count]) => count > (registered[rule] ?? 0))
      .map(([rule, count]) => `${rule}: ${count} (baseline ${registered[rule] ?? 0})`);
    expect(newViolations, `new axe violations on #/${route}:\n${newViolations.join('\n')}`).toEqual([]);

    const shrinks = Object.entries(registered)
      .filter(([rule, count]) => (live[rule] ?? 0) < count)
      .map(([rule]) => `${rule} (${registered[rule]} -> ${live[rule] ?? 0})`);
    if (shrinks.length > 0) {
      console.log(`[axe-baseline] ${route}: baseline can be tightened — ${shrinks.join(', ')}`);
    }
  });
}
