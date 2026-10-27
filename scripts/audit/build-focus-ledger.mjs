import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Focus-management ledger (plan 782, roadmap PH-18). Mechanically classifies
// every non-test component file in packages/ui/src/components/ui:
//   base-ui        — imports a focus-managing primitive from @base-ui/react
//                    (utility modules — merge-props / use-render /
//                    direction-provider / use-* — do NOT count)
//   focus-visible  — carries a focus-visible style hook
//   programmatic   — calls .focus( directly
//   non-interactive — none of the above
// A file can carry several tags; the primary tag precedence is
// base-ui > programmatic > focus-visible > non-interactive.
// The generated table is wrapped in a fenced code block so prettier (lint-staged)
// cannot reformat it — keeps --check deterministic across commits.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const DEFAULT_COMPONENTS_DIR = path.join(rootDir, 'packages', 'ui', 'src', 'components', 'ui');
const DEFAULT_LEDGER = path.join(rootDir, 'docs', 'testing', 'focus-management-ledger.md');
const BEGIN = '<!-- BEGIN GENERATED:focus-ledger (regenerate with --update; hand edits fail check:focus-ledger) -->';
const END = '<!-- END GENERATED:focus-ledger -->';
const BASE_UI_UTILITY_SUBPATHS = new Set(['merge-props', 'use-render', 'direction-provider']);

function parseArgs(argv) {
  const get = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    componentsDir: get('--components-dir') ?? DEFAULT_COMPONENTS_DIR,
    ledger: get('--ledger') ?? DEFAULT_LEDGER,
    update: argv.includes('--update'),
  };
}

function classify(source) {
  const tags = [];
  // Bare-root imports (`from '@base-ui/react'`) are primitive imports in this
  // package's convention (e.g. combobox.tsx); subpath imports are checked
  // against the utility denylist.
  const baseUiPrimitive = /from '@base-ui\/react';/.test(source) ||
    [...source.matchAll(/from '@base-ui\/react\/([\w-]+)'/g)]
      .map((match) => match[1])
      .some((sub) => !BASE_UI_UTILITY_SUBPATHS.has(sub));
  if (baseUiPrimitive) tags.push('base-ui');
  if (/focus-visible/.test(source)) tags.push('focus-visible');
  if (/\.focus\s*\(/.test(source)) tags.push('programmatic');
  if (tags.length === 0) tags.push('non-interactive');
  return tags;
}

function primaryTag(tags) {
  for (const tag of ['base-ui', 'programmatic', 'focus-visible', 'non-interactive']) {
    if (tags.includes(tag)) return tag;
  }
  return 'non-interactive';
}

export function buildRows(componentsDir) {
  const rows = [];
  for (const name of readdirSync(componentsDir).sort()) {
    if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
    if (/\.test\./.test(name)) continue;
    const source = readFileSync(path.join(componentsDir, name), 'utf8');
    const tags = classify(source);
    rows.push({ file: name.replace(/\.tsx?$/, ''), tags, primary: primaryTag(tags) });
  }
  if (rows.length === 0) throw new Error(`no component files found under ${componentsDir}`);
  return rows;
}

export function renderRegion(rows) {
  const lines = [BEGIN, '', '```txt', '| 文件 | 主标签 | 全部标签 |', '| --- | --- | --- |'];
  for (const row of rows) {
    lines.push(`| ${row.file} | ${row.primary} | ${row.tags.join(', ')} |`);
  }
  lines.push('```', '', END, '');
  return lines.join('\n');
}

export function regenerateLedger(ledgerText, rows) {
  const beginIndex = ledgerText.indexOf(BEGIN);
  const endIndex = ledgerText.indexOf(END);
  if (beginIndex < 0 || endIndex < 0) {
    return ledgerText.trimEnd() + '\n\n' + renderRegion(rows);
  }
  return ledgerText.slice(0, beginIndex) + renderRegion(rows) + ledgerText.slice(endIndex + END.length);
}

function main() {
  const { componentsDir, ledger, update } = parseArgs(process.argv.slice(2));
  const rows = buildRows(componentsDir);
  let ledgerText = '';
  try {
    ledgerText = readFileSync(path.resolve(ledger), 'utf8');
  } catch {
    ledgerText = '';
  }
  const regenerated = regenerateLedger(ledgerText, rows);
  if (update || !ledgerText) {
    writeFileSync(path.resolve(ledger), regenerated);
    console.log(`[check:focus-ledger] ledger ${update ? 'updated' : 'created'}: ${rows.length} ui component files classified`);
    return;
  }
  if (regenerated.trimEnd() !== ledgerText.trimEnd()) {
    console.error(
      `[check:focus-ledger] STALE: ${ledger} does not match a fresh generation (ui primitives changed, or the generated region was hand-edited). Run: node scripts/audit/build-focus-ledger.mjs --update`,
    );
    process.exit(1);
  }
  console.log(`[check:focus-ledger] ledger in sync (${rows.length} ui component files)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
