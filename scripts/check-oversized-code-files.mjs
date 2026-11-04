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
    path: 'packages/flux-i18n/src/locales/en-US.ts',
    reason:
      'Pure data declaration body (`Resource` type, 45 self-contained `flux.*` namespaces with zero logic). Adjudicated Plan 2026-08-07-1053-1 Phase 1/Phase 2: the repo-wide `check:i18n-keys` gate parses the full object literal inline from exactly these two file paths (scripts/check-i18n-keys.mjs, `export const <name>: Resource = {...}` regex); physical splitting requires spread aggregation that defeats the gate parser or a second-gate surgery that is out of scope ("不改变门禁规则本身"). i18next consumes the bundle atomically; per-namespace modules add no cohesion value.',
  },
  {
    path: 'packages/flux-i18n/src/locales/zh-CN.ts',
    reason:
      'Pure data declaration body (`Resource` type, 45 self-contained `flux.*` namespaces with zero logic). Adjudicated Plan 2026-08-07-1053-1 Phase 1/Phase 2: the repo-wide `check:i18n-keys` gate parses the full object literal inline from exactly these two file paths (scripts/check-i18n-keys.mjs, `export const <name>: Resource = {...}` regex); physical splitting requires spread aggregation that defeats the gate parser or a second-gate surgery that is out of scope ("不改变门禁规则本身"). i18next consumes the bundle atomically; per-namespace modules add no cohesion value.',
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
  } catch (error) {
    // A tracked path deleted in the working tree is not a gate concern.
    return error?.code === 'ENOENT' ? -2 : -1;
  }
}

const UNREADABLE_FILES = [];

async function main() {
  const trackedFiles = await getTrackedFiles();
  const errorFiles = [];
  const warnFiles = [];

  for (const filePath of trackedFiles) {
    const lineCount = await countLines(filePath);
    if (lineCount === -2) continue;
    if (lineCount < 0) {
      UNREADABLE_FILES.push(filePath);
      continue;
    }
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

  const overLimitFiles = errorFiles.filter((item) => !exemptPaths.has(item.filePath));
  const unexemptedOverLimit = overLimitFiles.length > 0;
  if (unexemptedOverLimit) {
    console.error(
      `[check-oversized-code-files] ERROR: ${overLimitFiles.length} files exceed ${ERROR_LINES} lines (MUST split):`,
    );
    for (const item of overLimitFiles) {
      console.error(`  - ${item.filePath}: ${item.lineCount}`);
      hasError = true;
    }
  }

  if (errorFiles.length > overLimitFiles.length) {
    console.warn(
      `[check-oversized-code-files] INFO: ${errorFiles.length - overLimitFiles.length} files exceed ${ERROR_LINES} lines — all exempt`,
    );
  }

  if (UNREADABLE_FILES.length > 0) {
    hasError = true;
    console.error(`[check-oversized-code-files] ERROR: ${UNREADABLE_FILES.length} tracked file(s) unreadable (countLines failed):`);
    for (const filePath of UNREADABLE_FILES) {
      console.error(`  - ${filePath}`);
    }
  }

  for (const item of errorFiles) {
    if (exemptPaths.has(item.filePath)) {
      exemptedFiles.push(item);
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
