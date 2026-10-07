// Interaction-state coverage ledger shared parsing/serialization (plan 543 Phase 1).
// Consumed by generate-interaction-inventory.test.ts (merge on regeneration) and
// reconcile-coverage.mjs (structural audit). Ledger format contract:
//   pages section marker `<!-- ledger:pages -->`:
//     `| <id> | <family> | <batch> | <status> | <profile> | <note> |`
//   findings section marker `<!-- ledger:findings -->`:
//     `| <id> | <page> | <category> | <priority> | <status> | <disposition> | <note> |`
// Cells never contain pipes or newlines; row order is inventory-canonical for
// pages but matching is by id, so reconcile is order-insensitive. The findings
// section is hand-maintained by batch plan lifecycles — regeneration never
// rewrites it.
//
// State machines (docs/skills/interaction-state-audit-prompt.md + roadmap IS-0):
//   pages:    pending → audited   (orphan = vanished from inventory)
//   findings: pending → found → fixed → verified

export const PAGE_STATUSES = ['pending', 'audited', 'orphan'];
export const FINDING_STATUSES = ['pending', 'found', 'fixed', 'verified'];
export const FINDING_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F'];
export const FINDING_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const LEDGER_PAGES_MARKER = '<!-- ledger:pages -->';
const LEDGER_FINDINGS_MARKER = '<!-- ledger:findings -->';

function parseSection(ledgerText, sectionMarker, columnCount) {
  const rows = new Map();
  const sectionStart = ledgerText.indexOf(sectionMarker);
  if (sectionStart === -1) {
    return rows;
  }
  const lines = ledgerText.slice(sectionStart).split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('|')) {
      if (rows.size > 0) {
        break;
      }
      continue;
    }
    const cells = line.split('|').map((cell) => cell.trim());
    // ['', c1, ..., cN, ''] — skip header/divider rows
    if (cells.length < columnCount + 2 || cells[1] === 'id' || /^-+$/.test(cells[1] ?? '')) {
      continue;
    }
    rows.set(cells[1], cells.slice(1, 1 + columnCount));
  }
  return rows;
}

export function parseLedger(ledgerText) {
  return {
    pages: parseSection(ledgerText, LEDGER_PAGES_MARKER, 6),
    findings: parseSection(ledgerText, LEDGER_FINDINGS_MARKER, 7),
  };
}

function serializeSection(marker, columnHeaders, rows) {
  const header = `| ${columnHeaders.join(' | ')} |`;
  const divider = `| ${columnHeaders.map(() => '---').join(' | ')} |`;
  const body = [...rows.values()].map((cells) => `| ${cells.join(' | ')} |`);
  return [marker, '', header, divider, ...body, ''].join('\n');
}

export function serializePagesSection(rows) {
  return serializeSection(LEDGER_PAGES_MARKER, ['id', 'family', 'batch', 'status', 'profile', 'note'], rows);
}

export function serializeFindingsSection(rows) {
  return serializeSection(
    LEDGER_FINDINGS_MARKER,
    ['id', 'page', 'category', 'priority', 'status', 'disposition', 'note'],
    rows,
  );
}

/** Escape a cell for the pipe-delimited ledger format. */
export function ledgerCell(value) {
  return String(value).replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
}
