// R2 coverage ledger shared parsing/serialization (plan 491 Phase 2).
// Consumed by generate-visual-inventory.test.ts (merge on regeneration) and
// reconcile-coverage.mjs (structural audit). Ledger format contract:
// `| <id> | <kind> | <batch> | <status> | <card> | <note> |` rows inside
// `<!-- ledger:pages -->` / `<!-- ledger:controls -->` sections; cells never
// contain pipes or newlines; row order is inventory-canonical but matching is
// by id, so reconcile is order-insensitive.

export const PAGE_KIND = 'page';
export const CONTROL_KIND = 'control';

export const LEDGER_STATUSES = ['pending', 'carded', 'digested', 'verified', 'orphan'];

function parseSection(ledgerText, sectionMarker) {
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
    // ['', id, kind, batch, status, card, note, '']
    if (cells.length < 8 || cells[1] === 'id' || /^-+$/.test(cells[1] ?? '')) {
      continue;
    }
    rows.set(cells[1], {
      id: cells[1],
      kind: cells[2],
      batch: cells[3],
      status: cells[4],
      card: cells[5],
      note: cells[6] ?? '',
    });
  }
  return rows;
}

export function parseLedger(ledgerText) {
  return {
    pages: parseSection(ledgerText, '<!-- ledger:pages -->'),
    controls: parseSection(ledgerText, '<!-- ledger:controls -->'),
  };
}

function sanitizeCell(value) {
  // Ledger format contract: cells never contain pipes or newlines.
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function formatRow(entry) {
  return `| ${sanitizeCell(entry.id)} | ${sanitizeCell(entry.kind)} | ${sanitizeCell(entry.batch)} | ${sanitizeCell(entry.status)} | ${sanitizeCell(entry.card)} | ${sanitizeCell(entry.note)} |`;
}

const SECTION_HEADER = [
  '',
  '| id | kind | batch | status | card | note |',
  '| --- | --- | --- | --- | --- | --- |',
];

export function serializeLedgerSection(entries) {
  return [...SECTION_HEADER, ...entries.map(formatRow), ''].join('\n');
}
