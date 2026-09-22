// plan 491 Phase 2: coverage reconciliation gate.
// Compares the generated inventory (docs/audits/visual-quality-r2/inventory/)
// against the coverage ledger (docs/audits/visual-quality-r2/ledger.md):
//   uncovered = inventory entries missing from the ledger   → structural gap, exit 1
//   orphan    = ledger rows whose inventory entry vanished  → structural gap, exit 1
// Status progress (pending/carded/digested/verified) is informational — R2
// runs with pending items until the walkthrough batches digest them; the
// roadmap acceptance (uncovered=0 AND all verified) is adjudicated at R2-5.
//
// Usage: pnpm visual:reconcile [--json]

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLedger, LEDGER_STATUSES } from './ledger-lib.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const inventoryDir = resolve(rootDir, 'docs', 'audits', 'visual-quality-r2', 'inventory');
const ledgerPath = resolve(rootDir, 'docs', 'audits', 'visual-quality-r2', 'ledger.md');

export function reconcile(inventory, ledgerRows) {
  const result = { pages: null, controls: null, uncovered: [], orphan: [], totals: {} };
  // Lab routes are control carriers (walkPhase=R2-2-carrier): not ledger units.
  const ledgerUnits = (inventory.pages ?? []).filter((p) => p.walkPhase !== 'R2-2-carrier');
  for (const [kind, entries, ledgerMap] of [
    ['page', ledgerUnits, ledgerRows.pages],
    ['control', inventory.controls, ledgerRows.controls],
  ]) {
    const inventoryIds = new Set(entries.map((entry) => String(entry.id ?? entry.type)));
    const missing = entries.filter((entry) => !ledgerMap.has(String(entry.id ?? entry.type)));
    const orphans = [...ledgerMap.keys()].filter((id) => !inventoryIds.has(id));
    result[kind === 'page' ? 'pages' : 'controls'] = {
      total: entries.length,
      byStatus: Object.fromEntries(
        LEDGER_STATUSES.map((status) => [
          status,
          [...ledgerMap.values()].filter((row) => row.status === status).length,
        ]),
      ),
    };
    result.uncovered.push(...missing.map((entry) => `${kind}:${entry.id ?? entry.type}`));
    result.orphan.push(...orphans.map((id) => `${kind}:${id}`));
  }
  result.totals = {
    uncovered: result.uncovered.length,
    orphan: result.orphan.length,
  };
  return result;
}

function main() {
  const jsonMode = process.argv.includes('--json');
  const inventory = {
    pages: JSON.parse(readFileSync(resolve(inventoryDir, 'pages.json'), 'utf8')).pages,
    controls: JSON.parse(readFileSync(resolve(inventoryDir, 'controls.json'), 'utf8')).controls,
  };
  const ledgerRows = parseLedger(readFileSync(ledgerPath, 'utf8'));
  const report = reconcile(inventory, ledgerRows);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `[visual-reconcile] pages: ${report.pages.total} (${Object.entries(report.pages.byStatus).map(([s, n]) => `${s}=${n}`).join(', ')})`,
    );
    console.log(
      `[visual-reconcile] controls: ${report.controls.total} (${Object.entries(report.controls.byStatus).map(([s, n]) => `${s}=${n}`).join(', ')})`,
    );
    if (report.uncovered.length > 0) {
      console.log(`[visual-reconcile] UNCOVERED (inventory without ledger row): ${report.uncovered.join(', ')}`);
    }
    if (report.orphan.length > 0) {
      console.log(`[visual-reconcile] ORPHAN (ledger row without inventory entry): ${report.orphan.join(', ')}`);
    }
    if (report.totals.uncovered === 0 && report.totals.orphan === 0) {
      console.log('[visual-reconcile] Coverage ledger structurally closed (uncovered=0, orphan=0).');
    }
  }
  process.exitCode = report.totals.uncovered > 0 || report.totals.orphan > 0 ? 1 : 0;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  main();
}
