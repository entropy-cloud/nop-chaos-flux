import { describe, expect, it } from 'vitest';
import * as surface from '../index.js';

/**
 * plan 598 (CX-18) Phase 2 G1 export-surface pin: spreadsheet-core index
 * runtime surface = Phase 1 baseline (22 runtime exports) + exactly the G1
 * additions selectSpreadsheetPageSnapshot / equalSpreadsheetPageSnapshot.
 * SpreadsheetPageSnapshotSlice is the third added export (type-only, no
 * runtime key) — compile-verified at the consumer pin in spreadsheet-renderers.
 * Diff vs Phase 1 baseline: exactly +2 runtime keys / +1 type, zero removals.
 */
const PINNED_RUNTIME_EXPORTS = [
  'SPREADSHEET_DOMAIN_COMMANDS',
  'SPREADSHEET_DOMAIN_KIND',
  'cellAddress',
  'createDefaultHistory',
  'createDefaultLayout',
  'createDefaultSelection',
  'createDefaultViewport',
  'createEmptyDocument',
  'createSpreadsheetCore',
  'createSpreadsheetDomainAdapter',
  'equalSpreadsheetPageSnapshot',
  'getCellsInRange',
  'hasSpreadsheetDocChanges',
  'isRangeEmpty',
  'isSameCellRef',
  'isSpreadsheetCommand',
  'mergeCellStyle',
  'normalizeRange',
  'parseCellAddress',
  'rangeContainsCell',
  'rangeIntersects',
  'rangeSize',
  'registerSpreadsheetDomain',
  'selectSpreadsheetPageSnapshot',
] as const;

describe('spreadsheet-core index export surface (plan 598 pin)', () => {
  it('exposes exactly the pinned runtime surface', () => {
    expect(Object.keys(surface).sort()).toEqual([...PINNED_RUNTIME_EXPORTS]);
  });

  it('publishes the page-snapshot slice family from core (G1 single source)', () => {
    expect(typeof surface.selectSpreadsheetPageSnapshot).toBe('function');
    expect(typeof surface.equalSpreadsheetPageSnapshot).toBe('function');
  });
});
