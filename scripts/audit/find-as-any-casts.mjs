// `as any` cast counter (plan 601 G3b, WA-16 gate extension). Registers a
// numeric baseline for `as any` occurrences in non-test source under
// apps/+packages so the count can only go DOWN without an explicit
// re-registration: the successor contract batches (WA-pages-008 / WA-clab-001,
// SchemaObject/SchemaInput ergonomics) shrink the count via
// `--update-baselines`; any growth fails check:scanner-baselines.
//
// Pinned counting rule (plan 601 G3): scan roots = apps + packages only,
// test files (.test. / .spec. / __tests__ / test-support) excluded, raw-text
// /\bas\s+any\b/ match count (comment occurrences included — conservative
// over-approximation; execution-time live count 41. The plan 601 draft figure
// 43 was a pre-pinned-rule measurement and is superseded by this registered
// 41, see scanner-baselines.json reRegistrationNotes).
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

const asAnyRules = [
  {
    id: 'as-any-cast',
    severity: 'medium',
    description:
      '`as any` cast (increment ban; shrink contract batches via --update-baselines, growth fails the gate)',
    include: (filePath) => !isTestFile(filePath),
    patterns: [/\bas\s+any\b/g],
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
    const activeRules = asAnyRules.filter((rule) => rule.include(relativePath));
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
  .then((results) => printResults(results, asAnyRules, 'find-as-any-casts'))
  .catch((error) => handleFatalError('find-as-any-casts', error));
