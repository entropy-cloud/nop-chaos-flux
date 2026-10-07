// plan 543 Phase 1: programmatic interaction-state audit inventory generator.
// Imports the LIVE route models (the same sources the R2 visual-quality
// generator uses), assigns IS-track batch ownership and interaction profiles,
// and writes docs/audits/interaction-state/inventory/pages.json plus the
// merged coverage ledger (docs/audits/interaction-state/ledger.md).
//
// Regeneration command: `pnpm interaction:inventory`.
// Hand-maintained id lists are forbidden — the only declared data here are the
// batch mapping RULES (adjudicated in plan 543 Current Baseline), the
// WorkbenchShell host package→pages map (live-scan-guarded below), and the
// three structural index routes (route kinds from route-model parseRoute).
// Counts are asserted from live array lengths, never hardcoded expectations.
//
// Ledger merge semantics: page rows keep their existing status/note (new ids
// start `pending`, vanished ids flip `orphan`); the findings section is
// hand-maintained by batch plan lifecycles and is only seeded when absent.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALL_SHARED_RENDERER_ROUTES,
  DOMAIN_RENDERER_ROUTES,
  buildRoute,
} from '../../apps/playground/src/route-model.js';
import { COMPLEX_PAGE_ENTRIES } from '../../apps/playground/src/complex-pages/complex-pages-model.js';
import {
  parseLedger,
  serializePagesSection,
  serializeFindingsSection,
  ledgerCell,
  PAGE_STATUSES,
  FINDING_STATUSES,
  FINDING_CATEGORIES,
  FINDING_PRIORITIES,
} from './interaction-ledger-lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');
const AUDIT_DIR = join(REPO_ROOT, 'docs', 'audits', 'interaction-state');
const LEDGER_PATH = join(AUDIT_DIR, 'ledger.md');
const INVENTORY_PATH = join(AUDIT_DIR, 'inventory', 'pages.json');

// --- Batch mapping rules (plan 543 Current Baseline adjudication) ---

const IS1_DOMAIN_IDS = new Set(['flow-designer', 'dingtalk-flow-demo']);
const IS2_DOMAIN_IDS = new Set(['gantt', 'gantt-states', 'gantt-perf-scale']);
const IS3_DOMAIN_IDS = new Set(['scheduling-calendar', 'calendar-perf-scale']);
const IS4_DOMAIN_IDS = new Set([
  'taskflow-designer',
  'report-designer',
  'report-designer-host',
  'page-designer',
  'print-designer',
  'spreadsheet',
  'word-editor',
  'scada-editor-demo',
  'debugger-lab',
]);
const IS5_DOMAIN_IDS = new Set([
  'dashboard-demo',
  'pivot-table-demo',
  'map-demo',
  'graph-demo',
  'three-canvas-demo',
  'three-industrial-demo',
  'scada-demo',
  'scada-pressure-demo',
  'scada-edge-cases',
  'scada-perf-scale',
  'performance-table',
  'table-popover',
  'table-column-width',
  'data-verify',
  'leafer-examples',
]);

// Calendar replica complex pages (roadmap premise "cal-replica" → live ids).
const IS3_COMPLEX_IDS = new Set(['cal-booking', 'cal-confirm', 'cal-success']);

const LAB_BATCH_BY_PACKAGE = (sourcePackage: string): string => {
  const pkg = sourcePackage.replace('@nop-chaos/', '');
  if (['flux-renderers-basic', 'flux-renderers-form', 'flux-renderers-form-advanced', 'flux-renderers-data'].includes(pkg)) {
    return 'IS-8a';
  }
  if (['flux-renderers-content', 'flux-renderers-layout', 'flux-renderers-mobile', 'flux-renderers-ai'].includes(pkg)) {
    return 'IS-8b';
  }
  return 'IS-8c';
};

// Everything else (remaining domains + the three index routes) → IS-6.
const FALLBACK_BATCH = 'IS-6';

// --- Interaction profile rules (which prompt §6 sequence families to run) ---

