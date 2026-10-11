// Workaround-audit coverage reconcile (plan 560 Phase 1; roadmap WA-0).
// Structural audit of inventory ↔ ledger consistency plus the machine-readable
// counts the roadmap contract requires:
//   audited / uncovered / findings / found / fixed / verified /
//   watch / withdrawn / n-a / successor / unresolved(未处置)
// 口径 (plan 560 draft review R1):
//   uncovered  = pending module rows (coverage declaration = batch report +
//                module row flipped audited by the batch plan lifecycle)
//   未处置     = pending findings + found findings with empty disposition
//                (a found row carrying watch-only / successor-required /
//                withdrawn / n-a is explicitly adjudicated)
//   orphan module rows are excluded from uncovered (vanished targets)
// WA-16 closure precondition: uncovered=0 AND unresolved=0.
// Exit codes: 1 on any structural violation (both modes); --strict additionally
// exits 1 on uncovered>0 or unresolved>0.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINDING_DISPOSITIONS,
  FINDING_STATUSES,
  MODULE_STATUSES,
  parseLedger,
} from './workaround-ledger-lib.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY_PATH = path.join(REPO_ROOT, 'docs', 'audits', 'workaround-code-smell', 'inventory', 'modules.json');
const LEDGER_PATH = path.join(REPO_ROOT, 'docs', 'audits', 'workaround-code-smell', 'ledger.md');
const AUDIT_DIR = path.join(REPO_ROOT, 'docs', 'audits', 'workaround-code-smell');

const strict = process.argv.includes('--strict');
const violations: string[] = [];

if (!fs.existsSync(INVENTORY_PATH) || !fs.existsSync(LEDGER_PATH)) {
  console.error('reconcile: missing inventory/ledger — run `pnpm workaround:inventory` first');
  process.exit(1);
}

interface InventoryModuleSummary {
  id: string;
  batch: string;
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as { modules: InventoryModuleSummary[] };
const ledger = parseLedger(fs.readFileSync(LEDGER_PATH, 'utf8'));

const inventoryById = new Map(inventory.modules.map((m) => [m.id, m]));

// --- structural checks: modules ---
for (const m of inventory.modules) {
  const row = ledger.modules.get(m.id);
  if (!row) violations.push(`module ${m.id}: in inventory but has no ledger row`);
}
for (const [id, row] of ledger.modules) {
  if (!MODULE_STATUSES.includes(row[3])) violations.push(`module ${id}: illegal status "${row[3]}"`);
  const invModule = inventoryById.get(id);
  if (!invModule && row[3] !== 'orphan') {
    violations.push(`module ${id}: not in inventory and not marked orphan`);
  }
  if (invModule && row[2] !== invModule.batch) {
    violations.push(`module ${id}: ledger batch "${row[2]}" != inventory batch "${invModule.batch}"`);
  }
  if (row[3] === 'audited') {
    const reportDir = row[2] ? row[2].toLowerCase() : '';
    const reportPath = path.join(AUDIT_DIR, reportDir, 'report.md');
    if (!fs.existsSync(reportPath)) {
      violations.push(`module ${id}: audited but batch report missing at ${path.relative(REPO_ROOT, reportPath)}`);
    }
  }
}

// --- structural checks: findings ---
const findingIdPattern = /^WA-[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$/;
const findings = [...ledger.findings.values()].map((cells) => ({
  id: cells[0],
  module: cells[1],
  status: cells[5],
  disposition: cells[6],
  cells,
}));
for (const f of findings) {
  if (!findingIdPattern.test(f.id)) violations.push(`finding ${f.id}: id does not match WA-<pkg>-<seq>`);
  if (!FINDING_STATUSES.includes(f.status)) violations.push(`finding ${f.id}: illegal status "${f.status}"`);
  if (f.disposition !== '' && !FINDING_DISPOSITIONS.includes(f.disposition)) {
    violations.push(`finding ${f.id}: illegal disposition "${f.disposition}"`);
  }
  if (f.status !== 'found' && f.status !== 'pending' && f.disposition !== '') {
    violations.push(`finding ${f.id}: disposition set on fixed/verified row (disposition is for unfixed exits)`);
  }
  if (!inventoryById.has(f.module) && !ledger.modules.has(f.module)) {
    violations.push(`finding ${f.id}: unknown module "${f.module}"`);
  }
}

// --- counts ---
const moduleRows = [...ledger.modules.values()];
const audited = moduleRows.filter((r) => r[3] === 'audited').length;
const uncovered = moduleRows.filter((r) => r[3] === 'pending').length;
const found = findings.filter((f) => f.status === 'found').length;
const fixed = findings.filter((f) => f.status === 'fixed').length;
const verified = findings.filter((f) => f.status === 'verified').length;
const pendingFindings = findings.filter((f) => f.status === 'pending').length;
const foundWithoutDisposition = findings.filter((f) => f.status === 'found' && f.disposition === '').length;
const watch = findings.filter((f) => f.disposition === 'watch-only').length;
const successor = findings.filter((f) => f.disposition === 'successor-required').length;
const withdrawn = findings.filter((f) => f.disposition === 'withdrawn').length;
const nA = findings.filter((f) => f.disposition === 'n-a').length;
const unresolved = pendingFindings + foundWithoutDisposition;

console.log('workaround-audit reconcile');
console.log(`  modules   : ${moduleRows.length} total / audited ${audited} / uncovered ${uncovered} / orphan ${moduleRows.length - audited - uncovered}`);
console.log(`  findings  : ${findings.length} total = pending ${pendingFindings} + found ${found} + fixed ${fixed} + verified ${verified}`);
console.log(`  dispositions: watch-only ${watch} / successor-required ${successor} / withdrawn ${withdrawn} / n-a ${nA}`);
console.log(`  未处置    : ${unresolved} (pending ${pendingFindings} + found-without-disposition ${foundWithoutDisposition})`);
console.log(`  violations: ${violations.length}`);
for (const v of violations) console.log(`    - ${v}`);

const uncoveredList = moduleRows.filter((r) => r[3] === 'pending').map((r) => r[0]);
if (uncoveredList.length > 0 && uncoveredList.length <= 60) {
  console.log(`  uncovered modules: ${uncoveredList.join(', ')}`);
}

if (strict) {
  const failed = violations.length > 0 || uncovered > 0 || unresolved > 0;
  console.log(`strict: ${failed ? 'FAIL' : 'PASS'} (uncovered=0? ${uncovered === 0} / 未处置=0? ${unresolved === 0} / violations=0? ${violations.length === 0})`);
  process.exit(failed ? 1 : 0);
}
process.exit(violations.length > 0 ? 1 : 0);
