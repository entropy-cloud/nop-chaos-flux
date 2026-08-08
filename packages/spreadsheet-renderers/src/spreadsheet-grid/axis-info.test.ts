import { describe, it, expect } from 'vitest';
import { getSelectedAxisInfo } from './constants.js';

describe('getSelectedAxisInfo', () => {
  it('returns the actual selected count for a single row', () => {
    const info = getSelectedAxisInfo(
      { kind: 'row', sheetId: 's1', rows: [3] },
      'row',
    );
    expect(info).toEqual({ start: 3, end: 3, count: 1 });
  });

  it('returns the actual selected count for multiple rows (not the span)', () => {
    const info = getSelectedAxisInfo(
      { kind: 'row', sheetId: 's1', rows: [2, 5] },
      'row',
    );
    expect(info).toEqual({ start: 2, end: 5, count: 2 });
  });

  it('returns the actual selected count for multiple columns (not the span)', () => {
    const info = getSelectedAxisInfo(
      { kind: 'column', sheetId: 's1', columns: [0, 3] },
      'column',
    );
    expect(info).toEqual({ start: 0, end: 3, count: 2 });
  });

  it('returns null when no rows/columns are selected', () => {
    expect(getSelectedAxisInfo({ kind: 'cell' }, 'row')).toBeNull();
    expect(getSelectedAxisInfo({ kind: 'row', sheetId: 's1', rows: [] }, 'row')).toBeNull();
  });
});
