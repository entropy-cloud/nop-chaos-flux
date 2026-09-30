import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'knip-baseline.json');

// Categories diffed against the baseline. `unlisted` is intentionally NOT
// diffed: its resolution differs from check-workspace-manifest-deps (which is
// the in-chain authority); it is registered as counts + distribution for the
// CQ-S17 reconciliation only (see baseline file header).
const DIFFED_CATEGORIES = ['files', 'exports', 'types', 'dependencies', 'devDependencies'];
const CATEGORY_LABELS = {
  files: 'unused files',
  exports: 'unused exports',
  types: 'unused exported types',
  dependencies: 'unused dependencies',
  devDependencies: 'unused devDependencies',
};

function entryIdentity(category, file, entry) {
  if (category === 'files') return entry.name;
  return `${file}#${entry.name}`;
}

// Pure normalizer: knip JSON report -> { [category]: string[] sorted identities }.
function collectIssues(report) {
  const collected = Object.fromEntries(DIFFED_CATEGORIES.map((c) => [c, []]));
  const unlistedCount = { count: 0, entries: [] };
  for (const issue of report.issues ?? []) {
    for (const category of DIFFED_CATEGORIES) {
      for (const entry of issue[category] ?? []) {
        collected[category].push(entryIdentity(category, issue.file, entry));
      }
    }
    for (const entry of issue.unlisted ?? []) {
      unlistedCount.count += 1;
      unlistedCount.entries.push(`${issue.file}#${entry.name ?? JSON.stringify(entry)}`);
    }
  }
  for (const category of DIFFED_CATEGORIES) collected[category].sort();
  return { ...collected, unlisted: unlistedCount };
}

// Pure diff: current vs baseline identities -> { newHits, resolved } per category.
function diffBaseline(current, baseline) {
  const newHits = [];
  const resolved = [];
  for (const category of DIFFED_CATEGORIES) {
    const baselineSet = new Set(baseline[category] ?? []);
    const currentSet = new Set(current[category] ?? []);
    for (const identity of current[category] ?? []) {
      if (!baselineSet.has(identity)) newHits.push({ category, identity });
    }
    for (const identity of baseline[category] ?? []) {
      if (!currentSet.has(identity)) resolved.push({ category, identity });
    }
  }
  return { newHits, resolved };
}

async function runKnip() {
  try {
    const { stdout } = await execFileAsync('npx', ['knip', '--reporter', 'json'], {
      cwd: rootDir,
      maxBuffer: 256 * 1024 * 1024,
      shell: true,
    });
    return JSON.parse(stdout);
  } catch (error) {
    // knip exits non-zero whenever issues exist; the JSON report is still on stdout.
    if (error?.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const baselineIndex = args.indexOf('--baseline');
  const updateIndex = args.indexOf('--update-baselines');

  const report = inputIndex >= 0 ? JSON.parse(await readFile(args[inputIndex + 1], 'utf8')) : await runKnip();
  const current = collectIssues(report);

  if (updateIndex >= 0) {
    const target = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
    let existing = {};
    try {
      existing = JSON.parse(await readFile(target, 'utf8'));
    } catch {}
    const snapshot = {
      _header: {
        description: 'knip baseline: registered dead-code inventory. New hits fail check:knip-baseline; shrink via --update-baselines.',
        knipVersion: existing._header?.knipVersion ?? '6.9.0',
        lastUpdated: new Date().toISOString().slice(0, 10),
        counts: Object.fromEntries(DIFFED_CATEGORIES.map((c) => [c, current[c].length]).concat([['unlisted', current.unlisted.count]])),
        unlistedReconciliation: existing._header?.unlistedReconciliation ?? 'see CQ-S17 notes',
      },
      ...Object.fromEntries(DIFFED_CATEGORIES.map((c) => [c, current[c]])),
    };
    await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log('[check-knip-baseline] baseline updated');
    return;
  }

  const baselinePath = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
  let baseline;
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  } catch {
    console.error('[check-knip-baseline] missing baseline file; run with --update-baselines first');
    process.exit(1);
  }

  const { newHits, resolved } = diffBaseline(current, baseline);

  if (newHits.length > 0) {
    const grouped = {};
    for (const hit of newHits) {
      (grouped[hit.category] ??= []).push(hit.identity);
    }
    console.error('[check-knip-baseline] NEW dead-code hits not registered in baseline (fix or re-baseline):');
    for (const category of DIFFED_CATEGORIES) {
      for (const identity of grouped[category] ?? []) {
        console.error(`  [${CATEGORY_LABELS[category]}] ${identity}`);
      }
    }
    process.exit(1);
  }

  if (resolved.length > 0) {
    console.log(`[check-knip-baseline] no new hits; ${resolved.length} registered entries can be shrunk (--update-baselines):`);
    for (const entry of resolved.slice(0, 20)) {
      console.log(`  [${CATEGORY_LABELS[entry.category]}] ${entry.identity}`);
    }
    if (resolved.length > 20) console.log(`  ... and ${resolved.length - 20} more`);
  } else {
    console.log('[check-knip-baseline] no new hits');
  }
}

main().catch((error) => {
  console.error('[check-knip-baseline] fatal:', error?.message ?? error);
  process.exit(1);
});
