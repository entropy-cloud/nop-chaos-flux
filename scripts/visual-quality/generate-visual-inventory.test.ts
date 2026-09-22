// plan 491 Phase 1: programmatic R2 walkthrough inventory generator.
// Imports the LIVE route model + complex-pages registry + every package's
// renderer definition arrays (the same live sources route-matrix.test.ts
// asserts against), assigns R2-1/R2-2 batch ownership, and writes
// docs/audits/visual-quality-r2/inventory/{pages,controls}.json plus the
// merged coverage ledger (docs/audits/visual-quality-r2/ledger.md).
//
// Regeneration command: `pnpm visual:inventory`.
// Hand-maintained id lists are forbidden by the R2 roadmap — the only
// declared data here are batch mapping RULES (domain/package sets) and the
// complexity attribute table, both adjudicated in plan 491 Phase 4.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

import {
  ALL_SHARED_RENDERER_ROUTES,
  DOMAIN_RENDERER_ROUTES,
  buildRoute,
} from '../../apps/playground/src/route-model.js';
import { COMPLEX_PAGE_ENTRIES as COMPLEX_PAGES } from '../../apps/playground/src/complex-pages/complex-pages-model.js';
import { parseLedger, serializeLedgerSection, LEDGER_STATUSES } from './ledger-lib.mjs';

import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '@nop-chaos/flux-renderers-form-advanced';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { layoutRendererDefinitions } from '@nop-chaos/flux-renderers-layout';
import { contentRendererDefinitions } from '@nop-chaos/flux-renderers-content';
import { mobileRendererDefinitions } from '@nop-chaos/flux-renderers-mobile';
import { aiRendererDefinitions } from '@nop-chaos/flux-renderers-ai';
import { schedulingRendererDefinitions } from '../../packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.js';
import { industrialRendererDefinitions } from '@nop-chaos/flux-renderers-industrial';
import { industrialEditorRendererDefinitions } from '@nop-chaos/flux-renderers-industrial/editor';
import { threeCanvasRendererDefinition } from '@nop-chaos/flux-renderers-3d';
import { wordEditorRendererDefinitions } from '@nop-chaos/word-editor-renderers';
import { spreadsheetRendererDefinitions } from '@nop-chaos/spreadsheet-renderers';
import { flowDesignerRendererDefinitions } from '@nop-chaos/flow-designer-renderers';
import { graphRendererDefinitions } from '@nop-chaos/flux-renderers-graph';
import { mapRendererDefinitions } from '@nop-chaos/flux-renderers-map';
import { pivotRendererDefinitions } from '@nop-chaos/flux-renderers-pivot';
import {
  dashboardRendererDefinition,
  dashboardEditorRendererDefinition,
} from '@nop-chaos/flux-renderers-dashboard';

// --- Batch mapping rules (plan 491 Phase 1 / adjudication record Phase 4) ---

// R2-1b 设计器域: live domain ids carrying a designer/authoring surface.
const DESIGNER_DOMAIN_IDS = new Set([
  'flow-designer',
  'dingtalk-flow-demo',
  'print-designer',
  'report-designer',
  'report-designer-host',
  'spreadsheet',
  'word-editor',
  'taskflow-designer',
  'scada-editor-demo',
  'debugger-lab',
]);

// R2-1c 数据可视化与表格域: dashboards / charts / maps / 3d / scada faces /
// table-CRUD & pagination faces.
const VISUALIZATION_DOMAIN_IDS = new Set([
  'dashboard-demo',
  'pivot-table-demo',
  'map-demo',
  'graph-demo',
  'three-canvas-demo',
  'scada-demo',
  'scada-pressure-demo',
  'scada-edge-cases',
  'scada-perf-scale',
  'performance-table',
  'table-popover',
  'table-column-width',
  'data-verify',
]);

// Everything else (forms, editors, AI, mobile, scheduling demos, w/m-family
// demo faces, index routes, flux-basic) → R2-1d.
const PAGE_BATCH_R1D_FALLBACK = 'R2-1d';

