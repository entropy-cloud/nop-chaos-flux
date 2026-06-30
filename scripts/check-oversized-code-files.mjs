import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const WARN_LINES = 500;
const ERROR_LINES = 700;
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const rootPrefixes = ['apps/', 'packages/', 'scripts/', 'tests/'];
const ignoredPathParts = new Set([
  'dist/',
  'node_modules/',
  'coverage/',
  'test-results/',
  '.turbo/',
]);

// Explicit opt-in exemptions for files that exceed ERROR_LINES but have a
// documented architectural justification. Each entry MUST cite the decision
// reference (plan / audit / inline source comment) explaining why physical
// splitting would harm cohesion. This is intentionally an opt-in list — never
// a silent passthrough — so every over-limit file remains visible in the
// script output and every exemption is auditable.
//
// To add an exemption: append `{ path, reason }`. The script still prints the
// file in the ERROR section but marks it `[exempt]` and does not flip the
// exit code. Review the cited decision before adding or removing an entry.
const OVERSIZED_EXEMPTIONS = [
  {
    path: 'packages/flux-runtime/src/form-runtime-owner.ts',
    reason:
      'Single `buildFormOwnerRuntime` orchestrator. Documented decision (AUDIT-01 / Plan 2026-06-27-0850-1 Phase 1): the orchestrator closure shares substantial mutable state (sharedState, lifecycle, validation pipeline) already partially extracted to sibling files (`form-runtime-owner-{external-errors,field-states,lifecycle,validation,values}.ts`); further splitting fragments the orchestration coherence without improving maintainability.',
  },
  {
    path: 'packages/flux-compiler/src/schema-compiler/node-compiler.ts',
    reason:
      'Single `compileSingleNode` closure. Documented inline decision at node-compiler.ts:57-65 (Plan 444 / 02-N1, reaffirmed AUDIT-01 / Plan 2026-06-27-0850-1 Phase 1): the closure shares substantial mutable state (symbolTable, regions, compiledPropEntries, sourcePropKeys, rawEventPlans); helpers are already extracted. Splitting would require passing significant shared state between modules, reducing clarity.',
  },
];
const exemptPaths = new Set(OVERSIZED_EXEMPTIONS.map((entry) => entry.path));

function isTrackedCodeFile(filePath) {
  if (!rootPrefixes.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }

  if (Array.from(ignoredPathParts).some((part) => filePath.includes(part))) {
    return false;
  }

  return codeExtensions.has(path.extname(filePath));
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files'], {
    cwd: rootDir,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isTrackedCodeFile);
}

async function countLines(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    const content = await readFile(absolutePath, 'utf8');
    return content === '' ? 0 : content.split(/\r?\n/).length;
  } catch {
    return -1;
  }
}

async function main() {
  const trackedFiles = await getTrackedFiles();
  const errorFiles = [];
  const warnFiles = [];

  for (const filePath of trackedFiles) {
    const lineCount = await countLines(filePath);
    if (lineCount < 0) continue;
    if (lineCount > ERROR_LINES) {
      errorFiles.push({ filePath, lineCount });
    } else if (lineCount > WARN_LINES) {
      warnFiles.push({ filePath, lineCount });
    }
  }

  const sortByLines = (a, b) => b.lineCount - a.lineCount || a.filePath.localeCompare(b.filePath);
  errorFiles.sort(sortByLines);
  warnFiles.sort(sortByLines);

  let hasError = false;
  const exemptedFiles = [];

  if (errorFiles.length > 0) {
    console.error(
      `[check-oversized-code-files] ERROR: ${errorFiles.length} files exceed ${ERROR_LINES} lines (MUST split):`,
    );
    for (const item of errorFiles) {
      const tag = exemptPaths.has(item.filePath) ? ' [exempt]' : '';
      console.error(`  - ${item.filePath}: ${item.lineCount}${tag}`);
      if (exemptPaths.has(item.filePath)) {
        exemptedFiles.push(item);
      } else {
        hasError = true;
      }
    }
  }

  if (exemptedFiles.length > 0) {
    console.warn(
      `[check-oversized-code-files] EXEMPT: ${exemptedFiles.length} over-limit file(s) carry an explicit opt-in exemption:`,
    );
    for (const item of exemptedFiles) {
      const entry = OVERSIZED_EXEMPTIONS.find((record) => record.path === item.filePath);
      console.warn(`  - ${item.filePath}: ${item.lineCount} lines`);
      if (entry) {
        console.warn(`      reason: ${entry.reason}`);
      }
    }
  }

  if (warnFiles.length > 0) {
    console.warn(
      `[check-oversized-code-files] WARN: ${warnFiles.length} files exceed ${WARN_LINES} lines (evaluate for split):`,
    );
    for (const item of warnFiles) {
      console.warn(`  - ${item.filePath}: ${item.lineCount}`);
    }
  }

  if (hasError) {
    process.exit(1);
  }

  const total = errorFiles.length + warnFiles.length;
  if (total === 0) {
    console.log(
      `[check-oversized-code-files] All tracked code files are within limits (warn: ${WARN_LINES}, error: ${ERROR_LINES})`,
    );
  } else {
    console.log(
      `[check-oversized-code-files] ${warnFiles.length} warnings, ${errorFiles.length} errors, ${exemptedFiles.length} exempt`,
    );
  }
}

main().catch((error) => {
  console.error('[check-oversized-code-files] Error:', error);
  process.exit(1);
});
