import { access, readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');

const activeDocRoots = ['docs/architecture', 'docs/components', 'docs/references'];
const explicitActiveDocs = ['docs/index.md'];
const ignoredDirectoryNames = new Set(['node_modules']);
const ignoredPathPrefixes = [
  'docs/analysis/',
  'docs/archive/',
  'docs/amis-types/',
  'docs/logs/',
  'docs/plans/',
  'docs/ppts/assets/',
];

const repoPathPattern = /`((?:apps|packages|docs|scripts|tests)\/[^`\r\n]+)`/g;

function getLineNumber(content, matchIndex) {
  return content.slice(0, matchIndex).split(/\r?\n/).length;
}

function looksLikeFilePath(candidate) {
  if (!/\.[a-z0-9]+$/i.test(candidate)) {
    return false;
  }

  if (candidate.includes('{') || candidate.includes('}') || candidate.includes('*')) {
    return false;
  }

  if (candidate.includes('<') || candidate.includes('>')) {
    return false;
  }

  return true;
}

async function pathExists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function shouldIgnoreDoc(relativePath) {
  return ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

async function collectMarkdownFiles(dir) {
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
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name) !== '.md') {
      continue;
    }

    const relativePath = toPosixPath(fullPath);
    if (!shouldIgnoreDoc(relativePath)) {
      files.push(relativePath);
    }
  }

  return files;
}

async function getActiveDocPaths() {
  const discovered = new Set(explicitActiveDocs);

  for (const root of activeDocRoots) {
    for (const file of await collectMarkdownFiles(path.join(rootDir, root))) {
      discovered.add(file);
    }
  }

  return [...discovered].sort((a, b) => a.localeCompare(b));
}

async function main() {
  const failures = [];
  const activeDocPaths = await getActiveDocPaths();

  for (const docPath of activeDocPaths) {
    const content = await readFile(path.join(rootDir, docPath), 'utf8');
    const seenPaths = new Set();

    for (const match of content.matchAll(repoPathPattern)) {
      const candidate = match[1];
      if (!looksLikeFilePath(candidate) || seenPaths.has(candidate)) {
        continue;
      }

      seenPaths.add(candidate);
      if (!(await pathExists(candidate))) {
        failures.push({
          docPath,
          line: getLineNumber(content, match.index ?? 0),
          missingPath: candidate,
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error('[check-active-doc-code-anchors] ERROR: unresolved code/doc anchors found:');
    for (const failure of failures) {
      console.error(`  - ${failure.docPath}:${failure.line} -> ${failure.missingPath}`);
    }
    process.exit(1);
  }

  console.log(
    `[check-active-doc-code-anchors] Verified code/doc anchors in ${activeDocPaths.length} active docs`,
  );
}

main().catch((error) => {
  console.error('[check-active-doc-code-anchors] Error:', error);
  process.exit(1);
});
