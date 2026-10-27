import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Flake ledger completeness (plan 775, roadmap PH-10):
//   1. every `@watch-only` test in tests/e2e must have a ledger entry;
//   2. every ledger entry whose status is CLOSED-fixed must still name an existing test
//      (no ghost entries kept alive after the test was renamed or deleted).
// Entries are content-anchored as `<spec path relative to repo> > <leaf test title>`
// (whitespace-collapsed); parametrized titles must be registered in their literal
// expanded form.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const TEST_TITLE_RE = /\btest(?:\.only|\.skip|\.fixme)?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const ENTRY_RE = /`((?:tests\/e2e\/)?[\w./-]+\.spec\.ts) > ([^`]+)`/;

function parseArgs(argv) {
  const get = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    specsDir: get('--specs-dir') ?? path.join(rootDir, 'tests', 'e2e'),
    ledger: get('--ledger') ?? path.join(rootDir, 'docs', 'testing', 'e2e-flake-ledger.md'),
  };
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function listSpecs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSpecs(full));
    else if (entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

export function collectTests(specsDir) {
  const tests = new Map();
  for (const file of listSpecs(specsDir)) {
    const rel = path.relative(specsDir, file).split(path.sep).join('/');
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(TEST_TITLE_RE)) {
      const title = collapse(match[2].replace(/\\(['"`])/g, '$1'));
      const key = `${rel} > ${title}`;
      tests.set(key, { rel, title, watchOnly: /@watch-only\b/.test(title) });
    }
  }
  return tests;
}

export function collectLedgerEntries(ledgerText, anchorless = []) {
  const entries = [];
  for (const line of ledgerText.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const match = cells[1]?.match(ENTRY_RE);
    if (!match) {
      if (cells[1] && !/^(项|---+)$/.test(cells[1])) anchorless.push(line.slice(0, 160));
      continue;
    }
    const rel = match[1].replace(/^tests\/e2e\//, '');
    const status = cells.find((cell) => /\b(OPEN|ATTRIBUTED|CLOSED)[-\w()]*/.test(cell)) ?? '';
    entries.push({ key: `${rel} > ${collapse(match[2])}`, rel, title: collapse(match[2]), status });
  }
  return entries;
}

export function evaluate(tests, entries) {
  const violations = [];
  const entryKeys = new Set(entries.map((entry) => entry.key));
  for (const [key, test] of tests) {
    if (test.watchOnly && !entryKeys.has(key)) {
      violations.push(`@watch-only test not registered in the flake ledger: ${key}`);
    }
  }
  for (const entry of entries) {
    if (/CLOSED-fixed/.test(entry.status) && !tests.has(entry.key)) {
      violations.push(`ledger CLOSED-fixed entry names a test that no longer exists: ${entry.key}`);
    }
  }
  return violations;
}

function main() {
  const { specsDir, ledger } = parseArgs(process.argv.slice(2));
  let ledgerText;
  try {
    ledgerText = readFileSync(ledger, 'utf8');
  } catch {
    console.error(`[check:e2e-flake-ledger] ledger missing: ${ledger}`);
    process.exit(1);
  }
  const tests = collectTests(specsDir);
  const anchorless = [];
  const entries = collectLedgerEntries(ledgerText, anchorless);
  const violations = evaluate(tests, entries);
  for (const row of anchorless) {
    if (/CLOSED-fixed/.test(row)) violations.push(`CLOSED-fixed row without a content anchor cannot be checked: ${row}`);
    else console.log(`  (history-only row, not machine-checked) ${row}`);
  }
  const watchOnly = [...tests.values()].filter((test) => test.watchOnly).length;
  console.log(`[check:e2e-flake-ledger] ${tests.size} tests scanned, ${watchOnly} @watch-only, ${entries.length} ledger entries`);
  if (violations.length > 0) {
    console.error('[check:e2e-flake-ledger] FAILED:');
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log('[check:e2e-flake-ledger] watch-only tags and ledger agree');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
