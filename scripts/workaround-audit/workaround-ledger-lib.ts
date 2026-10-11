// Workaround-audit coverage ledger shared parsing/serialization (plan 560 Phase 1).
// TypeScript with erasable-only syntax so Node's native type stripping runs it
// directly (reconcile-coverage.ts) alongside vitest (inventory generator).
// Consumed by generate-workaround-inventory.test.ts (merge on regeneration) and
// reconcile-coverage.ts (structural audit). Ledger format contract:
//   modules section marker `<!-- ledger:modules -->`:
//     `| <id> | <family> | <batch> | <status> | <loc> | <files> | <note> |`
//   findings section marker `<!-- ledger:findings -->`:
//     `| <id> | <module> | <category> | <severity> | <location> | <status> | <disposition> | <note> |`
// Cells never contain pipes or newlines; row order is inventory-canonical for
// modules but matching is by id, so reconcile is order-insensitive. The findings
// section is hand-maintained by batch plan lifecycles — regeneration never
// rewrites it.
//
// State machines (docs/backlog/workaround-code-smell-audit-roadmap.md WA-0, as
// refined by plan 560 draft review R1):
//   modules:  pending → audited   (orphan = vanished from inventory)
//   findings: pending → found → fixed → verified
//   disposition (findings not fixed, mandatory when leaving found unfixed):
//     watch-only | successor-required | withdrawn | n-a
// 未处置 (unresolved) = pending findings + found findings with empty disposition;
// a `found` row carrying one of the four dispositions is explicitly adjudicated.

export const MODULE_STATUSES = ['pending', 'audited', 'orphan'];
export const FINDING_STATUSES = ['pending', 'found', 'fixed', 'verified'];
export const FINDING_DISPOSITIONS = ['watch-only', 'successor-required', 'withdrawn', 'n-a'];

const LEDGER_MODULES_MARKER = '<!-- ledger:modules -->';
const LEDGER_FINDINGS_MARKER = '<!-- ledger:findings -->';

export interface LedgerModuleRow {
  id: string;
  family: string;
  batch: string;
  status: string;
  loc: number;
  fileCount: number;
  note: string;
}

export interface ParsedLedger {
  modules: Map<string, string[]>;
  findings: Map<string, string[]>;
}

interface LedgerFindingRef {
  status: string;
  disposition: string;
}

function parseSection(
  ledgerText: string,
  sectionMarker: string,
  columnCount: number
): Map<string, string[]> {
  const rows = new Map();
  const sectionStart = ledgerText.indexOf(sectionMarker);
  if (sectionStart === -1) {
    return rows;
  }
  const rest = ledgerText.slice(sectionStart + sectionMarker.length);
  const nextMarker = rest.indexOf('<!-- ledger:');
  const sectionBody = nextMarker === -1 ? rest : rest.slice(0, nextMarker);
  for (const line of sectionBody.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('---')) {
      continue;
    }
    const cells = trimmed.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cells.length !== columnCount || cells[0] === 'id' || cells[0] === '') {
      continue;
    }
    rows.set(cells[0], cells);
  }
  return rows;
}

function serializeSection(rows: string[][], columnNames: string[]): string {
  const header = '| ' + columnNames.join(' | ') + ' |';
  const separator =
    '|' + columnNames.map(() => ' --- ').join('|') + '|';
  const lines = [header, separator];
  for (const cells of rows) {
    lines.push('| ' + cells.join(' | ') + ' |');
  }
  return lines.join('\n');
}

export function parseLedger(ledgerText: string): ParsedLedger {
  return {
    modules: parseSection(ledgerText, LEDGER_MODULES_MARKER, 7),
    findings: parseSection(ledgerText, LEDGER_FINDINGS_MARKER, 8),
  };
}

export function moduleRowCells(module: LedgerModuleRow): string[] {
  return [
    module.id,
    module.family,
    module.batch,
    module.status,
    String(module.loc),
    String(module.fileCount),
    module.note,
  ];
}

export function serializeLedger(
  modules: LedgerModuleRow[],
  findingsRows: string[][],
  preamble: string
): string {
  const moduleRows = modules.map((m) => moduleRowCells(m));
  const moduleSection =
    LEDGER_MODULES_MARKER +
    '\n\n' +
    serializeSection(moduleRows, [
      'id',
      'family',
      'batch',
      'status',
      'loc',
      'files',
      'note',
    ]);
  const findingRows = findingsRows;
  const findingsSection =
    LEDGER_FINDINGS_MARKER +
    '\n\n' +
    serializeSection(findingRows, [
      'id',
      'module',
      'category',
      'severity',
      'location',
      'status',
      'disposition',
      'note',
    ]);
  return preamble + '\n' + moduleSection + '\n\n' + findingsSection + '\n';
}

export function isUnresolvedFinding(finding: LedgerFindingRef): boolean {
  const status = finding.status;
  const disposition = finding.disposition;
  if (status === 'pending') return true;
  if (status === 'found') return !FINDING_DISPOSITIONS.includes(disposition);
  return false;
}
