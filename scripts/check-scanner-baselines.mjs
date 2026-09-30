import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'scanner-baselines.json');
const SCANNER_DIR = path.join(rootDir, 'scripts', 'audit');

// The three high-risk advisory scanners promoted to numeric-baseline gating
// (cq-1 Phase 5). Counts only — per-entry identity is intentionally not
// compared because scanner output ordering/format is not a stable contract.
const BASELINED_SCANNERS = ['find-styling-suspects', 'discover-audit-suspects', 'find-test-global-leaks'];

function evaluateScannerCounts(currentCounts, baselineCounts) {
  const newReds = [];
  const resolved = [];
  for (const scanner of Object.keys(baselineCounts ?? {})) {
    const current = currentCounts[scanner];
    const baseline = baselineCounts[scanner];
    if (typeof current !== 'number') {
      newReds.push({ scanner, reason: `scan failed or count unparseable (got: ${current})` });
      continue;
    }
    if (current > baseline) {
      newReds.push({ scanner, reason: `count ${current} exceeds registered baseline ${baseline}` });
    } else if (current < baseline) {
      resolved.push({ scanner, current, baseline });
    }
  }
  return { newReds, resolved };
}

function parseFoundCount(stdout, scanner) {
  const match = stdout.match(/Found (\d+) (?:suspect )?matches/);
  if (!match) return null;
  return Number(match[1]);
}

async function scanScanner(scanner) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [path.join(SCANNER_DIR, `${scanner}.mjs`)], {
      cwd: rootDir,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { count: parseFoundCount(stdout, scanner), stdout };
  } catch (error) {
    // Scanners may exit non-zero; the Found line is still on stdout.
    if (error?.stdout) return { count: parseFoundCount(error.stdout, scanner), stdout: error.stdout };
    return { count: null, stdout: '' };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baselineIndex = args.indexOf('--baseline');
  const updateIndex = args.indexOf('--update-baselines');

  if (updateIndex >= 0) {
    const counts = {};
    for (const scanner of BASELINED_SCANNERS) {
      counts[scanner] = (await scanScanner(scanner)).count;
    }
    const target = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
    await writeFile(
      target,
      `${JSON.stringify({
        _header: {
          description:
            'Numeric baselines for the three high-risk advisory scanners. A count above the baseline fails check:scanner-baselines (new suspects must be fixed or the baseline consciously re-registered).',
          lastUpdated: new Date().toISOString().slice(0, 10),
        },
        scanners: counts,
      }, null, 2)}\n`,
      'utf8',
    );
    console.log('[check:scanner-baselines] baselines updated:', counts);
    return;
  }

  let baseline;
  const baselinePath = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
  try {
    baseline = JSON.parse(await readFile(baselinePath, 'utf8')).scanners ?? {};
  } catch {
    console.error('[check:scanner-baselines] missing baselines file; run with --update-baselines first');
    process.exit(1);
  }

  const currentCounts = {};
  for (const scanner of Object.keys(baseline)) {
    currentCounts[scanner] = (await scanScanner(scanner)).count;
  }

  const { newReds, resolved } = evaluateScannerCounts(currentCounts, baseline);

  if (newReds.length > 0) {
    console.error('[check:scanner-baselines] NEW suspect growth beyond registered baseline:');
    for (const red of newReds) console.error(`  ${red.scanner}: ${red.reason}`);
    process.exit(1);
  }

  if (resolved.length > 0) {
    console.log('[check:scanner-baselines] within baseline; entries can be shrunk (--update-baselines):');
    for (const entry of resolved) {
      console.log(`  ${entry.scanner}: ${entry.current} < baseline ${entry.baseline}`);
    }
  } else {
    console.log('[check:scanner-baselines] within baseline');
  }
}

main().catch((error) => {
  console.error('[check:scanner-baselines] fatal:', error?.message ?? error);
  process.exit(1);
});
