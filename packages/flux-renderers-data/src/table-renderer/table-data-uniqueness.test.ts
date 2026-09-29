import { describe, expect, it } from 'vitest';
import { serializeInstancePath } from './table-data.js';

// plan 2026-09-29-4 (audit minor): the map+join id must stay collision-free
// for keys containing the separators and across nesting shapes.
describe('serializeInstancePath uniqueness (plan 2026-09-29-4)', () => {
  it('distinguishes keys containing separators and nested-path shapes', () => {
    const a = serializeInstancePath([
      { repeatedTemplateId: 'table-row:1', instanceKey: 'x' },
    ]);
    const b = serializeInstancePath([
      { repeatedTemplateId: 'table-row:1', instanceKey: 'x' },
      { repeatedTemplateId: 'table-row:2', instanceKey: 'y' },
    ]);
    const c = serializeInstancePath([
      { repeatedTemplateId: 'table-row:1', instanceKey: 'x|y' },
    ]);
    const d = serializeInstancePath([
      { repeatedTemplateId: 'table-row:1|x', instanceKey: 'y' },
    ]);
    const e = serializeInstancePath([
      { repeatedTemplateId: 'table-row:1', instanceKey: '"x"' },
    ]);
    const set = new Set([a, b, c, d, e]);
    expect(set.size).toBe(5);
  });

  it('empty path keeps the root sentinel', () => {
    expect(serializeInstancePath([])).toBe('root');
    expect(serializeInstancePath(undefined)).toBe('root');
  });
});