// R2-2 batches by renderer source package family.
const CONTROL_BATCH_BY_FAMILY = (sourcePackage) => {
  const pkg = sourcePackage.replace('@nop-chaos/', '');
  if (['flux-renderers-basic', 'flux-renderers-form', 'flux-renderers-form-advanced'].includes(pkg)) {
    return 'R2-2a';
  }
  if (
    ['flux-renderers-data', 'flux-renderers-content', 'flux-renderers-layout', 'flux-renderers-mobile'].includes(pkg)
  ) {
    return 'R2-2b';
  }
  return 'R2-2c';
};

// Complexity attribute table (plan 491 Phase 4 adjudication): a control with
// ≥3 attributes must walk the FULL state matrix (drag-mid, overlay-open,
// view-switch mid-states); others may use a simplified matrix with a recorded
// reason in the evidence card.
const COMPLEXITY_ATTRIBUTES = {
  // type: [drag-drop, canvas, overlay-editing, view-switching, async-loading, inline-editing]
  table: ['drag-drop', 'inline-editing', 'overlay-editing', 'async-loading', 'view-switching'],
  crud: ['drag-drop', 'inline-editing', 'overlay-editing', 'async-loading', 'view-switching'],
  'input-table': ['inline-editing', 'drag-drop', 'async-loading'],
  kanban: ['drag-drop', 'view-switching', 'async-loading', 'inline-editing'],
  gantt: ['drag-drop', 'canvas', 'view-switching', 'async-loading'],
  calendar: ['view-switching', 'async-loading', 'drag-drop'],
  'condition-builder': ['overlay-editing', 'view-switching', 'inline-editing'],
  'code-editor': ['canvas', 'async-loading', 'view-switching'],
  spreadsheet: ['canvas', 'drag-drop', 'inline-editing', 'view-switching'],
  'word-editor': ['canvas', 'overlay-editing', 'async-loading'],
  'flow-designer': ['canvas', 'drag-drop', 'view-switching'],
  'scada-editor': ['canvas', 'drag-drop', 'overlay-editing'],
  'dashboard-editor': ['canvas', 'drag-drop', 'view-switching'],
  wizard: ['view-switching', 'async-loading', 'overlay-editing'],
  chart: ['async-loading', 'view-switching'],
  echarts: ['async-loading', 'view-switching'],
  'three-canvas': ['canvas', 'async-loading'],
  pivot: ['view-switching', 'async-loading', 'drag-drop'],
  dashboard: ['canvas', 'drag-drop', 'async-loading'],
  graph: ['canvas', 'view-switching', 'async-loading'],
  map: ['canvas', 'async-loading'],
  tree: ['drag-drop', 'async-loading'],
  picker: ['overlay-editing', 'async-loading', 'view-switching'],
  select: ['overlay-editing', 'async-loading'],
  'tree-select': ['overlay-editing', 'async-loading'],
  upload: ['overlay-editing', 'async-loading'],
};

const FULL_MATRIX_THRESHOLD = 3;

function classifyMatrix(type) {
  const attrs = COMPLEXITY_ATTRIBUTES[type];
  if (!attrs) {
    return { matrix: 'simplified', reason: 'no complexity attribute registered (≤2 of 6)' };
  }
  if (attrs.length >= FULL_MATRIX_THRESHOLD) {
    return { matrix: 'full', reason: `${attrs.length} complexity attributes: ${attrs.join('/')}` };
  }
  return { matrix: 'simplified', reason: `${attrs.length} complexity attributes: ${attrs.join('/')}` };
}

// --- Enumeration ---

interface PageEntry {
  id: string;
  hash: string;
  routeKind: string;
  title: string;
  batch: string;
  walkPhase: 'R2-1' | 'R2-2-carrier';
}

interface ControlEntry {
  type: string;
  sourcePackage: string;
  category: string;
  labRoute: string | null;
  fixtureRequired: boolean;
  batch: string;
  matrix: 'full' | 'simplified';
  matrixReason: string;
}