type Profile = 'canvas' | 'scroll' | 'drag' | 'selection' | 'dialog' | 'feedback' | 'shell-host' | 'dynamic';

const BASE_PROFILE_BY_BATCH: Record<string, Profile[]> = {
  'IS-1': ['canvas', 'drag', 'selection', 'dialog', 'feedback'],
  'IS-2': ['scroll', 'drag', 'feedback', 'dialog'],
  'IS-3': ['scroll', 'drag', 'selection', 'feedback', 'dialog'],
  'IS-4': ['canvas', 'drag', 'selection', 'dialog', 'feedback'],
  'IS-5': ['scroll', 'feedback', 'dialog', 'selection'],
};

// WorkbenchShell side-panel hosts get an extra shell-host profile (F-class
// props reconciliation per prompt §6). Derived from the live consumer scan
// (grep WorkbenchShell packages/*/src) at plan 543 draft review time; the
// live-scan guard below fails when a consumer package is missing from the map.
const SHELL_HOST_PACKAGE_TO_PAGES: Record<string, string[]> = {
  'flow-designer-renderers': ['flow-designer', 'dingtalk-flow-demo'],
  'spreadsheet-renderers': ['spreadsheet'],
  'report-designer-renderers': ['report-designer', 'report-designer-host'],
  'word-editor-renderers': ['word-editor'],
  'flux-renderers-industrial': ['scada-editor-demo'],
  'flux-renderers-dashboard': ['dashboard-demo'],
};
const SHELL_HOST_PAGE_IDS = new Set(Object.values(SHELL_HOST_PACKAGE_TO_PAGES).flat());

function buildProfile(batch: string, pageId: string): Profile[] {
  const base = BASE_PROFILE_BY_BATCH[batch] ?? ['dynamic'];
  if (SHELL_HOST_PAGE_IDS.has(pageId)) {
    return [...base, 'shell-host'];
  }
  return base;
}

// --- Enumeration ---

interface PageEntry {
  id: string;
  hash: string;
  family: 'index' | 'domain' | 'complex' | 'lab';
  title: string;
  batch: string;
  profile: Profile[];
}

function domainBatch(id: string): string {
  if (IS1_DOMAIN_IDS.has(id)) return 'IS-1';
  if (IS2_DOMAIN_IDS.has(id)) return 'IS-2';
  if (IS3_DOMAIN_IDS.has(id)) return 'IS-3';
  if (IS4_DOMAIN_IDS.has(id)) return 'IS-4';
  if (IS5_DOMAIN_IDS.has(id)) return 'IS-5';
  return FALLBACK_BATCH;
}

function buildPages(): PageEntry[] {
  const pages: PageEntry[] = [];

  // Index routes — the three structural route kinds from route-model
  // parseRoute (same declared literals as the R2-0 generator).
  pages.push({ id: 'home', hash: '#/', family: 'index', title: 'Home', batch: FALLBACK_BATCH, profile: ['dynamic'] });
  pages.push({ id: 'lab-index', hash: '#/lab', family: 'index', title: 'Component Lab Index', batch: FALLBACK_BATCH, profile: ['dynamic'] });
  pages.push({ id: 'complex-pages-index', hash: '#/complex-pages', family: 'index', title: 'Complex Pages Showcase Index', batch: FALLBACK_BATCH, profile: ['dynamic'] });

  for (const domain of DOMAIN_RENDERER_ROUTES) {
    const batch = domainBatch(domain.id);
    pages.push({
      id: domain.id,
      hash: buildRoute({ kind: 'domain', domainId: domain.id }),
      family: 'domain',
      title: domain.title,
      batch,
      profile: buildProfile(batch, domain.id),
    });
  }

  // Complex pages: cal-replica trio → IS-3 (plan 543 adjudication); the rest
  // split in model order, first half → IS-7a, second half → IS-7b.
  const splitQueue = COMPLEX_PAGE_ENTRIES.filter((e) => !IS3_COMPLEX_IDS.has(e.id));
  const half = Math.ceil(splitQueue.length / 2);
  for (const entry of COMPLEX_PAGE_ENTRIES) {
    let batch: string;
    if (IS3_COMPLEX_IDS.has(entry.id)) {
      batch = 'IS-3';
    } else {
      const idx = splitQueue.indexOf(entry);
      batch = idx < half ? 'IS-7a' : 'IS-7b';
    }
    pages.push({
      id: entry.id,
      hash: buildRoute({ kind: 'showcase-page', pageId: entry.id }),
      family: 'complex',
      title: entry.title,
      batch,
      profile: buildProfile(batch, entry.id),
    });
  }

  for (const route of ALL_SHARED_RENDERER_ROUTES) {
    const batch = LAB_BATCH_BY_PACKAGE(route.sourcePackage);
    pages.push({
      id: `lab-${route.id}`,
      hash: buildRoute({ kind: 'lab-renderer', rendererId: route.id }),
      family: 'lab',
      title: route.title,
      batch,
      profile: buildProfile(batch, `lab-${route.id}`),
    });
  }

  return pages;
}

