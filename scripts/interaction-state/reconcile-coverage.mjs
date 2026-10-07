#!/usr/bin/env node
// Interaction-state coverage reconcile (plan 543 Phase 1).
// Usage: node scripts/interaction-state/reconcile-coverage.mjs [--strict] [--root <dir>]
//
// Structural audit of docs/audits/interaction-state/{inventory/pages.json,ledger.md}:
//   1. every inventory page has a ledger page row;
//   2. ledger page rows missing from inventory are `orphan`;
//   3. page statuses ∈ {pending, audited, orphan}; finding statuses ∈ {pending, found, fixed, verified};
//   4. every finding row's page exists in inventory; category ∈ A–F; priority ∈ P0–P3.
// Reports uncovered = pages still `pending` (uncovered=0 is the IS-9 closure
// precondition). --strict: exit 1 when uncovered > 0 or any structural
// violation (plain mode only exits 1 on structural violations).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLedger,
  PAGE_STATUSES,
  FINDING_STATUSES,
  FINDING_CATEGORIES,
  FINDING_PRIORITIES,
} from './interaction-ledger-lib.mjs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const rootIdx = args.indexOf('--root');
const root = rootIdx !== -1 ? args[rootIdx + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const inventoryPath = join(root, 'docs', 'audits', 'interaction-state', 'inventory', 'pages.json');
const ledgerPath = join(root, 'docs', 'audits', 'interaction-state', 'ledger.md');

const errors = [];
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const ledger = parseLedger(readFileSync(ledgerPath, 'utf8'));

const inventoryIds = new Set(inventory.pages.map((p) => p.id));
const missingRows = [...inventoryIds].filter((id) => !ledger.pages.has(id));
if (missingRows.length > 0) {
  errors.push(`inventory pages without a ledger row: ${missingRows.join(', ')}`);
}

const staleRows = [...ledger.pages.keys()].filter((id) => !inventoryIds.has(id) && ledger.pages.get(id)[3] !== 'orphan');
if (staleRows.length > 0) {
  errors.push(`ledger rows not in inventory and not orphan: ${staleRows.join(', ')}`);
}

for (const [id, cells] of ledger.pages) {
  if (!PAGE_STATUSES.includes(cells[3])) {
    errors.push(`page row ${id} has invalid status "${cells[3]}" (allowed: ${PAGE_STATUSES.join('|')})`);
  }
}

for (const [id, cells] of ledger.findings) {
  const [findingId, page, category, priority, status] = cells;
  if (!inventoryIds.has(page)) {
    errors.push(`finding ${findingId ?? id} references unknown page "${page}"`);
  }
  if (!FINDING_CATEGORIES.includes(category)) {
    errors.push(`finding ${findingId ?? id} has invalid category "${category}" (allowed: ${FINDING_CATEGORIES.join('|')})`);
  }
  if (!FINDING_PRIORITIES.includes(priority)) {
    errors.push(`finding ${findingId ?? id} has invalid priority "${priority}" (allowed: ${FINDING_PRIORITIES.join('|')})`);
  }
  if (!FINDING_STATUSES.includes(status)) {
    errors.push(`finding ${findingId ?? id} has invalid status "${status}" (allowed: ${FINDING_STATUSES.join('|')})`);
  }
}

const byStatus = { pending: 0, audited: 0, orphan: 0 };
for (const cells of ledger.pages.values()) {
  if (cells[3] in byStatus) byStatus[cells[3]] += 1;
}
const findingsByStatus = { pending: 0, found: 0, fixed: 0, verified: 0 };
for (const cells of ledger.findings.values()) {
  if (cells[4] in findingsByStatus) findingsByStatus[cells[4]] += 1;
}

const uncovered = byStatus.pending;
console.log(`interaction-state coverage reconcile`);
console.log(`  inventory pages : ${inventory.pages.length}`);
console.log(`  audited         : ${byStatus.audited}`);
console.log(`  orphan          : ${byStatus.orphan}`);
console.log(`  uncovered       : ${uncovered} (pending pages; uncovered=0 is the IS-9 closure precondition)`);
console.log(`  findings        : ${ledger.findings.size} total (pending ${findingsByStatus.pending} / found ${findingsByStatus.found} / fixed ${findingsByStatus.fixed} / verified ${findingsByStatus.verified})`);

if (errors.length > 0) {
  console.error(`\nstructural violations (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

if (strict && uncovered > 0) {
  console.error(`\n--strict: uncovered=${uncovered} > 0`);
  process.exit(1);
}
console.log('\nOK');
