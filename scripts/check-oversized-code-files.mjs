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

  if (errorFiles.length > 0) {
    hasError = true;
    console.error(
      `[check-oversized-code-files] ERROR: ${errorFiles.length} files exceed ${ERROR_LINES} lines (MUST split):`,
    );
    for (const item of errorFiles) {
      console.error(`  - ${item.filePath}: ${item.lineCount}`);
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
      `[check-oversized-code-files] ${warnFiles.length} warnings, ${errorFiles.length} errors`,
    );
  }
}

main().catch((error) => {
  console.error('[check-oversized-code-files] Error:', error);
  process.exit(1);
});