// --- WorkbenchShell live-scan guard ---

function scanWorkbenchShellConsumerPackages(): string[] {
  const consumers = new Set<string>();
  const packagesDir = join(REPO_ROOT, 'packages');
  for (const pkg of readdirSync(packagesDir)) {
    if (pkg === 'flux-react') continue; // contract owner, not a consumer
    const srcDir = join(packagesDir, pkg, 'src');
    if (!existsSync(srcDir)) continue;
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (/\.(tsx?|mjs|jsx)$/.test(name) && !/\.test\./.test(name)) {
          const content = readFileSync(full, 'utf8');
          if (content.includes('WorkbenchShell')) {
            consumers.add(pkg);
          }
        }
      }
    };
    walk(srcDir);
  }
  return [...consumers].sort();
}

// --- Seed findings (roadmap §Current Baseline seeds 1–6; seed 7 closed by
// plan 538 / IS-1b). Only written when the findings section is absent. ---

const SEED_FINDINGS: string[][] = [
  ['IS-flow-designer-001', 'flow-designer', 'B', 'P1', 'pending', '-', 'seed1 plus-button geometry anchoring (dingflow+action tabs); pre-registered from roadmap Current Baseline, red e2e evidence due at IS-1 start'],
  ['IS-flow-designer-002', 'flow-designer', 'A', 'P1', 'pending', '-', 'seed2 viewport recenters-to-left after node insertion; pre-registered from roadmap Current Baseline, red e2e evidence due at IS-1 start'],
  ['IS-flow-designer-003', 'flow-designer', 'D', 'P1', 'pending', '-', 'seed3 node/edge summary card boundary illegibility; pre-registered from roadmap Current Baseline, red e2e evidence due at IS-1 start'],
  ['IS-gantt-001', 'gantt', 'A', 'P1', 'pending', '-', 'seed6 horizontal scroll resets to 0 after bar drag commit; pre-registered from roadmap Current Baseline, red e2e evidence due at IS-2 start'],
  ['IS-scheduling-calendar-001', 'scheduling-calendar', 'C', 'P1', 'pending', '-', 'seed4 drag-move fake feedback (toast without data write-back); pre-registered from roadmap Current Baseline, red e2e evidence due at IS-3 start'],
  ['IS-scheduling-calendar-002', 'scheduling-calendar', 'E', 'P2', 'pending', '-', 'seed5 long-press drag-create undiscoverable (marquee capability adjudication pending); pre-registered from roadmap Current Baseline, evidence due at IS-3 start'],
];

// --- Ledger merge ---

