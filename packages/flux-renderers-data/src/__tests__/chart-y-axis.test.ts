import { describe, expect, it } from 'vitest';
import { sanitizeYAxis } from '../chart-y-axis.js';

describe('sanitizeYAxis — integerTicks', () => {
  it('carries integerTicks from the single-axis form (defaults false)', () => {
    expect(sanitizeYAxis({ label: '压力', integerTicks: true })).toEqual({
      entries: [{ label: '压力', position: 'left', integerTicks: true }],
      multi: false,
    });
    expect(sanitizeYAxis({ label: '销量' })).toEqual({
      entries: [{ label: '销量', position: 'left', integerTicks: false }],
      multi: false,
    });
  });

  it('carries integerTicks per entry in the multi-axis array form', () => {
    const result = sanitizeYAxis([
      { label: '销售额' },
      { label: '订单数', position: 'right', integerTicks: true },
    ]);
    expect(result.multi).toBe(true);
    expect(result.entries).toEqual([
      { label: '销售额', position: 'left', integerTicks: false },
      { label: '订单数', position: 'right', integerTicks: true },
    ]);
  });

  it('falls back to integerTicks false for implicit and malformed axes', () => {
    expect(sanitizeYAxis(undefined).entries[0]).toEqual({
      label: undefined,
      position: 'left',
      integerTicks: false,
    });
    expect(sanitizeYAxis([null, 42]).multi).toBe(false);
    expect(sanitizeYAxis([null, 42]).entries[0]).toEqual({
      label: undefined,
      position: 'left',
      integerTicks: false,
    });
  });
});
