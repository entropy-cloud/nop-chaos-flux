import { access, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');

const activeDocPaths = [
  'docs/index.md',
  'docs/architecture/playground-experience.md',
  'docs/architecture/theme-compatibility.md',
  'docs/architecture/debugger-runtime.md',
  'docs/architecture/flow-designer/collaboration.md',
  'docs/references/maintenance-checklist.md',
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

async function main() {
  const failures = [];

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
