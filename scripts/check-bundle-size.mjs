import { execFile } from 'child_process';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// Size budget over the @nop-chaos/flux pack artifact (plan 761, roadmap PH-8).
// Metrics are read from the newest dist-packages/*.tgz (produced by
// check:flux-bundle-pack earlier in `pnpm check`, or by running the pack script
// here when absent) and compared against scripts/baselines/bundle-size-baseline.json:
// any metric above baseline * (1 + tolerance) is red; a metric well below the
// baseline is reported as a tightening opportunity. Baseline edits are manual
// and dated — raising a value needs a note, lowering never does.

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const defaultBaseline = path.join(rootDir, 'scripts', 'baselines', 'bundle-size-baseline.json');
const distPackagesDir = path.join(rootDir, 'dist-packages');
const MAIN_ENTRY = 'package/dist/index.js';
const SHRINK_HINT_RATIO = 0.05;

function parseArgs(argv) {
  const get = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return { tarball: get('--tarball'), baseline: get('--baseline') ?? defaultBaseline };
}

async function newestTarball() {
  let entries;
  try {
    entries = await readdir(distPackagesDir);
  } catch {
    return undefined;
  }
  const candidates = await Promise.all(
    entries
      .filter((name) => name.endsWith('.tgz'))
      .map(async (name) => {
        const filePath = path.join(distPackagesDir, name);
        return { filePath, mtimeMs: (await stat(filePath)).mtimeMs };
      }),
  );
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.filePath;
}

async function entryBytes(tarballPath, entry) {
  const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, entry], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.length;
}

// Byte counts come from extracting each entry (same approach as
// check-flux-bundle-pack.mjs) because the size column of `tar -tvf` sits in a
// different position on bsdtar (macOS) and GNU tar (CI).
async function measure(tarballPath) {
  const tarballBytes = (await stat(tarballPath)).size;
  const { stdout } = await execFileAsync('tar', ['-tf', tarballPath], { maxBuffer: 64 * 1024 * 1024 });
  let jsBytes = 0;
  let mainEntryBytes = 0;
  for (const name of stdout.split('\n').map((line) => line.trim()).filter(Boolean)) {
    if (!name.endsWith('.js')) continue;
    const bytes = await entryBytes(tarballPath, name);
    jsBytes += bytes;
    if (name === MAIN_ENTRY) mainEntryBytes = bytes;
  }
  return { tarballBytes, jsBytes, mainEntryBytes };
}

async function main() {
  const { tarball, baseline: baselinePath } = parseArgs(process.argv.slice(2));

  let baseline;
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  } catch {
    console.error(`[check:bundle-size] baseline file missing or unreadable: ${baselinePath}`);
    process.exit(1);
  }
  const tolerance = Number(baseline._header?.tolerance ?? 0.05);
  const metrics = baseline.metrics ?? {};

  let tarballPath = tarball ?? (await newestTarball());
  if (!tarballPath) {
    await execFileAsync(process.execPath, [path.join(rootDir, 'scripts', 'pack-flux-bundle.mjs')], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    });
    tarballPath = await newestTarball();
  }
  if (!tarballPath) {
    console.error('[check:bundle-size] no tarball found in dist-packages/ and pack script produced none');
    process.exit(1);
  }

  const live = await measure(tarballPath);
  const reds = [];
  const shrinks = [];
  console.log(`[check:bundle-size] ${path.basename(tarballPath)} (tolerance +${Math.round(tolerance * 100)}%)`);
  for (const key of ['tarballBytes', 'jsBytes', 'mainEntryBytes']) {
    const registered = metrics[key];
    const value = live[key];
    const status = registered === undefined ? 'unregistered' : value > registered * (1 + tolerance) ? 'OVER' : value < registered * (1 - SHRINK_HINT_RATIO) ? 'below' : 'ok';
    console.log(`  ${key.padEnd(15)} live ${String(value).padStart(10)}  baseline ${String(registered ?? '-').padStart(10)}  ${status}`);
    if (status === 'OVER') reds.push(`${key}: live ${value} exceeds baseline ${registered} by more than ${Math.round(tolerance * 100)}% (limit ${Math.floor(registered * (1 + tolerance))})`);
    if (status === 'below') shrinks.push(`${key}: live ${value} < baseline ${registered}`);
  }

  if (reds.length > 0) {
    console.error('[check:bundle-size] BUDGET EXCEEDED:');
    for (const red of reds) console.error(`  ${red}`);
    process.exit(1);
  }
  if (shrinks.length > 0) {
    console.log('[check:bundle-size] within budget; baseline can be tightened:');
    for (const shrink of shrinks) console.log(`  ${shrink}`);
  } else {
    console.log('[check:bundle-size] within budget');
  }
}

main().catch((error) => {
  console.error('[check:bundle-size] fatal:', error?.message ?? error);
  process.exit(1);
});
