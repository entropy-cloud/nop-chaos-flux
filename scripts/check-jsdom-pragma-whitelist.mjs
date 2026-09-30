import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectSourceFiles, isTestFile, toPosixPath } from './audit/shared.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'jsdom-pragma-whitelist.json');
const PACKAGES_DIR = path.join(rootDir, 'packages');
const PATTERN = /@vitest-environment\s+jsdom\b/;

function findJsdomPragmas(content) {
  if (!PATTERN.test(content)) return [];
  return content
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim(), hasPragma: PATTERN.test(line) }))
    .filter((entry) => entry.hasPragma);
}

function diffBaseline(hits, whitelist) {
  const whitelistSet = new Set(whitelist ?? []);
  const hitSet = new Set(hits);
  const newHits = hits.filter((h) => !whitelistSet.has(h));
  const resolved = (whitelist ?? []).filter((entry) => !hitSet.has(entry));
  return { newHits, resolved };
}

async function collectHits() {
  const hits = [];
  for (const filePath of await collectSourceFiles(PACKAGES_DIR)) {
    const relPath = toPosixPath(path.relative(rootDir, filePath));
    if (!isTestFile(relPath)) continue;
    const content = await readFile(filePath, 'utf8');
    for (const pragma of findJsdomPragmas(content)) {
      hits.push(`${relPath}:${pragma.line}`);
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
          'Whitelisted @vitest-environment jsdom pragmas under packages/. Registered entries are deliberate (DOMPurify spec-compliance etc.); new entries fail check:jsdom-pragma-whitelist. Shrink via --update-baselines.',
        lastUpdated: new Date().toISOString().slice(0, 10),
        count: hits.length,
      },
      entries: hits,
    };
    await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`[check:jsdom-pragma-whitelist] whitelist updated (${hits.length} entries)`);
    return;
  }

  let baseline = [];
  try {
    baseline = JSON.parse(await readFile(baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile, 'utf8')).entries ?? [];
  } catch {
    console.error('[check:jsdom-pragma-whitelist] missing whitelist; run with --update-baselines first');
    process.exit(1);
  }

  const hits = await collectHits();
  const { newHits, resolved } = diffBaseline(hits, baseline);

  if (newHits.length > 0) {
    console.error('[check:jsdom-pragma-whitelist] NEW jsdom pragmas not whitelisted (prefer happy-dom; register deliberate exceptions):');
    for (const hit of newHits) console.error(`  ${hit}`);
    process.exit(1);
  }

  if (resolved.length > 0) {
    console.log(`[check:jsdom-pragma-whitelist] no new entries; ${resolved.length} whitelist entries can be shrunk (--update-baselines):`);
    for (const entry of resolved.slice(0, 20)) console.log(`  ${entry}`);
    if (resolved.length > 20) console.log(`  ... and ${resolved.length - 20} more`);
  } else {
    console.log('[check:jsdom-pragma-whitelist] no new entries');
  }
}

main().catch((error) => {
  console.error('[check:jsdom-pragma-whitelist] fatal:', error?.message ?? error);
  process.exit(1);
});