function buildLedgerMarkdown(inventory: PageEntry[], existingLedgerText: string | null): string {
  const existing = existingLedgerText ? parseLedger(existingLedgerText) : { pages: new Map(), findings: new Map() };

  const pageRows = new Map<string, string[]>();
  for (const page of inventory) {
    const prev = existing.pages.get(page.id);
    const status = prev && PAGE_STATUSES.includes(prev[3]) ? prev[3] : 'pending';
    const note = prev?.[5] ?? '';
    pageRows.set(page.id, [
      ledgerCell(page.id),
      ledgerCell(page.family),
      ledgerCell(page.batch),
      ledgerCell(status),
      ledgerCell(page.profile.join('+')),
      ledgerCell(note),
    ]);
  }
  for (const [id, cells] of existing.pages) {
    if (!pageRows.has(id)) {
      pageRows.set(id, [ledgerCell(id), ledgerCell(cells[1]), ledgerCell(cells[2]), 'orphan', ledgerCell(cells[4]), ledgerCell(cells[5] ?? '')]);
    }
  }

  const findingsRows = existing.findings.size > 0 ? existing.findings : new Map(SEED_FINDINGS.map((cells) => [cells[0], cells]));

  const header = [
    '# 交互状态质量轨道覆盖台账（Interaction-State Coverage Ledger）',
    '',
    `> Generated by \`pnpm interaction:inventory\` (plan 543). Do NOT hand-edit page rows — status`,
    `> flips are written by batch plan lifecycles; regeneration keeps existing statuses,`,
    `> marks vanished inventory entries \`orphan\`, and never rewrites the findings section.`,
    '> Page state machine: pending → audited（批次序列审查完成）；orphan = 清单中已消失。',
    '> Finding state machine: pending → found（证据/红 e2e 已立案）→ fixed（修复落地）→ verified（复检通过）。',
    '> Finding ID convention: `IS-<page>-<seq>`；P2/P3 登记不修时 disposition 填裁决去向三态之一。',
    '> 对账命令：`pnpm interaction:reconcile`（`--strict` 供 IS-9 门禁）。',
    '',
  ].join('\n');

  return `${header}${serializePagesSection(pageRows)}\n${serializeFindingsSection(findingsRows)}`;
}

// --- Tests (= the regeneration command) ---

