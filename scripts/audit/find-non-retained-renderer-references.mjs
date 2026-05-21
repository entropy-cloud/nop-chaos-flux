import { readdir, readFile } from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

const scanRoots = ['apps', 'packages', 'tests', 'docs'];
const scanExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']);
const ignoredDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'temp',
  'test-results',
]);
const ignoredPathPrefixes = [
  'docs/amis-types/',
  'docs/analysis/',
  'docs/archive/',
  'docs/components/amis-baseline-matrix.md',
  'docs/components/form/amis-migration-example.json',
  'docs/logs/',
  'docs/plans/',
  'docs/ppts/assets/',
];

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

function getLineText(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  return lines[lineNumber - 1] ?? '';
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function collectFiles(dir) {
  const files = [];
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return files;
    }
    throw error;
  }

  for (const entry of entries) {
    if (ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (scanExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseRetainedTypes(matrixContent) {
  const retainedTypes = new Set();

  for (const line of matrixContent.split(/\r?\n/)) {
    if (line.startsWith('## Not Retained As Standalone Flux Component Types')) {
      break;
    }

    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (match) {
      retainedTypes.add(match[1]);
    }
  }

  return retainedTypes;
}

function parseNotRetainedTypes(matrixContent) {
  const notRetainedTypes = new Set();
  let inNotRetainedSection = false;

  for (const line of matrixContent.split(/\r?\n/)) {
    if (line.startsWith('## Not Retained As Standalone Flux Component Types')) {
      inNotRetainedSection = true;
      continue;
    }

    if (!inNotRetainedSection) {
      continue;
    }

    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (match) {
      notRetainedTypes.add(match[1]);
    }
  }

  return notRetainedTypes;
}

function parseExtraNonRetainedTypes(indexContent) {
  const extraTypes = new Set();

  for (const line of indexContent.split(/\r?\n/)) {
    if (/不建议保留\s+`tpl`/.test(line) || /`tpl`\s+不保留为正式 type/.test(line)) {
      extraTypes.add('tpl');
    }
  }

  return extraTypes;
}

async function loadNonRetainedTypes() {
  const matrixPath = path.join(rootDir, 'docs/components/amis-baseline-matrix.md');
  const indexPath = path.join(rootDir, 'docs/components/index.md');
  const [matrixContent, indexContent] = await Promise.all([
    readFile(matrixPath, 'utf8'),
    readFile(indexPath, 'utf8'),
  ]);

  const retainedTypes = parseRetainedTypes(matrixContent);
  const notRetainedTypes = parseNotRetainedTypes(matrixContent);
  const extraTypes = parseExtraNonRetainedTypes(indexContent);

  for (const type of extraTypes) {
    notRetainedTypes.add(type);
  }

  for (const type of retainedTypes) {
    notRetainedTypes.delete(type);
  }

  return [...notRetainedTypes].sort((a, b) => a.localeCompare(b));
}

function shouldIgnoreFile(relativePath) {
  return ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function shouldIgnoreMatch(relativePath, lineText) {
  const trimmed = lineText.trim();

  if (/^['"]?type['"]?\s*:\s*['"][^'"]+['"]\s*;\s*$/.test(trimmed)) {
    return true;
  }

  if (/(?:selection|rowSelection)\s*:\s*\{[^\n}]*type\s*:\s*['"][^'"]+['"]/.test(lineText)) {
    return true;
  }

  if (
    relativePath.includes('/condition-builder/') ||
    relativePath.endsWith('/conditionBuilderSchema.json')
  ) {
    return true;
  }

  return false;
}

async function scanForNonRetainedTypeReferences(nonRetainedTypes) {
  if (nonRetainedTypes.length === 0) {
    return [];
  }

  const files = [];
  for (const root of scanRoots) {
    files.push(...(await collectFiles(path.join(rootDir, root))));
  }

  const typePattern = nonRetainedTypes
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const literalPattern = new RegExp(
    `(?:^|[^A-Za-z0-9_$])["']?type["']?\\s*:\\s*["'](${typePattern})["']`,
    'g',
  );

  const results = [];
  for (const filePath of files) {
    const relativePath = toPosixPath(filePath);
    if (shouldIgnoreFile(relativePath)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    let match;
    while ((match = literalPattern.exec(content)) !== null) {
      const line = getLineNumber(content, match.index);
      const lineText = getLineText(content, line);
      if (shouldIgnoreMatch(relativePath, lineText)) {
        continue;
      }

      results.push({
        filePath: relativePath,
        line,
        lineText: lineText.trim(),
        typeName: match[1],
      });
    }
  }

  results.sort((a, b) => {
    return a.typeName.localeCompare(b.typeName) || a.filePath.localeCompare(b.filePath) || a.line - b.line;
  });
  return results;
}

function printResults(nonRetainedTypes, results) {
  console.log(
    `[find-non-retained-renderer-references] Loaded ${nonRetainedTypes.length} non-retained renderer types from docs/components baseline.`,
  );
  console.log(
    `[find-non-retained-renderer-references] Types: ${nonRetainedTypes.join(', ')}`,
  );

  if (results.length === 0) {
    console.log('[find-non-retained-renderer-references] No non-retained renderer type literals found.');
    return;
  }

  const grouped = new Map();
  for (const result of results) {
    if (!grouped.has(result.typeName)) {
      grouped.set(result.typeName, []);
    }
    grouped.get(result.typeName).push(result);
  }

  console.log(
    `[find-non-retained-renderer-references] Found ${results.length} suspect references across ${grouped.size} non-retained types.`,
  );

  for (const [typeName, bucket] of grouped) {
    console.log(`\n[non-retained-renderer-type] ${typeName}`);
    for (const result of bucket) {
      console.log(`  ${result.filePath}:${result.line}`);
      console.log(`    ${result.lineText}`);
    }
  }
}

async function main() {
  const nonRetainedTypes = await loadNonRetainedTypes();
  const results = await scanForNonRetainedTypeReferences(nonRetainedTypes);
  printResults(nonRetainedTypes, results);
}

main().catch((error) => {
  console.error('[find-non-retained-renderer-references] Error:', error);
  process.exit(1);
});
