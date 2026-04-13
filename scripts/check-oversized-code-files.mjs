import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const MAX_LINES = 500;
const codeExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const rootPrefixes = ['apps/', 'packages/', 'scripts/', 'tests/'];
const ignoredPathParts = new Set(['dist/', 'node_modules/', 'coverage/', 'test-results/', '.turbo/']);

function isTrackedCodeFile(filePath) {
  if (!rootPrefixes.some(prefix => filePath.startsWith(prefix))) {
    return false;
  }

  if (Array.from(ignoredPathParts).some(part => filePath.includes(part))) {
    return false;
  }

  return codeExtensions.has(path.extname(filePath));
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: rootDir, maxBuffer: 10 * 1024 * 1024 });
  return stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(isTrackedCodeFile);
}

async function countLines(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const content = await readFile(absolutePath, 'utf8');
  return content === '' ? 0 : content.split(/\r?\n/).length;
}

async function main() {
  const trackedFiles = await getTrackedFiles();
  const oversizedFiles = [];

  for (const filePath of trackedFiles) {
    const lineCount = await countLines(filePath);
    if (lineCount > MAX_LINES) {
      oversizedFiles.push({ filePath, lineCount });
    }
  }

  oversizedFiles.sort((left, right) => right.lineCount - left.lineCount || left.filePath.localeCompare(right.filePath));

  if (oversizedFiles.length > 0) {
    console.error(`[check-oversized-code-files] Found ${oversizedFiles.length} tracked code files over ${MAX_LINES} lines:`);
    for (const issue of oversizedFiles) {
      console.error(`  - ${issue.filePath}: ${issue.lineCount}`);
    }
    process.exit(1);
  }

  console.log(`[check-oversized-code-files] No tracked code files exceed ${MAX_LINES} lines`);
}

main().catch(error => {
  console.error('[check-oversized-code-files] Error:', error);
  process.exit(1);
});
