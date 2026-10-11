import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINDING_DISPOSITIONS,
  FINDING_STATUSES,
  MODULE_STATUSES,
  type LedgerModuleRow,
  type ParsedLedger,
  moduleRowCells,
  parseLedger,
  serializeLedger,
} from './workaround-ledger-lib.ts';

// Workaround-audit inventory generator (plan 560 Phase 1; roadmap WA-0).
// Enumerates audit targets from the live filesystem — 41 packages plus 8
// playground scopes — and assigns each to exactly one roadmap batch. Guards:
// every packages/* directory with a src/ must appear in PACKAGE_BATCHES, and
// every non-test .ts/.tsx file under apps/playground/src must fall into
// exactly one playground scope (new unregistered code turns the test red and
// forces an explicit roadmap scope update — silent audit holes are the one
// failure mode this track must never have). Baseline counts are candidate
// clues only (prompt §5 steps 1/2 full expressions); qualitative adjudication
// happens per batch, never from grep.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const PLAYGROUND_SRC = path.join(REPO_ROOT, 'apps', 'playground', 'src');
const AUDIT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'workaround-code-smell');
const INVENTORY_PATH = path.join(AUDIT_DIR, 'inventory', 'modules.json');
const LEDGER_PATH = path.join(AUDIT_DIR, 'ledger.md');

// Roadmap Phase Status mapping (docs/backlog/workaround-code-smell-audit-roadmap.md).
// Plan 560 draft review R1 verified this covers all 41 packages exactly once.
const PACKAGE_BATCHES = {
  'WA-1': ['flux-core', 'flux-formula', 'flux-compiler'],
  'WA-2': ['flux-action-core', 'flux-runtime'],
  'WA-3': ['flux-react', 'ui'],
  'WA-4': ['flux-renderers-basic', 'flux-renderers-form'],
  'WA-5': ['flux-renderers-form-advanced'],
  'WA-6': ['flux-renderers-data'],
  'WA-7': ['flux-renderers-content', 'flux-renderers-layout', 'flux-renderers-mobile'],
  'WA-8': ['flux-renderers-scheduling', 'flux-renderers-dashboard', 'flux-renderers-pivot'],
  'WA-9': ['flux-renderers-industrial'],
  'WA-10': [
    'flux-renderers-3d',
    'flux-renderers-graph',
    'flux-renderers-map',
    'flux-print-core',
    'flux-print-renderers',
    'flux-code-editor',
  ],
  'WA-11': ['flux-renderers-ai'],
  'WA-12': [
    'editor-core',
    'page-designer-core',
    'flow-designer-core',
    'report-designer-core',
    'spreadsheet-core',
    'word-editor-core',
  ],
  'WA-13a': ['flow-designer-renderers', 'page-designer-renderers'],
  'WA-13b': ['report-designer-renderers', 'spreadsheet-renderers', 'word-editor-renderers'],
  'WA-14': ['flux-i18n', 'nop-debugger', 'flux-bundle', 'tailwind-preset', 'theme-tokens'],
};

const PLAYGROUND_SCOPE_DIRS = [
  { id: 'pg-complex-pages', dir: 'complex-pages', batch: 'WA-15a' },
  { id: 'pg-taskflow-designer-lib', dir: 'taskflow-designer-lib', batch: 'WA-15a' },
  { id: 'pg-designer-hosts', dir: 'designer-hosts', batch: 'WA-15a' },
  { id: 'pg-ai', dir: 'ai', batch: 'WA-15a' },
  { id: 'pg-env', dir: 'env', batch: 'WA-15a' },
  { id: 'pg-src-root', dir: '.', batch: 'WA-15a' },
  { id: 'pg-pages', dir: 'pages', batch: 'WA-15b' },
  { id: 'pg-component-lab', dir: 'component-lab', batch: 'WA-15c' },
];

// Directories under playground/src that are not TS audit targets (roadmap
// WA-15a: *-replica/ is CSS-only, schemas/ is JSON-only). If non-test TS code
// ever shows up there, the guard below fails and the roadmap must explicitly
// extend a batch scope.
const PLAYGROUND_NON_TS_DIRS = [
  'schemas',
  ...fs.readdirSync(PLAYGROUND_SRC).filter((d) => d.endsWith('-replica')),
];

const TEST_FILE_PATTERN = /(\.test\.tsx?|\.spec\.tsx?)$/;

