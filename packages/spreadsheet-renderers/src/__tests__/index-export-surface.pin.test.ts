import { describe, expect, it } from 'vitest';
import * as surface from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 export-surface pin: spreadsheet-renderers index
 * runtime surface. Phase 2 must produce ZERO diff here — the page-snapshot
 * slice trio was never on this index and stays off it (spreadsheet-renderers
 * consumes the trio from @nop-chaos/spreadsheet-core after G1).
 */
const PINNED_RUNTIME_EXPORTS = [
  'SPREADSHEET_CAPABILITY_PUBLICATION',
  'SPREADSHEET_MANIFEST_V1',
  'SheetTabBar',
  'SpreadsheetGrid',
  'SpreadsheetToolbar',
  'createSpreadsheetActionProvider',
  'createSpreadsheetBridge',
  'defineSpreadsheetPageSchema',
  'deriveHostSnapshot',
  'mapCellStyle',
  'registerSpreadsheetRenderers',
  'resolveGridDimensions',
  'resolveSpreadsheetManifest',
  'spreadsheetHostContract',
  'spreadsheetRendererDefinitions',
  'toSpreadsheetActionResult',
  'useSpreadsheetInteractions',
] as const;

describe('spreadsheet-renderers index export surface (plan 598 pin)', () => {
  it('exposes exactly the pinned runtime surface (zero diff across plan 598)', () => {
    expect(Object.keys(surface).sort()).toEqual([...PINNED_RUNTIME_EXPORTS]);
  });

  it('keeps the page-snapshot slice family off the index (pre-existing state, unchanged by G1)', () => {
    expect('selectSpreadsheetPageSnapshot' in surface).toBe(false);
    expect('equalSpreadsheetPageSnapshot' in surface).toBe(false);
    expect('SpreadsheetPageSnapshotSlice' in surface).toBe(false);
  });
});