function buildPages() {
  const pages: PageEntry[] = [];

  // Index routes (R2-1d fallback face). These three are structural route
  // kinds from route-model.ts parseRoute — the only literal ids in this file,
  // not a hand-maintained walkthrough list (plan 491 audit Minor).
  pages.push({ id: 'home', hash: '#/', routeKind: 'index', title: 'Home', batch: PAGE_BATCH_R1D_FALLBACK, walkPhase: 'R2-1' });
  pages.push({ id: 'lab-index', hash: '#/lab', routeKind: 'index', title: 'Component Lab Index', batch: PAGE_BATCH_R1D_FALLBACK, walkPhase: 'R2-1' });
  pages.push({ id: 'complex-pages-index', hash: '#/complex-pages', routeKind: 'index', title: 'Complex Pages Showcase Index', batch: PAGE_BATCH_R1D_FALLBACK, walkPhase: 'R2-1' });

  // Showcase pages (complex-pages domain) → R2-1a per roadmap.
  for (const entry of COMPLEX_PAGES) {
    pages.push({
      id: entry.id,
      hash: buildRoute({ kind: 'showcase-page', pageId: entry.id }),
      routeKind: 'showcase-page',
      title: (entry as { title?: string }).title ?? entry.id,
      batch: 'R2-1a',
      walkPhase: 'R2-1',
    });
  }

  // Domain routes → R2-1b / R2-1c / R2-1d by the adjudicated sets.
  for (const domain of DOMAIN_RENDERER_ROUTES) {
    const batch = DESIGNER_DOMAIN_IDS.has(domain.id)
      ? 'R2-1b'
      : VISUALIZATION_DOMAIN_IDS.has(domain.id)
        ? 'R2-1c'
        : PAGE_BATCH_R1D_FALLBACK;
    pages.push({
      id: domain.id,
      hash: buildRoute({ kind: 'domain', domainId: domain.id }),
      routeKind: 'domain',
      title: domain.title,
      batch,
      walkPhase: 'R2-1',
    });
  }

  // Lab routes are control carriers: their walkthrough surface belongs to the
  // R2-2 control batches (no separate R2-1 pass) — recorded here with the
  // owning control batch so the runner can target them.
  for (const route of ALL_SHARED_RENDERER_ROUTES) {
    pages.push({
      id: `lab-${route.id}`,
      hash: buildRoute({ kind: 'lab-renderer', rendererId: route.id }),
      routeKind: 'lab-renderer',
      title: route.title,
      batch: 'R2-2-carrier',
      walkPhase: 'R2-2-carrier',
    });
  }

  return pages;
}

function toDefs(value: unknown | unknown[]): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function buildControls(): ControlEntry[] {
  const definitionGroups: Array<[string, unknown[]]> = [
    ['@nop-chaos/flux-renderers-basic', basicRendererDefinitions],
    ['@nop-chaos/flux-renderers-form', formRendererDefinitions],
    ['@nop-chaos/flux-renderers-form-advanced', formAdvancedRendererDefinitions],
    ['@nop-chaos/flux-renderers-data', dataRendererDefinitions],
    ['@nop-chaos/flux-renderers-layout', layoutRendererDefinitions],
    ['@nop-chaos/flux-renderers-content', contentRendererDefinitions],
    ['@nop-chaos/flux-renderers-mobile', mobileRendererDefinitions],
    ['@nop-chaos/flux-renderers-ai', aiRendererDefinitions],
    ['@nop-chaos/flux-renderers-scheduling', schedulingRendererDefinitions],
    ['@nop-chaos/flux-renderers-industrial', industrialRendererDefinitions],
    ['@nop-chaos/flux-renderers-industrial', industrialEditorRendererDefinitions],
    ['@nop-chaos/flux-renderers-3d', threeCanvasRendererDefinition],
    ['@nop-chaos/word-editor-renderers', wordEditorRendererDefinitions],
    ['@nop-chaos/spreadsheet-renderers', spreadsheetRendererDefinitions],
    ['@nop-chaos/flow-designer-renderers', flowDesignerRendererDefinitions],
    ['@nop-chaos/flux-renderers-graph', graphRendererDefinitions],
    ['@nop-chaos/flux-renderers-map', mapRendererDefinitions],
    ['@nop-chaos/flux-renderers-pivot', pivotRendererDefinitions],
    ['@nop-chaos/flux-renderers-dashboard', [
      dashboardRendererDefinition,
      dashboardEditorRendererDefinition,
    ]],
  ];

  const controls: ControlEntry[] = [];
  const seen = new Set<string>();
  const labRouteIds = new Set(ALL_SHARED_RENDERER_ROUTES.map((r) => r.id));

  for (const [fallbackPackage, defs] of definitionGroups) {
    for (const def of toDefs(defs)) {
      const typed = def as { type?: string; sourcePackage?: string; category?: string };
      const type = typed.type;
      if (!type) {
        throw new Error(`definition without type in ${fallbackPackage}`);
      }
      if (seen.has(type)) {
        continue; // editor/secondary registration of an existing type
      }
      seen.add(type);
      const sourcePackage = typed.sourcePackage ?? fallbackPackage;
      const { matrix, reason } = classifyMatrix(type);
      controls.push({
        type,
        sourcePackage,
        category: typed.category ?? 'unknown',
        labRoute: labRouteIds.has(type) ? `#/lab/${type}` : null,
        fixtureRequired: !labRouteIds.has(type),
        batch: CONTROL_BATCH_BY_FAMILY(sourcePackage),
        matrix,
        matrixReason: reason,
      });
    }
  }
  return controls.sort((a, b) => a.type.localeCompare(b.type));
}

