// TODO/FIXME/HACK/WORKAROUND exit-less marker scanner (plan 601 G3a, WA-16 gate
// extension). Flags open-ended work markers left in non-test source under
// apps/+packages: a marker with no adjudicated exit (ledger row, roadmap entry,
// or registered watch) is a silent workaround re-entry vector — the workaround
// audit campaign (docs/audits/workaround-code-smell/) closes with exactly one
// adjudicated live marker (scheduling undo-stack.ts:194, dual-track design
// residue, baseline = 1). New markers must be adjudicated or the baseline
// consciously re-registered via scripts/baselines/scanner-baselines.json.
//
// Pinned counting rule (plan 601 G3): scan roots = apps + packages only
// (tests/e2e and committed script fixtures are out of scope), test files
// (.test. / .spec. / __tests__ / test-support) excluded, raw-text whole-word
// match (markers live inside comments, so comment text is intentionally
// scanned; strings containing a marker are over-approximated as hits — the
// numeric baseline absorbs the fixed current-state noise).
import { readFile } from 'fs/promises';
import path from 'path';
import {
  collectSourceFiles,
  getLineNumber,
  getLineText,
  handleFatalError,
  isTestFile,
  printResults,
  rootDir,
  scanRootOverride,
  toScanRelativePath,
} from './shared.mjs';

const SCAN_ROOTS = ['apps', 'packages'];

const todoExitlessRules = [
  {
    id: 'todo-exitless-marker',
    severity: 'medium',
    description:
      'Exit-less TODO/FIXME/HACK/WORKAROUND marker in non-test source (adjudicate or re-register baseline)',
    include: (filePath) => !isTestFile(filePath),
    patterns: [/\b(?:TODO|FIXME|HACK|WORKAROUND)\b/g],
  },
];

async function scanFiles() {
  const base = scanRootOverride ?? rootDir;
  const files = [];
  for (const root of SCAN_ROOTS) {
    files.push(...(await collectSourceFiles(path.join(base, root))));
  }

  const allResults = [];
  for (const filePath of files) {
    const relativePath = toScanRelativePath(filePath);
    const activeRules = todoExitlessRules.filter((rule) => rule.include(relativePath));
    if (activeRules.length === 0) {
      continue;
    }
    const content = await readFile(filePath, 'utf8');
    for (const rule of activeRules) {
      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
          const line = getLineNumber(content, match.index);
          allResults.push({
            ruleId: rule.id,
            severity: rule.severity,
            description: rule.description,
            filePath: relativePath,
            line,
            lineText: getLineText(content, line).trim(),
            matchText: match[0],
          });
        }
      }
    }
  }

  allResults.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
  return allResults;
}

scanFiles()
  .then((results) => printResults(results, todoExitlessRules, 'find-todo-exitless'))
  .catch((error) => handleFatalError('find-todo-exitless', error));
