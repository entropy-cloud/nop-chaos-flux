import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdir, rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.join(__dirname, '..');
const reportDir = path.join(rootDir, 'report');
const reportFile = path.join(reportDir, 'jscpd-report.json');
const baselineFile = path.join(rootDir, 'scripts', 'baselines', 'duplicates-baseline.json');
const THRESHOLD_PCT = 8;

// Pure gate decision: statistics + baseline -> { ok, failure }.
// The clone count is compared against the committed baseline because the
// ratio alone stayed flat while the clone count grew +31% historically
// (454 -> 597 between 2026-08-08 and 2026-09-30, see CQ-T2).
function evaluateDuplicates(total, baseline) {
  const pct = parseFloat(total?.percentage ?? '0');
  const clones = total?.clones ?? 0;
  const thresholdPct = baseline?.thresholdPct ?? THRESHOLD_PCT;
  const baselineClones = baseline?.clones;

  if (pct > thresholdPct) {
    return { ok: false, failure: `Duplicate ratio ${pct}% exceeds threshold ${thresholdPct}%` };
  }
  if (typeof baselineClones === 'number' && clones > baselineClones) {
    return {
      ok: false,
      failure: `Clone count ${clones} exceeds registered baseline ${baselineClones} (ratio alone can stay flat while count grows; shrink the baseline via --update-baseline only after removing real duplicates)`,
    };
  }
  return { ok: true, failure: null };
}

async function loadBaseline(explicitPath) {
  const baselinePath = explicitPath ?? baselineFile;
  try {
    return JSON.parse(await readFile(baselinePath, 'utf8'));
  } catch {
    console.error(`[check:duplicates] missing duplicates baseline (${baselinePath}); refusing to gate without one`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const baselineIndex = args.indexOf('--baseline');
  const updateIndex = args.indexOf('--update-baseline');

  let total;
  if (inputIndex >= 0) {
    total = JSON.parse(await readFile(args[inputIndex + 1], 'utf8')).statistics.total;
  } else {
    await mkdir(reportDir, { recursive: true });

    const jscpdArgs = [
      'jscpd',
      path.join(rootDir, 'packages'),
      '--config', path.join(rootDir, '.jscpd.json'),
      '--reporters', 'json',
      '--output', reportDir,
      '--threshold', '0',
      '--silent',
    ];

    try {
      await execFileAsync('npx', jscpdArgs, {
        cwd: rootDir,
        maxBuffer: 50 * 1024 * 1024,
        shell: true,
      });
    } catch {}

    try {
      const raw = await readFile(reportFile, 'utf8');
      total = JSON.parse(raw).statistics.total;
    } catch {
      console.error('[check:duplicates] Failed to read jscpd JSON report');
      process.exit(1);
    } finally {
      try {
        await rm(reportDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const pct = parseFloat(total?.percentage ?? '0');
  const clones = total?.clones ?? 0;
  const dupLines = total?.duplicatedLines ?? 0;
  const totalLines = total?.lines ?? 0;

  console.log(
    `[check:duplicates] ${clones} clones, ${dupLines}/${totalLines} duplicated lines (${pct}%), threshold: ${THRESHOLD_PCT}%`,
  );

  if (updateIndex >= 0) {
    const target = baselineIndex >= 0 ? args[baselineIndex + 1] : baselineFile;
    await writeFile(
      target,
      `${JSON.stringify({ clones, percentage: total?.percentage ?? String(pct), thresholdPct: THRESHOLD_PCT, updated: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
      'utf8',
    );
    console.log('[check:duplicates] baseline updated');
    return;
  }

  const baseline = await loadBaseline(baselineIndex >= 0 ? args[baselineIndex + 1] : undefined);
  const verdict = evaluateDuplicates(total, baseline);

  if (!verdict.ok) {
    console.error(`[check:duplicates] ERROR: ${verdict.failure}`);
    if (!inputIndex) console.log('Run `pnpm check:duplicates:detail` for the full report.');
    process.exit(1);
  }

  console.log(`[check:duplicates] OK: within baseline (${baseline.clones} clones registered)`);
}

main().catch((error) => {
  console.error('[check:duplicates] Error:', error.message);
  process.exit(1);
});
