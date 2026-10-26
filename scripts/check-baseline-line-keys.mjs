import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Line-number usage rule (plan 763, from commit caf780ed1): line numbers may key
// or identify CURRENT-STATE constraints only in content-anchored form. Free-text
// historical/adjudication buckets (ref / reason / reRegistrationNotes / notes)
// are exempt. Surfaces: scripts/baselines/*.json key positions and the QA.7 §C
// identifier column (any `name:digits(:digits)` token there, extension or not).

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const EXEMPT_KEYS = new Set(['ref', 'refs', 'reason', 'reasons', 'note', 'notes', 'reRegistrationNotes']);
const KEY_LINE_RE = /[\w./-]+\.(?:tsx?|js|mjs|spec\.ts):\d+/;
const QA7_IDENTIFIER_RE = /[\w-]+:\d+(?::\d+)?/;

function parseArgs(argv) {
  const get = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return { file: get('--file'), mode: get('--mode') };
}

function walkJson(node, keyPath, violations, file) {
  if (Array.isArray(node)) {
    node.forEach((item) => walkJson(item, keyPath, violations, file));
    return;
  }
  if (node === null || typeof node !== 'object') {
    if (typeof node === 'string' && !EXEMPT_KEYS.has(keyPath[keyPath.length - 1] ?? '')) {
      if (KEY_LINE_RE.test(node)) {
        violations.push(`${file}: line-keyed identifier under key "${keyPath.join('.')}" — ${node.slice(0, 80)}`);
      }
    }
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (KEY_LINE_RE.test(key)) {
      violations.push(`${file}: line-numbered KEY "${key.slice(0, 80)}"`);
      continue;
    }
    walkJson(value, [...keyPath, key], violations, file);
  }
}

function scanQa7SectionC(text, violations, file) {
  let inSectionC = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) inSectionC = line.startsWith('## C.');
    if (!inSectionC || !line.startsWith('|')) continue;
    const cells = line.split('|');
    if (cells.length < 3) continue;
    const identifier = cells[1].trim();
    // Strip only the historical-observation parentheticals (the allowed place
    // for line numbers); other parentheticals stay in the probe.
    const probe = identifier.replace(/（[^）]*历史观测[^）]*）/g, '').replace(/\([^)]*historical[^)]*\)/gi, '');
    if (QA7_IDENTIFIER_RE.test(probe)) {
      violations.push(`${file}: §C identifier still line-keyed — ${identifier.slice(0, 80)}`);
    }
  }
}

export function scanTexts({ baselineFiles, qa7File }) {
  const violations = [];
  for (const file of baselineFiles) {
    let json;
    try {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      violations.push(`${path.basename(file)}: unparseable JSON`);
      continue;
    }
    walkJson(json, [], violations, path.basename(file));
  }
  if (qa7File) {
    try {
      scanQa7SectionC(readFileSync(qa7File, 'utf8'), violations, 'QA.7-residual-debt-register.md');
    } catch {
      violations.push('QA.7-residual-debt-register.md: unreadable');
    }
  }
  return violations;
}

async function main() {
  const { file, mode } = parseArgs(process.argv.slice(2));
  const violations = [];
  if (file) {
    if (mode === 'json') {
      walkJson(JSON.parse(readFileSync(file, 'utf8')), [], violations, path.basename(file));
    } else {
      scanQa7SectionC(readFileSync(file, 'utf8'), violations, path.basename(file));
    }
  } else {
    const baselinesDir = path.join(rootDir, 'scripts', 'baselines');
    const { readdir } = await import('fs/promises');
    const names = (await readdir(baselinesDir)).filter((name) => name.endsWith('.json'));
    const baselineFiles = names.map((name) => path.join(baselinesDir, name));
    violations.push(...scanTexts({ baselineFiles, qa7File: path.join(rootDir, 'docs', 'audits', 'missing-components', 'QA.7-residual-debt-register.md') }));
  }

  if (violations.length > 0) {
    console.error(`[check:baseline-line-keys] line-keyed current-state entries (use content anchors; free-text ref/reason/notes buckets are exempt):`);
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log('[check:baseline-line-keys] no line-numbered current-state keys');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error('[check:baseline-line-keys] fatal:', error?.message ?? error);
    process.exit(1);
  });
}