// --- Ledger merge (plan 491 Phase 2 semantics) ---

function mergeLedgerSection<T extends { id: string }>(
  existingRows: Map<string, { status: string; card: string; note: string }>,
  entries: T[],
  kind: string,
) {
  return entries.map((entry) => {
    const prior = existingRows.get(String(entry.id));
    const status = prior && LEDGER_STATUSES.includes(prior.status) ? prior.status : 'pending';
    return {
      id: String(entry.id),
      kind,
      batch: (entry as { batch?: string }).batch ?? (entry as { matrix?: string }).matrix ?? '',
      status,
      card: prior?.card ?? '',
      note: prior?.note ?? '',
    };
  });
}

function buildLedger(pages: PageEntry[], controls: ControlEntry[]) {
  const ledgerPath = 'docs/audits/visual-quality-r2/ledger.md';
  const existing = existsSync(ledgerPath)
    ? parseLedger(readFileSync(ledgerPath, 'utf8'))
    : { pages: new Map(), controls: new Map() };

  // The ledger tracks walkthrough UNITS: R2-1 pages (domain/showcase/index)
  // and controls. Lab routes are control carriers — their state lives on the
  // control row, so they are not separate ledger rows.
  const ledgerPages = pages.filter((p) => p.walkPhase === 'R2-1');
  const pageRows = mergeLedgerSection(existing.pages, ledgerPages, 'page');
  const controlRows = mergeLedgerSection(
    existing.controls,
    controls.map((c) => ({ ...c, id: c.type })),
    'control',
  );

  const orphanPages = [...existing.pages.keys()].filter((id) => !ledgerPages.some((p) => String(p.id) === id));
  const orphanControls = [...existing.controls.keys()].filter(
    (id) => !controls.some((c) => String(c.type) === id),
  );

  const doc = `# 视觉质量二期覆盖台账（R2 Coverage Ledger）

> Generated by \`pnpm visual:inventory\` (plan 491). Do NOT hand-edit rows — status
> flips are written by plan lifecycles; regeneration keeps existing statuses,
> marks vanished inventory entries \`orphan\`.
> State machine: pending → carded（走查卡+截图齐）→ digested（findings 已归族进对应批）→ verified（批内复检通过）。

## Pages（R2-1 走查面：domain / showcase / index）

<!-- ledger:pages -->
${serializeLedgerSection(pageRows)}

## Controls（R2-2 走查面：renderer definitions；lab 路由为其 carrier）

<!-- ledger:controls -->
${serializeLedgerSection(controlRows)}

## Orphans（台账有而 inventory 无；人工裁决：删除行或恢复 inventory 条目）

${orphanPages.length === 0 && orphanControls.length === 0 ? '（none）' : [...orphanPages.map((id) => `page: ${id}`), ...orphanControls.map((id) => `control: ${id}`)].join('\n')}
`;

  writeFileSync(ledgerPath, doc);
  return { pageRows, controlRows, orphanPages, orphanControls };
}

// --- The generator run (executed by the vitest suite below) ---

