import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectSourceFiles, isTestFile, toPosixPath } from './audit/shared.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'console-log-baseline.json');
const SCAN_ROOTS = [path.join(rootDir, 'packages'), path.join(rootDir, 'apps')];
const PATTERN = /\bconsole\.(log|debug)\s*\(/g;

function findConsoleCalls(content) {
  const hits = [];
  PATTERN.lastIndex = 0;
  let match;
  while ((match = PATTERN.exec(content))) {
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const lineText = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd).trim();
    const lineNumber = content.slice(0, match.index).split('\n').length;
    hits.push({ line: lineNumber, text: lineText });
  }
  return hits;
}

function diffBaseline(hits, baseline) {
  const identity = (h) => `${h.file}:${h.line}:${h.text}`;
  const baselineSet = new Set((baseline ?? []).map(identity));
  const hitSet = new Set(hits.map(identity));
  // A hit matches the baseline when file+text agree (line numbers drift with edits).
  const fuzzyMatch = (hit, list) => list.some((entry) => entry.file === hit.file && entry.text === hit.text);
  const newHits = hits.filter((h) => !fuzzyMatch(h, baseline ?? []));
  const resolved = (baseline ?? []).filter((entry) => !hitSet.has(identity(entry)) && !hits.some((h) => fuzzyMatch(h, [entry])));
  return { newHits, resolved, baselineSet };
}

async function collectHits() {
  const hits = [];
  for (const scanRoot of SCAN_ROOTS) {
    for (const filePath of await collectSourceFiles(scanRoot)) {
      const relPath = toPosixPath(path.relative(rootDir, filePath));
      if (isTestFile(relPath)) continue;
      if (!/\.(ts|tsx)$/.test(relPath)) continue;
      const content = await readFile(filePath, 'utf8');
      for (const hit of findConsoleCalls(content)) {
        hits.push({ file: relPath, line: hit.line, text: hit.text });
      }
    }
  }
  return hits;
}

async function main() {
  const args = process.argv.slice(2);
  const baselineIndex = args.indexOf('--baseline');
  const updateIndex = args.indexOf('--update-baselines');

  if (updateIndex >= 0) {
    const hits = await collectHits();
    const target = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
    const snapshot = {
      _header: {
        description:
          'console.log/debug baseline for non-test src under packages/ and apps/. New hits fail check:console-baseline; shrink via --update-baselines after removing hits.',
        lastUpdated: new Date().toISOString().slice(0, 10),
        count: hits.length,
      },
      entries: hits,
    };
    await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`[check:console-baseline] baseline updated (${hits.length} entries)`);
    return;
  }

  let baseline = [];
  try {
    baseline = JSON.parse(await readFile(baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile, 'utf8')).entries ?? [];
  } catch {
    console.error('[check:console-baseline] missing baseline; run with --update-baselines first');
    process.exit(1);
  }

  const hits = await collectHits();
  const { newHits, resolved } = diffBaseline(hits, baseline);

  if (newHits.length > 0) {
    console.error('[check:console-baseline] NEW console.log/debug hits not registered in baseline:');
    for (const hit of newHits) {
      console.error(`  ${hit.file}:${hit.line}  ${hit.text}`);
    }
    process.exit(1);
  }

  if (resolved.length > 0) {
    console.log(`[check:console-baseline] no new hits; ${resolved.length} registered entries can be shrunk (--update-baselines)`);
  } else {
    console.log('[check:console-baseline] no new hits');
  }
}

main().catch((error) => {
  console.error('[check:console-baseline] fatal:', error?.message ?? error);
  process.exit(1);
});