describe('interaction-state inventory generator (plan 543)', () => {
  const pages = buildPages();

  it('enumerates exactly the live route space with no hand-copied ids', () => {
    expect(pages.filter((p) => p.family === 'domain')).toHaveLength(DOMAIN_RENDERER_ROUTES.length);
    expect(pages.filter((p) => p.family === 'complex')).toHaveLength(COMPLEX_PAGE_ENTRIES.length);
    expect(pages.filter((p) => p.family === 'lab')).toHaveLength(ALL_SHARED_RENDERER_ROUTES.length);
    expect(pages.filter((p) => p.family === 'index')).toHaveLength(3);
    expect(pages).toHaveLength(
      DOMAIN_RENDERER_ROUTES.length + COMPLEX_PAGE_ENTRIES.length + ALL_SHARED_RENDERER_ROUTES.length + 3,
    );
    const ids = new Set(pages.map((p) => p.id));
    expect(ids.size).toBe(pages.length);
  });

  it('assigns every page a known IS batch and a non-empty profile', () => {
    const batches = new Set(['IS-1', 'IS-2', 'IS-3', 'IS-4', 'IS-5', 'IS-6', 'IS-7a', 'IS-7b', 'IS-8a', 'IS-8b', 'IS-8c']);
    for (const page of pages) {
      expect(batches.has(page.batch), `${page.id} batch ${page.batch}`).toBe(true);
      expect(page.profile.length, `${page.id} profile`).toBeGreaterThan(0);
    }
  });

  it('maps anchor pages to their adjudicated batches', () => {
    const byId = new Map(pages.map((p) => [p.id, p]));
    expect(byId.get('flow-designer')?.batch).toBe('IS-1');
    expect(byId.get('dingtalk-flow-demo')?.batch).toBe('IS-1');
    expect(byId.get('gantt')?.batch).toBe('IS-2');
    expect(byId.get('gantt-perf-scale')?.batch).toBe('IS-2');
    expect(byId.get('scheduling-calendar')?.batch).toBe('IS-3');
    expect(byId.get('cal-booking')?.batch).toBe('IS-3');
    expect(byId.get('cal-confirm')?.batch).toBe('IS-3');
    expect(byId.get('cal-success')?.batch).toBe('IS-3');
    expect(byId.get('taskflow-designer')?.batch).toBe('IS-4');
    expect(byId.get('report-designer')?.batch).toBe('IS-4');
    expect(byId.get('spreadsheet')?.batch).toBe('IS-4');
    expect(byId.get('dashboard-demo')?.batch).toBe('IS-5');
    expect(byId.get('gantt')?.profile).toEqual(['scroll', 'drag', 'feedback', 'dialog']);
    expect(byId.get('flow-designer')?.profile).toEqual(['canvas', 'drag', 'selection', 'dialog', 'feedback', 'shell-host']);
    expect(byId.get('dashboard-demo')?.profile).toEqual(['scroll', 'feedback', 'dialog', 'selection', 'shell-host']);
    const labForm = byId.get('lab-input-text');
    expect(labForm?.batch).toBe('IS-8a');
    const labGantt = byId.get('lab-gantt');
    expect(labGantt?.batch).toBe('IS-8c');
  });

  it('keeps the WorkbenchShell host map in sync with the live consumer scan', () => {
    const liveConsumers = scanWorkbenchShellConsumerPackages();
    const mapped = Object.keys(SHELL_HOST_PACKAGE_TO_PAGES).sort();
    expect(liveConsumers, 'WorkbenchShell consumer packages drifted from the plan 543 host map').toEqual(mapped);
    for (const pageId of SHELL_HOST_PAGE_IDS) {
      expect(pages.some((p) => p.id === pageId), `shell host page ${pageId} exists in inventory`).toBe(true);
    }
  });

  it('merges ledger statuses idempotently (new pending, vanished orphan, findings untouched)', () => {
    const first = buildLedgerMarkdown(pages, null);
    const second = buildLedgerMarkdown(pages, first);
    expect(second).toBe(first);

    const parsed = parseLedger(first);
    expect(parsed.pages.size).toBe(pages.length);
    for (const cells of parsed.pages.values()) {
      expect(cells[3]).toBe('pending');
    }
    expect(parsed.findings.size).toBe(SEED_FINDINGS.length);
    for (const cells of parsed.findings.values()) {
      expect(FINDING_STATUSES).toContain(cells[4]);
      expect(FINDING_CATEGORIES).toContain(cells[2]);
      expect(FINDING_PRIORITIES).toContain(cells[3]);
    }

    // A page vanishing from inventory flips its row orphan on regeneration.
    const removed = { ...pages[10], id: 'vanishing-probe-page' };
    const withExtra = [...pages, removed];
    const withExtraLedger = buildLedgerMarkdown(withExtra, null);
    const afterVanish = buildLedgerMarkdown(pages, withExtraLedger);
    const orphanRow = parseLedger(afterVanish).pages.get('vanishing-probe-page');
    expect(orphanRow?.[3]).toBe('orphan');
  });

  it('writes inventory/pages.json and the merged ledger.md', () => {
    mkdirSync(join(AUDIT_DIR, 'inventory'), { recursive: true });
    const payload = {
      generatedBy: 'pnpm interaction:inventory (plan 543)',
      sources: [
        'apps/playground/src/route-model.ts',
        'apps/playground/src/complex-pages/complex-pages-model.ts',
      ],
      pages: pages.map((p) => ({ ...p, profile: p.profile.join('+') })),
    };
    writeFileSync(INVENTORY_PATH, `${JSON.stringify(payload, null, 2)}\n`);

    const existingLedger = existsSync(LEDGER_PATH) ? readFileSync(LEDGER_PATH, 'utf8') : null;
    writeFileSync(LEDGER_PATH, buildLedgerMarkdown(pages, existingLedger));

    const written = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    expect(relative(REPO_ROOT, INVENTORY_PATH)).toBe('docs/audits/interaction-state/inventory/pages.json');
    expect(written.pages).toHaveLength(pages.length);
    expect(existsSync(LEDGER_PATH)).toBe(true);
  });
});