describe('R2 visual inventory generator (plan 491)', () => {
  const OUT_DIR = 'docs/audits/visual-quality-r2/inventory';
  const pages = buildPages();
  const controls = buildControls();

  it('enumerates the full route model with expected scale', () => {
    // Cross-checks against route-matrix.test.ts liveTotal conventions:
    const labCarriers = pages.filter((p) => p.walkPhase === 'R2-2-carrier');
    expect(ALL_SHARED_RENDERER_ROUTES.length).toBe(124);
    expect(labCarriers.length).toBe(124);
    expect(DOMAIN_RENDERER_ROUTES.length).toBe(78);
    const r1Pages = pages.filter((p) => p.walkPhase === 'R2-1');
    // 78 domain + 40 showcase + 3 index = 121 walked pages
    expect(r1Pages.length).toBe(78 + COMPLEX_PAGES.length + 3);
    expect(r1Pages.length).toBeGreaterThan(100);
  });

  it('assigns every page to exactly one R2-1 batch', () => {
    const batches = new Set(['R2-1a', 'R2-1b', 'R2-1c', 'R2-1d']);
    for (const page of pages.filter((p) => p.walkPhase === 'R2-1')) {
      expect(batches.has(page.batch), `page ${page.id} batch ${page.batch}`).toBe(true);
    }
    // Each adjudicated designer/viz id actually exists live (set drift guard).
    for (const id of DESIGNER_DOMAIN_IDS) {
      expect(
        DOMAIN_RENDERER_ROUTES.some((d) => d.id === id),
        `DESIGNER_DOMAIN_IDS entry '${id}' has no live domain route`,
      ).toBe(true);
    }
    for (const id of VISUALIZATION_DOMAIN_IDS) {
      expect(
        DOMAIN_RENDERER_ROUTES.some((d) => d.id === id),
        `VISUALIZATION_DOMAIN_IDS entry '${id}' has no live domain route`,
      ).toBe(true);
    }
  });

  it('enumerates controls from every live definition source', () => {
    expect(controls.length).toBeGreaterThan(100);
    const families = new Set(controls.map((c) => c.sourcePackage));
    for (const pkg of [
      '@nop-chaos/flux-renderers-basic',
      '@nop-chaos/flux-renderers-form',
      '@nop-chaos/flux-renderers-form-advanced',
      '@nop-chaos/flux-renderers-data',
      '@nop-chaos/flux-renderers-layout',
      '@nop-chaos/flux-renderers-content',
      '@nop-chaos/flux-renderers-mobile',
      '@nop-chaos/flux-renderers-ai',
      '@nop-chaos/flux-renderers-scheduling',
      '@nop-chaos/flux-renderers-industrial',
      '@nop-chaos/flux-renderers-3d',
      '@nop-chaos/word-editor-renderers',
      '@nop-chaos/spreadsheet-renderers',
      '@nop-chaos/flow-designer-renderers',
      '@nop-chaos/flux-renderers-graph',
      '@nop-chaos/flux-renderers-map',
      '@nop-chaos/flux-renderers-pivot',
      '@nop-chaos/flux-renderers-dashboard',
    ]) {
      expect(families.has(pkg), `no controls enumerated from ${pkg}`).toBe(true);
    }
    for (const control of controls) {
      expect(['R2-2a', 'R2-2b', 'R2-2c'].includes(control.batch)).toBe(true);
      expect(['full', 'simplified'].includes(control.matrix)).toBe(true);
    }
  });

  it('writes inventory JSON + merged ledger deterministically', () => {
    mkdirSync(OUT_DIR, { recursive: true });
    const pagesJson = {
      generatedBy: 'pnpm visual:inventory (plan 491)',
      sources: [
        'apps/playground/src/route-model.ts',
        'apps/playground/src/complex-pages/complex-pages-model.js',
        'apps/playground/src/domain-route-entries.js',
      ],
      pages,
    };
    const controlsJson = {
      generatedBy: 'pnpm visual:inventory (plan 491)',
      sources: ['19 live renderer definition arrays across 18 packages (print adjudicated zero-contribution)'],
      complexityRule: '≥3 of {drag-drop, canvas, overlay-editing, view-switching, async-loading, inline-editing} → full matrix',
      controls,
    };
    writeFileSync(`${OUT_DIR}/pages.json`, `${JSON.stringify(pagesJson, null, 2)}\n`);
    writeFileSync(`${OUT_DIR}/controls.json`, `${JSON.stringify(controlsJson, null, 2)}\n`);

    const { pageRows, controlRows } = buildLedger(pages, controls);
    expect(pageRows.length).toBe(121);
    expect(controlRows.length).toBe(controls.length);
    for (const row of [...pageRows, ...controlRows]) {
      expect(row.id, 'ledger row id must be defined').toBeTruthy();
    }
  });
});
