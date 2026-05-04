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
const THRESHOLD_PCT = 8;

async function main() {
  await mkdir(reportDir, { recursive: true });

  const args = [
    'jscpd',
    path.join(rootDir, 'packages'),
    '--config', path.join(rootDir, '.jscpd.json'),
    '--reporters', 'json',
    '--output', reportDir,
    '--threshold', '0',
    '--silent',
  ];

  try {
    await execFileAsync('npx', args, {
      cwd: rootDir,
      maxBuffer: 50 * 1024 * 1024,
      shell: true,
    });
  } catch {}

  let report;
  try {
    const raw = await readFile(reportFile, 'utf8');
    report = JSON.parse(raw);
  } catch {
    console.error('[check:duplicates] Failed to read jscpd JSON report');
    process.exit(1);
  } finally {
    try {
      await rm(reportDir, { recursive: true, force: true });
    } catch {}
  }

  const total = report.statistics.total;
  const pct = parseFloat(total?.percentage ?? '0');
  const clones = total?.clones ?? 0;
  const dupLines = total?.duplicatedLines ?? 0;
  const totalLines = total?.lines ?? 0;

  console.log(
    `[check:duplicates] ${clones} clones, ${dupLines}/${totalLines} duplicated lines (${pct}%), threshold: ${THRESHOLD_PCT}%`,
  );

  if (pct > THRESHOLD_PCT) {
    console.error(
      `[check:duplicates] ERROR: Duplicate ratio ${pct}% exceeds threshold ${THRESHOLD_PCT}%`,
    );
    console.log('Run `pnpm check:duplicates:detail` for the full report.');
    process.exit(1);
  }

  console.log('[check:duplicates] OK');
}

main().catch((error) => {
  console.error('[check:duplicates] Error:', error.message);
  process.exit(1);
});