// Baseline candidate scans — full prompt §5 steps 1/2 expressions.
const BASELINE_SCANS = {
  literalEn: /TODO|FIXME|HACK|WORKAROUND|XXX/,
  literalZh: /临时|先这样|暂时|绕过|workaround|hotfix/,
  typeBypass: /as any|as unknown as|@ts-ignore|@ts-expect-error/,
  setTimeoutCandidates: /setTimeout\(/,
  silentCatch: /catch\s*\([^)]*\)\s*\{\s*(?:return|}\s*$)/,
  keyRemount: /key=\{(Math\.random|Date\.now)/,
  domRaid: /querySelector|getElementById/,
  pixelNudge: /mt-\[-|translate-[xy]-\[0?\.|left-\[-|top-\[-/,
  testEnvBranch: /process\.env\.VITEST|isTestEnv|NODE_ENV.*test/,
};

// Roadmap-baseline cross-check expressions (roadmap 基线节 2026-10-10 live
// counts) — the four published counts use narrower expressions than the
// per-module candidates above; both are recorded so the expression-scope
// difference stays visible instead of silent.
const ROADMAP_CROSS_CHECK_SCANS = {
  literalEn: /TODO|FIXME|HACK|WORKAROUND/,
  literalZh: /临时|先这样|暂时|绕过/,
  typeBypass: /as any|@ts-ignore/,
  setTimeoutCandidates: /setTimeout\(/,
};
const ROADMAP_BASELINE = {
  packagesLoc: 258396,
  playgroundLoc: 51611,
  literalEn: 1,
  literalZh: 13,
  typeBypass: 46,
  setTimeoutCandidates: 72,
};

const TEST_DIR_NAME = '__tests__';

interface FileRecord {
  path: string;
  loc: number;
  content: string;
}

interface InventoryModule {
  id: string;
  family: 'package' | 'playground';
  batch: string;
  path: string;
  files: { path: string; loc: number }[];
  loc: number;
  baseline: Record<string, number>;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === TEST_DIR_NAME) continue;
      out.push(...walkFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function readFileRecord(file: string): FileRecord {
  const content = fs.readFileSync(file, 'utf8');
  const loc = content.length === 0 ? 0 : content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  return { path: path.relative(REPO_ROOT, file), loc, content };
}

function countMatchingLines(records: FileRecord[], regex: RegExp): number {
  let lines = 0;
  for (const record of records) {
    for (const line of record.content.split('\n')) {
      if (regex.test(line)) lines += 1;
    }
  }
  return lines;
}

function buildModule(
  id: string,
  family: 'package' | 'playground',
  batch: string,
  modulePath: string,
  fileRecords: FileRecord[]
): InventoryModule {
  return {
    id,
    family,
    batch,
    path: modulePath,
    files: fileRecords.map((f) => ({ path: f.path, loc: f.loc })),
    loc: fileRecords.reduce((sum, f) => sum + f.loc, 0),
    baseline: Object.fromEntries(
      Object.entries(BASELINE_SCANS).map(([name, re]) => [name, countMatchingLines(fileRecords, re)])
    ),
  };
}

function buildPackageModule(pkg: string, batch: string): InventoryModule {
  const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
  const records = walkFiles(srcDir)
    .filter((f) => !TEST_FILE_PATTERN.test(f))
    .map(readFileRecord);
  return buildModule(pkg, 'package', batch, path.relative(REPO_ROOT, srcDir), records);
}

function buildPlaygroundModules(): {
  modules: InventoryModule[];
  uncovered: string[];
  nonTsViolations: string[];
} {
  const records = walkFiles(PLAYGROUND_SRC)
    .filter((f) => !TEST_FILE_PATTERN.test(f))
    .map(readFileRecord);
  const covered = new Set();
  const modules = [];
  const srcPrefix = 'apps/playground/src/';
  for (const scope of PLAYGROUND_SCOPE_DIRS) {
    const scopeRecords =
      scope.dir === '.'
        ? records.filter((r) => {
            const rel = r.path.slice(srcPrefix.length);
            return !rel.includes('/');
          })
        : records.filter((r) => r.path.startsWith(srcPrefix + scope.dir + '/'));
    for (const r of scopeRecords) covered.add(r.path);
    modules.push(
      buildModule(
        scope.id,
        'playground',
        scope.batch,
        scope.dir === '.' ? 'apps/playground/src (root files)' : `apps/playground/src/${scope.dir}`,
        scopeRecords
      )
    );
  }
  const uncovered = records.map((r) => r.path).filter((p) => !covered.has(p));
  const nonTsViolations = [];
  for (const dir of PLAYGROUND_NON_TS_DIRS) {
    const dirFull = path.join(PLAYGROUND_SRC, dir);
    if (!fs.existsSync(dirFull)) continue;
    const tsFiles = walkFiles(dirFull).filter((f) => !TEST_FILE_PATTERN.test(f));
    if (tsFiles.length > 0) nonTsViolations.push(`${dir}: ${tsFiles.length} non-test TS file(s)`);
  }
  return { modules, uncovered, nonTsViolations };
}

function buildInventory() {
  const livePackages: string[] = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(PACKAGES_DIR, e.name, 'src')))
    .map((e) => e.name)
    .sort();

  const batchByPackage = new Map();
  for (const [batch, pkgs] of Object.entries(PACKAGE_BATCHES)) {
    for (const pkg of pkgs) {
      if (batchByPackage.has(pkg)) throw new Error(`package ${pkg} mapped to two batches`);
      batchByPackage.set(pkg, batch);
    }
  }
  const unmapped = livePackages.filter((pkg) => !batchByPackage.has(pkg));
  const stale = [...batchByPackage.keys()].filter((pkg) => !livePackages.includes(pkg));

  const modules = livePackages.map((pkg) => buildPackageModule(pkg, batchByPackage.get(pkg)));
  const { modules: pgModules, uncovered, nonTsViolations } = buildPlaygroundModules();
  modules.push(...pgModules);

  const live = {
    packagesLoc: modules.filter((m) => m.family === 'package').reduce((s, m) => s + m.loc, 0),
    playgroundLoc: modules.filter((m) => m.family === 'playground').reduce((s, m) => s + m.loc, 0),
  };
  const allRecords = modules.flatMap((m) => m.files.map((f) => ({ path: f.path })));
  // Re-read for cross-check is avoided by scanning module baselines instead:
  // the roadmap-narrow counts are recomputed from a second targeted pass.
  const globalRoadmapCounts: Record<string, number> = {};
  {
    const cache = new Map<string, string>();
    const contentOf = (p: string): string => {
      if (!cache.has(p)) cache.set(p, fs.readFileSync(path.join(REPO_ROOT, p), 'utf8'));
      return cache.get(p) as string;
    };
    for (const [name, re] of Object.entries(ROADMAP_CROSS_CHECK_SCANS)) {
      let lines = 0;
      for (const f of allRecords) {
        for (const line of contentOf(f.path).split('\n')) {
          if (re.test(line)) lines += 1;
        }
      }
      globalRoadmapCounts[name] = lines;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    generator: 'pnpm workaround:inventory (scripts/workaround-audit/generate-workaround-inventory.test.ts)',
    roadmapBaselineRef: 'docs/backlog/workaround-code-smell-audit-roadmap.md 基线节 (2026-10-10 实测)',
    live,
    deltas: {
      packagesLoc: live.packagesLoc - ROADMAP_BASELINE.packagesLoc,
      playgroundLoc: live.playgroundLoc - ROADMAP_BASELINE.playgroundLoc,
      ...Object.fromEntries(
        Object.entries(globalRoadmapCounts).map(([k, v]) => [
          k,
          v - ROADMAP_BASELINE[k as keyof typeof ROADMAP_BASELINE],
        ])
      ),
    },
    roadmapCrossCheck: {
      expressions: 'roadmap 基线节命令逐字口径（较 per-module 候选扫描窄，差异为表达式口径而非遗漏）',
      counts: globalRoadmapCounts,
      baseline: ROADMAP_BASELINE,
    },
    modules,
    _guards: {
      unmappedPackages: unmapped,
      staleBatchEntries: stale,
      uncoveredPlaygroundFiles: uncovered,
      nonTsViolations,
    },
  };
}

function emptyLedgerView(): ParsedLedger {
  return { modules: new Map(), findings: new Map() };
}

function existingLedger(): ParsedLedger {
  if (!fs.existsSync(LEDGER_PATH)) return emptyLedgerView();
  return parseLedger(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

function mergeModuleRows(
  inventory: ReturnType<typeof buildInventory>,
  existing: ParsedLedger
): LedgerModuleRow[] {
  const rows: LedgerModuleRow[] = inventory.modules.map((m) => {
    const prev = existing.modules.get(m.id);
    const status = prev && MODULE_STATUSES.includes(prev[3]) ? prev[3] : 'pending';
    return {
      id: m.id,
      family: m.family,
      batch: m.batch,
      status,
      loc: m.loc,
      fileCount: m.files.length,
      note: prev ? prev[6] : '',
    };
  });
  const inventoryIds = new Set(rows.map((r) => r.id));
  for (const [id, cells] of existing.modules) {
    if (!inventoryIds.has(id)) {
      rows.push({
        id,
        family: cells[1],
        batch: cells[2],
        status: 'orphan',
        loc: Number(cells[4]) || 0,
        fileCount: Number(cells[5]) || 0,
        note: cells[6],
      });
    }
  }
  return rows;
}

const LEDGER_PREAMBLE = [
  '# 临时方案与坏味道审计覆盖台账（Workaround & Code-Smell Audit Ledger）',
  '',
  '> Generated by `pnpm workaround:inventory` (plan 560). Do NOT hand-edit module rows — status',
  '> flips are written by batch plan lifecycles; regeneration keeps existing statuses, marks',
  '> vanished inventory entries `orphan`, and never rewrites the findings section.',
  '> Module state machine: pending → audited（批次报告覆盖声明落账）；orphan = 清单中已消失。',
  '> Finding state machine: pending → found（取证立案）→ fixed（修复落地）→ verified（复检通过）。',
  "> Finding ID convention: `WA-<pkg短名>-<seq>`（如 WA-runtime-001；与工作项 ID WA-0…WA-16 两个命名空间）。",
  '> 不修的发现必须显式去向四态之一（watch-only / successor-required / withdrawn / n-a），零静默。',
  '> 未处置 = pending 行 + 无显式去向的 found 行（plan 560 draft review R1 精化口径）。',
  '> 对账命令：`pnpm workaround:reconcile`（`--strict` 供 WA-16 门禁：uncovered=0 且未处置=0）。',
  '',
].join('\n');

describe('workaround-audit inventory generator', () => {
  const inventory = buildInventory();

  it('maps every live package to exactly one batch with no stale entries', () => {
    expect(inventory._guards.unmappedPackages).toEqual([]);
    expect(inventory._guards.staleBatchEntries).toEqual([]);
    const packageModules = inventory.modules.filter((m) => m.family === 'package');
    expect(packageModules).toHaveLength(41);
  });

  it('covers every non-test playground TS file with exactly one scope and no non-TS dir violations', () => {
    expect(inventory._guards.uncoveredPlaygroundFiles).toEqual([]);
    expect(inventory._guards.nonTsViolations).toEqual([]);
    const pgModules = inventory.modules.filter((m) => m.family === 'playground');
    expect(pgModules).toHaveLength(PLAYGROUND_SCOPE_DIRS.length);
  });

  it('assigns every module to a known roadmap batch with non-empty file list', () => {
    const knownBatches = new Set([...Object.keys(PACKAGE_BATCHES), 'WA-15a', 'WA-15b', 'WA-15c']);
    for (const m of inventory.modules) {
      expect(knownBatches.has(m.batch), `${m.id} has unknown batch ${m.batch}`).toBe(true);
      expect(m.files.length, `${m.id} has no audit-target files`).toBeGreaterThan(0);
    }
    const duplicateIds = inventory.modules.map((m) => m.id).filter((id, i, arr) => arr.indexOf(id) !== i);
    expect(duplicateIds).toEqual([]);
  });

  it('writes inventory json and merges ledger module rows idempotently', () => {
    // Never persist anything when coverage guards are red — a guard failure
    // means the batch mapping no longer matches the live tree, and writing
    // would pollute the ledger with unmapped modules.
    const guardSummaries = [
      ...inventory._guards.unmappedPackages,
      ...inventory._guards.staleBatchEntries,
      ...inventory._guards.uncoveredPlaygroundFiles,
      ...inventory._guards.nonTsViolations,
    ];
    if (guardSummaries.length > 0) {
      throw new Error(`coverage guards red, nothing written: ${guardSummaries.join('; ')}`);
    }
    fs.mkdirSync(path.dirname(INVENTORY_PATH), { recursive: true });
    const prev = existingLedger();
    const merged = mergeModuleRows(inventory, prev);

    const mergedTwice = mergeModuleRows(inventory, {
      modules: new Map(merged.map((m) => [m.id, moduleRowCells(m)])),
      findings: prev.findings,
    });
    expect(mergedTwice).toEqual(merged);

    const findingsCells = [...prev.findings.values()];
    const ledgerText = serializeLedger(merged, findingsCells, LEDGER_PREAMBLE);
    fs.writeFileSync(LEDGER_PATH, ledgerText, 'utf8');

    const compact = {
      ...inventory,
      modules: inventory.modules.map((m) => ({
        id: m.id,
        family: m.family,
        batch: m.batch,
        path: m.path,
        loc: m.loc,
        fileCount: m.files.length,
        baseline: m.baseline,
        files: m.files.map((f) => `${f.path}:${f.loc}`),
      })),
    };
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(compact, null, 2) + '\n', 'utf8');

    const reparsed = parseLedger(fs.readFileSync(LEDGER_PATH, 'utf8'));
    expect(reparsed.modules.size).toBe(merged.length);
    for (const [id, row] of reparsed.modules) {
      expect(MODULE_STATUSES).toContain(row[3]);
      const inv = inventory.modules.find((m) => m.id === id);
      if (inv) expect(row[2]).toBe(inv.batch);
    }
    for (const row of reparsed.findings.values()) {
      expect(FINDING_STATUSES).toContain(row[5]);
      expect(row[6] === '' || FINDING_DISPOSITIONS.includes(row[6])).toBe(true);
    }
  });
});
