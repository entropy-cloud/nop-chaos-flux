import { access, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Every `check:*` script in package.json must land in exactly one disposition:
//   wired        — listed in the `check` aggregate (`pnpm check:<name>` / `pnpm run check:<name>`)
//   lint-chain   — its script file is executed by the `lint` script
//   alias-of:X   — its command is byte-identical to a wired check X
//   wrapped-by:X — allowlisted; X is a wired check whose source names this scanner
//   manual-only  — allowlisted with a reason (raw dumps, triage-only entry points)
// Anything else is red, and so is an allowlist entry that no longer describes reality.

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const defaultRoot = path.join(__dirname, '..');

const WIRED_TOKEN = /\bpnpm (?:run )?(check:[\w:-]+)/g;
const SCRIPT_PATH = /\b(scripts\/[\w./-]+\.mjs)\b/;

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  return { root: rootIndex >= 0 ? path.resolve(argv[rootIndex + 1]) : defaultRoot };
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function scriptPathOf(command) {
  const match = command.match(SCRIPT_PATH);
  return match ? match[1] : null;
}

export function classifyChecks(scripts, allowlistEntries) {
  const checkNames = Object.keys(scripts).filter((name) => name.startsWith('check:') && name !== 'check');
  const aggregate = scripts.check ?? '';
  const lint = scripts.lint ?? '';
  const wired = new Set();
  for (const match of aggregate.matchAll(WIRED_TOKEN)) wired.add(match[1]);

  const rows = [];
  const errors = [];

  for (const name of checkNames) {
    const command = scripts[name];
    if (wired.has(name)) {
      rows.push({ name, disposition: 'wired', command });
      continue;
    }
    const scriptPath = scriptPathOf(command);
    if (scriptPath && lint.includes(scriptPath)) {
      rows.push({ name, disposition: 'lint-chain', command });
      continue;
    }
    const aliasTarget = [...wired].find((wiredName) => scripts[wiredName] === command);
    if (aliasTarget) {
      rows.push({ name, disposition: `alias-of:${aliasTarget}`, command });
      continue;
    }
    const entry = allowlistEntries[name];
    if (!entry) {
      errors.push(
        `${name}: not wired into \`check\`, not in the lint chain, not an alias, and not registered in the allowlist ` +
          '(wire it with `pnpm check:<name>` in the `check` script, or register { wrappedBy } / { manualOnly } in scripts/baselines/check-wiring-allowlist.json)',
      );
      continue;
    }
    if (typeof entry.manualOnly === 'string' && entry.manualOnly.trim()) {
      rows.push({ name, disposition: 'manual-only', command, note: entry.manualOnly });
      continue;
    }
    if (typeof entry.wrappedBy === 'string') {
      rows.push({ name, disposition: `wrapped-by:${entry.wrappedBy}`, command, wrappedBy: entry.wrappedBy });
      continue;
    }
    errors.push(`${name}: allowlist entry must declare either { wrappedBy: "<check name>" } or { manualOnly: "<reason>" }`);
  }

  for (const name of Object.keys(allowlistEntries)) {
    if (!checkNames.includes(name)) {
      errors.push(`${name}: stale allowlist entry — no such check:* script exists any more; delete the entry`);
      continue;
    }
    const row = rows.find((candidate) => candidate.name === name);
    if (row && (row.disposition === 'wired' || row.disposition === 'lint-chain' || row.disposition.startsWith('alias-of:'))) {
      errors.push(`${name}: stale allowlist entry — the check is already ${row.disposition}; delete the entry`);
    }
  }

  return { rows, errors, wired };
}

async function verifyFiles(root, scripts, rows, wired, errors) {
  for (const name of Object.keys(scripts).filter((candidate) => candidate.startsWith('check:') && candidate !== 'check')) {
    const scriptPath = scriptPathOf(scripts[name]);
    if (scriptPath && !(await fileExists(path.join(root, scriptPath)))) {
      errors.push(`${name}: command references ${scriptPath} but that file does not exist`);
    }
  }

  for (const row of rows) {
    if (!row.wrappedBy) continue;
    if (!wired.has(row.wrappedBy)) {
      errors.push(`${row.name}: wrappedBy ${row.wrappedBy} is itself not wired into \`check\``);
      continue;
    }
    const wrapperPath = scriptPathOf(scripts[row.wrappedBy] ?? '');
    const scannerPath = scriptPathOf(row.command);
    if (!wrapperPath || !scannerPath) {
      errors.push(`${row.name}: wrappedBy ${row.wrappedBy} — cannot resolve script paths to verify the wrap claim`);
      continue;
    }
    const scannerBase = path.basename(scannerPath, '.mjs');
    let wrapperSource = '';
    try {
      wrapperSource = await readFile(path.join(root, wrapperPath), 'utf8');
    } catch {
      errors.push(`${row.name}: wrappedBy ${row.wrappedBy} — wrapper source ${wrapperPath} is unreadable`);
      continue;
    }
    if (!wrapperSource.includes(`'${scannerBase}'`) && !wrapperSource.includes(`"${scannerBase}"`)) {
      errors.push(`${row.name}: wrappedBy ${row.wrappedBy} but ${wrapperPath} does not name scanner ${scannerBase}`);
    }
  }
}

async function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const allowlistPath = path.join(root, 'scripts', 'baselines', 'check-wiring-allowlist.json');
  let allowlistEntries = {};
  if (await fileExists(allowlistPath)) {
    allowlistEntries = JSON.parse(await readFile(allowlistPath, 'utf8')).entries ?? {};
  }

  const scripts = pkg.scripts ?? {};
  const { rows, errors, wired } = classifyChecks(scripts, allowlistEntries);
  await verifyFiles(root, scripts, rows, wired, errors);

  const width = Math.max(...rows.map((row) => row.name.length), 10);
  console.log(`[check:wiring-coverage] ${rows.length} check:* scripts classified:`);
  for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${row.name.padEnd(width)}  ${row.disposition}${row.note ? `  (${row.note})` : ''}`);
  }

  if (errors.length > 0) {
    console.error('[check:wiring-coverage] FAILED:');
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log('[check:wiring-coverage] every check:* script has a verified disposition');
}

main().catch((error) => {
  console.error('[check:wiring-coverage] fatal:', error?.message ?? error);
  process.exit(1);
});
