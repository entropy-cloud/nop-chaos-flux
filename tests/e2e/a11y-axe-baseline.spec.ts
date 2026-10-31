import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { REPLICATION_MOBILE_CONTEXT } from './helpers/replication.js';

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
  // Plan 798 Phase 1 (D1 §4): the two stale ids below used to scan the home
  // page (their routes no longer exist). Migrated to the real hash segments;
  // the JSON keys move with them and their counts were re-measured on the
  // target pages (old home-page counts are not transferable).
  'gantt',
  'complex-pages/standard-crud',
  // Plan 799 (D1 §4 branch A): W2 wave-picking joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/wms-wave-picking',
  // Plan 800 (D1 §4 branch A): W3 stock-ledger joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/wms-stock-ledger',
  // Plan 801 (D1 §4 branch A): C1 opportunity-kanban joins the standard
  // desktop scan set (non-mobile page — pure JSON SchemaPage, no host
  // override).
  'complex-pages/crm-opportunity-kanban',
  // Plan 802 (D1 §4 branch A): C2 customer-360 joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/crm-customer-360',
  // Plan 803 (D1 §4 branch A): C3 sales-dashboard joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/crm-sales-dashboard',
  // Plan 804 (D1 §4 branch A): I1 asset-inventory joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/itam-asset-inventory',
  // Plan 805 (D1 §4 branch A): I2 depreciation-dashboard joins the standard
  // desktop scan set (non-mobile page — pure JSON SchemaPage, no host
  // override).
  'complex-pages/itam-depreciation-dashboard',
  // Plan 806 (D1 §4 branch A): K1 knowledge-chat joins the standard desktop
  // scan set (non-mobile page — host override host, but a plain desktop page
  // in the shared shell, no mobile canvas).
  'complex-pages/ai-knowledge-chat',
  // Plan 807 (D1 §4 branch A): K2 ticket-console joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/ai-ticket-console',
  // Plan 808 (D1 §4 branch A): K3 approval-trail joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/ai-approval-trail',
  // Plan 809 (D1 §4 branch A): M1 shopfloor-board joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override; the
  // scada canvas is a panel-inside-desktop page, not a mobile canvas).
  'complex-pages/mes-shopfloor-board',
  // Plan 810 (D1 §4 branch A): M2 work-reporting joins the standard desktop
  // scan set (non-mobile page — pure JSON SchemaPage, no host override).
  'complex-pages/mes-work-reporting',
  'dashboard-demo',
];

// Plan 798 Phase 2 (D1 §4 branch B): mobile-form replication pages are ALSO
// scanned under the 375×667 hasTouch context while the registry host renders
// the mobile canvas (the canvas DOM is the scan object). Per the D6 unified
// registration, branch A and B share ONE baseline key per pageId — both scans
// must stay within the registered counts.
const MOBILE_ROUTES = ['complex-pages/wms-pda-receiving'];

// map-demo is excluded: its axe analysis exceeds a practical timeout (heavy SVG DOM,
// >120 s single-worker in the plan 781 count run). Extending the set is a baseline
// addition, not a gate change.
type Baseline = Record<string, Record<string, number>>;

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
}

async function scanRoute(page: import('@playwright/test').Page, route: string): Promise<void> {
  await page.goto(`#/${route}`);
  // Readiness: schema pages expose the page shell; the fullscreen gantt demo
  // (route `gantt`, plan 798 id migration) renders neither `main` nor
  // `page-root` — fall back to its layout slot.
  await page
    .locator('[data-slot="page-root"], main, [data-slot="gantt-layout"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
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
}

for (const route of ROUTES) {
  test(`axe scan (${route}): no new WCAG 2.1 A/AA violations beyond the baseline`, async ({
    page,
  }) => {
    await scanRoute(page, route);
  });
}

test.describe('axe branch B (mobile canvas, 375×667 hasTouch)', () => {
  test.use(REPLICATION_MOBILE_CONTEXT);

  for (const route of MOBILE_ROUTES) {
    test(`axe scan mobile (${route}): no new WCAG 2.1 A/AA violations beyond the baseline`, async ({
      page,
    }) => {
      await scanRoute(page, route);
    });
  }
});
